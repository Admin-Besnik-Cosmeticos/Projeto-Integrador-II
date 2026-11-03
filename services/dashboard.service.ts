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
  // Percentual em relacao ao periodo anterior equivalente; null quando nao
  // ha base de comparacao (periodo total ou anterior sem pedidos).
  variacao_mes_anterior: number | null;
  clientes_ativos: number;
  ticket_medio: number;
  produtos_mais_vendidos: ProdutoMaisVendido[];
  pedidos_recentes: PedidoRecente[];
}

export type DashboardPeriodo = 'mes' | 'trimestre' | 'semestre' | 'ano' | 'total';

const PERIODOS: readonly DashboardPeriodo[] = [
  'mes',
  'trimestre',
  'semestre',
  'ano',
  'total',
];

export function normalizarPeriodo(valor: unknown): DashboardPeriodo {
  return typeof valor === 'string' && (PERIODOS as readonly string[]).includes(valor)
    ? (valor as DashboardPeriodo)
    : 'total';
}

interface IntervaloPeriodo {
  /** Limite inferior inclusivo no formato YYYY-MM-DD; null representa sem limite. */
  inicio: string | null;
  /** Limite superior inclusivo no formato YYYY-MM-DD; null representa sem limite. */
  fim: string | null;
  inicioAnterior: string | null;
  fimAnterior: string | null;
}


interface ResumoVendasRow {
  vendas_totais: string | number;
  total_pedidos: string | number;
}

interface ResumoPeriodoRow {
  pedidos_periodo: string | number;
  pedidos_periodo_anterior: string | number;
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

function partesDataAtual(): { ano: number; mes: number } {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_HORARIO,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());

  const ano = Number(partes.find((parte) => parte.type === 'year')?.value);
  const mes = Number(partes.find((parte) => parte.type === 'month')?.value);
  return { ano, mes };
}

function formatarData(ano: number, mes: number, dia: number): string {
  return new Date(Date.UTC(ano, mes - 1, dia)).toISOString().slice(0, 10);
}

// Calcula os limites do periodo atual e do periodo anterior equivalente.
// As datas sao comparadas no fuso da loja e os limites sao inclusivos.
function intervaloPeriodo(periodo: DashboardPeriodo): IntervaloPeriodo {
  if (periodo === 'total') {
    return {
      inicio: null,
      fim: null,
      inicioAnterior: null,
      fimAnterior: null,
    };
  }

  const { ano, mes } = partesDataAtual();

  let primeiroMes: number;
  let duracaoMeses: number;

  switch (periodo) {
    case 'mes':
      primeiroMes = mes;
      duracaoMeses = 1;
      break;
    case 'trimestre':
      primeiroMes = Math.floor((mes - 1) / 3) * 3 + 1;
      duracaoMeses = 3;
      break;
    case 'semestre':
      primeiroMes = mes <= 6 ? 1 : 7;
      duracaoMeses = 6;
      break;
    case 'ano':
      primeiroMes = 1;
      duracaoMeses = 12;
      break;
  }

  return {
    inicio: formatarData(ano, primeiroMes, 1),
    fim: formatarData(ano, primeiroMes + duracaoMeses, 0),
    inicioAnterior: formatarData(ano, primeiroMes - duracaoMeses, 1),
    fimAnterior: formatarData(ano, primeiroMes, 0),
  };
}

