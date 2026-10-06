# anami-tema

Tema da loja Anami Fórmulas na Loja Integrada (anamiformulas.com.br), servido via jsDelivr.

## Estrutura

| Arquivo | Função |
|---|---|
| `anami-tokens.css` | Cores, raios e transições em variáveis. Base que vai junto na migração. |
| `anami-tema.css` | Componentes: header, minicarrinho, catálogo, PDP, descrição, rodapé. |
| `anami-core.js` | Header com vidro, preço da PDP, CTA de prescrição, tarja 3x, dados legais, tracking de WhatsApp. |
| `painel/cabecalho.html` | O que vai no campo **Cabeçalho** do painel. |
| `painel/rodape.html` | O que vai no campo **Rodapé** do painel (dados legais e schema ficam inline). |

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
