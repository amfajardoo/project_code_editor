import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { CompletionContext } from '@codemirror/autocomplete';
import { EditorState, Text } from '@codemirror/state';
import { Autocomplete } from './autocomplete';

describe('Autocomplete', () => {
  let service: Autocomplete;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    service = TestBed.inject(Autocomplete);

    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCompletionSource', () => {
    it('should return a CompletionSource function', () => {
      const completionSource = service.getCompletionSource();
      expect(typeof completionSource).toBe('function');
    });

    it('should return null if not explicit and no word match before cursor', async () => {
      const mockContext = createMockContext('hello  ', 7, false);
      const completionSource = service.getCompletionSource();

      const result = await completionSource(mockContext);

      expect(result).toBeNull();
    });

    it('should return null if not explicit and ends with space', async () => {
      const mockContext = createMockContext('const x = ', 10, false);
      const completionSource = service.getCompletionSource();

      const result = await completionSource(mockContext);

      expect(result).toBeNull();
    });

    it('should proceed with fetch if context is explicit', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ suggestion: 'test suggestion' }),
        } as Response)
      );

      const mockContext = createMockContext('const x = ', 10, true);
      const completionSource = service.getCompletionSource();

      const result = await completionSource(mockContext);

      expect(globalThis.fetch).toHaveBeenCalled();
      expect(result).not.toBeNull();
    });

    it('should proceed with fetch if there is a word match before cursor', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ suggestion: 'suggestion' }),
        } as Response)
      );

      const mockContext = createMockContext('const myVar', 11, false);
      const completionSource = service.getCompletionSource();

      const result = await completionSource(mockContext);

      expect(result).not.toBeNull();
      expect(globalThis.fetch).toHaveBeenCalled();
    });
  });

  describe('fetchGeminiSuggestion', () => {
    it('should make a POST request to the proxy URL with correct body', async () => {
      const mockFetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ suggestion: 'test' }),
        } as Response)
      );
      globalThis.fetch = mockFetch;

      const mockContext = createMockContext('const x = 5', 11, true);
      const completionSource = service.getCompletionSource();

      await completionSource(mockContext);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeContext: 'const x = 5' }),
      });
    });

    it('should return null and log error if response is not ok', async () => {
      spyOn(console, 'error');
      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: false,
          status: 500,
        } as Response)
      );

      const mockContext = createMockContext('test', 4, true);
      const completionSource = service.getCompletionSource();

      const result = await completionSource(mockContext);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('HTTP error! status: 500');
    });

    it('should return null if suggestion is empty', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ suggestion: '' }),
        } as Response)
      );

      const mockContext = createMockContext('test', 4, true);
      const completionSource = service.getCompletionSource();

      const result = await completionSource(mockContext);

      expect(result).toBeNull();
    });

    it('should return null if suggestion is not provided', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response)
      );

      const mockContext = createMockContext('test', 4, true);
      const completionSource = service.getCompletionSource();

      const result = await completionSource(mockContext);

      expect(result).toBeNull();
    });

    it('should return completion with full label if suggestion is short', async () => {
      const shortSuggestion = 'short';
      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ suggestion: shortSuggestion }),
        } as Response)
      );

      const mockContext = createMockContext('test', 4, true);
      const completionSource = service.getCompletionSource();

      const result = await completionSource(mockContext);

      expect(result).not.toBeNull();
      expect(result!.options[0].label).toBe(shortSuggestion);
      expect(result!.options[0].apply).toBe(shortSuggestion);
    });

    it('should truncate label if suggestion is longer than 50 characters', async () => {
      const longSuggestion = 'a'.repeat(60);
      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ suggestion: longSuggestion }),
        } as Response)
      );

      const mockContext = createMockContext('test', 4, true);
      const completionSource = service.getCompletionSource();

      const result = await completionSource(mockContext);

      expect(result).not.toBeNull();
      expect(result!.options[0].label).toBe('a'.repeat(50) + '...');
      expect(result!.options[0].apply).toBe(longSuggestion);
    });

    it('should return completion with correct metadata', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ suggestion: 'test suggestion' }),
        } as Response)
      );

      const mockContext = createMockContext('const x', 7, true);
      const completionSource = service.getCompletionSource();

      const result = await completionSource(mockContext);

      expect(result).not.toBeNull();
      expect(result!.from).toBe(7);
      expect(result!.options.length).toBe(1);
      expect(result!.options[0].detail).toBe('Gemini AI Completion');
      expect(result!.options[0].info).toBe('Suggestion provided by Gemini AI');
      expect(result!.options[0].type).toBe('keyword');
    });

    it('should return null and log error if fetch throws an exception', async () => {
      spyOn(console, 'error');
      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(Promise.reject(new Error('Network error')));

      const mockContext = createMockContext('test', 4, true);
      const completionSource = service.getCompletionSource();

      const result = await completionSource(mockContext);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error trying to fetch Gemini:', jasmine.any(Error));
    });

    it('should pass correct text before cursor to API', async () => {
      const mockFetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ suggestion: 'test' }),
        } as Response)
      );
      globalThis.fetch = mockFetch;

      const fullText = 'function test() {\n  const x = 5;\n  return';
      const cursorPosition = fullText.length;
      const mockContext = createMockContext(fullText, cursorPosition, true);
      const completionSource = service.getCompletionSource();

      await completionSource(mockContext);

      const callArgs = mockFetch.calls.first().args;
      const body = JSON.parse(callArgs[1].body);
      expect(body.codeContext).toBe(fullText);
    });
  });
});

function createMockContext(text: string, pos: number, explicit: boolean): CompletionContext {
  const doc = Text.of([text]);
  const state = EditorState.create({ doc });

  return {
    state,
    pos,
    explicit,
    matchBefore: (regex: RegExp) => {
      const textBefore = text.slice(0, pos);
      const match = textBefore.match(regex);
      if (match && match.index !== undefined) {
        return {
          from: match.index,
          to: pos,
          text: match[0],
        };
      }
      return null;
    },
    aborted: false,
    addEventListener: () => {},
    tokenBefore: (types: string[]) => null,
  } as CompletionContext;
}
