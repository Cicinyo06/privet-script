import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseResolution, torrentMatchesEpisode, pickFile, parseSize, isCam } from '../src/parse.js';

test('çözünürlük', () => {
  assert.equal(parseResolution('Film.2160p.UHD'), 2160);
  assert.equal(parseResolution('Film 4K HDR'), 2160);
  assert.equal(parseResolution('Film.1080p.WEB'), 1080);
  assert.equal(parseResolution('Film'), 0);
});

test('CAM tespiti', () => {
  assert.ok(isCam('Film.2024.HDCAM.x264'));
  assert.ok(!isCam('Film.2024.1080p.WEB-DL'));
});

test('bölüm eşleşmesi: tek bölüm, sezon paketi, komple', () => {
  assert.ok(torrentMatchesEpisode('Show.S02E05.1080p', 2, 5));
  assert.ok(!torrentMatchesEpisode('Show.S02E06.1080p', 2, 5));
  assert.ok(torrentMatchesEpisode('Show.S02.1080p.TR.Dublaj', 2, 5));
  assert.ok(!torrentMatchesEpisode('Show.S01.1080p', 2, 5));
  assert.ok(torrentMatchesEpisode('Show S01-S04 1080p', 3, 1));
  assert.ok(torrentMatchesEpisode('Show.Sezon.2.Türkçe.Dublaj', 2, 1));
  assert.ok(torrentMatchesEpisode('Show.Complete.Series.1080p', 4, 2));
  assert.ok(!torrentMatchesEpisode('Show.2019.1080p', 2, 5));
  assert.ok(torrentMatchesEpisode('Show.S01E01-E03.720p', 1, 2));
});

test('paket içinden doğru bölüm dosyasını seçer', () => {
  const files = [
    { id: 1, name: 'Show.S02/Show.S02E04.mkv', size: 900 },
    { id: 2, name: 'Show.S02/Show.S02E05.mkv', size: 800 },
    { id: 3, name: 'Show.S02/sample.mkv', size: 10 },
    { id: 4, name: 'Show.S02/info.nfo', size: 1 },
  ];
  assert.equal(pickFile(files, 2, 5).id, 2);
  assert.equal(pickFile(files, 2, 9), null);
  assert.equal(pickFile(files).id, 1);
});

test('boyut ayrıştırma', () => {
  assert.equal(parseSize('2.5 GB'), Math.round(2.5 * 1024 ** 3));
  assert.equal(parseSize('700 MB'), 700 * 1024 ** 2);
});
