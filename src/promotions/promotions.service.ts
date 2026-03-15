import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { PromotionEntity, PromotionStatus, AdPlacement, BillingModel } from './entities/promotion.entity';
import { AdImpressionEntity, AdEventType } from './entities/ad-impression.entity';
import { AbTestEntity, AbTestStatus } from './entities/ab-test.entity';
import { AdRevenueLedgerEntity } from './entities/ad-revenue-ledger.entity';
import { CreatePromotionDto, UpdatePromotionDto, CreateAbTestDto, UpdateAbTestDto } from './dto/promotion.dto';

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    @InjectRepository(PromotionEntity)
    private promotionRepository: Repository<PromotionEntity>,
    @InjectRepository(AdImpressionEntity)
    private impressionRepository: Repository<AdImpressionEntity>,
    @InjectRepository(AbTestEntity)
    private abTestRepository: Repository<AbTestEntity>,
    @InjectRepository(AdRevenueLedgerEntity)
    private revenueLedgerRepository: Repository<AdRevenueLedgerEntity>,
  ) {}

  // ══════════════════════════════════════════════════════════════
  // PROMOTION CRUD
  // ══════════════════════════════════════════════════════════════

  async create(createPromotionDto: CreatePromotionDto): Promise<PromotionEntity> {
    const promotion = this.promotionRepository.create(createPromotionDto);

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
    try {
      this.logger.log('🔍 Querying promotions from database...');
      const result = await this.promotionRepository.find({
        order: { createdAt: 'DESC' },
      });
      this.logger.log(`✅ Retrieved ${result.length} promotions`);
      return result;
    } catch (error) {
      this.logger.error('❌ Error querying promotions:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  async findActive(): Promise<PromotionEntity[]> {
    const now = new Date();
    return this.promotionRepository.find({
      where: {
        status: PromotionStatus.ACTIVE,
        startDate: LessThanOrEqual(now),
        endDate: MoreThanOrEqual(now),
      },
      order: { priority: 'DESC', createdAt: 'DESC' },
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

  // ══════════════════════════════════════════════════════════════
  // SMART AD SERVING (with A/B test routing + audience targeting)
  // ══════════════════════════════════════════════════════════════

  async findByPlacement(
    placement: AdPlacement,
    userId?: string,
    userContext?: { vehicleType?: string; vehicleBrand?: string; role?: string; accountCreatedAt?: Date },
  ): Promise<PromotionEntity[]> {
    const now = new Date();
    const candidates = await this.promotionRepository.find({
      where: {
        status: PromotionStatus.ACTIVE,
        placement,
        startDate: LessThanOrEqual(now),
        endDate: MoreThanOrEqual(now),
      },
      order: { priority: 'DESC', createdAt: 'DESC' },
    });

    // Day-of-week + time-of-day schedule filtering
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const currentDay = dayNames[now.getDay()];
    const currentHour = now.getHours();

    let filtered = candidates.filter(p => {
      if (p.scheduleDays && p.scheduleDays.length > 0) {
        if (!p.scheduleDays.includes(currentDay)) return false;
      }
      if (p.scheduleHoursStart != null && p.scheduleHoursEnd != null) {
        if (p.scheduleHoursStart <= p.scheduleHoursEnd) {
          if (currentHour < p.scheduleHoursStart || currentHour >= p.scheduleHoursEnd) return false;
        } else {
          if (currentHour < p.scheduleHoursStart && currentHour >= p.scheduleHoursEnd) return false;
        }
      }
      return true;
    });

    // Budget cap check — skip ads that have exceeded budget
    filtered = filtered.filter(p => {
      if (Number(p.budgetCap) > 0 && Number(p.totalSpend) >= Number(p.budgetCap)) return false;
      return true;
    });

    // Audience targeting
    if (userContext) {
      filtered = this.applyAudienceTargeting(filtered, userContext);
    }

    // A/B test variant routing
    if (userId) {
      filtered = await this.applyAbTestRouting(filtered, userId);
    }

    // Per-user frequency cap
    if (userId) {
      filtered = await this.applyFrequencyCap(filtered, userId);
    }

    return filtered;
  }

  private applyAudienceTargeting(
    ads: PromotionEntity[],
    ctx: { vehicleType?: string; vehicleBrand?: string; role?: string; accountCreatedAt?: Date },
  ): PromotionEntity[] {
    const now = new Date();
    return ads.filter(p => {
      // Vehicle type targeting
      if (p.targetVehicleTypes?.length && ctx.vehicleType) {
        if (!p.targetVehicleTypes.includes(ctx.vehicleType)) return false;
      }
      // Vehicle brand targeting
      if (p.targetVehicleBrands?.length && ctx.vehicleBrand) {
        const lcBrands = p.targetVehicleBrands.map(b => b.toLowerCase());
        if (!lcBrands.includes(ctx.vehicleBrand.toLowerCase())) return false;
      }
      // User role targeting
      if (p.targetUserRoles?.length && ctx.role) {
        if (!p.targetUserRoles.includes(ctx.role)) return false;
      }
      // Account age targeting
      if (ctx.accountCreatedAt) {
        const ageDays = Math.floor((now.getTime() - ctx.accountCreatedAt.getTime()) / 86400000);
        if (p.targetMinAccountAgeDays != null && ageDays < p.targetMinAccountAgeDays) return false;
        if (p.targetMaxAccountAgeDays != null && ageDays > p.targetMaxAccountAgeDays) return false;
      }
      return true;
    });
  }

  /**
   * For ads in A/B tests, deterministically route user to one variant.
   * Uses a simple hash of userId + abTestId → picks one variant.
   */
  private async applyAbTestRouting(ads: PromotionEntity[], userId: string): Promise<PromotionEntity[]> {
    // Group ads by abTestId
    const abTestGroups = new Map<string, PromotionEntity[]>();
    const nonTestAds: PromotionEntity[] = [];

    for (const ad of ads) {
      if (ad.abTestId) {
        const group = abTestGroups.get(ad.abTestId) || [];
        group.push(ad);
        abTestGroups.set(ad.abTestId, group);
      } else {
        nonTestAds.push(ad);
      }
    }

    const routed: PromotionEntity[] = [...nonTestAds];

    for (const [testId, variants] of abTestGroups) {
      const test = await this.abTestRepository.findOne({ where: { id: testId } });
      if (!test || test.status !== AbTestStatus.RUNNING) {
        // Test not running; if completed, show winner only
        if (test?.winnerId) {
          const winner = variants.find(v => v.id === test.winnerId);
          if (winner) routed.push(winner);
        }
        continue;
      }

      // Deterministic hash: pick variant based on userId + testId
      const hash = this.simpleHash(userId + testId);
      const splits = test.trafficSplit;
      let cumulative = 0;
      const bucket = hash % 100;

      for (let i = 0; i < splits.length; i++) {
        cumulative += splits[i];
        if (bucket < cumulative) {
          const variantId = test.variantIds[i];
          const variant = variants.find(v => v.id === variantId);
          if (variant) routed.push(variant);
          break;
        }
      }
    }

    return routed;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private async applyFrequencyCap(ads: PromotionEntity[], userId: string): Promise<PromotionEntity[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const cappedIds = ads.filter(p => p.maxImpressionsPerUserPerDay > 0).map(p => p.id);
    if (cappedIds.length === 0) return ads;

    const counts: { promotionId: string; cnt: string }[] = await this.impressionRepository
      .createQueryBuilder('ai')
      .select('ai.promotionId', 'promotionId')
      .addSelect('COUNT(*)', 'cnt')
      .where('ai.userId = :userId', { userId })
      .andWhere('ai.eventType = :eventType', { eventType: AdEventType.IMPRESSION })
      .andWhere('ai.promotionId IN (:...ids)', { ids: cappedIds })
      .andWhere('ai.createdAt >= :todayStart', { todayStart })
      .groupBy('ai.promotionId')
      .getRawMany();

    const countMap = new Map(counts.map(c => [c.promotionId, parseInt(c.cnt, 10)]));

    return ads.filter(p => {
      if (p.maxImpressionsPerUserPerDay === 0) return true;
      const shown = countMap.get(p.id) || 0;
      return shown < p.maxImpressionsPerUserPerDay;
    });
  }

  // ══════════════════════════════════════════════════════════════
  // EVENT TRACKING + REVENUE RECORDING
  // ══════════════════════════════════════════════════════════════

  async trackEvent(
    promotionId: string,
    eventType: AdEventType,
    userId?: string,
    placement?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const promotion = await this.promotionRepository.findOne({ where: { id: promotionId } });
    if (!promotion) return;

    // Increment global counter
    const counterField = eventType === AdEventType.DISMISS ? null
      : eventType === AdEventType.IMPRESSION ? 'impressions'
      : eventType === AdEventType.CLICK ? 'clicks'
      : 'conversions';

    if (counterField) {
      await this.promotionRepository.increment({ id: promotionId }, counterField, 1);
    }

    // Record per-user event
    if (userId) {
      const impression = this.impressionRepository.create({
        userId,
        promotionId,
        eventType,
        placement: placement as AdPlacement,
        metadata,
      });
      await this.impressionRepository.save(impression);
    }

    // Record revenue if billing is configured
    if (counterField) {
      await this.recordRevenue(promotion, eventType);
    }
  }

  private async recordRevenue(promotion: PromotionEntity, eventType: AdEventType): Promise<void> {
    const rate = Number(promotion.billingRate);
    if (rate <= 0) return;

    let amount = 0;
    const model = promotion.billingModel;

    if (model === BillingModel.CPM && eventType === AdEventType.IMPRESSION) {
      amount = rate / 1000; // CPM: rate per 1000 impressions
    } else if (model === BillingModel.CPC && eventType === AdEventType.CLICK) {
      amount = rate;
    } else if (model === BillingModel.CPA && eventType === AdEventType.CONVERSION) {
      amount = rate;
    } else if (model === BillingModel.FLAT) {
      return; // Flat fee is not event-based
    } else {
      return; // Event doesn't match billing model
    }

    // Record ledger entry
    const entry = this.revenueLedgerRepository.create({
      promotionId: promotion.id,
      eventType: eventType as string,
      eventCount: 1,
      unitRate: rate,
      amount,
      billingModel: model,
    });
    await this.revenueLedgerRepository.save(entry);

    // Update running total on the promotion
    await this.promotionRepository
      .createQueryBuilder()
      .update(PromotionEntity)
      .set({ totalSpend: () => `"totalSpend" + ${amount}` })
      .where('id = :id', { id: promotion.id })
      .execute();
  }

  async trackImpression(id: string, userId?: string, placement?: string): Promise<void> {
    await this.trackEvent(id, AdEventType.IMPRESSION, userId, placement);
  }

  async trackClick(id: string, userId?: string, placement?: string): Promise<void> {
    await this.trackEvent(id, AdEventType.CLICK, userId, placement);
  }

  async trackConversion(id: string, userId?: string, placement?: string): Promise<void> {
    await this.trackEvent(id, AdEventType.CONVERSION, userId, placement);
  }

  // ══════════════════════════════════════════════════════════════
  // A/B TEST MANAGEMENT
  // ══════════════════════════════════════════════════════════════

  async createAbTest(dto: CreateAbTestDto): Promise<AbTestEntity> {
    if (dto.trafficSplit.reduce((a, b) => a + b, 0) !== 100) {
      throw new BadRequestException('Traffic split must sum to 100');
    }
    if (dto.variantIds.length !== dto.trafficSplit.length) {
      throw new BadRequestException('variantIds and trafficSplit must have same length');
    }

    // Verify all variant promotions exist
    for (const vid of dto.variantIds) {
      await this.findOne(vid);
    }

    const test = this.abTestRepository.create({
      ...dto,
      variantLabels: dto.variantLabels || dto.variantIds.map((_, i) => String.fromCharCode(65 + i)), // A, B, C...
    });
    const saved = await this.abTestRepository.save(test);

    // Tag promotions with abTestId + variantLabel
    for (let i = 0; i < dto.variantIds.length; i++) {
      await this.promotionRepository.update(dto.variantIds[i], {
        abTestId: saved.id,
        variantLabel: saved.variantLabels[i],
      });
    }

    return saved;
  }

  async findAllAbTests(): Promise<AbTestEntity[]> {
    return this.abTestRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOneAbTest(id: string): Promise<AbTestEntity> {
    const test = await this.abTestRepository.findOne({ where: { id } });
    if (!test) throw new NotFoundException(`A/B test ${id} not found`);
    return test;
  }

  async updateAbTest(id: string, dto: UpdateAbTestDto): Promise<AbTestEntity> {
    const test = await this.findOneAbTest(id);
    if (dto.trafficSplit && dto.variantIds) {
      if (dto.trafficSplit.reduce((a, b) => a + b, 0) !== 100) {
        throw new BadRequestException('Traffic split must sum to 100');
      }
    }
    Object.assign(test, dto);
    return this.abTestRepository.save(test);
  }

  async deleteAbTest(id: string): Promise<void> {
    const test = await this.findOneAbTest(id);
    // Remove abTestId from associated promotions
    for (const vid of test.variantIds) {
      await this.promotionRepository.update(vid, { abTestId: undefined, variantLabel: undefined });
    }
    await this.abTestRepository.remove(test);
  }

  async getAbTestResults(id: string): Promise<any> {
    const test = await this.findOneAbTest(id);
    const variants: any[] = [];

    for (let i = 0; i < test.variantIds.length; i++) {
      const promo = await this.promotionRepository.findOne({ where: { id: test.variantIds[i] } });
      if (!promo) continue;

      const impressions = promo.impressions;
      const clicks = promo.clicks;
      const conversions = promo.conversions;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const convRate = impressions > 0 ? (conversions / impressions) * 100 : 0;

      const metricValue = test.goalMetric === 'ctr' ? ctr
        : test.goalMetric === 'conversions' ? convRate
        : impressions;

      variants.push({
        promotionId: promo.id,
        label: test.variantLabels[i] || String.fromCharCode(65 + i),
        title: promo.title,
        trafficPercent: test.trafficSplit[i],
        impressions,
        clicks,
        conversions,
        ctr: parseFloat(ctr.toFixed(2)),
        conversionRate: parseFloat(convRate.toFixed(2)),
        metricValue: parseFloat(metricValue.toFixed(2)),
        spend: Number(promo.totalSpend),
      });
    }

    // Statistical significance (simplified z-test for proportions)
    let significant = false;
    let suggestedWinner: string | null = null;

    if (variants.length === 2) {
      const [a, b] = variants;
      if (a.impressions >= test.minSampleSize && b.impressions >= test.minSampleSize) {
        const pA = a.clicks / (a.impressions || 1);
        const pB = b.clicks / (b.impressions || 1);
        const pPool = (a.clicks + b.clicks) / (a.impressions + b.impressions || 1);
        const se = Math.sqrt(pPool * (1 - pPool) * (1 / a.impressions + 1 / b.impressions));
        const z = se > 0 ? Math.abs(pA - pB) / se : 0;

        // z thresholds: 90% = 1.645, 95% = 1.96, 99% = 2.576
        const zThreshold = test.confidenceThreshold >= 99 ? 2.576
          : test.confidenceThreshold >= 95 ? 1.96
          : 1.645;

        significant = z >= zThreshold;
        if (significant) {
          suggestedWinner = pA > pB ? a.promotionId : b.promotionId;
        }
      }
    }

    return {
      test: {
        id: test.id,
        name: test.name,
        status: test.status,
        goalMetric: test.goalMetric,
        minSampleSize: test.minSampleSize,
        confidenceThreshold: test.confidenceThreshold,
        winnerId: test.winnerId,
      },
      variants,
      significant,
      suggestedWinner,
    };
  }

  async declareWinner(testId: string, winnerId: string): Promise<AbTestEntity> {
    const test = await this.findOneAbTest(testId);
    if (!test.variantIds.includes(winnerId)) {
      throw new BadRequestException('Winner must be one of the test variants');
    }
    test.winnerId = winnerId;
    test.status = AbTestStatus.COMPLETED;
    return this.abTestRepository.save(test);
  }

  // ══════════════════════════════════════════════════════════════
  // ANALYTICS + STATS
  // ══════════════════════════════════════════════════════════════

  async getStats(): Promise<any> {
    const allPromotions = await this.findAll();
    const activePromotions = await this.findActive();

    const totalImpressions = allPromotions.reduce((sum, p) => sum + p.impressions, 0);
    const totalClicks = allPromotions.reduce((sum, p) => sum + p.clicks, 0);
    const totalConversions = allPromotions.reduce((sum, p) => sum + p.conversions, 0);
    const avgClickRate = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const totalRevenue = allPromotions.reduce((sum, p) => sum + Number(p.totalSpend), 0);

    return {
      totalPromotions: allPromotions.length,
      activePromotions: activePromotions.length,
      totalImpressions,
      totalClicks,
      totalConversions,
      avgClickRate: parseFloat(avgClickRate.toFixed(2)),
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    };
  }

  async getAdAnalytics(options: {
    promotionId?: string;
    placement?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    const qb = this.impressionRepository.createQueryBuilder('ai');

    if (options.promotionId) {
      qb.andWhere('ai.promotionId = :pid', { pid: options.promotionId });
    }
    if (options.placement) {
      qb.andWhere('ai.placement = :placement', { placement: options.placement });
    }
    if (options.startDate) {
      qb.andWhere('ai.createdAt >= :start', { start: new Date(options.startDate) });
    }
    if (options.endDate) {
      qb.andWhere('ai.createdAt <= :end', { end: new Date(options.endDate) });
    }

    const breakdown = await qb
      .select('ai.promotionId', 'promotionId')
      .addSelect('ai.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ai.promotionId')
      .addGroupBy('ai.eventType')
      .getRawMany();

    const byPromotion: Record<string, any> = {};
    for (const row of breakdown) {
      if (!byPromotion[row.promotionId]) {
        byPromotion[row.promotionId] = { impressions: 0, clicks: 0, conversions: 0, dismissals: 0 };
      }
      byPromotion[row.promotionId][row.eventType === 'impression' ? 'impressions'
        : row.eventType === 'click' ? 'clicks'
        : row.eventType === 'conversion' ? 'conversions'
        : 'dismissals'] = parseInt(row.count, 10);
    }

    const ads = Object.entries(byPromotion).map(([id, stats]: [string, any]) => ({
      promotionId: id,
      ...stats,
      ctr: stats.impressions > 0 ? parseFloat(((stats.clicks / stats.impressions) * 100).toFixed(2)) : 0,
    }));

    const uniqueUsersResult = await this.impressionRepository
      .createQueryBuilder('ai')
      .select('COUNT(DISTINCT ai.userId)', 'count')
      .getRawOne();

    return {
      ads,
      totalAds: ads.length,
      uniqueUsers: parseInt(uniqueUsersResult?.count || '0', 10),
    };
  }

  // ══════════════════════════════════════════════════════════════
  // REVENUE REPORTS
  // ══════════════════════════════════════════════════════════════

  async getRevenueOverview(options?: { startDate?: string; endDate?: string }): Promise<any> {
    const qb = this.revenueLedgerRepository.createQueryBuilder('rl');

    if (options?.startDate) {
      qb.andWhere('rl.createdAt >= :start', { start: new Date(options.startDate) });
    }
    if (options?.endDate) {
      qb.andWhere('rl.createdAt <= :end', { end: new Date(options.endDate) });
    }

    // Total revenue
    const totalResult = await qb
      .select('SUM(rl.amount)', 'total')
      .addSelect('COUNT(*)', 'transactionCount')
      .getRawOne();

    // Revenue by billing model
    const byModel = await this.revenueLedgerRepository
      .createQueryBuilder('rl')
      .select('rl.billingModel', 'model')
      .addSelect('SUM(rl.amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .groupBy('rl.billingModel')
      .getRawMany();

    // Revenue by promotion (top 20)
    const byPromotion = await this.revenueLedgerRepository
      .createQueryBuilder('rl')
      .select('rl.promotionId', 'promotionId')
      .addSelect('SUM(rl.amount)', 'total')
      .addSelect('COUNT(*)', 'transactions')
      .groupBy('rl.promotionId')
      .orderBy('SUM(rl.amount)', 'DESC')
      .limit(20)
      .getRawMany();

    // Enrich promotion data
    const enriched: any[] = [];
    for (const row of byPromotion) {
      const promo = await this.promotionRepository.findOne({ where: { id: row.promotionId } });
      enriched.push({
        promotionId: row.promotionId,
        title: promo?.title || 'Deleted Ad',
        advertiserName: promo?.advertiserName || '-',
        billingModel: promo?.billingModel,
        billingRate: Number(promo?.billingRate || 0),
        revenue: parseFloat(Number(row.total).toFixed(2)),
        transactions: parseInt(row.transactions, 10),
        impressions: promo?.impressions || 0,
        clicks: promo?.clicks || 0,
        conversions: promo?.conversions || 0,
        budgetCap: Number(promo?.budgetCap || 0),
        budgetUsed: Number(promo?.totalSpend || 0),
      });
    }

    // Daily revenue trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyTrend = await this.revenueLedgerRepository
      .createQueryBuilder('rl')
      .select("TO_CHAR(rl.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('SUM(rl.amount)', 'revenue')
      .addSelect('COUNT(*)', 'events')
      .where('rl.createdAt >= :since', { since: thirtyDaysAgo })
      .groupBy("TO_CHAR(rl.createdAt, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(rl.createdAt, 'YYYY-MM-DD')", 'ASC')
      .getRawMany();

    return {
      totalRevenue: parseFloat(Number(totalResult?.total || 0).toFixed(2)),
      transactionCount: parseInt(totalResult?.transactionCount || '0', 10),
      byModel: byModel.map(m => ({
        model: m.model,
        total: parseFloat(Number(m.total).toFixed(2)),
        count: parseInt(m.count, 10),
      })),
      topPromotions: enriched,
      dailyTrend: dailyTrend.map(d => ({
        date: d.date,
        revenue: parseFloat(Number(d.revenue).toFixed(2)),
        events: parseInt(d.events, 10),
      })),
    };
  }

  // ══════════════════════════════════════════════════════════════
  // STATUS MANAGEMENT
  // ══════════════════════════════════════════════════════════════

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
