import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AppLayoutComponent } from './app-layout.component';

class AuthServiceStub {
  getUser() {
    return { id: '1', email: 'admin@exemplo.com', admin: true };
  }

  isAdmin() {
    return true;
  }

  async logout() {}
}

describe('AppLayoutComponent', () => {
  let fixture: ComponentFixture<AppLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppLayoutComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: new AuthServiceStub() }],
    }).compileComponents();

    fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.detectChanges();
  });

  it('renders sidebar and content outlet', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-sidebar')).toBeTruthy();
    expect(element.querySelector('router-outlet')).toBeTruthy();
  });
});
