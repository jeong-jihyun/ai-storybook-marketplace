import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { resolveDatabaseUrl } from './common/database-url';

@ApiTags('상태')
@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { status: 'ok', dataSource: resolveDatabaseUrl() ? 'postgres' : 'seed', time: new Date().toISOString() };
  }
}
