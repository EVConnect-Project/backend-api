import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Charger } from "../../charger/entities/charger.entity";

@Entity("stations")
export class Station {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column({ type: "decimal", precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: "decimal", precision: 10, scale: 7 })
  longitude: number;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ type: "decimal", precision: 6, scale: 2 })
  power: number;

  @Column({ type: "decimal", precision: 8, scale: 4 })
  price: number;

  @OneToMany(() => Charger, (charger) => charger.station)
  chargers: Charger[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
