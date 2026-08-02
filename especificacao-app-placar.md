# App de Placar — Truco & Fodinha

## Objetivo
Criar um app web **responsivo** (funciona bem em celular e desktop), feito em **HTML + CSS + JavaScript puro** (sem frameworks, sem build step), para marcar pontuação de dois jogos de carta jogados entre amigos: **Truco** (contagem simples) e **Fodinha** (jogo próprio do grupo).

Prioridades técnicas:
- Leveza e velocidade de carregamento (sem dependências externas, sem bundler).
- Funcionar 100% offline depois de carregado uma vez.
- Persistir dados no **localStorage** do navegador (não pode perder a partida se a pessoa fechar a aba/app sem querer).
- Botões grandes e fáceis de tocar (o app vai ser usado no celular, durante o jogo, entre amigos, possivelmente com pressa).

## Estrutura de arquivos sugerida
```
/index.html          -> tela principal (menu)
/truco.html           -> tela do Truco
/fodinha.html         -> tela do Fodinha
/css/style.css        -> estilos compartilhados
/js/storage.js        -> funções genéricas de leitura/escrita no localStorage
/js/truco.js          -> lógica do Truco
/js/fodinha.js         -> lógica do Fodinha
```
(O Claude Code pode ajustar a organização de arquivos se achar melhor, mas manter tudo em JS puro, sem npm/bundlers.)

---

## Direção visual (design)

O app deve ter uma identidade visual **própria e caprichada**, remetendo a uma mesa de baralho entre amigos — nada de template genérico de dashboard.

**Paleta:**
- `#1C4A3E` — verde feltro (fundo principal, remete ao pano de mesa de jogo)
- `#6B4226` — marrom madeira (bordas, molduras, superfícies secundárias)
- `#F1E6D0` — marfim/carta (fundo dos cards de conteúdo, texto sobre o verde)
- `#B23A2E` — vermelho naipe (ações de destaque, ex: "levou pedrinha", botão de reset)
- `#C9A227` — dourado (destaques, líder do ranking, vencedor)
- `#8A8D91` — cinza pedra (cor das pedrinhas)

**Tipografia:**
- Display/títulos: uma fonte com personalidade de "placar escrito à mão" — algo como **Fredoka** ou **Bagel Fat One** (Google Fonts), usada nos títulos e nos números grandes de placar.
- Corpo/inputs: fonte limpa e legível — **Inter** ou **Work Sans**.
- Números de placar: usar `font-variant-numeric: tabular-nums` para os dígitos alinharem bonito.

**Layout:**
- Painéis com cantos arredondados, lembrando cartas de baralho (fundo marfim `#F1E6D0`, sombra leve) sobre o fundo verde feltro.
- Botões grandes, estilo "ficha de jogo", com leve efeito de profundidade (sombra ou borda inferior mais escura) pra parecer clicável/tocável.
- Evitar gradientes genéricos, ícones de estoque óbvios ou qualquer coisa que pareça "template de SaaS".

**Elemento de assinatura (o mais importante):** no Fodinha, as pedrinhas **não devem ser só um número** — desenhar um pequeno ícone de pedrinha (SVG simples, formato de seixo irregular, cor `#8A8D91` com uma sombrinha sutil) e mostrar essas pedrinhas **em fileira ao lado do nome de cada jogador**, uma pedrinha por ponto perdido, tipo uma "conta de pedrinha" real de mesa de bar. Se o número ficar muito alto (mais de ~10), pode agrupar visualmente (ex: pilhas de 5) ou mostrar o ícone + o número ao lado, mas a pedrinha ilustrada é o elemento central da tela de ranking.

- Micro-interação sugerida: quando um jogador leva uma pedrinha nova, ela pode "cair" ou aparecer com uma pequena animação (nada exagerado, só um feedback visual rápido).
- Respeitar acessibilidade: contraste de texto legível sobre o verde feltro, área de toque grande nos botões, `prefers-reduced-motion` respeitado nas animações.

---

## Tela principal (`index.html`)
- Título do app.
- Dois botões/cards grandes, lado a lado (ou empilhados no mobile):
  1. **Truco**
  2. **Fodinha**
