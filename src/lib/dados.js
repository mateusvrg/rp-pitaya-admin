import { rest, sessaoAtual } from './supabase'

export const STATUS = [
  { id: 'nova', nome: 'Nova', plural: 'Novas' },
  { id: 'em_contato', nome: 'Em contato', plural: 'Em contato' },
  { id: 'paga', nome: 'Paga', plural: 'Pagas' },
  { id: 'entregue', nome: 'Entregue', plural: 'Entregues' },
  { id: 'cancelada', nome: 'Cancelada', plural: 'Canceladas' },
]
export const nomeStatus = (id) => STATUS.find((s) => s.id === id)?.nome ?? id

export async function souAdmin() {
  const id = sessaoAtual()?.usuario?.id
  const filtro = id ? `user_id=eq.${id}&` : ''
  const linhas = await rest(`admins?${filtro}select=user_id&limit=1`)
  return linhas.length > 0
}

const normalizarReserva = (r) => ({
  ...r,
  total_estimado: Number(r.total_estimado),
  itens: (r.itens_reserva ?? []).map((i) => ({
    produtoId: i.produto_id,
    nome: i.produtos?.nome ?? 'Variedade removida',
    quantidade: i.quantidade,
    preco: Number(i.preco_unitario),
  })),
})

export async function listarReservas() {
  const linhas = await rest(
    'reservas?select=id,nome,whatsapp,modo,endereco,status,total_estimado,observacao,criado_em,atualizado_em,' +
      'itens_reserva(produto_id,quantidade,preco_unitario,produtos(nome))&order=criado_em.desc&limit=2000',
  )
  return linhas.map(normalizarReserva)
}

export async function atualizarReserva(id, campos) {
  const [linha] = await rest(`reservas?id=eq.${id}&select=id,status,observacao,atualizado_em`, {
    metodo: 'PATCH', corpo: campos, retornar: true,
  })
  return linha
}

export const listarProdutos = () =>
  rest('produtos?select=*&order=ordem.asc,nome.asc').then((l) =>
    l.map((p) => ({ ...p, preco_unidade: Number(p.preco_unidade) })))

export async function salvarProduto(produto) {
  const campos = {
    slug: produto.slug,
    nome: produto.nome,
    descricao: produto.descricao,
    beneficio: produto.beneficio,
    imagem_url: produto.imagem_url || null,
    preco_unidade: produto.preco_unidade,
    disponivel: produto.disponivel,
    ativo: produto.ativo,
    ordem: produto.ordem,
  }
  if (produto.id) {
    const [linha] = await rest(`produtos?id=eq.${produto.id}`, { metodo: 'PATCH', corpo: campos, retornar: true })
    return linha
  }
  const [linha] = await rest('produtos', { metodo: 'POST', corpo: campos, retornar: true })
  return linha
}

export const alternarProduto = (id, campos) =>
  rest(`produtos?id=eq.${id}`, { metodo: 'PATCH', corpo: campos, retornar: true }).then((l) => l[0])

// Muda o mesmo campo em várias reservas de uma vez (ex.: marcar 6 como entregues).
export const atualizarVarias = (ids, campos) =>
  rest(`reservas?id=in.(${ids.join(',')})&select=id,status,observacao,atualizado_em`, {
    metodo: 'PATCH', corpo: campos, retornar: true,
  })
