import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BreakdownRequest, BreakdownStatus } from './entities/breakdown-request.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CreateBreakdownRequestDto } from './dto/create-breakdown-request.dto';
import { UpdateBreakdownStatusDto } from './dto/update-breakdown-status.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BreakdownService {
  constructor(
    @InjectRepository(BreakdownRequest)
    private breakdownRequestRepository: Repository<BreakdownRequest>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Create a breakdown assistance request
   */
  async createRequest(
    createDto: CreateBreakdownRequestDto,
    userId: string,
  ) {
    const request = this.breakdownRequestRepository.create({
      ...createDto,
      userId,
      status: BreakdownStatus.PENDING,
    });

    const saved = await this.breakdownRequestRepository.save(request);

    return {
      ...saved,
      message: 'Breakdown request created successfully. Looking for available mechanics...',
    };
  }

  /**
   * Get all requests for a user
   */
  async getMyRequests(userId: string) {
    const requests = await this.breakdownRequestRepository.find({
      where: { userId },
      relations: ['mechanic'],
      order: { createdAt: 'DESC' },
    });

    return requests;
  }

  /**
   * Get specific request details
   */
  async getRequestById(id: string, userId: string) {
    const request = await this.breakdownRequestRepository.findOne({
      where: { id },
      relations: ['mechanic', 'user'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.userId !== userId) {
      throw new ForbiddenException('You can only view your own requests');
    }

    return request;
  }

  /**
   * Get available breakdown requests for mechanics
   */
  async getAvailableRequests(mechanicId?: string) {
    // Get pending and assigned requests
    const where: any = {};
    
    if (mechanicId) {
      // Mechanic can see their assigned requests and pending ones
      where.status = BreakdownStatus.PENDING;
    } else {
      where.status = BreakdownStatus.PENDING;
    }

    const requests = await this.breakdownRequestRepository.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return requests;
  }

  /**
   * Get mechanic's assigned/active requests
   */
  async getMechanicRequests(mechanicId: string) {
    const requests = await this.breakdownRequestRepository.find({
      where: { mechanicId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return requests;
  }

  /**
   * Assign mechanic to request
   */
  async assignMechanic(requestId: string, mechanicId: string) {
    const request = await this.breakdownRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== BreakdownStatus.PENDING) {
      throw new BadRequestException('Request is not available for assignment');
    }

    // Verify mechanic exists and has mechanic role
    const mechanic = await this.userRepository.findOne({
      where: { id: mechanicId },
    });

    if (!mechanic || mechanic.role !== 'mechanic') {
      throw new BadRequestException('Invalid mechanic');
    }

    request.mechanicId = mechanicId;
    request.status = BreakdownStatus.ASSIGNED;

    const updated = await this.breakdownRequestRepository.save(request);

    // Send mechanic assigned notification to user
    await this.notificationsService.sendMechanicAssigned(
      request.userId,
      request.id,
      mechanic.name,
    );

    return {
      ...updated,
      message: 'Mechanic assigned successfully',
    };
  }

  /**
   * Update request status
   */
  async updateStatus(
    id: string,
    updateDto: UpdateBreakdownStatusDto,
    userId: string,
  ) {
    const request = await this.breakdownRequestRepository.findOne({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Only assigned mechanic or request owner can update
    if (request.mechanicId !== userId && request.userId !== userId) {
      throw new ForbiddenException('Not authorized to update this request');
    }

    Object.assign(request, updateDto);

    if (updateDto.status === BreakdownStatus.RESOLVED) {
      request.resolvedAt = new Date();
      
      // Send service completed notification
      await this.notificationsService.sendServiceCompleted(
        request.userId,
        request.id,
      );
    }

    const updated = await this.breakdownRequestRepository.save(request);

    return {
      ...updated,
      message: 'Request updated successfully',
    };
  }

  /**
   * Cancel request (user only)
   */
  async cancelRequest(id: string, userId: string) {
    const request = await this.breakdownRequestRepository.findOne({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own requests');
    }

    if (request.status === BreakdownStatus.RESOLVED) {
      throw new BadRequestException('Cannot cancel resolved request');
    }

    request.status = BreakdownStatus.CANCELLED;
    await this.breakdownRequestRepository.save(request);

    return { message: 'Request cancelled successfully' };
  }
}
