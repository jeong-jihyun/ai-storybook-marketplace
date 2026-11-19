import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { LibraryItem, Order, PaymentOptions, PaymentProviderName, RestoreResult, VerifyPaymentResult } from '@storybook/shared-types';
import { assetUrl } from '../common/asset-url';
import { CATALOG_REPOSITORY, type BookRecord, type CatalogRepository } from '../catalog/catalog.repository';
import { CatalogService } from '../catalog/catalog.service';
import { COMMERCE_STORE, type CommerceStore, type OrderRecord } from './commerce.store';
import { AppleIAPProvider } from './providers/apple.provider';
import { GooglePlayBillingProvider } from './providers/google-play.provider';
import { ProviderError, type PaymentProvider, type VerifiedPurchase } from './providers/payment-provider';
import { TestPaymentProvider } from './providers/test.provider';

export const PAYMENT_PROVIDERS = Symbol('PAYMENT_PROVIDERS');

/** 주문(PAY-001) · 결제 검증(PAY-003) · 구매 권한(PAY-004) · 중복 방지(PAY-007) · 구매 복구(PAY-008) */
@Injectable()
export class CommerceService {
  private readonly providers: Map<PaymentProviderName, PaymentProvider>;

  constructor(
    @Inject(COMMERCE_STORE) private readonly store: CommerceStore,
    @Inject(CATALOG_REPOSITORY) private readonly catalog: CatalogRepository,
    private readonly catalogService: CatalogService,
    @Inject(PAYMENT_PROVIDERS) providers: PaymentProvider[],
  ) {
    this.providers = new Map(providers.map((p) => [p.name, p]));
  }

  private provider(name: PaymentProviderName): PaymentProvider {
    const p = this.providers.get(name);
    if (!p || !p.isEnabled()) {
      throw new ServiceUnavailableException({ code: 'PROVIDER_NOT_CONFIGURED', message: '지금은 이 결제 방식을 쓸 수 없어요.' });
    }
    return p;
  }

  paymentOptions(): PaymentOptions {
    const enabled = [...this.providers.values()].filter((p) => p.isEnabled()).map((p) => p.name);
    return { providers: enabled, testMode: enabled.includes('TEST') };
  }

  private async toOrder(o: OrderRecord): Promise<Order> {
    const books = await Promise.all(o.items.map((i) => this.catalog.findBookById(i.bookId)));
    return {
      id: o.id,
      status: o.status,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString() ?? null,
      items: o.items.map((i, idx) => ({
        unitPrice: i.unitPrice,
        book: {
          id: i.bookId,
          title: books[idx]?.title ?? '판매가 끝난 책',
          coverUrl: books[idx] ? assetUrl(books[idx]!.coverImageKey) : '',
          storeProductId: books[idx]?.storeProductId ?? null,
        },
      })),
      payment: o.payment
        ? { provider: o.payment.provider as PaymentProviderName, transactionId: o.payment.transactionId, verifiedAt: o.payment.verifiedAt.toISOString() }
        : null,
    };
  }

