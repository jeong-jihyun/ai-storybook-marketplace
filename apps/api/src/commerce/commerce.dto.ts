import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PaymentProviderName } from '@storybook/shared-types';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, ValidateNested } from 'class-validator';
import { PROVIDERS } from './providers/payment-provider';

export class CreateOrderDto {
  @ApiProperty({ type: [String], description: '살 책 ID (최대 10권)' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsUUID('all', { each: true })
  bookIds: string[];

  @ApiProperty({ description: '같은 주문을 두 번 만들지 않기 위한 키 (앱이 버튼마다 새로 만듦)' })
  @Matches(/^[A-Za-z0-9_-]{8,64}$/)
  idempotencyKey: string;
}

export class VerifyPaymentDto {
  @ApiProperty() @IsUUID() orderId: string;
  @ApiProperty({ enum: PROVIDERS }) @IsIn(PROVIDERS) provider: PaymentProviderName;
  @ApiPropertyOptional({ example: 'storybook_001' }) @IsOptional() @IsString() @MaxLength(100) productId?: string;
  @ApiProperty({ description: '스토어 영수증(구글: purchaseToken, 애플: transactionId, 테스트: 테스트 영수증)' })
  @IsString()
  @MaxLength(4000)
  purchaseToken: string;
}

export class TestCheckoutDto {
  @ApiProperty() @IsUUID() orderId: string;
  @ApiProperty({ enum: ['success', 'cancel', 'fail'] }) @IsIn(['success', 'cancel', 'fail']) outcome: 'success' | 'cancel' | 'fail';
}

export class CloseOrderDto {
  @ApiProperty({ enum: ['CANCELED', 'FAILED'] }) @IsIn(['CANCELED', 'FAILED']) status: 'CANCELED' | 'FAILED';
}

class RestoreItem {
  @ApiProperty() @IsString() @MaxLength(100) productId: string;
  @ApiProperty() @IsString() @MaxLength(4000) purchaseToken: string;
}

export class RestoreDto {
  @ApiProperty({ enum: PROVIDERS }) @IsIn(PROVIDERS) provider: PaymentProviderName;
  @ApiProperty({ type: [RestoreItem] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => RestoreItem)
  purchases: RestoreItem[];
}
