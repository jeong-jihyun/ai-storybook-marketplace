import { CanActivate, ExecutionContext, Injectable, SetMetadata, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { verifyToken } from './crypto';
import { UsersService } from './users.service';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

type AuthedRequest = Request & { user?: AuthUser; parentVerified?: boolean };

const OPTIONAL = 'auth:optional';
const PARENT = 'auth:parent';
/** 로그인하지 않아도 되지만, 로그인했으면 사용자 정보를 채운다 */
export const OptionalAuth = () => SetMetadata(OPTIONAL, true);
/** 보호자 확인(PIN) 후 받은 X-Parent-Token 이 있어야 한다 (결제·개인정보 변경·탈퇴) */
export const ParentOnly = () => SetMetadata(PARENT, true);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AuthedRequest>().user);

/**
 * Authorization: Bearer <access token> 검사.
 * 토큰 버전(token_version)이 다르면(로그아웃·탈퇴) 거절한다.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly users: UsersService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const optional = this.reflector.getAllAndOverride<boolean>(OPTIONAL, [ctx.getHandler(), ctx.getClass()]);
    const needParent = this.reflector.getAllAndOverride<boolean>(PARENT, [ctx.getHandler(), ctx.getClass()]);
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) {
      if (optional) return true;
      throw new UnauthorizedException({ code: 'LOGIN_REQUIRED', message: '로그인이 필요해요.' });
    }
    const p = verifyToken(token, 'access');
    const user = p ? await this.users.findActiveById(p.sub) : null;
    if (!p || !user || user.tokenVersion !== p.ver) {
      throw new UnauthorizedException({ code: 'TOKEN_EXPIRED', message: '다시 로그인해 주세요.' });
    }
    req.user = { id: user.id, email: user.email, role: user.role };

    if (needParent) {
      const pt = verifyToken(req.headers['x-parent-token'] as string | undefined, 'parent');
      if (!pt || pt.sub !== user.id || pt.ver !== user.tokenVersion) {
        throw new UnauthorizedException({ code: 'PARENT_REQUIRED', message: '보호자 확인이 필요해요.' });
      }
      req.parentVerified = true;
    }
    return true;
  }
}
