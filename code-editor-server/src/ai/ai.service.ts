import { GoogleGenAI } from "@google/genai";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CODE_COMPLETION_PROMPT } from "./prompts";

@Injectable()
export class AiService {
  private ai: GoogleGenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateCompletion(codeContext: string): Promise<string> {
    const model = "gemini-2.5-flash";

    const prompt = CODE_COMPLETION_PROMPT(codeContext);

    try {
      const response = await this.ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          maxOutputTokens: 50,
        },
      });

    
      if (!response.text) {
        return "";
      }

      return response.text.trim();
    } catch (error) {
      return '';
    }
  }
}