- Cada botão leva para a respectiva tela.
- Se houver uma partida em andamento salva no localStorage (de qualquer um dos dois jogos), mostrar um aviso tipo "Você tem uma partida em andamento" com opção de continuar ou começar uma nova (descartando a salva).

---

## Módulo 1: Truco (contagem simples)

Sem regras de aposta (truco/seis/nove/doze) — é só um contador de pontos manual.

### Setup
- Perguntar quantos **times/jogadores** vão jogar (mínimo 2, sem limite máximo definido — mas o uso comum é 2).
- Campo de texto pra nomear cada time (ex: "Nós" e "Eles", ou nomes customizados).

### Tela de jogo
- Mostrar o placar de cada time em destaque (número grande).
- Para cada time, botões de incremento rápido: **+1**, **+2**, **+3** (valores comuns de mão de truco) e um campo/botão de **valor customizado** para somar qualquer número.
- Botão de **-1** (ou correção manual) para cada time, para corrigir erros de digitação.
- Botão **Desfazer última jogada** (undo) — volta o placar ao estado anterior à última alteração.
- Botão **Reiniciar partida** (com confirmação, pois zera os placares).
- Estado salvo automaticamente no localStorage a cada alteração (times, nomes e placar atual).

---

## Módulo 2: Fodinha

### Regra do jogo (pra você, Claude Code, entender o que está implementando)
- Fodinha é jogado com 2 ou mais jogadores.
- A cada rodada, cada jogador recebe um número de cartas. Esse número **começa em 1**, vai **subindo a cada rodada** até um máximo, e depois **volta a descer até 1 de novo** — formato "sobe e desce" (ping-pong), repetindo esse ciclo indefinidamente (não tem fim de jogo definido).
- Em cada rodada, cada jogador **declara quantas vazas (pontos) ele acha que vai fazer** naquela rodada.
- No final da rodada, compara-se o que ele declarou com o que ele **realmente fez**.
- Se **declarado ≠ realizado**, o jogador ganha **1 "pedrinha"** na contagem dele.
- Se **declarado = realizado**, não ganha pedrinha.
- **Vence quem tiver MENOS pedrinhas** (não tem fim definido — é um ranking contínuo, os amigos decidem quando parar de jogar).

### Setup
- Perguntar **quantos jogadores** vão jogar (mínimo 2, sem limite máximo).
- Campo de texto pra nomear cada jogador.
- Calcular automaticamente o número máximo de cartas por rodada como referência sugerida: `max_cartas = floor(40 / número_de_jogadores)` (regra clássica do baralho de 40 cartas), mas **permitir edição manual** desse máximo, caso o grupo jogue diferente.

### Lógica das rodadas
- O app controla o **número de cartas da rodada atual**, seguindo o padrão sobe-desce (1, 2, 3, ..., máximo, ..., 3, 2, 1, 2, 3, ...), avançando automaticamente a cada rodada.
- Esse número deve aparecer em destaque no topo da tela de rodada ("Rodada de X carta(s)").
- Permitir **edição manual** do número de cartas da rodada atual, caso o grupo precise ajustar na hora.

### Tela de rodada (registro de pontos)
Para a rodada atual, mostrar uma lista com todos os jogadores, e para cada um:
- Campo numérico: **quantos pontos ele apostou** (declarou) que vai fazer.
- Campo numérico: **quantos pontos ele realmente fez** (preenchido no fim da rodada).
- O app calcula automaticamente se ele "bateu" ou não, e adiciona a pedrinha se necessário.
- Botão **"Fechar rodada"**: confirma os valores de todos os jogadores da rodada, aplica as pedrinhas, avança pro número de cartas da próxima rodada.

### Placar / Ranking
- Tela (ou seção) com o **ranking dos jogadores ordenado por menos pedrinhas primeiro**.
- Cada jogador deve mostrar suas pedrinhas como **ícones visuais de pedrinha** (ver seção "Direção visual" acima), não só um número cru — é o elemento visual central dessa tela.
- O jogador em primeiro lugar (menos pedrinhas) pode ganhar um destaque sutil (ex: uma coroa pequena ou o dourado `#C9A227` no nome).
- Deve atualizar em tempo real conforme as rodadas vão sendo fechadas.

