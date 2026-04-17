import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MechanicEntity } from "./entities/mechanic.entity";
import { MechanicExpertiseEntity } from "./entities/mechanic-expertise.entity";
import { UserEntity } from "../users/entities/user.entity";
import { MechanicApplication } from "../mechanic/entities/mechanic-application.entity";
import { Charger } from "../charger/entities/charger.entity";
import { CreateMechanicDto } from "./dto/create-mechanic.dto";
import { UpdateMechanicDto } from "./dto/update-mechanic.dto";
import { EmergencyRequestDto } from "./dto/emergency-request.dto";
import { NotificationsService } from "../notifications/notifications.service";
import { FirebaseNotificationService } from "../notifications/services/firebase-notification.service";
import { NotificationType } from "../notifications/types/notification-types";
import { EmergencyService } from "../emergency/emergency.service";
import { TrafficService } from "./services/traffic.service";
import { ServiceMatcherService } from "./services/service-matcher.service";
import axios from "axios";

@Injectable()
export class MechanicsService {
  constructor(
    @InjectRepository(MechanicEntity)
    private mechanicRepository: Repository<MechanicEntity>,
    @InjectRepository(MechanicExpertiseEntity)
    private expertiseRepository: Repository<MechanicExpertiseEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(MechanicApplication)
    private applicationRepository: Repository<MechanicApplication>,
    @InjectRepository(Charger)
    private chargerRepository: Repository<Charger>,
    private notificationsService: NotificationsService,
    private firebaseNotificationService: FirebaseNotificationService,
    @Inject(forwardRef(() => EmergencyService))
    private emergencyService: EmergencyService,
    private trafficService: TrafficService,
    private serviceMatcherService: ServiceMatcherService,
  ) {}

  async register(
    createMechanicDto: CreateMechanicDto,
  ): Promise<MechanicEntity> {
    const mechanic = this.mechanicRepository.create(createMechanicDto);
    return this.mechanicRepository.save(mechanic);
  }

  async findAll(): Promise<MechanicEntity[]> {
    try {
      // Try with both filters first
      const mechanics = await this.mechanicRepository.find({
        where: { available: true, isBanned: false },
        order: { rating: "DESC" },
      });
      return mechanics;
    } catch (error) {
      console.error(
        "Error fetching mechanics with isBanned filter:",
        error.message,
      );
      // Fallback: just filter by available
      return this.mechanicRepository.find({
        where: { available: true },
        order: { rating: "DESC" },
      });
    }
  }

