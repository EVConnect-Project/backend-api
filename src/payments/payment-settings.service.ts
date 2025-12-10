import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserPaymentSettingsEntity } from './entities/user-payment-settings.entity';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';

@Injectable()
export class PaymentSettingsService {
  constructor(
    @InjectRepository(UserPaymentSettingsEntity)
    private settingsRepository: Repository<UserPaymentSettingsEntity>,
  ) {}

  async findOrCreate(userId: string): Promise<UserPaymentSettingsEntity> {
    let settings = await this.settingsRepository.findOne({
      where: { userId },
    });

    if (!settings) {
      settings = this.settingsRepository.create({ userId });
      settings = await this.settingsRepository.save(settings);
    }

    return settings;
  }

  async update(
    userId: string,
    updateDto: UpdatePaymentSettingsDto,
  ): Promise<UserPaymentSettingsEntity> {
    const settings = await this.findOrCreate(userId);

    Object.assign(settings, updateDto);
    return await this.settingsRepository.save(settings);
  }

  async setPaymentPin(userId: string, pin: string): Promise<void> {
    const settings = await this.findOrCreate(userId);
    const hashedPin = await bcrypt.hash(pin, 10);
    
    settings.paymentPinHash = hashedPin;
    settings.requirePinForPayments = true;
    await this.settingsRepository.save(settings);
  }

  async verifyPaymentPin(userId: string, pin: string): Promise<boolean> {
    const settings = await this.findOrCreate(userId);

    if (!settings.paymentPinHash) {
      return false;
    }

    return await bcrypt.compare(pin, settings.paymentPinHash);
  }

  async removePaymentPin(userId: string): Promise<void> {
    const settings = await this.findOrCreate(userId);
    
    settings.paymentPinHash = null;
    settings.requirePinForPayments = false;
    await this.settingsRepository.save(settings);
  }
}
