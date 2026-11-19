import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { ASSET_PREFIX } from './common/asset-url';
import { AllExceptionsFilter } from './common/http-exception.filter';

/** storage 폴더 위치 (로컬 Object Storage 대용) */
export function storageDir(): string {
  const candidates = [process.env.STORAGE_DIR, resolve(__dirname, '../storage'), resolve(process.cwd(), 'apps/api/storage'), resolve(process.cwd(), 'storage')];
  return candidates.find((p): p is string => !!p && existsSync(p)) ?? resolve(__dirname, '../storage');
}

export async function createApp(options: { databaseUrl?: string; logger?: boolean } = {}): Promise<INestApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register(options.databaseUrl ?? process.env.DATABASE_URL), {
    logger: options.logger === false ? false : ['error', 'warn', 'log'],
  });
  app.enableCors({ origin: true });
  app.disable('x-powered-by');
  app.use(ASSET_PREFIX, express.static(storageDir(), { maxAge: '7d', immutable: true }));
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  const doc = new DocumentBuilder()
    .setTitle('AI 동화책 마켓 API')
    .setDescription('AI 생성 동화책 판매 모바일 앱 백엔드 (1단계: 카탈로그)')
    .setVersion('0.1.0')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));

  // (선택) WEB_DIST 가 있으면 모바일 웹 빌드도 같은 서버에서 제공한다 — 로컬 한 번에 확인용
  const webDist = process.env.WEB_DIST && resolve(process.env.WEB_DIST);
  if (webDist && existsSync(resolve(webDist, 'index.html'))) {
    app.use(express.static(webDist, { index: false, maxAge: '1h' }));
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
      res.sendFile(resolve(webDist, 'index.html'));
    });
  }
  await app.init();
  return app;
}
