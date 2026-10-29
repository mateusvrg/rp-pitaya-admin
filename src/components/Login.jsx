import { useState } from 'react'
import logo from '../logo.svg'
import { entrar, pedirNovaSenha } from '../lib/supabase'

export function Login() {
  const [modo, setModo] = useState('entrar') // entrar | esqueci | enviado
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const aoEnviar = async (e) => {
    e.preventDefault()
    setErro('')
    if (!email.includes('@')) return setErro('Escreva um e-mail válido.')
    if (modo === 'entrar' && !senha) return setErro('Escreva sua senha.')
    setOcupado(true)
    try {
      if (modo === 'entrar') await entrar(email.trim(), senha)
      else { await pedirNovaSenha(email.trim()); setModo('enviado') }
    } catch (err) {
      setErro(err.message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="tela-centro">
      <div className="cartao cartao--estreito">
        <div className="login__marca">
          <img src={logo} alt="" width="48" height="48" />
          <div>
            <p className="login__nome">RP Pitaya</p>
            <p className="apoio">Painel do produtor</p>
          </div>
        </div>

        {modo === 'enviado' ? (
          <>
            <h1 className="titulo">Confira seu e-mail</h1>
            <p className="apoio">Se esse e-mail estiver cadastrado, chega um link para criar uma senha nova. Pode levar alguns minutos.</p>
            <button type="button" className="botao botao--contorno" onClick={() => setModo('entrar')}>Voltar para entrar</button>
          </>
        ) : (
          <form className="form" onSubmit={aoEnviar} noValidate>
            <h1 className="titulo">{modo === 'entrar' ? 'Entrar' : 'Criar senha nova'}</h1>
            <label className="campo-rotulo">E-mail
              <input className="campo" type="email" autoComplete="username" value={email}
                onChange={(e) => setEmail(e.target.value)} autoFocus />
            </label>
            {modo === 'entrar' && (
              <label className="campo-rotulo">Senha
                <input className="campo" type="password" autoComplete="current-password" value={senha}
                  onChange={(e) => setSenha(e.target.value)} />
              </label>
            )}
            {erro && <p className="erro" role="alert">{erro}</p>}
            <button type="submit" className="botao botao--principal" disabled={ocupado}>
              {ocupado ? 'Aguarde...' : modo === 'entrar' ? 'Entrar' : 'Enviar link por e-mail'}
            </button>
            <button type="button" className="link-botao" onClick={() => { setErro(''); setModo(modo === 'entrar' ? 'esqueci' : 'entrar') }}>
              {modo === 'entrar' ? 'Esqueci minha senha' : 'Voltar para entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
