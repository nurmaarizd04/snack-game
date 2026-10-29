# Ular 🐍

Game ular klasik versi warna-warni. Makan buah, kejar ⭐, jangan tabrak badan sendiri! Bisa dimainkan di laptop dan HP, dan bisa di-install seperti aplikasi (PWA).

## Cara main

| | Laptop | HP |
|---|---|---|
| Gerak | WASD (panah juga bisa), atau klik/seret di layar | Geser atau ketuk layar |
| Jeda | Spasi / P / Esc | Tombol ⏸ |
| Mulai | Enter | Tombol Main |

- Buah = +10 dan ular memanjang 1. Makin banyak makan, ular makin cepat.
- Setiap 5 buah muncul ⭐ selama ±5 detik = +50 dan memanjang 2.
- **Klasik**: tembus tepi layar, keluar di sisi seberang. **Dinding**: menyentuh tepi = kalah.
- **Ular musuh** 🔴 muncul setelah skor 50 dan ikut berebut buah. Kepalamu menabrak badan/kepalanya = kalah. Kepalanya menabrak badanmu = musuh kalah, +100, dan musuh baru datang ±5 detik kemudian.
- **Musik** chiptune (tombol 🎵) berganti jadi lebih tegang saat ada musuh, dan makin cepat saat ular makin cepat. Efek suara punya tombol 🔊 sendiri.
- Skor tertinggi disimpan per mode di perangkat ini.

## Menjalankan

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # test aturan permainan
npm run build     # hasil di dist/ (siap di-deploy ke Vercel)
```

## Struktur

```
src/
├── game/          aturan permainan (fungsi murni, dites di tests/)
├── tampilan/      menggambar papan ke canvas
├── kontrol/       keyboard, geser & ketuk layar
├── suara/         efek suara & musik latar (Web Audio)
├── penyimpanan/   skor tertinggi & pengaturan (localStorage)
├── gaya.css
└── main.ts        game loop + layar menu/jeda/selesai
public/            ikon, manifest, service worker
```
