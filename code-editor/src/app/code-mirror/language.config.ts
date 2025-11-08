import { LanguageDescription } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import type { Extension } from '@codemirror/state';

/**
 * Loads and returns a CodeMirror language extension for the given language name.
 *
 * Attempts to match the provided language name against the available languages and,
 * if a match is found, dynamically loads and returns the corresponding language
 * Extension by calling the matched language's `load()` method.
 *
 * If no matching language is found, a warning is written to the console and the
 * function resolves to `null`.
 *
 * @param languageName - The human-readable name or identifier of the language to load.
 * @returns A Promise that resolves to the loaded `Extension`, or `null` if the language
 *          could not be found. Note that the returned promise may reject if the
 *          dynamic loading performed by `load()` fails.
 *
 * @remarks
 * - This function delegates language matching to `LanguageDescription.matchLanguageName`.
 * - A missing language does not throw; it results in a `null` return value with a console warning.
 *
 * @example
 * ```ts
 * const ext = await getLanguageExtension('javascript');
 * if (ext) {
 *   // attach `ext` to an EditorState/EditorView
 * }
 * ```
 */
export async function getLanguageExtension(languageName: string): Promise<Extension | null> {
  const language = LanguageDescription.matchLanguageName(languages, languageName);

  if (!language) {
    console.warn(`Language "${languageName}" not found`);
    return null;
  }

  return await language.load();
}
