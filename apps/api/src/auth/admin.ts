import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from './auth.guard';

/** 관리자로 지정한 이메일 목록 (서버 환경변수 ADMIN_EMAILS, 쉼표로 구분, 대소문자 무시) */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const isAdminEmail = (email: string | undefined | null) => !!email && adminEmails().includes(email.trim().toLowerCase());

/**
 * 관리자 전용. AuthGuard 다음에 쓴다 (로그인한 사용자 정보가 있어야 함).
 * 이메일 목록은 요청마다 읽으므로 환경변수를 바꾸고 다시 배포하면 바로 반영된다.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>().user;
    if (!user || !isAdminEmail(user.email)) {
      throw new ForbiddenException({ code: 'ADMIN_ONLY', message: '관리자만 쓸 수 있어요.' });
    }
    return true;
  }
}
