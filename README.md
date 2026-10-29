# RP Pitaya: painel do produtor

Painel para o produtor do sítio Raízes Popolim acompanhar as reservas e cuidar das variedades.
Fica separado do site público (`rp-pitaya-reservas`) e só abre para quem está na tabela `admins`
do Supabase.

## O que tem

- **Dashboard:** filtro de período (7 dias, mês, 3 meses, 6 meses, 1 ano); reservas, pitaias,
  valor reservado e valor pago, com comparação ao período anterior; gráfico de linha por dia,
  semana ou mês conforme o período; gráficos por status e por variedade; versão em tabela.
- **Reservas:** lista compacta com detalhe ao lado, filtro por status, busca por nome ou telefone, troca de status,
  anotações, botão "Chamar no WhatsApp" com mensagem pronta e "Baixar planilha" (CSV para Excel).
- **Variedades:** cadastrar, editar, mudar preço, marcar como disponível ou esgotada, esconder do
  site e trocar a foto.
- Login com e-mail e senha, "Esqueci minha senha" e atualização automática a cada minuto.
- Menu lateral no computador e barra inferior no celular; tema claro, escuro ou automático.

## Tecnologias

React 19 + Vite, CSS próprio com tema claro e escuro (fonte Geist). Conversa com o Supabase direto pela API REST (sem biblioteca extra).
O banco, as regras de acesso e a função de reserva estão em `rp-pitaya-reservas/supabase/`.

## Publicar na Cloudflare Pages

- Framework: React (Vite)
- Comando de build: `npm run build`
- Pasta de saída: `dist`
- Variável de ambiente: `NODE_VERSION` = `22`

## Configurar no Supabase (uma vez)

Em **Authentication → URL Configuration**:

- **Site URL:** o endereço deste painel (por exemplo `https://rp-pitaya-admin.pages.dev`)
- **Redirect URLs:** o mesmo endereço

Isso faz o link de "Esqueci minha senha" voltar para o painel.

## Rodar no computador

```bash
npm install
npm run dev
```
