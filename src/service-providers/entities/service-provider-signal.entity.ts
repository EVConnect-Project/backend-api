import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("service_provider_signals")
export class ServiceProviderSignalEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @Column({ name: "provider_id", type: "uuid" })
  providerId: string;

  @Column({ name: "provider_type", type: "varchar", length: 32 })
  providerType: string;

  @Column({ name: "mode", type: "varchar", length: 16 })
  mode: string;

  @Column({ name: "issue_type", type: "varchar", length: 80, nullable: true })
  issueType: string | null;

  @Column({ name: "action", type: "varchar", length: 40 })
  action: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
