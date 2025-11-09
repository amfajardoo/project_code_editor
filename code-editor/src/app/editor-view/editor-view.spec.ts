import { ClipboardModule } from '@angular/cdk/clipboard';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { Collaboration } from '../editor/collaboration';
import EditorView from './editor-view';

const mockUserInfo = signal({ id: 'user-123', name: 'TestUser', color: 'red' });
const mockConnectedUsers = signal([
  { id: 'user-123', name: 'TestUser', color: 'red' },
  { id: 'user-456', name: 'UserB', color: 'blue' },
]);

const mockCollaborationService = {
  userInfo: mockUserInfo,
  connectedUsers: mockConnectedUsers,
  disconnect: jasmine.createSpy('disconnect'),
  initialize: jasmine.createSpy('initialize'),
  getProvider: jasmine.createSpy('getProvider'),
};

describe('EditorView Component', () => {
  let fixture: ComponentFixture<EditorView>;
  let component: EditorView;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorView, ClipboardModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: Collaboration, useValue: mockCollaborationService },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditorView);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);

    spyOn(router, 'navigate');
    fixture.componentRef.setInput('roomId', 'TEST-ROOM-ID');
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();

    if (router.navigate) {
      (router.navigate as jasmine.Spy).calls.reset();
    }

    mockUserInfo.set({ id: 'user-123', name: 'TestUser', color: 'red' });
    mockConnectedUsers.set([
      { id: 'user-123', name: 'TestUser', color: 'red' },
      { id: 'user-456', name: 'UserB', color: 'blue' },
    ]);
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize signals correctly', () => {
    expect(component.currentLanguage()).toBe('typescript');
    expect(component.cursorPosition()).toBe(0);
    expect(component.content()).toBe('');
    expect(component.copied()).toBeFalse();
  });

  it('should expose Collaboration service signals', () => {
    expect(component.userInfo()).toEqual(mockUserInfo());
    expect(component.connectedUsers().length).toBe(2);
  });

  it('should calculate contentLength correctly', () => {
    component.onContentChange('Hello world');
    fixture.detectChanges();

    expect(component.contentLength()).toBe(11);
  });

  it('should calculate lineCount correctly for single line', () => {
    component.onContentChange('Single line of code');
    fixture.detectChanges();

    expect(component.lineCount()).toBe(1);
  });

  it('should calculate lineCount correctly for multiple lines', () => {
    component.onContentChange('Line 1\nLine 2\nLine 3');
    fixture.detectChanges();

    expect(component.lineCount()).toBe(3);
  });

  it('should update content signal when onContentChange is called', () => {
    const newContent = 'function test() {}';
    component.onContentChange(newContent);

    expect(component.content()).toBe(newContent);
    expect(component.contentLength()).toBe(newContent.length);
  });

  it('should update cursorPosition signal when onCursorChange is called', () => {
    component.onCursorChange(42);

    expect(component.cursorPosition()).toBe(42);
  });

  it('should update currentLanguage signal when onLanguageChange is called', () => {
    const mockEvent = {
      target: { value: 'python' },
    } as unknown as Event;
    component.onLanguageChange(mockEvent);

    expect(component.currentLanguage()).toBe('python');
  });

  it('should navigate to home path when goToHome is called', () => {
    component.goToHome();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should render the roomId input value in the header', () => {
    const roomIdElement = fixture.debugElement.query(By.css('.room-id-value'));

    expect(roomIdElement.nativeElement.textContent).toContain('TEST-ROOM-ID');
  });

  it('should render connection status signals correctly', () => {
    const statusText = fixture.debugElement.query(By.css('.status'));
    component.onContentChange('A\nB');
    component.onCursorChange(10);
    fixture.detectChanges();

    expect(statusText.nativeElement.textContent).toContain('Characters: 3');
    expect(statusText.nativeElement.textContent).toContain('Lines: 2');
    expect(statusText.nativeElement.textContent).toContain('Cursor: 10');
  });

  it('should render connected user count and list', () => {
    const userCountElement = fixture.debugElement.query(By.css('.connected-users h4'));
    const userListElements = fixture.debugElement.queryAll(By.css('.connected-users ul li'));

    expect(userCountElement.nativeElement.textContent).toContain('Users in this room (2):');
    expect(userListElements.length).toBe(2);
    expect(userListElements[0].nativeElement.textContent).toBe('TestUser');
    expect(userListElements[1].nativeElement.textContent).toBe('UserB');
  });

  it('should call goToHome when "Back to Home" button is clicked', () => {
    const homeButton = fixture.debugElement.query(By.css('.home-button'));
    homeButton.triggerEventHandler('click');

    expect(router.navigate).toHaveBeenCalledTimes(1);
  });

  it('should update copied status when cdkCopyToClipboardCopied event is emitted', () => {
    const roomStatusDiv = fixture.debugElement.query(By.css('.room-status'));
    roomStatusDiv.triggerEventHandler('cdkCopyToClipboardCopied');
    fixture.detectChanges();

    const copyStatus = fixture.debugElement.query(By.css('.copy-room-id small'));

    expect(component.copied()).toBeTrue();
    expect(copyStatus.nativeElement.textContent).toBe('Copied');
  });

  it('should update currentLanguage when the select element changes', () => {
    const languageSelect = fixture.debugElement.query(By.css('#language-options'));

    languageSelect.nativeElement.value = 'python';
    languageSelect.nativeElement.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(component.currentLanguage()).toBe('python');
  });
});
