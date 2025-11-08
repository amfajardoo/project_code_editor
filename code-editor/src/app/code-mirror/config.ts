import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { EditorState, type Extension } from '@codemirror/state';
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';

export type SupportedLanguage = string;

export interface CursorPosition {
  line: number;
  column: number;
  pos: number;
}

export interface EditorConfig {
  language: SupportedLanguage;
  lineNumbers: boolean;
  lineWrapping: boolean;
  highlightActiveLine: boolean;
  tabSize: number;
  extensions?: Extension[];
}

export interface CompletionContext {
  code: string;
  cursorPosition: number;
  lineContext: string;
  prefix: string;
}

/**
 * Returns a ready-to-use array of CodeMirror extensions that provide a comprehensive
 * "basic setup" for a code editor instance.
 *
 * The collection includes common UI and editing features such as:
 * - Line numbers and a folding gutter
 * - Visual replacements for non-printable characters
 * - Undo/redo history
 * - Custom draw/selection and drop cursor behavior
 * - Multiple cursors/selections support
 * - Automatic indentation on input
 * - Syntax highlighting with a default style
 * - Bracket matching and automatic bracket closing
 * - Autocompletion support
 * - Rectangular selection and an alt-mode crosshair cursor
 * - Active line and active gutter highlighting
 * - Highlighting matches of the selected text
 * - A composed keymap that merges close-brackets, default, search, history,
 *   folding, completion, and linter bindings
 *
 * This function takes no parameters and returns an Extension[] suitable for
 * passing directly to an EditorState or EditorView configuration when creating
 * a new editor.
 *
 * @returns An array of CodeMirror Extension objects representing the basic editor setup.
 *
 * @remarks
 * The returned set is opinionated but covers most needs for a typical code
 * editor. Consumers can spread or concatenate its result with additional
 * extensions (language support, themes, custom behaviors) to customize the editor.
 *
 * @example
 * // Example usage:
 * // const state = EditorState.create({ doc: initialText, extensions: basicSetupExtensions() });
 */
export function basicSetupExtensions(): Extension[] {
  return [
    // A line number gutter
    lineNumbers(),
    // A gutter with code folding markers
    foldGutter(),
    // Replace non-printable characters with placeholders
    highlightSpecialChars(),
    // The undo history
    history(),
    // Replace native cursor/selection with our own
    drawSelection(),
    // Show a drop cursor when dragging over the editor
    dropCursor(),
    // Allow multiple cursors/selections
    EditorState.allowMultipleSelections.of(true),
    // Re-indent lines when typing specific input
    indentOnInput(),
    // Highlight syntax with a default style
    syntaxHighlighting(defaultHighlightStyle),
    // Highlight matching brackets near cursor
    bracketMatching(),
    // Automatically close brackets
    closeBrackets(),
    // Load the autocompletion system
    autocompletion(),
    // Allow alt-drag to select rectangular regions
    rectangularSelection(),
    // Change the cursor to a crosshair when holding alt
    crosshairCursor(),
    // Style the current line specially
    highlightActiveLine(),
    // Style the gutter for current line specially
    highlightActiveLineGutter(),
    // Highlight text that matches the selected text
    highlightSelectionMatches(),
    keymap.of([
      // Closed-brackets aware backspace
      ...closeBracketsKeymap,
      // A large set of basic bindings
      ...defaultKeymap,
      // Search-related keys
      ...searchKeymap,
      // Redo/undo keys
      ...historyKeymap,
      // Code folding bindings
      ...foldKeymap,
      // Autocompletion keys
      ...completionKeymap,
      // Keys related to the linter system
      ...lintKeymap,
    ]),
  ];
}

/**
 * Creates a CodeMirror extension that configures the editor's tab width.
 *
 * @param size - The number of spaces a tab character should occupy. Defaults to 2.
 *               Should be a positive integer; non-positive or non-integer values
 *               may produce unexpected behavior.
 * @returns An Extension that sets EditorState.tabSize to the provided value.
 */
export const tabSizeConfig = (size: number = 2): Extension => {
  return EditorState.tabSize.of(size);
};

/**
 * Returns a CodeMirror extension that enables soft line wrapping in the editor.
 *
 * This helper abstracts the direct usage of `EditorView.lineWrapping` and provides
 * a ready-to-use `Extension` suitable for inclusion in the editor's extensions array.
 *
 * @returns An `Extension` that enables line wrapping for long lines in the editor view.
 *
 * @example
 * // Include in your editor setup:
 * // const extensions = [lineWrappingConfig(), otherExtensions...];
 *
 * @see EditorView.lineWrapping
 */
export const lineWrappingConfig = (): Extension => {
  return EditorView.lineWrapping;
};
