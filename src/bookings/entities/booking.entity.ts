import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { Charger } from '../../charger/entities/charger.entity';
import { BookingType } from '../../charger/enums/booking-type.enum';

@Entity('bookings')
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'charger_id', type: 'uuid' })
  chargerId: string;

  @ManyToOne(() => Charger)
  @JoinColumn({ name: 'charger_id' })
  charger: Charger;

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp' })
  endTime: Date;

  @Column({ 
    type: 'enum',
    enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'],
    default: 'pending'
  })
  status: string;

  @Column({ name: 'total_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ name: 'energy_consumed', type: 'decimal', precision: 10, scale: 2, nullable: true })
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
