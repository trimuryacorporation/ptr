import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../frontend/', import.meta.url));
const source = fileURLToPath(new URL('../artifacts/Trimurya-Participant.apk', import.meta.url));
const output = fileURLToPath(new URL('../frontend/dist/', import.meta.url));
await mkdir(output + 'downloads', { recursive: true });
await copyFile(source, output + 'downloads/Trimurya-Participant.apk');

// Generate the direct Vercel page from the same component used by React routing.
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const { default: DownloadPage } = await server.ssrLoadModule('/src/DownloadPage.jsx');
  const markup = renderToStaticMarkup(React.createElement(DownloadPage));
  const css = (await readFile(root + 'src/DownloadPage.css', 'utf8')).replace(/^\uFEFF/, '');
  await mkdir(output + 'download', { recursive: true });
  await writeFile(output + 'download/index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Download the Trimurya Participant Android app and access your recording workspace."><title>Download Android App | Trimurya Corporation</title><link rel="icon" href="/images/trimurya-icon.png"><style>html,body{margin:0}svg{display:block}${css}</style></head><body>${markup}</body></html>`);
} finally {
  await server.close();
}
console.log('Branded public download page and participant APK included in the website build.');
