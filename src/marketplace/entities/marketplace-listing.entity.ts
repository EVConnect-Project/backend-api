import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { UserEntity } from "../../users/entities/user.entity";
import { MarketplaceImage } from "./marketplace-image.entity";

@Entity("marketplace_listings")
export class MarketplaceListing {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  title: string;

  @Column("text")
  description: string;

  @Column()
  category: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  price: number;

  @Column({
    type: "enum",
    enum: ["new", "used"],
  })
  condition: string;

  @Column({ nullable: true })
  city: string;

  @Column({ type: "float", nullable: true })
  lat: number;

  @Column({ type: "float", nullable: true })
  long: number;

  @Column({ name: "sellerId" })
  sellerId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "sellerId" })
  seller: UserEntity;

  @Column({
    type: "enum",
    enum: ["pending", "approved", "rejected", "sold"],
    default: "pending",
  })
  status: string;

  @Column({ type: "text", nullable: true })
  adminNotes: string | null;

  @Column({ default: false })
  isBanned: boolean;

  @OneToMany(() => MarketplaceImage, (image) => image.listing)
  images: MarketplaceImage[];

  @CreateDateColumn()
  createdAt: Date;
}
