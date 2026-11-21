import { Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Put, Res, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AdminGuard } from '../auth/admin';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { ImageUploadDto, PageContentDto, UpdateBookDto } from './admin.dto';
import { AdminService } from './admin.service';
import { AssetStorage } from './asset-storage';

const uuid = new ParseUUIDPipe({ version: undefined });

@ApiTags('관리자')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('books')
  @ApiOperation({ summary: '모든 상태의 동화책 목록' })
  list() {
    return this.admin.list();
  }

  @Get('books/:id')
  @ApiOperation({ summary: '동화책 편집용 상세 (모든 쪽·설정 포함)' })
  detail(@Param('id', uuid) id: string) {
    return this.admin.detail(id);
  }

  @Patch('books/:id')
  @ApiOperation({ summary: '제목·소개·가격·상태·카테고리·목소리·움직임 수정' })
  update(@Param('id', uuid) id: string, @Body() dto: UpdateBookDto, @CurrentUser() u: AuthUser) {
    return this.admin.update(u.id, id, dto);
  }

  @Post('books/:id/pages')
  @ApiOperation({ summary: '맨 뒤에 새 쪽 추가' })
  addPage(@Param('id', uuid) id: string, @Body() dto: PageContentDto, @CurrentUser() u: AuthUser) {
    return this.admin.addPage(u.id, id, dto.content);
  }

  @Delete('books/:id/pages/last')
  @ApiOperation({ summary: '맨 뒤 쪽 삭제 (최소 1쪽 유지)' })
  removeLast(@Param('id', uuid) id: string, @CurrentUser() u: AuthUser) {
    return this.admin.removeLastPage(u.id, id);
  }

  @Put('books/:id/pages/:page')
  @ApiOperation({ summary: '쪽 글 수정' })
  setContent(@Param('id', uuid) id: string, @Param('page', ParseIntPipe) page: number, @Body() dto: PageContentDto, @CurrentUser() u: AuthUser) {
    return this.admin.setPageContent(u.id, id, page, dto.content);
  }

  @Put('books/:id/pages/:page/image')
  @ApiOperation({ summary: '쪽 그림 교체 (PNG·JPEG·WebP, 3MB 이하)' })
  setImage(@Param('id', uuid) id: string, @Param('page', ParseIntPipe) page: number, @Body() dto: ImageUploadDto, @CurrentUser() u: AuthUser) {
    return this.admin.setPageImage(u.id, id, page, dto.imageBase64);
  }

  @Put('books/:id/cover')
  @ApiOperation({ summary: '표지 그림 교체' })
  setCover(@Param('id', uuid) id: string, @Body() dto: ImageUploadDto, @CurrentUser() u: AuthUser) {
    return this.admin.setCover(u.id, id, dto.imageBase64);
  }
}

/** Supabase 가 없는 환경(로컬·시험)에서 올린 그림을 메모리에서 보여 준다 */
@Controller('assets/uploads')
export class UploadedAssetController {
  constructor(private readonly storage: AssetStorage) {}

  @Get('*path')
  get(@Param('path') path: string[] | string, @Res() res: Response) {
    const key = Array.isArray(path) ? path.join('/') : path;
    const hit = this.storage.memory.get(key);
    if (!hit) throw new NotFoundException();
    res.setHeader('Content-Type', hit.type);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(hit.buf);
  }
}
