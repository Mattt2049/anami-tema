// Teste automático do tema Anami (jsdom): páginas reais da loja + cabecalho.html + anami-core.js.
// Como rodar (na pasta tools/):  npm install   (uma vez)   e depois   node teste-home.js
// Opções:  node teste-home.js https://cdn.jsdelivr.net/gh/Mattt2049/anami-tema@vX.Y.Z/anami-core.min.js   (testa o arquivo do CDN)
//          node teste-home.js --atualizar   (baixa de novo as páginas da loja em live/)
// O que ele confere:
//  - home: versão, botão/menu "Enviar receita", barra do topo com frases alternadas, as 8 seções (uma vez cada),
//    textos principais, 5 perguntas do FAQ, foto da farmacêutica, tracking indo para a tag do Google da loja
//    (LIgtagDataLayer) e que rodar duas vezes não duplica nada;
//  - produto (2 formatos de descrição): garantias logo abaixo do botão, cada subtítulo vira um bloco que abre,
//    nenhum texto perdido, primeiro bloco e advertências abertos, sem duplicar;
//  - categoria: texto da categoria sai da coluna e vai para o fim da lista, sem estilos colados, sem duplicar.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const LOJA = 'https://www.anamiformulas.com.br/';
const PAGINAS = {
  home: '',
  pdp: 'formula-4-ativos-msm-900mg-vitamina-c-colageno-tipo-ii-60-capsulas',
  pdp2: 'l-citrulina-malato-em-po-250g',
  categoria: 'saude-e-bem-estar'
};
const args = process.argv.slice(2);
const atualizar = args.includes('--atualizar');
const arg = args.find(a => !a.startsWith('--'));
// Testando o CDN, a versão esperada é a da própria URL (@vX.Y.Z); senão, a do anami-core.js local.
const VERSAO_ESPERADA = ((arg || '').match(/@v([\d.]+)\//) || [])[1] ||
  (fs.readFileSync(path.join(RAIZ, 'anami-core.js'), 'utf8').match(/var VERSAO = '([^']+)'/) || [])[1];
const aPartirDe = (v) => VERSAO_ESPERADA.split('.').map(Number).reduce((r, n, i) => r || n - (v.split('.').map(Number)[i] || 0), 0) >= 0;

async function fonteCore() {
  if (arg && /^https?:/.test(arg)) {
    const r = await fetch(arg);
    if (!r.ok) throw new Error('CDN ' + r.status);
    return await r.text();
  }
  return fs.readFileSync(arg || path.join(RAIZ, 'anami-core.js'), 'utf8');
}

async function pagina(nome) {
  const arq = path.join(__dirname, 'live', nome + '.html');
  if (atualizar || !fs.existsSync(arq)) {
    const r = await fetch(LOJA + PAGINAS[nome]);
    if (!r.ok) throw new Error('loja ' + r.status + ' em ' + nome);
    fs.mkdirSync(path.dirname(arq), { recursive: true });
    fs.writeFileSync(arq, await r.text());
    console.log('página baixada em', arq);
  }
  return fs.readFileSync(arq, 'utf8');
}

const limpo = (s) => s.replace(/\s+/g, ' ').trim();
const falhas = [];
const ok = (cond, msg) => { if (cond) console.log('OK  ' + msg); else { falhas.push(msg); console.log('ERR ' + msg); } };

// Monta a página: só o HTML da plataforma (sem scripts/CSS), o que o tema NVitrine monta, e o core.
async function montar(nome, core) {
  let html = await pagina(nome);
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<link\b[^>]*>/gi, '');
  const cab = fs.readFileSync(path.join(RAIZ, 'cabecalho.html'), 'utf8');
  const inline = cab.match(/<script>([\s\S]*?)<\/script>/)[1];

  const dom = new JSDOM(html, { url: LOJA + PAGINAS[nome], runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, d = w.document;
  w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  w.IntersectionObserver = class { observe() {} disconnect() {} };
  w.LIgtagDataLayer = [];

  w.eval(inline);
  const T = w.NSThemeData;
  d.body.insertAdjacentHTML('afterbegin',
    '<div class="ns-banner-top ns-banner-top-text"><div class="conteiner"><span class="ns-banner-top-wrapper"><span>' + T.bannerTopBar.text + '</span></span></div></div>');
  let cab2 = d.getElementById('cabecalho');
  if (!cab2) { cab2 = d.createElement('div'); cab2.id = 'cabecalho'; d.body.insertAdjacentElement('afterbegin', cab2); }
  cab2.insertAdjacentHTML('beforeend', '<div class="col-icons header-icons"><div class="help"><span class="text">Fale com a gente</span></div><div class="carrinho"></div></div><div class="col-mobile-menu"><div class="logo"></div><div class="carrinho"></div></div>');
  d.body.insertAdjacentHTML('beforeend', '<div class="main-menu-desktop"><ul class="primary-menu nivel-um"><li class="all-categories">Todos</li><li>Beleza</li></ul></div><div class="main-menu-mobile"><ul class="primary-menu"><li>Beleza</li></ul></div><a class="whatsapp-float-button" href="https://wa.me/5511950358443"></a>');

  // fotografia do texto original, para conferir que nada se perde
  const desc = d.getElementById('descricao');
  const interno = d.querySelector('.coluna .componente .interno');
  const antes = {
    desc: desc ? limpo(desc.textContent) : '',
    h3: desc ? desc.querySelectorAll('h3').length : 0,
    cat: interno ? limpo(interno.textContent).replace(limpo((interno.querySelector('h4.titulo') || { textContent: '' }).textContent), '').trim() : ''
  };

  w.eval(core);
  d.dispatchEvent(new w.Event('ns:onafterload'));
  await new Promise(r => setTimeout(r, 150));
  const reexecutar = async () => { d.dispatchEvent(new w.Event('ns:onafterload')); await new Promise(r => setTimeout(r, 100)); };
  return { w, d, antes, reexecutar, q: (s) => d.querySelector(s), qa: (s) => d.querySelectorAll(s) };
}

async function testarHome(core) {
  console.log('\n--- página inicial');
  const { w, d, q, qa, reexecutar } = await montar('home', core);
  const texto = d.body.textContent;

  ok(w.anami && w.anami.versao === VERSAO_ESPERADA, 'versao ' + VERSAO_ESPERADA + ' (' + (w.anami && w.anami.versao) + ')');
  ok(qa('.anami-header-cta').length >= 1, 'botao Enviar receita no cabecalho');
  ok(qa('.anami-menu-receita').length >= 1, 'item Envie sua receita no menu');
  ok(q('.whatsapp-float-button[data-anami-origem="flutuante"]'), 'flutuante marcado');
  const barra = q('.ns-banner-top');
  const nMsgs = qa('.ns-banner-top .anami-topo-msg').length;
  ok(barra && (nMsgs < 2 || (barra.classList.contains('anami-rotacao') && q('.ns-banner-top .anami-topo-msg.anami-ativa'))), 'barra do topo: ' + nMsgs + ' frases' + (nMsgs > 1 ? ', rotacao ligada, 1 ativa' : ''));
  for (const sec of ['credenciais', 'como-funciona', 'o-que-manipulamos', 'laudo', 'farmaceutica', 'depoimentos', 'faq', 'cta-final']) {
    ok(qa('[data-anami-secao="' + sec + '"]').length === 1, 'secao ' + sec + ' 1x');
  }
  ok(qa('.anami-credenciais li').length === 4, 'credenciais 4 itens');
  ok(texto.includes('Sua receita vira fórmula sem você sair de casa.'), 'como: titulo');
  ok(!texto.includes('Gente entende de gente'), 'farmaceutica: sem citacao inventada');
  ok(texto.includes('Quem manipula a sua fórmula tem nome'), 'farmaceutica: titulo');
  ok(qa('.anami-faq details').length === 5, 'faq 5 perguntas');
  ok(texto.includes('Receita na mão? Orçamento em um clique.'), 'cta final');
  ok(qa('a[data-anami-prescricao]').length >= 4, 'CTAs de receita >= 4 (' + qa('a[data-anami-prescricao]').length + ')');
  ok(qa('[data-anami-preenchido]').length >= 2, 'slots preenchidos');
  ok(q('img.anami-retrato') && q('img.anami-retrato').src.includes('anami-tema@v' + VERSAO_ESPERADA + '/img/camilla.webp'), 'foto Camilla aponta para a versao atual');
  ok(!q('.anami-garantias') && !q('.anami-acordeao') && !q('.anami-cat-texto'), 'home sem blocos de produto/categoria');

  // tracking: clique num CTA de receita deve ir para LIgtagDataLayer como Arguments
  const antes = w.LIgtagDataLayer.length;
  const cta = q('a[data-anami-prescricao][data-anami-origem="home-cta-final"]');
  cta.addEventListener('click', e => e.preventDefault());
  cta.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  const ult = w.LIgtagDataLayer[w.LIgtagDataLayer.length - 1];
  ok(w.LIgtagDataLayer.length === antes + 1 && ult && ult.length === 3 && ult[0] === 'event' && ult[1] === 'enviar_prescricao' && ult[2].origem === 'home-cta-final', 'rastrear -> LIgtagDataLayer (event, enviar_prescricao, origem)');
  ok(Object.prototype.toString.call(ult) === '[object Arguments]', 'entrada eh Arguments (gtag.js aceita)');
  ok(w.dataLayer && w.dataLayer[w.dataLayer.length - 1].event === 'enviar_prescricao', 'dataLayer tambem recebe');

  // segunda execucao (evento do tema de novo) nao duplica
  const n1 = qa('.anami-header-cta').length, m1 = qa('.anami-menu-receita').length;
  await reexecutar();
  ok(n1 >= 1 && qa('.anami-header-cta').length === n1, 'reexecucao nao duplica CTA do cabecalho (' + n1 + ')');
  ok(m1 >= 1 && qa('.anami-menu-receita').length === m1, 'reexecucao nao duplica item do menu (' + m1 + ')');
  ok(qa('[data-anami-secao="credenciais"]').length === 1, 'reexecucao nao duplica secoes');
}

async function testarProduto(nome, core) {
  console.log('\n--- produto: ' + nome);
  const { w, q, qa, antes, reexecutar } = await montar(nome, core);
  ok(w.anami.versao === VERSAO_ESPERADA, 'versao ' + VERSAO_ESPERADA);
  const acoes = q('.principal > .acoes-produto') || q('.principal .acoes-produto');
  ok(qa('.anami-garantias li').length === 4, 'garantias: 4 itens');
  ok(acoes && acoes.nextElementSibling && acoes.nextElementSibling.classList.contains('anami-garantias'), 'garantias logo abaixo do botao Comprar');
  ok(qa('.principal .anami-whatsapp-produto[data-anami-prescricao]').length === 1, 'botao Enviar prescricao 1x');

  const blocos = qa('#descricao details.anami-acordeao');
  ok(antes.h3 >= 2 && blocos.length === antes.h3, 'descricao: ' + antes.h3 + ' subtitulos viraram ' + blocos.length + ' blocos');
  ok([...blocos].every(b => b.querySelector(':scope > summary > h3') && b.querySelector(':scope > .anami-acordeao-corpo')), 'cada bloco tem titulo (h3) e corpo');
  ok(limpo(q('#descricao').textContent) === antes.desc, 'descricao: nenhum texto perdido nem duplicado');
  ok(blocos[0] && blocos[0].hasAttribute('open'), 'primeiro bloco aberto');
  const advert = [...blocos].filter(b => /advert[êe]ncia|cuidados importantes/i.test(b.textContent));
  ok(advert.length >= 1 && advert.every(b => b.hasAttribute('open')), 'blocos com advertencias/cuidados abertos (' + advert.length + ')');

  await reexecutar();
  ok(qa('.anami-garantias').length === 1 && qa('#descricao details.anami-acordeao').length === blocos.length, 'reexecucao nao duplica garantias nem blocos');
}

async function testarCategoria(core) {
  console.log('\n--- categoria');
  const { q, qa, antes, reexecutar } = await montar('categoria', core);
  const sec = q('.anami-cat-texto');
  ok(qa('.anami-cat-texto').length === 1, 'texto da categoria 1x');
  ok(sec && sec.parentNode === q('.secao-principal .conteudo'), 'texto no fim da coluna dos produtos');
  ok(sec && antes.cat.length > 50 && limpo(sec.textContent) === antes.cat, 'texto da categoria completo');
  ok(sec && !sec.querySelector('[style]:not(img)'), 'sem estilos colados no texto');
  ok(q('.coluna .componente[data-anami-movido]'), 'bloco antigo da coluna marcado para esconder');
  ok(q('.secao-principal .conteudo > h1'), 'nome da categoria (h1) presente');
  await reexecutar();
  ok(qa('.anami-cat-texto').length === 1, 'reexecucao nao duplica o texto');
}

(async () => {
  const core = await fonteCore();
  await testarHome(core);
  if (aPartirDe('1.3.0')) {
    await testarProduto('pdp', core);
    await testarProduto('pdp2', core);
    await testarCategoria(core);
  } else {
    console.log('\n(produto e categoria: só a partir da 1.3.0)');
  }
  console.log('\n' + (falhas.length ? 'FALHAS: ' + falhas.length : 'TUDO OK') + ' (' + (arg || 'anami-core.js local') + ')');
  process.exit(falhas.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
