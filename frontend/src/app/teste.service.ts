import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface TestePost {
  id: string;
  title: string;
  created_at: string;
}

export interface TesteResponse {
  message: string;
  posts: TestePost[];
}

export interface CriarPostResponse {
  message: string;
  post: TestePost;
}

@Injectable({ providedIn: 'root' })
export class TesteService {
  private readonly http = inject(HttpClient);

  obterTeste(): Promise<TesteResponse> {
    return firstValueFrom(this.http.get<TesteResponse>('/api/teste'));
  }

  criarPost(title: string): Promise<CriarPostResponse> {
    return firstValueFrom(this.http.post<CriarPostResponse>('/api/teste', { title }));
  }
}
