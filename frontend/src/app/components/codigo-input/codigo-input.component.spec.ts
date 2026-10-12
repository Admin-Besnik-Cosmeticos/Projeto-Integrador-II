import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { CodigoInputComponent } from './codigo-input.component';

describe('CodigoInputComponent', () => {
  let fixture: ComponentFixture<CodigoInputComponent>;
  let component: CodigoInputComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CodigoInputComponent] }).compileComponents();

    fixture = TestBed.createComponent(CodigoInputComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;
  });

  function inputs(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.codigo__input'));
  }

  function type(index: number, value: string): void {
    const input = inputs()[index];
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('renders eight individual inputs', () => {
    expect(inputs().length).toBe(8);
  });

  it('keeps only one character and advances to the next field', () => {
    const focusSpy = vi.spyOn(inputs()[1], 'focus');

    type(0, '12');

    expect(inputs()[0].value).toBe('2');
    expect(focusSpy).toHaveBeenCalled();
  });

  it('emits the complete code when every field is filled', () => {
    let completed = '';
    component.completed.subscribe((value) => (completed = value));

    for (let index = 0; index < 8; index += 1) {
      type(index, String(index + 1));
    }

    expect(completed).toBe('12345678');
  });

  it('clears the previous field with backspace when the current field is empty', () => {
    type(0, '1');

    inputs()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    fixture.detectChanges();

    expect(inputs()[0].value).toBe('');
  });

  it('distributes a pasted code across the fields', () => {
    const event = new Event('paste');
    Object.assign(event, { clipboardData: { getData: () => 'ab12-cd34' } });

    inputs()[0].dispatchEvent(event);
    fixture.detectChanges();

    expect(
      inputs()
        .map((input) => input.value)
        .join(''),
    ).toBe('AB12CD34');
  });

  it('applies the invalid visual state', () => {
    fixture.componentRef.setInput('invalid', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.codigo').classList).toContain('codigo--invalid');
  });
});
