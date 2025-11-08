import { Injectable } from '@angular/core';
import type { Completion, CompletionContext, CompletionSource } from '@codemirror/autocomplete';

const GEMINI_PROXY_URL = 'http://localhost:3000/api/complete';

@Injectable({
  providedIn: 'root',
})
export class Autocomplete {
  getCompletionSource(): CompletionSource {
    return (context: CompletionContext) => {
      if (!context.explicit && context.matchBefore(/\w+$/) === null) {
        return Promise.resolve(null);
      }

      const { state, pos } = context;
      const textBeforeCursor = state.doc.sliceString(0, pos);

      return this.fetchGeminiSuggestion(textBeforeCursor, pos);
    };
  }

  private async fetchGeminiSuggestion(
    codeContext: string,
    position: number
  ): Promise<{ from: number; options: Completion[] } | null> {
    try {
      const response = await fetch(GEMINI_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeContext }),
      });

      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const suggestionText: string = data.suggestion || '';

      if (!suggestionText) return null;

      const suggestion: Completion = {
        label: suggestionText.length > 50 ? `${suggestionText.substring(0, 50)}...` : suggestionText,
        detail: 'Gemini AI Completion',
        info: 'Suggestion provided by Gemini AI',
        apply: suggestionText,
        type: 'keyword',
      };

      return {
        from: position,
        options: [suggestion],
      };
    } catch (error) {
      console.error('Error trying to fetch Gemini:', error);
      return null;
    }
  }
}
