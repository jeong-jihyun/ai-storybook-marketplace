import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

const DEFAULT_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  429: 'TOO_MANY_REQUESTS',
};

/** 모든 오류를 { statusCode, code, message } 한 가지 모양으로 돌려준다. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Error');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as string | { code?: string; message?: string | string[] };
      const message = typeof body === 'string' ? body : Array.isArray(body.message) ? body.message.join(', ') : body.message ?? exception.message;
      const code = (typeof body === 'object' && body.code) || DEFAULT_CODES[status] || 'ERROR';
      return res.status(status).json({ statusCode: status, code, message });
    }
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: 500, code: 'INTERNAL_ERROR', message: '잠시 후 다시 시도해 주세요.' });
  }
}
