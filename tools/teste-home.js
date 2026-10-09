// Teste automático do tema Anami (jsdom): página inicial real + cabecalho.html + anami-core.js.
// Como rodar (na pasta tools/):  npm install   (uma vez)   e depois   node teste-home.js
// Opções:  node teste-home.js https://cdn.jsdelivr.net/gh/Mattt2049/anami-tema@vX.Y.Z/anami-core.min.js   (testa o arquivo do CDN)
//          node teste-home.js --atualizar   (baixa de novo a página inicial da loja em live/home.html)
// O que ele confere: versão, botão/menu "Enviar receita", barra do topo com frases alternadas, as 8 seções da
// home (uma vez cada), textos principais, 5 perguntas do FAQ, foto da farmacêutica, tracking indo para a tag
// do Google da loja (LIgtagDataLayer) e que rodar duas vezes não duplica nada.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const LIVE = path.join(__dirname, 'live', 'home.html');
const args = process.argv.slice(2);
const atualizar = args.includes('--atualizar');
const arg = args.find(a => !a.startsWith('--'));
const VERSAO_ESPERADA = (fs.readFileSync(path.join(RAIZ, 'anami-core.js'), 'utf8').match(/var VERSAO = '([^']+)'/) || [])[1];

async function fonteCore() {
  if (arg && /^https?:/.test(arg)) {
    const r = await fetch(arg);
    if (!r.ok) throw new Error('CDN ' + r.status);
    return await r.text();
  }
  return fs.readFileSync(arg || path.join(RAIZ, 'anami-core.js'), 'utf8');
}

async function paginaInicial() {
  if (atualizar || !fs.existsSync(LIVE)) {
    const r = await fetch('https://www.anamiformulas.com.br/');
    if (!r.ok) throw new Error('loja ' + r.status);
    fs.mkdirSync(path.dirname(LIVE), { recursive: true });
    fs.writeFileSync(LIVE, await r.text());
    console.log('página inicial baixada em', LIVE);
  }
  return fs.readFileSync(LIVE, 'utf8');
}

(async () => {
  const core = await fonteCore();
  let html = await paginaInicial();
  // remove scripts e CSS da plataforma; fica só o HTML
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<link\b[^>]*>/gi, '');
  const cab = fs.readFileSync(path.join(RAIZ, 'cabecalho.html'), 'utf8');
  const inline = cab.match(/<script>([\s\S]*?)<\/script>/)[1];

  const dom = new JSDOM(html, { url: 'https://www.anamiformulas.com.br/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, d = w.document;
  w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  w.IntersectionObserver = class { observe() {} disconnect() {} };
  w.LIgtagDataLayer = [];

  // simula o que o tema NVitrine monta: barra do topo, cabeçalho e menus
  w.eval(inline);
  const T = w.NSThemeData;
  d.body.insertAdjacentHTML('afterbegin',
    '<div class="ns-banner-top ns-banner-top-text"><div class="conteiner"><span class="ns-banner-top-wrapper"><span>' + T.bannerTopBar.text + '</span></span></div></div>');
  let cab2 = d.getElementById('cabecalho');
  if (!cab2) { cab2 = d.createElement('div'); cab2.id = 'cabecalho'; d.body.insertAdjacentElement('afterbegin', cab2); }
  cab2.insertAdjacentHTML('beforeend', '<div class="col-icons header-icons"><div class="help"><span class="text">Fale com a gente</span></div><div class="carrinho"></div></div><div class="col-mobile-menu"><div class="logo"></div><div class="carrinho"></div></div>');
  d.body.insertAdjacentHTML('beforeend', '<div class="main-menu-desktop"><ul class="primary-menu nivel-um"><li class="all-categories">Todos</li><li>Beleza</li></ul></div><div class="main-menu-mobile"><ul class="primary-menu"><li>Beleza</li></ul></div><a class="whatsapp-float-button" href="https://wa.me/5511950358443"></a>');

  w.eval(core);
  d.dispatchEvent(new w.Event('ns:onafterload'));
  await new Promise(r => setTimeout(r, 150));

  const falhas = [];
  const ok = (cond, msg) => { if (cond) console.log('OK  ' + msg); else { falhas.push(msg); console.log('ERR ' + msg); } };
  const q = (s) => d.querySelector(s), qa = (s) => d.querySelectorAll(s);
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
  d.dispatchEvent(new w.Event('ns:onafterload'));
  await new Promise(r => setTimeout(r, 100));
  ok(n1 >= 1 && qa('.anami-header-cta').length === n1, 'reexecucao nao duplica CTA do cabecalho (' + n1 + ')');
  ok(m1 >= 1 && qa('.anami-menu-receita').length === m1, 'reexecucao nao duplica item do menu (' + m1 + ')');
  ok(qa('[data-anami-secao="credenciais"]').length === 1, 'reexecucao nao duplica secoes');

  console.log('\n' + (falhas.length ? 'FALHAS: ' + falhas.length : 'TUDO OK') + ' (' + (arg || 'anami-core.js local') + ')');
  process.exit(falhas.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
