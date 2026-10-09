// Espelho local de uma página da loja com o código LOCAL do tema (para print no Edge headless).
// Uso: node espelho.js live/pdp.html                -> gera live/espelho-pdp.html (+ live/celular-pdp.html, iframe de 390 px)
//      node espelho.js live/pdp.html --print        -> também tira os prints (live/print-pdp-pc.png e -cel.png)
//      --altura=3200 muda a altura do print do computador
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const raiz = path.resolve(__dirname, '..');
const arq = process.argv[2];
if (!arq) { console.error('informe o html'); process.exit(1); }
const nome = path.basename(arq, '.html');
const paraUrl = (p) => 'file:///' + p.split(path.sep).join('/');

let html = fs.readFileSync(arq, 'utf8');
// CSS Avançado será esvaziado (v1.2.1); tema.css da loja vira absoluto
html = html.replace(/<link[^>]+href="\/avancado\.css[^"]*"[^>]*>/, '')
    .replace('href="/tema.css', 'href="https://www.anamiformulas.com.br/tema.css');
// tira o código do painel (qualquer versão) e põe o cabecalho.html local
html = html.replace(/<!-- ANAMI · cabeçalho[\s\S]*?anami-tema@v[\d.]+\/anami-[a-z]+\.min\.css">/, '<!--ANAMI-CAB-->')
    .replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/gh\/Mattt2049\/anami-tema@v[\d.]+\/anami-core\.min\.js"[^>]*><\/script>/g, '');

let cab = fs.readFileSync(path.join(raiz, 'cabecalho.html'), 'utf8');
// mesma ordem de CSS do combine do cabecalho.html; CSS novo que ainda não está no combine entra no fim
const listados = (cab.match(/anami-[a-z]+\.min\.css/g) || []).map(f => f.replace('.min', ''));
const novos = fs.readdirSync(raiz).filter(f => /^anami-[a-z]+\.css$/.test(f) && !listados.includes(f)).sort();
const cssLocal = listados.concat(novos)
    .map(f => '<link rel="stylesheet" href="' + paraUrl(path.join(raiz, f)) + '">').join('\n');
cab = cab
    .replace(/<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net\/combine\/[^"]+">/, cssLocal)
    .replace(/https:\/\/cdn\.jsdelivr\.net\/gh\/Mattt2049\/anami-tema@v[\d.]+\/anami-core\.min\.js/, paraUrl(path.join(raiz, 'anami-core.js')));
html = html.includes('<!--ANAMI-CAB-->') ? html.replace('<!--ANAMI-CAB-->', cab) : html.replace('</head>', cab + '</head>');
// sem tela de "carregando" e sem endereços relativos quebrados
html = html.replace('<head>', '<head><base href="https://www.anamiformulas.com.br/"><style>#full-page-loading{display:none!important}</style>');

const pasta = path.dirname(path.resolve(arq));
const saida = path.join(pasta, 'espelho-' + nome + '.html');
fs.writeFileSync(saida, html);
// --desde=1800 começa o print do celular 1800 px abaixo do topo (para ver o fim de páginas longas)
const desde = +(process.argv.find(a => /^--desde=/.test(a)) || '--desde=0').split('=')[1];
const cel = path.join(pasta, 'celular-' + nome + '.html');
fs.writeFileSync(cel, '<!doctype html><body style="margin:0;background:#888;overflow:hidden"><iframe src="' + paraUrl(saida) +
    '" style="width:390px;height:' + (9000 + desde) + 'px;margin-top:-' + desde + 'px;border:0;background:#fff"></iframe>');
console.log('ok', saida);

if (process.argv.includes('--print')) {
    const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    const tirar = (alvo, png, w, h) => execFileSync(edge, ['--headless', '--disable-gpu', '--hide-scrollbars',
        '--force-device-scale-factor=1', '--allow-file-access-from-files', '--virtual-time-budget=9000',
        '--window-size=' + w + ',' + h, '--screenshot=' + png, paraUrl(alvo)], { stdio: 'ignore' });
    const alt = +(process.argv.find(a => /^--altura=/.test(a)) || '--altura=3200').split('=')[1];
    tirar(saida, path.join(pasta, 'print-' + nome + '-pc.png'), 1440, alt);
    tirar(cel, path.join(pasta, 'print-' + nome + '-cel.png'), 390, Math.round(alt * 1.6));
    console.log('prints ok');
}
