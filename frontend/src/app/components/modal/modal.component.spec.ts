import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalAcoesDirective, ModalComponent } from './modal.component';

@Component({
  selector: 'app-teste-host',
  imports: [ModalComponent, ModalAcoesDirective],
  template: `
    <app-modal
      [aberto]="aberto()"
      titulo="Novo Cliente"
      [carregando]="carregando()"
      (fechar)="registrarFechamento()"
    >
      <p class="conteudo-projetado" modalCorpo>Conteudo projetado</p>
      <div modalAcoes>
        <button type="button" class="acao-cancelar">Cancelar</button>
      </div>
    </app-modal>
  `,
})
class TesteHost {
  readonly aberto = signal(false);
  readonly carregando = signal(false);
  readonly fechamentos = signal(0);

  registrarFechamento(): void {
    this.fechamentos.update((total) => total + 1);
  }
}

@Component({
  selector: 'app-teste-host-sem-acoes',
  imports: [ModalComponent],
  template: `
    <app-modal [aberto]="aberto()" titulo="Aviso">
      <p class="conteudo-simples" modalCorpo>Aviso simples</p>
    </app-modal>
  `,
})
class TesteHostSemAcoes {
  readonly aberto = signal(true);
}

describe('ModalComponent', () => {
  let fixture: ComponentFixture<TesteHost>;

  const abrir = async (): Promise<void> => {
    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  const pesquisar = <T extends HTMLElement>(seletor: string): T | null => {
    const elemento = fixture.nativeElement.querySelector(seletor);
    return elemento as T | null;
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(TesteHost);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('exibe titulo, conteudo projetado e area de acoes quando aberto', async () => {
    await abrir();

    expect(pesquisar('.modal__overlay')).not.toBeNull();
    expect(pesquisar('.modal__titulo')?.textContent?.trim()).toBe('Novo Cliente');
    expect(pesquisar('.conteudo-projetado')?.textContent?.trim()).toBe('Conteudo projetado');
    expect(pesquisar('.modal__rodape')?.classList.contains('modal__rodape--visivel')).toBe(true);
    expect(pesquisar('.acao-cancelar')).not.toBeNull();
  });

  it('nao renderiza nada quando fechado', () => {
    expect(pesquisar('.modal__overlay')).toBeNull();
  });

  it('emite fechamento pelo botao de fechar', async () => {
    await abrir();

    pesquisar<HTMLButtonElement>('.modal__fechar')?.click();

    expect(fixture.componentInstance.fechamentos()).toBe(1);
  });

  it('emite fechamento por clique no overlay e mantem cliques internos', async () => {
    await abrir();

    pesquisar<HTMLElement>('.modal__overlay')?.click();
    expect(fixture.componentInstance.fechamentos()).toBe(1);

    pesquisar<HTMLElement>('.modal__janela')?.click();
    pesquisar<HTMLElement>('.conteudo-projetado')?.click();
    expect(fixture.componentInstance.fechamentos()).toBe(1);
  });

  it('emite fechamento pela tecla Escape', async () => {
    await abrir();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(fixture.componentInstance.fechamentos()).toBe(1);
  });

  it('impede fechamento enquanto carregando', async () => {
    await abrir();

    fixture.componentInstance.carregando.set(true);
    fixture.detectChanges();

    pesquisar<HTMLElement>('.modal__overlay')?.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(fixture.componentInstance.fechamentos()).toBe(0);

    const janela = pesquisar('.modal__janela');
    expect(janela?.getAttribute('aria-busy')).toBe('true');
    expect(pesquisar<HTMLButtonElement>('.modal__fechar')?.disabled).toBe(true);

    fixture.componentInstance.carregando.set(false);
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(fixture.componentInstance.fechamentos()).toBe(1);
  });

  it('nao exibe area de acoes quando nao ha acoes projetadas', () => {
    const fixtureSemAcoes = TestBed.createComponent(TesteHostSemAcoes);
    fixtureSemAcoes.detectChanges();

    const rodape = fixtureSemAcoes.nativeElement.querySelector('.modal__rodape');
    expect(rodape?.classList.contains('modal__rodape--visivel')).toBe(false);
    expect(fixtureSemAcoes.nativeElement.querySelector('.conteudo-simples')).not.toBeNull();
    fixtureSemAcoes.destroy();
  });

  it('concede foco a janela quando aberto', async () => {
    await abrir();

    expect(document.activeElement?.classList.contains('modal__janela')).toBe(true);
  });

  it('cicliza o foco dentro da janela com Tab', async () => {
    await abrir();

    const botaoCancelar = pesquisar<HTMLButtonElement>('.acao-cancelar') as HTMLButtonElement;
    botaoCancelar.focus();
    expect(document.activeElement).toBe(botaoCancelar);

    botaoCancelar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

    expect(document.activeElement?.classList.contains('modal__fechar')).toBe(true);
  });

  it('bloqueia o scroll do corpo enquanto aberto', () => {
    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('hidden');

    fixture.componentInstance.aberto.set(false);
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('');
  });

  it('declara atributos de acessibilidade da janela', async () => {
    await abrir();

    const janela = pesquisar('.modal__janela') as HTMLElement;
    const titulo = pesquisar('.modal__titulo') as HTMLElement;

    expect(janela.getAttribute('role')).toBe('dialog');
    expect(janela.getAttribute('aria-modal')).toBe('true');
    expect(janela.getAttribute('aria-labelledby')).toBe(titulo.id);
    expect(pesquisar<HTMLButtonElement>('.modal__fechar')?.getAttribute('aria-label')).toBe(
      'Fechar modal',
    );
  });
});
