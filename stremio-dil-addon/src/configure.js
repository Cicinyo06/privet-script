import { DEFAULTS, normalizeConfig } from './config.js';
import { LANGUAGES } from './language.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function configurePage(cfg) {
  const c = normalizeConfig(cfg || DEFAULTS);
  const langOptions = Object.entries(LANGUAGES)
    .map(([code, l]) => `<option value="${code}">${l.flag} ${esc(l.name)} (${code})</option>`)
    .join('');

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dil Odaklı Debrid</title>
<style>
  :root{--bg:#14121c;--card:#1e1b2b;--fg:#ece9f5;--mut:#a39fb5;--acc:#8a5cf6;--line:#2f2a42}
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}
  main{max-width:640px;margin:0 auto;padding:24px 16px 64px} h1{font-size:22px;margin:0 0 4px} p.m{color:var(--mut);margin:0 0 20px}
  fieldset{border:1px solid var(--line);background:var(--card);border-radius:10px;padding:14px 16px;margin:0 0 16px}
  legend{padding:0 6px;font-weight:600} label{display:block;margin:10px 0 4px;color:var(--mut);font-size:13px}
  input[type=text],input[type=password],input[type=number],select{width:100%;padding:9px 10px;border-radius:8px;border:1px solid var(--line);background:#12101a;color:var(--fg);font:inherit}
  .row{display:flex;gap:10px;flex-wrap:wrap}.row>*{flex:1 1 140px} .chk{display:flex;gap:8px;align-items:center;color:var(--fg);font-size:14px}
  .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.chip{background:#2a2540;border-radius:99px;padding:4px 10px;font-size:13px;cursor:pointer}
  button,a.btn{display:inline-block;background:var(--acc);color:#fff;border:0;border-radius:8px;padding:11px 16px;font:inherit;font-weight:600;cursor:pointer;text-decoration:none}
  .out{word-break:break-all;background:#12101a;border:1px solid var(--line);border-radius:8px;padding:10px;margin-top:12px;font-size:12px;display:none}
  .hide{display:none} small{color:var(--mut)}
</style></head><body><main>
<h1>Dil Odaklı Debrid</h1>
<p class="m">Torrentio benzeri arama, sadece seçtiğin debrid ile ve tercih ettiğin dile göre sıralı.</p>
<form id="f">
<fieldset><legend>Debrid</legend>
  <label>Servis</label>
  <select id="debrid"><option value="torbox">TorBox (doğrudan)</option><option value="stremthru">Diğer debrid (StremThru üzerinden)</option></select>
  <label>TorBox API anahtarı <small>(TorBox araması için de kullanılır)</small></label>
  <input id="torboxKey" type="password" autocomplete="off" value="${esc(c.torboxKey)}">
  <div id="st" class="hide">
    <label>StremThru adresi</label><input id="stremthruUrl" type="text" placeholder="https://stremthru.ornek.com" value="${esc(c.stremthruUrl)}">
    <div class="row">
      <div><label>Debrid servisi</label><select id="stremthruStore">
        ${['realdebrid', 'alldebrid', 'premiumize', 'debridlink', 'easydebrid', 'offcloud', 'pikpak', 'torbox'].map((s) => `<option${s === c.stremthruStore ? ' selected' : ''}>${s}</option>`).join('')}
      </select></div>
      <div><label>Debrid API anahtarı</label><input id="stremthruToken" type="password" autocomplete="off" value="${esc(c.stremthruToken)}"></div>
    </div>
  </div>
</fieldset>
<fieldset><legend>Arama kaynakları</legend>
  <label class="chk"><input type="checkbox" id="src_torbox"> TorBox Search API <small>(TorBox anahtarı gerekir)</small></label>
  <label class="chk"><input type="checkbox" id="src_torrentio"> Torrentio</label>
</fieldset>
<fieldset><legend>Dil</legend>
  <label>Öncelik sırası (virgülle, ör. <b>tr,en</b>)</label>
  <input id="languages" type="text" value="${esc(c.languages.join(','))}">
  <div class="row"><div><label>Dil ekle</label><select id="addLang"><option value="">Seç…</option>${langOptions}</select></div>
  <div><label>Mod</label><select id="languageMode"><option value="prefer">Tercih edilenleri üste al</option><option value="only">Sadece bu dilleri göster</option></select></div></div>
  <label class="chk"><input type="checkbox" id="multiCounts"> MULTI / Dual Audio sürümleri de eşleşme sayılsın</label>
</fieldset>
<fieldset><legend>Filtreler</legend>
  <label class="chk"><input type="checkbox" id="onlyCached"> Sadece debrid önbelleğinde olanlar (anında oynatma)</label>
  <label class="chk"><input type="checkbox" id="excludeCam"> CAM/TS sürümlerini gizle</label>
  <div class="row">
    <div><label>En yüksek çözünürlük</label><select id="maxResolution">${[2160, 1080, 720, 480].map((r) => `<option value="${r}">${r}p</option>`).join('')}</select></div>
    <div><label>En düşük çözünürlük</label><select id="minResolution"><option value="0">Yok</option>${[480, 720, 1080].map((r) => `<option value="${r}">${r}p</option>`).join('')}</select></div>
    <div><label>Maks. sonuç</label><input id="maxResults" type="number" min="1" max="100" value="${c.maxResults}"></div>
  </div>
</fieldset>
<button type="submit">Stremio'ya kur</button> <button type="button" id="copy">Bağlantıyı kopyala</button>
<div class="out" id="out"></div>
</form>
<script>
const cfg = ${JSON.stringify({ ...c, torboxKey: undefined, stremthruToken: undefined }).replace(/</g, '\\u003c')};
const $ = (id) => document.getElementById(id);
$('debrid').value = cfg.debrid; $('languageMode').value = cfg.languageMode;
$('maxResolution').value = cfg.maxResolution; $('minResolution').value = cfg.minResolution;
for (const k of ['multiCounts','onlyCached','excludeCam']) $(k).checked = cfg[k];
for (const s of ['torbox','torrentio']) $('src_'+s).checked = cfg.sources.includes(s);
const toggle = () => $('st').classList.toggle('hide', $('debrid').value !== 'stremthru');
$('debrid').onchange = toggle; toggle();
$('addLang').onchange = (e) => { const v = e.target.value; if (!v) return;
  const list = $('languages').value.split(',').map(s=>s.trim()).filter(Boolean);
  if (!list.includes(v)) list.push(v); $('languages').value = list.join(','); e.target.value=''; };
function build() {
  const c = {
    debrid: $('debrid').value, torboxKey: $('torboxKey').value.trim(),
    stremthruUrl: $('stremthruUrl').value.trim(), stremthruStore: $('stremthruStore').value, stremthruToken: $('stremthruToken').value.trim(),
    sources: ['torbox','torrentio'].filter(s => $('src_'+s).checked),
    languages: $('languages').value.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean),
    languageMode: $('languageMode').value, multiCounts: $('multiCounts').checked, onlyCached: $('onlyCached').checked,
    excludeCam: $('excludeCam').checked, maxResolution: +$('maxResolution').value, minResolution: +$('minResolution').value,
    maxResults: +$('maxResults').value || 30,
  };
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(c)))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');
  return location.origin + '/' + b64 + '/manifest.json';
}
const isLocal = /^(127\\.0\\.0\\.1|localhost)$/.test(location.hostname);
$('f').onsubmit = (e) => {
  e.preventDefault(); const u = build();
  // Stremio, stremio:// bağlantısını https'e çevirip portu düşürüyor; yerel kurulumda http adresini elle yapıştırmak gerekiyor.
  if (isLocal) { navigator.clipboard?.writeText(u); show(u, true); return; }
  location.href = u.replace(/^https?:/, 'stremio:'); show(u);
};
$('copy').onclick = () => { const u = build(); navigator.clipboard?.writeText(u); show(u); };
function show(u, local){ $('out').style.display='block';
  $('out').textContent = (local ? 'Bağlantı kopyalandı. Stremio > Eklentiler > "Eklentileri ara" kutusuna yapıştırıp Enter’a bas:\\n\\n' : '') + u; $('out').style.whiteSpace='pre-wrap'; }
</script>
</main></body></html>`;
}
