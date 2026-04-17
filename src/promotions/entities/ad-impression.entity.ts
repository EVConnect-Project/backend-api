import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";
import { AdPlacement } from "./promotion.entity";

export enum AdEventType {
  IMPRESSION = "impression",
  CLICK = "click",
  CONVERSION = "conversion",
  DISMISS = "dismiss",
}

@Entity("ad_impressions")
@Index(["userId", "promotionId", "eventType"])
@Index(["promotionId", "eventType", "createdAt"])
@Index(["userId", "promotionId", "createdAt"])
export class AdImpressionEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  userId: string;

  @Column()
  promotionId: string;

  @Column({
    type: "enum",
    enum: AdEventType,
  })
  eventType: AdEventType;

  @Column({
    type: "enum",
    enum: AdPlacement,
    nullable: true,
  })
  placement: AdPlacement;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
