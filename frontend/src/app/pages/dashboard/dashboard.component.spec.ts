import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient(), provideRouter([]), DashboardService],
    }).compileComponents();
  });

  it('should render dashboard indicators and tables', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Dashboard');
    expect(compiled.textContent).toContain('Vendas totais');
    expect(compiled.textContent).toContain('Produtos Mais Vendidos');
    expect(compiled.textContent).toContain('Pedidos Recentes');
  });
});
