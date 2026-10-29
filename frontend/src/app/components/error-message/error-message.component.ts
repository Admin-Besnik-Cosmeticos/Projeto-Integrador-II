import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-message',
  templateUrl: './error-message.component.html',
  styleUrl: './error-message.component.scss',
})
export class ErrorMessageComponent {
  readonly mensagem = input.required<string>();
  readonly tentarNovamente = output<void>();

  protected repetir(): void {
    this.tentarNovamente.emit();
  }
}
