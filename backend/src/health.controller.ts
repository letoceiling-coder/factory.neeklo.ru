import { Controller, Get } from '@nestjs/common';
import { Public } from './modules/auth/decorators';

@Controller()
export class HealthController {
  @Public()
  @Get('health')
  health() {
    return { status: 'ok', service: 'factory-backend', time: new Date().toISOString() };
  }
}
