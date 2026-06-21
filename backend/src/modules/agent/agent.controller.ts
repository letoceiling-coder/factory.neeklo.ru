import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { AgentService } from './agent.service';
import { CurrentUser } from '../auth/decorators';

class SendDto {
  @IsString() content!: string;
}
class CreateSessionDto {
  @IsOptional() @IsString() title?: string;
}
class ConfirmDto {
  @IsBoolean() approved!: boolean;
}

@Controller('agent')
export class AgentController {
  constructor(private readonly agent: AgentService) {}

  @Get('sessions')
  sessions(@CurrentUser('id') userId: string) {
    return this.agent.listSessions(userId);
  }

  @Post('sessions')
  create(@CurrentUser('id') userId: string, @Body() dto: CreateSessionDto) {
    return this.agent.createSession(userId, dto.title);
  }

  @Get('sessions/:id')
  get(@Param('id') id: string) {
    return this.agent.getSession(id);
  }

  @Delete('sessions/:id')
  remove(@Param('id') id: string) {
    return this.agent.deleteSession(id);
  }

  @Post('sessions/:id/messages')
  send(@Param('id') id: string, @Body() dto: SendDto) {
    return this.agent.send(id, dto.content);
  }

  @Post('messages/:messageId/confirm')
  confirm(@Param('messageId') messageId: string, @Body() dto: ConfirmDto) {
    return this.agent.confirm(messageId, dto.approved);
  }
}
