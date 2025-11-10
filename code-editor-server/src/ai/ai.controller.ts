import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';

interface CodeContextDto {
  codeContext: string;
}

@Controller('api/complete')
export class AiController {
  /**
   * @constructor
   * @param {AiService} aiService - The service responsible for handling AI interactions.
   */
  constructor(private readonly aiService: AiService) {}

  /**
   * Handles POST requests to generate a code completion suggestion.
   *
   * @param {CodeContextDto} body - The request body containing the code context.
   * @param {string} body.codeContext - The code snippet or context for which to generate a suggestion.
   * @returns {Promise<{suggestion: string}>} A promise that resolves to an object containing the generated code suggestion.
   * @async
   */
  @Post()
  async getCompletion(@Body() body: CodeContextDto) {
    if (!body.codeContext) {
      return { suggestion: '' };
    }

    const suggestion = await this.aiService.generateCompletion(body.codeContext);

    return { suggestion };
  }
}
