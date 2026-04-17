import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ChargerReview } from "./entities/review.entity";
import { CreateReviewDto } from "./dto/create-review.dto";
import { UpdateReviewDto } from "./dto/update-review.dto";

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ChargerReview)
    private reviewsRepository: Repository<ChargerReview>,
  ) {}

  async create(
    createReviewDto: CreateReviewDto,
    userId: string,
  ): Promise<ChargerReview> {
    // Check if user already reviewed this charger
    const existing = await this.reviewsRepository.findOne({
      where: {
        chargerId: createReviewDto.chargerId,
        userId,
      },
    });

    if (existing) {
      throw new ForbiddenException("You have already reviewed this charger");
    }

    const review = this.reviewsRepository.create({
      ...createReviewDto,
      userId,
    });

    return this.reviewsRepository.save(review);
  }

  async findByCharger(
    chargerId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ reviews: ChargerReview[]; total: number }> {
    const [reviews, total] = await this.reviewsRepository.findAndCount({
      where: { chargerId },
      relations: ["user"],
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Map to include user info
    const reviewsWithUser = reviews.map((review) => ({
      ...review,
      userName: review.user?.name || "Anonymous",
      userAvatar: null, // UserEntity doesn't have profilePicture field
      isVerifiedUser: review.user?.phoneNumber ? true : false,
    }));

    return { reviews: reviewsWithUser as any, total };
  }

  async getRatingSummary(chargerId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
  }> {
    const reviews = await this.reviewsRepository.find({
      where: { chargerId },
      select: ["rating"],
    });

    const total = reviews.length;
    if (total === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;

    reviews.forEach((review) => {
      distribution[review.rating]++;
      sum += review.rating;
    });

    return {
      averageRating: parseFloat((sum / total).toFixed(2)),
      totalReviews: total,
      ratingDistribution: distribution,
    };
  }

  async findOne(id: string): Promise<ChargerReview> {
    const review = await this.reviewsRepository.findOne({
      where: { id },
      relations: ["user"],
    });

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    return review;
  }

  async update(
    id: string,
    updateReviewDto: UpdateReviewDto,
    userId: string,
  ): Promise<ChargerReview> {
    const review = await this.findOne(id);

    if (review.userId !== userId) {
      throw new ForbiddenException("You can only update your own reviews");
    }

    Object.assign(review, updateReviewDto);
    return this.reviewsRepository.save(review);
  }

  async remove(id: string, userId: string): Promise<void> {
    const review = await this.findOne(id);

    if (review.userId !== userId) {
      throw new ForbiddenException("You can only delete your own reviews");
    }

    await this.reviewsRepository.remove(review);
  }

  async markHelpful(id: string): Promise<ChargerReview> {
    const review = await this.findOne(id);
    review.helpfulCount++;
    return this.reviewsRepository.save(review);
  }
}
