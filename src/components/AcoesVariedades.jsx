import { useState } from 'react'
import { alternarVarios } from '../lib/dados'
import { reais } from '../lib/formato'
import { IconeFechar, IconeVoltar } from './Icones'

// Painel quando há várias variedades marcadas: só dá para mudar disponível/esgotada e no site/escondida.
// Preço e texto são editados uma por uma.
export function AcoesVariedades({ produtos, aoDesmarcar, aoLimpar, aoVoltar, aoSalvar }) {
  const [ocupado, setOcupado] = useState(null)
  const [erro, setErro] = useState('')
  const qtd = produtos.length

  const aplicar = async (campo, valor) => {
    const alvo = produtos.filter((p) => p[campo] !== valor).map((p) => p.id)
    if (!alvo.length) return
    setOcupado(campo + valor); setErro('')
    try {
      const linhas = await alternarVarios(alvo, { [campo]: valor })
      aoSalvar(linhas, campo, valor)
    } catch (e) {
      setErro(e.message)
    } finally {
      setOcupado(null)
    }
  }

  const opcao = (campo, valor, nome) => {
    const todas = produtos.every((p) => p[campo] === valor)
    return (
      <button type="button" className="status-opcao" aria-pressed={todas} disabled={Boolean(ocupado)}
        onClick={() => aplicar(campo, valor)}>
        {ocupado === campo + valor ? 'Salvando...' : nome}
      </button>
    )
  }

  return (
    <div className="detalhe">
      <div className="detalhe__topo">
        <button type="button" className="botao-fantasma detalhe__voltar" onClick={aoVoltar} aria-label="Voltar para a lista"><IconeVoltar /></button>
        <div className="detalhe__titulo">
          <h2>{qtd} {qtd === 1 ? 'variedade selecionada' : 'variedades selecionadas'}</h2>
          <p>Mudanças aparecem no site na hora</p>
        </div>
        <button type="button" className="botao-fantasma detalhe__fechar" onClick={aoLimpar} aria-label="Limpar seleção"><IconeFechar /></button>
      </div>

      <div className="detalhe__corpo">
        <fieldset className="status-escolha">
          <legend>Disponibilidade de todas</legend>
          <div className="status-escolha__opcoes">
            {opcao('disponivel', true, 'Disponíveis')}
            {opcao('disponivel', false, 'Esgotadas')}
          </div>
        </fieldset>
        <fieldset className="status-escolha">
          <legend>No site</legend>
          <div className="status-escolha__opcoes">
            {opcao('ativo', true, 'Aparecem no site')}
            {opcao('ativo', false, 'Escondidas')}
          </div>
        </fieldset>
        {erro && <p className="erro" role="alert">{erro}</p>}

        <div className="bloco">
          <h3>Selecionadas</h3>
          <ul className="massa-nomes">
            {produtos.map((p) => (
              <li key={p.id}>
                <span className="massa-nomes__nome">{p.nome}</span>
                <span className="massa-nomes__valor">{reais(p.preco_unidade)}</span>
                <button type="button" className="botao-fantasma massa-nomes__tirar" onClick={() => aoDesmarcar(p.id)} aria-label={`Tirar ${p.nome} da seleção`}>
                  <IconeFechar tamanho={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="bloco">
          <button type="button" className="link massa-limpar" onClick={aoLimpar}>Limpar seleção</button>
          <p className="massa-dica">Para mudar preço, texto ou foto, abra cada variedade separadamente.</p>
        </div>
      </div>
    </div>
  )
}
