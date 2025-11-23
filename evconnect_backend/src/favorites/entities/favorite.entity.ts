import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { Charger } from '../../charger/entities/charger.entity';

@Entity('favorite_chargers')
export class FavoriteCharger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column('uuid')
  chargerId: string;

  @ManyToOne(() => Charger, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chargerId' })
  charger: Charger;

  @CreateDateColumn()
  addedAt: Date;
}
