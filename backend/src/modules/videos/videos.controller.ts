import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { VideosService } from './videos.service';

class CreateProjectDto {
  @IsString() title!: string;
  @IsOptional() @IsString() brief?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() aspectRatio?: string;
}

@Controller('videos')
export class VideosController {
  constructor(private readonly service: VideosService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/script')
  generateScript(@Param('id') id: string, @Body() body: any) {
    return this.service.generateScript(id, body || {});
  }

  @Post(':id/generate')
  startGeneration(@Param('id') id: string) {
    return this.service.startGeneration(id);
  }

  @Post(':id/scenes')
  addScene(@Param('id') id: string, @Body() body: any) {
    return this.service.addScene(id, body);
  }

  @Put('scenes/:sceneId')
  updateScene(@Param('sceneId') sceneId: string, @Body() body: any) {
    return this.service.updateScene(sceneId, body);
  }

  @Delete('scenes/:sceneId')
  deleteScene(@Param('sceneId') sceneId: string) {
    return this.service.deleteScene(sceneId);
  }
}
