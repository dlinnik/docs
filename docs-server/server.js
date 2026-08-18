const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 7080;
// По умолчанию слушаем только localhost: снаружи трафик принимает nginx
// (reverse proxy с SSL) и проксирует на 127.0.0.1:7080.
// Чтобы открыть порт наружу напрямую: HOST=0.0.0.0
const HOST = process.env.HOST || '127.0.0.1';
const DOCS_PATH = process.env.DOCS_PATH || path.resolve(__dirname, '..');

// Стандартный рендер Markdown (GFM: таблицы, зачёркнутый текст, авто-ссылки)
const { marked } = require('marked');
marked.setOptions({
  gfm: true,
  breaks: false,
});

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// Имена, которые не должны отдаваться посетителям (служебные файлы репозитория)
const HIDDEN = new Set([
  '.git',
  'docs-server',
  '_config.yml',
  'CNAME',
  'README.md',
]);

function decodePathname(p) {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

// Ключи front matter, допустимые в статьях
const FM_KEYS = new Set([
  'layout',
  'title',
  'description',
  'lang',
  'baseurl',
  'permalink',
  'tags',
  'order',
  'category',
  'published',
]);

function parseKeyValue(line) {
  const kv = line.match(/^([^:]+):\s*(.*)$/);
  if (!kv) return null;
  const key = kv[1].trim();
  if (!FM_KEYS.has(key)) return null;
  return { key, value: kv[2].trim().replace(/^["']|["']$/g, '') };
}

// Декодирование front matter.
// Поддерживаются два формата:
//   1. Канонический Jekyll:  ---\nkey: value\n---
//   2. «Битый» front matter (в некоторых статьях): начальные строки
//      key: value без ограничителей ---, за которыми идёт пустая строка.
// Также срезается BOM (EF BB BF), оставленный файлами UTF-8 with BOM.
function parseFrontMatter(content) {
  // Убираем BOM (EF BB BF), который присутствует в файлах, сохранённых
  // в Windows/VS Code с кодировкой UTF-8 with BOM — иначе front matter
  // не распознаётся и выводится как обычный текст.
  content = content.replace(/^\uFEFF/, '');

  // Формат 1: --- ... ---
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (m) {
    const data = {};
    for (const line of m[1].split(/\r?\n/)) {
      const kv = parseKeyValue(line);
      if (kv) data[kv.key] = kv.value;
    }
    const body = content.slice(m[0].length);
    return { data, body };
  }

  // Формат 2: «битый» front matter без --- : несколько строк key: value
  // в начале файла, за которыми идёт пустая строка.
  const lines = content.split(/\r?\n/);
  const data = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) break; // пустая строка — конец заголовка
    const kv = parseKeyValue(line);
    if (!kv) break; // не похоже на front matter — это обычный Markdown
    data[kv.key] = kv.value;
    i++;
  }
  if (Object.keys(data).length > 0) {
    const body = lines.slice(i).join('\n');
    return { data, body };
  }

  // Формат 3: front matter отсутствует — рендерим весь файл как есть.
  return { data: {}, body: content };
}

function titleFromBody(body) {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : '';
}

// Построение навигации из корневого index.md (секции ### и ссылки [текст](/slug/))
function buildNav() {
  const indexPath = path.join(DOCS_PATH, 'index.md');
  if (!fs.existsSync(indexPath)) return [];
  const raw = fs.readFileSync(indexPath, 'utf8');
  const sections = [];
  let current = null;
  for (const line of raw.split(/\r?\n/)) {
    const sec = line.match(/^###\s+(.+)$/);
    if (sec) {
      current = { title: sec[1].trim(), links: [] };
      sections.push(current);
      continue;
    }
    const link = line.match(/\[([^\]]+)\]\((\/[^)]+)\)/);
    if (link && current) {
      current.links.push({ title: link[1].trim(), url: link[2] });
    }
  }
  return sections;
}

function renderNav(sections, currentUrl) {
  const parts = [];
  for (const section of sections) {
    if (!section.links.length) continue;
    parts.push(`<h3 class="nav-section">${escapeHtml(section.title)}</h3>`);
    parts.push('<ul class="nav-list">');
    for (const link of section.links) {
      const active =
        currentUrl === link.url ||
        currentUrl === link.url.replace(/\/$/, '') ||
        (currentUrl + '/') === link.url;
      parts.push(
        `<li><a href="${escapeHtml(link.url)}" class="${active ? 'active' : ''}">${escapeHtml(link.title)}</a></li>`
      );
    }
    parts.push('</ul>');
  }
  return parts.join('\n');
}

function renderPage({ title, contentHtml, currentUrl }) {
  let nav = '';
  try {
    nav = renderNav(buildNav(), currentUrl);
  } catch {
    nav = '';
  }
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title || 'Документация Databird')}</title>
<style>
:root {
  --bg: #ffffff;
  --fg: #1f2328;
  --muted: #59636e;
  --border: #d1d9e0;
  --accent: #0969da;
  --accent-bg: #ddf4ff;
  --code-bg: #f6f8fa;
  --sidebar-w: 300px;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
  color: var(--fg);
  background: var(--bg);
  line-height: 1.6;
}
.topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 12px;
  padding: 10px 20px;
  background: #24292f;
  color: #fff;
}
.topbar a {
  color: #fff; text-decoration: none; font-weight: 600; font-size: 16px;
}
.topbar .hint { color: #9aa4af; font-size: 13px; }
.layout { display: flex; min-height: calc(100vh - 48px); }
.sidebar {
  width: var(--sidebar-w); flex-shrink: 0;
  border-right: 1px solid var(--border);
  padding: 16px 16px 32px;
  overflow-y: auto; max-height: calc(100vh - 48px);
  position: sticky; top: 48px;
  background: #f6f8fa;
}
.sidebar h3.nav-section {
  font-size: 12px; text-transform: uppercase; letter-spacing: .05em;
  color: var(--muted); margin: 18px 0 6px;
}
.nav-list { list-style: none; margin: 0; padding: 0; }
.nav-list a {
  display: block; padding: 5px 8px; border-radius: 6px;
  color: var(--fg); text-decoration: none; font-size: 14px;
}
.nav-list a:hover { background: var(--accent-bg); }
.nav-list a.active { background: var(--accent-bg); color: var(--accent); font-weight: 600; }
#nav-search {
  width: 100%; padding: 7px 10px; margin-bottom: 8px;
  border: 1px solid var(--border); border-radius: 6px; font-size: 13px;
}
.nav-item-hidden { display: none; }
.content { flex: 1; min-width: 0; padding: 24px 40px 80px; max-width: 920px; }
.content h1 { margin-top: 0; padding-bottom: .3em; border-bottom: 1px solid var(--border); font-size: 28px; }
.content h2 { margin-top: 1.6em; padding-bottom: .3em; border-bottom: 1px solid var(--border); font-size: 22px; }
.content img { max-width: 100%; height: auto; }
.content code {
  background: var(--code-bg); padding: .2em .4em; border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; font-size: 13px;
}
.content pre {
  background: var(--code-bg); padding: 12px 16px; border-radius: 8px; overflow-x: auto;
  border: 1px solid var(--border);
}
.content pre code { background: none; padding: 0; }
.content table { border-collapse: collapse; margin: 1em 0; display: block; overflow-x: auto; max-width: 100%; }
.content th, .content td { border: 1px solid var(--border); padding: 6px 12px; }
.content th { background: #f6f8fa; }
.content blockquote {
  margin: 1em 0; padding: .5em 1em; color: var(--muted);
  border-left: 4px solid var(--border);
}
.content a { color: var(--accent); }
.content hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }
@media (max-width: 860px) {
  .layout { flex-direction: column; }
  .sidebar { width: 100%; max-height: none; position: static; border-right: none; border-bottom: 1px solid var(--border); }
  .content { padding: 16px 20px 60px; }
}
</style>
</head>
<body>
  <header class="topbar">
    <a href="/">Документация Databird</a>
    <span class="hint">локальная версия</span>
  </header>
  <div class="layout">
    <aside class="sidebar">
      <input id="nav-search" type="search" placeholder="Поиск по документации…" autocomplete="off">
      <nav>
