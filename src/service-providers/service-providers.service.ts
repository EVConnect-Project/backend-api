import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MechanicEntity } from '../mechanics/entities/mechanic.entity';
import { ServiceStationEntity } from '../service-stations/entities/service-station.entity';
import { ServiceProviderSignalEntity } from './entities/service-provider-signal.entity';

type ProviderType = 'individual_mechanic' | 'service_station';
type ServiceMode = 'emergency' | 'planned';

interface SearchProvidersOptions {
  mode: ServiceMode;
  lat?: number;
  lng?: number;
  radiusKm: number;
  issueType?: string;
  userId?: string;
  providerType?: ProviderType;
}

interface RecordProviderSignalInput {
  userId: string;
  providerId: string;
  providerType: ProviderType;
  mode: ServiceMode;
  action: string;
  issueType?: string;
}

interface UserSignalProfile {
  preferredProviderType: ProviderType | null;
  preferredIssueType: string | null;
}

@Injectable()
export class ServiceProvidersService {
  constructor(
    @InjectRepository(MechanicEntity)
    private readonly mechanicRepository: Repository<MechanicEntity>,
    @InjectRepository(ServiceStationEntity)
    private readonly stationRepository: Repository<ServiceStationEntity>,
    @InjectRepository(ServiceProviderSignalEntity)
    private readonly providerSignalRepository: Repository<ServiceProviderSignalEntity>,
  ) {}

