import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { MOTION_CAMERAS, MOTION_PARTICLES, MOTION_TRANSITIONS, VOICE_IDS } from '../common/motion-defaults';

export class MotionDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;
  @ApiPropertyOptional({ enum: MOTION_CAMERAS }) @IsOptional() @IsIn(MOTION_CAMERAS as unknown as string[]) camera?: string;
  @ApiPropertyOptional({ enum: MOTION_PARTICLES }) @IsOptional() @IsIn(MOTION_PARTICLES as unknown as string[]) particles?: string;
  @ApiPropertyOptional({ enum: MOTION_TRANSITIONS }) @IsOptional() @IsIn(MOTION_TRANSITIONS as unknown as string[]) transition?: string;
}

export class UpdateBookDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(200) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(30, { each: true }) keywords?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(1_000_000) price?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(18) ageMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(18) ageMax?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(1000) previewPages?: number;
  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] }) @IsOptional() @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']) status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(5) @IsString({ each: true }) categorySlugs?: string[];
  @ApiPropertyOptional({ enum: VOICE_IDS }) @IsOptional() @IsIn(VOICE_IDS as unknown as string[]) narrationVoice?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(-30) @Max(30) narrationRate?: number;
  @ApiPropertyOptional({ type: MotionDto }) @IsOptional() @ValidateNested() @Type(() => MotionDto) motion?: MotionDto;
}

export class PageContentDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(2000) content: string;
}

export class ImageUploadDto {
  /** 그림 파일(PNG·JPEG·WebP)을 base64 글자로 (3MB 이하) */
  @ApiProperty() @IsString() @MinLength(16) @MaxLength(4_400_000) imageBase64: string;
}
