import { nomeStatus } from './dados'
import { telefone, unidades, resumoItens } from './formato'

// Gera um CSV que abre direto no Excel em português (separador ";", acentos preservados).
export function baixarCsv(reservas) {
  // Texto digitado pelo cliente que comece com = + - @ viraria fórmula no Excel: neutraliza com '.
  const campo = (v) => {
    let t = String(v ?? '')
    if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`
    return `"${t.replace(/"/g, '""')}"`
  }
  const numero = (v) => Number(v || 0).toFixed(2).replace('.', ',')
  const cabecalho = ['Data', 'Nome', 'WhatsApp', 'Recebimento', 'Endereço', 'Itens', 'Unidades', 'Total estimado', 'Status', 'Origem', 'Anotações']
  const linhas = reservas.map((r) => [
    new Date(r.criado_em).toLocaleString('pt-BR'),
    r.nome,
    telefone(r.whatsapp),
    r.modo === 'entrega' ? 'Entrega' : 'Retirada',
    r.endereco,
    resumoItens(r),
    unidades(r),
    numero(r.total_estimado),
    nomeStatus(r.status),
    r.origem === 'importada' ? 'WhatsApp (planilha)' : r.origem === 'manual' ? 'WhatsApp (painel)' : 'Site',
    r.observacao,
  ].map(campo).join(';'))

  const conteudo = '﻿' + [cabecalho.map(campo).join(';'), ...linhas].join('\r\n')
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `reservas-rp-pitaya-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
