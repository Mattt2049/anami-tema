# anami-tema

Tema da loja Anami Fórmulas na Loja Integrada (anamiformulas.com.br), servido via jsDelivr.

## Estrutura

| Arquivo | Função |
|---|---|
| `anami-tokens.css` | Cores, fonte, raios e transições em variáveis. Base que vai junto na migração. |
| `anami-tema.css` | Visual global por cima do tema NVitrine: variáveis `--ns-*`, cabeçalho, menu, banners, cards de produto, PDP, rodapé. |
| `anami-home.css` | Seções da página inicial injetadas pelo core.js (credenciais, como funciona, o que manipulamos, laudo, farmacêutica, depoimentos, FAQ, CTA). |
| `anami-core.js` | Tracking de WhatsApp, botão "Enviar receita" no cabeçalho e no menu, seções da home, preço e CTA da PDP, dados legais. |
| `cabecalho.html` | O que vai no campo **Cabeçalho** do painel: configuração do tema NVitrine (`window.NSThemeData`), fonte, CSS e JS. |
| `rodape.html` | O que vai no campo **Rodapé** do painel (dados legais e schema ficam inline). |
| `img/` | Imagens servidas pelo jsDelivr (foto da farmacêutica). |

A loja usa o tema comprado **NVitrine (nsdigital)**, que monta cabeçalho, menu e rodapé por JavaScript e expõe variáveis `--ns-*` e o objeto `window.NSThemeData`. O core.js espera o evento `ns:onafterload` antes de mexer nessas áreas. Não trocar de tema: a loja de temas da Loja Integrada e o "novo tema padrão" bloqueiam CSS/HTML/JS.

## Fluxo de release

1. Editar, commitar e subir para `main`.
2. Criar tag: `git tag v1.0.1 && git push --tags`.
3. No painel, trocar `@v1.0.0` por `@v1.0.1` (cabeçalho e rodapé).

O `.min` no final da URL é gerado automaticamente pelo jsDelivr; não precisa versionar arquivos minificados.

**Rollback:** voltar a tag anterior no painel. Efeito imediato.

> Evite apontar o painel para `@main`: o jsDelivr guarda branch em cache por horas e a loja pode ficar com versões misturadas. Tags são imutáveis e previsíveis.

## Tracking

O `anami-core.js` envia para `gtag` e `dataLayer`:

- `enviar_prescricao`: clique no CTA de prescrição (origem, produto, página).
- `clique_whatsapp`: qualquer outro link de WhatsApp da loja.

Para marcar a origem de novos CTAs (header, home etc.):

```html
<a href="https://wa.me/5511950358443" data-anami-prescricao data-anami-origem="home-hero">Enviar receita</a>
```

No GA4, marcar `enviar_prescricao` como evento-chave e importar para o Google Ads.

## Observação

O repositório precisa ser **público** para o jsDelivr servir os arquivos. Não coloque chaves, tokens ou dados de clientes aqui.
