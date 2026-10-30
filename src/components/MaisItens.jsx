// Rodapé da lista: mostra 10 por vez, com "mais 5", "todas" e "recolher".
export const POR_PAGINA = 10

export function MaisItens({ mostrando, total, setLimite }) {
  if (total <= POR_PAGINA) return null
  const tudo = mostrando >= total
  return (
    <div className="mais-itens">
      <span className="mais-itens__conta">Mostrando {mostrando} de {total}</span>
      <div className="mais-itens__botoes">
        {!tudo && (
          <>
            <button type="button" className="botao botao--secundario" onClick={() => setLimite((l) => l + 5)}>
              Mostrar mais {Math.min(5, total - mostrando)}
            </button>
            <button type="button" className="botao botao--secundario" onClick={() => setLimite(total)}>Mostrar todas</button>
          </>
        )}
        {mostrando > POR_PAGINA && (
          <button type="button" className="botao botao--secundario" onClick={() => setLimite(POR_PAGINA)}>Recolher</button>
        )}
      </div>
    </div>
  )
}
