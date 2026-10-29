import { useState } from 'react'
import { alternarProduto } from '../lib/dados'
import { reais } from '../lib/formato'
import { FormProduto } from './FormProduto'

function Chave({ ligado, rotulo, aoMudar, ocupado }) {
  return (
    <button type="button" role="switch" aria-checked={ligado} className="chave" onClick={aoMudar} disabled={ocupado}>
      <span className="chave__trilho" aria-hidden="true"><span className="chave__bola" /></span>
      <span>{rotulo}</span>
    </button>
  )
}

export function Variedades({ produtos, reservas, aoSalvar }) {
  const [editando, setEditando] = useState(null) // produto, 'novo' ou null
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
      <div className="reservas__cabeca">
        <h1 className="titulo">Variedades</h1>
        <button type="button" className="botao botao--principal botao--pequeno" onClick={() => setEditando('novo')}>Nova variedade</button>
      </div>
      <p className="apoio">Mudanças aqui aparecem no site na hora. Preço novo vale só para as próximas reservas.</p>
      {erro && <p className="erro" role="alert">{erro}</p>}

      <ul className="lista-produtos">
        {produtos.map((p) => (
          <li key={p.id} className={`produto${p.ativo ? '' : ' produto--oculto'}`}>
            {p.imagem_url
              ? <img className="produto__foto" src={p.imagem_url} alt="" />
              : <div className="produto__foto produto__foto--vazia" aria-hidden="true">Foto do site</div>}
            <div className="produto__info">
              <h2 className="produto__nome">{p.nome}</h2>
              <p className="produto__preco">{reais(p.preco_unidade)} a unidade</p>
              <p className="apoio">{reservadas(p.id)} unidades reservadas{p.ativo ? '' : ' (fora do site)'}</p>
            </div>
            <div className="produto__controles">
              <Chave ligado={p.disponivel} rotulo={p.disponivel ? 'Disponível' : 'Esgotada'}
                ocupado={ocupado === p.id + 'disponivel'} aoMudar={() => alternar(p, 'disponivel')} />
              <Chave ligado={p.ativo} rotulo={p.ativo ? 'Aparece no site' : 'Escondida do site'}
                ocupado={ocupado === p.id + 'ativo'} aoMudar={() => alternar(p, 'ativo')} />
              <button type="button" className="botao botao--contorno botao--pequeno" onClick={() => setEditando(p)}>Editar</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
