import { outputBinding, provideZonelessChangeDetection, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { EditorView } from '@codemirror/view';
import type { SupportedLanguage } from '../code-mirror/config';
import { Collaboration } from './collaboration';
import { Editor } from './editor';
import { Manager } from './manager';

class MockProvider {
  synced = false;
  private listeners = new Map<string, Function[]>();
  once(event: string, callback: (isSynced: boolean) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }
  simulateSync() {
    this.synced = true;
    this.listeners.get('sync')?.forEach((cb) => cb(true));
    this.listeners.set('sync', []);
  }
}

describe('Editor', () => {
  let fixture: ComponentFixture<Editor>;
  let component: Editor;
  let mockManager: any;
  let mockCollaboration: any;
  let mockProvider: MockProvider;

  // ✅ Función helper para crear mocks frescos
  function createMockManager() {
    return {
      isEditorInitialized: false,
      initializeEditor: jasmine
        .createSpy('initializeEditor')
        .and.callFake(
          (parent: HTMLElement, config: any, content: string, extensions: any[], updateCallback: Function) => {
            mockManager.isEditorInitialized = true;
            return Promise.resolve({} as EditorView);
          }
        ),
      changeLanguage: jasmine.createSpy('changeLanguage'),
      changeTabSize: jasmine.createSpy('changeTabSize'),
      changeLineWrapping: jasmine.createSpy('changeLineWrapping'),
      reconfigureEditor: jasmine.createSpy('reconfigureEditor').and.returnValue(Promise.resolve()),
      getEditorContent: jasmine.createSpy('getEditorContent').and.returnValue('initial content'),
      getCursorPosition: jasmine.createSpy('getCursorPosition').and.returnValue(0),
      destroyEditor: jasmine.createSpy('destroyEditor'),
    };
  }

  function createMockCollaboration(provider: MockProvider) {
    return {
      initialize: jasmine.createSpy('initialize'),
      getProvider: jasmine.createSpy('getProvider').and.returnValue(provider),
      getCollaborationExtensions: jasmine.createSpy('getCollaborationExtensions').and.returnValue([]),
      getCurrentContent: jasmine.createSpy('getCurrentContent').and.returnValue('Initial Content'),
      disconnect: jasmine.createSpy('disconnect'),
      getMockProvider: () => provider,
    };
  }

  beforeEach(async () => {
    // ✅ Crea instancias frescas antes de cada test
    mockProvider = new MockProvider();
    mockManager = createMockManager();
    mockCollaboration = createMockCollaboration(mockProvider);

    await TestBed.configureTestingModule({
      imports: [Editor],
      providers: [
        provideZonelessChangeDetection(),
        { provide: Manager, useValue: mockManager },
        { provide: Collaboration, useValue: mockCollaboration },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Editor);
    component = fixture.componentInstance;

    // Set required input
    fixture.componentRef.setInput('roomId', 'TestRoom');
  });

  afterEach(() => {
    fixture.destroy();
  });

  // --- Initialization and Lifecycle Tests ---

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize Collaboration service with roomId on init', () => {
    // ✅ detectChanges dispara los effects
    fixture.detectChanges();

    // ✅ Espera a que se ejecute el effect de forma asíncrona
    fixture.whenStable().then(() => {
      expect(mockCollaboration.initialize).toHaveBeenCalledWith('TestRoom');
    });
  });

  it('should call collaboration.disconnect and manager.destroyEditor on ngOnDestroy', () => {
    fixture.detectChanges();
    component.ngOnDestroy();

    expect(mockCollaboration.disconnect).toHaveBeenCalled();
    expect(mockManager.destroyEditor).toHaveBeenCalled();
  });

  // --- Asynchronous Initialization Logic (Provider Sync) ---

  it('should initialize the CodeMirror editor immediately if the provider is already synced', async () => {
    // Set up provider to be synced
    mockProvider.synced = true;

    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockManager.initializeEditor).toHaveBeenCalled();
    expect(mockManager.isEditorInitialized).toBeTrue();
  });

  it('should wait for the provider sync event before initializing the editor when not synced', async () => {
    fixture.detectChanges();

    // Check that initializeEditor is NOT called immediately
    expect(mockManager.initializeEditor).not.toHaveBeenCalled();

    // Simulate the provider syncing
    mockProvider.simulateSync();
    await fixture.whenStable();

    expect(mockManager.initializeEditor).toHaveBeenCalled();
    expect(mockManager.isEditorInitialized).toBeTrue();
  });

  // --- Input Change Effects Tests (manager methods) ---

  it('should call manager.changeLanguage when the language input changes after initialization', async () => {
    mockManager.isEditorInitialized = true;
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentRef.setInput('language', 'python' as SupportedLanguage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockManager.changeLanguage).toHaveBeenCalledWith('python');
  });

  it('should call manager.changeTabSize when the tabSize input changes after initialization', async () => {
    mockManager.isEditorInitialized = true;
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentRef.setInput('tabSize', 4);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockManager.changeTabSize).toHaveBeenCalledWith(4);
  });

  it('should call manager.changeLineWrapping when the lineWrapping input changes after initialization', async () => {
    mockManager.isEditorInitialized = true;
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentRef.setInput('lineWrapping', true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockManager.changeLineWrapping).toHaveBeenCalledWith(true);
  });

  // --- Output Emission Tests (Using outputBinding helper) ---

  it('should emit contentChange and cursorPositionChange when handleEditorUpdate is called', async () => {
    const emittedContent = signal('');
    const emittedCursorPos = signal(0);

    // ✅ Crear mocks frescos para este test
    const testMockProvider = new MockProvider();
    const testMockManager = createMockManager();
    const testMockCollaboration = createMockCollaboration(testMockProvider);

    // ✅ Configurar los valores que queremos
    testMockManager.getEditorContent.and.returnValue('New Content Here');
    testMockManager.getCursorPosition.and.returnValue(100);

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Editor],
      providers: [
        provideZonelessChangeDetection(),
        { provide: Manager, useValue: testMockManager },
        { provide: Collaboration, useValue: testMockCollaboration },
      ],
    }).compileComponents();

    const outputFixture = TestBed.createComponent(Editor, {
      bindings: [
        outputBinding('contentChange', (content: string) => emittedContent.set(content)),
        outputBinding('cursorPositionChange', (pos: number) => emittedCursorPos.set(pos)),
      ],
    });

    outputFixture.componentRef.setInput('roomId', 'TestRoom');
    outputFixture.detectChanges();
    await outputFixture.whenStable();

    // Act: Call the update handler
    (outputFixture.componentInstance as any).handleEditorUpdate({} as EditorView);

    // Assert
    expect(emittedContent()).toBe('New Content Here');
    expect(emittedCursorPos()).toBe(100);

    outputFixture.destroy();
  });

  it('should emit editorReady output when the editor is initialized', async () => {
    const editorReadyEmitted = signal<boolean>(false);

    // ✅ Crear mocks frescos
    const testMockProvider = new MockProvider();
    testMockProvider.synced = true; // ✅ Pre-sincronizado
    const testMockManager = createMockManager();
    const testMockCollaboration = createMockCollaboration(testMockProvider);

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Editor],
      providers: [
        provideZonelessChangeDetection(),
        { provide: Manager, useValue: testMockManager },
        { provide: Collaboration, useValue: testMockCollaboration },
      ],
    }).compileComponents();

    const outputFixture = TestBed.createComponent(Editor, {
      bindings: [outputBinding('editorReady', () => editorReadyEmitted.set(true))],
    });

    outputFixture.componentRef.setInput('roomId', 'ReadyRoom');
    outputFixture.detectChanges();
    await outputFixture.whenStable();

    expect(testMockManager.initializeEditor).toHaveBeenCalled();
    expect(editorReadyEmitted()).toBeTrue();

    outputFixture.destroy();
  });

  // --- Method Tests ---

  it('should call mockManager.reconfigureEditor when changeLanguage is called', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const newLang = 'markdown';
    await component.changeLanguage(newLang);

    expect(component.currentLanguage()).toBe(newLang);
    expect(mockManager.reconfigureEditor).toHaveBeenCalledTimes(1);

    const configCall = mockManager.reconfigureEditor.calls.first().args[0];
    expect(configCall.language).toBe(newLang);
  });
});
