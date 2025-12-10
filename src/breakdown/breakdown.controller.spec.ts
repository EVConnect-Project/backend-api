import { Test, TestingModule } from '@nestjs/testing';
import { BreakdownController } from './breakdown.controller';

describe('BreakdownController', () => {
  let controller: BreakdownController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BreakdownController],
    }).compile();

    controller = module.get<BreakdownController>(BreakdownController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
