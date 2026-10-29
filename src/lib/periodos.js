// Períodos do dashboard e como agrupar as reservas em cada um.
export const PERIODOS = [
  { id: '7d', nome: '7 dias', descricao: 'Últimos 7 dias', anteriores: '7 dias anteriores', curto: '7d', agrupar: 'dia' },
  { id: '30d', nome: 'Mês', descricao: 'Últimos 30 dias', anteriores: '30 dias anteriores', curto: '30d', agrupar: 'dia' },
  { id: '3m', nome: '3 meses', descricao: 'Últimos 3 meses', anteriores: '3 meses anteriores', curto: '3m', agrupar: 'semana' },
  { id: '6m', nome: '6 meses', descricao: 'Últimos 6 meses', anteriores: '6 meses anteriores', curto: '6m', agrupar: 'semana' },
  { id: '1a', nome: '1 ano', descricao: 'Últimos 12 meses', anteriores: '12 meses anteriores', curto: '1a', agrupar: 'mes' },
]

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const inicioDoDia = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const somarDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const inicioDaSemana = (d) => { const x = inicioDoDia(d); const dow = (x.getDay() + 6) % 7; return somarDias(x, -dow) } // segunda

// Devolve { inicio, fim, anterior: { inicio, fim }, baldes: [{ inicio, fim, rotulo, rotuloLongo }] }
export function montarPeriodo(id, agora = new Date()) {
  const p = PERIODOS.find((x) => x.id === id) ?? PERIODOS[1]
  const hoje = inicioDoDia(agora)
  const amanha = somarDias(hoje, 1)
  let inicio
  if (p.id === '7d') inicio = somarDias(hoje, -6)
  else if (p.id === '30d') inicio = somarDias(hoje, -29)
  else if (p.id === '3m') inicio = inicioDaSemana(somarDias(hoje, -7 * 12))
  else if (p.id === '6m') inicio = inicioDaSemana(somarDias(hoje, -7 * 25))
  else inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)

  const baldes = []
  let cursor = inicio
  while (cursor < amanha) {
    let fim
    let rotulo
    let rotuloLongo
    if (p.agrupar === 'dia') {
      fim = somarDias(cursor, 1)
      rotulo = cursor.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      rotuloLongo = cursor.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
    } else if (p.agrupar === 'semana') {
      fim = somarDias(cursor, 7)
      rotulo = cursor.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      rotuloLongo = `Semana de ${cursor.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
    } else {
      fim = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
      rotulo = cursor.getMonth() === 0 ? `${MESES[0]} ${String(cursor.getFullYear()).slice(2)}` : MESES[cursor.getMonth()]
      rotuloLongo = cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    }
    baldes.push({ inicio: cursor, fim: fim > amanha ? amanha : fim, rotulo, rotuloLongo })
    cursor = fim
  }

  const duracao = amanha - inicio
  return {
    periodo: p,
    inicio,
    fim: amanha,
    anterior: { inicio: new Date(inicio - duracao), fim: inicio },
    baldes,
  }
}

const CHAVE = 'rp-admin-periodo'
export const lerPeriodo = () => { try { return PERIODOS.some((p) => p.id === localStorage.getItem(CHAVE)) ? localStorage.getItem(CHAVE) : '30d' } catch { return '30d' } }
export const salvarPeriodo = (id) => { try { localStorage.setItem(CHAVE, id) } catch { /* sem armazenamento */ } }
