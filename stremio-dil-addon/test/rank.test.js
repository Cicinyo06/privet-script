import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankTorrents, parseStremioId } from '../src/streams.js';
import { normalizeConfig, encodeConfig, decodeConfig } from '../src/config.js';

const t = (hash, title, extra = {}) => ({ infoHash: hash.repeat(40).slice(0, 40), title, size: 1e9, seeders: 10, tracker: 'x', source: 'test', ...extra });

const movie = parseStremioId('movie', 'tt0000001');
const torrents = [
  t('a', 'Film.2020.2160p.WEB.ENGLISH'),
  t('b', 'Film.2020.1080p.WEB.TR.Dublaj'),
  t('c', 'Film.2020.720p.MULTI'),
  t('d', 'Film.2020.1080p.WEB'),
  t('e', 'Film.2020.HDCAM.TURKISH'),
];

test('tercih edilen dil üste gelir, CAM elenir', () => {
  const cfg = normalizeConfig({ languages: ['tr', 'en'], onlyCached: false });
  const out = rankTorrents(torrents, movie, cfg);
  assert.deepEqual(out.map((x) => x.infoHash[0]), ['b', 'a', 'c', 'd']);
});

test('"only" modu eşleşmeyenleri gizler', () => {
  const cfg = normalizeConfig({ languages: ['tr'], languageMode: 'only', multiCounts: false, onlyCached: false });
  assert.deepEqual(rankTorrents(torrents, movie, cfg).map((x) => x.infoHash[0]), ['b']);
});

test('sadece önbellektekiler', () => {
  const cfg = normalizeConfig({ languages: ['tr'], onlyCached: true });
  const cached = new Map([[torrents[3].infoHash, { files: [{ name: 'Film.TURKISH.mkv', size: 5 }] }]]);
  const out = rankTorrents(torrents, movie, cfg, cached);
  assert.equal(out.length, 1);
  // Dosya adındaki dil bilgisi de hesaba katılır
  assert.ok(out[0].lang.languages.includes('tr'));
});

test('dizi: bölüm içermeyen paketler elenir', () => {
  const ep = parseStremioId('series', 'tt0000002:2:5');
  const list = [t('a', 'Show.S02E05.TR'), t('b', 'Show.S01.TR'), t('c', 'Show.S02.TR')];
  const cached = new Map([[list[2].infoHash, { files: [{ name: 'Show.S02E01.mkv', size: 1 }] }]]);
  const cfg = normalizeConfig({ onlyCached: false });
  assert.deepEqual(rankTorrents(list, ep, cfg, cached).map((x) => x.infoHash[0]), ['a']);
});

test('yapılandırma kodlama/çözme', () => {
  const cfg = normalizeConfig({ torboxKey: 'k', languages: 'tr, de' });
  const back = decodeConfig(encodeConfig(cfg));
  assert.deepEqual(back.languages, ['tr', 'de']);
  assert.equal(back.torboxKey, 'k');
});
