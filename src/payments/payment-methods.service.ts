import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaymentMethodEntity } from "./entities/payment-method.entity";
import { CreatePaymentMethodDto } from "./dto/create-payment-method.dto";
import { UpdatePaymentMethodDto } from "./dto/update-payment-method.dto";

@Injectable()
export class PaymentMethodsService {
  constructor(
    @InjectRepository(PaymentMethodEntity)
    private paymentMethodRepository: Repository<PaymentMethodEntity>,
  ) {}

  async create(
    createDto: CreatePaymentMethodDto,
    userId: string,
  ): Promise<PaymentMethodEntity> {
    // If this is set as default, unset other default payment methods
    if (createDto.isDefault) {
      await this.paymentMethodRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );
    }

    const paymentMethod = this.paymentMethodRepository.create({
      ...createDto,
      userId,
    } as any);

    const saved = await this.paymentMethodRepository.save(paymentMethod);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async findAll(userId: string): Promise<PaymentMethodEntity[]> {
    return await this.paymentMethodRepository.find({
      where: { userId },
      order: {
        isDefault: "DESC" as any,
        createdAt: "DESC" as any,
      },
    });
  }

  async findOne(id: string, userId: string): Promise<PaymentMethodEntity> {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id, userId },
    });

    if (!paymentMethod) {
      throw new NotFoundException("Payment method not found");
    }

    return paymentMethod;
  }

  async findDefault(userId: string): Promise<PaymentMethodEntity | null> {
    return await this.paymentMethodRepository.findOne({
      where: { userId, isDefault: true },
    });
  }

  async update(
    id: string,
    updateDto: UpdatePaymentMethodDto,
    userId: string,
  ): Promise<PaymentMethodEntity> {
    const paymentMethod = await this.findOne(id, userId);

    // If setting as default, unset other defaults
    if (updateDto.isDefault) {
      await this.paymentMethodRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(paymentMethod, updateDto);
    return await this.paymentMethodRepository.save(paymentMethod);
  }

  async setDefault(id: string, userId: string): Promise<PaymentMethodEntity> {
    const paymentMethod = await this.findOne(id, userId);

    // Unset all other defaults
    await this.paymentMethodRepository.update(
      { userId, isDefault: true },
      { isDefault: false },
    );

    paymentMethod.isDefault = true;
    return await this.paymentMethodRepository.save(paymentMethod);
  }

  async remove(id: string, userId: string): Promise<void> {
    const paymentMethod = await this.findOne(id, userId);

    // Don't allow removing default payment method if it's the only one
    if (paymentMethod.isDefault) {
      const count = await this.paymentMethodRepository.count({
        where: { userId },
      });
      if (count === 1) {
        throw new BadRequestException("Cannot remove the only payment method");
      }
    }

    await this.paymentMethodRepository.remove(paymentMethod);
  }
}
