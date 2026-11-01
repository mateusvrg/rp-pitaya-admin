// Tempo na plantação: lê a previsão que o banco busca no MET Norway a cada 30 min e transforma
// em "agora", "próximos dias", "chuva" e "alertas da lavoura".
import { rest } from './supabase'

export async function lerTempo() {
  const desde = new Date(Date.now() - 7 * 86400000).toISOString()
  const [[linha], chuva] = await Promise.all([
    rest('tempo?id=eq.1&select=previsao,atualizado_em,erro'),
    rest(`chuva_hora?select=hora,mm&hora=gte.${encodeURIComponent(desde)}&order=hora.asc`),
  ])
  if (!linha?.previsao?.length) return null
  return montar(linha.previsao, chuva, linha.atualizado_em)
}

// Tipo do céu a partir do código do MET Norway (ex.: "partlycloudy_day", "heavyrainshowers_night").
export function tipoDoCeu(codigo = '') {
  const noite = codigo.endsWith('_night')
  if (codigo.includes('thunder')) return { tipo: 'tempestade', nome: 'Tempestade', noite }
  if (codigo.startsWith('heavyrain')) return { tipo: 'chuva-forte', nome: 'Chuva forte', noite }
  if (codigo.startsWith('lightrain')) return { tipo: 'chuva', nome: 'Chuva fraca', noite }
  if (codigo.includes('rainshowers')) return { tipo: 'chuva', nome: 'Pancadas de chuva', noite }
  if (codigo.includes('rain') || codigo.includes('sleet') || codigo.includes('snow')) return { tipo: 'chuva', nome: 'Chuva', noite }
  if (codigo.startsWith('fog')) return { tipo: 'neblina', nome: 'Neblina', noite }
  if (codigo.startsWith('cloudy')) return { tipo: 'nublado', nome: 'Nublado', noite }
  if (codigo.startsWith('partlycloudy')) return { tipo: 'parcial', nome: 'Parcialmente nublado', noite }
  if (codigo.startsWith('fair')) return { tipo: 'parcial', nome: 'Poucas nuvens', noite }
  return { tipo: 'limpo', nome: 'Céu limpo', noite }
}

// Sensação térmica: índice de calor (calor + umidade) ou só a temperatura.
function sensacao(t, umid) {
  if (t < 27 || umid < 40) return t
  const f = t * 9 / 5 + 32
  const hi = -42.379 + 2.04901523 * f + 10.14333127 * umid - 0.22475541 * f * umid - 0.00683783 * f * f
    - 0.05481717 * umid * umid + 0.00122874 * f * f * umid + 0.00085282 * f * umid * umid - 0.00000199 * f * f * umid * umid
  return Math.max(t, (hi - 32) * 5 / 9)
}

