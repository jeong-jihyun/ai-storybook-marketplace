import { DynamicModule, Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './catalog/catalog.controller';
import { CATALOG_REPOSITORY } from './catalog/catalog.repository';
import { CatalogService } from './catalog/catalog.service';
import { catalogEntities } from './catalog/entities/catalog.entities';
import { SeedCatalogRepository } from './catalog/seed-catalog.repository';
import { TypeOrmCatalogRepository } from './catalog/typeorm-catalog.repository';
import { HealthController } from './health.controller';

/**
 * DATABASE_URL 이 있으면 PostgreSQL, 없으면 시드 데이터로 동작한다.
 * (무료 배포·데모 환경에서는 DB 없이도 화면을 확인할 수 있게 하기 위함)
 */
@Module({})
export class AppModule {
  static register(databaseUrl = process.env.DATABASE_URL): DynamicModule {
    const imports = databaseUrl
      ? [
          TypeOrmModule.forRoot({
            type: 'postgres',
            url: databaseUrl,
            entities: catalogEntities,
            synchronize: false,
            ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
          }),
        ]
      : [];
    const repo: Provider = { provide: CATALOG_REPOSITORY, useClass: databaseUrl ? TypeOrmCatalogRepository : SeedCatalogRepository };
    return {
      module: AppModule,
      imports,
      controllers: [HealthController, CatalogController],
      providers: [CatalogService, repo],
    };
  }
}