  async findOne(id: string): Promise<MechanicEntity> {
    const mechanic = await this.mechanicRepository.findOne({ where: { id } });

    if (!mechanic) {
      throw new NotFoundException(`Mechanic with ID ${id} not found`);
    }

    return mechanic;
  }

  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number = 10,
  ): Promise<any[]> {
    try {
      // Get all available, non-banned mechanics
      const allMechanics = await this.mechanicRepository.find({
        where: { available: true, isBanned: false },
        order: { rating: "DESC" },
      });

      // Calculate distance manually for each mechanic
      const mechanicsWithDistance = allMechanics
        .map((mechanic) => ({
          id: mechanic.id,
          userId: mechanic.userId,
          name: mechanic.name,
          services: mechanic.services,
          lat: parseFloat(mechanic.lat as any),
          lng: parseFloat(mechanic.lng as any),
          rating: parseFloat(mechanic.rating as any),
          phone: mechanic.phone,
          description: mechanic.description,
          available: mechanic.available,
          pricePerHour: mechanic.pricePerHour
            ? parseFloat(mechanic.pricePerHour as any)
            : null,
          serviceRadius: mechanic.serviceRadius
            ? parseFloat(mechanic.serviceRadius as any)
            : 5,
          distance: this.calculateDistance(
            lat,
            lng,
            parseFloat(mechanic.lat as any),
            parseFloat(mechanic.lng as any),
          ),
        }))
        // Filter: Request must be within search radius AND within mechanic's service radius
        .filter((m) => {
          const withinSearchRadius = m.distance <= radiusKm;
          const withinMechanicServiceRadius = m.distance <= m.serviceRadius;
          return withinSearchRadius && withinMechanicServiceRadius;
        })
        .sort((a, b) => a.distance - b.distance);

      return mechanicsWithDistance;
    } catch (error) {
      console.error("Error finding nearby mechanics:", error);
      console.error("Error details:", error.message);
      return [];
    }
  }

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  async findByService(service: string): Promise<MechanicEntity[]> {
    return this.mechanicRepository
      .createQueryBuilder("mechanic")
      .where(":service = ANY(mechanic.services)", { service })
      .andWhere("mechanic.available = true")
      .orderBy("mechanic.rating", "DESC")
      .getMany();
  }

  async update(
    id: string,
    updateMechanicDto: UpdateMechanicDto,
  ): Promise<MechanicEntity> {
    const mechanic = await this.findOne(id);
    Object.assign(mechanic, updateMechanicDto);
    return this.mechanicRepository.save(mechanic);
  }

  async remove(id: string): Promise<void> {
    const mechanic = await this.findOne(id);
    await this.mechanicRepository.remove(mechanic);
  }

  async updateRating(id: string, newRating: number): Promise<MechanicEntity> {
    const mechanic = await this.findOne(id);

    // Simple average (in production, you'd maintain a count of reviews)
    mechanic.rating = parseFloat(
      ((mechanic.rating + newRating) / 2).toFixed(2),
    );

    return this.mechanicRepository.save(mechanic);
  }

  async updateMyAvailability(
    userId: string,
    available: boolean,
  ): Promise<MechanicEntity> {
    const mechanic = await this.mechanicRepository.findOne({
      where: { userId },
    });

    if (!mechanic) {
      throw new NotFoundException(
        `Mechanic profile not found for user ${userId}`,
      );
    }

    mechanic.available = available;
    return this.mechanicRepository.save(mechanic);
  }

  async updateMyLocation(
    userId: string,
    lat: number,
    lng: number,
  ): Promise<MechanicEntity> {
    const mechanic = await this.mechanicRepository.findOne({
      where: { userId },
    });

    if (!mechanic) {
      throw new NotFoundException(
        `Mechanic profile not found for user ${userId}`,
      );
    }

    // Keep both static and live coordinates in sync for backward compatibility
    // with existing nearby/mechanic discovery queries.
    mechanic.lat = lat;
    mechanic.lng = lng;
    mechanic.currentLocationLat = lat;
    mechanic.currentLocationLng = lng;
    mechanic.lastOnlineAt = new Date();
    return this.mechanicRepository.save(mechanic);
  }

  async getMyMechanicProfile(userId: string): Promise<MechanicEntity | null> {
    return this.mechanicRepository.findOne({
      where: { userId },
    });
  }

  async resignMechanicRole(userId: string): Promise<void> {
    // Get the user and check their role
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User not found: ${userId}`);
    }

    // Check if user has chargers (need to determine new role)
    const chargers = await this.chargerRepository.find({
      where: { ownerId: userId },
    });
    const hasChargers = chargers.length > 0;

    // Find mechanic profile (may not exist if application was approved but profile not created)
    const mechanic = await this.mechanicRepository.findOne({
      where: { userId },
    });

    // Find mechanic application (may exist even if profile doesn't)
    const application = await this.applicationRepository.findOne({
      where: { userId },
    });

    // Check if user has any mechanic-related records
    if (!mechanic && !application) {
      throw new NotFoundException(
        `No mechanic profile or application found for user ${userId}`,
      );
    }

    // Remove mechanic profile if it exists
    if (mechanic) {
      await this.mechanicRepository.remove(mechanic);
      console.log(`✅ Mechanic profile deleted for user ${userId}`);
    } else {
      console.log(`ℹ️ No mechanic profile to delete for user ${userId}`);
    }

    // Remove mechanic application if it exists
    if (application) {
      await this.applicationRepository.remove(application);
      console.log(`✅ Mechanic application deleted for user ${userId}`);
    } else {
      console.log(`ℹ️ No mechanic application to delete for user ${userId}`);
    }

    // Update user role: if they own chargers, set to 'owner', otherwise 'user'
    if (user.role === "mechanic") {
      user.role = hasChargers ? "owner" : "user";
      await this.userRepository.save(user);
      console.log(`✅ User role updated to '${user.role}' for ${userId}`);
    } else {
      console.log(`ℹ️ User role is '${user.role}', no role change needed`);
    }
  }

  /**
   * AI-Powered Emergency Mechanic Recommendation System
   * Analyzes 10+ factors to recommend the best mechanics
   */
  async getAIRecommendations(request: EmergencyRequestDto, userId: string) {
    const radiusKm = request.radiusKm || 10;
    const urgencyMultiplier = this.getUrgencyMultiplier(request.urgencyLevel);
    const problemType = request.problemType || "general";

    console.log(
      `🤖 AI Analysis for emergency at (${request.lat}, ${request.lng}), radius: ${radiusKm}km, problem: ${problemType}`,
    );

    // Get all available mechanics within radius
    const nearbyMechanics = await this.findNearby(
      request.lat,
      request.lng,
      radiusKm,
    );

    if (nearbyMechanics.length === 0) {
      return {
        recommendations: [],
        message:
          "No mechanics found within the specified radius. Try increasing the search radius.",
        searchRadius: radiusKm,
      };
    }

    // Fetch expertise data for all nearby mechanics for this problem type
    const mechanicIds = nearbyMechanics.map((m) => m.id);
    const expertiseMap = await this.getExpertiseForMechanics(
      mechanicIds,
      problemType,
    );

    // Prepare features for AI model with enhanced expertise data
    const mechanicsForAI = nearbyMechanics.map((mechanic) => {
      const serviceMatch = this.calculateServiceMatch(mechanic, request);
      const expertise = expertiseMap.get(mechanic.id);

      // Calculate expertise-based features
      const problemTypeExperience = expertise?.jobsCompleted ?? 0;
      const successRate =
        expertise && expertise.jobsCompleted > 0
          ? expertise.jobsSuccessful / expertise.jobsCompleted
          : 0.5; // Default to 50% if no history
      const avgResolutionMinutes = expertise?.avgResolutionMinutes ?? 60; // Default 60 min
      const satisfactionRating = expertise?.avgSatisfactionRating
        ? parseFloat(expertise.avgSatisfactionRating as any)
        : mechanic.rating; // Fall back to overall rating

      return {
        distance_km: mechanic.distance,
        rating: mechanic.rating,
        available: mechanic.available ? 1 : 0,
        service_match: serviceMatch,
        completed_jobs: mechanic.completedJobs || 0,
        years_experience: mechanic.yearsOfExperience || 0,
        urgency_level: this.getUrgencyNumber(request.urgencyLevel),
        price_per_hour: mechanic.pricePerHour || 50,
        // New expertise-based features
        problem_type_jobs: problemTypeExperience,
        problem_type_success_rate: successRate,
        avg_resolution_minutes: avgResolutionMinutes,
        problem_type_rating: satisfactionRating,
      };
    });

    // Call AI service for ML predictions
    let aiScores: number[] = [];
    let usingAI = false;

    try {
      const aiResponse = await axios.post(
        "http://localhost:5000/predict/mechanic-ranking",
        {
          mechanics: mechanicsForAI,
        },
        {
          timeout: 3000,
        },
      );

      if (aiResponse.data.success) {
        aiScores = aiResponse.data.scores.map((s: any) => s.predicted_score);
        usingAI = true;
        console.log(
          `✅ AI Model predictions received (${aiResponse.data.model_version})`,
        );
      }
    } catch (error) {
      console.warn(
        `⚠️ AI service unavailable, using fallback scoring:`,
        error.message,
      );
      // Fallback to rule-based scoring
      aiScores = nearbyMechanics.map((_, idx) =>
        this.calculateFallbackScore(mechanicsForAI[idx], urgencyMultiplier),
      );
    }

    // Get real-time traffic ETAs for top mechanics
    const trafficETAs = await this.getTrafficETAs(
      request.lat,
      request.lng,
      nearbyMechanics.slice(0, 10),
    );

    // Combine AI scores with additional factors including traffic and expertise
    const scoredMechanics = nearbyMechanics.map((mechanic, idx) => {
      const baseScore = aiScores[idx] || 50;
      const trafficData = trafficETAs.get(mechanic.id);
      const expertise = expertiseMap.get(mechanic.id);

      // Use traffic-aware ETA if available, otherwise estimate
      const eta = trafficData
        ? trafficData.durationInTrafficMinutes
        : this.estimateArrivalTime(mechanic.distance, urgencyMultiplier);

      // Adjust score based on traffic conditions
      let adjustedScore = baseScore;
      if (trafficData) {
        // Penalize mechanics stuck in heavy traffic
        if (trafficData.trafficLevel === "heavy") adjustedScore -= 5;
        if (trafficData.trafficLevel === "severe") adjustedScore -= 10;
      }

      // Build expertise info for response
      const expertiseInfo = expertise
        ? {
            problemTypeJobsCompleted: expertise.jobsCompleted,
            problemTypeSuccessRate:
              expertise.jobsCompleted > 0
                ? Math.round(
                    (expertise.jobsSuccessful / expertise.jobsCompleted) * 100,
                  )
                : null,
            avgResolutionMinutes: expertise.avgResolutionMinutes,
            problemTypeRating: expertise.avgSatisfactionRating
              ? parseFloat(expertise.avgSatisfactionRating as any)
              : null,
            isExpert:
              expertise.jobsCompleted >= 10 &&
              expertise.jobsSuccessful / expertise.jobsCompleted >= 0.9,
          }
        : null;

      return {
        ...mechanic,
        aiScore: Math.max(0, adjustedScore),
        estimatedArrivalMinutes: eta,
        recommendationTier: this.getRecommendationTier(adjustedScore),
        matchReasons: this.getMatchReasons(
          mechanic,
          request,
          adjustedScore,
          trafficData,
          expertise,
        ),
        usingMLModel: usingAI,
        trafficConditions: trafficData?.trafficLevel || "unknown",
        routeSummary: trafficData?.routeSummary || null,
        problemTypeExpertise: expertiseInfo,
      };
    });

    // Sort by AI score (highest first)
    scoredMechanics.sort((a, b) => b.aiScore - a.aiScore);

    return {
      recommendations: scoredMechanics,
      totalFound: scoredMechanics.length,
      bestMatch: scoredMechanics[0] || null,
      searchRadius: radiusKm,
      urgencyLevel: request.urgencyLevel || "medium",
      aiModelUsed: usingAI,
    };
  }

  private calculateServiceMatch(
    mechanic: any,
    request: EmergencyRequestDto,
  ): number {
    // Use enhanced service matcher with compatibility matrix
    const score = this.serviceMatcherService.calculateServiceMatchScore(
      mechanic.services,
      request.requiredServices,
      request.problemType,
    );

    // Return as ratio (0-1) for AI model compatibility
    return score / 100;
  }

  private getUrgencyNumber(urgencyLevel?: string): number {
    switch (urgencyLevel) {
      case "critical":
        return 3;
      case "high":
        return 2;
      case "medium":
        return 1;
      case "low":
        return 0;
      default:
        return 1;
    }
  }

  private calculateFallbackScore(
    features: any,
    urgencyMultiplier: number,
  ): number {
    let score = 0;

    // Distance factor (0-25 points)
    score += (1 - Math.min(features.distance_km / 50, 1)) * 25;
    // Rating factor (0-20 points)
    score += (features.rating / 5) * 20;
    // Availability (0-15 points)
    score += features.available * 15;
    // Service match (0-15 points)
    score += features.service_match * 15;
    // General experience (0-10 points)
    score += (Math.min(features.completed_jobs, 200) / 200) * 10;

    // Problem-type expertise factors (0-15 points total)
    if (features.problem_type_jobs > 0) {
      // Jobs completed for this problem type (0-5 points)
      score += Math.min(features.problem_type_jobs / 20, 1) * 5;
      // Success rate for this problem type (0-5 points)
      score += features.problem_type_success_rate * 5;
      // Problem-type rating bonus (0-5 points)
      score += ((features.problem_type_rating || features.rating) / 5) * 5;
    }

    // Urgency modifier
    if (urgencyMultiplier > 1) {
      const urgencyBonus = score * 0.2 * (urgencyMultiplier - 1);
      score += urgencyBonus;
    }

    return Math.min(100, Math.max(0, score));
  }

  private getUrgencyMultiplier(urgencyLevel?: string): number {
    switch (urgencyLevel) {
      case "critical":
        return 2.0;
      case "high":
        return 1.5;
      case "medium":
        return 1.0;
      case "low":
        return 0.8;
      default:
        return 1.0;
    }
  }

  private estimateArrivalTime(
    distanceKm: number,
    urgencyMultiplier: number,
  ): number {
    // Assume average speed of 40 km/h in city, 60 km/h on highway
    // Add 5-10 minutes preparation time
    const baseSpeed = urgencyMultiplier > 1.2 ? 60 : 40; // Faster in emergencies
    const travelTimeMinutes = (distanceKm / baseSpeed) * 60;
    const preparationTime = urgencyMultiplier > 1.5 ? 5 : 10;

    return Math.round(travelTimeMinutes + preparationTime);
  }

  private getRecommendationTier(score: number): string {
    if (score >= 80) return "best_match";
    if (score >= 60) return "recommended";
    if (score >= 40) return "alternative";
    return "available";
  }

  /**
   * Get expertise data for multiple mechanics for a specific problem type
   */
  private async getExpertiseForMechanics(
    mechanicIds: string[],
    problemType: string,
  ): Promise<Map<string, MechanicExpertiseEntity>> {
    const expertiseMap = new Map<string, MechanicExpertiseEntity>();

    if (mechanicIds.length === 0) {
      return expertiseMap;
    }

    try {
      const expertiseRecords = await this.expertiseRepository
        .createQueryBuilder("expertise")
        .where("expertise.mechanicId IN (:...mechanicIds)", { mechanicIds })
        .andWhere("expertise.problemType = :problemType", { problemType })
        .getMany();

      for (const record of expertiseRecords) {
        expertiseMap.set(record.mechanicId, record);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to fetch expertise data: ${error.message}`);
    }

    return expertiseMap;
  }

  /**
   * Update mechanic expertise after job completion
   */
  async updateMechanicExpertise(
    mechanicId: string,
    problemType: string,
    successful: boolean,
    resolutionMinutes?: number,
    satisfactionRating?: number,
  ): Promise<MechanicExpertiseEntity> {
    // Find or create expertise record
    let expertise = await this.expertiseRepository.findOne({
      where: { mechanicId, problemType },
    });

    if (!expertise) {
      expertise = this.expertiseRepository.create({
        mechanicId,
        problemType,
        jobsCompleted: 0,
        jobsSuccessful: 0,
      });
    }

    // Update counters
    expertise.jobsCompleted += 1;
    if (successful) {
      expertise.jobsSuccessful += 1;
    }
    expertise.lastJobAt = new Date();

    // Update rolling averages
    if (resolutionMinutes !== undefined) {
      if (expertise.avgResolutionMinutes) {
        // Weighted average: new = (old * (n-1) + new) / n
        expertise.avgResolutionMinutes = Math.round(
          (expertise.avgResolutionMinutes * (expertise.jobsCompleted - 1) +
            resolutionMinutes) /
            expertise.jobsCompleted,
        );
      } else {
        expertise.avgResolutionMinutes = resolutionMinutes;
      }
    }

    if (satisfactionRating !== undefined) {
      if (expertise.avgSatisfactionRating) {
        expertise.avgSatisfactionRating = parseFloat(
          (
            (parseFloat(expertise.avgSatisfactionRating as any) *
              (expertise.jobsCompleted - 1) +
              satisfactionRating) /
            expertise.jobsCompleted
          ).toFixed(2),
        );
      } else {
        expertise.avgSatisfactionRating = satisfactionRating;
      }
    }

    return this.expertiseRepository.save(expertise);
  }

  /**
   * Get all expertise records for a mechanic
   */
  async getMechanicExpertise(
    mechanicId: string,
  ): Promise<MechanicExpertiseEntity[]> {
    return this.expertiseRepository.find({
      where: { mechanicId },
      order: { jobsCompleted: "DESC" },
    });
  }

  /**
   * Get real-time traffic ETAs for mechanics
   */
  private async getTrafficETAs(
    userLat: number,
    userLng: number,
    mechanics: any[],
  ): Promise<Map<string, any>> {
    try {
      const mechanicsWithLocation = mechanics
        .filter((m) => m.lat && m.lng)
        .map((m) => ({ id: m.id, lat: m.lat, lng: m.lng }));

      if (mechanicsWithLocation.length === 0) {
        return new Map();
      }

      return await this.trafficService.getBulkETAs(
        userLat,
        userLng,
        mechanicsWithLocation,
      );
    } catch (error) {
      console.warn("Traffic ETA calculation failed:", error.message);
      return new Map();
    }
  }

  private getMatchReasons(
    mechanic: any,
    request: EmergencyRequestDto,
    score: number,
    trafficData?: any,
    expertise?: MechanicExpertiseEntity | null,
  ): string[] {
    const reasons: string[] = [];

    // Expertise-based reasons (prioritize these)
    if (expertise) {
      const successRate =
        expertise.jobsCompleted > 0
          ? expertise.jobsSuccessful / expertise.jobsCompleted
          : 0;

      if (expertise.jobsCompleted >= 10 && successRate >= 0.9) {
        reasons.push(
          `⭐ Expert in ${request.problemType?.replace("_", " ") || "this issue"}`,
        );
      } else if (expertise.jobsCompleted >= 5) {
        reasons.push(
          `Experienced with ${request.problemType?.replace("_", " ") || "this issue"}`,
        );
      }

      if (successRate >= 0.95 && expertise.jobsCompleted >= 5) {
        reasons.push(`${Math.round(successRate * 100)}% success rate`);
      }

      if (
        expertise.avgResolutionMinutes &&
        expertise.avgResolutionMinutes < 45
      ) {
        reasons.push("Fast problem resolver");
      }
    }

    if (mechanic.distance < 2) {
      reasons.push("Very close to your location");
    } else if (mechanic.distance < 5) {
      reasons.push("Nearby location");
    }

    // Add traffic-aware ETA reason
    if (trafficData) {
      if (trafficData.trafficLevel === "low") {
        reasons.push("Clear route - fast arrival");
      } else if (trafficData.trafficLevel === "moderate") {
        reasons.push("Moderate traffic conditions");
      }
    }

    if (mechanic.rating >= 4.5) {
      reasons.push("Highly rated");
    } else if (mechanic.rating >= 4.0) {
      reasons.push("Well rated");
    }

    if (mechanic.completedJobs >= 50) {
      reasons.push("Experienced professional");
    }

    // Add response time reputation
    if (
      mechanic.average_response_time_minutes &&
      mechanic.average_response_time_minutes < 10
    ) {
      reasons.push("Fast response history");
    }

    if (request.requiredServices && request.requiredServices.length > 0) {
      const matches = request.requiredServices.filter((s) =>
        mechanic.services.includes(s),
      );
      if (matches.length === request.requiredServices.length) {
        reasons.push("Offers all required services");
      } else if (matches.length > 0) {
        reasons.push(
          `Offers ${matches.length} of ${request.requiredServices.length} services`,
        );
      }
    }

    if (mechanic.available) {
      reasons.push("Currently available");
    }

    if (score >= 80) {
      reasons.push("🏆 Best overall match");
    }

    return reasons;
  }

  /**
   * Send emergency alerts to multiple mechanics
   */
  async sendEmergencyAlerts(
    userId: string,
    mechanicIds: string[],
    userLocation: { lat: number; lng: number },
    problemDescription?: string,
    vehicleDetails?: any,
    urgencyLevel: string = "high",
  ) {
    try {
      // Get user details
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException("User not found");
      }

      // Create emergency request in database
      const emergencyRequest =
        await this.emergencyService.createEmergencyRequest(
          userId,
          userLocation.lat,
          userLocation.lng,
          problemDescription || "Emergency breakdown assistance needed",
          vehicleDetails,
          urgencyLevel,
          mechanicIds,
        );

      // Get mechanics
      const mechanics = await this.mechanicRepository.findByIds(mechanicIds);

      // Prepare location string
      const locationText = `${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}`;

      // Send alerts to each mechanic
      const results = await Promise.allSettled(
        mechanics.map(async (mechanic) => {
          const mechanicUser = await this.userRepository.findOne({
            where: { id: mechanic.userId },
          });

          if (!mechanicUser) {
            console.warn(`⚠️ User not found for mechanic ${mechanic.id}`);
            return {
              mechanicId: mechanic.id,
              success: false,
              error: "User not found",
            };
          }

          // Send push notification
          await this.notificationsService.sendToUser(
            mechanicUser.id,
            NotificationType.MECHANIC_ASSIGNED,
            {
              title: "🚨 Emergency Breakdown Request",
              body: `${user.name || user.phoneNumber} needs urgent assistance at ${locationText}`,
              data: {
                type: "emergency_request",
                requestId: emergencyRequest.id,
                userId,
                userName: user.name || user.phoneNumber,
                userPhone: user.phoneNumber,
                location: locationText,
                lat: userLocation.lat.toString(),
                lng: userLocation.lng.toString(),
                problem: problemDescription || "Breakdown assistance needed",
                vehicleDetails: vehicleDetails
                  ? JSON.stringify(vehicleDetails)
                  : null,
              },
            },
          );

          console.log(`✅ Emergency alert sent to mechanic: ${mechanic.name}`);
          return { mechanicId: mechanic.id, success: true };
        }),
      );

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      console.log(
        `🚨 Emergency alerts sent: ${successful} successful, ${failed} failed`,
      );

      return {
        success: true,
        requestId: emergencyRequest.id,
        alertsSent: successful,
        alertsFailed: failed,
        totalMechanics: mechanicIds.length,
        message: `Emergency alerts sent to ${successful} mechanics`,
      };
    } catch (error) {
      console.error("❌ Error sending emergency alerts:", error);
      throw error;
    }
  }

  /**
   * Get route with traffic information using TrafficService
   */
  async getRouteWithTraffic(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
  ): Promise<any> {
    try {
      // Get traffic-aware ETA
      const trafficETA = await this.trafficService.getTrafficAwareETA(
        originLat,
        originLng,
        destLat,
        destLng,
      );

      // Calculate distance
      const distance = this.calculateDistance(
        originLat,
        originLng,
        destLat,
        destLng,
      );

      // Get route polyline (simplified - in production use Google Maps Directions API)
      const polyline = this.generateSimplePolyline(
        originLat,
        originLng,
        destLat,
        destLng,
      );

      return {
        distance,
        duration: trafficETA.durationMinutes,
        trafficCondition: trafficETA.trafficLevel,
        polyline,
        routeSummary: trafficETA.routeSummary || `${distance.toFixed(1)} km`,
      };
    } catch (error) {
      console.error("❌ Error getting route with traffic:", error);
      throw error;
    }
  }

  /**
   * Generate simple polyline between two points
   * In production, use Google Maps Directions API for actual route
   */
  private generateSimplePolyline(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
  ): Array<{ lat: number; lng: number }> {
    // Simple straight line with 10 points
    const points: Array<{ lat: number; lng: number }> = [];
    const steps = 10;

    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      points.push({
        lat: startLat + (endLat - startLat) * ratio,
        lng: startLng + (endLng - startLng) * ratio,
      });
    }

    return points;
  }
}
