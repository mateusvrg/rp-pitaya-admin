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

export const unidades = (r) => r.itens.reduce((s, i) => s + i.quantidade, 0)

export const resumoItens = (r) => r.itens.map((i) => `${i.quantidade} ${i.nome}`).join(', ')

// Mensagem pronta para abrir a conversa com o cliente no WhatsApp.
export function linkWhatsApp(r) {
  const primeiroNome = r.nome.split(' ')[0]
  const recebimento = r.modo === 'entrega'
    ? `entrega em: ${r.endereco}`
    : 'retirada no sítio'
  const texto =
    `Olá, ${primeiroNome}! Aqui é do sítio Raízes Popolim, da RP Pitaya. ` +
    `Recebemos sua reserva: ${resumoItens(r)}, total estimado de ${reais(r.total_estimado)}, ${recebimento}. ` +
    'Podemos combinar o pagamento e o dia?'
  return `https://wa.me/55${r.whatsapp}?text=${encodeURIComponent(texto)}`
}
