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

    // El controlador llama al servicio para obtener la sugerencia
    const suggestion = await this.aiService.generateCompletion(body.codeContext);

    // Formato de respuesta que el frontend consumirá
    return { suggestion: suggestion };
  }
}
