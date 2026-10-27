# Dil Odaklı Debrid — Stremio eklentisi

Torrentio tarzı arama yapan, ama **sadece senin seçtiğin debrid** (TorBox veya StremThru üzerinden
Real-Debrid / AllDebrid / Premiumize / Debrid-Link / Offcloud …) ile çalışan ve sonuçları
**tercih ettiğin dile göre** (ör. önce Türkçe dublaj/altyazı, sonra İngilizce) süzüp sıralayan bir Stremio eklentisi.

Hiçbir npm bağımlılığı yok; Node.js 20+ yeterli.

## Özellikler

- **Debrid seçimi**
  - TorBox: doğrudan TorBox API (önbellek kontrolü + oynatma bağlantısı).
  - Diğerleri: [StremThru](https://github.com/MunifTanjim/stremthru) üzerinden tek bir arayüzle.
- **Arama kaynakları**
  - TorBox Search API (IMDb kimliğiyle; TorBox anahtarı gerekir).
  - Torrentio (herkese açık uç nokta; dil bayraklarını da okur).
- **Dil odaklı sıralama**
  - Sürüm adı, Torrentio bayrakları (🇹🇷 🇬🇧 …) ve debrid'deki dosya adları üzerinden dil tespiti.
  - Türkçe için `TR`, `Turkish`, `Türkçe`, `Dublaj`, `Altyazı`, `TRDub` vb. kalıplar; dublaj/altyazı ayrımı.
  - Mod: *tercih edilenleri üste al* veya *sadece bu dilleri göster*.
  - `MULTI` / `Dual Audio` sürümlerini isteğe bağlı olarak eşleşme sayma.
- **Filtreler**: sadece önbellektekiler (⚡ anında oynatma), CAM/TS gizleme, çözünürlük aralığı, sonuç sayısı.
- **Diziler**: sezon paketleri içinden doğru bölüm dosyası seçilir; bölümü içermeyen paketler elenir.

## Çalıştırma

**Windows (en kolayı):** [Node.js LTS](https://nodejs.org) kur, bu klasördeki `baslat.bat` dosyasına çift tıkla.
Tarayıcıda ayar sayfası açılır; ayarları yapıp **Stremio'ya kur**'a bas. Pencere açık kaldığı sürece eklenti çalışır.

**Terminalden:**

```bash
cd stremio-dil-addon
npm start              # http://127.0.0.1:7000/configure
npm test               # birim testleri
```

Docker:

```bash
docker build -t dil-addon .
docker run -p 7000:7000 -e BASE_URL=https://addon.ornek.com dil-addon
```

Ardından `/configure` sayfasında debrid'ini, anahtarını ve dil sıranı seçip **Stremio'ya kur**'a bas.

> Stremio uzak eklentiler için **HTTPS** ister (yalnız `127.0.0.1` istisna). Telefonda/TV'de kullanmak için
> bir sunucuya (VPS, Render, Fly.io, Koyeb, kendi evindeki sunucu + Cloudflare Tunnel vb.) kurup `BASE_URL`'yi ayarla.

### Ortam değişkenleri

| Değişken | Açıklama |
| --- | --- |
| `PORT` | Dinlenecek port (varsayılan 7000) |
| `BASE_URL` | Dışarıdan erişilen adres (ters vekil arkasındaysan) |
| `HTTP_TIMEOUT_MS` | Dış API zaman aşımı (varsayılan 15000) |
| `TORBOX_API`, `TORBOX_SEARCH_API` | Test için TorBox adreslerini değiştirmek |

## Nasıl çalışır

```
Stremio ──/stream/series/tt123:1:2.json──▶ eklenti
             │ 1. Kaynaklardan torrentleri topla (TorBox Search / Torrentio)
             │ 2. Debrid'de önbellek kontrolü (dosya listesiyle)
             │ 3. Bölüm eşleştir, dili tespit et, filtrele, sırala
             ◀── stream listesi (URL = eklenti/…/play/<hash>/1/2)
Stremio ──/play/<hash>/1/2──▶ eklenti ──▶ debrid'e ekle → doğru dosya → indirme bağlantısı
             ◀── 302 yönlendirme (doğrudan debrid CDN'i)
```

## Güvenlik notu

Ayarlar (API anahtarı dahil) Stremio eklenti URL'sine gömülür — Torrentio ve diğer debrid eklentileri de böyle çalışır.
Kurulum bağlantını kimseyle paylaşma. Sunucu, anahtar içeren URL'leri loglamaz.

## Yol haritası / fikirler

- Ek kaynaklar (Zilean, Jackett/Prowlarr, MediaFusion).
- Ses dili bilgisini dosya meta verisinden (ffprobe) doğrulama.
- Türkçe içerik siteleri/trackerları için özel kaynak.
- Önbellekte olmayan içerik için "indiriliyor" bilgilendirme videosu.
