// Torrent başlığından ses/altyazı dillerini tahmin eder.
// Başlıklar standart değil; bu yüzden token + bayrak emojisi + kalıp eşleştirmesi kullanıyoruz.

export const LANGUAGES = {
  tr: { name: 'Türkçe', flag: '🇹🇷', tokens: ['tr', 'tur', 'turk', 'turkish', 'turkce', 'türkçe', 'trdub', 'trdublaj', 'tralt', 'dublaj', 'dublajli', 'dublajlı', 'altyazi', 'altyazı', 'altyazili', 'altyazılı'] },
  en: { name: 'English', flag: '🇬🇧', tokens: ['eng', 'english'], extraFlags: ['🇺🇸'] },
  de: { name: 'Deutsch', flag: '🇩🇪', tokens: ['ger', 'german', 'deutsch'] },
  fr: { name: 'Français', flag: '🇫🇷', tokens: ['fre', 'fra', 'french', 'truefrench', 'vf', 'vff', 'vfq', 'vf2', 'vostfr'] },
  es: { name: 'Español', flag: '🇪🇸', tokens: ['spa', 'esp', 'spanish', 'español', 'espanol', 'castellano', 'latino'], extraFlags: ['🇲🇽'] },
  it: { name: 'Italiano', flag: '🇮🇹', tokens: ['ita', 'italian', 'italiano'] },
  pt: { name: 'Português', flag: '🇵🇹', tokens: ['por', 'portuguese', 'dublado', 'ptbr'], extraFlags: ['🇧🇷'] },
  ru: { name: 'Русский', flag: '🇷🇺', tokens: ['rus', 'russian'] },
  pl: { name: 'Polski', flag: '🇵🇱', tokens: ['pol', 'polish', 'lektor'] },
  nl: { name: 'Nederlands', flag: '🇳🇱', tokens: ['dut', 'dutch', 'nld'] },
  ar: { name: 'العربية', flag: '🇸🇦', tokens: ['ara', 'arabic'] },
  hi: { name: 'हिन्दी', flag: '🇮🇳', tokens: ['hin', 'hindi'] },
  ja: { name: '日本語', flag: '🇯🇵', tokens: ['jpn', 'japanese'] },
  ko: { name: '한국어', flag: '🇰🇷', tokens: ['kor', 'korean'] },
};

const MULTI_TOKENS = new Set(['multi', 'multisub', 'dual', 'dualaudio']);
const DUB_TOKENS = new Set(['dub', 'dubbed', 'dublaj', 'dublajli', 'dublajlı', 'trdub', 'trdublaj', 'dublado', 'lektor']);
const SUB_TOKENS = new Set(['sub', 'subs', 'subbed', 'altyazi', 'altyazı', 'altyazili', 'altyazılı', 'tralt', 'vostfr', 'hardsub']);

// "tr" gibi kısa kodlar tek başına yanıltıcı olabilir; yalnızca başka bir dil/kalite token'ı yanındaysa sayılır.
const WEAK_TOKENS = new Set(['tr']);
const WEAK_CONTEXT = new Set(['dub', 'sub', 'eng', 'en', 'dual', 'multi', 'audio', 'ses', '1080p', '720p', '2160p', '480p', 'web', 'webrip', 'webdl', 'bluray', 'x264', 'x265', 'hevc']);

export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/**
 * @returns {{ languages: string[], multi: boolean, dub: boolean, sub: boolean }}
 */
export function detectLanguages(text) {
  const raw = String(text || '');
  const tokens = tokenize(raw);
  const tokenSet = new Set(tokens);
  const found = new Set();

  for (const [code, lang] of Object.entries(LANGUAGES)) {
    const flags = [lang.flag, ...(lang.extraFlags || [])];
    if (flags.some((f) => raw.includes(f))) {
      found.add(code);
      continue;
    }
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (!lang.tokens.includes(t)) continue;
      if (WEAK_TOKENS.has(t)) {
        const neighbours = [tokens[i - 1], tokens[i + 1]];
        if (!neighbours.some((n) => n && (WEAK_CONTEXT.has(n) || isLanguageToken(n)))) continue;
      }
      found.add(code);
      break;
    }
  }

  return {
    languages: [...found],
    multi: tokens.some((t) => MULTI_TOKENS.has(t)) || raw.includes('Multi Audio'),
    dub: tokens.some((t) => DUB_TOKENS.has(t)),
    sub: tokens.some((t) => SUB_TOKENS.has(t)),
  };
}

function isLanguageToken(token) {
  return Object.values(LANGUAGES).some((l) => l.tokens.includes(token) && !WEAK_TOKENS.has(token));
}

/**
 * Tercih edilen dillere göre sıra puanı: 0 en iyisi; eşleşme yoksa Infinity.
 * "multi" etiketli sürümler, açıkça dil belirtilmemişse tercih listesinin sonuna yakın bir puan alır.
 */
export function languageRank(info, preferred, { multiCounts = true } = {}) {
  for (let i = 0; i < preferred.length; i++) {
    if (info.languages.includes(preferred[i])) return i;
  }
  if (multiCounts && info.multi) return preferred.length;
  return Infinity;
}

export function languageBadge(info) {
  const flags = info.languages.map((c) => LANGUAGES[c]?.flag).filter(Boolean);
  if (info.multi) flags.push('🌐');
  const kind = [info.dub && 'Dublaj', info.sub && 'Altyazı'].filter(Boolean).join('+');
  return [flags.join(' '), kind].filter(Boolean).join(' ');
}
