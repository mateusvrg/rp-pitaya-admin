// Transforma as linhas da planilha em reservas, conferindo cada uma antes de mandar para o banco.
import { STATUS, canalDe, nomeCanal } from './dados'
import { gerarXlsx, baixarArquivo } from './planilha'
import { semAcento, telefone, unidadeDe } from './formato'
// Coluna da quantidade: "kg" ou "unidades".
const rotuloQtd = (p) => (unidadeDe(p) === 'kg' ? 'kg' : 'unidades')

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
  // Pelo nome do produto e também pelos nomes do cartão (ex.: coluna "Teruya do Vale" vai para "Pitaya vermelha").
  const porNome = {}
  produtos.forEach((p) => (p.nome_cartao ?? '').split('/').forEach((n) => { if (chave(n)) porNome[chave(n)] ??= p }))
  produtos.forEach((p) => { porNome[chave(p.nome)] = p })
  cabecalho.forEach((titulo, i) => {
    // "Teruya do Vale (kg)", "Muda (mudas)", "Qtd Teruya do Vale", "Preço Teruya do Vale (R$/kg)":
    // o que vem entre parênteses no fim, e o "kg"/"R$" no fim, não contam.
    const k = chave(String(titulo ?? '').replace(/\s*\([^)]*\)\s*$/, '')).replace(/(?: r)?(?: kg| quilos?)$/, '')
    if (!k) return
    const preco = k.match(/^(?:preco|valor)(?: unidade| unitario| combinado| do kg| kg| quilo)? (?:de |da |do )?(.+)$/)
    if (preco && porNome[preco[1]]) { mapa.precos[porNome[preco[1]].id] = i; return }
    const semQtd = k.replace(/^(?:qtd|qtde|quantidade|kg|quilos?)(?: de)? /, '')
    if (porNome[semQtd]) { mapa.produtos[porNome[semQtd].id] = i; return }
    if (/^data/.test(k)) mapa.data ??= i
    else if (/^(nome|cliente)/.test(k)) mapa.nome ??= i
    else if (/^(whats|telefone|celular|fone|contato)/.test(k)) mapa.whatsapp ??= i
    else if (/^(recebimento|entrega ou retirada|modo|tipo)/.test(k)) mapa.modo ??= i
    else if (/^(endereco|local)/.test(k)) mapa.endereco ??= i
    else if (/^(status|situacao)/.test(k)) mapa.status ??= i
    else if (/^(canal|veio|origem)/.test(k)) mapa.canal ??= i
    else if (/^(anotac|observ|obs)/.test(k)) mapa.observacao ??= i
  })
  return mapa
}

