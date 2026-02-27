import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { BadRequestException } from '@nestjs/common';
import { PaymentSettingsService } from './payment-settings.service';
import { UserPaymentSettingsEntity } from './entities/user-payment-settings.entity';

describe('PaymentSettingsService - PIN Management', () => {
  let service: PaymentSettingsService;
  let repository: Repository<UserPaymentSettingsEntity>;

  const mockUserId = 'test-user-123';
  const mockPin = '1234';
  const mockNewPin = '5678';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentSettingsService,
        {
          provide: getRepositoryToken(UserPaymentSettingsEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentSettingsService>(PaymentSettingsService);
    repository = module.get<Repository<UserPaymentSettingsEntity>>(
      getRepositoryToken(UserPaymentSettingsEntity),
    );
  });

  describe('setPaymentPin', () => {
    it('should set a new PIN with valid input', async () => {
      const mockSettings = { userId: mockUserId, paymentPinHash: null, requirePinForPayments: false };
      jest.spyOn(service, 'findOrCreate').mockResolvedValue(mockSettings as any);
      jest.spyOn(repository, 'save').mockResolvedValue(mockSettings as any);

      await service.setPaymentPin(mockUserId, mockPin);

      expect(service.findOrCreate).toHaveBeenCalledWith(mockUserId);
      expect(mockSettings.requirePinForPayments).toBe(true);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw error if PIN is less than 4 digits', async () => {
      const mockSettings = { userId: mockUserId };
      jest.spyOn(service, 'findOrCreate').mockResolvedValue(mockSettings as any);

      await expect(service.setPaymentPin(mockUserId, '123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if PIN is more than 6 digits', async () => {
      const mockSettings = { userId: mockUserId };
      jest.spyOn(service, 'findOrCreate').mockResolvedValue(mockSettings as any);

      await expect(service.setPaymentPin(mockUserId, '1234567')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if PIN contains non-numeric characters', async () => {
      const mockSettings = { userId: mockUserId };
      jest.spyOn(service, 'findOrCreate').mockResolvedValue(mockSettings as any);

      await expect(service.setPaymentPin(mockUserId, 'abcd')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyPaymentPin', () => {
    it('should return true for correct PIN', async () => {
      const hashedPin = await bcrypt.hash(mockPin, 10);
      const mockSettings = { userId: mockUserId, paymentPinHash: hashedPin };
      jest.spyOn(service, 'findOrCreate').mockResolvedValue(mockSettings as any);

      const result = await service.verifyPaymentPin(mockUserId, mockPin);

      expect(result).toEqual({ success: true });
    });

    it('should return false for incorrect PIN', async () => {
      const hashedPin = await bcrypt.hash(mockPin, 10);
      const mockSettings = { userId: mockUserId, paymentPinHash: hashedPin };
      jest.spyOn(service, 'findOrCreate').mockResolvedValue(mockSettings as any);

      const result = await service.verifyPaymentPin(mockUserId, '9999');

      expect(result).toEqual({ success: false });
    });

    it('should return false if no PIN is set', async () => {
      const mockSettings = { userId: mockUserId, paymentPinHash: null };
      jest.spyOn(service, 'findOrCreate').mockResolvedValue(mockSettings as any);

      const result = await service.verifyPaymentPin(mockUserId, mockPin);

      expect(result).toEqual({ success: false });
    });
  });

  describe('changePaymentPin', () => {
    it('should change PIN when old PIN is correct', async () => {
      const oldHashedPin = await bcrypt.hash(mockPin, 10);
      const mockSettings = {
        userId: mockUserId,
        paymentPinHash: oldHashedPin,
      };

      jest.spyOn(service, 'findOrCreate').mockResolvedValue(mockSettings as any);
      jest.spyOn(repository, 'save').mockResolvedValue(mockSettings as any);

      await service.changePaymentPin(mockUserId, mockPin, mockNewPin);

      expect(service.findOrCreate).toHaveBeenCalledWith(mockUserId);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw error if old PIN is incorrect', async () => {
      const oldHashedPin = await bcrypt.hash(mockPin, 10);
      const mockSettings = {
        userId: mockUserId,
        paymentPinHash: oldHashedPin,
      };

      jest.spyOn(service, 'findOrCreate').mockResolvedValue(mockSettings as any);

      await expect(service.changePaymentPin(mockUserId, '9999', mockNewPin)).rejects.toThrow(
        'Current PIN is incorrect',
      );
    });

    it('should throw error if new PIN is invalid format', async () => {
      const oldHashedPin = await bcrypt.hash(mockPin, 10);
      const mockSettings = {
        userId: mockUserId,
        paymentPinHash: oldHashedPin,
      };

      jest.spyOn(service, 'findOrCreate').mockResolvedValue(mockSettings as any);

      await expect(service.changePaymentPin(mockUserId, mockPin, 'abc')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if new PIN is same as old PIN', async () => {
      const oldHashedPin = await bcrypt.hash(mockPin, 10);
      const mockSettings = {
        userId: mockUserId,
        paymentPinHash: oldHashedPin,
      };

      jest.spyOn(service, 'findOrCreate').mockResolvedValue(mockSettings as any);

      await expect(service.changePaymentPin(mockUserId, mockPin, mockPin)).rejects.toThrow(
        'New PIN cannot be the same as the current PIN',
      );
    });

    it('should throw error if no PIN is set', async () => {
      const mockSettings = { userId: mockUserId, paymentPinHash: null };
      jest.spyOn(service, 'findOrCreate').mockResolvedValue(mockSettings as any);

      await expect(service.changePaymentPin(mockUserId, mockPin, mockNewPin)).rejects.toThrow(
        'No PIN is currently set',
      );
    });
  });

  describe('getPinStatus', () => {
    it('should return true if PIN is set', async () => {
      const hashedPin = await bcrypt.hash(mockPin, 10);
      const mockSettings = { userId: mockUserId, paymentPinHash: hashedPin };
      jest.spyOn(service, 'findOrCreate').mockResolvedValue(mockSettings as any);

      const result = await service.getPinStatus(mockUserId);

      expect(result).toEqual({ isPinSet: true });
    });

    it('should return false if PIN is not set', async () => {
      const mockSettings = { userId: mockUserId, paymentPinHash: null };
      jest.spyOn(service, 'findOrCreate').mockResolvedValue(mockSettings as any);

      const result = await service.getPinStatus(mockUserId);

      expect(result).toEqual({ isPinSet: false });
    });
  });

  describe('removePaymentPin', () => {
    it('should remove PIN successfully', async () => {
      const hashedPin = await bcrypt.hash(mockPin, 10);
      const mockSettings = {
        userId: mockUserId,
        paymentPinHash: hashedPin,
        requirePinForPayments: true,
      };

      jest.spyOn(service, 'findOrCreate').mockResolvedValue(mockSettings as any);
      jest.spyOn(repository, 'save').mockResolvedValue(mockSettings as any);

      await service.removePaymentPin(mockUserId);

      expect(mockSettings.paymentPinHash).toBeNull();
      expect(mockSettings.requirePinForPayments).toBe(false);
      expect(repository.save).toHaveBeenCalled();
    });
  });
});
