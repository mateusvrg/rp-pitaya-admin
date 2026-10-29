import { useState } from 'react'
import { alternarProduto } from '../lib/dados'
import { reais } from '../lib/formato'
import { FormProduto } from './FormProduto'
import { IconeFoto, IconeMais } from './Icones'

function Chave({ ligado, rotulo, aoMudar, ocupado }) {
  return (
    <button type="button" role="switch" aria-checked={ligado} className="chave" onClick={aoMudar} disabled={ocupado}>
      <span className="chave__trilho" aria-hidden="true"><span className="chave__bola" /></span>
      <span className="chave__rotulo">{rotulo}</span>
    </button>
  )
}

export function Variedades({ produtos, reservas, aoSalvar }) {
  const [editando, setEditando] = useState(null)
  const [ocupado, setOcupado] = useState(null)
  const [erro, setErro] = useState('')

  const alternar = async (p, campo) => {
    setOcupado(p.id + campo); setErro('')
    try {
      const novo = await alternarProduto(p.id, { [campo]: !p[campo] })
      aoSalvar({ ...novo, preco_unidade: Number(novo.preco_unidade) })
    } catch (e) {
      setErro(e.message)
    } finally {
      setOcupado(null)
    }
  }

  if (editando) {
    return (
      <FormProduto
        produto={editando === 'novo' ? null : editando}
        proximaOrdem={Math.max(0, ...produtos.map((p) => p.ordem)) + 1}
        slugsUsados={produtos.map((p) => p.slug)}
        aoCancelar={() => setEditando(null)}
        aoSalvar={(p, novo) => { aoSalvar(p, novo); setEditando(null) }}
      />
    )
  }

  const reservadas = (id) => reservas
    .filter((r) => r.status !== 'cancelada')
    .reduce((s, r) => s + r.itens.filter((i) => i.produtoId === id).reduce((a, i) => a + i.quantidade, 0), 0)

  return (
    <div className="variedades">
      <div className="ferramentas">
        <p className="apoio">Mudanças aparecem no site na hora. Um preço novo vale só para as próximas reservas.</p>
        <button type="button" className="botao botao--principal" onClick={() => setEditando('novo')}>
          <IconeMais tamanho={18} /> Nova variedade
        </button>
      </div>
      {erro && <p className="erro" role="alert">{erro}</p>}

      <ul className="tabela-produtos">
        {produtos.map((p) => (
          <li key={p.id} className={`produto${p.ativo ? '' : ' produto--oculto'}`}>
            {p.imagem_url
              ? <img className="produto__foto" src={p.imagem_url} alt="" />
              : <span className="produto__foto produto__foto--vazia" title="Usando a foto que já está no site"><IconeFoto /></span>}
            <div className="produto__info">
              <p className="produto__nome">{p.nome}{!p.ativo && <span className="produto__tag">Escondida</span>}</p>
              <p className="produto__meta">{reais(p.preco_unidade)} a unidade, {reservadas(p.id)} reservadas</p>
            </div>
            <div className="produto__controles">
              <Chave ligado={p.disponivel} rotulo={p.disponivel ? 'Disponível' : 'Esgotada'}
                ocupado={ocupado === p.id + 'disponivel'} aoMudar={() => alternar(p, 'disponivel')} />
              <Chave ligado={p.ativo} rotulo="No site"
                ocupado={ocupado === p.id + 'ativo'} aoMudar={() => alternar(p, 'ativo')} />
              <button type="button" className="botao botao--secundario botao--pequeno" onClick={() => setEditando(p)}>Editar</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
