import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('상태')
@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { status: 'ok', dataSource: process.env.DATABASE_URL ? 'postgres' : 'seed', time: new Date().toISOString() };
  }
}
