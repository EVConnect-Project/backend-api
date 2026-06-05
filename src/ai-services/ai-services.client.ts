import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";

/**
 * Mechanic feature vector accepted by ai-services /predict/mechanic-ranking.
 * Field names mirror the FastAPI Pydantic model so the wire format stays in sync.
 */
export interface MechanicFeatureVector {
  distance_km: number;
  rating: number;
  available: 0 | 1;
  service_match: number; // 0..1
  completed_jobs: number;
  years_experience: number;
  urgency_level: 0 | 1 | 2 | 3;
  price_per_hour: number;
  problem_type_jobs?: number;
  problem_type_success_rate?: number; // 0..1
  avg_resolution_minutes?: number;
  problem_type_rating?: number; // 0..5
}

export interface MechanicScore {
  mechanic_index: number;
  predicted_score: number; // 0..100
  confidence: number; // 0..1
}

export interface MechanicRankingResponse {
  success: boolean;
  scores: MechanicScore[];
  model_version: string;
  timestamp: string;
}

@Injectable()
export class AiServicesClient {
  private readonly logger = new Logger(AiServicesClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly enabled: boolean;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = (
      this.configService.get<string>("AI_SERVICES_URL") ||
      this.configService.get<string>("AI_SERVICE_URL") ||
      "http://localhost:5000"
    ).replace(/\/+$/, "");
    this.timeoutMs = Number(
      this.configService.get<string>("AI_SERVICES_TIMEOUT_MS") || 800,
    );
    // Allow a hard-off switch in case the AI service is unreachable in an env
    // where we don't want every request to pay the timeout penalty.
    this.enabled =
      (this.configService.get<string>("AI_SERVICES_ENABLED") ?? "true") !==
      "false";
  }

  /**
   * Returns AI-predicted selection scores for a batch of mechanics, or null
   * if the AI service is unavailable / disabled / errored.
   * Callers MUST handle the null case with their own fallback logic.
   */
  async rankMechanics(
    mechanics: MechanicFeatureVector[],
  ): Promise<MechanicScore[] | null> {
    if (!this.enabled || mechanics.length === 0) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<MechanicRankingResponse>(
          `${this.baseUrl}/predict/mechanic-ranking`,
          { mechanics },
          { timeout: this.timeoutMs },
        ),
      );

      if (response.data?.success && Array.isArray(response.data.scores)) {
        return response.data.scores;
      }
      this.logger.warn(
        `ai-services mechanic-ranking returned unexpected payload`,
      );
      return null;
    } catch (err: any) {
      // Bounded timeout means this is a soft failure — don't poison the
      // outer request. Log the cause and let the caller fall back.
      this.logger.warn(
        `ai-services mechanic-ranking unavailable (${err?.code || err?.message || "unknown"}); using rule-based score`,
      );
      return null;
    }
  }
}
