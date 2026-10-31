// Ler e gerar planilhas sem biblioteca extra.
// Um arquivo .xlsx é um .zip com arquivos XML dentro: aqui lemos o zip (com o descompressor do próprio
// navegador) e o XML da primeira aba. O .csv é lido como texto (";" ou ","). Para o modelo, geramos um .xlsx.

// ---------- Leitura ----------

// Devolve as linhas da primeira aba como listas de textos: [["Data", "Nome", ...], ["20/10/2026", "Maria", ...]].
export async function lerPlanilha(arquivo) {
  const nome = arquivo.name.toLowerCase()
  const bytes = new Uint8Array(await arquivo.arrayBuffer())
  if (nome.endsWith('.csv') || nome.endsWith('.txt')) return lerCsv(decodificar(bytes))
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return lerXlsx(bytes) // "PK" = zip
  if (nome.endsWith('.xls')) throw new Error('Esse é o formato antigo do Excel (.xls). No Excel, use "Salvar como" → "Pasta de Trabalho do Excel (.xlsx)".')
  throw new Error('Use um arquivo .xlsx (Excel) ou .csv.')
}

// CSV salvo pelo Excel em português costuma vir em Windows-1252, não em UTF-8.
function decodificar(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes) } catch { return new TextDecoder('windows-1252').decode(bytes) }
}

export function lerCsv(texto) {
  texto = texto.replace(/^﻿/, '')
  const primeira = texto.split(/\r?\n/, 1)[0]
  const sep = (primeira.match(/;/g)?.length ?? 0) >= (primeira.match(/,/g)?.length ?? 0) ? ';' : ','
  const linhas = []
  let linha = [], campo = '', aspas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') aspas = false
      else campo += c
    } else if (c === '"') aspas = true
    else if (c === sep) { linha.push(campo); campo = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      linha.push(campo); linhas.push(linha); linha = []; campo = ''
    } else campo += c
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha) }
  return linhas
}

async function abrirZip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let fim = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { fim = i; break }
  }
  if (fim < 0) throw new Error('Não consegui abrir a planilha. Ela pode estar corrompida.')
  const total = dv.getUint16(fim + 10, true)
  let p = dv.getUint32(fim + 16, true)
  const entradas = {}
  for (let n = 0; n < total; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break
    const metodo = dv.getUint16(p + 10, true)
    const tamanho = dv.getUint32(p + 20, true)
    const lenNome = dv.getUint16(p + 28, true), lenExtra = dv.getUint16(p + 30, true), lenComent = dv.getUint16(p + 32, true)
    const local = dv.getUint32(p + 42, true)
    const nome = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + lenNome))
    entradas[nome] = { metodo, tamanho, local }
    p += 46 + lenNome + lenExtra + lenComent
  }
  const ler = async (nome) => {
    const e = entradas[nome]
    if (!e) return null
    const inicio = e.local + 30 + dv.getUint16(e.local + 26, true) + dv.getUint16(e.local + 28, true)
    const dados = bytes.subarray(inicio, inicio + e.tamanho)
    if (e.metodo === 0) return new TextDecoder().decode(dados)
    if (e.metodo !== 8) throw new Error('Formato de planilha não suportado.')
    const fluxo = new Blob([dados]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
    return new Response(fluxo).text()
  }
  return { ler, nomes: Object.keys(entradas) }
}

const xml = (t) => new DOMParser().parseFromString(t, 'application/xml')
// Busca por nome local, ignorando prefixos de namespace (x:row, row...).
const filhos = (el, nome) => Array.from(el.getElementsByTagNameNS('*', nome))

// "AB12" → 27 (coluna base 0)
function colunaDe(ref) {
  const letras = ref.replace(/[0-9]/g, '')
  let n = 0
  for (const l of letras) n = n * 26 + (l.charCodeAt(0) - 64)
  return n - 1
}

async function lerXlsx(bytes) {
  const zip = await abrirZip(bytes)
  // Primeira aba (a da esquerda), seguindo workbook.xml → workbook.xml.rels.
  let caminho = 'xl/worksheets/sheet1.xml'
  const livro = await zip.ler('xl/workbook.xml')
  const rels = await zip.ler('xl/_rels/workbook.xml.rels')
  if (livro && rels) {
    const aba = filhos(xml(livro), 'sheet')[0]
    const id = aba?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || aba?.getAttribute('r:id')
    const rel = filhos(xml(rels), 'Relationship').find((r) => r.getAttribute('Id') === id)
    if (rel) {
      const alvo = rel.getAttribute('Target')
      caminho = alvo.startsWith('/') ? alvo.slice(1) : `xl/${alvo}`
    }
  }
  const textoAba = await zip.ler(caminho) ?? await zip.ler(zip.nomes.find((n) => n.startsWith('xl/worksheets/')) ?? '')
  if (!textoAba) throw new Error('Não encontrei nenhuma aba na planilha.')

  const compartilhados = []
  const ss = await zip.ler('xl/sharedStrings.xml')
  if (ss) filhos(xml(ss), 'si').forEach((si) => compartilhados.push(filhos(si, 't').map((t) => t.textContent).join('')))

  const linhas = []
  filhos(xml(textoAba), 'row').forEach((row) => {
    const r = Number(row.getAttribute('r')) - 1
    const linha = []
    filhos(row, 'c').forEach((c, i) => {
      const col = c.getAttribute('r') ? colunaDe(c.getAttribute('r')) : i
      const tipo = c.getAttribute('t')
      const v = filhos(c, 'v')[0]?.textContent ?? ''
      let valor
      if (tipo === 's') valor = compartilhados[Number(v)] ?? ''
      else if (tipo === 'inlineStr') valor = filhos(c, 't').map((t) => t.textContent).join('')
      else if (tipo === 'b') valor = v === '1' ? 'VERDADEIRO' : 'FALSO'
      else valor = v
      linha[col] = valor
    })
    linhas[Number.isInteger(r) && r >= 0 ? r : linhas.length] = Array.from(linha, (x) => x ?? '')
  })
  return Array.from(linhas, (l) => l ?? [])
}

