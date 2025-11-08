import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';

interface CodeContextDto {
  codeContext: string;
}

@Controller('api/complete')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post()
  async getCompletion(@Body() body: CodeContextDto) {
    if (!body.codeContext) {
      return { suggestion: '' };
    }

    const suggestion = await this.aiService.generateCompletion(body.codeContext);

    return { suggestion };
  }
}
