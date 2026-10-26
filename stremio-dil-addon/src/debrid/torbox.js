// TorBox debrid entegrasyonu: önbellek kontrolü ve oynatma bağlantısı üretimi.
import { fetchJson } from '../http.js';
import { pickFile, isVideoFile } from '../parse.js';

const API = process.env.TORBOX_API || 'https://api.torbox.app/v1/api';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createTorbox(apiKey) {
  const auth = { Authorization: `Bearer ${apiKey}` };

  async function checkCached(hashes) {
    const result = new Map();
    for (let i = 0; i < hashes.length; i += 100) {
      const chunk = hashes.slice(i, i + 100);
      const url = `${API}/torrents/checkcached?hash=${chunk.join(',')}&format=object&list_files=true`;
      const data = (await fetchJson(url, { headers: auth }))?.data;
      if (!data || typeof data !== 'object') continue;
      for (const [hash, info] of Object.entries(data)) {
        if (!info) continue;
        result.set(hash.toLowerCase(), {
          name: info.name,
          files: (info.files || []).map((f) => ({ name: f.name, size: f.size })),
        });
      }
    }
    return result;
  }

  async function findOrAdd(hash, title) {
    const list = (await fetchJson(`${API}/torrents/mylist?bypass_cache=true`, { headers: auth }))?.data;
    const existing = Array.isArray(list) ? list.find((t) => t.hash?.toLowerCase() === hash) : null;
    if (existing) return existing.id;

    const form = new FormData();
    form.append('magnet', `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(title || hash)}`);
    form.append('seed', '3'); // 3 = seed etme
    const created = (await fetchJson(`${API}/torrents/createtorrent`, { method: 'POST', headers: auth, body: form }))?.data;
    if (!created?.torrent_id) throw new Error('TorBox torrenti kuyruğa aldı (aktif indirme limiti dolu olabilir)');
    return created.torrent_id;
  }

  async function resolve(hash, { season, episode, title }) {
    const torrentId = await findOrAdd(hash, title);
    let torrent;
    for (let attempt = 0; attempt < 6; attempt++) {
      torrent = (await fetchJson(`${API}/torrents/mylist?id=${torrentId}&bypass_cache=true`, { headers: auth }))?.data;
      if (torrent?.download_present && torrent.files?.some((f) => isVideoFile(f.name))) break;
      await sleep(1500);
    }
    if (!torrent?.download_present) {
      const err = new Error('İçerik henüz TorBox önbelleğinde değil, indiriliyor');
      err.notReady = true;
      throw err;
    }
    const file = pickFile(torrent.files, season, episode);
    if (!file) throw new Error('Torrent içinde uygun video dosyası bulunamadı');
    const url = `${API}/torrents/requestdl?token=${encodeURIComponent(apiKey)}&torrent_id=${torrentId}&file_id=${file.id}`;
    const link = (await fetchJson(url, { headers: auth }))?.data;
    if (typeof link !== 'string') throw new Error('TorBox indirme bağlantısı döndürmedi');
    return link;
  }

  return { name: 'TorBox', short: 'TB', checkCached, resolve };
}
