import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { UserPaymentSettingsEntity } from "./entities/user-payment-settings.entity";
import { UpdatePaymentSettingsDto } from "./dto/update-payment-settings.dto";

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

    // Validate PIN format
    if (!pin || pin.length < 4 || pin.length > 6) {
      throw new BadRequestException("PIN must be between 4 and 6 digits");
    }

    if (!/^\d+$/.test(pin)) {
      throw new BadRequestException("PIN must contain only numbers");
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    settings.paymentPinHash = hashedPin;
    settings.requirePinForPayments = true;
    await this.settingsRepository.save(settings);
  }

  async verifyPaymentPin(
    userId: string,
    pin: string,
  ): Promise<{ success: boolean }> {
    const settings = await this.findOrCreate(userId);

    if (!settings.paymentPinHash) {
      return { success: false };
    }

    const isValid = await bcrypt.compare(pin, settings.paymentPinHash);
    return { success: isValid };
  }

  async changePaymentPin(
    userId: string,
    oldPin: string,
    newPin: string,
  ): Promise<void> {
    const settings = await this.findOrCreate(userId);

    if (!settings.paymentPinHash) {
      throw new BadRequestException("No PIN is currently set");
    }

    // Verify old PIN is correct
    const isOldPinValid = await bcrypt.compare(oldPin, settings.paymentPinHash);
    if (!isOldPinValid) {
      throw new BadRequestException("Current PIN is incorrect");
    }

    // Validate new PIN format
    if (!newPin || newPin.length < 4 || newPin.length > 6) {
      throw new BadRequestException("PIN must be between 4 and 6 digits");
    }

    if (!/^\d+$/.test(newPin)) {
      throw new BadRequestException("PIN must contain only numbers");
    }

    // Cannot reuse the same PIN
    const isSamePin = await bcrypt.compare(newPin, settings.paymentPinHash);
    if (isSamePin) {
      throw new BadRequestException(
        "New PIN cannot be the same as the current PIN",
      );
    }

    const hashedPin = await bcrypt.hash(newPin, 10);
    settings.paymentPinHash = hashedPin;
    await this.settingsRepository.save(settings);
  }

  async getPinStatus(userId: string): Promise<{ isPinSet: boolean }> {
    const settings = await this.findOrCreate(userId);
    return { isPinSet: !!settings.paymentPinHash };
  }

  async removePaymentPin(userId: string): Promise<void> {
    const settings = await this.findOrCreate(userId);

    settings.paymentPinHash = null;
    settings.requirePinForPayments = false;
    await this.settingsRepository.save(settings);
  }
}
