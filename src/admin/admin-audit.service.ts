import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AdminAction } from "./entities/admin-action.entity";

@Injectable()
export class AdminAuditService {
  constructor(
    @InjectRepository(AdminAction)
    private adminActionRepo: Repository<AdminAction>,
  ) {}

  async logAction(
    adminId: string,
    actionType: string,
    targetType: string,
    targetId: string,
    details?: Record<string, any>,
    reason?: string,
    ipAddress?: string,
  ): Promise<AdminAction> {
    const action = this.adminActionRepo.create({
      adminId,
      actionType,
      targetType,
      targetId,
      details,
      reason,
      ipAddress,
    });

    return await this.adminActionRepo.save(action);
  }

  async getActionHistory(
    filters?: {
      adminId?: string;
      targetType?: string;
      targetId?: string;
      actionType?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 50,
  ) {
    const query = this.adminActionRepo
      .createQueryBuilder("action")
      .leftJoinAndSelect("action.admin", "admin")
      .orderBy("action.createdAt", "DESC");

    if (filters?.adminId) {
      query.andWhere("action.adminId = :adminId", { adminId: filters.adminId });
    }

    if (filters?.targetType) {
      query.andWhere("action.targetType = :targetType", {
        targetType: filters.targetType,
      });
    }

    if (filters?.targetId) {
      query.andWhere("action.targetId = :targetId", {
        targetId: filters.targetId,
      });
    }

    if (filters?.actionType) {
      query.andWhere("action.actionType = :actionType", {
        actionType: filters.actionType,
      });
    }

    if (filters?.startDate) {
      query.andWhere("action.createdAt >= :startDate", {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      query.andWhere("action.createdAt <= :endDate", {
        endDate: filters.endDate,
      });
    }

    const [actions, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      actions,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }
}
