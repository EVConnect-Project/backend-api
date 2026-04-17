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
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto } from "./dto/create-review.dto";
import { UpdateReviewDto } from "./dto/update-review.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post("chargers/:chargerId/reviews")
  @UseGuards(JwtAuthGuard)
  create(
    @Param("chargerId") chargerId: string,
    @Body() createReviewDto: CreateReviewDto,
    @Request() req,
  ) {
    createReviewDto.chargerId = chargerId;
    return this.reviewsService.create(createReviewDto, req.user.userId);
  }

  @Get("chargers/:chargerId/reviews")
  async findByCharger(
    @Param("chargerId") chargerId: string,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "20",
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    return this.reviewsService.findByCharger(chargerId, pageNum, limitNum);
  }

  @Get("chargers/:chargerId/rating-summary")
  getRatingSummary(@Param("chargerId") chargerId: string) {
    return this.reviewsService.getRatingSummary(chargerId);
  }

  @Get("reviews/:id")
  findOne(@Param("id") id: string) {
    return this.reviewsService.findOne(id);
  }

  @Patch("reviews/:id")
  @UseGuards(JwtAuthGuard)
  update(
    @Param("id") id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @Request() req,
  ) {
    return this.reviewsService.update(id, updateReviewDto, req.user.userId);
  }

  @Delete("reviews/:id")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string, @Request() req) {
    return this.reviewsService.remove(id, req.user.userId);
  }

  @Post("reviews/:id/helpful")
  @UseGuards(JwtAuthGuard)
  markHelpful(@Param("id") id: string) {
    return this.reviewsService.markHelpful(id);
  }
}
