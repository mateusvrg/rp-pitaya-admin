import { useEffect, useState } from 'react'
import { salvarProduto } from '../lib/dados'
import { enviarFoto } from '../lib/supabase'
import { fotoDe, slugDe } from '../lib/formato'

export function FormProduto({ produto, proximaOrdem, slugsUsados, aoCancelar, aoSalvar }) {
  const novo = !produto
  const [f, setF] = useState(() => ({
    nome: produto?.nome ?? '',
    descricao: produto?.descricao ?? '',
    beneficio: produto?.beneficio ?? '',
    preco: produto ? String(produto.preco_unidade).replace('.', ',') : '',
    ordem: produto?.ordem ?? proximaOrdem,
    disponivel: produto?.disponivel ?? true,
    ativo: produto?.ativo ?? true,
    imagem_url: produto?.imagem_url ?? '',
  }))
  const [foto, setFoto] = useState(null)
  const [previa, setPrevia] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!foto) { setPrevia(null); return }
    const url = URL.createObjectURL(foto)
    setPrevia(url)
    return () => URL.revokeObjectURL(url)
  }, [foto])

  const mudar = (campo) => (e) => setF((x) => ({ ...x, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const slug = produto?.slug ?? slugDe(f.nome)

  const aoEnviar = async (e) => {
    e.preventDefault()
    setErro('')
    const preco = Number(f.preco.replace(/\./g, '').replace(',', '.'))
    if (f.nome.trim().length < 2) return setErro('Escreva o nome da variedade.')
    if (novo && slugsUsados.includes(slug)) return setErro('Já existe uma variedade com esse nome.')
    if (!f.preco.trim() || Number.isNaN(preco) || preco < 0) return setErro('Escreva um preço válido, por exemplo 10,00.')

    setSalvando(true)
    try {
      const imagem_url = foto ? await enviarFoto(foto, slug) : f.imagem_url
      const salvo = await salvarProduto({
        id: produto?.id, slug, nome: f.nome.trim(), descricao: f.descricao.trim(), beneficio: f.beneficio.trim(),
        preco_unidade: preco, ordem: Number(f.ordem) || 0, disponivel: f.disponivel, ativo: f.ativo, imagem_url,
      })
      aoSalvar({ ...salvo, preco_unidade: Number(salvo.preco_unidade) }, novo)
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  const fotoAtual = previa || f.imagem_url || (produto ? fotoDe(produto) : null)

  return (
    <form className="painel-form form" onSubmit={aoEnviar} noValidate>
      <h2 className="painel-form__titulo">{novo ? 'Nova variedade' : `Editar ${produto.nome}`}</h2>

      <label className="campo-rotulo">Nome
        <input className="campo" value={f.nome} onChange={mudar('nome')} maxLength={60} placeholder="Ex.: Pitaya Amarela" />
      </label>

      <div className="duas-colunas">
        <label className="campo-rotulo">Preço por unidade (R$)
          <input className="campo" inputMode="decimal" value={f.preco} onChange={mudar('preco')} placeholder="10,00" />
        </label>
        <label className="campo-rotulo">Posição no site
          <input className="campo" type="number" min="0" value={f.ordem} onChange={mudar('ordem')} />
        </label>
      </div>

      <label className="campo-rotulo">Descrição curta
        <input className="campo" value={f.descricao} onChange={mudar('descricao')} maxLength={200} placeholder="Ex.: Polpa vermelha intensa." />
      </label>
      <label className="campo-rotulo">Benefício
        <input className="campo" value={f.beneficio} onChange={mudar('beneficio')} maxLength={200} placeholder="Ex.: Rica em vitamina C." />
      </label>

      <div className="campo-rotulo">
        <span>Foto</span>
        <div className="foto-escolha">
          {fotoAtual
            ? <img src={fotoAtual} alt="Prévia da foto" className="produto__foto produto__foto--grande" />
            : <div className="produto__foto produto__foto--grande produto__foto--vazia" aria-hidden="true">{novo ? 'Sem foto' : 'Foto do site'}</div>}
          <div>
            <label className="botao botao--secundario">
              {fotoAtual ? 'Trocar foto' : 'Escolher foto'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
            </label>
            <p className="apoio">JPG, PNG ou WEBP, até 3 MB. Foto quadrada fica melhor.</p>
          </div>
        </div>
      </div>

      <label className="marcar"><input type="checkbox" checked={f.disponivel} onChange={mudar('disponivel')} /> Disponível para reserva</label>
      <label className="marcar"><input type="checkbox" checked={f.ativo} onChange={mudar('ativo')} /> Aparece no site</label>

      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="form__botoes">
        <button type="button" className="botao botao--secundario" onClick={aoCancelar} disabled={salvando}>Cancelar</button>
        <button type="submit" className="botao botao--principal" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar variedade'}</button>
      </div>
    </form>
  )
}
