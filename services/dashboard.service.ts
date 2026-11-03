import { sql } from '../database/db.js';

// Formato consumido por frontend/src/app/services/dashboard.service.ts.
export interface ProdutoMaisVendido {
  id: string;
  produto: string;
  categoria: string | null;
  preco: number;
  vendidos: number;
  faturamento: number;
}

export interface PedidoRecente {
  id: string;
  id_cliente: string;
  cliente: string;
  itens: number;
  total: number;
  status: string;
  data_pedido: string;
}

export interface Dashboard {
  vendas_totais: number;
  pedidos_mes: number;
  // Percentual em relacao ao mes anterior; null quando o mes anterior
  // nao tem pedidos e o atual tem (sem base de comparacao).
  variacao_mes_anterior: number | null;
  clientes_ativos: number;
  ticket_medio: number;
  produtos_mais_vendidos: ProdutoMaisVendido[];
  pedidos_recentes: PedidoRecente[];
}

interface ResumoVendasRow {
  vendas_totais: string | number;
  total_pedidos: string | number;
}

interface ResumoMesRow {
  pedidos_mes_atual: string | number;
  pedidos_mes_anterior: string | number;
  clientes_ativos: string | number;
}

interface ProdutoMaisVendidoRow {
  id: string;
  nome: string;
  categoria: string | null;
  preco: string | number;
  quantidade_vendida: string | number;
  valor_vendido: string | number;
}

interface PedidoRecenteRow {
  id: string;
  data_pedido: string | Date;
  id_cliente: string;
  nome_cliente: string;
  status: string;
  quantidade_itens: string | number;
  valor_total: string | number;
}

// O dashboard carrega uma janela maior para que os filtros e a ordenacao
// tenham dados suficientes. A tabela pagina em 5 linhas para manter o layout.
const LIMITE_PRODUTOS_MAIS_VENDIDOS = 50;
const LIMITE_PEDIDOS_RECENTES = 50;
// Os meses sao contados no fuso da loja, nao em UTC.
const FUSO_HORARIO = 'America/Sao_Paulo';

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

// O driver devolve NUMERIC e COUNT/SUM (bigint) como string.
function paraNumero(valor: string | number | null | undefined): number {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? numero : 0;
}

function calcularVariacao(atual: number, anterior: number): number | null {
  if (anterior === 0) {
    return atual === 0 ? 0 : null;
  }
  return arredondar(((atual - anterior) / anterior) * 100);
}

function calcularTicketMedio(vendasTotais: number, totalPedidos: number): number {
  if (totalPedidos === 0) {
    return 0;
  }
  return arredondar(vendasTotais / totalPedidos);
}

async function buscarResumoVendas(): Promise<ResumoVendasRow> {
  // Somente pedidos faturaveis entram no valor vendido e no ticket medio.
  // Cancelados, em preparo e pendentes ainda nao representam receita.
  const rows = (await sql`
    WITH pedidos_faturaveis AS (
      SELECT id
      FROM pedidos
      WHERE status IN ('Pago', 'Enviado', 'Entregue')
    )
    SELECT
      COALESCE((
        SELECT SUM(ip.quantidade * ip.preco_unitario)
        FROM itens_pedido ip
        JOIN pedidos_faturaveis pf ON pf.id = ip.id_pedido
      ), 0) AS vendas_totais,
      (SELECT COUNT(*) FROM pedidos_faturaveis) AS total_pedidos
  `) as unknown as ResumoVendasRow[];
  return rows[0] ?? { vendas_totais: 0, total_pedidos: 0 };
}

