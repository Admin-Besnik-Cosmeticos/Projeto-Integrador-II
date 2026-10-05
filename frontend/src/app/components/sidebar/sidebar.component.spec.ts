import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from './sidebar.component';

class AuthServiceStub {
  logoutCalls = 0;
  user = { id: '1', email: 'admin@exemplo.com', admin: true };

  getUser() {
    return this.user;
  }

  isAdmin() {
    return this.user.admin;
  }

  async logout() {
    this.logoutCalls++;
  }
}

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let authStub: AuthServiceStub;
  let router: Router;

  beforeEach(async () => {
    authStub = new AuthServiceStub();

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('creates and shows navigation items', () => {
    const links = Array.from(fixture.nativeElement.querySelectorAll('.sidebar__link')) as HTMLAnchorElement[];
    expect(links.map((link) => link.textContent?.trim())).toEqual(['Dashboard', 'Produtos', 'Clientes', 'Pedidos']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/dashboard',
      '/produtos',
      '/clientes',
      '/pedidos',
    ]);
  });

  it('shows authenticated user and links to settings', () => {
    const user = fixture.nativeElement.querySelector('.sidebar__user') as HTMLAnchorElement;
    expect(user.getAttribute('href')).toBe('/configuracoes');
    expect(fixture.nativeElement.textContent).toContain('admin');
    expect(fixture.nativeElement.textContent).toContain('Administrador');
  });

  it('logs out and redirects to login after logout animation', async () => {
    vi.useFakeTimers();
    const button = fixture.nativeElement.querySelector('.sidebar__logout') as HTMLButtonElement;
    button.click();

    await Promise.resolve();
    fixture.detectChanges();
    expect(authStub.logoutCalls).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Encerrando sessão...');

    vi.advanceTimersByTime(800);
    await Promise.resolve();
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    vi.useRealTimers();
  });
});
