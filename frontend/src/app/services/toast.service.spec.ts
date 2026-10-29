import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DURACAO_TOAST_MS, ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    service.limpar();
    vi.useRealTimers();
  });

  it('exibe toast de sucesso e remove apos 10 segundos', () => {
    service.sucesso('Produto cadastrado.');

    expect(service.toasts()).toHaveLength(1);
    expect(service.toasts()[0]).toMatchObject({
      mensagem: 'Produto cadastrado.',
      tipo: 'sucesso',
    });

    vi.advanceTimersByTime(DURACAO_TOAST_MS - 1);
    expect(service.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(service.toasts()).toHaveLength(0);
  });

  it('exibe toast de erro', () => {
    service.erro('Nao foi possivel concluir a operacao.');

    expect(service.toasts()).toHaveLength(1);
    expect(service.toasts()[0].tipo).toBe('erro');
  });

  it('remove o toast ao fechar manualmente e cancela o temporizador', () => {
    const id = service.sucesso('Cliente cadastrada.');

    expect(id).not.toBeNull();
    service.fechar(id!);
    expect(service.toasts()).toHaveLength(0);

    vi.advanceTimersByTime(DURACAO_TOAST_MS);
    expect(service.toasts()).toHaveLength(0);
  });

  it('ignora mensagens vazias', () => {
    expect(service.sucesso('   ')).toBeNull();
    expect(service.erro('')).toBeNull();
    expect(service.toasts()).toHaveLength(0);
  });

  it('mantem no maximo quatro toasts na tela', () => {
    for (let indice = 1; indice <= 5; indice++) {
      service.sucesso(`Mensagem ${indice}`);
    }

    expect(service.toasts()).toHaveLength(4);
    expect(service.toasts()[0].mensagem).toBe('Mensagem 2');
    expect(service.toasts()[3].mensagem).toBe('Mensagem 5');
  });

  it('remove todos os toasts com limpar', () => {
    service.sucesso('Primeiro.');
    service.erro('Segundo.');

    service.limpar();

    expect(service.toasts()).toHaveLength(0);
    vi.advanceTimersByTime(DURACAO_TOAST_MS);
    expect(service.toasts()).toHaveLength(0);
  });
});
