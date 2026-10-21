# iky

CLI serbaguna untuk kerja terminal sehari-hari. Satu paket, 50 menu: teks, encoding, waktu, angka, warna, developer, dan file.

```
██╗██╗  ██╗██╗   ██╗
██║██║ ██╔╝╚██╗ ██╔╝
██║█████╔╝  ╚████╔╝
██║██╔═██╗   ╚██╔╝
██║██║  ██╗   ██║
╚═╝╚═╝  ╚═╝   ╚═╝
```

## Kebutuhan

- Node.js 18.17 atau lebih baru.
- Terminal yang mendukung Unicode untuk tampilan terbaik.
- Koneksi internet hanya untuk menu `http`, `dns`, dan `port` ke host luar.

## Pasang

```bash
npm install -g iky
```

Atau jalankan dari repo:

```bash
npm link
```

## Pakai

Buka menu interaktif:

```bash
iky
```

Jalankan menu langsung:

```bash
iky base64 encode "halo dunia"
iky calc "2 ^ 10"
iky json pretty --file package.json
iky uuid 3
iky color "#d95d39"
iky tree . 2
```

Cari menu:

```bash
iky list
iky list json
iky help calc
```

## 50 menu

| No | Menu | Kategori | Kegunaan |
| --- | --- | --- | --- |
| 1 | `info` | Sistem | Ringkasan OS, CPU, memori, dan runtime |
| 2 | `disk` | Sistem | Pemakaian disk sebuah path |
| 3 | `env` | Sistem | Cari environment variable, nilai sensitif disamarkan |
| 4 | `ip` | Sistem | Alamat IP lokal per antarmuka |
| 5 | `port` | Sistem | Cek port TCP menerima koneksi |
| 6 | `process` | Sistem | Detail proses Node yang berjalan |
| 7 | `count` | Teks | Karakter, kata, kalimat, dan waktu baca |
| 8 | `case` | Teks | lower, upper, title, camel, snake, kebab, constant |
| 9 | `slug` | Teks | Slug URL dari teks |
| 10 | `reverse` | Teks | Balik karakter tanpa merusak emoji |
| 11 | `palindrome` | Teks | Cek palindrom |
| 12 | `diff` | Teks | Bandingkan dua teks per baris |
| 13 | `frequency` | Teks | Kata yang paling sering muncul |
| 14 | `replace` | Teks | Ganti literal atau regex |
| 15 | `wrap` | Teks | Bungkus teks pada lebar tertentu |
| 16 | `lines` | Teks | Urutkan, unikkan, trim, balik, nomori baris |
| 17 | `html` | Encoding | Escape atau unescape entitas HTML |
| 18 | `base64` | Encoding | Encode atau decode base64 dan base64url |
| 19 | `urlcode` | Encoding | Encode atau decode komponen URL |
| 20 | `hex` | Encoding | Teks UTF-8 ke hex dan sebaliknya |
| 21 | `hash` | Encoding | md5, sha1, sha256, sha512 untuk teks atau file |
| 22 | `uuid` | Encoding | UUID v4 acak |
| 23 | `jwt` | Encoding | Baca header dan payload JWT |
| 24 | `password` | Encoding | Password acak dengan opsi karakter |
| 25 | `now` | Waktu | Waktu sekarang dalam banyak format |
| 26 | `time` | Waktu | Konversi epoch dan tanggal |
| 27 | `datediff` | Waktu | Selisih hari, minggu, bulan, hari kerja |
| 28 | `age` | Waktu | Usia dan ulang tahun berikutnya |
| 29 | `countdown` | Waktu | Sisa waktu menuju tanggal |
| 30 | `calendar` | Waktu | Kalender satu bulan |
| 31 | `calc` | Angka | Kalkulator ekspresi tanpa eval |
| 32 | `unit` | Angka | Konversi panjang, massa, suhu, data |
| 33 | `percent` | Angka | Persentase, perubahan, rasio |
| 34 | `stats` | Angka | Rata-rata, median, modus, simpangan baku |
| 35 | `prime` | Angka | Cek prima dan faktorisasi |
| 36 | `gcdlcm` | Angka | FPB dan KPK |
| 37 | `dice` | Acak & Warna | Lempar dadu dengan notasi 2d6+3 |
| 38 | `pick` | Acak & Warna | Pilih item acak tanpa pengembalian |
| 39 | `color` | Acak & Warna | Detail hex, RGB, HSL, dan kontras |
| 40 | `contrast` | Acak & Warna | Uji kontras WCAG |
| 41 | `morse` | Acak & Warna | Encode atau decode Morse |
| 42 | `json` | Developer | Validasi, pretty, minify JSON |
| 43 | `jsonpath` | Developer | Ambil nilai JSON dengan path |
| 44 | `url` | Developer | Uraikan komponen URL |
| 45 | `http` | Developer | Status, header, dan waktu respons |
| 46 | `dns` | Developer | Record A, AAAA, MX, TXT, NS, CNAME |
| 47 | `regex` | Developer | Uji regex dan lihat grup |
| 48 | `md-toc` | Developer | Daftar isi dari heading Markdown |
| 49 | `tree` | File | Struktur direktori |
| 50 | `file-info` | File | Statistik file, MIME, SHA-256 |

## Input dari stdin

Menu teks dan developer bisa membaca stdin:

```bash
printf 'halo dunia' | iky count
cat catatan.md | iky md-toc
```

## Lingkungan

| Variable | Efek |
| --- | --- |
| `NO_COLOR=1` | Mematikan warna ANSI |
| `DEBUG=1` | Menampilkan stack trace saat terjadi error |

## Catatan keamanan

- `jwt` hanya membaca isi token. Tanda tangan tidak diverifikasi. Jangan memakai hasilnya untuk keputusan keamanan.
- `password` menampilkan password di terminal. Simpan ke password manager dan bersihkan scrollback bila perlu.
- `hash` dengan md5 atau sha1 hanya cocok untuk checksum, bukan untuk keamanan.
- `env` menyamarkan nilai yang namanya mengandung KEY, TOKEN, SECRET, PASSWORD, AUTH, CREDENTIAL, COOKIE, SESSION, atau SALT.
- `http` tidak menampilkan badan respons.

## Pengembangan

```bash
npm test
npm run smoke
npm --prefix website install
npm run website
```

Website ada di `website/` dan dibangun dengan React, Vite, serta Tailwind. Server pengembangan berjalan di `http://localhost:5173`. Untuk build produksi:

```bash
npm run website:build
npm run website:preview
```

## Publikasi ke npm

Nama paket yang disiapkan adalah `iky`. Sebelum publikasi, cek ketersediaan nama dan masuk ke akun npm:

```bash
npm view iky
npm login
npm publish
```

`prepublishOnly` menjalankan test dan smoke test sebelum paket dikirim.

## Lisensi

MIT. Lihat `LICENSE`.
