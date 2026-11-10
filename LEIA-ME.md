# Lojix — sistema por assinatura para vários ramos

Um sistema só. O lojista cria a conta, escolhe o ramo e o menu já vem montado:

| Ramo | Telas além de Painel, Vender, Caixa, Clientes, Produtos |
|---|---|
| Oficina | Ordens de serviço (placa, modelo, km), Serviços |
| Assistência técnica | Ordens de serviço (modelo, IMEI, acessórios), Serviços |
| Pet shop | Agenda, Pets, Retornos, Profissionais, Serviços |
| Salão, barbearia e manicure | Agenda em lista e grade, Profissionais, Comissões, Pacotes, Retornos e aniversários |
| Clínica de estética | Tudo do salão + ficha da cliente (alergias, saúde, objetivo) |
| Restaurante / Lanchonete | Comandas (mesas, 10% opcional), Cardápio |
| Loja | PDV simples, estoque |

Cada ramo tem a sua cor (muda sozinha ao escolher o ramo) e o sistema acompanha o modo claro/escuro do aparelho.

**Agenda (salão, estética, pet shop):** faixa de 10 dias com a contagem de horários, filtro por profissional, visão em lista ou grade por horário (clique num horário vazio para agendar), aviso de choque de horário do mesmo profissional, confirmação por WhatsApp, "Atendido · receber" (gera a venda com a comissão) e "Faltou"/"Cancelou" que liberam a vaga. Se a cliente tem pacote pago do mesmo serviço, o sistema oferece descontar uma sessão em vez de cobrar.

## Testar agora (sem Firebase)
Abra `index.html` por um servidor (módulos não rodam por `file://`):
`python3 -m http.server` na pasta e acesse `localhost:8000`. Clique em **Testar sem cadastro**.
Os dados ficam só no navegador.

## Ligar o cadastro de clientes (Firebase)
1. console.firebase.google.com → criar projeto → **Authentication** → ativar E-mail/senha.
2. **Firestore Database** → criar → aba **Regras** → colar o conteúdo de `firestore.rules` → Publicar.
3. Configurações do projeto → App da Web → copiar os dados para `js/config.js`.
4. Authentication → Configurações → Domínios autorizados → adicionar o domínio onde publicar (ex.: `seuusuario.github.io`).
5. **Você como administrador:** crie sua conta no sistema; depois, no Firestore, crie a coleção `admins` com um documento cujo **ID é o seu e-mail em minúsculas** (pode deixar um campo qualquer). Aparece o menu **Assinantes**, onde você dá +30 dias, ativa ou bloqueia.
6. Em `js/config.js` preencha `suporteWhatsapp` (só números com DDD) para o botão de renovação.
7. Publicar: GitHub Pages (enviar a pasta inteira).

## Como funciona a cobrança
Conta nova ganha 7 dias de teste (as regras impedem mais que 8). Vencido, o lojista continua **vendo** os dados, mas as regras do Firestore **recusam gravações** e a tela mostra o bloqueio com o botão de WhatsApp. Você recebe o Pix e clica em **+30 dias**. O bloqueio é nas regras do servidor, não só na tela.

## Adicionar um ramo novo
Em `js/ramos.js`, acrescente uma entrada em `RAMOS` (nome, ícone, `menu`, rótulos, campos da OS se houver) e, se quiser exemplos, um bloco em `exemplos()`. Nada mais.

## Testes
`node tests/teste.mjs` (contas e telas de todos os ramos) e `node tests/fumaca.mjs` (abre o app e aperta os botões).

## Limites (honestos)
- Testado só por simulação em Node. **Ainda não foi aberto num navegador real nem com Firebase real**: faça um cadastro de teste, uma venda e confira o visual no celular antes de vender.
- Numeração de vendas/OS pega o maior número visto; dois aparelhos vendendo no mesmo segundo podem repetir número.
- Sem modo offline/PWA, sem várias filiais, sem emissão de nota fiscal, sem cobrança automática (renovação manual por você).
- A tela de administrador lê todas as empresas: só o e-mail em `admins` acessa.
