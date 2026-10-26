// Kullanıcı ayarları Stremio kurulum URL'sine base64url JSON olarak gömülür.

export const DEFAULTS = {
  debrid: 'torbox', // 'torbox' | 'stremthru'
  torboxKey: '',
  stremthruUrl: '',
  stremthruStore: 'realdebrid', // realdebrid, alldebrid, premiumize, debridlink, easydebrid, offcloud, pikpak, torbox
  stremthruToken: '',
  sources: ['torbox'], // 'torbox' (TorBox Search API, TorBox anahtarı gerekir), 'torrentio'
  torrentioUrl: 'https://torrentio.strem.fun',
  languages: ['tr', 'en'], // öncelik sırası
  languageMode: 'prefer', // 'prefer' = önce göster, 'only' = sadece bunları göster
  multiCounts: true, // "MULTI/Dual" sürümleri dil eşleşmesi say
  onlyCached: true,
  excludeCam: true,
  maxResolution: 2160,
  minResolution: 0,
  maxResults: 30,
};

export function encodeConfig(cfg) {
  return Buffer.from(JSON.stringify(cfg), 'utf8').toString('base64url');
}

export function decodeConfig(str) {
  let parsed = {};
  if (str) {
    try {
      parsed = JSON.parse(Buffer.from(str, 'base64url').toString('utf8'));
    } catch {
      throw new Error('Geçersiz yapılandırma');
    }
  }
  return normalizeConfig(parsed);
}

export function normalizeConfig(input) {
  const cfg = { ...DEFAULTS, ...(input && typeof input === 'object' ? input : {}) };
  cfg.debrid = cfg.debrid === 'stremthru' ? 'stremthru' : 'torbox';
  cfg.languages = toList(cfg.languages).map((l) => l.toLowerCase());
  cfg.sources = toList(cfg.sources).filter((s) => ['torbox', 'torrentio'].includes(s));
  if (!cfg.sources.length) cfg.sources = cfg.torboxKey ? ['torbox'] : ['torrentio'];
  cfg.languageMode = cfg.languageMode === 'only' ? 'only' : 'prefer';
  for (const k of ['multiCounts', 'onlyCached', 'excludeCam']) cfg[k] = Boolean(cfg[k]);
  for (const k of ['maxResolution', 'minResolution', 'maxResults']) cfg[k] = Number(cfg[k]) || DEFAULTS[k];
  cfg.stremthruUrl = String(cfg.stremthruUrl || '').replace(/\/+$/, '');
  cfg.torrentioUrl = String(cfg.torrentioUrl || DEFAULTS.torrentioUrl).replace(/\/+$/, '');
  return cfg;
}

function toList(v) {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  return String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
}

export function validateConfig(cfg) {
  const errors = [];
  if (cfg.debrid === 'torbox' && !cfg.torboxKey) errors.push('TorBox API anahtarı gerekli');
  if (cfg.debrid === 'stremthru' && (!cfg.stremthruUrl || !cfg.stremthruToken)) errors.push('StremThru adresi ve debrid anahtarı gerekli');
  if (cfg.sources.includes('torbox') && !cfg.torboxKey) errors.push('TorBox arama kaynağı için TorBox API anahtarı gerekli');
  return errors;
}
