import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-page-header',
  imports: [],
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
})
export class PageHeaderComponent {
  readonly titulo = input.required<string>();
  readonly descricao = input('');
  readonly acao = input.required<string>();
  readonly icone = input('+');
  readonly acaoSelecionada = output<void>();
}
