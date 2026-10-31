// Transforma as linhas da planilha em reservas, conferindo cada uma antes de mandar para o banco.
import { STATUS } from './dados'
import { gerarXlsx, baixarArquivo } from './planilha'
import { semAcento, telefone } from './formato'

const chave = (t) => semAcento(String(t ?? '')).replace(/[^a-z0-9]+/g, ' ').trim()

// Telefone como o Julio anotar: (34) 99999-8888, 34 99999 8888, +55 34..., 99999-8888 (sem DDD = 34).
export function normalizarWhatsApp(texto) {
  let d = String(texto ?? '').replace(/\.0+$/, '').replace(/\D/g, '')
  const avisos = []
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2)
  if (d.length === 9 || d.length === 8) { d = '34' + d; avisos.push('sem DDD: usei 34') }
  if (d.length === 10 && /[6-9]/.test(d[2])) d = d.slice(0, 2) + '9' + d.slice(2) // celular antigo sem o 9
  return { numero: d, ok: /^\d{11}$/.test(d), avisos }
}

// Data como texto (20/10/2026, 20/10/26 14:30, 2026-10-20) ou número de data do Excel.
export function lerData(valor) {
  const t = String(valor ?? '').trim()
  if (!t) return { data: null }
  if (/^\d+(\.\d+)?$/.test(t)) {
    const n = Number(t)
    if (n > 20000 && n < 80000) {
      const dias = Math.floor(n), minutos = Math.round((n - dias) * 1440)
      const base = new Date(1899, 11, 30)
      base.setDate(base.getDate() + dias)
      base.setMinutes(minutos || 12 * 60)
      return { data: base }
    }
  }
  let m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?!\d)(?:[ T,]+(\d{1,2})[:h](\d{2}))?/)
  if (m) {
    const ano = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
    const d = new Date(ano, Number(m[2]) - 1, Number(m[1]), m[4] ? Number(m[4]) : 12, m[5] ? Number(m[5]) : 0)
    if (d.getMonth() === Number(m[2]) - 1) return { data: d }
  }
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/)
  if (m) return { data: new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), m[4] ? Number(m[4]) : 12, m[5] ? Number(m[5]) : 0) }
  return { data: null, erro: `data "${t}" não entendida (use 20/10/2026)` }
}

