import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true, unique: true })
  phoneNumber: string;

  @Column({ nullable: true })
  countryCode: string;

  @Column()
  @Exclude()
  password: string;

  @Column()
  name: string;

  @Column({ default: 'user' })
  role: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: false })
  isBanned: boolean;

  // EV Driver Profile Information
  @Column({ name: 'vehicle_type', nullable: true })
  vehicleType: string;

  @Column({ name: 'vehicle_brand', nullable: true })
  vehicleBrand: string;

  @Column({ name: 'vehicle_model', nullable: true })
  vehicleModel: string;

  @Column({ name: 'battery_capacity', type: 'decimal', precision: 5, scale: 2, nullable: true })
  batteryCapacity: number;

  @Column({ name: 'connector_type', nullable: true })
  connectorType: string;

  // Legal Requirements
  @Column({ name: 'accepted_terms', default: false })
  acceptedTerms: boolean;

  @Column({ name: 'accepted_privacy_policy', default: false })
  acceptedPrivacyPolicy: boolean;

  @Column({ name: 'terms_accepted_at', type: 'timestamp', nullable: true })
  termsAcceptedAt: Date;

  @OneToMany('MarketplaceListing', 'seller')
  marketplaceListings: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
