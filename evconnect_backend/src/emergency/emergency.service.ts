import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmergencyRequestEntity, EmergencyStatus } from './entities/emergency-request.entity';
import { MechanicResponseEntity, ResponseType, MechanicStatus } from './entities/mechanic-response.entity';
import { MechanicEntity } from '../mechanics/entities/mechanic.entity';
import { UserEntity } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/types/notification-types';

@Injectable()
export class EmergencyService {
  constructor(
    @InjectRepository(EmergencyRequestEntity)
    private emergencyRequestRepository: Repository<EmergencyRequestEntity>,
    @InjectRepository(MechanicResponseEntity)
    private mechanicResponseRepository: Repository<MechanicResponseEntity>,
    @InjectRepository(MechanicEntity)
    private mechanicRepository: Repository<MechanicEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Create a new emergency request and alert mechanics
   */
  async createEmergencyRequest(
    userId: string,
    latitude: number,
    longitude: number,
    problemDescription: string,
    vehicleDetails: any,
    urgencyLevel: string,
    alertedMechanicIds: string[],
  ): Promise<EmergencyRequestEntity> {
    const emergencyRequest = this.emergencyRequestRepository.create({
      userId,
      latitude,
      longitude,
      problemDescription,
      vehicleDetails,
      urgencyLevel: urgencyLevel as any,
      status: 'pending',
      alertedMechanicIds,
    });

    const saved = await this.emergencyRequestRepository.save(emergencyRequest);
    console.log(`✅ Emergency request created: ${saved.id}`);
    return saved;
  }

  /**
   * Mechanic responds to emergency request (accept/decline)
   */
  async respondToEmergency(
    requestId: string,
    mechanicId: string,
    responseType: ResponseType,
    etaMinutes?: number,
    notes?: string,
  ): Promise<MechanicResponseEntity> {
    // Check if request exists
    const emergencyRequest = await this.emergencyRequestRepository.findOne({
      where: { id: requestId },
      relations: ['user', 'responses'],
    });

    if (!emergencyRequest) {
      throw new NotFoundException('Emergency request not found');
    }

    if (emergencyRequest.status === 'completed' || emergencyRequest.status === 'cancelled') {
      throw new BadRequestException('This emergency request is no longer active');
    }

    // Check if mechanic already responded
    const existingResponse = await this.mechanicResponseRepository.findOne({
      where: { emergencyRequestId: requestId, mechanicId },
    });

    if (existingResponse) {
      throw new BadRequestException('You have already responded to this request');
    }

    // Get mechanic details
    const mechanic = await this.mechanicRepository.findOne({ where: { id: mechanicId } });
    if (!mechanic) {
      throw new NotFoundException('Mechanic not found');
    }

    // Create response
    const responseData: any = {
      emergencyRequestId: requestId,
      mechanicId,
      responseType,
      etaMinutes,
      notes,
    };
    
    if (responseType === 'accepted') {
      responseData.status = 'accepted';
    }
    
    const response = this.mechanicResponseRepository.create(responseData);
    const saveResult = await this.mechanicResponseRepository.save(response);
    const saved = Array.isArray(saveResult) ? saveResult[0] : saveResult;

    // Notify user about the response
    if (responseType === 'accepted') {
      await this.notificationsService.sendToUser(
        emergencyRequest.userId,
        NotificationType.MECHANIC_ASSIGNED,
        {
          title: '✅ Mechanic Accepted Your Request',
          body: `${mechanic.name} has accepted your emergency request and is on the way!`,
          data: {
            type: 'mechanic_accepted',
            requestId,
            mechanicId,
            mechanicName: mechanic.name,
            eta: etaMinutes ? `${etaMinutes} minutes` : 'Unknown',
          },
        },
      );
    }

    console.log(`✅ Mechanic ${mechanicId} ${responseType} emergency request ${requestId}`);
    return saved;
  }

  /**
   * User selects a mechanic from those who accepted
   */
  async selectMechanic(
    requestId: string,
    userId: string,
    mechanicId: string,
  ): Promise<EmergencyRequestEntity> {
    const emergencyRequest = await this.emergencyRequestRepository.findOne({
      where: { id: requestId, userId },
      relations: ['responses', 'responses.mechanic'],
    });

    if (!emergencyRequest) {
      throw new NotFoundException('Emergency request not found');
    }

    if (emergencyRequest.status !== 'pending') {
      throw new BadRequestException('Emergency request is not in pending state');
    }

    // Check if mechanic accepted
    const mechanicResponse = emergencyRequest.responses.find(
      r => r.mechanicId === mechanicId && r.responseType === 'accepted',
    );

    if (!mechanicResponse) {
      throw new BadRequestException('This mechanic has not accepted your request');
    }

    // Update request
    emergencyRequest.selectedMechanicId = mechanicId;
    emergencyRequest.status = 'accepted';
    const updated = await this.emergencyRequestRepository.save(emergencyRequest);

    // Notify selected mechanic
    const selectedMechanic = await this.mechanicRepository.findOne({ where: { id: mechanicId } });
    if (selectedMechanic) {
      const mechanicUser = await this.userRepository.findOne({ where: { id: selectedMechanic.userId } });
      if (mechanicUser) {
        await this.notificationsService.sendToUser(
          mechanicUser.id,
          NotificationType.MECHANIC_ASSIGNED,
          {
            title: '🎉 You Were Selected!',
            body: 'The user has selected you for their emergency assistance.',
            data: {
              type: 'selected_for_emergency',
              requestId,
              userId: emergencyRequest.userId,
            },
          },
        );
      }
    }

    // Notify other mechanics who were not selected
    const otherResponses = emergencyRequest.responses.filter(
      r => r.mechanicId !== mechanicId && r.responseType === 'accepted',
    );

    for (const response of otherResponses) {
      const mechanic = await this.mechanicRepository.findOne({ where: { id: response.mechanicId } });
      if (mechanic) {
        const mechanicUser = await this.userRepository.findOne({ where: { id: mechanic.userId } });
        if (mechanicUser) {
          await this.notificationsService.sendToUser(
            mechanicUser.id,
            NotificationType.BOOKING_CANCELLED,
            {
              title: 'Request Fulfilled',
              body: 'Another mechanic was selected for this emergency request.',
              data: {
                type: 'not_selected',
                requestId,
              },
            },
          );
        }
      }
    }

    console.log(`✅ User selected mechanic ${mechanicId} for request ${requestId}`);
    return updated;
  }

  /**
   * Update mechanic status (on_the_way, arrived, job_complete)
   */
  async updateMechanicStatus(
    requestId: string,
    mechanicId: string,
    status: MechanicStatus,
    latitude?: number,
    longitude?: number,
  ): Promise<MechanicResponseEntity> {
    const response = await this.mechanicResponseRepository.findOne({
      where: { emergencyRequestId: requestId, mechanicId },
      relations: ['emergencyRequest'],
    });

    if (!response) {
      throw new NotFoundException('Response not found');
    }

    if (response.responseType !== 'accepted') {
      throw new BadRequestException('Only accepted responses can update status');
    }

    // Update response
    response.status = status;
    response.statusUpdatedAt = new Date();
    if (latitude !== undefined) response.currentLatitude = latitude;
    if (longitude !== undefined) response.currentLongitude = longitude;

    const updated = await this.mechanicResponseRepository.save(response);

    // Update emergency request status if job complete
    if (status === 'job_complete') {
      await this.emergencyRequestRepository.update(
        { id: requestId },
        { status: 'completed', completedAt: new Date() },
      );
    } else if (status === 'on_the_way' && response.emergencyRequest.status === 'accepted') {
      await this.emergencyRequestRepository.update(
        { id: requestId },
        { status: 'in_progress' },
      );
    }

    // Notify user about status change
    const statusMessages = {
      on_the_way: 'The mechanic is on the way to your location',
      arrived: 'The mechanic has arrived at your location',
      job_complete: 'The job has been completed',
    };

    const mechanic = await this.mechanicRepository.findOne({ where: { id: mechanicId } });
    if (mechanic) {
      await this.notificationsService.sendToUser(
        response.emergencyRequest.userId,
        status === 'job_complete' ? NotificationType.SERVICE_COMPLETED : NotificationType.MECHANIC_ON_WAY,
        {
          title: `Status Update: ${status.replace(/_/g, ' ').toUpperCase()}`,
          body: statusMessages[status] || 'Status updated',
          data: {
            type: 'status_update',
            requestId,
            mechanicId,
            mechanicName: mechanic.name,
            status,
          },
        },
      );
    }

    console.log(`✅ Updated status for mechanic ${mechanicId} on request ${requestId}: ${status}`);
    return updated;
  }

  /**
   * Get emergency request with all responses
   */
  async getEmergencyRequest(requestId: string, userId: string): Promise<any> {
    const request = await this.emergencyRequestRepository.findOne({
      where: { id: requestId, userId },
      relations: ['responses', 'responses.mechanic', 'selectedMechanic'],
    });

    if (!request) {
      throw new NotFoundException('Emergency request not found');
    }

    return {
      ...request,
      acceptedMechanics: request.responses
        .filter(r => r.responseType === 'accepted')
        .map(r => ({
          ...r.mechanic,
          responseId: r.id,
          status: r.status,
          etaMinutes: r.etaMinutes,
          notes: r.notes,
          currentLocation: r.currentLatitude && r.currentLongitude
            ? { lat: r.currentLatitude, lng: r.currentLongitude }
            : null,
          respondedAt: r.respondedAt,
        })),
    };
  }

  /**
   * Get all emergency requests for a user
   */
  async getUserEmergencyRequests(userId: string): Promise<EmergencyRequestEntity[]> {
    return this.emergencyRequestRepository.find({
      where: { userId },
      relations: ['responses', 'responses.mechanic', 'selectedMechanic'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Cancel emergency request
   */
  async cancelEmergencyRequest(requestId: string, userId: string): Promise<void> {
    const request = await this.emergencyRequestRepository.findOne({
      where: { id: requestId, userId },
    });

    if (!request) {
      throw new NotFoundException('Emergency request not found');
    }

    if (request.status === 'completed' || request.status === 'cancelled') {
      throw new BadRequestException('Cannot cancel this request');
    }

    await this.emergencyRequestRepository.update(
      { id: requestId },
      { status: 'cancelled', cancelledAt: new Date() },
    );

    console.log(`✅ Emergency request ${requestId} cancelled by user`);
  }
}
