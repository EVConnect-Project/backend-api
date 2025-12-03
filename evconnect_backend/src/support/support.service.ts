import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportReport, ReportStatus } from './entities/support-report.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportReport)
    private readonly supportReportRepository: Repository<SupportReport>,
  ) {}

  async create(
    createReportDto: CreateReportDto,
    userId?: string,
  ): Promise<SupportReport> {
    const report = this.supportReportRepository.create({
      ...createReportDto,
      userId,
      status: ReportStatus.PENDING,
    });

    return await this.supportReportRepository.save(report);
  }

  async findAll(): Promise<SupportReport[]> {
    return await this.supportReportRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<SupportReport> {
    const report = await this.supportReportRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    return report;
  }

  async findByUser(userId: string): Promise<SupportReport[]> {
    return await this.supportReportRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: string,
    updateReportDto: UpdateReportDto,
    adminId?: string,
  ): Promise<SupportReport> {
    const report = await this.findOne(id);

    Object.assign(report, updateReportDto);

    if (adminId && updateReportDto.adminResponse) {
      report.respondedBy = adminId;
    }

    if (updateReportDto.status === ReportStatus.RESOLVED) {
      report.resolvedAt = new Date();
    }

    return await this.supportReportRepository.save(report);
  }

  async delete(id: string): Promise<void> {
    const result = await this.supportReportRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }
  }

  async getStatistics() {
    const total = await this.supportReportRepository.count();
    const pending = await this.supportReportRepository.count({
      where: { status: ReportStatus.PENDING },
    });
    const inProgress = await this.supportReportRepository.count({
      where: { status: ReportStatus.IN_PROGRESS },
    });
    const resolved = await this.supportReportRepository.count({
      where: { status: ReportStatus.RESOLVED },
    });
    const closed = await this.supportReportRepository.count({
      where: { status: ReportStatus.CLOSED },
    });

    return {
      total,
      pending,
      inProgress,
      resolved,
      closed,
    };
  }
}
