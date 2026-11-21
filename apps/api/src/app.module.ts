import { DynamicModule, Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './catalog/catalog.controller';
import { CATALOG_REPOSITORY } from './catalog/catalog.repository';
import { CatalogService } from './catalog/catalog.service';
import { catalogEntities } from './catalog/entities/catalog.entities';
import { SeedCatalogRepository } from './catalog/seed-catalog.repository';
import { TypeOrmCatalogRepository } from './catalog/typeorm-catalog.repository';
import { AdminController, UploadedAssetController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { AssetStorage } from './admin/asset-storage';
import { NarrationController } from './admin/narration.controller';
import { AdminGuard } from './auth/admin';
import { HealthController } from './health.controller';
import { AuthController } from './auth/auth.controller';
import { AuthGuard } from './auth/auth.guard';
import { UsersService } from './auth/users.service';
import { CommerceController } from './commerce/commerce.controller';
import { CommerceService, defaultProviders, PAYMENT_PROVIDERS } from './commerce/commerce.service';
import { COMMERCE_STORE } from './commerce/commerce.store';
import { MemoryCommerceStore } from './commerce/memory-commerce.store';
import { PgCommerceStore } from './commerce/pg-commerce.store';
import type { PaymentProvider } from './commerce/providers/payment-provider';
import { SubscriptionController } from './commerce/subscription.controller';
import { SubscriptionService } from './commerce/subscription.service';
import { CLOCK, systemClock, type Clock } from './common/clock';
import { resolveDatabaseUrl, sslOption } from './common/database-url';

/**
 * DATABASE_URL 이 있으면 PostgreSQL, 없으면 시드 데이터로 동작한다.
 * (무료 배포·데모 환경에서는 DB 없이도 화면을 확인할 수 있게 하기 위함)
 */
@Module({})
export class AppModule {
  static register(databaseUrl = resolveDatabaseUrl(), providers: PaymentProvider[] = defaultProviders(), clock: Clock = systemClock): DynamicModule {
    const imports = databaseUrl
      ? [
          TypeOrmModule.forRoot({
            type: 'postgres',
            url: databaseUrl,
            entities: catalogEntities,
            synchronize: false,
            ssl: sslOption(databaseUrl),
            // 서버리스(Vercel)는 인스턴스가 여러 개 뜨므로 인스턴스당 연결을 적게 (Supabase 무료 연결 수 보호)
            extra: { max: Number(process.env.DATABASE_POOL_MAX ?? 3), idleTimeoutMillis: 10_000 },
          }),
        ]
      : [];
    const repo: Provider = { provide: CATALOG_REPOSITORY, useClass: databaseUrl ? TypeOrmCatalogRepository : SeedCatalogRepository };
    return {
      module: AppModule,
      imports,
      controllers: [HealthController, CatalogController, AuthController, CommerceController, SubscriptionController, AdminController, UploadedAssetController, NarrationController],
      providers: [
        CatalogService,
        repo,
        { provide: COMMERCE_STORE, useClass: databaseUrl ? PgCommerceStore : MemoryCommerceStore },
        { provide: PAYMENT_PROVIDERS, useValue: providers },
        UsersService,
        AuthGuard,
        AdminGuard,
        AdminService,
        AssetStorage,
        CommerceService,
        SubscriptionService,
        { provide: CLOCK, useValue: clock },
      ],
    };
  }
}