async function buscarResumoMes(): Promise<ResumoMesRow> {
  const rows = (await sql`
    WITH periodo AS (
      SELECT date_trunc('month', now() AT TIME ZONE ${FUSO_HORARIO}) AS inicio_mes_atual
    )
    SELECT
      COUNT(*) FILTER (
        WHERE (p.data_pedido AT TIME ZONE ${FUSO_HORARIO}) >= periodo.inicio_mes_atual
      ) AS pedidos_mes_atual,
      COUNT(*) FILTER (
        WHERE (p.data_pedido AT TIME ZONE ${FUSO_HORARIO}) < periodo.inicio_mes_atual
      ) AS pedidos_mes_anterior,
      (
        SELECT COUNT(DISTINCT id_cliente)
        FROM pedidos
        WHERE data_pedido >= now() - INTERVAL '30 days'
      ) AS clientes_ativos
    FROM periodo
    LEFT JOIN pedidos p
      ON (p.data_pedido AT TIME ZONE ${FUSO_HORARIO}) >= periodo.inicio_mes_atual - INTERVAL '1 month'
     AND (p.data_pedido AT TIME ZONE ${FUSO_HORARIO}) < periodo.inicio_mes_atual + INTERVAL '1 month'
  `) as unknown as ResumoMesRow[];
  return rows[0] ?? { pedidos_mes_atual: 0, pedidos_mes_anterior: 0, clientes_ativos: 0 };
}

async function buscarProdutosMaisVendidos(): Promise<ProdutoMaisVendido[]> {
  const rows = (await sql`
    SELECT
      pr.id,
      pr.nome,
      pr.categoria,
      pr.preco,
      SUM(ip.quantidade) AS quantidade_vendida,
      SUM(ip.quantidade * ip.preco_unitario) AS valor_vendido
    FROM itens_pedido ip
    JOIN produtos pr ON pr.id = ip.id_produto
    GROUP BY pr.id, pr.nome, pr.categoria, pr.preco
    ORDER BY quantidade_vendida DESC, pr.nome
    LIMIT ${LIMITE_PRODUTOS_MAIS_VENDIDOS}
  `) as unknown as ProdutoMaisVendidoRow[];

  return rows.map((row) => ({
    id: row.id,
    produto: row.nome,
    categoria: row.categoria,
    preco: paraNumero(row.preco),
    vendidos: paraNumero(row.quantidade_vendida),
    faturamento: paraNumero(row.valor_vendido),
  }));
}

async function buscarPedidosRecentes(): Promise<PedidoRecente[]> {
  const rows = (await sql`
    SELECT
      p.id,
      p.data_pedido,
      p.status,
      c.id AS id_cliente,
      c.nome AS nome_cliente,
      COALESCE(SUM(ip.quantidade), 0) AS quantidade_itens,
      COALESCE(SUM(ip.quantidade * ip.preco_unitario), 0) AS valor_total
    FROM pedidos p
    JOIN clientes c ON c.id = p.id_cliente
    LEFT JOIN itens_pedido ip ON ip.id_pedido = p.id
    GROUP BY p.id, p.data_pedido, p.status, c.id, c.nome
    ORDER BY p.data_pedido DESC
    LIMIT ${LIMITE_PEDIDOS_RECENTES}
  `) as unknown as PedidoRecenteRow[];

  return rows.map((row) => ({
    id: row.id,
    id_cliente: row.id_cliente,
    cliente: row.nome_cliente,
    itens: paraNumero(row.quantidade_itens),
    total: paraNumero(row.valor_total),
    status: row.status,
    data_pedido: new Date(row.data_pedido).toISOString(),
  }));
}

export async function getDashboard(): Promise<Dashboard> {
  const [resumoVendas, resumoMes, produtosMaisVendidos, pedidosRecentes] =
    await Promise.all([
      buscarResumoVendas(),
      buscarResumoMes(),
      buscarProdutosMaisVendidos(),
      buscarPedidosRecentes(),
    ]);

  const vendasTotais = paraNumero(resumoVendas.vendas_totais);
  const totalPedidos = paraNumero(resumoVendas.total_pedidos);
  const pedidosDoMes = paraNumero(resumoMes.pedidos_mes_atual);
  const pedidosMesAnterior = paraNumero(resumoMes.pedidos_mes_anterior);

  return {
    vendas_totais: vendasTotais,
    pedidos_mes: pedidosDoMes,
    variacao_mes_anterior: calcularVariacao(pedidosDoMes, pedidosMesAnterior),
    clientes_ativos: paraNumero(resumoMes.clientes_ativos),
    ticket_medio: calcularTicketMedio(vendasTotais, totalPedidos),
    produtos_mais_vendidos: produtosMaisVendidos,
    pedidos_recentes: pedidosRecentes,
  };
}
