import type { Request, Response } from 'express';
import type { INestApplication } from '@nestjs/common';
import { createApp } from './app.factory';

// Vercel 서버리스 함수용 진입점: 앱을 한 번만 만들고 재사용한다.
let appPromise: Promise<INestApplication> | null = null;

export default async function handler(req: Request, res: Response) {
  appPromise ??= createApp();
  const app = await appPromise;
  const instance = app.getHttpAdapter().getInstance();
  return instance(req, res);
}
