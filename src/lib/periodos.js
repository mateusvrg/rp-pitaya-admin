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

export const formatarData = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
const DIA_MS = 86_400_000
export const diasEntre = (de, ate) => Math.round((inicioDoDia(ate) - inicioDoDia(de)) / DIA_MS) + 1

// Período personalizado: agrupa por dia, semana ou mês conforme o tamanho.
function periodoPersonalizado(de, ate) {
  const dias = diasEntre(de, ate)
  const agrupar = dias <= 45 ? 'dia' : dias <= 200 ? 'semana' : 'mes'
  const mesmoDia = dias === 1
  return {
    id: 'custom',
    nome: 'Personalizado',
    descricao: mesmoDia ? `Dia ${formatarData(de)}` : `De ${formatarData(de)} a ${formatarData(ate)}`,
    anteriores: dias === 1 ? 'dia anterior' : `${dias} dias anteriores`,
    agrupar,
  }
}

// Devolve { periodo, inicio, fim, anterior: { inicio, fim }, baldes: [{ inicio, fim, rotulo, rotuloLongo }] }
// Para id 'custom', passe { de, ate } (datas, ate incluído).
export function montarPeriodo(id, agora = new Date(), personalizado = null) {
  const hoje = inicioDoDia(agora)
  const amanha = somarDias(hoje, 1)
  let p
  let inicio
  let fimPeriodo = amanha
  if (id === 'custom' && personalizado?.de && personalizado?.ate) {
    p = periodoPersonalizado(personalizado.de, personalizado.ate)
    inicio = inicioDoDia(personalizado.de)
    fimPeriodo = somarDias(inicioDoDia(personalizado.ate), 1)
  } else {
    p = PERIODOS.find((x) => x.id === id) ?? PERIODOS[1]
    if (p.id === '7d') inicio = somarDias(hoje, -6)
    else if (p.id === '30d') inicio = somarDias(hoje, -29)
    else if (p.id === '3m') inicio = inicioDaSemana(somarDias(hoje, -7 * 12))
    else if (p.id === '6m') inicio = inicioDaSemana(somarDias(hoje, -7 * 25))
    else inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)
  }

  const baldes = []
  let cursor = inicio
  while (cursor < fimPeriodo) {
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
    baldes.push({ inicio: cursor, fim: fim > fimPeriodo ? fimPeriodo : fim, rotulo, rotuloLongo })
    cursor = fim
  }

  const dias = diasEntre(inicio, somarDias(fimPeriodo, -1))
  return {
    periodo: p,
    inicio,
    fim: fimPeriodo,
    anterior: { inicio: somarDias(inicio, -dias), fim: inicio },
    baldes,
  }
}

// Guarda a escolha: um id da lista ou 'custom' com as datas.
const CHAVE = 'rp-admin-periodo'
export function lerPeriodo() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE))
    if (salvo?.id === 'custom' && salvo.de && salvo.ate) return { id: 'custom', de: new Date(salvo.de), ate: new Date(salvo.ate) }
    if (PERIODOS.some((p) => p.id === salvo?.id)) return { id: salvo.id }
  } catch { /* valor antigo ou sem armazenamento */ }
  return { id: '30d' }
}
export function salvarPeriodo(escolha) {
  try { localStorage.setItem(CHAVE, JSON.stringify(escolha)) } catch { /* sem armazenamento */ }
}
