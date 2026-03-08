import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { BillingModel } from './promotion.entity';

@Entity('ad_revenue_ledger')
@Index(['promotionId', 'createdAt'])
@Index(['createdAt'])
export class AdRevenueLedgerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  promotionId: string;

  /** impression | click | conversion */
  @Column()
  eventType: string;

  @Column({ type: 'int', default: 1 })
  eventCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  unitRate: number;

  /** Total amount = eventCount * unitRate (for CPM: eventCount/1000 * unitRate) */
  @Column({ type: 'decimal', precision: 12, scale: 4 })
  amount: number;

  @Column({ type: 'enum', enum: BillingModel })
  billingModel: BillingModel;

  @CreateDateColumn()
  createdAt: Date;
}
