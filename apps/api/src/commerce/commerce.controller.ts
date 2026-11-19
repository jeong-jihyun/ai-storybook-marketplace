import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard, CurrentUser, ParentOnly, type AuthUser } from '../auth/auth.guard';
import { CatalogService } from '../catalog/catalog.service';
import { CloseOrderDto, CreateOrderDto, RestoreDto, TestCheckoutDto, VerifyPaymentDto } from './commerce.dto';
import { CommerceService } from './commerce.service';

const uuid = new ParseUUIDPipe();

@ApiTags('주문·결제·서재')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class CommerceController {
  constructor(private readonly commerce: CommerceService, private readonly catalog: CatalogService) {}

  @Get('payments/options')
  @ApiOperation({ summary: '지금 쓸 수 있는 결제 방식' })
  options() {
    return this.commerce.paymentOptions();
  }

  @Post('orders')
  @ParentOnly()
  @ApiHeader({ name: 'X-Parent-Token', required: true })
  @ApiOperation({ summary: '주문 생성 (PAY-001) — 서버 가격, 보호자 확인 필요, 멱등성 키' })
  createOrder(@CurrentUser() u: AuthUser, @Body() dto: CreateOrderDto) {
    return this.commerce.createOrder(u.id, dto.bookIds, dto.idempotencyKey);
  }

  @Get('orders')
  @ApiOperation({ summary: '주문 목록 (PAY-005)' })
  listOrders(@CurrentUser() u: AuthUser) {
    return this.commerce.listOrders(u.id);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: '주문 상세 — 결제 결과 화면은 이 값으로 확정' })
  getOrder(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string) {
    return this.commerce.getOrder(u.id, id);
  }

  @Post('orders/:id/close')
  @HttpCode(200)
  @ApiOperation({ summary: '결제창 취소·실패 시 주문 닫기 (결제 전만)' })
  close(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string, @Body() dto: CloseOrderDto) {
    return this.commerce.closeOrder(u.id, id, dto.status);
  }

  @Post('payments/test/checkout')
  @HttpCode(200)
  @ParentOnly()
  @ApiHeader({ name: 'X-Parent-Token', required: true })
  @ApiOperation({ summary: '테스트 결제창 (돈이 나가지 않음) — 성공 시 테스트 영수증 발급' })
  testCheckout(@CurrentUser() u: AuthUser, @Body() dto: TestCheckoutDto) {
    return this.commerce.testCheckout(u.id, dto.orderId, dto.outcome);
  }

  @Post('payments/verify')
  @HttpCode(200)
  @ParentOnly()
  @ApiHeader({ name: 'X-Parent-Token', required: true })
  @ApiOperation({ summary: '결제 검증 (PAY-003·004·007) — 영수증을 스토어에 확인 후 구매 권한 부여' })
  verify(@CurrentUser() u: AuthUser, @Body() dto: VerifyPaymentDto) {
    return this.commerce.verifyPayment(u.id, dto);
  }

  @Post('payments/restore')
  @HttpCode(200)
  @ApiOperation({ summary: '구매 복구 (PAY-008)' })
  restore(@CurrentUser() u: AuthUser, @Body() dto: RestoreDto) {
    return this.commerce.restore(u.id, dto.provider, dto.purchases);
  }

  @Get('library')
  @ApiOperation({ summary: '내 서재 — 구매한 책 목록' })
  library(@CurrentUser() u: AuthUser) {
    return this.commerce.library(u.id);
  }

  @Get('library/:bookId')
  @ApiOperation({ summary: '구매 권한 확인' })
  async owned(@CurrentUser() u: AuthUser, @Param('bookId', uuid) bookId: string) {
    await this.commerce.ensureOwned(u.id, bookId);
    return { bookId, owned: true };
  }

  @Get('library/:bookId/pages')
  @ApiOperation({ summary: '구매한 책 전체 페이지' })
  async allPages(@CurrentUser() u: AuthUser, @Param('bookId', uuid) bookId: string) {
    await this.commerce.ensureOwned(u.id, bookId);
    return this.catalog.ownedPages(bookId);
  }

  @Get('library/:bookId/pages/:page')
  @ApiOperation({ summary: '구매한 책 페이지 한 장' })
  async onePage(@CurrentUser() u: AuthUser, @Param('bookId', uuid) bookId: string, @Param('page', ParseIntPipe) page: number) {
    await this.commerce.ensureOwned(u.id, bookId);
    const r = await this.catalog.ownedPages(bookId, page, page);
    return r.pages[0];
  }
}