// Confere uma linha. b = os textos da linha como estão na planilha (ou como foram corrigidos no painel):
// { linha, data, nome, whatsapp, modo, endereco, status, observacao, qtd: { idProduto: texto }, preco: { idProduto: texto } }
export function validarLinha(b, produtos) {
  const erros = [], avisos = [], camposErrados = new Set()
  const erro = (campo, texto) => { erros.push(texto); camposErrados.add(campo) }
  const t = (v) => String(v ?? '').trim()

  const nome = t(b.nome).replace(/\s+/g, ' ')
  if (nome.length < 3) erro('nome', 'falta o nome')
  else if (nome.length > 100) erro('nome', 'nome muito longo')

  const w = normalizarWhatsApp(t(b.whatsapp))
  if (!t(b.whatsapp)) erro('whatsapp', 'falta o WhatsApp')
  else if (!w.ok) erro('whatsapp', `WhatsApp "${t(b.whatsapp)}" inválido`)
  avisos.push(...w.avisos)

  const endereco = t(b.endereco)
  const modoTexto = chave(b.modo)
  let modo = modoTexto.startsWith('entreg') ? 'entrega' : /^(retir|sitio|busca)/.test(modoTexto) ? 'retirada' : null
  if (!modo) {
    if (modoTexto) erro('modo', `recebimento "${t(b.modo)}" não entendido (use Entrega ou Retirada)`)
    modo = endereco ? 'entrega' : 'retirada'
  }

  const statusTexto = chave(b.status)
  const status = statusTexto ? STATUS_POR_NOME[statusTexto] : 'nova'
  if (!status) erro('status', `status "${t(b.status)}" não existe`)

  // Canal: por onde chegou. Em branco = WhatsApp (a planilha é onde se anota o que chega por fora do site).
  const canalTexto = chave(b.canal)
  const canal = !canalTexto ? 'whatsapp' : /^(whats|zap|wpp|wa$)/.test(canalTexto) ? 'whatsapp' : /^(insta|ig$)/.test(canalTexto) ? 'instagram' : /^site/.test(canalTexto) ? 'site' : null
  if (!canal) erro('canal', `canal "${t(b.canal)}" não existe (use WhatsApp, Instagram ou Site)`)

  const d = lerData(t(b.data))
  if (d.erro) erro('data', d.erro)
  const data = d.data ?? new Date()
  if (d.data && d.data > new Date(Date.now() + 86400000)) erro('data', 'data no futuro')

  const itens = []
  produtos.forEach((p) => {
    let q = lerNumero(t(b.qtd?.[p.id]))
    if (q == null || q === 0) return
    const u = unidadeDe(p)
    if (u === 'kg' && (Number.isNaN(q) || q < 0.1 || q > 500)) { erro(`qtd-${p.id}`, `quilos de ${p.nome} inválidos (de 0,1 a 500)`); return }
    if (u !== 'kg' && (Number.isNaN(q) || !Number.isInteger(q) || q < 1 || q > 500)) { erro(`qtd-${p.id}`, `${p.nome}: use um número inteiro de unidades (de 1 a 500)`); return }
    q = Math.round(q * 100) / 100
    let preco = p.preco_unidade
    const pc = lerNumero(t(b.preco?.[p.id]))
    if (pc != null) {
      if (Number.isNaN(pc) || pc < 0) erro(`preco-${p.id}`, `preço de ${p.nome} inválido`)
      else preco = pc
    }
    if (!p.disponivel) avisos.push(`${p.nome} está esgotada no site`)
    itens.push({ produto_id: p.id, nome: p.nome, quantidade: q, unidade: u, preco })
  })
  if (itens.length === 0 && !erros.some((e) => e.startsWith('quantidade'))) erro('qtd', 'nenhuma quantidade preenchida')

  return {
    linha: b.linha, nome, whatsapp: w.numero, whatsappOk: w.ok, modo, endereco: modo === 'entrega' ? endereco : '', status: status ?? 'nova', canal: canal ?? 'whatsapp',
    data: d.data ? data : null, dataUsada: data, observacao: t(b.observacao), itens,
    total: itens.reduce((s, i) => s + Math.round(i.quantidade * i.preco * 100) / 100, 0), erros, avisos, camposErrados, bruto: b,
  }
}

// Reservas que já estão no sistema (ou repetidas na própria planilha): mesmo nome, WhatsApp, dia, itens e anotação.
export function marcarRepetidas(lista, existentes = []) {
  const dia = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  // O nome entra junto: várias pessoas podem ter o mesmo WhatsApp anotado (ex.: um número genérico).
  const assinatura = (nome, whats, data, itens, obs) => `${chave(nome)}|${chave(obs)}|${whats}|${dia(data)}|${itens.map((i) => `${i.produto_id}:${i.quantidade}`).sort().join(',')}`
  const jaExiste = new Set(existentes.map((r) => assinatura(r.nome, r.whatsapp, new Date(r.criado_em), r.itens.map((i) => ({ produto_id: i.produtoId, quantidade: i.quantidade })), r.observacao)))
  const vistas = new Set()
  return lista.map((r) => {
    const assin = r.whatsappOk && r.itens.length ? assinatura(r.nome, r.whatsapp, r.dataUsada, r.itens, r.observacao) : null
    const repetida = assin ? (jaExiste.has(assin) ? 'sistema' : vistas.has(assin) ? 'planilha' : null) : null
    if (assin) vistas.add(assin)
    return { ...r, repetida }
  })
}

