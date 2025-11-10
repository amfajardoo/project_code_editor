import { GoogleGenAI } from "@google/genai";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CODE_COMPLETION_PROMPT } from "./prompts";

@Injectable()
export class AiService {
  /**
   * The GoogleGenAI instance used for interacting with the Gemini API.
   * @private
   */
  private ai: GoogleGenAI;

  /**
   * @constructor
   * @param {ConfigService} configService - The configuration service used to retrieve the API key.
   * @throws {Error} If the GEMINI_API_KEY is not defined in the configuration.
   */
  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Generates a code completion suggestion using the Gemini API.
   * @param {string} codeContext - The context or partial code snippet to use for generation.
   * @returns {Promise<string>} A promise that resolves to the generated completion text, or an empty string on error or if no text is returned.
   */
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
