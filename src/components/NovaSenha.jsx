import { useState } from 'react'
import { definirNovaSenha } from '../lib/supabase'

export function NovaSenha({ aoConcluir }) {
  const [senha, setSenha] = useState('')
  const [repetir, setRepetir] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const aoEnviar = async (e) => {
    e.preventDefault()
    if (senha.length < 8) return setErro('A senha precisa de pelo menos 8 caracteres.')
    if (senha !== repetir) return setErro('As duas senhas não são iguais.')
    setOcupado(true)
    try {
      await definirNovaSenha(senha)
      aoConcluir()
    } catch (err) {
      setErro(err.message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="tela-centro">
      <form className="cartao cartao--estreito form" onSubmit={aoEnviar} noValidate>
        <h1 className="titulo">Crie sua senha nova</h1>
        <label className="campo-rotulo">Senha nova
          <input className="campo" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus />
        </label>
        <label className="campo-rotulo">Repita a senha
          <input className="campo" type="password" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} />
        </label>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button type="submit" className="botao botao--principal" disabled={ocupado}>{ocupado ? 'Salvando...' : 'Salvar senha'}</button>
      </form>
    </div>
  )
}
