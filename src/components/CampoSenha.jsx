import { useState } from 'react'
import { IconeOlho, IconeOlhoFechado } from './Icones'

// Campo de senha com o olhinho: toca para mostrar, toca de novo para esconder.
export function CampoSenha({ rotulo, ...props }) {
  const [mostrar, setMostrar] = useState(false)
  return (
    <label className="campo-rotulo">{rotulo}
      <span className="campo-senha">
        <input className="campo" type={mostrar ? 'text' : 'password'} autoCapitalize="none" autoCorrect="off" spellCheck={false} {...props} />
        <button type="button" className="campo-senha__olho" onClick={() => setMostrar((m) => !m)} aria-pressed={mostrar}
          aria-label={mostrar ? 'Esconder senha' : 'Mostrar senha'} title={mostrar ? 'Esconder senha' : 'Mostrar senha'}>
          {mostrar ? <IconeOlhoFechado tamanho={19} /> : <IconeOlho tamanho={19} />}
        </button>
      </span>
    </label>
  )
}
