import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('reports')
  @UseGuards(JwtAuthGuard)
  async create(@Request() req, @Body() createReportDto: CreateReportDto) {
    return await this.supportService.create(createReportDto, req.user?.userId);
  }

  @Get('reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'station_owner')
  async findAll() {
    return await this.supportService.findAll();
  }

  @Get('reports/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'station_owner')
  async getStatistics() {
    return await this.supportService.getStatistics();
  }

  @Get('reports/my-reports')
  @UseGuards(JwtAuthGuard)
  async findMyReports(@Request() req) {
    return await this.supportService.findByUser(req.user.userId);
  }

  @Get('reports/:id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return await this.supportService.findOne(id);
  }

  @Patch('reports/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'station_owner')
  async update(
    @Param('id') id: string,
    @Body() updateReportDto: UpdateReportDto,
    @Request() req,
  ) {
    return await this.supportService.update(
      id,
      updateReportDto,
      req.user?.userId,
    );
  }

  @Delete('reports/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: string) {
    await this.supportService.delete(id);
    return { message: 'Report deleted successfully' };
  }
}
