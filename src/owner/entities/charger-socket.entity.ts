import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Charger } from '../../charger/entities/charger.entity';
import { BookingMode } from '../../charger/enums/booking-mode.enum';

@Entity('charger_sockets')
export class ChargerSocket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'charger_id', type: 'uuid' })
  chargerId: string;

  @ManyToOne(() => Charger, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'charger_id' })
  charger: Charger;

  @Column({ name: 'socket_number', type: 'int' })
  socketNumber: number;

  @Column({ name: 'socket_label', type: 'varchar', length: 50, nullable: true })
  socketLabel: string;

  @Column({ name: 'connector_type', type: 'varchar', length: 50 })
  connectorType: 'type2' | 'type1_j1772' | 'ccs2' | 'chademo' | 'tesla_nacs';

  @Column({ name: 'max_power_kw', type: 'decimal', precision: 6, scale: 2 })
  maxPowerKw: number;

  @Column({ name: 'price_per_kwh', type: 'decimal', precision: 8, scale: 4, nullable: true })
  pricePerKwh: number;

  @Column({ name: 'price_per_hour', type: 'decimal', precision: 8, scale: 4, nullable: true })
  pricePerHour: number;

  @Column({ name: 'is_free', type: 'boolean', default: false })
  isFree: boolean;

  @Column({ 
    name: 'booking_mode',
    type: 'varchar',
    length: 20,
    default: 'both'
  })
  bookingMode: BookingMode;

  @Column({ 
    name: 'current_status',
    type: 'varchar',
    length: 20,
    default: 'available'
  })
  status: 'available' | 'in_use' | 'reserved' | 'offline' | 'faulted';

  @Column({ name: 'occupied_by', type: 'uuid', nullable: true })
  occupiedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
