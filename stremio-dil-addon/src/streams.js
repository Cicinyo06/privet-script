// Kaynaklardan torrentleri toplar, dile göre filtreler/sıralar ve debrid önbelleğini kontrol eder.
import { searchTorbox } from './sources/torbox.js';
import { searchTorrentio } from './sources/torrentio.js';
import { detectLanguages, languageRank, languageBadge } from './language.js';
import { parseResolution, isCam, parseFlags, torrentMatchesEpisode, pickFile, formatSize, baseName } from './parse.js';
import { createDebrid } from './debrid/index.js';

const SOURCES = { torbox: searchTorbox, torrentio: searchTorrentio };

export function parseStremioId(type, id) {
  const [imdbId, s, e] = id.split(':');
  const isSeries = type === 'series' && s != null && e != null;
  return { type, id, imdbId, season: isSeries ? +s : null, episode: isSeries ? +e : null };
}

export async function collectTorrents(req, cfg, log = console) {
  const results = await Promise.allSettled(cfg.sources.map((s) => SOURCES[s](req, cfg)));
  const byHash = new Map();
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      log.warn?.(`[${cfg.sources[i]}] kaynak hatası: ${r.reason?.message}`);
      return;
    }
    for (const t of r.value) {
      const prev = byHash.get(t.infoHash);
      if (!prev) byHash.set(t.infoHash, t);
      else {
        prev.seeders = Math.max(prev.seeders, t.seeders);
        prev.size ||= t.size;
        prev.extraText = [prev.extraText, t.extraText].filter(Boolean).join('\n');
        if (prev.fileIdx === undefined) prev.fileIdx = t.fileIdx;
      }
    }
  });
  return [...byHash.values()];
}

/** Saf filtre/sıralama adımı (ağ erişimi yok) — testlerde de kullanılır. */
export function rankTorrents(torrents, req, cfg, cached = null) {
  const out = [];
  for (const t of torrents) {
    const cacheInfo = cached?.get(t.infoHash);
    let file = null;

    if (req.season != null) {
      // Torrentio zaten bölüme göre süzülmüş sonuç döndürüyor (fileIdx).
      if (t.fileIdx === undefined && !torrentMatchesEpisode(t.title, req.season, req.episode)) continue;
      if (cacheInfo?.files?.length) {
        file = pickFile(cacheInfo.files, req.season, req.episode);
        if (!file) continue;
      }
    } else if (cacheInfo?.files?.length) {
      file = pickFile(cacheInfo.files);
    }

    const text = [t.title, t.extraText, file?.name].filter(Boolean).join(' \n ');
    const lang = detectLanguages(text);
    const rank = languageRank(lang, cfg.languages, { multiCounts: cfg.multiCounts });
    if (cfg.languageMode === 'only' && rank === Infinity) continue;

    const resolution = parseResolution(text);
    if (cfg.excludeCam && isCam(t.title)) continue;
    if (resolution && (resolution > cfg.maxResolution || resolution < cfg.minResolution)) continue;

    const isCached = cached ? Boolean(cacheInfo) : null;
    if (cfg.onlyCached && cached && !isCached) continue;

    out.push({
      ...t,
      lang,
      rank,
      resolution,
      flags: parseFlags(text),
      cached: isCached,
      file,
      size: file?.size || t.size,
    });
  }

  out.sort(
    (a, b) =>
      a.rank - b.rank ||
      Number(b.cached) - Number(a.cached) ||
      b.resolution - a.resolution ||
      b.size - a.size ||
      b.seeders - a.seeders,
  );
  return out.slice(0, cfg.maxResults);
}

export async function getStreams(type, id, cfg, playBase, log = console) {
  const req = parseStremioId(type, id);
  const torrents = await collectTorrents(req, cfg, log);
  if (!torrents.length) return [];

  const debrid = createDebrid(cfg);
  let cached = null;
  try {
    cached = await debrid.checkCached(torrents.map((t) => t.infoHash));
  } catch (err) {
    log.warn?.(`[${debrid.name}] önbellek kontrolü başarısız: ${err.message}`);
  }

  return rankTorrents(torrents, req, cfg, cached).map((t) => toStream(t, req, debrid, playBase));
}

function toStream(t, req, debrid, playBase) {
  const status = t.cached === true ? '⚡' : t.cached === false ? '⏳' : '❔';
  const resLabel = t.resolution === 2160 ? '4K' : t.resolution ? `${t.resolution}p` : '?';
  const extras = [t.flags.remux && 'REMUX', t.flags.hdr && 'HDR', t.flags.hevc && 'HEVC'].filter(Boolean).join(' ');
  const badge = languageBadge(t.lang);
  const lines = [
    t.file ? baseName(t.file.name) : t.title,
    [t.size && `💾 ${formatSize(t.size)}`, t.seeders && `👤 ${t.seeders}`, `⚙️ ${t.tracker}`].filter(Boolean).join('  '),
    badge && `🗣️ ${badge}`,
  ].filter(Boolean);

  const s = req.season ?? 0;
  const e = req.episode ?? 0;
  return {
    name: `[${debrid.short}${status}] Dil\n${[resLabel, extras].filter(Boolean).join(' ')}`,
    title: lines.join('\n'),
    url: `${playBase}/${t.infoHash}/${s}/${e}`,
    behaviorHints: {
      bingeGroup: `dil-addon|${resLabel}|${t.lang.languages.join('-')}`,
      filename: t.file ? baseName(t.file.name) : undefined,
      videoSize: t.size || undefined,
      notWebReady: true,
    },
  };
}
