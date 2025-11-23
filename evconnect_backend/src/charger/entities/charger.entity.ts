import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('chargers')
export class Charger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'ownerId' })
  owner: UserEntity;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  powerKw: number;

  @Column({ type: 'decimal', precision: 8, scale: 4 })
  pricePerKwh: number;

  @Column({ default: false })
  verified: boolean;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'varchar', default: 'available' })
  status: 'available' | 'in-use' | 'offline';

  // OCPP Integration Fields
  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  chargeBoxIdentity: string;

  @Column({ type: 'varchar', default: 'not_configured' })
  ocppStatus: 'not_configured' | 'pending' | 'configured' | 'connected';

  @Column({ default: false })
  isOnline: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastHeartbeat: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
