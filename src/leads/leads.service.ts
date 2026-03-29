import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './entities/lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadsRepository: Repository<Lead>,
  ) {}

  async create(createLeadDto: CreateLeadDto): Promise<Lead> {
    const lead = this.leadsRepository.create(createLeadDto);
    return await this.leadsRepository.save(lead);
  }

  async findAll(): Promise<Lead[]> {
    return await this.leadsRepository.find({
      order: {
        createdAt: 'DESC'
      }
    });
  }

  async updateStatus(id: string, status: any): Promise<Lead> {
    const lead = await this.leadsRepository.findOne({ where: { id } });
    if (!lead) {
      throw new Error('Lead not found');
    }
    lead.status = status;
    return await this.leadsRepository.save(lead);
  }
}
