import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectLanguages, languageRank } from '../src/language.js';

test('Türkçe dublaj sürümünü tanır', () => {
  const r = detectLanguages('Inception.2010.1080p.BluRay.TR.Dublaj.x264');
  assert.ok(r.languages.includes('tr'));
  assert.equal(r.dub, true);
});

test('Türkçe altyazılı sürümü tanır', () => {
  const r = detectLanguages('Dune.Part.Two.2024.2160p.WEB-DL.Türkçe.Altyazılı');
  assert.ok(r.languages.includes('tr'));
  assert.equal(r.sub, true);
});

test('Torrentio bayrak satırından dilleri okur', () => {
  const r = detectLanguages('Movie.2023.1080p.WEB\n👤 50 💾 2 GB ⚙️ 1337x\nMulti Audio / 🇹🇷 / 🇬🇧');
  assert.deepEqual(r.languages.sort(), ['en', 'tr']);
  assert.equal(r.multi, true);
});

test('başlıktaki rastgele "tr" kelimesini dil saymaz', () => {
  const r = detectLanguages('Star.Trek.tr.2009');
  assert.ok(!r.languages.includes('tr'));
});

test('TR-ENG ikilisini Türkçe olarak tanır', () => {
  assert.ok(detectLanguages('Film.2020.1080p.TR-ENG.Dual').languages.includes('tr'));
});

test('dil sırası puanı', () => {
  const tr = detectLanguages('X.TURKISH.1080p');
  const en = detectLanguages('X.ENGLISH.1080p');
  const multi = detectLanguages('X.MULTI.1080p');
  const none = detectLanguages('X.1080p');
  const pref = ['tr', 'en'];
  assert.equal(languageRank(tr, pref), 0);
  assert.equal(languageRank(en, pref), 1);
  assert.equal(languageRank(multi, pref), 2);
  assert.equal(languageRank(multi, pref, { multiCounts: false }), Infinity);
  assert.equal(languageRank(none, pref), Infinity);
});