// ---------- Geração do modelo (.xlsx) ----------

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const letra = (n) => { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) } return s }

// colunas: [{ titulo, largura, estilo: 'data'|'texto'|'numero'|'dinheiro', lista: ['Entrega','Retirada'] }]
// abas: [{ nome, colunas, linhas: [[...]] }]  (a primeira aba recebe as listas de escolha e o cabeçalho fixo)
export function gerarXlsx(abas) {
  const estilos = { cabecalho: 1, data: 2, texto: 3, numero: 4, dinheiro: 5, nota: 6 }
  const celula = (valor, col, lin, estilo) => {
    const ref = `${letra(col)}${lin}`
    const s = estilo ? ` s="${estilos[estilo]}"` : ''
    if (valor === '' || valor == null) return estilo ? `<c r="${ref}"${s}/>` : ''
    if (typeof valor === 'number') return `<c r="${ref}"${s}><v>${valor}</v></c>`
    return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(valor)}</t></is></c>`
  }
  const folha = (aba, principal) => {
    const cols = aba.colunas.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.largura ?? 16}" customWidth="1"${c.estilo ? ` style="${estilos[c.estilo]}"` : ''}/>`).join('')
    const cab = `<row r="1">${aba.colunas.map((c, i) => celula(c.titulo, i, 1, principal ? 'cabecalho' : 'cabecalho')).join('')}</row>`
    const corpo = aba.linhas.map((l, j) => `<row r="${j + 2}">${l.map((v, i) => celula(v, i, j + 2, principal ? aba.colunas[i]?.estilo : 'nota')).join('')}</row>`).join('')
    const listas = principal ? aba.colunas.map((c, i) => c.lista
      ? `<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Valor inválido" error="Escolha um item da lista." sqref="${letra(i)}2:${letra(i)}2000"><formula1>"${esc(c.lista.join(','))}"</formula1></dataValidation>`
      : '').filter(Boolean) : []
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      `<sheetViews><sheetView workbookViewId="0"${principal ? ' tabSelected="1"' : ''}>${principal ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' : ''}</sheetView></sheetViews>` +
      `<sheetFormatPr defaultRowHeight="18"/><cols>${cols}</cols><sheetData>${cab}${corpo}</sheetData>` +
      (listas.length ? `<dataValidations count="${listas.length}">${listas.join('')}</dataValidations>` : '') +
      '</worksheet>'
  }

  const arquivos = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      abas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
      '</Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      abas.map((a, i) => `<sheet name="${esc(a.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      abas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
      `<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="&quot;R$&quot; #,##0.00"/></numFmts>' +
      '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
      '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFA8154F"/></patternFill></fill></fills>' +
      '<borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1"/>' +
      '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/>' +
      '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/>' +
      '<xf numFmtId="1" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/>' +
      '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '</styleSheet>',
  }
  abas.forEach((a, i) => { arquivos[`xl/worksheets/sheet${i + 1}.xml`] = folha(a, i === 0) })
  return new Blob([zipSemCompressao(arquivos)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

let tabelaCrc
function crc32(b) {
  tabelaCrc ??= Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
  let c = 0xffffffff
  for (let i = 0; i < b.length; i++) c = tabelaCrc[(c ^ b[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function zipSemCompressao(arquivos) {
  const enc = new TextEncoder()
  const partes = [], central = []
  let pos = 0
  for (const [nome, texto] of Object.entries(arquivos)) {
    const n = enc.encode(nome), d = enc.encode(texto), crc = crc32(d)
    const h = new DataView(new ArrayBuffer(30))
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true)
    h.setUint32(14, crc, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, n.length, true)
    partes.push(new Uint8Array(h.buffer), n, d)
    const c = new DataView(new ArrayBuffer(46))
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true)
    c.setUint32(16, crc, true); c.setUint32(20, d.length, true); c.setUint32(24, d.length, true); c.setUint16(28, n.length, true)
    c.setUint32(42, pos, true)
    central.push(new Uint8Array(c.buffer), n)
    pos += 30 + n.length + d.length
  }
  const tamCentral = central.reduce((s, p) => s + p.length, 0)
  const f = new DataView(new ArrayBuffer(22))
  f.setUint32(0, 0x06054b50, true); f.setUint16(8, Object.keys(arquivos).length, true); f.setUint16(10, Object.keys(arquivos).length, true)
  f.setUint32(12, tamCentral, true); f.setUint32(16, pos, true)
  return new Blob([...partes, ...central, new Uint8Array(f.buffer)])
}

export function baixarArquivo(blob, nome) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nome
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
