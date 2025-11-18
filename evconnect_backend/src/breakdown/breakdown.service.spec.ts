import { Test, TestingModule } from '@nestjs/testing';
import { BreakdownService } from './breakdown.service';

describe('BreakdownService', () => {
  let service: BreakdownService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BreakdownService],
    }).compile();

    service = module.get<BreakdownService>(BreakdownService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
