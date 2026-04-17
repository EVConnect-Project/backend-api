import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { UserEntity } from "../../users/entities/user.entity";

@Entity("admin_actions")
export class AdminAction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  adminId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "adminId" })
  admin: UserEntity;

  @Column({ type: "varchar", length: 50 })
  actionType: string; // 'ban_user', 'verify_charger', 'approve_listing', etc.

  @Column({ type: "varchar", length: 50 })
  targetType: string; // 'user', 'charger', 'listing', 'mechanic'

  @Column({ type: "uuid" })
  targetId: string;

  @Column({ type: "jsonb", nullable: true })
  details: Record<string, any>;

  @Column({ type: "text", nullable: true })
  reason: string;

  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;
}
