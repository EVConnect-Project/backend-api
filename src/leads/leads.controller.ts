import { Controller, Post, Body, Get, Patch, Param } from "@nestjs/common";
import { LeadsService } from "./leads.service";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { LeadType, LeadStatus } from "./entities/lead.entity";

@Controller("leads")
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  async findAll() {
    return this.leadsService.findAll();
  }

  @Patch(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body("status") status: LeadStatus,
  ) {
    return this.leadsService.updateStatus(id, status);
  }

  @Post("contact")
  async createContact(@Body() createLeadDto: CreateLeadDto) {
    createLeadDto.type = LeadType.CONTACT;
    return this.leadsService.create(createLeadDto);
  }

  @Post("partner")
  async createPartner(@Body() createLeadDto: CreateLeadDto) {
    createLeadDto.type = LeadType.PARTNER;
    return this.leadsService.create(createLeadDto);
  }

  @Post("mechanic")
  async createMechanic(@Body() createLeadDto: CreateLeadDto) {
    createLeadDto.type = LeadType.MECHANIC;
    return this.leadsService.create(createLeadDto);
  }
}
