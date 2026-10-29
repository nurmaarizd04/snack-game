import type { Acak, Arah, Kejadian, Makanan, Mode, Musuh, StateGame, Titik } from "./tipe";

/** Aturan permainan ular. Fungsi murni: state lama masuk, state baru keluar, tanpa tampilan. */

export const UKURAN_PAPAN = 20;
export const PANJANG_AWAL = 4;
export const SKOR_MAKAN = 10;
export const SKOR_BONUS = 50;
/** Bonus muncul setiap kelipatan makan ini. */
export const BONUS_SETIAP = 5;
export const UMUR_BONUS = 40;
export const JENIS_MAKANAN = 5;

/** Musuh pertama muncul saat skor mencapai ini. */
export const SKOR_MUSUH = 50;
export const SKOR_KALAHKAN_MUSUH = 100;
/** Langkah sampai musuh baru muncul setelah musuh mati (±5 detik). */
export const JEDA_MUSUH = 40;
export const PANJANG_MUSUH = 3;
/** Jarak minimal (petak) tempat musuh muncul dari kepala pemain. */
export const JARAK_MUNCUL_MUSUH = 6;
/** Peluang musuh berbelok acak, bukan mengejar buah (supaya tidak terlalu pintar). */
export const ACAK_MUSUH = 0.25;

const ARAH: Arah[] = ["atas", "bawah", "kiri", "kanan"];

const GESER: Record<Arah, Titik> = {
  atas: { x: 0, y: -1 },
  bawah: { x: 0, y: 1 },
  kiri: { x: -1, y: 0 },
  kanan: { x: 1, y: 0 },
};

const LAWAN: Record<Arah, Arah> = { atas: "bawah", bawah: "atas", kiri: "kanan", kanan: "kiri" };

type Papan = Pick<StateGame, "kolom" | "baris" | "mode">;

export const samaTitik = (a: Titik, b: Titik): boolean => a.x === b.x && a.y === b.y;
const ada = (daftar: readonly Titik[], t: Titik): boolean => daftar.some((d) => samaTitik(d, t));

/** Petak berikutnya ke arah `arah`. Mode klasik tembus tepi; mode dinding: null bila keluar papan. */
function geser(t: Titik, arah: Arah, papan: Papan): Titik | null {
  const x = t.x + GESER[arah].x;
  const y = t.y + GESER[arah].y;
  if (x >= 0 && y >= 0 && x < papan.kolom && y < papan.baris) return { x, y };
  if (papan.mode === "dinding") return null;
  return { x: (x + papan.kolom) % papan.kolom, y: (y + papan.baris) % papan.baris };
}

/** Jarak petak; mode klasik memperhitungkan jalan pintas lewat tepi. */
function jarak(a: Titik, b: Titik, papan: Papan): number {
  let dx = Math.abs(a.x - b.x);
  let dy = Math.abs(a.y - b.y);
  if (papan.mode === "klasik") {
    dx = Math.min(dx, papan.kolom - dx);
    dy = Math.min(dy, papan.baris - dy);
  }
  return dx + dy;
}

/** Jeda antar langkah (ms): makin banyak makan makin cepat, paling cepat 60 ms. */
export function jedaLangkah(jumlahMakan: number): number {
  return Math.max(60, 140 - jumlahMakan * 3);
}

type IsiPapan = Pick<StateGame, "kolom" | "baris" | "ular" | "makanan" | "bonus" | "musuh">;

/** Petak kosong acak, atau null bila papan penuh. */
export function petakKosong(state: IsiPapan, acak: Acak, abaikanMakanan = false): Titik | null {
  const terisi = new Set([...state.ular, ...(state.musuh?.ular ?? [])].map((t) => `${t.x},${t.y}`));
  if (!abaikanMakanan) terisi.add(`${state.makanan.posisi.x},${state.makanan.posisi.y}`);
  if (state.bonus) terisi.add(`${state.bonus.posisi.x},${state.bonus.posisi.y}`);
  const kosong: Titik[] = [];
  for (let y = 0; y < state.baris; y++) {
    for (let x = 0; x < state.kolom; x++) if (!terisi.has(`${x},${y}`)) kosong.push({ x, y });
  }
  if (kosong.length === 0) return null;
  return kosong[Math.floor(acak() * kosong.length)] ?? null;
}

