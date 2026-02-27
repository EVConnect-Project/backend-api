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

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({ 
    type: 'enum',
    enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'],
    default: 'pending'
  })
  status: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  energyConsumed: number;

  // Booking Type Fields
  @Column({ 
    type: 'varchar', 
    length: 20, 
    default: BookingType.PRE_BOOKING 
  })
  bookingType: BookingType;

  @Column({ type: 'timestamp', nullable: true })
  checkInTime: Date | null;

  @Column({ default: false })
  noShow: boolean;

  @Column({ type: 'timestamp', nullable: true })
  gracePeriodExpiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
