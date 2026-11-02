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

// Tudo é vendido por quilo: quantidade = kg (pode ter vírgula, ex.: 1,5 kg).
export const numeroKg = (n) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
export const kg = (n) => `${numeroKg(n)} kg`

export const quilos = (r) => Math.round(r.itens.reduce((s, i) => s + i.quantidade, 0) * 100) / 100

export const resumoItens = (r) => r.itens.map((i) => `${kg(i.quantidade)} ${i.nome}`).join(', ')

// Mensagem pronta para abrir a conversa com o cliente no WhatsApp.
export function linkWhatsApp(r) {
  const primeiroNome = r.nome.split(' ')[0]
  const recebimento = r.modo === 'entrega'
    ? (r.endereco ? `entrega em: ${r.endereco}` : 'entrega (endereço a combinar)')
    : 'retirada no sítio'
  const texto =
    `Olá, ${primeiroNome}! Aqui é do sítio Raízes Popolim, da RP Pitaya. ` +
    `Recebemos sua reserva: ${resumoItens(r)}, total estimado de ${reais(r.total_estimado)}, ${recebimento}. ` +
    'Podemos combinar o pagamento e o dia?'
  return `https://wa.me/55${r.whatsapp}?text=${encodeURIComponent(texto)}`
}

// Fotos que já vêm no site de reservas (cópia em public/fotos-site). A foto enviada pelo painel tem prioridade.
const FOTOS_DO_SITE = ['royal-red', 'vietnamese-white', 'teruya-do-vale']
export const fotoDe = (p) => p.imagem_url || (FOTOS_DO_SITE.includes(p.slug) ? `/fotos-site/${p.slug}.jpg` : null)
