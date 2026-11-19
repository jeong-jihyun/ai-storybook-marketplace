import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;
const PIN_RULE = /^\d{4}$/;

export class SignupDto {
  @ApiProperty({ example: 'parent@example.com' })
  @IsEmail({}, { message: '이메일 형식이 맞지 않아요.' })
  @MaxLength(255)
  email: string;

  @ApiProperty({ description: '8자 이상, 영문+숫자' })
  @Matches(PASSWORD_RULE, { message: '비밀번호는 영문과 숫자를 섞어 8자 이상으로 해 주세요.' })
  password: string;

  @ApiProperty({ description: '보호자 PIN 숫자 4자리 (결제·개인정보 변경 때 확인)' })
  @Matches(PIN_RULE, { message: '보호자 PIN은 숫자 4자리예요.' })
  parentPin: string;

  @ApiPropertyOptional({ description: '보호자 닉네임' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  nickname?: string;

  @ApiProperty({ description: '이용약관·개인정보 처리방침 동의' })
  @IsBoolean()
  @Equals(true, { message: '약관에 동의해 주세요.' })
  agreeTerms: boolean;

  @ApiProperty({ description: '만 19세 이상 보호자 확인' })
  @IsBoolean()
  @Equals(true, { message: '보호자(만 19세 이상)만 가입할 수 있어요.' })
  parentConfirmed: boolean;
}

export class LoginDto {
  @ApiProperty() @IsEmail({}, { message: '이메일 형식이 맞지 않아요.' }) @MaxLength(255) email: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(64) password: string;
}

export class RefreshDto {
  @ApiProperty() @IsString() @MaxLength(2000) refreshToken: string;
}

export class ParentVerifyDto {
  @ApiProperty({ example: '1234' }) @Matches(PIN_RULE, { message: '보호자 PIN은 숫자 4자리예요.' }) pin: string;
}

export class UpdateMeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) nickname?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) currentPassword?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(PASSWORD_RULE, { message: '비밀번호는 영문과 숫자를 섞어 8자 이상으로 해 주세요.' })
  newPassword?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(PIN_RULE, { message: '보호자 PIN은 숫자 4자리예요.' }) newParentPin?: string;
}
