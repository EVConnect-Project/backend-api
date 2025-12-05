import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { OwnerPaymentAccount } from './entities/owner-payment-account.entity';
import { CreatePaymentAccountDto } from './dto/create-payment-account.dto';
import { UpdatePaymentAccountDto } from './dto/update-payment-account.dto';
import { Charger } from '../charger/entities/charger.entity';

@Injectable()
export class OwnerPaymentAccountService {
  constructor(
    @InjectRepository(OwnerPaymentAccount)
    private readonly paymentAccountRepository: Repository<OwnerPaymentAccount>,
    @InjectRepository(Charger)
    private readonly chargerRepository: Repository<Charger>,
  ) {}

  async create(userId: string, createDto: CreatePaymentAccountDto): Promise<OwnerPaymentAccount> {
    // If this is being set as primary, unset any existing primary accounts
    if (createDto['isPrimary']) {
      await this.paymentAccountRepository.update(
        { userId, isPrimary: true },
        { isPrimary: false }
      );
    }

    const paymentAccount = this.paymentAccountRepository.create({
      ...createDto,
      userId,
    });

    return this.paymentAccountRepository.save(paymentAccount);
  }

  async findAllByUser(userId: string): Promise<OwnerPaymentAccount[]> {
    return this.paymentAccountRepository.find({
      where: { userId },
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<OwnerPaymentAccount> {
    const account = await this.paymentAccountRepository.findOne({
      where: { id, userId },
    });

    if (!account) {
      throw new NotFoundException('Payment account not found');
    }

    return account;
  }

  async update(id: string, userId: string, updateDto: UpdatePaymentAccountDto): Promise<OwnerPaymentAccount> {
    const account = await this.findOne(id, userId);

    // If setting as primary, unset other primary accounts
    if (updateDto.isPrimary) {
      await this.paymentAccountRepository.update(
        { userId, isPrimary: true, id: Not(id) },
        { isPrimary: false }
      );
    }

    Object.assign(account, updateDto);
    return this.paymentAccountRepository.save(account);
  }

  async remove(id: string, userId: string): Promise<void> {
    const account = await this.findOne(id, userId);

    // Check if any chargers are using this payment account
    const chargersUsingAccount = await this.chargerRepository.count({
      where: { paymentAccountId: id },
    });

    if (chargersUsingAccount > 0) {
      throw new BadRequestException(
        `Cannot delete payment account. It is being used by ${chargersUsingAccount} charger(s). Please update those chargers first.`
      );
    }

    await this.paymentAccountRepository.remove(account);
  }

  async setPrimary(id: string, userId: string): Promise<OwnerPaymentAccount> {
    const account = await this.findOne(id, userId);

    // Unset all other primary accounts
    await this.paymentAccountRepository.update(
      { userId, isPrimary: true },
      { isPrimary: false }
    );

    // Set this one as primary
    account.isPrimary = true;
    return this.paymentAccountRepository.save(account);
  }

  async getPrimaryAccount(userId: string): Promise<OwnerPaymentAccount | null> {
    return this.paymentAccountRepository.findOne({
      where: { userId, isPrimary: true, isActive: true },
    });
  }

  async hasVerifiedAccount(userId: string): Promise<boolean> {
    const count = await this.paymentAccountRepository.count({
      where: { 
        userId, 
        verificationStatus: 'verified' as any,
        isActive: true 
      },
    });
    return count > 0;
  }
}
