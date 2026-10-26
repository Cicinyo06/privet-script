// Torrentio'nun herkese açık stream uç noktasını torrent kaynağı olarak kullanır (debrid'siz mod).
import { fetchJson } from '../http.js';
import { parseSize } from '../parse.js';

export async function searchTorrentio({ type, id }, cfg) {
  const data = await fetchJson(`${cfg.torrentioUrl}/stream/${type}/${encodeURIComponent(id)}.json`);
  const streams = Array.isArray(data?.streams) ? data.streams : [];
  return streams
    .filter((s) => typeof s.infoHash === 'string')
    .map((s) => {
      const text = String(s.title || s.description || '');
      const [firstLine] = text.split('\n');
      return {
        infoHash: s.infoHash.toLowerCase(),
        title: s.behaviorHints?.filename || firstLine,
        // Dil bayrakları başlığın alt satırlarında olduğu için tüm metni saklıyoruz.
        extraText: text,
        size: parseSize(text.match(/💾\s*([^\n👤⚙️]+)/u)?.[1]),
        seeders: Number(text.match(/👤\s*(\d+)/u)?.[1]) || 0,
        tracker: text.match(/⚙️\s*([^\n]+)/u)?.[1]?.trim() || 'Torrentio',
        fileIdx: Number.isInteger(s.fileIdx) ? s.fileIdx : undefined,
        source: 'Torrentio',
      };
    });
}
