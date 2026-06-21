import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../auth/decorators';

class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(4) password!: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() role?: 'admin' | 'user';
}

class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() role?: 'admin' | 'user';
  @IsOptional() @IsString() password?: string;
}

@Controller('users')
@Roles('admin')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    return users.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt }));
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const password = await bcrypt.hash(dto.password, 10);
    const u = await this.prisma.user.create({
      data: { email: dto.email, password, name: dto.name, role: dto.role || 'user' },
    });
    return { id: u.id, email: u.email, name: u.name, role: u.role };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const data: any = { name: dto.name, role: dto.role };
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    const u = await this.prisma.user.update({ where: { id }, data });
    return { id: u.id, email: u.email, name: u.name, role: u.role };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }
}
