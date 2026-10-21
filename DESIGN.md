# Arah desain iky

## Ringkasan

Website resmi `iky` memakai bahasa visual **Neomorphic Control Deck**: permukaan keramik yang terasa bisa ditekan, dengan satu panel kaca cair sebagai aksen. Produknya adalah CLI untuk pekerjaan terminal, jadi situs harus terasa seperti perangkat kerja yang tenang, bukan halaman pemasaran SaaS.

Kalimat arah: *Reading this as: developer tool landing and documentation untuk pengguna terminal, dengan bahasa Neomorphic Control Deck, dial ENERGY 2 / RHYTHM 3 / MOTION 2.*

## Kenapa arah ini

- **Neomorphic** cocok karena CLI adalah alat yang disentuh berulang: tombol dan panel terasa seperti kontrol fisik, bukan kartu dekoratif.
- **Liquid glass** dipakai terbatas pada dock navigasi dan satu panel perintah di hero. Tujuannya menandai dua area yang melayang di atas permukaan, bukan membuat semua elemen transparan.
- **Palet** diambil dari perangkat keras studio: porselen sejuk, tinta biru-hitam, teal dalam, dan satu aksen terakota. Aksen hanya untuk tindakan dan penanda aktif.
- **Tipografi** memakai Bricolage Grotesque untuk display karena punya karakter teknikal yang ramah, IBM Plex Sans untuk teks karena netral dan terbaca, serta IBM Plex Mono untuk perintah.
- **Motif identitas** adalah garis bracket dan permukaan yang ditekan. Logo ASCII dari CLI dipakai sebagai bukti nyata produk, bukan ilustrasi dekoratif.

## Token

```css
:root {
  --base: #e7ecf1;
  --surface: #eef2f6;
  --surface-raised: #f4f7fa;
  --ink: #17232d;
  --ink-2: #3d4c57;
  --ink-3: #55636e;
  --line: #c9d3dc;
  --teal: #23615c;
  --accent: #b34527;
  --accent-hover: #96391f;
  --accent-ink: #fff8f4;
  --radius-s: 10px;
  --radius-m: 18px;
  --radius-l: 28px;
  --shadow-raised: 10px 10px 24px #c3ccd6, -10px -10px 24px #ffffff;
  --shadow-pressed: inset 4px 4px 10px #c3ccd6, inset -4px -4px 10px #ffffff;
  --glow: 0 0 0 1px rgb(255 255 255 / 0.45), 0 18px 44px rgb(23 35 45 / 0.18);
}
```

Mode gelap memakai dasar `#151c22`, permukaan `#1b242c`, tinta `#edf2f6`, dan bayangan `#0b1015` / `#26323c`. Kedua mode memakai token yang sama, hanya nilainya berubah.

## Aturan

- Satu aksen: terakota `--accent`. Tidak ada gradasi ungu-biru.
- Liquid glass maksimal dua area: dock bawah dan panel perintah hero.
- Radius memakai tiga tingkat sesuai peran: kontrol kecil, panel, dan dock.
- Bayangan hanya untuk permukaan yang memang naik dari latar. Teks dan garis tetap datar.
- Tidak ada emoji sebagai ikon. Ikon dock digambar sebagai SVG 24x24 dengan goresan yang sama.
- Navigasi bawah memesan ruang aman, tidak menutupi konten.
- Semua tombol punya keadaan hover, active, focus-visible, disabled, dan loading bila relevan.
- Motion hanya untuk umpan balik dan transisi panel; hormati `prefers-reduced-motion`.

## Dials

- ENERGY 2: tegas, tetapi tidak berteriak.
- RHYTHM 3: hero asimetris, daftar menu bergaris, bagian pasang memakai panel lebar, footer ringkas.
- MOTION 2: transisi state dan reveal halus, tanpa loop dekoratif.

## Yang sengaja tidak dilakukan

- Tidak ada hero centered raksasa.
- Tidak ada blob, orb, grid latar, atau glow di semua elemen.
- Tidak ada kartu fitur seragam untuk 50 menu; menu ditampilkan sebagai daftar yang bisa dicari.
- Tidak ada testimoni, statistik pengguna, atau logo pelanggan yang dibuat-buat.
- Tidak ada tiga kolom harga.
