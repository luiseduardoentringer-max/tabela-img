// ============================================================
//  Gerador de imagem de tabela de preços (microserviço)
//  Recebe JSON com título + linhas, devolve PNG renderizado.
//  Sua "QuickChart privada" — determinístico, sem alucinação.
// ============================================================
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json({ limit: '2mb' }));

// Token simples de proteção (defina TABELA_TOKEN no ambiente).
// Se não definir, o serviço aceita sem token (ok em rede interna Docker).
const TOKEN = process.env.TABELA_TOKEN || '';

// Reusa uma única instância do browser (muito mais rápido que abrir a cada request)
let browserPromise = null;
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
    });
  }
  return browserPromise;
}

// ---- monta o HTML da tabela a partir dos dados ----
function montaHTML({ titulo, subtitulo, colunas, linhas, marca, corHeader }) {
  const cor = corHeader || '#15803d';
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const ths = colunas.map((c, i) =>
    `<th style="text-align:${i === 0 ? 'left' : 'right'}">${esc(c)}</th>`).join('');

  const trs = linhas.map((row, idx) => {
    const tds = colunas.map((c, i) => {
      let val = esc(row[c]);
      // colore a variação: verde sobe, vermelho cai
      let extra = '';
      if (i === colunas.length - 1) {
        const raw = String(row[c] || '');
        if (raw.includes('+') || raw.includes('⬆')) extra = 'color:#16a34a;font-weight:600';
        else if (raw.includes('-') || raw.includes('⬇')) extra = 'color:#dc2626;font-weight:600';
        else extra = 'color:#6b7280';
      }
      return `<td style="text-align:${i === 0 ? 'left' : 'right'};${extra}">${val}</td>`;
    }).join('');
    const zebra = idx % 2 ? 'background:#f9fafb' : 'background:#ffffff';
    return `<tr style="${zebra}">${tds}</tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'DejaVu Sans', Arial, sans-serif; background:#ffffff; }
    .wrap { width:680px; padding:0; }
    .head { background:${cor}; color:#fff; padding:18px 24px; }
    .head h1 { font-size:24px; font-weight:700; }
    .head p { font-size:14px; opacity:.9; margin-top:2px; }
    table { width:100%; border-collapse:collapse; }
    th { background:${cor}; color:#fff; font-size:14px; padding:10px 24px; font-weight:600;
         border-bottom:2px solid rgba(255,255,255,.25); }
    td { font-size:15px; padding:9px 24px; color:#111827; border-bottom:1px solid #eef0f2; }
    .foot { padding:12px 24px; background:#f3f4f6; color:#6b7280; font-size:12px;
            display:flex; justify-content:space-between; }
  </style></head>
  <body><div class="wrap">
    <div class="head"><h1>${esc(titulo)}</h1>${subtitulo ? `<p>${esc(subtitulo)}</p>` : ''}</div>
    <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
    <div class="foot"><span>${esc(marca || '')}</span><span>Preços de referência — não constituem oferta</span></div>
  </div></body></html>`;
}

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/tabela', async (req, res) => {
  try {
    if (TOKEN && req.headers['x-token'] !== TOKEN) {
      return res.status(401).json({ error: 'token inválido' });
    }
    const { titulo, subtitulo, colunas, linhas, marca, corHeader } = req.body || {};
    if (!Array.isArray(colunas) || !Array.isArray(linhas) || linhas.length === 0) {
      return res.status(400).json({ error: 'colunas e linhas são obrigatórios' });
    }

    const html = montaHTML({ titulo, subtitulo, colunas, linhas, marca, corHeader });
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 680, height: 100, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const el = await page.$('.wrap');
    const png = await el.screenshot({ type: 'png' });
    await page.close();

    res.set('Content-Type', 'image/png');
    res.send(png);
  } catch (err) {
    console.error('erro ao gerar tabela:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`tabela-img rodando na porta ${PORT}`));
