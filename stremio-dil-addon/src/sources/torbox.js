// TorBox Search API: IMDb kimliğine göre torrent listesi döndürür (TorBox API anahtarı gerekir).
import { fetchJson } from '../http.js';

const SEARCH_API = process.env.TORBOX_SEARCH_API || 'https://search-api.torbox.app';

export async function searchTorbox({ imdbId }, cfg) {
  const data = await fetchJson(`${SEARCH_API}/torrents/imdb:${imdbId}`, {
    headers: { Authorization: `Bearer ${cfg.torboxKey}` },
  });
  const items = data?.data?.torrents;
  if (!Array.isArray(items)) return [];
  return items
    .filter((t) => t && typeof t.hash === 'string' && (t.raw_title || t.title))
    .map((t) => ({
      infoHash: t.hash.toLowerCase(),
      title: t.raw_title || t.title,
      size: Number(t.size) || 0,
      seeders: Number(t.last_known_seeders) || 0,
      tracker: t.tracker || 'TorBox',
      fileIdx: undefined,
      source: 'TorBox',
    }));
}
