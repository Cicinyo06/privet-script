// Sürüm adlarından çözünürlük, kalite ve sezon/bölüm bilgisi çıkarır.

const VIDEO_EXT = /\.(mkv|mp4|avi|m4v|mov|wmv|webm|ts|m2ts|mpg|mpeg)$/i;

export function isVideoFile(name) {
  return VIDEO_EXT.test(name || '') && !/\bsample\b/i.test(name || '');
}

export function parseResolution(title) {
  const t = String(title || '').toLowerCase();
  if (/\b(2160p|4k|uhd)\b/.test(t)) return 2160;
  if (/\b1440p\b/.test(t)) return 1440;
  if (/\b1080[pi]\b/.test(t)) return 1080;
  if (/\b720p\b/.test(t)) return 720;
  if (/\b(576p|480p|sd|dvdrip)\b/.test(t)) return 480;
  return 0;
}

export function isCam(title) {
  return /\b(cam|camrip|hdcam|ts|telesync|hdts|tc|telecine|scr|screener)\b/i.test(String(title || ''));
}

export function parseFlags(title) {
  const t = String(title || '');
  return {
    hdr: /\b(hdr10\+?|hdr|dv|dovi|dolby[ .]?vision)\b/i.test(t),
    hevc: /\b(x265|h\.?265|hevc)\b/i.test(t),
    remux: /\bremux\b/i.test(t),
  };
}

/** Başlıktaki sezon/bölüm numaralarını döndürür. */
export function parseEpisodeInfo(title) {
  const t = String(title || '');
  const seasons = new Set();
  const episodes = new Set();

  for (const m of t.matchAll(/\bS(\d{1,2})[ ._-]?E(\d{1,3})(?:[ ._-]?-?E?(\d{1,3}))?/gi)) {
    seasons.add(+m[1]);
    const from = +m[2];
    const to = m[3] ? +m[3] : from;
    for (let e = from; e <= Math.min(to, from + 50); e++) episodes.add(e);
  }
  for (const m of t.matchAll(/\b(\d{1,2})x(\d{1,3})\b/gi)) {
    seasons.add(+m[1]);
    episodes.add(+m[2]);
  }
  // Sezon aralıkları: S01-S03, Season 1-3, Sezon 1
  for (const m of t.matchAll(/\bS(\d{1,2})\s?-\s?S?(\d{1,2})\b/gi)) {
    for (let s = +m[1]; s <= +m[2]; s++) seasons.add(s);
  }
  for (const m of t.matchAll(/\b(?:season|sezon|saison|temporada|staffel)[ ._-]?(\d{1,2})(?:\s?-\s?(\d{1,2}))?/gi)) {
    const to = m[2] ? +m[2] : +m[1];
    for (let s = +m[1]; s <= to; s++) seasons.add(s);
  }
  if (!seasons.size) {
    for (const m of t.matchAll(/\bS(\d{1,2})\b/gi)) seasons.add(+m[1]);
  }

  const complete = /\b(complete|komple|tum[ ._-]?sezonlar|tüm[ ._-]?sezonlar|all[ ._-]?seasons)\b/i.test(t);
  return { seasons: [...seasons], episodes: [...episodes], complete };
}

/**
 * Bir torrent istenen bölümü içeriyor olabilir mi?
 * Tek bölüm, sezon paketi veya komple dizi paketlerini kabul eder.
 */
export function torrentMatchesEpisode(title, season, episode) {
  const info = parseEpisodeInfo(title);
  if (info.episodes.length) {
    return (!info.seasons.length || info.seasons.includes(season)) && info.episodes.includes(episode);
  }
  if (info.seasons.length) return info.seasons.includes(season);
  return info.complete;
}

/** Dosya listesinden istenen bölüme ait (veya en büyük) video dosyasını seçer. */
export function pickFile(files, season, episode) {
  const videos = (files || []).filter((f) => isVideoFile(f.name));
  if (!videos.length) return null;
  if (season != null && episode != null) {
    const match = videos.filter((f) => {
      const info = parseEpisodeInfo(baseName(f.name));
      return info.episodes.includes(episode) && (!info.seasons.length || info.seasons.includes(season));
    });
    if (match.length) return largest(match);
    return null;
  }
  return largest(videos);
}

function largest(files) {
  return files.reduce((a, b) => ((b.size || 0) > (a.size || 0) ? b : a));
}

export function baseName(path) {
  return String(path || '').split('/').pop();
}

export function formatSize(bytes) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i >= 3 ? 2 : 0)} ${units[i]}`;
}

export function parseSize(text) {
  const m = String(text || '').match(/([\d.,]+)\s*(TB|GB|MB|KB)/i);
  if (!m) return 0;
  const mult = { KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }[m[2].toUpperCase()];
  return Math.round(parseFloat(m[1].replace(',', '.')) * mult);
}
