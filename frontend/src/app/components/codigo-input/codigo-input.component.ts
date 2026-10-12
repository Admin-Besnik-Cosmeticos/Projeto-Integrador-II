import {
  Component,
  ElementRef,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';

const CARACTERE_VALIDO = /[a-zA-Z0-9]/;

@Component({
  selector: 'app-codigo-input',
  templateUrl: './codigo-input.component.html',
  styleUrl: './codigo-input.component.scss',
})
export class CodigoInputComponent {
  readonly length = input(8);
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly value = input('');

  readonly valueChange = output<string>();
  readonly completed = output<string>();

  protected readonly digits = signal<string[]>(Array.from({ length: 8 }, () => ''));
  private readonly inputs = viewChildren<ElementRef<HTMLInputElement>>('digit');

  constructor() {
    effect(() => {
      const external = this.value();
      const len = this.length();
      const next = Array.from({ length: len }, (_, index) => external[index] ?? '');
      const current = untracked(this.digits);

      if (current.length === len && current.every((digit, index) => digit === next[index])) {
        return;
      }

      this.digits.set(next);
    });
  }

  protected onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.split('').filter((char) => CARACTERE_VALIDO.test(char));
    const char = (raw[raw.length - 1] ?? '').toUpperCase();

    this.setDigit(index, char);

    if (char && index < this.length() - 1) {
      this.focus(index + 1);
    } else if (char) {
      this.focus(index);
    }
  }

  protected onKeydown(index: number, event: KeyboardEvent): void {
    switch (event.key) {
      case 'Backspace': {
        event.preventDefault();
        const next = [...this.digits()];
        if (next[index]) {
          next[index] = '';
          this.commit(next);
        } else if (index > 0) {
          next[index - 1] = '';
          this.commit(next);
          this.focus(index - 1);
        }
        break;
      }
      case 'Delete': {
        event.preventDefault();
        this.setDigit(index, '');
        break;
      }
      case 'ArrowLeft': {
        if (index > 0) {
          event.preventDefault();
          this.focus(index - 1);
        }
        break;
      }
      case 'ArrowRight': {
        if (index < this.length() - 1) {
          event.preventDefault();
          this.focus(index + 1);
        }
        break;
      }
      case 'Home': {
        event.preventDefault();
        this.focus(0);
        break;
      }
      case 'End': {
        event.preventDefault();
        this.focus(this.length() - 1);
        break;
      }
      default:
        break;
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const chars = text
      .split('')
      .filter((char) => CARACTERE_VALIDO.test(char))
      .map((char) => char.toUpperCase());

    if (chars.length === 0) {
      return;
    }

    const len = this.length();
    const next = [...this.digits()];
    for (let index = 0; index < len && index < chars.length; index += 1) {
      next[index] = chars[index];
    }

    this.commit(next);

    const firstEmpty = next.findIndex((digit) => !digit);
    this.focus(firstEmpty === -1 ? len - 1 : firstEmpty);
  }

  protected onFocus(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  private setDigit(index: number, char: string): void {
    const next = [...this.digits()];
    next[index] = char;
    this.commit(next);
  }

  private commit(next: string[]): void {
    this.digits.set(next);
    const code = next.join('');
    this.valueChange.emit(code);

    if (code.length === this.length() && next.every((digit) => digit)) {
      this.completed.emit(code);
    }
  }

  private focus(index: number): void {
    const input = this.inputs()[index]?.nativeElement;
    input?.focus();
    input?.select();
  }
}
