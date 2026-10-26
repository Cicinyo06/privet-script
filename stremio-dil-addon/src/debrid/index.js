import { createTorbox } from './torbox.js';
import { createStremThru } from './stremthru.js';

export function createDebrid(cfg) {
  if (cfg.debrid === 'stremthru') return createStremThru(cfg.stremthruUrl, cfg.stremthruStore, cfg.stremthruToken);
  return createTorbox(cfg.torboxKey);
}
