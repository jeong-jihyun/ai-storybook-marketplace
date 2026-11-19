import { Body, Controller, Delete, Get, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard, CurrentUser, ParentOnly, type AuthUser } from './auth.guard';
import { LoginDto, ParentVerifyDto, RefreshDto, SignupDto, UpdateMeDto } from './auth.dto';
import { UsersService } from './users.service';

@ApiTags('인증·회원')
@Controller()
export class AuthController {
  constructor(private readonly users: UsersService) {}

  @Post('auth/signup')
  @ApiOperation({ summary: '회원가입 (MEM-001) — 보호자 계정' })
  signup(@Body() dto: SignupDto) {
    return this.users.signup(dto);
  }

  @Post('auth/login')
  @HttpCode(200)
  @ApiOperation({ summary: '로그인 (MEM-002)' })
  login(@Body() dto: LoginDto) {
    return this.users.login(dto.email, dto.password);
  }

  @Post('auth/refresh')
  @HttpCode(200)
  @ApiOperation({ summary: '토큰 갱신 (MEM-003)' })
  refresh(@Body() dto: RefreshDto) {
    return this.users.refresh(dto.refreshToken);
  }

  @Post('auth/logout')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '로그아웃 — 모든 기기의 토큰 폐기' })
  async logout(@CurrentUser() user: AuthUser) {
    await this.users.logout(user.id);
  }

  @Get('users/me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 정보' })
  me(@CurrentUser() user: AuthUser) {
    return this.users.me(user.id);
  }

  @Patch('users/me')
  @UseGuards(AuthGuard)
  @ParentOnly()
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Parent-Token', required: true })
  @ApiOperation({ summary: '내 정보 수정 (보호자 확인 필요)' })
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.users.update(user.id, dto);
  }

  @Delete('users/me')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @ParentOnly()
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Parent-Token', required: true })
  @ApiOperation({ summary: '회원 탈퇴 (MEM-005, 보호자 확인 필요)' })
  async withdraw(@CurrentUser() user: AuthUser) {
    await this.users.withdraw(user.id);
  }

  @Post('parent/verify')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '보호자 확인 (MEM-004) — PIN 확인 후 10분짜리 보호자 토큰' })
  verifyParent(@CurrentUser() user: AuthUser, @Body() dto: ParentVerifyDto) {
    return this.users.verifyParent(user.id, dto.pin);
  }
}