// "R$ 8,50" → 8.5 ; "1.234,00" → 1234 ; "8.5" → 8.5
export function lerNumero(valor) {
  let t = String(valor ?? '').replace(/R\$|\s/gi, '')
  if (!t) return null
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

const STATUS_POR_NOME = Object.fromEntries(STATUS.flatMap((s) => [[chave(s.nome), s.id], [chave(s.plural), s.id], [chave(s.id), s.id]]))

// Cabeçalho → o que cada coluna é. Variedades pelo nome (com ou sem "Qtd"), preço por "Preço <variedade>".
function mapearColunas(cabecalho, produtos) {
  const mapa = { produtos: {}, precos: {} }
  const porNome = Object.fromEntries(produtos.map((p) => [chave(p.nome), p]))
  cabecalho.forEach((titulo, i) => {
    const k = chave(titulo)
    if (!k) return
    const preco = k.match(/^(?:preco|valor)(?: unidade| unitario| combinado)? (?:de |da |do )?(.+)$/)
    if (preco && porNome[preco[1]]) { mapa.precos[porNome[preco[1]].id] = i; return }
    const semQtd = k.replace(/^(?:qtd|qtde|quantidade)(?: de)? /, '')
    if (porNome[semQtd]) { mapa.produtos[porNome[semQtd].id] = i; return }
    if (/^data/.test(k)) mapa.data ??= i
    else if (/^(nome|cliente)/.test(k)) mapa.nome ??= i
    else if (/^(whats|telefone|celular|fone|contato)/.test(k)) mapa.whatsapp ??= i
    else if (/^(recebimento|entrega ou retirada|modo|tipo)/.test(k)) mapa.modo ??= i
    else if (/^(endereco|local)/.test(k)) mapa.endereco ??= i
    else if (/^(status|situacao)/.test(k)) mapa.status ??= i
    else if (/^(anotac|observ|obs)/.test(k)) mapa.observacao ??= i
  })
  return mapa
}

// Lê todas as linhas. Devolve { reservas, problemas } — problemas só existem se o cabeçalho estiver errado.
export function interpretar(linhas, produtos, existentes = []) {
  const iCab = linhas.findIndex((l) => l.some((c) => String(c).trim()))
  if (iCab < 0) return { problemas: ['A planilha está vazia.'], reservas: [] }
  const mapa = mapearColunas(linhas[iCab], produtos)
  const faltando = [['nome', 'Nome'], ['whatsapp', 'WhatsApp']].filter(([c]) => mapa[c] == null).map(([, n]) => n)
  if (Object.keys(mapa.produtos).length === 0) faltando.push('uma coluna com o nome de cada variedade (ex.: Teruya do Vale)')
  if (faltando.length) return { problemas: [`Não encontrei a coluna ${faltando.join(', ')}. Use o modelo do painel.`], reservas: [] }

  // Reservas que já estão no sistema: mesmo WhatsApp, mesmo dia e mesmos itens = provavelmente repetida.
  const dia = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  const assinatura = (whats, data, itens) => `${whats}|${dia(data)}|${itens.map((i) => `${i.produto_id}:${i.quantidade}`).sort().join(',')}`
  const jaExiste = new Set(existentes.map((r) => assinatura(r.whatsapp, new Date(r.criado_em), r.itens.map((i) => ({ produto_id: i.produtoId, quantidade: i.quantidade })))))
  const vistas = new Set()

  const pega = (l, col) => (col == null ? '' : String(l[col] ?? '').trim())
  const reservas = []
  linhas.slice(iCab + 1).forEach((l, j) => {
    if (!l.some((c) => String(c ?? '').trim())) return // linha em branco
    const linha = iCab + j + 2
    const erros = [], avisos = []

    const nome = pega(l, mapa.nome).replace(/\s+/g, ' ')
    if (nome.length < 3) erros.push('falta o nome')
    else if (nome.length > 100) erros.push('nome muito longo')

    const w = normalizarWhatsApp(pega(l, mapa.whatsapp))
    if (!pega(l, mapa.whatsapp)) erros.push('falta o WhatsApp')
    else if (!w.ok) erros.push(`WhatsApp "${pega(l, mapa.whatsapp)}" inválido`)
    avisos.push(...w.avisos)

    const endereco = pega(l, mapa.endereco)
    const modoTexto = chave(pega(l, mapa.modo))
    let modo = modoTexto.startsWith('entreg') ? 'entrega' : /^(retir|sitio|busca)/.test(modoTexto) ? 'retirada' : null
    if (!modo) {
      if (modoTexto) erros.push(`recebimento "${pega(l, mapa.modo)}" não entendido (use Entrega ou Retirada)`)
      modo = endereco ? 'entrega' : 'retirada'
    }

    const statusTexto = chave(pega(l, mapa.status))
    const status = statusTexto ? STATUS_POR_NOME[statusTexto] : 'nova'
    if (!status) erros.push(`status "${pega(l, mapa.status)}" não existe`)

    const d = lerData(pega(l, mapa.data))
    if (d.erro) erros.push(d.erro)
    const data = d.data ?? new Date()
    if (d.data && d.data > new Date(Date.now() + 86400000)) erros.push('data no futuro')

    const itens = []
    produtos.forEach((p) => {
      const col = mapa.produtos[p.id]
      if (col == null) return
      const q = lerNumero(pega(l, col))
      if (q == null || q === 0) return
      if (!Number.isInteger(q) || q < 0 || q > 500) { erros.push(`quantidade de ${p.nome} inválida`); return }
      let preco = p.preco_unidade
      const pc = mapa.precos[p.id] != null ? lerNumero(pega(l, mapa.precos[p.id])) : null
      if (pc != null) {
        if (Number.isNaN(pc) || pc < 0) erros.push(`preço de ${p.nome} inválido`)
        else preco = pc
      }
      if (!p.disponivel) avisos.push(`${p.nome} está esgotada no site`)
      itens.push({ produto_id: p.id, nome: p.nome, quantidade: q, preco })
    })
    if (itens.length === 0) erros.push('nenhuma quantidade preenchida')

    const assin = w.ok && itens.length ? assinatura(w.numero, data, itens) : null
    const repetida = assin ? (jaExiste.has(assin) ? 'sistema' : vistas.has(assin) ? 'planilha' : null) : null
    if (assin) vistas.add(assin)

    reservas.push({
      linha, nome, whatsapp: w.numero, modo, endereco: modo === 'entrega' ? endereco : '', status: status ?? 'nova',
      data: d.data ? data : null, observacao: pega(l, mapa.observacao), itens,
      total: itens.reduce((s, i) => s + i.quantidade * i.preco, 0), erros, avisos, repetida,
    })
  })
  if (reservas.length === 0) return { problemas: ['Não há nenhuma reserva preenchida abaixo do cabeçalho.'], reservas: [] }
  return { problemas: [], reservas }
}

// Formato que a função lancar_reservas do banco espera.
export const paraBanco = (r) => ({
  linha: r.linha, nome: r.nome, whatsapp: r.whatsapp, modo: r.modo, endereco: r.endereco || null, status: r.status,
  data: r.data ? r.data.toISOString() : null, observacao: r.observacao || null,
  itens: r.itens.map((i) => ({ produto_id: i.produto_id, quantidade: i.quantidade, preco: i.preco })),
})

// Planilha no formato do modelo: vazia (para preencher) ou com reservas (exportar).
// Exportada assim, ela pode ser editada e importada de novo (as que já existem são puladas).
function planilhaReservas(produtos, reservas, nomeArquivo) {
  const usadas = new Set(reservas.flatMap((r) => r.itens.map((i) => i.produtoId)))
  const vars = produtos.filter((p) => p.ativo || usadas.has(p.id))
  const colunas = [
    { titulo: 'Data', largura: reservas.length ? 17 : 13, estilo: 'data' },
    { titulo: 'Nome', largura: 26 },
    { titulo: 'WhatsApp', largura: 17, estilo: 'texto' },
    { titulo: 'Recebimento', largura: 14, lista: ['Entrega', 'Retirada'] },
    { titulo: 'Endereço', largura: 34 },
    ...vars.map((p) => ({ titulo: p.nome, largura: Math.max(12, p.nome.length + 3), estilo: 'numero' })),
    { titulo: 'Status', largura: 13, lista: STATUS.map((s) => s.nome) },
    { titulo: 'Anotações', largura: 34 },
    ...vars.map((p) => ({ titulo: `Preço ${p.nome}`, largura: Math.max(14, p.nome.length + 9), estilo: 'dinheiro' })),
  ]
  const linhas = [...reservas].sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em)).map((r) => {
    const item = (p) => r.itens.find((i) => i.produtoId === p.id)
    return [
      new Date(r.criado_em), r.nome, telefone(r.whatsapp), r.modo === 'entrega' ? 'Entrega' : 'Retirada', r.endereco ?? '',
      ...vars.map((p) => item(p)?.quantidade ?? ''),
      STATUS.find((s) => s.id === r.status)?.nome ?? '', r.observacao ?? '',
      // Preço só aparece quando foi diferente do preço atual do site.
      ...vars.map((p) => (item(p) && item(p).preco !== p.preco_unidade ? item(p).preco : '')),
    ]
  })
  const exemplo = vars[0]?.nome ?? 'Teruya do Vale'
  const ajuda = [
    ['Uma linha para cada reserva. A primeira linha (cabeçalho) não pode ser mudada.'],
    ['Só Nome, WhatsApp e a quantidade de pelo menos uma variedade são obrigatórios. O resto pode ficar em branco.'],
    [''],
    ['Data: o dia em que a pessoa reservou (ex.: 20/10/2026). Em branco = data da importação.'],
    ['Nome: nome do cliente.'],
    ['WhatsApp: com DDD, como quiser: (34) 99999-8888 ou 34999998888. Sem DDD, o painel usa 34.'],
    ['Recebimento: Entrega ou Retirada. Em branco = Entrega se tiver endereço, senão Retirada.'],
    ['Endereço: só para entrega. Pode ficar em branco se ainda não combinou.'],
    [`Colunas das variedades (${vars.map((p) => p.nome).join(', ')}): quantas unidades de cada uma. Deixe em branco o que a pessoa não pegou.`],
    ['Status: Nova, Em contato, Paga, Entregue ou Cancelada. Em branco = Nova.'],
    ['Anotações: qualquer observação (ex.: pagou metade no Pix).'],
    [`Colunas "Preço ...": só se combinou um preço diferente do site (ex.: Preço ${exemplo} = 8,00). Em branco = preço do site.`],
    [''],
    ['Para importar: painel → Reservas → botão de planilha → Importar. O painel mostra tudo antes de gravar.'],
    ['Reservas que já existem no sistema (mesmo WhatsApp, mesmo dia e mesmas quantidades) são puladas, então dá para importar a mesma planilha de novo depois de acrescentar linhas.'],
  ]
  baixarArquivo(gerarXlsx([
    { nome: 'Reservas', colunas, linhas },
    { nome: 'Como preencher', colunas: [{ titulo: 'RP Pitaya: planilha de reservas', largura: 120 }], linhas: ajuda },
  ]), nomeArquivo)
}

export const baixarModelo = (produtos) => planilhaReservas(produtos, [], 'modelo-reservas-rp-pitaya.xlsx')
export const exportarReservas = (produtos, reservas) =>
  planilhaReservas(produtos, reservas, `reservas-rp-pitaya-${new Date().toISOString().slice(0, 10)}.xlsx`)