  private async ownOrder(userId: string, orderId: string): Promise<OrderRecord> {
    const o = await this.store.findOrder(orderId);
    // 남의 주문은 있는지조차 알려 주지 않는다
    if (!o || o.userId !== userId) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: '주문을 찾을 수 없어요.' });
    return o;
  }

  /** 주문 생성: 가격은 앱이 보낸 값이 아니라 서버의 현재 판매가로 계산한다 */
  async createOrder(userId: string, bookIds: string[], idempotencyKey: string): Promise<Order> {
    const unique = [...new Set(bookIds)];
    const books: BookRecord[] = [];
    for (const id of unique) {
      const b = await this.catalog.findBookById(id);
      if (!b || b.status !== 'PUBLISHED') throw new NotFoundException({ code: 'BOOK_NOT_FOUND', message: '판매 중인 책이 아니에요.' });
      books.push(b);
    }
    const owned = await Promise.all(books.map((b) => this.store.ownsBook(userId, b.id)));
    const toBuy = books.filter((_, i) => !owned[i]);
    if (!toBuy.length) throw new ConflictException({ code: 'ALREADY_OWNED', message: '이미 내 서재에 있는 책이에요.' });
    const { order } = await this.store.createOrder(
      userId,
      idempotencyKey,
      toBuy.map((b) => ({ bookId: b.id, unitPrice: b.price })),
    );
    return this.toOrder(order);
  }

  async getOrder(userId: string, orderId: string) {
    return this.toOrder(await this.ownOrder(userId, orderId));
  }

  async listOrders(userId: string) {
    const list = await this.store.listOrders(userId, 50);
    return Promise.all(list.map((o) => this.toOrder(o)));
  }

  /** 결제창에서 취소·실패했을 때 (결제 전 주문만) */
  async closeOrder(userId: string, orderId: string, status: 'CANCELED' | 'FAILED') {
    await this.ownOrder(userId, orderId);
    return this.toOrder((await this.store.markOrder(orderId, status))!);
  }

  /** 테스트 결제창: 성공이면 서버가 서명한 테스트 영수증을 준다 */
  async testCheckout(userId: string, orderId: string, outcome: 'success' | 'cancel' | 'fail') {
    const test = this.provider('TEST') as TestPaymentProvider;
    const order = await this.ownOrder(userId, orderId);
    if (order.status !== 'PENDING') throw new ConflictException({ code: 'ORDER_CLOSED', message: '이미 처리된 주문이에요.' });
    if (outcome !== 'success') {
      const closed = await this.store.markOrder(orderId, outcome === 'cancel' ? 'CANCELED' : 'FAILED');
      return { outcome, order: await this.toOrder(closed!) };
    }
    const book = await this.catalog.findBookById(order.items[0].bookId);
    const productId = book?.storeProductId ?? order.items[0].bookId;
    const receipt = test.issueReceipt(userId, orderId, productId, order.totalAmount);
    return { outcome, productId, purchaseToken: receipt.purchaseToken };
  }

  private async verifyWith(provider: PaymentProvider, userId: string, orderId: string | null, productId: string | null, purchaseToken: string): Promise<VerifiedPurchase> {
    try {
      return await provider.verify({ userId, orderId, productId, purchaseToken });
    } catch (e) {
      if (e instanceof ProviderError) {
        if (e.code === 'INVALID_RECEIPT') throw new BadRequestException({ code: 'INVALID_RECEIPT', message: e.message });
        throw new ServiceUnavailableException({ code: e.code, message: e.message });
      }
      throw e;
    }
  }

  /**
   * 결제 검증 → 결제 확정 → 구매 권한 부여.
   * 같은 영수증으로 다시 불러도 결과는 같다(멱등). 다른 주문에 쓰인 영수증은 거절한다.
   */
  async verifyPayment(userId: string, input: { orderId: string; provider: PaymentProviderName; productId?: string; purchaseToken: string }): Promise<VerifyPaymentResult> {
    const provider = this.provider(input.provider);
    const order = await this.ownOrder(userId, input.orderId);
    const v = await this.verifyWith(provider, userId, order.id, input.productId ?? null, input.purchaseToken);

    if (v.orderId && v.orderId !== order.id) throw new BadRequestException({ code: 'RECEIPT_ORDER_MISMATCH', message: '이 주문의 영수증이 아니에요.' });
    if (v.state === 'PENDING') throw new ConflictException({ code: 'PAYMENT_PENDING', message: '결제가 아직 끝나지 않았어요. 잠시 후 다시 확인해 주세요.' });
    if (v.state === 'CANCELED') {
      await this.store.markOrder(order.id, 'CANCELED');
      throw new ConflictException({ code: 'PAYMENT_CANCELED', message: '취소된 결제예요.' });
    }
    // 스토어 상품 ↔ 주문한 책이 같은지
    const books = await Promise.all(order.items.map((i) => this.catalog.findBookById(i.bookId)));
    const productIds = books.map((b) => b?.storeProductId ?? b?.id);
    if (!productIds.includes(v.productId)) throw new BadRequestException({ code: 'PRODUCT_MISMATCH', message: '주문한 상품과 영수증이 달라요.' });
    if (v.amount !== null && v.amount !== order.totalAmount) throw new BadRequestException({ code: 'AMOUNT_MISMATCH', message: '결제 금액이 주문 금액과 달라요.' });

    const r = await this.store.completePayment({
      orderId: order.id,
      userId,
      provider: provider.name,
      transactionId: v.transactionId,
      productId: v.productId,
      amount: v.amount ?? order.totalAmount,
    });
    if (r.kind === 'TX_USED') throw new ConflictException({ code: 'DUPLICATE_TRANSACTION', message: '이미 사용된 결제 영수증이에요.' });
    if (r.kind === 'ORDER_CLOSED') {
      throw new ConflictException(
        r.order.status === 'PAID'
          ? { code: 'ORDER_ALREADY_PAID', message: '이미 결제가 끝난 주문이에요.' }
          : { code: 'ORDER_CLOSED', message: '취소된 주문이에요. 다시 주문해 주세요.' },
      );
    }
    return {
      success: true,
      paymentStatus: 'PAID',
      entitlementGranted: true,
      bookIds: r.order.items.map((i) => i.bookId),
      order: await this.toOrder(r.order),
    };
  }

  /** 구매 복구: 스토어에서 받은 구매 목록을 다시 검증해 서재와 맞춘다 (새 기기·재설치) */
  async restore(userId: string, providerName: PaymentProviderName, purchases: { productId: string; purchaseToken: string }[]): Promise<RestoreResult> {
    const provider = this.provider(providerName);
    const result: RestoreResult = { restored: 0, alreadyOwned: 0, failed: 0 };
    for (const p of purchases) {
      try {
        const v = await this.verifyWith(provider, userId, null, p.productId, p.purchaseToken);
        const book = v.state === 'PURCHASED' ? await this.catalog.findBookByProductId(v.productId) : null;
        if (!book) {
          result.failed++;
          continue;
        }
        if (await this.store.ownsBook(userId, book.id)) {
          result.alreadyOwned++;
          continue;
        }
        const { order } = await this.store.createOrder(userId, `restore:${provider.name}:${v.transactionId}`, [{ bookId: book.id, unitPrice: v.amount ?? book.price }]);
        const r = await this.store.completePayment({ orderId: order.id, userId, provider: provider.name, transactionId: v.transactionId, productId: v.productId, amount: order.totalAmount });
        if (r.kind === 'PAID' || r.kind === 'ALREADY_PAID') result.restored++;
        else result.failed++;
      } catch {
        result.failed++;
      }
    }
    return result;
  }

  async library(userId: string): Promise<LibraryItem[]> {
    const rows = await this.store.listLibrary(userId);
    const items: LibraryItem[] = [];
    for (const r of rows) {
      const b = await this.catalog.findBookById(r.bookId);
      // 판매 중지(ARCHIVED 등)된 책도 이미 산 사람은 계속 읽을 수 있다
      if (b) items.push({ book: this.catalogService.toSummary(b), purchasedAt: r.purchasedAt.toISOString() });
    }
    return items;
  }

  async ensureOwned(userId: string, bookId: string) {
    if (!(await this.store.ownsBook(userId, bookId))) {
      throw new ForbiddenException({ code: 'PURCHASE_REQUIRED', message: '구매한 책만 읽을 수 있어요.' });
    }
  }

  ownsBook(userId: string, bookId: string) {
    return this.store.ownsBook(userId, bookId);
  }
}

export const defaultProviders = (): PaymentProvider[] => [new TestPaymentProvider(), new GooglePlayBillingProvider(), new AppleIAPProvider()];
