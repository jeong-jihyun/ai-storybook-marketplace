import { Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListBooksQuery, SearchBooksQuery } from './catalog.dto';
import { CatalogService } from './catalog.service';

const uuid = new ParseUUIDPipe({ version: undefined });

@ApiTags('동화책·카테고리')
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('home')
  @ApiOperation({ summary: '홈 화면 섹션 (추천·인기·신규·카테고리)' })
  home() {
    return this.catalog.home();
  }

  @Get('categories')
  @ApiOperation({ summary: '카테고리 목록 (BOOK-003)' })
  categories() {
    return this.catalog.categories();
  }

  // 정적 경로(search, bestsellers)를 :id 보다 먼저 선언해야 한다.
  @Get('books/search')
  @ApiOperation({ summary: '동화책 검색 (BOOK-004)' })
  search(@Query() q: SearchBooksQuery) {
    return this.catalog.listBooks({ q: q.q, categorySlug: q.category, age: q.age, sort: q.sort ?? 'latest', page: q.page ?? 1, limit: q.limit ?? 20 });
  }

  @Get('books/bestsellers')
  @ApiOperation({ summary: '인기 도서 (BOOK-006)' })
  bestsellers(@Query() q: ListBooksQuery) {
    return this.catalog.listBooks({ categorySlug: q.category, age: q.age, sort: 'popular', page: q.page ?? 1, limit: q.limit ?? 10 });
  }

  @Get('books')
  @ApiOperation({ summary: '동화책 목록·페이지네이션 (BOOK-001)' })
  list(@Query() q: ListBooksQuery) {
    return this.catalog.listBooks({ categorySlug: q.category, age: q.age, sort: q.sort ?? 'latest', page: q.page ?? 1, limit: q.limit ?? 20 });
  }

  @Get('books/:id')
  @ApiOperation({ summary: '동화책 상세 (BOOK-002)' })
  detail(@Param('id', uuid) id: string) {
    return this.catalog.detail(id);
  }

  @Get('books/:id/preview')
  @ApiOperation({ summary: '무료 미리보기 (BOOK-005)' })
  preview(@Param('id', uuid) id: string) {
    return this.catalog.preview(id);
  }

  @Get('books/:id/pages/:page')
  @ApiOperation({ summary: '허용된 페이지 한 장 (1단계: 미리보기 범위만)' })
  page(@Param('id', uuid) id: string, @Param('page', ParseIntPipe) page: number) {
    return this.catalog.page(id, page);
  }
}
