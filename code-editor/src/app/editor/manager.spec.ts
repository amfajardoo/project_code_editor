import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { CodeMirrorSetup } from '../code-mirror/code-mirror-setup';
import type { EditorConfig, SupportedLanguage } from '../code-mirror/config';
import { Manager } from './manager';

class MockCodeMirrorSetup {
  private mockEditorState = {} as EditorState;
  private mockEditorView = {} as EditorView;

  createEditorState = jasmine.createSpy('createEditorState').and.returnValue(Promise.resolve(this.mockEditorState));
  createEditorView = jasmine.createSpy('createEditorView').and.returnValue(this.mockEditorView);
  reconfigureEditor = jasmine.createSpy('reconfigureEditor').and.returnValue(Promise.resolve());
  getEditorContent = jasmine.createSpy('getEditorContent').and.returnValue('mock content');
  getCursorPosition = jasmine.createSpy('getCursorPosition').and.returnValue(10);
  changeLanguage = jasmine.createSpy('changeLanguage');
  changeTabSize = jasmine.createSpy('changeTabSize');
  changeLineWrapping = jasmine.createSpy('changeLineWrapping');
  destroyEditor = jasmine.createSpy('destroyEditor');
}

describe('Manager', () => {
  let manager: Manager;
  let mockCodeMirrorSetup: MockCodeMirrorSetup;
  const mockParent = document.createElement('div');
  const mockConfig: Partial<EditorConfig> = { language: 'typescript' };
  const initialContent = 'console.log("hello")';
  const updateCallback = jasmine.createSpy('updateCallback');

  beforeEach(() => {
    mockCodeMirrorSetup = new MockCodeMirrorSetup();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        Manager,
        { provide: CodeMirrorSetup, useValue: mockCodeMirrorSetup },
      ],
    });

    manager = TestBed.inject(Manager);

    mockCodeMirrorSetup.createEditorState.calls.reset();
    mockCodeMirrorSetup.createEditorView.calls.reset();
    mockCodeMirrorSetup.reconfigureEditor.calls.reset();
    mockCodeMirrorSetup.getEditorContent.calls.reset();
    mockCodeMirrorSetup.getCursorPosition.calls.reset();
    mockCodeMirrorSetup.changeLanguage.calls.reset();
    mockCodeMirrorSetup.changeTabSize.calls.reset();
    mockCodeMirrorSetup.changeLineWrapping.calls.reset();
    mockCodeMirrorSetup.destroyEditor.calls.reset();
  });

  it('should start with isEditorInitialized as false', () => {
    expect(manager.isEditorInitialized).toBeFalse();
  });

  it('should initialize the editor and set the internal state', async () => {
    const view = await manager.initializeEditor(mockParent, mockConfig, initialContent, [], updateCallback);

    expect(mockCodeMirrorSetup.createEditorState).toHaveBeenCalledWith(mockConfig, initialContent);
    expect(mockCodeMirrorSetup.createEditorView).toHaveBeenCalledWith(mockParent, jasmine.any(Object), updateCallback);
    expect(manager.isEditorInitialized).toBeTrue();
    expect(view).toBe(mockCodeMirrorSetup.createEditorView.calls.mostRecent().returnValue);
  });

  it('should destroy the editor and reset internal state', async () => {
    await manager.initializeEditor(mockParent, mockConfig, initialContent, [], updateCallback);
    expect(manager.isEditorInitialized).toBeTrue();

    manager.destroyEditor();

    const mockView = mockCodeMirrorSetup.createEditorView.calls.mostRecent().returnValue;
    expect(mockCodeMirrorSetup.destroyEditor).toHaveBeenCalledWith(mockView);
    expect(manager.isEditorInitialized).toBeFalse();

    mockCodeMirrorSetup.destroyEditor.calls.reset();
    manager.destroyEditor();
    expect(mockCodeMirrorSetup.destroyEditor).not.toHaveBeenCalled();
  });

  it('should return content from CodeMirrorSetup when editor is initialized', async () => {
    mockCodeMirrorSetup.getEditorContent.and.returnValue('New Code');
    await manager.initializeEditor(mockParent, mockConfig, initialContent, [], updateCallback);

    const content = manager.getEditorContent();
    expect(content).toBe('New Code');
    expect(mockCodeMirrorSetup.getEditorContent).toHaveBeenCalledTimes(1);
  });

  it('should return undefined for content when editor is not initialized', () => {
    expect(manager.getEditorContent()).toBeUndefined();
    expect(mockCodeMirrorSetup.getEditorContent).not.toHaveBeenCalled();
  });

  it('should return cursor position from CodeMirrorSetup when editor is initialized', async () => {
    mockCodeMirrorSetup.getCursorPosition.and.returnValue(55);
    await manager.initializeEditor(mockParent, mockConfig, initialContent, [], updateCallback);

    const position = manager.getCursorPosition();
    expect(position).toBe(55);
    expect(mockCodeMirrorSetup.getCursorPosition).toHaveBeenCalledTimes(1);
  });

  it('should return undefined for cursor position when editor is not initialized', () => {
    expect(manager.getCursorPosition()).toBeUndefined();
    expect(mockCodeMirrorSetup.getCursorPosition).not.toHaveBeenCalled();
  });

  it('should call reconfigureEditor on CodeMirrorSetup when editor is initialized', async () => {
    await manager.initializeEditor(mockParent, mockConfig, initialContent, [], updateCallback);
    const newConfig: Partial<EditorConfig> = { language: 'python' };
    await manager.reconfigureEditor(newConfig);

    const mockView = mockCodeMirrorSetup.createEditorView.calls.mostRecent().returnValue;
    expect(mockCodeMirrorSetup.reconfigureEditor).toHaveBeenCalledWith(mockView, newConfig);
  });

  it('should NOT call reconfigureEditor on CodeMirrorSetup when editor is NOT initialized', async () => {
    const newConfig: Partial<EditorConfig> = { language: 'python' };
    await manager.reconfigureEditor(newConfig);
    expect(mockCodeMirrorSetup.reconfigureEditor).not.toHaveBeenCalled();
  });

  it('should call changeTabSize on CodeMirrorSetup', async () => {
    await manager.initializeEditor(mockParent, mockConfig, initialContent, [], updateCallback);
    manager.changeTabSize(4);

    const mockView = mockCodeMirrorSetup.createEditorView.calls.mostRecent().returnValue;
    expect(mockCodeMirrorSetup.changeTabSize).toHaveBeenCalledWith(mockView, 4);
  });

  it('should call changeLineWrapping on CodeMirrorSetup', async () => {
    await manager.initializeEditor(mockParent, mockConfig, initialContent, [], updateCallback);
    manager.changeLineWrapping(true);

    const mockView = mockCodeMirrorSetup.createEditorView.calls.mostRecent().returnValue;
    expect(mockCodeMirrorSetup.changeLineWrapping).toHaveBeenCalledWith(mockView, true);
  });

  it('should call destroyEditor when language changes and editor is initialized', async () => {
    await manager.initializeEditor(mockParent, mockConfig, initialContent, [], updateCallback);

    const mockView = mockCodeMirrorSetup.createEditorView.calls.mostRecent().returnValue;

    mockCodeMirrorSetup.destroyEditor.calls.reset();
    mockCodeMirrorSetup.changeLanguage.calls.reset();

    const newLang = 'json' as SupportedLanguage;
    manager.changeLanguage(newLang);

    expect(mockCodeMirrorSetup.destroyEditor).toHaveBeenCalledTimes(1);
    expect(mockCodeMirrorSetup.destroyEditor).toHaveBeenCalledWith(mockView);
    expect(mockCodeMirrorSetup.changeLanguage).not.toHaveBeenCalled();

    expect(manager.isEditorInitialized).toBeFalse();
  });

  it('should not call any methods when editor is NOT initialized', () => {
    manager.changeLanguage('markdown' as SupportedLanguage);

    expect(mockCodeMirrorSetup.destroyEditor).not.toHaveBeenCalled();
    expect(mockCodeMirrorSetup.changeLanguage).not.toHaveBeenCalled();
    expect(manager.isEditorInitialized).toBeFalse();
  });
});