  async searchProviders(options: SearchProvidersOptions) {
    const includeMechanics = !options.providerType || options.providerType === 'individual_mechanic';
    const includeStations = !options.providerType || options.providerType === 'service_station';

    const providers: Array<Record<string, unknown>> = [];

    if (includeMechanics) {
      const mechanics = await this.mechanicRepository.find({
        where: { isBanned: false, available: true },
        order: { rating: 'DESC' },
      });

      for (const mechanic of mechanics) {
        const distance = this.maybeDistance(
          options.lat,
          options.lng,
          this.toNumber(mechanic.lat),
          this.toNumber(mechanic.lng),
        );

        if (distance != null && distance > options.radiusKm) {
          continue;
        }

        providers.push({
          id: mechanic.id,
          providerType: 'individual_mechanic',
          name: mechanic.name,
          services: mechanic.services ?? [],
          lat: this.toNumber(mechanic.lat),
          lng: this.toNumber(mechanic.lng),
          rating: this.toNumber(mechanic.rating),
          reviewCount: Math.max(0, mechanic.completedJobs ?? 0),
          phone: mechanic.phone,
          description: mechanic.description,
          available: mechanic.available,
          pricePerHour: this.toNumberNullable(mechanic.pricePerHour),
          address: null,
          city: null,
          verified: true,
          distance,
          estimatedArrivalMinutes: distance != null
            ? Math.max(8, Math.round((distance / 35) * 60))
            : null,
          responseSlaMinutes: 20,
        });
      }

      // Mechanics are already filtered by availability at query time.
    }

    if (includeStations) {
      const stations = await this.stationRepository.find({
        where: { isBanned: false, verified: true },
      });
      for (const station of stations) {
        const distance = this.maybeDistance(
          options.lat,
          options.lng,
          this.toNumber(station.lat),
          this.toNumber(station.lng),
        );

        if (distance != null && distance > options.radiusKm) {
          continue;
        }

        providers.push({
          id: station.id,
          providerType: 'service_station',
          name: station.stationName,
          services: (station.serviceCategories ?? []) as string[],
          serviceCategories: (station.serviceCategories ?? []) as string[],
          amenities: (station.amenities ?? []) as string[],
          images: (station.images ?? []) as string[],
          lat: this.toNumber(station.lat),
          lng: this.toNumber(station.lng),
          rating: 0,
          reviewCount: 0,
          phone: station.phoneNumber,
          description: station.description,
          available: true,
          pricePerHour: null,
          address: station.address,
          city: station.city,
          verified: station.verified === true,
          distance,
          estimatedArrivalMinutes: null,
          responseSlaMinutes: null,
        });
      }
    }

    const signalProfile = options.userId
      ? await this.getUserSignalProfile(options.userId, options.mode)
      : null;

    const scoredProviders: Array<Record<string, unknown> & { score: number; matchReasons: string[] }> =
      providers.map((provider) => {
        const score = this.computeProviderScore(provider, options, signalProfile);
        return {
          ...provider,
          score,
          matchReasons: this.buildMatchReasons(provider, options, signalProfile),
        };
      });

    scoredProviders.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      const aDistance = this.numberOrNull(a.distance) ?? Number.POSITIVE_INFINITY;
      const bDistance = this.numberOrNull(b.distance) ?? Number.POSITIVE_INFINITY;
      return aDistance - bDistance;
    });

    return {
      mode: options.mode,
      total: scoredProviders.length,
      providers: scoredProviders,
    };
  }

  async recordProviderSignal(input: RecordProviderSignalInput) {
    const payload = this.providerSignalRepository.create({
      userId: input.userId,
      providerId: input.providerId,
      providerType: input.providerType,
      mode: input.mode,
      action: input.action,
      issueType: input.issueType ?? null,
    });

    await this.providerSignalRepository.save(payload);
    return { ok: true };
  }

  async getStationById(id: string) {
    const station = await this.stationRepository.findOne({ where: { id } });

    if (!station || station.isBanned) {
      throw new NotFoundException('Service station not found');
    }

    return {
      id: station.id,
      providerType: 'service_station',
      name: station.stationName,
      services: (station.serviceCategories ?? []) as string[],
      serviceCategories: (station.serviceCategories ?? []) as string[],
      amenities: (station.amenities ?? []) as string[],
      images: (station.images ?? []) as string[],
      lat: this.toNumber(station.lat),
      lng: this.toNumber(station.lng),
      rating: 0,
      reviewCount: 0,
      phone: station.phoneNumber,
      description: station.description,
      available: true,
      pricePerHour: null,
      address: station.address,
      city: station.city,
      verified: station.verified === true,
      distance: null,
      estimatedArrivalMinutes: null,
      responseSlaMinutes: null,
    };
  }

  private async getUserSignalProfile(userId: string, mode: ServiceMode): Promise<UserSignalProfile> {
    const signals = await this.providerSignalRepository.find({
      where: { userId, mode },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    if (signals.length === 0) {
      return { preferredProviderType: null, preferredIssueType: null };
    }

    const providerTypeCounts = signals.reduce<Record<string, number>>((acc, signal) => {
      acc[signal.providerType] = (acc[signal.providerType] ?? 0) + 1;
      return acc;
    }, {});

    const issueTypeCounts = signals.reduce<Record<string, number>>((acc, signal) => {
      if (!signal.issueType) return acc;
      acc[signal.issueType] = (acc[signal.issueType] ?? 0) + 1;
      return acc;
    }, {});

    const preferredProviderType = (Object.entries(providerTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null) as
      | ProviderType
      | null;
    const preferredIssueType = Object.entries(issueTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      preferredProviderType,
      preferredIssueType,
    };
  }

  private computeProviderScore(
    provider: Record<string, unknown>,
    options: SearchProvidersOptions,
    signalProfile: UserSignalProfile | null,
  ): number {
    const rating = this.clamp01(this.numberOrZero(provider.rating) / 5);
    const reviewCount = this.clamp01(this.numberOrZero(provider.reviewCount) / 100);
    const distance = this.numberOrNull(provider.distance);
    const distanceScore = distance == null
      ? 0.5
      : this.clamp01(1 - distance / Math.max(1, options.radiusKm));
    const available = provider.available === true ? 1 : 0;

    const issueMatch = this.computeIssueMatchScore(provider, options.issueType);
    const preferenceMatch = this.computePreferenceMatchScore(provider, signalProfile);

    if (options.mode === 'emergency') {
      const eta = this.numberOrNull(provider.estimatedArrivalMinutes);
      const etaScore = eta == null ? 0.4 : this.clamp01(1 - eta / 60);
      const reliability = this.clamp01((rating * 0.7) + (reviewCount * 0.3));

      return this.roundScore(
        (etaScore * 0.33) +
          (reliability * 0.2) +
          (rating * 0.14) +
          (distanceScore * 0.1) +
          (available * 0.08) +
          (issueMatch * 0.1) +
          (preferenceMatch * 0.05),
      );
    }

    return this.roundScore(
      (rating * 0.27) +
        (reviewCount * 0.16) +
        (distanceScore * 0.17) +
        (available * 0.12) +
        ((provider.verified === true ? 1 : 0) * 0.13) +
        (issueMatch * 0.1) +
        (preferenceMatch * 0.05),
    );
  }

  private buildMatchReasons(
    provider: Record<string, unknown>,
    options: SearchProvidersOptions,
    signalProfile: UserSignalProfile | null,
  ): string[] {
    const reasons: string[] = [];
    const distance = this.numberOrNull(provider.distance);
    const rating = this.numberOrZero(provider.rating);
    const reviewCount = Math.round(this.numberOrZero(provider.reviewCount));
    const eta = this.numberOrNull(provider.estimatedArrivalMinutes);

    if (options.mode === 'emergency' && eta != null) {
      reasons.push(`${Math.round(eta)} min ETA`);
    }
    if (distance != null) {
      reasons.push(`${distance.toFixed(1)} km away`);
    }
    if (rating >= 4.5) {
      reasons.push('Top rated');
    }
    if (reviewCount >= 20) {
      reasons.push(`${reviewCount} reviews`);
    }
    if (provider.verified === true) {
      reasons.push('Verified provider');
    }
    if (provider.available === true) {
      reasons.push(options.mode === 'emergency' ? 'Accepting now' : 'Open for listing');
    }

    if (options.issueType) {
      const issueMatch = this.computeIssueMatchScore(provider, options.issueType);
      if (issueMatch >= 0.8) {
        reasons.push(`Strong fit for ${options.issueType.replaceAll('_', ' ')}`);
      } else if (issueMatch > 0) {
        reasons.push(`Supports ${options.issueType.replaceAll('_', ' ')}`);
      }
    }
    if (
      signalProfile?.preferredProviderType != null &&
      provider.providerType === signalProfile.preferredProviderType
    ) {
      reasons.push('Matches your recent preferences');
    }

    return reasons;
  }

  private computeIssueMatchScore(provider: Record<string, unknown>, issueType?: string): number {
    if (!issueType) return 0;
    const services = Array.isArray(provider.services)
      ? (provider.services as Array<string | { name?: string }>)
      : [];
    const normalized = issueType.toLowerCase();

    const match = services.find((svc) => {
      if (typeof svc === 'string') {
        return svc.toLowerCase().includes(normalized);
      }
      if (svc?.name) {
        return svc.name.toLowerCase().includes(normalized);
      }
      return false;
    });

    return match ? 1 : 0.25;
  }

  private computePreferenceMatchScore(provider: Record<string, unknown>, profile: UserSignalProfile | null): number {
    if (!profile) return 0;

    let score = 0;
    if (profile.preferredProviderType && provider.providerType === profile.preferredProviderType) {
      score += 0.6;
    }
    if (profile.preferredIssueType) {
      score += 0.4;
    }
    return this.clamp01(score);
  }

  private toNumber(value: number | string): number {
    return typeof value === 'number' ? value : parseFloat(value);
  }

  private toNumberNullable(value?: number | string | null): number | null {
    if (value == null) return null;
    return this.toNumber(value);
  }

  private numberOrZero(value?: unknown): number {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  private numberOrNull(value?: unknown): number | null {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private clamp01(value: number): number {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  private roundScore(value: number): number {
    return Math.round(value * 1000) / 1000;
  }

  private maybeDistance(
    lat1: number | undefined,
    lng1: number | undefined,
    lat2: number,
    lng2: number,
  ): number | null {
    if (lat1 == null || lng1 == null) return null;
    return this.calculateDistance(lat1, lng1, lat2, lng2);
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const earthRadiusKm = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  }

  private toRadians(value: number): number {
    return value * (Math.PI / 180);
  }
}