${nav}
      </nav>
    </aside>
    <main class="content">
${contentHtml}
    </main>
  </div>
<script>
  const search = document.getElementById('nav-search');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    document.querySelectorAll('.nav-list li').forEach((li) => {
      const text = li.textContent.toLowerCase();
      li.classList.toggle('nav-item-hidden', q.length > 0 && !text.includes(q));
    });
  });
</script>
</body>
</html>`;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
  res.end(body);
}

function send404(res, message) {
  send(
    res,
    404,
    renderPage({
      title: '404 — страница не найдена',
      contentHtml: `<h1>404</h1><p>${escapeHtml(message || 'Страница не найдена')}.</p><p><a href="/">← На главную</a></p>`,
      currentUrl: '',
    })
  );
}

function serveMarkdown(res, mdPath, urlPath) {
  const raw = fs.readFileSync(mdPath, 'utf8');
  const { data, body } = parseFrontMatter(raw);
  const contentHtml = marked.parse(body);
  const title = data.title || titleFromBody(body) || 'Документация Databird';
  send(res, 200, renderPage({ title, contentHtml, currentUrl: urlPath }));
}

function serveStatic(res, urlPath) {
  const segments = urlPath.split('/').filter(Boolean);
  if (segments.length === 0 || HIDDEN.has(segments[0])) {
    return send404(res, 'Файл не найден');
  }

  const relPath = segments.join(path.sep);
  const filePath = path.resolve(DOCS_PATH, relPath);
  if (filePath !== DOCS_PATH && !filePath.startsWith(DOCS_PATH + path.sep)) {
    return send404(res, 'Файл не найден');
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return send404(res, 'Файл не найден');
  }

  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const data = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
  res.end(data);
}

function handleRequest(req, res) {
  const urlPath = decodePathname(new URL(req.url, 'http://localhost').pathname);

  // Редирект /slug → /slug/, чтобы относительные пути картинок работали
  if (urlPath !== '/' && !urlPath.endsWith('/') && !path.extname(urlPath)) {
    res.writeHead(301, { Location: urlPath + '/' });
    return res.end();
  }

  // Главная страница
  if (urlPath === '/') {
    const indexPath = path.join(DOCS_PATH, 'index.md');
    if (!fs.existsSync(indexPath)) return send404(res, 'index.md не найден');
    return serveMarkdown(res, indexPath, '/');
  }

  // Страница раздела /slug/
  const sectionMatch = urlPath.match(/^\/([^/]+)\/$/);
  if (sectionMatch) {
    const slug = sectionMatch[1];
    if (!HIDDEN.has(slug)) {
      const mdPath = path.join(DOCS_PATH, slug, 'index.md');
      if (fs.existsSync(mdPath)) {
        return serveMarkdown(res, mdPath, urlPath);
      }
    }
  }

  // Статический файл (картинки и пр.)
  serveStatic(res, urlPath);
}

const server = http.createServer((req, res) => {
  try {
    handleRequest(req, res);
  } catch (err) {
    console.error('[docs-server]', err);
    if (!res.headersSent) {
      send(res, 500, '<h1>500</h1><p>Внутренняя ошибка сервера.</p>');
    } else {
      res.end();
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`📚 Документация Databird доступна на http://${HOST}:${PORT}`);
  console.log(`   Папка с документами: ${DOCS_PATH}`);
  if (HOST === '127.0.0.1') {
    console.log('   ⚠️  Слушаем только localhost — наружу трафик должен проксировать nginx.');
  }
});
