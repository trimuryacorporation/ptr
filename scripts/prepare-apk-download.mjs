import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { siteOrigin, publicPages, pageSchema } from '../frontend/src/seo-config.js';

const root = fileURLToPath(new URL('../frontend/', import.meta.url));
const source = fileURLToPath(new URL('../artifacts/Trimurya-Participant.apk', import.meta.url));
const output = fileURLToPath(new URL('../frontend/dist/', import.meta.url));
const escape = value => value.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
function head(path) {
  const page = publicPages[path], url = siteOrigin + path;
  return `<title>${escape(page.title)}</title><meta name="description" content="${escape(page.description)}"><meta name="robots" content="index, follow"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:site_name" content="Trimurya Corporation"><meta property="og:title" content="${escape(page.title)}"><meta property="og:description" content="${escape(page.description)}"><meta property="og:url" content="${url}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escape(page.title)}"><meta name="twitter:description" content="${escape(page.description)}"><script id="page-structured-data" type="application/ld+json">${JSON.stringify(pageSchema(path)).replace(/</g,'\\u003c')}</script>`;
}
await mkdir(output + 'downloads', { recursive: true });
await copyFile(source, output + 'downloads/Trimurya-Participant.apk');
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const { default: DownloadPage } = await server.ssrLoadModule('/src/DownloadPage.jsx');
  const markup = renderToStaticMarkup(React.createElement(DownloadPage));
  const css = (await readFile(root + 'src/DownloadPage.css', 'utf8')).replace(/^\uFEFF/, '');
  await mkdir(output + 'download', { recursive: true });
  await writeFile(output + 'download/index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${head('/download')}<link rel="icon" href="/images/trimurya-icon.png"><style>html,body{margin:0}svg{display:block}${css}</style></head><body>${markup}</body></html>`);
} finally { await server.close(); }

// Keep the real login app and its JavaScript entry; expose public context before rendering.
let login = await readFile(output + 'index.html','utf8');
login = login.replace(/<title>[\s\S]*?<\/title>/,'').replace(/<meta name="(?:description|robots)"[^>]*>/g,'').replace('</head>',head('/login')+'</head>');
login = login.replace('<div id="root"></div>', '<div id="root"><main><img src="/images/trimurya-logo.svg" alt="Trimurya Corporation" width="210" height="62"><h1>Trimurya Corporation Recording Workspace</h1><p>Participants can sign in with their registered email address or mobile number to access their recording workspace.</p><p><a href="/download">Download the Trimurya Participant Android app and watch the Hindi training video</a></p></main></div>');
await mkdir(output + 'login',{recursive:true});
await writeFile(output + 'login/index.html',login);
await writeFile(output + 'robots.txt',`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${siteOrigin}/sitemap.xml\n`);
await writeFile(output + 'sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(publicPages).map(path=>`  <url><loc>${siteOrigin}${path}</loc></url>`).join('\n')}\n</urlset>\n`);
console.log('Public SEO pages, structured data, sitemap, robots.txt, and APK prepared.');