async function buscarResumoVendas({ inicio, fim }: IntervaloPeriodo): Promise<ResumoVendasRow> {
  // Somente pedidos faturaveis entram no valor vendido e no ticket medio.
  // Cancelados, em preparo e pendentes ainda nao representam receita.
  const rows = (await sql`
    WITH pedidos_faturaveis AS (
      SELECT id
      FROM pedidos
      WHERE status IN ('Pago', 'Enviado', 'Entregue')
        AND (${inicio}::date IS NULL OR (data_pedido AT TIME ZONE ${FUSO_HORARIO})::date >= ${inicio}::date)
        AND (${fim}::date IS NULL OR (data_pedido AT TIME ZONE ${FUSO_HORARIO})::date <= ${fim}::date)
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

async function buscarResumoPeriodo({
  inicio,
  fim,
  inicioAnterior,
  fimAnterior,
}: IntervaloPeriodo): Promise<ResumoPeriodoRow> {
  const rows = (await sql`
    SELECT
      COUNT(*) FILTER (
        WHERE (${inicio}::date IS NULL OR (p.data_pedido AT TIME ZONE ${FUSO_HORARIO})::date >= ${inicio}::date)
          AND (${fim}::date IS NULL OR (p.data_pedido AT TIME ZONE ${FUSO_HORARIO})::date <= ${fim}::date)
      ) AS pedidos_periodo,
      COUNT(*) FILTER (
        WHERE ${inicioAnterior}::date IS NOT NULL
          AND (p.data_pedido AT TIME ZONE ${FUSO_HORARIO})::date >= ${inicioAnterior}::date
          AND (p.data_pedido AT TIME ZONE ${FUSO_HORARIO})::date <= ${fimAnterior}::date
      ) AS pedidos_periodo_anterior,
      COUNT(DISTINCT p.id_cliente) FILTER (
        WHERE (${inicio}::date IS NULL OR (p.data_pedido AT TIME ZONE ${FUSO_HORARIO})::date >= ${inicio}::date)
          AND (${fim}::date IS NULL OR (p.data_pedido AT TIME ZONE ${FUSO_HORARIO})::date <= ${fim}::date)
      ) AS clientes_ativos
    FROM pedidos p
  `) as unknown as ResumoPeriodoRow[];
  return rows[0] ?? {
    pedidos_periodo: 0,
    pedidos_periodo_anterior: 0,
    clientes_ativos: 0,
  };
}

async function buscarProdutosMaisVendidos({
  inicio,
  fim,
}: IntervaloPeriodo): Promise<ProdutoMaisVendido[]> {
  const rows = (await sql`
    SELECT
      pr.id,
      pr.nome,
      pr.categoria,
      pr.preco,
      SUM(ip.quantidade) AS quantidade_vendida,
      SUM(ip.quantidade * ip.preco_unitario) AS valor_vendido
    FROM itens_pedido ip
    JOIN pedidos p ON p.id = ip.id_pedido
    JOIN produtos pr ON pr.id = ip.id_produto
    WHERE (${inicio}::date IS NULL OR (p.data_pedido AT TIME ZONE ${FUSO_HORARIO})::date >= ${inicio}::date)
      AND (${fim}::date IS NULL OR (p.data_pedido AT TIME ZONE ${FUSO_HORARIO})::date <= ${fim}::date)
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

async function buscarPedidosRecentes({
  inicio,
  fim,
}: IntervaloPeriodo): Promise<PedidoRecente[]> {
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
    WHERE (${inicio}::date IS NULL OR (p.data_pedido AT TIME ZONE ${FUSO_HORARIO})::date >= ${inicio}::date)
      AND (${fim}::date IS NULL OR (p.data_pedido AT TIME ZONE ${FUSO_HORARIO})::date <= ${fim}::date)
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

export async function getDashboard(
  periodo: DashboardPeriodo = 'total',
): Promise<Dashboard> {
  const intervalo = intervaloPeriodo(periodo);

  const [resumoVendas, resumoPeriodo, produtosMaisVendidos, pedidosRecentes] =
    await Promise.all([
      buscarResumoVendas(intervalo),
      buscarResumoPeriodo(intervalo),
      buscarProdutosMaisVendidos(intervalo),
      buscarPedidosRecentes(intervalo),
    ]);

  const vendasTotais = paraNumero(resumoVendas.vendas_totais);
  const totalPedidos = paraNumero(resumoVendas.total_pedidos);
  const pedidosPeriodo = paraNumero(resumoPeriodo.pedidos_periodo);
  const pedidosPeriodoAnterior = paraNumero(resumoPeriodo.pedidos_periodo_anterior);

  return {
    vendas_totais: vendasTotais,
    pedidos_mes: pedidosPeriodo,
    variacao_mes_anterior: calcularVariacao(pedidosPeriodo, pedidosPeriodoAnterior),
    clientes_ativos: paraNumero(resumoPeriodo.clientes_ativos),
    ticket_medio: calcularTicketMedio(vendasTotais, totalPedidos),
    produtos_mais_vendidos: produtosMaisVendidos,
    pedidos_recentes: pedidosRecentes,
  };
}
