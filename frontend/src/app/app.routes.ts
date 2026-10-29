import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './auth.guard';
import { LoginComponent } from './pages/login/login.component';
import { RecuperacaoSenhaComponent } from './pages/recuperacao-senha/recuperacao-senha.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ProdutosComponent } from './pages/produtos/produtos.component';
import { ClientesComponent } from './pages/clientes/clientes.component';
import { ClienteDetalhesComponent } from './pages/cliente-detalhes/cliente-detalhes.component';
import { PedidosComponent } from './pages/pedidos/pedidos.component';
import { ConfiguracoesComponent } from './pages/configuracoes/configuracoes.component';
import { AppLayoutComponent } from './layouts/app-layout/app-layout.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [loginGuard] },
  { path: 'recuperacao', component: RecuperacaoSenhaComponent },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'produtos', component: ProdutosComponent },
      { path: 'clientes', component: ClientesComponent },
      { path: 'clientes/:id', component: ClienteDetalhesComponent },
      { path: 'pedidos', component: PedidosComponent },
      { path: 'configuracoes', component: ConfiguracoesComponent },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
