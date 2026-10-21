import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TabelaAcao, TabelaAcaoEvento, TabelaColuna, TabelaComponent } from './tabela.component';

interface RegistroTeste {
  id: number;
  nome: string;
  valor: number;
  data: string;
  status: string;
}

const COLUNAS: TabelaColuna<RegistroTeste>[] = [
  { titulo: 'Nome', campo: 'nome', tipo: 'destaque' },
  { titulo: 'Valor Total', campo: 'valor', tipo: 'moeda', alinhamento: 'direita' },
  { titulo: 'Data', campo: 'data', tipo: 'data' },
  { titulo: 'Status', campo: 'status', tipo: 'tag', tons: { Ativo: 'sucesso' } },
];

const ACOES: TabelaAcao<RegistroTeste>[] = [
  { id: 'visualizar', rotulo: 'Visualizar', icone: 'visualizar' },
  { id: 'editar', rotulo: 'Editar', icone: 'editar' },
];

const REGISTROS: RegistroTeste[] = [
  { id: 1, nome: 'Ana Ribeiro', valor: 219.8, data: '2024-10-24T12:00', status: 'Ativo' },
  { id: 2, nome: 'Bruno Lima', valor: 278.9, data: '2024-10-28T12:00', status: 'Pendente' },
];

describe('TabelaComponent', () => {
  let fixture: ComponentFixture<TabelaComponent<RegistroTeste>>;
  let component: TabelaComponent<RegistroTeste>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TabelaComponent] }).compileComponents();

    fixture = TestBed.createComponent(TabelaComponent<RegistroTeste>);
    component = fixture.componentInstance;
  });

  function celulas(coluna: number): string[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll(`tbody .tabela__linha td:nth-child(${coluna + 1})`),
    ).map((celula) => ((celula as HTMLElement).textContent ?? '').trim().replace(/\u00a0/g, ' '));
  }

  it('renderiza cabeçalhos e células a partir das colunas e dos dados', () => {
    fixture.componentRef.setInput('colunas', COLUNAS);
    fixture.componentRef.setInput('dados', REGISTROS);
    fixture.detectChanges();

    const titulos = Array.from(fixture.nativeElement.querySelectorAll('thead th')).map((titulo) =>
      (titulo as HTMLElement).textContent?.trim(),
    );

    expect(titulos).toEqual(['Nome', 'Valor Total', 'Data', 'Status']);
    expect(celulas(0)).toEqual(['Ana Ribeiro', 'Bruno Lima']);
  });

  it('formata valores de moeda e data', () => {
    fixture.componentRef.setInput('colunas', COLUNAS);
    fixture.componentRef.setInput('dados', REGISTROS);
    fixture.detectChanges();

    expect(celulas(1)).toEqual(['R$ 219,80', 'R$ 278,90']);
    expect(celulas(2)).toEqual(['24 Out 2024', '28 Out 2024']);
  });

  it('aplica destaque, alinhamento e tonalidade configurados por coluna', () => {
    fixture.componentRef.setInput('colunas', COLUNAS);
    fixture.componentRef.setInput('dados', REGISTROS);
    fixture.detectChanges();

    const grade = fixture.nativeElement as HTMLElement;
    expect(grade.querySelector('tbody td')?.classList).toContain('tabela__celula');
    expect(grade.querySelector('tbody .tabela__valor--destaque')).toBeTruthy();
    expect(grade.querySelector('tbody td:nth-child(2)')?.classList).toContain(
      'tabela__celula--direita',
    );
    expect(grade.querySelector('.tabela__tag--sucesso')?.textContent?.trim()).toBe('Ativo');
    expect(grade.querySelector('.tabela__tag--neutro')?.textContent?.trim()).toBe('Pendente');
  });

  it('emite o evento de ação com o id da ação e o registro clicado', () => {
    fixture.componentRef.setInput('colunas', COLUNAS);
    fixture.componentRef.setInput('dados', REGISTROS);
    fixture.componentRef.setInput('acoes', ACOES);

    const eventos: TabelaAcaoEvento<RegistroTeste>[] = [];
    component.acaoSelecionada.subscribe((evento) => eventos.push(evento));
    fixture.detectChanges();

    const botoes = fixture.nativeElement.querySelectorAll('.tabela__acao');
    (botoes[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(eventos).toEqual([{ acao: 'editar', registro: REGISTROS[0] }]);
  });

  it('exibe o estado de carregamento com linhas de esqueleto', () => {
    fixture.componentRef.setInput('colunas', COLUNAS);
    fixture.componentRef.setInput('dados', []);
    fixture.componentRef.setInput('acoes', ACOES);
    fixture.componentRef.setInput('carregando', true);
    fixture.componentRef.setInput('linhasCarregando', 3);
    fixture.detectChanges();

    const grade = fixture.nativeElement as HTMLElement;
    const esqueletos = grade.querySelectorAll('.tabela__linha--esqueleto');

    expect(esqueletos.length).toBe(3);
    expect(
      grade.querySelectorAll('tbody td:not(.tabela__celula--acoes) .tabela__osso').length,
    ).toBe(12);
    expect(grade.querySelector('.tabela__linha')).toBeNull();
  });

  it('exibe o estado vazio com as mensagens configuradas', () => {
    fixture.componentRef.setInput('colunas', COLUNAS);
    fixture.componentRef.setInput('dados', []);
    fixture.componentRef.setInput('mensagemVazio', 'Nenhum cliente encontrado');
    fixture.componentRef.setInput('descricaoVazio', 'Cadastre o primeiro cliente.');
    fixture.detectChanges();

    const grade = fixture.nativeElement as HTMLElement;
    const tituloVazio = grade.querySelector('.tabela__vazio__titulo');

    expect(tituloVazio?.textContent?.trim()).toBe('Nenhum cliente encontrado');
    expect(grade.querySelector('.tabela__vazio__descricao')?.textContent?.trim()).toBe(
      'Cadastre o primeiro cliente.',
    );
    expect((grade.querySelector('tbody td') as HTMLTableCellElement).colSpan).toBe(COLUNAS.length);
  });

  it('exibe a coluna de ações somente quando houver ações configuradas', () => {
    fixture.componentRef.setInput('colunas', COLUNAS);
    fixture.componentRef.setInput('dados', REGISTROS);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.tabela__acao').length).toBe(0);
    expect(
      Array.from(fixture.nativeElement.querySelectorAll('thead th')).some(
        (titulo) => (titulo as HTMLElement).textContent?.trim() === 'Ações',
      ),
    ).toBe(false);

    fixture.componentRef.setInput('acoes', ACOES);
    fixture.detectChanges();

    expect(
      Array.from(fixture.nativeElement.querySelectorAll('thead th')).some(
        (titulo) => (titulo as HTMLElement).textContent?.trim() === 'Ações',
      ),
    ).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.tabela__acao').length).toBe(
      REGISTROS.length * ACOES.length,
    );
  });

  it('substitui valores ausentes por traço', () => {
    const colunas: TabelaColuna<RegistroTeste>[] = [{ titulo: 'Nome', campo: 'nome' }];
    fixture.componentRef.setInput('colunas', colunas);
    fixture.componentRef.setInput('dados', [{ id: 3, nome: '', valor: 0, data: '', status: '' }]);
    fixture.detectChanges();

    expect(celulas(0)).toEqual(['—']);
  });

  it('permite remover via ação excluir emitindo o registro', () => {
    fixture.componentRef.setInput('colunas', COLUNAS);
    fixture.componentRef.setInput('dados', REGISTROS);
    fixture.componentRef.setInput('acoes', [
      { id: 'excluir', rotulo: 'Excluir', icone: 'excluir' },
    ]);

    const spy = vi.fn();
    component.acaoSelecionada.subscribe(spy);
    fixture.detectChanges();

    const botoes = fixture.nativeElement.querySelectorAll('.tabela__acao');
    (botoes[1] as HTMLButtonElement).click();

    expect(spy).toHaveBeenCalledExactlyOnceWith({ acao: 'excluir', registro: REGISTROS[1] });
  });
});
