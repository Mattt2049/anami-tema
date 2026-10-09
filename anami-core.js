/* ============================================================
   ANAMI FÓRMULAS — CORE JS (Loja Integrada + tema NVitrine)
   Módulos: tracking de WhatsApp, cabeçalho (botão "Enviar receita"),
   menu, botão flutuante, página de produto (preço, garantias, descrição em
   blocos), categoria (texto no fim da lista), dados legais e seções da home.
   ============================================================ */
(function () {
    'use strict';

    var VERSAO = '1.3.0';
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

    /* O tema NVitrine monta cabeçalho, menu e rodapé no DOMContentLoaded e
       avisa com o evento ns:onafterload. Tudo que mexe nessas áreas espera por ele. */
    function quandoTemaPronto(fn) {
        var feito = false;
        function rodar() {
            if (feito) return;
            feito = true;
            try { fn(); } catch (e) { if (window.console) console.warn('[anami]', e); }
        }
        if (window.anamiTemaPronto) return rodar();
        document.addEventListener('ns:onafterload', rodar, { once: true });
        quandoPronto(function () {
            if (!window.NSThemeData) { setTimeout(rodar, 0); }
            setTimeout(rodar, 3000);
        });
    }

    function textoLimpo(el) {
        return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    }

    function emPaginaDeProduto() {
        return !!document.querySelector('.principal .acoes-produto');
    }

    function zap(mensagem) {
        return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(mensagem);
    }

    function criar(html) {
        var t = document.createElement('template');
        t.innerHTML = html.trim();
        return t.content.firstElementChild;
    }

    function aoMudarEstado(fn) {
        if (window.jQuery) {
            window.jQuery(document.body).on('user_state_changed minicart_state_changed', function () {
                setTimeout(fn, 50);
            });
        }
    }

    var ICONE_WHATSAPP =
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.1 1.6 5.9L.2 24l6.5-1.7a11.8 11.8 0 0 0 5.4 1.3h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.3-6.1-3.5-8.3Zm-8.4 18.1h-.1a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.8 1 1-3.7-.2-.4a9.7 9.7 0 0 1-1.5-5.2C2.1 6.4 6.5 2 12.1 2c2.7 0 5.1 1 7 2.9s2.9 4.3 2.9 7c0 5.4-4.5 9.7-9.9 9.7Zm5.4-7.3c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-1.5-.7-2.5-1.3-3.5-2.9-.3-.5.3-.5.8-1.7.1-.2.1-.4 0-.6-.1-.2-.7-1.7-.9-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.1 1.4 3.3c.2.2 2.4 3.7 5.8 5.1.8.3 1.4.5 1.8.6.8.3 1.5.2 2.1.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4 0-.1-.2-.2-.5-.3Z"/></svg>';

    var MENSAGEM_RECEITA = 'Olá! Quero enviar minha receita para orçamento.';

    /* ---------- tracking ---------- */

    /* A Loja Integrada carrega o gtag.js com um dataLayer próprio (LIgtagDataLayer)
       e não expõe window.gtag. Enviar por ali faz o evento chegar na mesma tag do
       Google que a loja já usa (Ads + GA4 combinados). O gtag só lê entradas do
       tipo Arguments, por isso o push é feito dentro de uma função. */
    function viaLI() { window.LIgtagDataLayer.push(arguments); }

    function rastrear(evento, parametros) {
        parametros = parametros || {};
        try {
            if (window.LIgtagDataLayer && typeof window.LIgtagDataLayer.push === 'function') {
                viaLI('event', evento, parametros);
            } else if (typeof window.gtag === 'function') {
                window.gtag('event', evento, parametros);
            }
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push(Object.assign({ event: evento }, parametros));
        } catch (e) { /* tracking nunca quebra a loja */ }
    }

    /* Banners do painel não aceitam data-*: a origem vem da posição
       (full/mini) e o nome vem do alt ou do arquivo da imagem. */
    function origemBanner(link) {
        var area = link.closest('.secao-banners .banner, .banner');
        if (!area) return null;
        var tipo = area.classList.contains('cheio') ? 'banner-full'
            : (/mini/.test(area.className) ? 'banner-mini' : 'banner');
        var img = link.querySelector('img');
        var nome = img ? (img.getAttribute('alt') || '') : '';
        if (!nome && img) {
            nome = (img.getAttribute('src') || '').split('/').pop().replace(/\.\w+$/, '');
        }
        return { origem: tipo, banner: nome.slice(0, 100) };
    }

    function iniciarTrackingWhatsApp() {
        document.addEventListener('click', function (ev) {
            var link = ev.target.closest && ev.target.closest(
                'a[href*="wa.me"], a[href*="api.whatsapp.com"], a[href*="whatsapp.com/send"]'
            );
            if (!link) return;

            var ehPrescricao = link.hasAttribute('data-anami-prescricao');
            var banner = link.hasAttribute('data-anami-origem') ? null : origemBanner(link);
            rastrear(ehPrescricao ? 'enviar_prescricao' : 'clique_whatsapp', {
                origem: link.getAttribute('data-anami-origem') || (banner && banner.origem) || 'indefinida',
                produto: link.getAttribute('data-anami-produto') || '',
                banner: banner ? banner.banner : '',
                pagina: location.pathname
            });
        }, true);

        document.addEventListener('click', function (ev) {
            var el = ev.target.closest && ev.target.closest('[data-anami-evento]');
            if (!el) return;
            rastrear(el.getAttribute('data-anami-evento'), {
                rotulo: el.getAttribute('data-anami-rotulo') || textoLimpo(el).slice(0, 60),
                pagina: location.pathname
            });
        }, true);
    }

    /* ---------- 0. barra do topo: alterna as mensagens ---------- */

    /* O tema só aceita um texto fixo na barra. O cabecalho.html manda várias
       mensagens em <span class="anami-topo-msg">; aqui elas se revezam. */
    function iniciarBarraTopo() {
        var barra = document.querySelector('.ns-banner-top');
        if (!barra || barra.hasAttribute('data-anami-rotacao')) return;
        var msgs = barra.querySelectorAll('.anami-topo-msg');
        if (msgs.length < 2) return;
        barra.setAttribute('data-anami-rotacao', '1');
        barra.classList.add('anami-rotacao');
        var i = 0;
        msgs[0].classList.add('anami-ativa');
        /* Troca sempre; com animações desligadas no aparelho só some o efeito de entrada (CSS).
           Pausa enquanto o mouse ou o foco estão na barra, para dar tempo de clicar no WhatsApp. */
        var pausa = false;
        barra.addEventListener('mouseenter', function () { pausa = true; });
        barra.addEventListener('mouseleave', function () { pausa = false; });
        barra.addEventListener('focusin', function () { pausa = true; });
        barra.addEventListener('focusout', function () { pausa = false; });
        setInterval(function () {
            if (pausa) return;
            msgs[i].classList.remove('anami-ativa');
            i = (i + 1) % msgs.length;
            msgs[i].classList.add('anami-ativa');
        }, 4500);
    }

    /* ---------- 1. cabeçalho: botão "Enviar receita" ---------- */

    function botaoReceita(classe, origem, rotulo) {
        var a = criar('<a class="' + classe + '" href="' + zap(MENSAGEM_RECEITA) + '" target="_blank" rel="noopener noreferrer" ' +
            'data-anami-prescricao data-anami-origem="' + origem + '" aria-label="Enviar receita pelo WhatsApp">' +
            ICONE_WHATSAPP + '<span>' + rotulo + '</span></a>');
        return a;
    }

    function iniciarCabecalho() {
        var cab = document.getElementById('cabecalho');
        if (!cab) return;

        var icones = cab.querySelector('.col-icons');
        if (icones && !icones.querySelector('.anami-header-cta')) {
            var carrinho = icones.querySelector('.carrinho');
            var cta = botaoReceita('anami-header-cta', 'header', 'Enviar receita');
            if (carrinho) icones.insertBefore(cta, carrinho); else icones.appendChild(cta);
        }

        var mobile = cab.querySelector('.col-mobile-menu');
        if (mobile && !mobile.querySelector('.anami-header-cta')) {
            var carrinhoMobile = mobile.querySelector('.carrinho');
            var ctaMobile = botaoReceita('anami-header-cta', 'header-mobile', 'Enviar receita');
            if (carrinhoMobile) mobile.insertBefore(ctaMobile, carrinhoMobile); else mobile.appendChild(ctaMobile);
        }
    }

    /* ---------- 2. menu: item "Envie sua receita" ---------- */

    function iniciarMenu() {
        var desktop = document.querySelector('.main-menu-desktop .nivel-um');
        if (desktop && !desktop.querySelector('.anami-menu-receita')) {
            var li = criar('<li class="offer anami-menu-receita"></li>');
            var a = botaoReceita('', 'menu', 'Envie sua receita');
            a.innerHTML = ICONE_WHATSAPP + '<strong>Envie sua receita</strong>';
            li.appendChild(a);
            var todos = desktop.querySelector('li.all-categories');
            if (todos && todos.nextSibling) desktop.insertBefore(li, todos.nextSibling);
            else desktop.insertBefore(li, desktop.firstChild);
        }

        var mobileMenu = document.querySelector('.main-menu-mobile .primary-menu');
        if (mobileMenu && !mobileMenu.querySelector('.anami-menu-receita')) {
            var liM = criar('<li class="anami-menu-receita"></li>');
            liM.appendChild(botaoReceita('', 'menu-mobile', 'Envie sua receita pelo WhatsApp'));
            mobileMenu.insertBefore(liM, mobileMenu.firstChild);
        }
    }

    /* ---------- 3. botão flutuante do tema: só marca a origem ---------- */

    function iniciarFlutuante() {
        var botao = document.querySelector('.whatsapp-float-button, a[class*="whatsapp-float"]');
        if (botao && !botao.hasAttribute('data-anami-origem')) {
            botao.setAttribute('data-anami-origem', 'flutuante');
        }
    }

    /* ---------- 4. preço da PDP ---------- */

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

    /* ---------- 5. CTA de prescrição na PDP ---------- */

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
        link.href = zap(mensagem);
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

    /* ---------- 5b. PDP: garantias e descrição em blocos ---------- */

    var GARANTIAS = [
        ['escudo', 'Insumos com laudo', 'procedência conferida'],
        ['jaleco', 'Farmacêutica responsável', 'CRF-SP 76104'],
        ['caminhao', 'Entrega para todo o Brasil', 'calcule o frete pelo CEP'],
        ['cadeado', 'Compra segura', 'Pix, cartão ou boleto']
    ];

    function iniciarGarantias() {
        var acoes = document.querySelector('.principal > .acoes-produto') ||
            document.querySelector('.principal .acoes-produto');
        if (!acoes || document.querySelector('.anami-garantias')) return;
        acoes.insertAdjacentHTML('afterend',
            '<ul class="anami-garantias" aria-label="Garantias da Anami">' +
            GARANTIAS.map(function (g) {
                return '<li>' + ICONES[g[0]] + '<span><strong>' + g[1] + '</strong>' + g[2] + '</span></li>';
            }).join('') + '</ul>');
    }

    /* Cada subtítulo (h3) da descrição vira um bloco que abre ao tocar.
       Aceita os dois formatos que existem na loja: h3 solto na descrição ou
       h3 como primeiro filho de uma div. Menos de 2 subtítulos = não mexe.
       Os nós são movidos (nunca recriados), então o texto fica igual para o Google. */
    function tituloDeBloco(el) {
        if (el.tagName === 'H3') return el;
        var primeiro = el.firstElementChild;
        return (/^(DIV|SECTION)$/.test(el.tagName) && primeiro && primeiro.tagName === 'H3') ? primeiro : null;
    }

    function iniciarDescricao() {
        var desc = document.getElementById('descricao');
        if (!desc || desc.hasAttribute('data-anami-acordeao')) return;

        var raiz = desc;
        while (raiz.children.length === 1 && /^(DIV|SECTION|ARTICLE)$/.test(raiz.firstElementChild.tagName)) {
            raiz = raiz.firstElementChild;
        }
        var filhos = Array.prototype.slice.call(raiz.children);
        if (filhos.filter(tituloDeBloco).length < 2) return;
        desc.setAttribute('data-anami-acordeao', '1');

        var corpo = null;
        filhos.forEach(function (el) {
            var h = tituloDeBloco(el);
            if (!h) {
                if (corpo) corpo.appendChild(el);
                return;
            }
            var bloco = document.createElement('details');
            bloco.className = 'anami-acordeao';
            var resumo = document.createElement('summary');
            corpo = document.createElement('div');
            corpo.className = 'anami-acordeao-corpo';
            raiz.insertBefore(bloco, el);
            /* Títulos colados com cor própria (ex.: branco !important para fundo roxo)
               ficariam invisíveis no bloco: o visual do título passa a ser o do tema. */
            h.removeAttribute('style');
            resumo.appendChild(h);
            bloco.appendChild(resumo);
            bloco.appendChild(corpo);
            if (el !== h) corpo.appendChild(el);
        });

        /* O primeiro bloco e os que têm advertências/cuidados ficam sempre abertos. */
        raiz.querySelectorAll('details.anami-acordeao').forEach(function (b, i) {
            if (i === 0 || /advert[êe]ncia|cuidados importantes/i.test(textoLimpo(b))) b.setAttribute('open', '');
        });
    }

    /* ---------- 5c. categoria: texto da categoria no fim da lista ---------- */

    /* O texto que o painel põe na coluna da esquerda (escondida no celular)
       vai para depois dos produtos. Os estilos colados junto com o texto saem;
       o visual vem do anami-catalogo.css. */
    function iniciarCategoria() {
        if (!document.body.classList.contains('pagina-categoria')) return;
        var conteudo = document.querySelector('.secao-principal .conteudo');
        var comp = document.querySelector('.secao-principal .coluna .componente');
        if (!conteudo || !comp || comp.hasAttribute('data-anami-movido')) return;

        var interno = comp.querySelector('.interno') || comp;
        var rotulo = interno.querySelector('h4.titulo');
        if (textoLimpo(interno).length <= textoLimpo(rotulo).length) return;

        var secao = document.createElement('section');
        secao.className = 'anami-cat-texto';
        Array.prototype.slice.call(interno.childNodes).forEach(function (n) {
            if (n !== rotulo) secao.appendChild(n);
        });
        secao.querySelectorAll('[style]:not(img)').forEach(function (el) { el.removeAttribute('style'); });
        secao.querySelectorAll('p').forEach(function (p) {
            if (!p.textContent.trim() && !p.querySelector('img, iframe')) p.parentNode.removeChild(p);
        });

        comp.setAttribute('data-anami-movido', '1');
        conteudo.appendChild(secao);
    }

    /* ---------- 6. dados legais no rodapé ---------- */

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
        setTimeout(function () {
            if (!moverDadosLegais()) {
                var bloco = document.getElementById('anami-dados-legais');
                if (bloco) bloco.dataset.movido = 'fallback';
            }
        }, 1200);
    }

    /* ---------- 7. seções da home ---------- */

    var ICONES = {
        escudo: '<svg class="anami-i" viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
        jaleco: '<svg class="anami-i" viewBox="0 0 24 24"><circle cx="12" cy="6" r="3"/><path d="M5 21v-5a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v5"/><path d="M12 11v10M9 11l3 4 3-4"/></svg>',
        caminhao: '<svg class="anami-i" viewBox="0 0 24 24"><path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/></svg>',
        cadeado: '<svg class="anami-i" viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></svg>',
        capsula: '<svg class="anami-ilustra" viewBox="0 0 64 64"><rect x="10" y="24" width="44" height="18" rx="9" transform="rotate(-35 32 33)"/><path d="M26 22l12 17"/><circle cx="48" cy="48" r="3"/><circle cx="14" cy="50" r="2"/></svg>',
        vitamina: '<svg class="anami-ilustra" viewBox="0 0 64 64"><path d="M20 10h24v8H20z"/><path d="M22 18h20l2 34H20z"/><path d="M26 30h12M26 38h12"/></svg>',
        treino: '<svg class="anami-ilustra" viewBox="0 0 64 64"><path d="M8 26h8v12H8zM48 26h8v12h-8zM16 29h32v6H16z"/><path d="M4 30h4v4H4zM56 30h4v4h-4z"/></svg>',
        beleza: '<svg class="anami-ilustra" viewBox="0 0 64 64"><rect x="22" y="22" width="20" height="32" rx="6"/><path d="M27 22v-8h10v8"/><path d="M30 10h4"/></svg>',
        gota: '<svg class="anami-ilustra" viewBox="0 0 64 64"><path d="M32 10c-8 12-12 18-12 25a12 12 0 0 0 24 0c0-7-4-13-12-25z"/><path d="M27 37a5 5 0 0 0 5 5"/></svg>',
        receita: '<svg class="anami-ilustra" viewBox="0 0 64 64"><path d="M16 8h24l8 8v40H16z"/><path d="M40 8v8h8"/><path d="M24 30h16M24 38h16M24 46h10"/></svg>',
        coracao: '<svg class="anami-marca" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 88 C20 66 8 52 8 34 A18 18 0 0 1 50 24 A18 18 0 0 1 92 34 C92 52 80 66 50 88 Z"/></svg>'
    };

    function botaoHtml(classe, origem, texto, href, prescricao) {
        return '<a class="anami-botao ' + classe + '" href="' + (href || zap(MENSAGEM_RECEITA)) + '"' +
            (href ? '' : ' target="_blank" rel="noopener noreferrer"') +
            (prescricao ? ' data-anami-prescricao' : '') +
            ' data-anami-origem="' + origem + '">' + (prescricao ? ICONE_WHATSAPP : '') + texto + '</a>';
    }

    var SECOES = {
        credenciais: function () {
            return '<section class="anami-secao anami-credenciais" data-anami-secao="credenciais" aria-label="Por que comprar na Anami">' +
                '<ul>' +
                '<li><strong>Receita pelo WhatsApp</strong>foto da prescrição, orçamento grátis e sem sair de casa</li>' +
                '<li><strong>Farmacêutica no atendimento</strong>quem manipula responde você · CRF-SP 76104</li>' +
                '<li><strong>Laudo de cada ativo</strong>matéria-prima certificada, conferida lote a lote</li>' +
                '<li><strong>Entrega em todo o Brasil</strong>envio rastreado ou retirada em São Caetano do Sul</li>' +
                '</ul></section>';
        },
        como: function () {
            return '<section class="anami-secao anami-como" data-anami-secao="como-funciona" id="anami-receita">' +
                '<div>' +
                '<span class="anami-eyebrow">Envie sua receita</span>' +
                '<h2>Sua receita vira fórmula sem você sair de casa.</h2>' +
                '<p class="anami-lead">Mande a foto da prescrição pelo WhatsApp. A farmacêutica confere, você aprova o orçamento e a fórmula chega na sua porta.</p>' +
                '<div class="anami-botoes">' +
                botaoHtml('', 'home-como-funciona', 'Enviar receita agora', null, true) +
                botaoHtml('anami-botao--secundario', 'home-ver-produtos', 'Ver suplementos', '/vitaminas-e-suplementos') +
                '</div>' +
                '<p class="anami-nota">' + ICONES.escudo + 'Orçamento grátis e sem compromisso · segunda a sábado</p>' +
                '</div>' +
                '<aside class="anami-rx" aria-label="Como funciona o envio de receita">' +
                '<div class="anami-rx-topo"><strong>Rx</strong><span>Como funciona,<br>em 3 passos</span></div>' +
                '<ol class="anami-passos">' +
                '<li><span class="anami-n">1</span><div><h3>Mande a foto</h3><p>Receita de médico, dentista ou nutricionista. Vale foto do papel ou print.</p></div></li>' +
                '<li><span class="anami-n">2</span><div><h3>A farmacêutica confere</h3><p>Dose, forma e compatibilidade dos ativos. O orçamento chega no seu WhatsApp.</p></div></li>' +
                '<li><span class="anami-n">3</span><div><h3>Pague e receba</h3><p>Pix, cartão ou boleto. Entrega em todo o Brasil ou retirada em São Caetano do Sul.</p></div></li>' +
                '</ol>' +
                '<div class="anami-assinatura"><span>Farmacêutica responsável<br>CRF-SP 76104</span><em>Camilla</em></div>' +
                '</aside></section>';
        },
        bento: function () {
            function forma(classe, href, icone, titulo, texto, extra, evento) {
                return '<a class="anami-forma ' + classe + '" href="' + href + '" data-anami-evento="clique_categoria_home" data-anami-rotulo="' + titulo + '"' + (evento || '') + '>' +
                    icone + '<div><h3>' + titulo + '</h3><p>' + texto + '</p>' + (extra || '') + '</div></a>';
            }
            return '<section class="anami-secao anami-formas" data-anami-secao="o-que-manipulamos">' +
                '<div class="anami-cabeca"><div><span class="anami-eyebrow">O que manipulamos</span><h2>Tudo o que a sua rotina pede, na dose certa.</h2></div></div>' +
                '<div class="anami-bento">' +
                '<a class="anami-forma anami-forma--principal" href="' + zap(MENSAGEM_RECEITA) + '" target="_blank" rel="noopener noreferrer" data-anami-prescricao data-anami-origem="home-bento">' +
                ICONES.receita + '<div><h3>Manipulados com receita</h3><p>Cápsulas, gotas, cremes e sachês na dose exata da sua prescrição. Orçamento grátis pelo WhatsApp.</p>' +
                '<span class="anami-botao anami-botao--menta">Enviar receita</span></div></a>' +
                forma('', '/vitaminas-e-suplementos', ICONES.vitamina, 'Vitaminas e suplementos', 'Vitaminas, minerais e ômega 3 prontos para enviar.') +
                forma('', '/performance', ICONES.treino, 'Performance', 'Creatina, aminoácidos e pré-treino.') +
                forma('', '/beleza', ICONES.beleza, 'Beleza', 'Colágeno e fórmulas para pele, cabelos e unhas.') +
                forma('', '/sublinguais', ICONES.gota, 'Sublinguais', 'Gotas de absorção rápida, práticas de usar.') +
                '</div></section>';
        },
        laudo: function () {
            return '<section class="anami-secao" data-anami-secao="laudo" id="anami-laudo">' +
                '<div class="anami-laudo">' +
                '<div><span class="anami-eyebrow">Qualidade</span><h2>Cada ativo chega com laudo. E a gente confere.</h2>' +
                '<p class="anami-lead">Compramos de fornecedores certificados, como Biotec, Fagron e Galena, e conferimos o laudo de cada lote antes de manipular. Quer ver o laudo do seu ativo? É só pedir.</p>' +
                botaoHtml('anami-botao--menta', 'home-laudo', 'Pedir o laudo de um ativo', zap('Olá! Quero ver o laudo de um ativo.')) +
                '</div>' +
                '<div class="anami-criterios">' +
                '<details open><summary>Identidade</summary><p>O ativo é exatamente o que o fornecedor declarou: comparamos o laudo com a especificação antes de usar.</p></details>' +
                '<details><summary>Teor e pureza</summary><p>Concentração certa e sem contaminantes, dentro dos limites da farmacopeia.</p></details>' +
                '<details><summary>Procedência</summary><p>Lote, fabricante e validade de cada matéria-prima ficam registrados na sua fórmula.</p></details>' +
                '<details><summary>Ativos patenteados</summary><p>Quando a receita pede um ativo de marca, usamos o original, com certificado do fabricante.</p></details>' +
                '</div></div></section>';
        },
        farmaceutica: function () {
            return '<section class="anami-secao anami-farm" data-anami-secao="farmaceutica" id="anami-farmaceutica">' +
                '<figure><img class="anami-retrato" src="' + FOTO_CAMILLA + '" alt="Camilla, farmacêutica responsável da Anami, no laboratório de manipulação" loading="lazy" width="510" height="510">' +
                '<figcaption>Camilla no laboratório da Anami, em São Caetano do Sul.</figcaption></figure>' +
                '<div><span class="anami-eyebrow">Farmacêutica responsável</span>' +
                '<p class="anami-citacao">Quem manipula a sua fórmula tem nome: Camilla.</p>' +
                '<p class="anami-quem"><strong>Camilla C. de Oliveira</strong>Farmacêutica responsável · CRF-SP 76104. Acompanha cada receita da conferência à entrega e responde pessoalmente as dúvidas pelo WhatsApp.</p>' +
                '<div class="anami-botoes">' + botaoHtml('anami-botao--secundario', 'home-farmaceutica', 'Falar com a farmacêutica', zap('Olá! Quero tirar uma dúvida com a farmacêutica.')) + '</div>' +
                '</div></section>';
        },
        depoimentos: function () {
            function dep(texto, nome) {
                return '<blockquote class="anami-depoimento"><div class="anami-estrelas" aria-label="5 de 5 estrelas">★★★★★</div><p>' + texto + '</p><footer><strong>' + nome + '</strong> · avaliação no Google</footer></blockquote>';
            }
            return '<section class="anami-secao" data-anami-secao="depoimentos">' +
                '<div class="anami-cabeca"><div><span class="anami-eyebrow">Avaliações no Google</span><h2>Quem já comprou, recomenda.</h2></div>' +
                '<a class="anami-link" href="https://www.google.com/search?q=Anami+F%C3%B3rmulas+S%C3%A3o+Caetano+do+Sul" target="_blank" rel="noopener noreferrer" data-anami-evento="clique_avaliacoes_google">Ver todas no Google</a></div>' +
                '<div class="anami-depoimentos">' +
                dep('Excelente farmácia de manipulação. Matéria-prima de qualidade com rastreabilidade e, se necessário, enviam laudos das matérias-primas utilizadas na manipulação. Entrega rápida para São Paulo capital e com preço acessível.', 'Ellen L.') +
                dep('Eu recomendo a Anami Fórmulas. Fiz o pedido via WhatsApp e, em menos de 24 horas após a confirmação do pagamento, recebi em casa os meus manipulados!', 'Márcio F.') +
                dep('Atendimento excelente! Fui muito bem atendida, a entrega foi super rápida e as embalagens são lindas e muito caprichadas. Ainda ganhamos um brinde. Recomendo muito!', 'Luana R.') +
                '</div></section>';
        },
        faq: function () {
            return '<section class="anami-secao anami-faq" data-anami-secao="faq">' +
                '<div><span class="anami-eyebrow">Dúvidas</span><h2>Perguntas de quem compra pela primeira vez</h2><p class="anami-lead">Não achou a sua? A farmacêutica responde pelo WhatsApp.</p></div>' +
                '<div>' +
                '<details><summary>Preciso de receita para comprar?</summary><p>Só para medicamentos manipulados. Vitaminas, minerais, creatina e outros suplementos você compra direto na loja, sem receita.</p></details>' +
                '<details><summary>Quanto tempo leva para ficar pronto?</summary><p>O prazo de manipulação vem junto com o orçamento. O prazo de entrega depende do seu CEP e aparece no carrinho antes de pagar.</p></details>' +
                '<details><summary>Vocês entregam na minha cidade?</summary><p>Sim, enviamos para todo o Brasil com rastreio. Em São Caetano do Sul e região você também pode retirar na farmácia.</p></details>' +
                '<details><summary>Como posso pagar?</summary><p>Pix, cartão de crédito ou boleto, na loja ou pelo WhatsApp.</p></details>' +
                '<details><summary>Posso tirar dúvidas sobre a minha receita?</summary><p>Pode. A farmacêutica explica como tomar e guardar a fórmula. Mudança de dose, só com quem prescreveu.</p></details>' +
                '</div></section>';
        },
        cta: function () {
            return '<section class="anami-secao" data-anami-secao="cta-final">' +
                '<div class="anami-cta-final">' + ICONES.coracao +
                '<div><h2>Receita na mão? Orçamento em um clique.</h2><p>Mande a foto agora pelo WhatsApp. A farmacêutica confere e você recebe o valor, sem compromisso.</p></div>' +
                botaoHtml('', 'home-cta-final', 'Enviar receita agora', null, true) +
                '</div></section>';
        }
    };

    var FOTO_CAMILLA = 'https://cdn.jsdelivr.net/gh/Mattt2049/anami-tema@v' + VERSAO + '/img/camilla.webp';

    function preencherSlot(slot, html, fallbackEl, posicao) {
        if (slot) {
            if (slot.hasAttribute('data-anami-preenchido')) return;
            slot.setAttribute('data-anami-preenchido', '1');
            slot.insertAdjacentHTML('beforeend', html);
            return;
        }
        if (fallbackEl) fallbackEl.insertAdjacentHTML(posicao || 'afterend', html);
    }

    function iniciarHome() {
        if (!document.body.classList.contains('pagina-inicial')) return;
        if (document.querySelector('.anami-secao')) return;

        var slots3 = document.querySelectorAll('[id="blank-home-position3"]');
        var slotA = slots3[0] || null;
        var slotB = document.querySelector('#listagemProdutos [id="blank-home-position3"]') || slots3[1] || null;
        var slot4 = document.querySelector('[id="blank-home-position4"]');

        preencherSlot(slotA, SECOES.credenciais() + SECOES.como(), document.querySelector('.banner.mini-banner'), 'afterend');
        preencherSlot(slotB, SECOES.bento(), document.getElementById('listagemProdutos'), 'beforeend');
        preencherSlot(slot4,
            SECOES.laudo() + SECOES.farmaceutica() + SECOES.depoimentos() + SECOES.faq() + SECOES.cta(),
            document.querySelector('.secao-secundaria') || document.getElementById('corpo'), 'beforeend');

        if (!('IntersectionObserver' in window)) return;
        var vistas = {};
        var io = new IntersectionObserver(function (entradas) {
            entradas.forEach(function (e) {
                if (!e.isIntersecting) return;
                var nome = e.target.getAttribute('data-anami-secao');
                if (vistas[nome]) return;
                vistas[nome] = true;
                io.unobserve(e.target);
                rastrear('view_section', { secao: nome, pagina: location.pathname });
            });
        }, { threshold: .4 });
        document.querySelectorAll('.anami-secao[data-anami-secao]').forEach(function (s) { io.observe(s); });
    }

    /* ---------- inicialização ---------- */

    function iniciar() {
        [iniciarTrackingWhatsApp, iniciarProduto, iniciarDadosLegais].forEach(function (m) {
            try { m(); } catch (e) { if (window.console) console.warn('[anami] falha em ' + m.name, e); }
        });

        quandoTemaPronto(function () {
            [iniciarBarraTopo, iniciarCabecalho, iniciarMenu, iniciarFlutuante, iniciarHome,
                iniciarGarantias, iniciarDescricao, iniciarCategoria].forEach(function (m) {
                try { m(); } catch (e) { if (window.console) console.warn('[anami] falha em ' + m.name, e); }
            });
            aoMudarEstado(function () {
                try { iniciarCabecalho(); iniciarMenu(); } catch (e) { /* idempotente */ }
            });
        });
    }

    quandoPronto(iniciar);

    window.anami = { versao: VERSAO, rastrear: rastrear };
})();
