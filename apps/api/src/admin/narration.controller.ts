import { Controller, Get, Headers, Inject, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { timingSafeEqual } from 'node:crypto';
import { CATALOG_REPOSITORY, type CatalogRepository } from '../catalog/catalog.repository';

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * 낭독 음성 자동 생성(GitHub Actions)이 읽어 가는 본문 목록.
 * 구매 전 쪽까지 모두 들어 있으므로 NARRATION_TOKEN(비밀 값)이 맞을 때만 준다. 토큰이 설정 안 되면 항상 거절.
 */
@ApiTags('낭독 음성')
@Controller('narration')
export class NarrationController {
  constructor(@Inject(CATALOG_REPOSITORY) private readonly repo: CatalogRepository) {}

  @Get('source')
  @ApiOperation({ summary: '음성 생성용 본문·목소리 설정 (토큰 필요)' })
  async source(@Headers('x-narration-token') token?: string) {
    const expected = process.env.NARRATION_TOKEN ?? '';
    if (!expected || !token || !same(token, expected)) {
      throw new UnauthorizedException({ code: 'NARRATION_TOKEN', message: '토큰이 맞지 않아요.' });
    }
    const books = (await this.repo.listAllBooks()).filter((b) => b.status === 'PUBLISHED' || b.status === 'ARCHIVED');
    const out = [];
    for (const b of books) {
      const pages = await this.repo.findPages(b.id, 1, b.pageCount);
      out.push({ id: b.id, voice: b.narrationVoice, rate: b.narrationRate, pages: pages.map((p) => p.content) });
    }
    return { version: 1, books: out };
  }
}
