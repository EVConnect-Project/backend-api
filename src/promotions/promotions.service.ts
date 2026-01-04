import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, Between } from 'typeorm';
import { PromotionEntity, PromotionStatus } from './entities/promotion.entity';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(PromotionEntity)
    private promotionRepository: Repository<PromotionEntity>,
  ) {}

  async create(createPromotionDto: CreatePromotionDto): Promise<PromotionEntity> {
    const promotion = this.promotionRepository.create(createPromotionDto);
    
    // Auto-set status based on dates
    const now = new Date();
    const startDate = new Date(createPromotionDto.startDate);
    const endDate = new Date(createPromotionDto.endDate);

    if (!createPromotionDto.status) {
      if (now < startDate) {
        promotion.status = PromotionStatus.SCHEDULED;
      } else if (now >= startDate && now <= endDate) {
        promotion.status = PromotionStatus.ACTIVE;
      } else {
        promotion.status = PromotionStatus.EXPIRED;
      }
    }

    return this.promotionRepository.save(promotion);
  }

  async findAll(): Promise<PromotionEntity[]> {
    return this.promotionRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findActive(): Promise<PromotionEntity[]> {
    const now = new Date();
    return this.promotionRepository.find({
      where: {
        status: PromotionStatus.ACTIVE,
        startDate: LessThanOrEqual(now),
        endDate: MoreThanOrEqual(now),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<PromotionEntity> {
    const promotion = await this.promotionRepository.findOne({ where: { id } });
    if (!promotion) {
      throw new NotFoundException(`Promotion with ID ${id} not found`);
    }
    return promotion;
  }

  async update(id: string, updatePromotionDto: UpdatePromotionDto): Promise<PromotionEntity> {
    const promotion = await this.findOne(id);
    
    // Auto-update status if dates changed
    if (updatePromotionDto.startDate || updatePromotionDto.endDate) {
      const now = new Date();
      const startDate = new Date(updatePromotionDto.startDate || promotion.startDate);
      const endDate = new Date(updatePromotionDto.endDate || promotion.endDate);

      if (now < startDate) {
        promotion.status = PromotionStatus.SCHEDULED;
      } else if (now >= startDate && now <= endDate) {
        promotion.status = PromotionStatus.ACTIVE;
      } else {
        promotion.status = PromotionStatus.EXPIRED;
      }
    }

    Object.assign(promotion, updatePromotionDto);
    return this.promotionRepository.save(promotion);
  }

  async remove(id: string): Promise<void> {
    const promotion = await this.findOne(id);
    await this.promotionRepository.remove(promotion);
  }

  async trackImpression(id: string): Promise<void> {
    await this.promotionRepository.increment({ id }, 'impressions', 1);
  }

  async trackClick(id: string): Promise<void> {
    await this.promotionRepository.increment({ id }, 'clicks', 1);
  }

  async trackConversion(id: string): Promise<void> {
    await this.promotionRepository.increment({ id }, 'conversions', 1);
  }

  async getStats(): Promise<any> {
    const allPromotions = await this.findAll();
    const activePromotions = await this.findActive();

    const totalImpressions = allPromotions.reduce((sum, p) => sum + p.impressions, 0);
    const totalClicks = allPromotions.reduce((sum, p) => sum + p.clicks, 0);
    const totalConversions = allPromotions.reduce((sum, p) => sum + p.conversions, 0);
    const avgClickRate = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    return {
      totalPromotions: allPromotions.length,
      activePromotions: activePromotions.length,
      totalImpressions,
      totalClicks,
      totalConversions,
      avgClickRate: parseFloat(avgClickRate.toFixed(2)),
    };
  }

  async updateExpiredPromotions(): Promise<void> {
    const now = new Date();
    await this.promotionRepository
      .createQueryBuilder()
      .update(PromotionEntity)
      .set({ status: PromotionStatus.EXPIRED })
      .where('endDate < :now', { now })
      .andWhere('status != :expired', { expired: PromotionStatus.EXPIRED })
      .execute();

    await this.promotionRepository
      .createQueryBuilder()
      .update(PromotionEntity)
      .set({ status: PromotionStatus.ACTIVE })
      .where('startDate <= :now', { now })
      .andWhere('endDate >= :now', { now })
      .andWhere('status = :scheduled', { scheduled: PromotionStatus.SCHEDULED })
      .execute();
  }
}
