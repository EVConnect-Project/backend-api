import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum LeadType {
  CONTACT = 'CONTACT',
  PARTNER = 'PARTNER',
  MECHANIC = 'MECHANIC'
}

export enum LeadStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED'
}

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: LeadType,
    default: LeadType.CONTACT,
  })
  type: LeadType;

  @Column({ name: 'first_name', nullable: true })
  firstName: string;

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  subject: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ name: 'company_name', nullable: true })
  companyName: string;

  @Column({ name: 'contact_name', nullable: true })
  contactName: string;

  @Column({ name: 'location_count', nullable: true })
  locationCount: string;

  @Column({
    type: 'enum',
    enum: LeadStatus,
    default: LeadStatus.NEW,
  })
  status: LeadStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
