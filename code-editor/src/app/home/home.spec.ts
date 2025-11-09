import { provideZonelessChangeDetection } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterLink } from '@angular/router';
import Home from './home';

describe('Home Component', () => {
  let fixture: ComponentFixture<Home>;
  let component: Home;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home, FormsModule, RouterLink],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);

    spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize createNewRoomId with a random string of length 8', () => {
    expect(component.createNewRoomId()).toMatch(/^[a-zA-Z0-9]{8}$/);
  });

  it('should return false for isValidRoomId when room ID is too short', () => {
    fixture.componentRef.setInput('joinRoomId', 'ab');
    fixture.detectChanges();

    expect(component.isValidRoomId()).toBeFalse();
  });

  it('should return true for isValidRoomId when room ID is valid', () => {
    fixture.componentRef.setInput('joinRoomId', 'abcde');
    fixture.detectChanges();

    expect(component.isValidRoomId()).toBeTrue();
  });

  it('should return true for isValidRoomId when room ID is valid but has whitespace', () => {
    fixture.componentRef.setInput('joinRoomId', '  validID ');
    fixture.detectChanges();
    expect(component.isValidRoomId()).toBeTrue();
  });

  it('should navigate to the editor with the trimmed room ID when joinRoom is called with a valid ID', () => {
    fixture.componentRef.setInput('joinRoomId', '  TestRoom123  ');
    fixture.detectChanges();

    component.joinRoom();
    expect(router.navigate).toHaveBeenCalledWith(['/editor', 'TestRoom123']);
  });

  it('should not navigate when joinRoom is called with an invalid ID', () => {
    fixture.componentRef.setInput('joinRoomId', 'hi');
    fixture.detectChanges();

    component.joinRoom();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should disable the Join Room button when input is invalid', () => {
    fixture.componentRef.setInput('joinRoomId', '12');
    fixture.detectChanges();

    const joinButton = fixture.debugElement.query(By.css('button'));

    expect(joinButton.nativeElement.disabled).toBeTrue();
    expect(joinButton.nativeElement.className).toContain('join-button-disabled');
  });

  it('should enable the Join Room button when input is valid', () => {
    fixture.componentRef.setInput('joinRoomId', 'ValidId456');
    fixture.detectChanges();

    const joinButton = fixture.debugElement.query(By.css('button'));

    expect(joinButton.nativeElement.disabled).toBeFalse();
    expect(joinButton.nativeElement.className).toContain('join-button-enabled');
  });

  it('should display the error message when input is short and present', () => {
    fixture.componentRef.setInput('joinRoomId', '1');
    fixture.detectChanges();

    const errorMessage = fixture.debugElement.query(By.css('.error-message'));

    expect(errorMessage).not.toBeNull();
    expect(errorMessage.nativeElement.textContent).toContain('Room ID must be at least 3 characters long.');
  });
});
