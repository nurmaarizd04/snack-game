import "./gaya.css";
import { SKOR_KALAHKAN_MUSUH, arahKetuk, buatGame, jedaLangkah, langkah, ubahArah } from "./game/aturan";
import type { Arah, Mode, StateGame, Titik } from "./game/tipe";
import { pasangKeyboard, pasangLayar, type AksiKontrol } from "./kontrol/kontrol";
import {
  catatSkor,
  modeTerakhir,
  musikAktif,
  simpanMode,
  simpanMusik,
  simpanSuara,
  skorTerbaik,
  suaraAktif,
} from "./penyimpanan/simpan";
import { aturSuara, bukaSuara, bunyi } from "./suara/bunyi";
import { musik } from "./suara/musik";
import { Kanvas } from "./tampilan/kanvas";

type Fase = "menu" | "main" | "jeda" | "selesai";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const papan = $("papan");
const kanvas = new Kanvas($<HTMLCanvasElement>("kanvas"));
const elSkor = $("skor");
const elTerbaik = $("terbaik");
const elPesan = $("pesan");
const tombolJeda = $<HTMLButtonElement>("tombol-jeda");
const tombolSuara = $<HTMLButtonElement>("tombol-suara");
const tombolMusik = $<HTMLButtonElement>("tombol-musik");
const layar = { menu: $("layar-menu"), jeda: $("layar-jeda"), selesai: $("layar-selesai") };

let mode: Mode = modeTerakhir();
let game: StateGame = buatGame(mode);
let sebelum: Titik[] = game.ular;
let sebelumMusuh: Titik[] = [];
let fase: Fase = "menu";
let langkahTerakhir = 0;
let timerPesan: number | undefined;

function tampilkanLayar(f: Fase): void {
  fase = f;
  layar.menu.classList.toggle("tersembunyi", f !== "menu");
  layar.jeda.classList.toggle("tersembunyi", f !== "jeda");
  layar.selesai.classList.toggle("tersembunyi", f !== "selesai");
  tombolJeda.hidden = f !== "main" && f !== "jeda";
  tombolJeda.textContent = f === "jeda" ? "▶" : "⏸";
  tombolJeda.setAttribute("aria-label", f === "jeda" ? "Lanjut" : "Jeda");
  if (f === "main") musik.putar();
  else musik.berhenti();
}

/** Pesan singkat di tengah atas papan, mis. "Ular musuh datang!". */
function tampilkanPesan(teks: string, jenis: "bahaya" | "hebat"): void {
  elPesan.textContent = teks;
  elPesan.className = `pesan tampil ${jenis}`;
  window.clearTimeout(timerPesan);
  timerPesan = window.setTimeout(() => elPesan.classList.remove("tampil"), 1600);
}

function perbaruiSkor(naik = false): void {
  elSkor.textContent = String(game.skor);
  elTerbaik.textContent = String(Math.max(skorTerbaik(mode), game.skor));
  if (naik) {
    elSkor.classList.remove("naik");
    void elSkor.offsetWidth; // ulang animasi
    elSkor.classList.add("naik");
  }
}

function pilihMode(m: Mode): void {
  mode = m;
  simpanMode(m);
  papan.dataset.mode = m;
  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((b) => {
    b.setAttribute("aria-checked", String(b.dataset.mode === m));
  });
  game = buatGame(m);
  sebelum = game.ular;
  sebelumMusuh = [];
  perbaruiSkor();
}

function mulai(): void {
  bukaSuara();
  bunyi.klik();
  game = buatGame(mode);
  sebelum = game.ular;
  sebelumMusuh = [];
  langkahTerakhir = performance.now();
  perbaruiSkor();
  elPesan.classList.remove("tampil");
  musik.berhenti();
  musik.aturTegang(false);
  musik.aturTempo(0);
  musik.putar(true);
  tampilkanLayar("main");
}

function jedaAtauLanjut(): void {
  if (fase === "main") tampilkanLayar("jeda");
  else if (fase === "jeda") {
    langkahTerakhir = performance.now();
    tampilkanLayar("main");
  }
}

function selesai(): void {
  const rekor = catatSkor(mode, game.skor);
  $("judul-selesai").textContent = game.status === "menang" ? "Kamu menang! 🎉" : "Game Over";
  $("skor-akhir").textContent = String(game.skor);
  $("rekor").classList.toggle("tersembunyi", !rekor);
  $("info-terbaik").textContent = `Terbaik mode ${mode === "klasik" ? "Klasik" : "Dinding"}: ${skorTerbaik(mode)}`;
  perbaruiSkor();
  tampilkanLayar("selesai");
}

/** Tampilkan layar selesai sedikit terlambat (biar efek kalah terlihat), kecuali pemain sudah mulai lagi. */
function selesaiNanti(ms: number): void {
  const akhir = game;
  fase = "selesai";
  musik.berhenti();
  window.setTimeout(() => {
    if (game === akhir) selesai();
  }, ms);
}

