import { ApiPropertyOptional } from '@nestjs/swagger';
import type { BookSort } from '@storybook/shared-types';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export const BOOK_SORTS: BookSort[] = ['latest', 'popular', 'price_asc', 'price_desc'];

export class ListBooksQuery {
  @ApiPropertyOptional({ description: '카테고리 slug (adventure, friendship, nature, bedtime, habits)' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]{1,50}$/)
  category?: string;

  @ApiPropertyOptional({ description: '아이 나이 (해당 나이가 권장 연령에 포함된 책만)', minimum: 0, maximum: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(15)
  age?: number;

  @ApiPropertyOptional({ enum: BOOK_SORTS, default: 'latest' })
  @IsOptional()
  @IsIn(BOOK_SORTS)
  sort?: BookSort;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class SearchBooksQuery extends ListBooksQuery {
  @ApiPropertyOptional({ description: '제목·소개·키워드 검색어' })
  @IsString()
  @MaxLength(50)
  q: string;
}
