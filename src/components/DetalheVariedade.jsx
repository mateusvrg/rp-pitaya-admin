import { useEffect, useState } from 'react'
import { alternarProduto } from '../lib/dados'
import { fotosDe, kg, reais } from '../lib/formato'
import { FotosVariedade } from './FotosVariedade'
import { Chave } from './Chave'
import { IconeFechar, IconeFoto, IconeVoltar } from './Icones'

// Painel lateral de uma variedade: chaves de disponível/no site, números e botão de editar.
export function DetalheVariedade({ produto: p, reservadas, emAberto, aoFechar, aoEditar, aoSalvar }) {
  const [ocupado, setOcupado] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') aoFechar() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aoFechar])

  const alternar = async (campo) => {
    setOcupado(campo); setErro('')
    try {
      const novo = await alternarProduto(p.id, { [campo]: !p[campo] })
      aoSalvar({ ...novo, preco_unidade: Number(novo.preco_unidade) })
    } catch (e) {
      setErro(e.message)
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="detalhe">
      <div className="detalhe__topo">
        <button type="button" className="botao-fantasma detalhe__voltar" onClick={aoFechar} aria-label="Voltar para a lista"><IconeVoltar /></button>
        <div className="detalhe__titulo">
          <h2>{p.nome}</h2>
          <p>{p.nome_cartao && p.nome_cartao !== p.nome ? `No site: ${p.nome_cartao} · ` : ''}{reais(p.preco_unidade)} o kg</p>
        </div>
        <button type="button" className="botao-fantasma detalhe__fechar" onClick={aoFechar} aria-label="Fechar detalhe"><IconeFechar /></button>
      </div>

      <div className="detalhe__corpo">
        <FotosVariedade className="variedade-foto" fotos={fotosDe(p)} alt={`Foto da ${p.nome}`}
          vazia={<><IconeFoto /> Sem foto</>} />

        <div className="bloco">
          <h3>No site</h3>
          <Chave ligado={p.disponivel} rotulo={p.disponivel ? 'Disponível para reserva' : 'Esgotada'}
            ocupado={ocupado === 'disponivel'} aoMudar={() => alternar('disponivel')} />
          <Chave ligado={p.ativo} rotulo={p.ativo ? 'Aparece no site' : 'Escondida do site'}
            ocupado={ocupado === 'ativo'} aoMudar={() => alternar('ativo')} />
          {erro && <p className="erro" role="alert">{erro}</p>}
        </div>

        <div className="bloco">
          <h3>Reservas</h3>
          <ul className="massa-status">
            <li><span>Quilos reservados (sem as canceladas)</span><strong>{kg(reservadas)}</strong></li>
            <li><span>Em reservas em aberto</span><strong>{kg(emAberto)}</strong></li>
          </ul>
        </div>

        {(p.descricao || p.beneficio) && (
          <div className="bloco">
            <h3>Texto no site</h3>
            <p className="variedade-texto">{p.descricao} {p.beneficio}</p>
          </div>
        )}

        <div className="bloco">
          <button type="button" className="botao botao--principal" onClick={aoEditar}>Editar preço, texto e foto</button>
          <p className="massa-dica">Um preço novo vale só para as próximas reservas.</p>
        </div>
      </div>
    </div>
  )
}
