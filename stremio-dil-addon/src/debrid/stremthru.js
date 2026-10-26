// StremThru üzerinden diğer debrid servisleri (Real-Debrid, AllDebrid, Premiumize, Debrid-Link, Offcloud...).
// https://github.com/MunifTanjim/stremthru
import { fetchJson } from '../http.js';
import { pickFile } from '../parse.js';

const STORE_NAMES = {
  realdebrid: ['Real-Debrid', 'RD'],
  alldebrid: ['AllDebrid', 'AD'],
  premiumize: ['Premiumize', 'PM'],
  debridlink: ['Debrid-Link', 'DL'],
  easydebrid: ['EasyDebrid', 'ED'],
  offcloud: ['Offcloud', 'OC'],
  pikpak: ['PikPak', 'PP'],
  torbox: ['TorBox', 'TB'],
};

export function createStremThru(baseUrl, store, token) {
  const base = `${baseUrl}/v0/store`;
  const headers = {
    'X-StremThru-Store-Name': store,
    'X-StremThru-Store-Authorization': `Bearer ${token}`,
  };
  const [name, short] = STORE_NAMES[store] || [store, store.slice(0, 2).toUpperCase()];

  async function checkCached(hashes) {
    const result = new Map();
    for (let i = 0; i < hashes.length; i += 100) {
      const chunk = hashes.slice(i, i + 100);
      const data = (await fetchJson(`${base}/magnets/check?magnet=${chunk.join(',')}`, { headers }))?.data;
      for (const item of data?.items || []) {
        if (item?.status !== 'cached' || !item.hash) continue;
        result.set(item.hash.toLowerCase(), {
          name: item.name,
          files: (item.files || []).map((f) => ({ name: f.name, size: f.size })),
        });
      }
    }
    return result;
  }

  async function resolve(hash, { season, episode, title }) {
    const magnet = `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(title || hash)}`;
    const added = (await fetchJson(`${base}/magnets`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ magnet }),
    }))?.data;
    if (!['cached', 'downloaded'].includes(added?.status)) {
      const err = new Error(`İçerik ${name} önbelleğinde değil (durum: ${added?.status || 'bilinmiyor'})`);
      err.notReady = true;
      throw err;
    }
    const file = pickFile((added.files || []).filter((f) => f.link), season, episode);
    if (!file) throw new Error('Torrent içinde uygun video dosyası bulunamadı');
    const link = (await fetchJson(`${base}/link/generate`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ link: file.link }),
    }))?.data?.link;
    if (!link) throw new Error(`${name} oynatma bağlantısı üretmedi`);
    return link;
  }

  return { name, short, checkCached, resolve };
}
