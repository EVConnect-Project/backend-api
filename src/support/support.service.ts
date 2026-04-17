import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SupportReport, ReportStatus } from "./entities/support-report.entity";
import { CreateReportDto } from "./dto/create-report.dto";
import { UpdateReportDto } from "./dto/update-report.dto";
import { SmsService } from "../auth/sms.service";

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportReport)
    private readonly supportReportRepository: Repository<SupportReport>,
    private readonly smsService: SmsService,
  ) {}

  async create(
    createReportDto: CreateReportDto,
    userId?: string,
  ): Promise<SupportReport> {
    console.log("🔧 Support Service - Creating report:", {
      dto: createReportDto,
      userId,
    });

    try {
      const report = this.supportReportRepository.create({
        category: createReportDto.category,
        title: createReportDto.title,
        description: createReportDto.description,
        userId,
        status: ReportStatus.PENDING,
      });

      console.log("💾 Saving support report...");
      const savedReport = await this.supportReportRepository.save(report);
      console.log("✅ Support report saved:", savedReport.id);

      return savedReport;
    } catch (error) {
      console.error("❌ Error creating support report:", error);
      throw error;
    }
  }

  async findAll(): Promise<SupportReport[]> {
    return await this.supportReportRepository.find({
      relations: ["user"],
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: string): Promise<SupportReport> {
    const report = await this.supportReportRepository.findOne({
      where: { id },
      relations: ["user"],
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    return report;
  }

  async findByUser(userId: string): Promise<SupportReport[]> {
    return await this.supportReportRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
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
    const updatedReport = await this.supportReportRepository.save(report);

    const hasAdminResponse = !!(updateReportDto.adminResponse || "").trim();
    const userPhone = report.user?.phoneNumber;

    if (hasAdminResponse && userPhone) {
      this.smsService
        .sendSupportReportResponseSMS(userPhone, {
          responseMessage: updateReportDto.adminResponse || "",
        })
        .catch((error) => {
          console.error(
            `Failed to send support-response SMS for report ${id}:`,
            error,
          );
        });
    }

    return updatedReport;
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
