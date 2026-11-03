import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FiltroCampo, FiltroComponent, FiltroValores } from './filtro.component';

const CAMPOS: FiltroCampo[] = [
  { id: 'codigo', rotulo: 'Código', tipo: 'texto', placeholder: 'Ex.: #A1B2C3D4' },
  { id: 'data', rotulo: 'Data', tipo: 'data' },
  {
    id: 'status',
    rotulo: 'Status',
    tipo: 'select',
    placeholder: 'Todos os status',
    opcoes: [
      { valor: 'Pago', rotulo: 'Pago' },
      { valor: 'Entregue', rotulo: 'Entregue' },
    ],
  },
];

describe('FiltroComponent', () => {
  let fixture: ComponentFixture<FiltroComponent>;
  let native: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FiltroComponent] });
    fixture = TestBed.createComponent(FiltroComponent);
    fixture.componentRef.setInput('campos', CAMPOS);
    fixture.detectChanges();
    native = fixture.nativeElement as HTMLElement;
  });

  function preencher(seletor: string, valor: string, evento = 'input'): void {
    const campo = native.querySelector<HTMLInputElement | HTMLSelectElement>(seletor);
    expect(campo).not.toBeNull();
    campo!.value = valor;
    campo!.dispatchEvent(new Event(evento));
  }

  it('renderiza um campo para cada configuracao', () => {
    expect(native.querySelectorAll('.filtro__campo').length).toBe(3);
    expect(native.querySelector('#filtro-codigo')).not.toBeNull();
    expect(native.querySelector('#filtro-data')?.getAttribute('type')).toBe('date');
    expect(native.querySelectorAll('#filtro-status option').length).toBe(3);
  });

  it('emite os valores preenchidos ao enviar o formulario', () => {
    const recebidos: FiltroValores[] = [];
    fixture.componentInstance.buscar.subscribe((valores) => recebidos.push(valores));

    preencher('#filtro-codigo', 'A1B2');
    preencher('#filtro-data', '2026-10-29');
    preencher('#filtro-status', 'Pago', 'change');
    native.querySelector('form')!.dispatchEvent(new Event('submit'));

    expect(recebidos).toEqual([
      { codigo: 'A1B2', data: '2026-10-29', status: 'Pago' },
    ]);
  });

  it('envia objeto vazio ao buscar sem preencher campos', () => {
    const recebidos: FiltroValores[] = [];
    fixture.componentInstance.buscar.subscribe((valores) => recebidos.push(valores));

    native.querySelector('form')!.dispatchEvent(new Event('submit'));

    expect(recebidos).toEqual([{}]);
  });

  it('limpa os campos e avisa o pai', () => {
    let limpou = false;
    fixture.componentInstance.limpar.subscribe(() => {
      limpou = true;
    });

    preencher('#filtro-codigo', 'A1B2');
    native.querySelector<HTMLButtonElement>('.filtro__limpar')!.click();
    fixture.detectChanges();

    expect(limpou).toBe(true);
    expect(
      native.querySelector<HTMLInputElement>('#filtro-codigo')!.value,
    ).toBe('');
  });

  it('desabilita o botao de buscar enquanto a pesquisa esta em andamento', () => {
    fixture.componentRef.setInput('buscando', true);
    fixture.detectChanges();

    const botao = native.querySelector<HTMLButtonElement>('.filtro__buscar');
    expect(botao?.disabled).toBe(true);
    expect(botao?.textContent).toContain('Buscando...');
  });
});
