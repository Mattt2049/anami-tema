/* ============================================================
   ANAMI FÓRMULAS — CORE JS (Loja Integrada)
   Substitui: "cabeçalho v2", "12 para 3 vezes", "botão enviar
   prescrição", "Redesign do produto" e o script dos dados legais.
   ============================================================ */
(function () {
    'use strict';

    var VERSAO = '1.0.0';
    var WHATSAPP = '5511950358443';
    var CNPJ = '46.555.995/0001-58';

    document.documentElement.classList.add('anami-js');

    /* ---------- utilidades ---------- */

    function quandoPronto(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn, { once: true });
        } else {
            fn();
        }
    }

    function textoLimpo(el) {
        return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    }

    function emPaginaDeProduto() {
        return !!document.querySelector('.principal .acoes-produto');
    }

    /* ---------- tracking ---------- */

    function rastrear(evento, parametros) {
        parametros = parametros || {};
        try {
            if (typeof window.gtag === 'function') {
                window.gtag('event', evento, parametros);
            }
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push(Object.assign({ event: evento }, parametros));
        } catch (e) { /* tracking nunca quebra a loja */ }
    }

    /* Qualquer link de WhatsApp na loja vira evento.
       Para marcar a origem, use data-anami-origem="home-hero", etc. */
    function iniciarTrackingWhatsApp() {
        document.addEventListener('click', function (ev) {
            var link = ev.target.closest && ev.target.closest(
                'a[href*="wa.me"], a[href*="api.whatsapp.com"], a[href*="whatsapp.com/send"]'
            );
            if (!link) return;

            var ehPrescricao = link.hasAttribute('data-anami-prescricao');
            rastrear(ehPrescricao ? 'enviar_prescricao' : 'clique_whatsapp', {
                origem: link.getAttribute('data-anami-origem') || 'indefinida',
                produto: link.getAttribute('data-anami-produto') || '',
                pagina: location.pathname
            });
        }, true);
    }

    /* ---------- 1. cabeçalho com vidro ---------- */

    function iniciarCabecalho() {
        var LIMITE = 40;
        var pendente = false;

        function atualizar() {
            pendente = false;
            var cab = document.getElementById('cabecalho');
            if (!cab) return;
            var y = window.pageYOffset || document.documentElement.scrollTop || 0;
            cab.classList.toggle('anami-cabecalho-rolado', y > LIMITE);
        }

        window.addEventListener('scroll', function () {
            if (pendente) return;
            pendente = true;
            (window.requestAnimationFrame || function (f) { setTimeout(f, 16); })(atualizar);
        }, { passive: true });

        atualizar();
    }

    /* ---------- 2. preço da PDP ---------- */

    function paraNumero(texto) {
        if (!texto) return NaN;
        return Number(texto.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
    }

    function formatarPrecos() {
        document.querySelectorAll('.principal .acoes-produto .preco-promocional[data-sell-price]')
            .forEach(function (el) {
                var dado = el.getAttribute('data-sell-price');
                var atual = (dado !== null && dado !== '' && isFinite(Number(dado)))
                    ? Number(dado)
                    : paraNumero(el.textContent);

                if (!isFinite(atual)) {
                    el.removeAttribute('data-anami-desconto');
                    return;
                }

                var formatado = atual.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                var partes = formatado.split(',');
                var assinatura = partes[0] + ',' + (partes[1] || '00');

                var jaFormatado = el.dataset.anamiPrecoFormatado === assinatura &&
                    el.querySelector('.anami-preco-inteiro');

                if (!jaFormatado) {
                    el.innerHTML =
                        '<span class="anami-preco-moeda">R$</span>' +
                        '<span class="anami-preco-inteiro">' + partes[0] + '</span>' +
                        '<span class="anami-preco-centavos">' + (partes[1] || '00') + '</span>';
                    el.dataset.anamiPrecoFormatado = assinatura;
                }

                var bloco = el.closest('.preco-produto');
                var antigo = bloco ? paraNumero(textoLimpo(bloco.querySelector('.preco-venda'))) : NaN;
                var pct = (isFinite(antigo) && antigo > atual && atual > 0)
                    ? Math.round((antigo - atual) / antigo * 100)
                    : 0;

                if (pct >= 1) {
                    el.setAttribute('data-anami-desconto', pct + '% OFF');
                } else {
                    el.removeAttribute('data-anami-desconto');
                }
            });
    }

    /* ---------- 3. CTA de prescrição na PDP ---------- */

    var ICONE_WHATSAPP =
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.1 1.6 5.9L.2 24l6.5-1.7a11.8 11.8 0 0 0 5.4 1.3h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.3-6.1-3.5-8.3Zm-8.4 18.1h-.1a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.8 1 1-3.7-.2-.4a9.7 9.7 0 0 1-1.5-5.2C2.1 6.4 6.5 2 12.1 2c2.7 0 5.1 1 7 2.9s2.9 4.3 2.9 7c0 5.4-4.5 9.7-9.9 9.7Zm5.4-7.3c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-1.5-.7-2.5-1.3-3.5-2.9-.3-.5.3-.5.8-1.7.1-.2.1-.4 0-.6-.1-.2-.7-1.7-.9-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.1 1.4 3.3c.2.2 2.4 3.7 5.8 5.1.8.3 1.4.5 1.8.6.8.3 1.5.2 2.1.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4 0-.1-.2-.2-.5-.3Z"/></svg>';

    function garantirCtaPrescricao() {
        var botao = document.querySelector('a.botao.botao-comprar.principal.grande.botao-comprar-ajax');
        if (!botao || !botao.parentNode) return;
        if (botao.parentNode.querySelector('.anami-whatsapp-produto')) return;

        var produto = textoLimpo(
            document.querySelector('.principal .info-principal-produto .nome-produto') ||
            document.querySelector('h1.nome-produto')
        );
        var mensagem = produto
            ? 'Olá! Gostaria de enviar a prescrição do produto: ' + produto + '.'
            : 'Olá! Gostaria de enviar uma prescrição.';

        var link = document.createElement('a');
        link.className = 'anami-whatsapp-produto';
        link.href = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(mensagem);
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', 'Enviar prescrição pelo WhatsApp');
        link.setAttribute('data-anami-prescricao', '');
        link.setAttribute('data-anami-origem', 'pdp');
        link.setAttribute('data-anami-produto', produto);
        link.innerHTML = ICONE_WHATSAPP + '<span>Enviar prescrição</span>';

        botao.classList.add('anami-botao-principal');
        botao.parentNode.insertBefore(link, botao.nextSibling);
    }

    /* Um observer só, restrito à área de compra da PDP. */
    function iniciarProduto() {
        if (!emPaginaDeProduto()) return;

        var rodar = function () {
            formatarPrecos();
            garantirCtaPrescricao();
        };
        rodar();

        if (!window.MutationObserver) return;
        new MutationObserver(rodar).observe(
            document.querySelector('.principal .acoes-produto'),
            { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['data-sell-price'] }
        );
    }

    /* ---------- 4. dados legais no rodapé ---------- */

    function moverDadosLegais() {
        var bloco = document.getElementById('anami-dados-legais');
        if (!bloco || bloco.dataset.movido) return true;

        var alvos = document.querySelectorAll('.span9.span12');
        for (var i = 0; i < alvos.length; i++) {
            if (alvos[i].textContent.indexOf(CNPJ) !== -1) {
                var copyright = alvos[i].querySelector('p');
                if (copyright) {
                    copyright.parentNode.insertBefore(bloco, copyright.nextSibling);
                } else {
                    alvos[i].appendChild(bloco);
                }
                bloco.dataset.movido = '1';
                return true;
            }
        }
        return false;
    }

    function iniciarDadosLegais() {
        if (moverDadosLegais()) return;
        /* Nova tentativa; se o alvo não existir, mostra onde estiver. */
        setTimeout(function () {
            if (!moverDadosLegais()) {
                var bloco = document.getElementById('anami-dados-legais');
                if (bloco) bloco.dataset.movido = 'fallback';
            }
        }, 1200);
    }

    /* ---------- inicialização ---------- */

    function iniciar() {
        var modulos = [iniciarCabecalho, iniciarProduto, iniciarDadosLegais, iniciarTrackingWhatsApp];
        modulos.forEach(function (m) {
            try { m(); } catch (e) {
                if (window.console) console.warn('[anami] falha em ' + m.name, e);
            }
        });
    }

    quandoPronto(iniciar);

    window.anami = { versao: VERSAO, rastrear: rastrear };
})();
