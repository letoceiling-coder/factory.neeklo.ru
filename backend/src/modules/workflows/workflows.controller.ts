import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { WorkflowsService } from './workflows.service';

class CreateWorkflowDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
}

class SaveGraphDto {
  @IsArray() nodes!: any[];
  @IsArray() edges!: any[];
  @IsOptional() viewport?: any;
}

@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly service: WorkflowsService) {}

  @Get('palette')
  palette() {
    return this.service.palette();
  }

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateWorkflowDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/graph')
  saveGraph(@Param('id') id: string, @Body() dto: SaveGraphDto) {
    return this.service.saveGraph(id, dto);
  }

  @Post(':id/preview')
  preview(@Param('id') id: string) {
    return this.service.preview(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
