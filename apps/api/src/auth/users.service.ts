import { ConflictException, ForbiddenException, HttpException, HttpStatus, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { COMMERCE_STORE, type CommerceStore, type UserRecord } from '../commerce/commerce.store';
import { hashSecret, signToken, verifySecret, verifyToken } from './crypto';

export const ACCESS_TTL = 30 * 60; // 30분
export const REFRESH_TTL = 30 * 24 * 60 * 60; // 30일
export const PARENT_TTL = 10 * 60; // 보호자 확인 유효 10분
const PIN_MAX_FAIL = 5;
const PIN_LOCK_MIN = 5;
const LOGIN_MAX_FAIL = 10;

export interface MeDto {
  id: string;
  email: string;
  nickname: string | null;
  createdAt: string;
}

/** 회원·인증·보호자 확인 */
@Injectable()
export class UsersService {
  // 로그인 연속 실패 (서버 인스턴스별 간단 제한)
  private loginFails = new Map<string, { n: number; until: number }>();

  constructor(@Inject(COMMERCE_STORE) private readonly store: CommerceStore) {}

  toMe(u: UserRecord): MeDto {
    return { id: u.id, email: u.email, nickname: u.nickname, createdAt: u.createdAt.toISOString() };
  }

  async findActiveById(id: string) {
    const u = await this.store.findUserById(id);
    return u && u.status === 'ACTIVE' ? u : null;
  }

  private tokens(u: UserRecord) {
    return {
      accessToken: signToken({ sub: u.id, typ: 'access', ver: u.tokenVersion }, ACCESS_TTL),
      refreshToken: signToken({ sub: u.id, typ: 'refresh', ver: u.tokenVersion }, REFRESH_TTL),
      expiresIn: ACCESS_TTL,
      user: this.toMe(u),
    };
  }

  async signup(input: { email: string; password: string; parentPin: string; nickname?: string }) {
    const created = await this.store.createUser({
      email: input.email.trim(),
      passwordHash: await hashSecret(input.password),
      parentPinHash: await hashSecret(input.parentPin),
      nickname: input.nickname?.trim() || null,
      parentConsentAt: new Date(),
    });
    if (!created) throw new ConflictException({ code: 'EMAIL_TAKEN', message: '이미 가입된 이메일이에요.' });
    return this.tokens(created);
  }

  async login(email: string, password: string) {
    const key = email.trim().toLowerCase();
    const f = this.loginFails.get(key);
    if (f && f.n >= LOGIN_MAX_FAIL && f.until > Date.now()) {
      throw new HttpException({ code: 'TOO_MANY_ATTEMPTS', message: '로그인 시도가 너무 많아요. 15분 뒤 다시 해 주세요.' }, HttpStatus.TOO_MANY_REQUESTS);
    }
    const u = await this.store.findUserByEmail(key);
    const ok = !!u && u.status === 'ACTIVE' && (await verifySecret(password, u.passwordHash));
    if (!ok) {
      const cur = f && f.until > Date.now() ? f.n : 0;
      this.loginFails.set(key, { n: cur + 1, until: Date.now() + 15 * 60_000 });
      throw new UnauthorizedException({ code: 'INVALID_LOGIN', message: '이메일 또는 비밀번호가 맞지 않아요.' });
    }
    this.loginFails.delete(key);
    return this.tokens(u!);
  }

  async refresh(refreshToken: string) {
    const p = verifyToken(refreshToken, 'refresh');
    const u = p ? await this.findActiveById(p.sub) : null;
    if (!p || !u || u.tokenVersion !== p.ver) throw new UnauthorizedException({ code: 'TOKEN_EXPIRED', message: '다시 로그인해 주세요.' });
    return this.tokens(u);
  }

  /** 로그아웃: 토큰 버전을 올려 이 계정의 모든 토큰을 무효로 만든다 */
  async logout(userId: string) {
    const u = await this.store.findUserById(userId);
    if (u) await this.store.updateUser(userId, { tokenVersion: u.tokenVersion + 1 });
  }

  async me(userId: string) {
    const u = await this.findActiveById(userId);
    if (!u) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: '회원 정보를 찾을 수 없어요.' });
    return this.toMe(u);
  }

  /** 보호자 확인(MEM-004): PIN 이 맞으면 10분짜리 보호자 토큰 */
  async verifyParent(userId: string, pin: string) {
    const u = await this.findActiveById(userId);
    if (!u) throw new UnauthorizedException({ code: 'LOGIN_REQUIRED', message: '로그인이 필요해요.' });
    if (u.pinLockedUntil && u.pinLockedUntil.getTime() > Date.now()) {
      const min = Math.ceil((u.pinLockedUntil.getTime() - Date.now()) / 60_000);
      throw new HttpException({ code: 'PIN_LOCKED', message: `보호자 PIN을 여러 번 틀렸어요. ${min}분 뒤 다시 해 주세요.` }, HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!(await verifySecret(pin, u.parentPinHash))) {
      const n = u.pinFailCount + 1;
      const locked = n >= PIN_MAX_FAIL;
      await this.store.updateUser(u.id, { pinFailCount: locked ? 0 : n, pinLockedUntil: locked ? new Date(Date.now() + PIN_LOCK_MIN * 60_000) : null });
      throw new ForbiddenException({
        code: locked ? 'PIN_LOCKED' : 'PIN_WRONG',
        message: locked ? `보호자 PIN을 ${PIN_MAX_FAIL}번 틀려서 ${PIN_LOCK_MIN}분 동안 잠겼어요.` : `보호자 PIN이 맞지 않아요. (${n}/${PIN_MAX_FAIL})`,
      });
    }
    if (u.pinFailCount || u.pinLockedUntil) await this.store.updateUser(u.id, { pinFailCount: 0, pinLockedUntil: null });
    return { parentToken: signToken({ sub: u.id, typ: 'parent', ver: u.tokenVersion }, PARENT_TTL), expiresIn: PARENT_TTL };
  }

  /** 내 정보 수정 (보호자 확인 후) */
  async update(userId: string, input: { nickname?: string; currentPassword?: string; newPassword?: string; newParentPin?: string }) {
    const u = await this.findActiveById(userId);
    if (!u) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: '회원 정보를 찾을 수 없어요.' });
    const patch: Parameters<CommerceStore['updateUser']>[1] = {};
    if (input.nickname !== undefined) patch.nickname = input.nickname.trim() || null;
    if (input.newPassword) {
      if (!input.currentPassword || !(await verifySecret(input.currentPassword, u.passwordHash))) {
        throw new ForbiddenException({ code: 'PASSWORD_WRONG', message: '지금 비밀번호가 맞지 않아요.' });
      }
      patch.passwordHash = await hashSecret(input.newPassword);
      patch.tokenVersion = u.tokenVersion + 1; // 비밀번호를 바꾸면 다른 기기는 로그아웃
    }
    if (input.newParentPin) patch.parentPinHash = await hashSecret(input.newParentPin);
    const updated = await this.store.updateUser(userId, patch);
    return patch.tokenVersion !== undefined ? this.tokens(updated!) : { user: this.toMe(updated!) };
  }

  /**
   * 회원 탈퇴(MEM-005): 로그인 정보·PIN 은 지우고 이메일은 알아볼 수 없게 바꾼다.
   * 주문·결제 기록은 전자상거래법 보관 의무 때문에 남긴다(개인 식별 정보 없이).
   */
  async withdraw(userId: string) {
    const u = await this.findActiveById(userId);
    if (!u) return;
    await this.store.updateUser(userId, {
      status: 'WITHDRAWN',
      email: `withdrawn+${u.id}@deleted.invalid`,
      passwordHash: null,
      parentPinHash: null,
      nickname: null,
      tokenVersion: u.tokenVersion + 1,
      withdrawnAt: new Date(),
    });
  }
}
