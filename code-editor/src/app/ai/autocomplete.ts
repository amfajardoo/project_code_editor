import { Injectable } from '@angular/core';
import type { Completion, CompletionContext, CompletionSource } from '@codemirror/autocomplete';

const GEMINI_PROXY_URL = 'http://localhost:3000/api/complete';

@Injectable({
  providedIn: 'root',
})
export class Autocomplete {
  /**
   * Returns a CodeMirror `CompletionSource` function used for providing code suggestions.
   *
   * This source function determines if an autocompletion should be triggered and, if so,
   * calls an asynchronous method to fetch suggestions from a service (like Gemini).
   *
   * **Trigger Logic:**
   * 1. If the autocompletion is **not explicit** (e.g., triggered by typing) AND the text
   * immediately before the cursor does not match a word boundary (`/\w+$/`), it returns
   * `null` immediately to prevent unwanted suggestions (e.g., when typing whitespace).
   * 2. Otherwise (if it's explicit or matches a word), it slices the document text up to
   * the current cursor position (`pos`) and passes this context to `fetchGeminiSuggestion`
   * to get completions.
   *
   * @returns A `CompletionSource` function that takes a `CompletionContext` and returns
   * a promise for `CompletionResult` or `null`.
   */
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

  /**
   * Asynchronously fetches a code completion suggestion from the Gemini AI proxy service.
   *
   * It sends the current code context up to the cursor position to the backend service
   * and processes the received suggestion into a CodeMirror `Completion` object.
   *
   * @private
   * @param codeContext - The string containing the code immediately preceding the cursor position.
   * @param position - The current position (offset) in the document, used as the 'from' point for the completion insertion.
   * @returns A promise that resolves to a `CompletionResult` object containing the start position
   * and the suggestion options, or `null` if the request fails or no suggestion is received.
   */
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
    } catch (_error) {
      return null;
    }
  }
}
