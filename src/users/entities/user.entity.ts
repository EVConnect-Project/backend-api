import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'phone', nullable: true, unique: true })
  phoneNumber: string;

  @Column({ name: 'country_code', nullable: true })
  countryCode: string;

  @Column()
  @Exclude()
  password: string;

  @Column()
  name: string;

  @Column({ default: 'user' })
  role: string;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'is_banned', default: false })
  isBanned: boolean;

  // EV Driver Profile Information
  // Vehicle types: car, van, bus, truck, three-wheeler, bike
  @Column({ name: 'vehicle_type', nullable: true })
  vehicleType: string;

  @Column({ name: 'vehicle_brand', nullable: true })
  vehicleBrand: string;

  @Column({ name: 'vehicle_model', nullable: true })
  vehicleModel: string;

  @Column({ name: 'battery_capacity', type: 'decimal', precision: 5, scale: 2, nullable: true })
  batteryCapacity: number;

  // Multiple connector types supported (JSON array)
  // e.g., ["Type 2 (AC)", "CCS2 (DC)"]
  @Column({ name: 'connector_type', type: 'jsonb', nullable: true })
  connectorTypes: string[];

  // Legal Requirements
  @Column({ name: 'accepted_terms', default: false })
  acceptedTerms: boolean;

  @Column({ name: 'accepted_privacy_policy', default: false })
  acceptedPrivacyPolicy: boolean;

  @Column({ name: 'terms_accepted_at', type: 'timestamp', nullable: true })
  termsAcceptedAt: Date;

  // Token version for logout invalidation - incremented on logout to invalidate all existing tokens
  @Column({ name: 'token_version', default: 0 })
  tokenVersion: number;

  @OneToMany('MarketplaceListing', 'seller')
  marketplaceListings: any[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