### Edição / correção
- Botão **"Desfazer última rodada"**: reverte a última rodada fechada (remove as pedrinhas aplicadas e volta os campos pra edição).
- Permitir **editar uma rodada anterior específica** (ex: um histórico de rodadas clicável, que abre e permite corrigir os valores daquela rodada — recalculando as pedrinhas a partir dali).
- Botão **"Reiniciar partida"** (com confirmação).
- Estado salvo automaticamente no localStorage: jogadores, pedrinhas, histórico completo de rodadas (apostado/realizado por jogador em cada rodada), e a rodada atual.

---

## Requisitos gerais de UI/UX
- **Prioridade máxima: celular.** O app vai ser usado no celular, ao vivo, durante o jogo — não é "responsivo genérico que também funciona no desktop", é **mobile-first de verdade**. Desenhar e testar primeiro pensando em uma tela de ~375–430px de largura, em pé (retrato), e só depois adaptar pra telas maiores.
- Botões e campos de input principais (marcar pontos, apostado/realizado, +1/-1) devem ficar na parte de baixo/meio da tela, dentro do alcance do polegar (uso com uma mão só é comum nesse tipo de app).
- Números grandes o suficiente pra ler de relance na mesa (placar e pedrinhas), mesmo com pouca luz ou de longe.
- Inputs numéricos devem abrir o teclado numérico do celular (`inputmode="numeric"` ou `type="number"`), sem precisar trocar de teclado.
- Evitar qualquer elemento que dependa de hover (menus que só aparecem passando o mouse, tooltips) — no celular isso não existe.
- Testar em pelo menos uma viewport pequena (tipo iPhone SE, ~375px) pra garantir que nada corta ou fica apertado.
- Design **mobile-first**, responsivo (funciona bem também em desktop/tablet, mas o celular é a experiência principal).
- Botões grandes, com bom espaçamento (uso durante o jogo, sem precisar de precisão cirúrgica no toque).
- Números de placar em destaque (fonte grande, alto contraste).
- Confirmação (modal ou dialog simples) antes de ações destrutivas: reiniciar partida, descartar partida salva.
- Botão de "Voltar ao menu" visível nas telas de Truco e Fodinha.
- Visual simples e direto — não precisa ser bonito no sentido "app comercial", mas deve ser **legível e rápido de usar no meio do jogo**.

## Modelo de dados sugerido (localStorage)

```json
// truco_state
{
  "times": [
    { "nome": "Nós", "pontos": 0 },
    { "nome": "Eles", "pontos": 0 }
  ],
  "historico": [ /* snapshots pra undo */ ]
}

// fodinha_state
{
  "jogadores": [
    { "nome": "Fulano", "pedrinhas": 0 }
  ],
  "maxCartas": 8,
  "rodadaAtual": { "numeroCartas": 1, "direcao": "subindo" },
  "historicoRodadas": [
    {
      "numeroCartas": 1,
      "jogadas": [
        { "jogador": "Fulano", "apostado": 1, "realizado": 0, "levouPedrinha": true }
      ]
    }
  ]
}
```

## Critérios de aceite (checklist pro Claude Code validar no final)
- [ ] Tela inicial com as duas opções (Truco / Fodinha) funcionando.
- [ ] Truco: cadastro de times, incremento/decremento de pontos, undo, reset, persistência.
- [ ] Fodinha: cadastro de jogadores, sequência de cartas sobe-desce automática (editável), registro de apostado/realizado por rodada, cálculo automático de pedrinhas, ranking ordenado, undo de rodada, edição de rodada anterior, persistência.
- [ ] App funciona bem em tela de celular (testar em viewport estreito, ~375px, em pé/retrato).
- [ ] Botões principais de marcar pontos ficam acessíveis com uma mão no celular.
- [ ] Inputs numéricos abrem teclado numérico no celular.
- [ ] Recarregar a página não perde a partida em andamento.
- [ ] Nenhuma dependência externa (sem CDN de frameworks JS pesados, sem necessidade de `npm install` pra rodar).
- [ ] Identidade visual aplicada (paleta feltro/madeira/marfim, tipografia definida, nada de template genérico).
- [ ] Pedrinhas do Fodinha exibidas como ícones visuais (não só números), uma por ponto perdido.
