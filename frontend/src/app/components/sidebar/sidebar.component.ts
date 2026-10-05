import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface NavigationItem {
  label: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.authService.getUser();
  protected readonly userName = this.user?.email?.split('@')[0] ?? 'Usuário';
  protected readonly userRole = this.authService.isAdmin() ? 'Administrador' : 'Usuário';

  protected readonly items: NavigationItem[] = [
    { label: 'Dashboard', route: '/dashboard', exact: true },
    { label: 'Produtos', route: '/produtos', exact: true },
    { label: 'Clientes', route: '/clientes', exact: true },
    { label: 'Pedidos', route: '/pedidos', exact: true },
  ];

  protected readonly loggingOut = signal(false);

  protected async logout(): Promise<void> {
    if (this.loggingOut()) {
      return;
    }

    this.loggingOut.set(true);

    try {
      await this.authService.logout();
    } catch {
      // AuthService clears the local session even when the backend call fails.
    } finally {
      await new Promise<void>((resolve) => setTimeout(resolve, 700));
      this.loggingOut.set(false);
      void this.router.navigate(['/login']);
    }
  }
}