// Data como o Julio leria (20/10/2026 ou 20/10/2026 14:30), para mostrar no formulário de correção.
const dataTexto = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  const hora = d.getHours() === 12 && d.getMinutes() === 0 ? '' : ` ${p(d.getHours())}:${p(d.getMinutes())}`
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}${hora}`
}

// Lê todas as linhas. Devolve { reservas, problemas } — problemas só existem se o cabeçalho estiver errado.
export function interpretar(linhas, produtos, existentes = []) {
  const iCab = linhas.findIndex((l) => l.some((c) => String(c).trim()))
  if (iCab < 0) return { problemas: ['A planilha está vazia.'], reservas: [] }
  const mapa = mapearColunas(linhas[iCab], produtos)
  const faltando = [['nome', 'Nome'], ['whatsapp', 'WhatsApp']].filter(([c]) => mapa[c] == null).map(([, n]) => n)
  if (Object.keys(mapa.produtos).length === 0) faltando.push('uma coluna com o nome de cada variedade (ex.: Teruya do Vale)')
  if (faltando.length) return { problemas: [`Não encontrei a coluna ${faltando.join(', ')}. Use o modelo do painel.`], reservas: [] }

  const pega = (l, col) => (col == null ? '' : String(l[col] ?? '').trim())
  const reservas = []
  linhas.slice(iCab + 1).forEach((l, j) => {
    if (!l.some((c) => String(c ?? '').trim())) return // linha em branco
    const textoData = pega(l, mapa.data)
    const lida = lerData(textoData)
    const b = {
      linha: iCab + j + 2,
      data: lida.data ? dataTexto(lida.data) : textoData,
      nome: pega(l, mapa.nome), whatsapp: pega(l, mapa.whatsapp).replace(/\.0+$/, ''), modo: pega(l, mapa.modo),
      endereco: pega(l, mapa.endereco), status: pega(l, mapa.status), canal: pega(l, mapa.canal), observacao: pega(l, mapa.observacao),
      qtd: Object.fromEntries(Object.entries(mapa.produtos).map(([id, col]) => [id, pega(l, col)])),
      preco: Object.fromEntries(Object.entries(mapa.precos).map(([id, col]) => [id, pega(l, col)])),
    }
    reservas.push(validarLinha(b, produtos))
  })
  if (reservas.length === 0) return { problemas: ['Não há nenhuma reserva preenchida abaixo do cabeçalho.'], reservas: [] }
  return { problemas: [], reservas: marcarRepetidas(reservas, existentes) }
}

// Formato que a função lancar_reservas do banco espera.
export const paraBanco = (r) => ({
  linha: r.linha, nome: r.nome, whatsapp: r.whatsapp, modo: r.modo, endereco: r.endereco || null, status: r.status, canal: r.canal,
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
    ...vars.map((p) => ({ titulo: `${p.nome} (${rotuloQtd(p)})`, largura: Math.max(12, p.nome.length + 9), estilo: 'numero' })),
    { titulo: 'Status', largura: 13, lista: STATUS.map((s) => s.nome) },
    { titulo: 'Canal', largura: 12, lista: ['WhatsApp', 'Instagram', 'Site'] },
    { titulo: 'Anotações', largura: 34 },
    ...vars.map((p) => ({ titulo: `Preço ${p.nome} (R$/${unidadeDe(p)})`, largura: Math.max(14, p.nome.length + 16), estilo: 'dinheiro' })),
  ]
  const linhas = [...reservas].sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em)).map((r) => {
    const item = (p) => r.itens.find((i) => i.produtoId === p.id)
    return [
      new Date(r.criado_em), r.nome, telefone(r.whatsapp), r.modo === 'entrega' ? 'Entrega' : 'Retirada', r.endereco ?? '',
      ...vars.map((p) => item(p)?.quantidade ?? ''),
      STATUS.find((s) => s.id === r.status)?.nome ?? '', nomeCanal(canalDe(r)), r.observacao ?? '',
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
    [`Colunas das variedades (${vars.map((p) => p.nome).join(', ')}): a quantidade de cada uma. Em kg pode ter vírgula (ex.: 1,5); por unidade, só número inteiro. Deixe em branco o que a pessoa não pegou.`],
    ['Status: Nova, Em contato, Paga, Entregue ou Cancelada. Em branco = Nova.'],
    ['Canal: por onde a reserva chegou: WhatsApp, Instagram ou Site. Em branco = WhatsApp.'],
    ['Anotações: qualquer observação (ex.: pagou metade no Pix).'],
    [`Colunas "Preço ...": só se combinou um preço (do kg ou da unidade) diferente do site (ex.: Preço ${exemplo} = 8,00). Em branco = preço do site.`],
    [''],
    ['Para importar: painel → Reservas → botão de planilha → Importar. O painel mostra tudo antes de gravar.'],
    ['Reservas que já existem no sistema (mesmo nome, WhatsApp, dia, quantidades e anotação) são puladas, então dá para importar a mesma planilha de novo depois de acrescentar linhas.'],
  ]
  baixarArquivo(gerarXlsx([
    { nome: 'Reservas', colunas, linhas },
    { nome: 'Como preencher', colunas: [{ titulo: 'RP Pitaya: planilha de reservas', largura: 120 }], linhas: ajuda },
  ]), nomeArquivo)
}

export const baixarModelo = (produtos) => planilhaReservas(produtos, [], 'modelo-reservas-rp-pitaya.xlsx')
export const exportarReservas = (produtos, reservas) =>
  planilhaReservas(produtos, reservas, `reservas-rp-pitaya-${new Date().toISOString().slice(0, 10)}.xlsx`)
