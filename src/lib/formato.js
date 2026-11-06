export const reais = (v) =>
  `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const telefone = (d) =>
  d?.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d

export const dataHora = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export const dataCurta = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

export const semAcento = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const slugDe = (t) =>
  semAcento(t).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// Cada produto é vendido por quilo (kg, pode ter vírgula: 1,5 kg) ou por unidade (número inteiro).
// Cada item de reserva guarda a sua unidade ('kg' ou 'unidade').
export const numeroKg = (n) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
export const kg = (n) => `${numeroKg(n)} kg`

// Unidade de um produto: 'kg' ou 'unidade'.
export const unidadeDe = (p) => (p?.venda === 'unidade' ? 'unidade' : 'kg')
// "2,5 kg", "1 unidade", "3 unidades".
export const qtd = (n, unidade = 'kg') => (unidade === 'kg' ? kg(n) : `${numeroKg(n)} ${Number(n) === 1 ? 'unidade' : 'unidades'}`)
// Depois do preço: "o kg" ou "a unidade".
export const porUnidade = (unidade = 'kg') => (unidade === 'kg' ? 'o kg' : 'a unidade')

// Só os quilos (os itens por unidade ficam de fora).
export const quilos = (r) => Math.round(r.itens.reduce((s, i) => s + (i.unidade === 'kg' ? i.quantidade : 0), 0) * 100) / 100

// Soma por unidade: itens [{ quantidade, unidade }] → "15,5 kg e 3 unidades".
export function resumoQtd(itens) {
  const soma = new Map()
  itens.forEach((i) => soma.set(i.unidade || 'kg', Math.round(((soma.get(i.unidade || 'kg') ?? 0) + Number(i.quantidade)) * 100) / 100))
  const partes = [...soma.entries()].sort(([a], [b]) => (a === 'kg' ? -1 : b === 'kg' ? 1 : 0)).map(([u, n]) => qtd(n, u))
  if (partes.length <= 1) return partes[0] ?? '0 kg'
  return `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`
}
export const resumoReservas = (reservas) => resumoQtd(reservas.flatMap((r) => r.itens))

export const resumoItens = (r) => r.itens.map((i) => `${qtd(i.quantidade, i.unidade)} ${i.nome}`).join(', ')

// Mensagem pronta para abrir a conversa com o cliente no WhatsApp.
export function linkWhatsApp(r) {
  const primeiroNome = r.nome.split(' ')[0]
  const recebimento = r.modo === 'entrega'
    ? (r.endereco ? `entrega em: ${r.endereco}` : 'entrega (endereço a combinar)')
    : 'retirada em nosso endereço'
  const texto =
    `Olá, ${primeiroNome}! Aqui é da RP Pitaya. ` +
    `Recebemos sua reserva: ${resumoItens(r)}, total estimado de ${reais(r.total_estimado)}, ${recebimento}. ` +
    'Podemos combinar o pagamento e o dia?'
  return `https://wa.me/55${r.whatsapp}?text=${encodeURIComponent(texto)}`
}

// Fotos que já vêm no site de reservas (cópia em public/fotos-site). A foto enviada pelo painel tem prioridade.
// A pitaya vermelha junta duas variedades: no site, as duas fotos aparecem lado a lado.
const FOTOS_DO_SITE = {
  'royal-red': ['royal-red'],
  'vietnamese-white': ['vietnamese-white'],
  'teruya-do-vale': ['teruya-do-vale'],
  'pitaya-vermelha': ['royal-red', 'teruya-do-vale'],
  'pitaya-branca': ['vietnamese-white'],
}
export const fotosDoSite = (slug) => (FOTOS_DO_SITE[slug] ?? []).map((n) => `/fotos-site/${n}.jpg`)
// Igual ao site: fotos enviadas pelo painel (1 ou 2) têm prioridade; sem nenhuma, as que vêm com o site.
export const fotosDe = (p) => (p.imagem_url ? [p.imagem_url, p.imagem_url_2].filter(Boolean) : fotosDoSite(p.slug))
export const fotoDe = (p) => fotosDe(p)[0] ?? null
