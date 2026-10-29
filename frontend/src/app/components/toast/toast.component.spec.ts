import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DURACAO_TOAST_MS, ToastService } from '../../services/toast.service';
import { ToastComponent } from './toast.component';

describe('ToastComponent', () => {
  let fixture: ComponentFixture<ToastComponent>;
  let service: ToastService;

  const pesquisar = <T extends HTMLElement>(seletor: string): T | null =>
    fixture.nativeElement.querySelector(seletor);

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ imports: [ToastComponent] });
    service = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(ToastComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    service.limpar();
    vi.useRealTimers();
  });

  it('nao renderiza nada sem toasts', () => {
    expect(pesquisar('.toast')).toBeNull();
  });

  it('renderiza toast de sucesso', () => {
    service.sucesso('Produto cadastrado.');
    fixture.detectChanges();

    const item = pesquisar('.toast__item');
    expect(item).not.toBeNull();
    expect(item!.textContent).toContain('Produto cadastrado.');
    expect(item!.getAttribute('role')).toBe('status');
    expect(item!.classList).not.toContain('toast__item--erro');
  });

  it('renderiza toast de erro como alerta', () => {
    service.erro('Nao foi possivel excluir o produto.');
    fixture.detectChanges();

    const item = pesquisar('.toast__item');
    expect(item!.getAttribute('role')).toBe('alert');
    expect(item!.classList).toContain('toast__item--erro');
  });

  it('fecha o toast ao clicar no botao', () => {
    service.sucesso('Cliente cadastrada.');
    fixture.detectChanges();

    pesquisar<HTMLButtonElement>('.toast__fechar')!.click();
    fixture.detectChanges();

    expect(service.toasts()).toHaveLength(0);
    expect(pesquisar('.toast')).toBeNull();
  });

  it('remove o toast automaticamente apos 10 segundos', () => {
    service.sucesso('Produto removido.');
    fixture.detectChanges();
    expect(pesquisar('.toast__item')).not.toBeNull();

    vi.advanceTimersByTime(DURACAO_TOAST_MS);
    fixture.detectChanges();

    expect(pesquisar('.toast')).toBeNull();
  });
});