export function buatGame(mode: Mode, acak: Acak = Math.random, ukuran = UKURAN_PAPAN): StateGame {
  const tengah = Math.floor(ukuran / 2);
  const ular = Array.from({ length: PANJANG_AWAL }, (_, i) => ({ x: tengah - i, y: tengah }));
  const dasar: StateGame = {
    kolom: ukuran,
    baris: ukuran,
    mode,
    ular,
    arah: "kanan",
    antrianArah: [],
    makanan: { posisi: { x: -1, y: -1 }, jenis: 0 },
    bonus: null,
    skor: 0,
    jumlahMakan: 0,
    tumbuh: 0,
    status: "main",
    musuh: null,
    musuhDalam: null,
  };
  return { ...dasar, makanan: buatMakanan(dasar, acak) ?? dasar.makanan };
}

function buatMakanan(state: IsiPapan, acak: Acak): Makanan | null {
  const posisi = petakKosong(state, acak, true);
  return posisi ? { posisi, jenis: Math.floor(acak() * JENIS_MAKANAN) } : null;
}

/** Simpan arah yang ditekan. Putar balik dan arah yang sama diabaikan. */
export function ubahArah(state: StateGame, arah: Arah): StateGame {
  if (state.status !== "main" || state.antrianArah.length >= 2) return state;
  const terakhir = state.antrianArah.at(-1) ?? state.arah;
  if (arah === terakhir || arah === LAWAN[terakhir]) return state;
  return { ...state, antrianArah: [...state.antrianArah, arah] };
}

/**
 * Ketuk layar di petak (x, y) (boleh pecahan): belok tegak lurus arah sekarang, ke sisi yang diketuk.
 * Jalan ke kiri/kanan → ketuk di atas kepala = naik, di bawah = turun; jalan ke atas/bawah → kiri/kanan.
 */
export function arahKetuk(state: StateGame, x: number, y: number): Arah {
  const kepala = state.ular[0]!;
  const terakhir = state.antrianArah.at(-1) ?? state.arah;
  if (terakhir === "kiri" || terakhir === "kanan") return y < kepala.y + 0.5 ? "atas" : "bawah";
  return x < kepala.x + 0.5 ? "kiri" : "kanan";
}

/** Jalankan satu langkah: pemain bergerak dulu, lalu musuh. */
export function langkah(state: StateGame, acak: Acak = Math.random): { state: StateGame; kejadian: Kejadian[] } {
  if (state.status !== "main") return { state, kejadian: [] };
  const kejadian: Kejadian[] = [];
  const [arahBaru, ...sisaAntrian] = state.antrianArah;
  const arah = arahBaru ?? state.arah;
  const kalah = (): { state: StateGame; kejadian: Kejadian[] } => ({
    state: { ...state, arah, antrianArah: [], status: "kalah" },
    kejadian: ["kalah"],
  });

  const baru = geser(state.ular[0]!, arah, state);
  if (!baru) return kalah();

  const makan = samaTitik(baru, state.makanan.posisi);
  const kenaBonus = state.bonus !== null && samaTitik(baru, state.bonus.posisi);
  let tumbuh = state.tumbuh + (makan ? 1 : 0) + (kenaBonus ? 2 : 0);

  // Ekor ikut bergeser bila tidak sedang tumbuh, jadi kepala boleh masuk ke petak ekor lama.
  const ekorBergeser = tumbuh === 0;
  const badan = ekorBergeser ? state.ular.slice(0, -1) : state.ular;
  if (ada(badan, baru)) return kalah();
  if (!ekorBergeser) tumbuh -= 1;

  let next: StateGame = {
    ...state,
    arah,
    antrianArah: sisaAntrian,
    ular: [baru, ...badan],
    tumbuh,
    skor: state.skor + (makan ? SKOR_MAKAN : 0) + (kenaBonus ? SKOR_BONUS : 0),
    jumlahMakan: state.jumlahMakan + (makan ? 1 : 0),
    bonus: kenaBonus || !state.bonus ? null : { ...state.bonus, sisaLangkah: state.bonus.sisaLangkah - 1 },
  };

  if (kenaBonus) kejadian.push("bonus");
  if (next.bonus && next.bonus.sisaLangkah <= 0) {
    next = { ...next, bonus: null };
    kejadian.push("bonus-hilang");
  }

  if (makan) {
    kejadian.push("makan");
    const makanan = buatMakanan(next, acak);
    if (!makanan) return { state: { ...next, status: "menang" }, kejadian: [...kejadian, "menang"] };
    next = { ...next, makanan };
    if (next.jumlahMakan % BONUS_SETIAP === 0 && !next.bonus) {
      const posisi = petakKosong(next, acak);
      if (posisi) next = { ...next, bonus: { posisi, sisaLangkah: UMUR_BONUS } };
    }
  }

  next = jalankanMusuh(next, acak, kejadian);
  return { state: next, kejadian };
}

