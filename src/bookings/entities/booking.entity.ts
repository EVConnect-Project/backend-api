import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { Charger } from '../../charger/entities/charger.entity';
import { BookingType } from '../../charger/enums/booking-type.enum';

@Entity('bookings')
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ type: 'uuid' })
  chargerId: string;

  @ManyToOne(() => Charger)
  @JoinColumn({ name: 'chargerId' })
  charger: Charger;

  @Column({ type: 'uuid', nullable: true })
  socketId: string | null;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({ type: 'varchar', default: 'pending' })
  status: string;

  // Maps to DB column "totalCost"
  @Column({ name: 'totalCost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  // Maps to DB column "estimatedEnergy"
  @Column({ name: 'estimatedEnergy', type: 'decimal', precision: 10, scale: 2, nullable: true })
  energyConsumed: number;

  @Column({ type: 'varchar', default: 'pending', nullable: true })
  paymentStatus: string | null;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'text', nullable: true })
  cancelReason: string | null;

  // Booking Type Fields
  @Column({ 
    type: 'varchar', 
    length: 20, 
    nullable: true,
    default: BookingType.PRE_BOOKING 
  })
  bookingType: BookingType;

  // Maps to DB column "checkedInAt"
  @Column({ name: 'checkedInAt', type: 'timestamp', nullable: true })
  checkInTime: Date | null;

  // Maps to DB column "gracePeriodEndsAt"
  @Column({ name: 'gracePeriodEndsAt', type: 'timestamp', nullable: true })
  gracePeriodExpiresAt: Date | null;

  @Column({ default: false, nullable: true })
  autoCheckInEnabled: boolean;

  @Column({ default: false, nullable: true })
  noShow: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