const chaveDia = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function montar(serie, chuvaHoras, atualizadoEm) {
  const agoraMs = Date.now()
  const itens = serie.map((e) => ({ ...e, data: new Date(e.t) }))
  // Item atual = o último que já começou (a previsão é de hora em hora no começo).
  const atual = [...itens].reverse().find((e) => e.data.getTime() <= agoraMs) ?? itens[0]
  const ceu = tipoDoCeu(atual.s1 ?? atual.s6)

  // Dias: hoje + 4. Chuva: soma a de 1h quando tem; depois da parte de hora em hora, usa a de 6h.
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const dias = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(hoje); d.setDate(d.getDate() + i)
    return { data: d, chave: chaveDia(d), min: Infinity, max: -Infinity, mm: 0, maxHora: 0, simbolos: [], vento: 0, rajada: 0 }
  })
  const porChave = Object.fromEntries(dias.map((d) => [d.chave, d]))
  itens.forEach((e) => {
    const dia = porChave[chaveDia(e.data)]
    if (!dia) return
    const futuro = e.data.getTime() >= agoraMs - 3600000
    if (e.temp != null) { dia.min = Math.min(dia.min, e.temp); dia.max = Math.max(dia.max, e.temp) }
    if (e.min6 != null && e.mm1 == null) dia.min = Math.min(dia.min, e.min6)
    if (e.max6 != null && e.mm1 == null) dia.max = Math.max(dia.max, e.max6)
    const mm = e.mm1 ?? (e.mm6 ?? 0)
    if (futuro || dia.chave !== chaveDia(hoje)) dia.mm += mm
    if (e.mm1 != null) dia.maxHora = Math.max(dia.maxHora, e.mm1)
    dia.vento = Math.max(dia.vento, e.vento ?? 0)
    dia.rajada = Math.max(dia.rajada, e.rajada ?? 0)
    const h = e.data.getHours()
    if (h >= 9 && h <= 17) dia.simbolos.push(e.s1 ?? e.s6)
  })
  dias.forEach((d, i) => {
    d.nome = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : DIAS[d.data.getDay()]
    const meio = d.simbolos.filter(Boolean)
    // Céu do dia: se a chuva do dia é relevante, mostra chuva; senão, o céu mais comum durante o dia.
    let codigo = meio[Math.floor(meio.length / 2)] ?? 'partlycloudy_day'
    if (d.mm >= 10) codigo = 'heavyrain'
    else if (d.mm >= 1) codigo = meio.find((s) => s.includes('rain')) ?? 'rain'
    d.ceu = tipoDoCeu(codigo.replace('_night', '_day'))
    if (!Number.isFinite(d.min)) { d.min = null; d.max = null }
  })

  // Alertas da lavoura nos próximos dias.
  const alertas = []
  dias.forEach((d) => {
    const quando = d.nome === 'Hoje' ? 'hoje' : d.nome === 'Amanhã' ? 'amanhã' : `${d.nome.toLowerCase()} (${d.data.getDate()}/${d.data.getMonth() + 1})`
    if (d.min != null && d.min <= 3) alertas.push({ tipo: 'frio', texto: `Risco de geada ${quando}: mínima de ${Math.round(d.min)}°.` })
    else if (d.min != null && d.min <= 7) alertas.push({ tipo: 'frio', texto: `Frio forte ${quando}: mínima de ${Math.round(d.min)}°.` })
    if (d.max != null && d.max >= 35) alertas.push({ tipo: 'calor', texto: `Calor forte ${quando}: ${Math.round(d.max)}°. Risco de queimar as pitayas.` })
    if (d.mm >= 30 || d.maxHora >= 10) alertas.push({ tipo: 'chuva', texto: `Chuva forte ${quando}: cerca de ${Math.round(d.mm)} mm.` })
    if (d.vento >= 11 || d.rajada >= 17) alertas.push({ tipo: 'vento', texto: `Vento forte ${quando}: até ${Math.round(Math.max(d.vento, d.rajada) * 3.6)} km/h.` })
  })

  // Chuva registrada (estimada a partir da previsão de cada hora, gravada na própria hora).
  const desde24 = agoraMs - 86400000
  const chuva24 = chuvaHoras.filter((c) => new Date(c.hora).getTime() >= desde24).reduce((s, c) => s + Number(c.mm), 0)
  const chuva7 = chuvaHoras.reduce((s, c) => s + Number(c.mm), 0)
  const primeiraHora = chuvaHoras[0] ? new Date(chuvaHoras[0].hora) : null
  const desdeQuando = primeiraHora && primeiraHora.getTime() > agoraMs - 6.5 * 86400000 ? primeiraHora : null

  return {
    agora: {
      temp: atual.temp, sensacao: sensacao(atual.temp, atual.umid ?? 0), umid: atual.umid,
      vento: (atual.vento ?? 0) * 3.6, ceu, chuvaHoje: dias[0].mm,
    },
    dias, alertas,
    chuva: { ultimas24: chuva24, ultimos7: chuva7, desde: desdeQuando },
    atualizadoEm: atualizadoEm ? new Date(atualizadoEm) : null,
  }
}