/** Musuh 3 ruas dalam garis lurus, jauh dari kepala pemain, di petak kosong. Null bila belum ada tempat. */
export function munculkanMusuh(state: StateGame, acak: Acak): Musuh | null {
  const kepalaPemain = state.ular[0]!;
  for (let coba = 0; coba < 60; coba++) {
    const kepala = { x: Math.floor(acak() * state.kolom), y: Math.floor(acak() * state.baris) };
    const arah = ARAH[Math.floor(acak() * ARAH.length)] ?? "kanan";
    const g = GESER[arah];
    const ular = Array.from({ length: PANJANG_MUSUH }, (_, i) => ({ x: kepala.x - g.x * i, y: kepala.y - g.y * i }));
    const muat = ular.every((t) => t.x >= 0 && t.y >= 0 && t.x < state.kolom && t.y < state.baris);
    if (!muat || jarak(kepala, kepalaPemain, state) < JARAK_MUNCUL_MUSUH) continue;
    const bentrok = ular.some(
      (t) => ada(state.ular, t) || samaTitik(t, state.makanan.posisi) || (state.bonus && samaTitik(t, state.bonus.posisi)),
    );
    if (!bentrok) return { ular, arah, tumbuh: 0 };
  }
  return null;
}

/** Arah musuh: hindari tabrakan, biasanya mendekati buah, kadang belok acak. */
export function pilihArahMusuh(state: StateGame, musuh: Musuh, acak: Acak): Arah {
  const badan = musuh.tumbuh === 0 ? musuh.ular.slice(0, -1) : musuh.ular;
  const aman = ARAH.filter((a) => a !== LAWAN[musuh.arah])
    .map((a) => ({ arah: a, petak: geser(musuh.ular[0]!, a, state) }))
    .filter((p): p is { arah: Arah; petak: Titik } => p.petak !== null && !ada(badan, p.petak) && !ada(state.ular, p.petak));
  if (aman.length === 0) return musuh.arah;
  if (acak() < ACAK_MUSUH) return aman[Math.floor(acak() * aman.length)]!.arah;
  return aman.reduce((terbaik, p) =>
    jarak(p.petak, state.makanan.posisi, state) < jarak(terbaik.petak, state.makanan.posisi, state) ? p : terbaik,
  ).arah;
}

function jalankanMusuh(state: StateGame, acak: Acak, kejadian: Kejadian[]): StateGame {
  const musuh = state.musuh;
  if (!musuh) {
    if (state.musuhDalam === null && state.skor < SKOR_MUSUH) return state;
    const dalam = state.musuhDalam ?? 0;
    if (dalam > 0) return { ...state, musuhDalam: dalam - 1 };
    const baru = munculkanMusuh(state, acak);
    if (!baru) return { ...state, musuhDalam: 0 }; // coba lagi di langkah berikutnya
    kejadian.push("musuh-datang");
    return { ...state, musuh: baru, musuhDalam: null };
  }

  const arah = pilihArahMusuh(state, musuh, acak);
  const kepala = geser(musuh.ular[0]!, arah, state);
  const ekorBergeser = musuh.tumbuh === 0;
  const badan = ekorBergeser ? musuh.ular.slice(0, -1) : musuh.ular;
  const hilang = { ...state, musuh: null, musuhDalam: JEDA_MUSUH };

  if (!kepala || ada(badan, kepala)) {
    kejadian.push("musuh-tabrak");
    return hilang;
  }
  if (samaTitik(kepala, state.ular[0]!)) {
    kejadian.push("kalah");
    return { ...state, status: "kalah", antrianArah: [] };
  }
  if (ada(state.ular.slice(1), kepala)) {
    kejadian.push("musuh-mati");
    return { ...hilang, skor: state.skor + SKOR_KALAHKAN_MUSUH };
  }

  const makan = samaTitik(kepala, state.makanan.posisi);
  const tumbuh = musuh.tumbuh + (makan ? 1 : 0);
  const ular = tumbuh > 0 ? [kepala, ...musuh.ular] : [kepala, ...badan];
  let next: StateGame = { ...state, musuh: { ular, arah, tumbuh: Math.max(0, tumbuh - 1) } };

  if (makan) {
    kejadian.push("musuh-makan");
    next = { ...next, makanan: buatMakanan(next, acak) ?? next.makanan };
  }
  // Kepala pemain masuk ke badan musuh (setelah musuh bergerak).
  if (ada(ular, state.ular[0]!)) {
    kejadian.push("kalah");
    return { ...next, status: "kalah", antrianArah: [] };
  }
  return next;
}
