# Calcora — Smart Web Calculator

Kalkulator berbasis web dengan antarmuka modern dan responsif, dibuat sebagai
proyek individu **Tugas I — Pengembangan Aplikasi Berbasis Web (PABWE)**,
Institut Teknologi Del, T.A. 2026/2027, dengan memanfaatkan Generative AI
sebagai asisten pemrograman.

- **Nama:** Dimas Rexan Samuel Sidabutar
- **NIM:** 11S24010
- **Program Studi:** Informatika, Fakultas Informatika dan Teknik Elektro

## Teknologi

HTML5, CSS3, dan Vanilla JavaScript. Tanpa framework, tanpa build tool,
tanpa dependensi runtime.

## Fitur

| Kelompok | Fitur |
|---|---|
| Kalkulasi | `+` `−` `×` `÷`, angka 0–9, desimal, `=`, persen (`%`), ubah tanda (`±`) |
| Penyuntingan | `AC` (hapus semua), `DEL` (hapus satu karakter), operator ganda otomatis diganti, desimal ganda dan angka nol di depan dicegah |
| Tampilan | Ekspresi dan hasil terpisah, pratinjau hasil saat mengetik, ukuran huruf menyesuaikan panjang angka |
| Riwayat | Daftar perhitungan (maks. 50), tersimpan di `localStorage`, tombol hapus riwayat, klik entri untuk memakai hasilnya lagi |
| Tema | Terang/gelap, pilihan disimpan di `localStorage`, mengikuti preferensi sistem saat belum pernah dipilih |
| Keyboard | `0–9`, `.` atau `,`, `+ - * /` (juga `x`), `%`, `Enter` atau `=`, `Backspace` (DEL), `Esc` atau `Delete` (AC) |
| Galat | Pembagian nol, ekspresi tidak valid, dan hasil tidak terdefinisi (overflow) menampilkan pesan yang jelas |
| Keamanan | Ekspresi diproses parser sendiri; **tidak memakai `eval()` atau `new Function()`** |
| Responsif | Laptop (dua kolom), tablet dan ponsel (satu kolom) |

### Fitur tambahan (di luar daftar wajib)
- Pratinjau hasil (`= 14`) saat ekspresi masih diketik.
- Tanda kurung didukung oleh mesin kalkulasi (diuji pada unit test), tetapi belum
  ada tombolnya di antarmuka.
- Klik entri riwayat untuk memakai hasilnya sebagai awal perhitungan baru.
- Menghormati `prefers-reduced-motion` dan `prefers-color-scheme`.

## Struktur direktori

```
calcora-pabwe/
├── index.html              Struktur antarmuka
├── css/
│   └── style.css           Tata letak, tema terang/gelap, animasi, responsivitas
├── js/
│   ├── storage.js          Pembungkus localStorage (+ fallback memori)
│   ├── calculator.js       Tokenizer, parser, evaluator, penyunting ekspresi
│   ├── history.js          Pengelolaan riwayat perhitungan
│   └── app.js              Event listener, state tampilan, integrasi modul
├── tests/
│   ├── calculator.test.js  Unit test mesin kalkulasi (Node.js, tanpa library)
│   └── app.test.js         Unit test storage, riwayat, dan logika status app
├── docs/
│   └── Laporan_Tugas_I_PABWE_Dimas.pdf
├── package.json            Skrip `npm test` (tanpa dependensi)
├── .gitignore
└── README.md
```

Folder `tests/` ditambahkan dari rancangan awal agar logika matematika dan
penyimpanan dapat diuji otomatis.

### Mengapa tanpa ES Modules?
Berkas dimuat dengan tag `<script>` biasa dan saling terhubung lewat objek
`window.Calcora`. Alasannya: `import`/`export` ES Modules diblokir peramban bila
halaman dibuka langsung dari `file://` (kebijakan CORS), sehingga aplikasi tidak
bisa dijalankan hanya dengan klik ganda `index.html`. Setiap modul juga memiliki
blok `module.exports` agar bisa diuji di Node.js.

Urutan pemuatan di `index.html` penting:
`storage.js` → `calculator.js` → `history.js` → `app.js`.

## Cara menjalankan

**Cara 1 (paling mudah):** buka `index.html` dengan dua kali klik di peramban modern
(Chrome, Edge, Firefox, Safari).

**Cara 2 (server lokal):**
```bash
# dengan Python
python -m http.server 5500
# lalu buka http://localhost:5500
```
atau ekstensi *Live Server* di VS Code.

## Cara menguji

### 1. Unit test otomatis
Memerlukan Node.js 16 atau lebih baru, tanpa `npm install` (tidak ada dependensi):
```bash
npm test                          # menjalankan kedua berkas di bawah
node tests/calculator.test.js     # mesin kalkulasi + penyunting input (82 kasus)
node tests/app.test.js            # storage, riwayat, logika status app (40 kasus)
```
Keluaran yang diharapkan: `Semua 82 kasus uji lulus.` dan `Semua 40 kasus uji lulus.`

### 2. Uji antarmuka
Tidak ada uji antarmuka otomatis; antarmuka diuji manual pada tabel berikut.

### 3. Uji manual di peramban
| No | Skenario | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| 1 | Penjumlahan | `2` `+` `3` `=` | `5` |
| 2 | Prioritas operator | `2` `+` `3` `×` `4` `=` | `14` |
| 3 | Perkalian | `12` `×` `4` `=` | `48` |
| 4 | Bagi nol | `1` `0` `÷` `0` `=` | Pesan "Tidak dapat dibagi nol" |
| 5 | Desimal | `0` `.` `1` `+` `0` `.` `2` `=` | `0.3` |
| 6 | Desimal ganda | `1` `.` `5` `.` | Tetap `1.5` |
| 7 | DEL | `1` `2` `3` `DEL` | `12` |
| 8 | AC | `AC` setelah mengetik | `0` |
| 9 | Persen | `5` `0` `%` `=` | `0.5` |
| 10 | Ubah tanda | `9` `±` | `−9` |
| 11 | Keyboard | ketik `12*4` lalu `Enter` | `48` |
| 12 | Riwayat | hitung beberapa kali lalu muat ulang (F5) | Riwayat tetap ada |
| 13 | Hapus riwayat | klik **Hapus riwayat** lalu F5 | Riwayat kosong |
| 14 | Tema | klik tombol tema lalu F5 | Tema yang dipilih tetap |
| 15 | Responsif | perkecil jendela hingga ±360 px (atau mode perangkat di DevTools) | Tata letak tidak rusak, tidak ada scroll horizontal |

Untuk melihat data tersimpan: DevTools → **Application** → **Local Storage** →
kunci `calcora:history` dan `calcora:theme`.

## Cara kerja singkat mesin kalkulasi

1. **Tokenizer** memecah teks menjadi angka dan operator, serta menolak karakter lain.
2. **Parser** (recursive descent) membangun pohon sintaks dengan prioritas
   `ekspresi → term → unary → postfix (%) → primary`.
3. **Evaluator** menelusuri pohon dan menghitung; pembagian nol dan hasil
   tak hingga dilaporkan sebagai `CalcError`.
4. Hasil dibulatkan ke 12 digit signifikan untuk membuang galat floating point.

## Catatan perilaku
- `%` bekerja sebagai pembagi 100 pada angka di sebelah kirinya
  (`50%` = 0,5; `200 × 10%` = 20).
- Menekan `=` saat ekspresi berakhir operator (mis. `5 +`) menghitung bagian
  yang lengkap (`5`).
- Hasil yang sangat besar/kecil (notasi eksponensial) ditampilkan tetapi tidak
  dilanjutkan sebagai ekspresi baru.
