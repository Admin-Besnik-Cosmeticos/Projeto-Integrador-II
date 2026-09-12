import { JsonPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  TesteService,
  type CriarPostResponse,
  type TesteResponse,
} from './teste.service';

@Component({
  selector: 'app-root',
  imports: [JsonPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly testeService = inject(TesteService);

  protected readonly title = signal('projeto integrador II');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly response = signal<TesteResponse | CriarPostResponse | null>(null);

  protected async buscar(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.response.set(null);

    try {
      this.response.set(await this.testeService.obterTeste());
    } catch {
      this.error.set('Nao foi possivel fazer GET em /api/teste.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async enviar(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.response.set(null);

    try {
      this.response.set(await this.testeService.criarPost('Post criado pelo frontend'));
    } catch {
      this.error.set('Nao foi possivel fazer POST em /api/teste.');
    } finally {
      this.loading.set(false);
    }
  }
}
