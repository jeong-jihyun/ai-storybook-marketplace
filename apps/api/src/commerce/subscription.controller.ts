import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import type { PaymentProviderName } from '@storybook/shared-types';
import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { AuthGuard, CurrentUser, ParentOnly, type AuthUser } from '../auth/auth.guard';
import { PROVIDERS } from './providers/payment-provider';
import { SubscriptionService } from './subscription.service';

class PlanCodeDto {
  @ApiProperty({ example: 'monthly_3' }) @Matches(/^[a-z0-9_]{1,50}$/) planCode: string;
}
class SubTestCheckoutDto extends PlanCodeDto {
  @ApiProperty({ enum: ['success', 'cancel', 'fail'] }) @IsIn(['success', 'cancel', 'fail']) outcome: 'success' | 'cancel' | 'fail';
}
class SubVerifyDto {
  @ApiProperty({ enum: PROVIDERS }) @IsIn(PROVIDERS) provider: PaymentProviderName;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) productId?: string;
  @ApiProperty() @IsString() @MaxLength(4000) purchaseToken: string;
}
class RedeemDto {
  @ApiProperty() @IsUUID() bookId: string;
}

@ApiTags('구독(월 소장권)')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subs: SubscriptionService) {}

  @Get('plans')
  @ApiOperation({ summary: '구독 요금제' })
  plans() {
    return this.subs.plans();
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 구독 (없으면 null)' })
  async me(@CurrentUser() u: AuthUser) {
    return { subscription: await this.subs.mine(u.id) };
  }

  @Post('test/checkout')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ParentOnly()
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Parent-Token', required: true })
  @ApiOperation({ summary: '테스트 구독 결제창 (돈이 나가지 않음)' })
  testCheckout(@CurrentUser() u: AuthUser, @Body() dto: SubTestCheckoutDto) {
    return this.subs.testCheckout(u.id, dto.planCode, dto.outcome);
  }

  @Post('verify')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ParentOnly()
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Parent-Token', required: true })
  @ApiOperation({ summary: '구독 영수증 검증 → 구독 시작·갱신' })
  verify(@CurrentUser() u: AuthUser, @Body() dto: SubVerifyDto) {
    return this.subs.verify(u.id, dto);
  }

  @Post('cancel')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ParentOnly()
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Parent-Token', required: true })
  @ApiOperation({ summary: '해지 예약 (기간 끝까지 사용 가능)' })
  cancel(@CurrentUser() u: AuthUser) {
    return this.subs.cancel(u.id);
  }

  @Post('resume')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ParentOnly()
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Parent-Token', required: true })
  @ApiOperation({ summary: '해지 예약 취소' })
  resume(@CurrentUser() u: AuthUser) {
    return this.subs.resume(u.id);
  }

  @Post('redeem')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ParentOnly()
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Parent-Token', required: true })
  @ApiOperation({ summary: '소장권으로 책 받기 (영구 소장)' })
  redeem(@CurrentUser() u: AuthUser, @Body() dto: RedeemDto) {
    return this.subs.redeem(u.id, dto.bookId);
  }
}
