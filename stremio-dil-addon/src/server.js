import http from 'node:http';
import { decodeConfig, validateConfig } from './config.js';
import { getStreams } from './streams.js';
import { createDebrid } from './debrid/index.js';
import { TtlCache } from './http.js';
import { configurePage } from './configure.js';
import pkg from '../package.json' with { type: 'json' };

const PORT = Number(process.env.PORT) || 7000;
const streamCache = new TtlCache(10 * 60 * 1000);
const linkCache = new TtlCache(60 * 60 * 1000);

function manifest(configured) {
  return {
    id: 'community.dil.debrid',
    version: pkg.version,
    name: 'Dil Odaklı Debrid',
    description: 'TorBox veya seçtiğin debrid ile, tercih ettiğin dildeki (ör. Türkçe dublaj/altyazı) sürümleri öne çıkaran arama.',
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt'],
    catalogs: [],
    behaviorHints: { configurable: true, configurationRequired: !configured },
  };
}

function send(res, status, body, headers = {}) {
  const isString = typeof body === 'string';
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': isString ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8',
    ...headers,
  });
  res.end(isString ? body : JSON.stringify(body));
}

function baseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/+$/, '');
  const proto = req.headers['x-forwarded-proto']?.split(',')[0] || 'http';
  return `${proto}://${req.headers['x-forwarded-host'] || req.headers.host}`;
}

async function handlePlay(cfgStr, cfg, hash, season, episode) {
  const key = `${cfgStr}|${hash}|${season}|${episode}`;
  let pending = linkCache.get(key);
  if (!pending) {
    pending = createDebrid(cfg).resolve(hash, {
      season: season || null,
      episode: episode || null,
    });
    linkCache.set(key, pending);
    pending.catch(() => linkCache.map.delete(key));
  }
  return pending;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'method not allowed' });

  const url = new URL(req.url, 'http://x');
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);

  try {
    if (!parts.length) return send(res, 302, '', { Location: '/configure' });
    if (parts[0] === 'configure') return send(res, 200, configurePage(null));
    if (parts[0] === 'manifest.json') return send(res, 200, manifest(false));
    if (parts[0] === 'health') return send(res, 200, { ok: true });
    if (parts[0] === 'favicon.ico') return send(res, 204, '');

    const [cfgStr, resource, ...rest] = parts;
    const cfg = decodeConfig(cfgStr);

    if (resource === 'configure') return send(res, 200, configurePage(cfg));
    if (resource === 'manifest.json') return send(res, 200, manifest(validateConfig(cfg).length === 0));

    if (resource === 'stream' && rest.length === 2) {
      const [type, file] = rest;
      const id = file.replace(/\.json$/, '');
      const errors = validateConfig(cfg);
      if (errors.length) {
        return send(res, 200, { streams: [{ name: 'Dil Odaklı Debrid', title: `⚠️ Ayar hatası: ${errors.join(', ')}`, externalUrl: `${baseUrl(req)}/${cfgStr}/configure` }] });
      }
      const key = `${cfgStr}|${type}|${id}`;
      let streams = streamCache.get(key);
      if (!streams) {
        streams = await getStreams(type, id, cfg, `${baseUrl(req)}/${cfgStr}/play`);
        streamCache.set(key, streams);
      }
      return send(res, 200, { streams, cacheMaxAge: 600 }, { 'Cache-Control': 'max-age=600' });
    }

    if (resource === 'play' && rest.length >= 1) {
      const [hash, s = '0', e = '0'] = rest;
      if (!/^[a-f0-9]{40}$/i.test(hash)) return send(res, 400, { error: 'geçersiz hash' });
      try {
        const link = await handlePlay(cfgStr, cfg, hash.toLowerCase(), +s, +e);
        return send(res, 302, '', { Location: link });
      } catch (err) {
        console.warn(`[play] ${hash}: ${err.message}`);
        return send(res, err.notReady ? 503 : 502, { error: err.message });
      }
    }

    return send(res, 404, { error: 'bulunamadı' });
  } catch (err) {
    console.error(`[${parts[1] || parts[0]}]`, err.message); // URL API anahtarı içerdiği için loglanmaz
    return send(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Dil Odaklı Debrid eklentisi çalışıyor: http://127.0.0.1:${PORT}/configure`);
});