function jalankanLangkah(): void {
  const buah = game.makanan;
  const bintang = game.bonus;
  const musuhLama = game.musuh;
  sebelum = game.ular;
  sebelumMusuh = musuhLama?.ular ?? [];
  const hasil = langkah(game);
  game = hasil.state;
  const kepala = game.ular[0]!;
  const sekarang = performance.now();
  for (const k of hasil.kejadian) {
    if (k === "makan") {
      bunyi.makan();
      kanvas.ledak(buah.posisi, [kanvas.warnaBuah(buah.jenis), "#ffffff"]);
      musik.aturTempo(game.jumlahMakan);
      perbaruiSkor(true);
    } else if (k === "bonus" && bintang) {
      bunyi.bonus();
      kanvas.ledak(bintang.posisi, ["#ffd84d", "#fff3a8", "#ffffff"], 22);
      perbaruiSkor(true);
    } else if (k === "musuh-datang" && game.musuh) {
      bunyi.musuhDatang();
      sebelumMusuh = game.musuh.ular;
      kanvas.musuhMuncul(sekarang);
      musik.aturTegang(true);
      tampilkanPesan("⚠️ Ular musuh datang!", "bahaya");
    } else if (k === "musuh-makan") {
      bunyi.musuhMakan();
      kanvas.ledak(buah.posisi, ["#ff5d73", "#ffa23e"], 8);
    } else if ((k === "musuh-mati" || k === "musuh-tabrak") && musuhLama) {
      for (const ruas of musuhLama.ular) kanvas.ledak(ruas, ["#ff5d73", "#ffa23e", "#ffd84d"], 6);
      musik.aturTegang(false);
      if (k === "musuh-mati") {
        bunyi.musuhMati();
        tampilkanPesan(`💥 Musuh kalah! +${SKOR_KALAHKAN_MUSUH}`, "hebat");
        perbaruiSkor(true);
      } else {
        bunyi.musuhMakan();
      }
    } else if (k === "kalah") {
      bunyi.kalah();
      kanvas.kedip();
      kanvas.ledak(kepala, ["#ff5d73", "#ffa23e"], 18);
      sebelum = game.ular;
      sebelumMusuh = game.musuh?.ular ?? [];
      selesaiNanti(900);
    } else if (k === "menang") {
      bunyi.menang();
      selesaiNanti(600);
    }
  }
}

function putaran(sekarang: number): void {
  requestAnimationFrame(putaran);
  let t = 1;
  if (fase === "main") {
    const jeda = jedaLangkah(game.jumlahMakan);
    // Tab tertinggal jauh (mis. HP sempat terkunci): jangan kejar langkah yang tertinggal.
    if (sekarang - langkahTerakhir > 500) langkahTerakhir = sekarang - jeda;
    while (fase === "main" && sekarang - langkahTerakhir >= jeda) {
      jalankanLangkah();
      langkahTerakhir += jeda;
    }
    t = Math.min(1, (sekarang - langkahTerakhir) / jeda);
  }
  kanvas.gambar(game, sebelum, sebelumMusuh, t, sekarang);
}

// Kontrol
const aksi: AksiKontrol = {
  arah: (arah: Arah) => {
    if (fase === "main") game = ubahArah(game, arah);
  },
  jeda: jedaAtauLanjut,
  mulai: () => {
    if (fase === "menu" || (fase === "selesai" && !layar.selesai.classList.contains("tersembunyi"))) mulai();
    else if (fase === "jeda") jedaAtauLanjut();
  },
  ketuk: (x, y) => {
    if (fase === "main") game = ubahArah(game, arahKetuk(game, x * game.kolom, y * game.baris));
  },
};
pasangKeyboard(aksi);
pasangLayar(papan, aksi);

document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((b) => {
  b.addEventListener("click", () => {
    bukaSuara();
    bunyi.klik();
    pilihMode(b.dataset.mode as Mode);
  });
});
document.querySelectorAll<HTMLButtonElement>("[data-ke-menu]").forEach((b) => {
  b.addEventListener("click", () => {
    bunyi.klik();
    pilihMode(mode);
    tampilkanLayar("menu");
  });
});
$("tombol-main").addEventListener("click", mulai);
$("tombol-ulang").addEventListener("click", mulai);
$("tombol-lanjut").addEventListener("click", jedaAtauLanjut);
tombolJeda.addEventListener("click", jedaAtauLanjut);

function perbaruiTombolSuara(): void {
  const hidup = suaraAktif();
  aturSuara(hidup);
  tombolSuara.textContent = hidup ? "🔊" : "🔇";
  tombolSuara.setAttribute("aria-label", hidup ? "Matikan efek suara" : "Nyalakan efek suara");
}
tombolSuara.addEventListener("click", () => {
  simpanSuara(!suaraAktif());
  perbaruiTombolSuara();
  bukaSuara();
  bunyi.klik();
});

function perbaruiTombolMusik(): void {
  const hidup = musikAktif();
  musik.aturAktif(hidup);
  tombolMusik.classList.toggle("mati", !hidup);
  tombolMusik.setAttribute("aria-label", hidup ? "Matikan musik" : "Nyalakan musik");
  tombolMusik.setAttribute("aria-pressed", String(hidup));
}
tombolMusik.addEventListener("click", () => {
  simpanMusik(!musikAktif());
  perbaruiTombolMusik();
  bukaSuara();
  if (musikAktif() && fase === "main") musik.putar();
});

// Otomatis jeda saat aplikasi ditinggal (pindah tab / HP dikunci).
document.addEventListener("visibilitychange", () => {
  if (document.hidden && fase === "main") tampilkanLayar("jeda");
});

$("petunjuk").textContent = matchMedia("(pointer: coarse)").matches
  ? "Geser atau ketuk layar untuk belok"
  : "WASD, atau klik/seret di layar · Spasi untuk jeda";

const ukurUlang = () => kanvas.ukurUlang(game.kolom);
new ResizeObserver(ukurUlang).observe(papan);
ukurUlang();
perbaruiTombolSuara();
perbaruiTombolMusik();
pilihMode(mode);
tampilkanLayar("menu");
requestAnimationFrame(putaran);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
