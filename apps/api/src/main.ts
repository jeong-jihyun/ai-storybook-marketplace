import { createApp } from './app.factory';
import { resolveDatabaseUrl } from './common/database-url';

async function bootstrap() {
  const app = await createApp();
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`API 실행 중: http://localhost:${port}/api/v1  (문서: /api/docs, 데이터: ${resolveDatabaseUrl() ? 'PostgreSQL' : '시드'})`);
}
bootstrap();
