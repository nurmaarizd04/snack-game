import type { Mode } from "../game/tipe";

/** Skor tertinggi dan pengaturan, disimpan di perangkat ini. Semua akses dibungkus try/catch (mode privat tetap jalan). */

const cadangan = new Map<string, string>();

function baca(kunci: string): string | null {
  try {
    return window.localStorage.getItem(kunci) ?? cadangan.get(kunci) ?? null;
  } catch {
    return cadangan.get(kunci) ?? null;
  }
}

function tulis(kunci: string, nilai: string): void {
  cadangan.set(kunci, nilai);
  try {
    window.localStorage.setItem(kunci, nilai);
  } catch {
    // Penyimpanan diblokir: cukup di memori.
  }
}

export function skorTerbaik(mode: Mode): number {
  const n = Number(baca(`ular-terbaik-${mode}`));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Simpan bila lebih tinggi. Mengembalikan true bila rekor baru. */
export function catatSkor(mode: Mode, skor: number): boolean {
  if (skor <= skorTerbaik(mode)) return false;
  tulis(`ular-terbaik-${mode}`, String(skor));
  return true;
}

export function modeTerakhir(): Mode {
  return baca("ular-mode") === "dinding" ? "dinding" : "klasik";
}

export function simpanMode(mode: Mode): void {
  tulis("ular-mode", mode);
}

export function suaraAktif(): boolean {
  return baca("ular-suara") !== "mati";
}

export function simpanSuara(aktif: boolean): void {
  tulis("ular-suara", aktif ? "hidup" : "mati");
}

export function musikAktif(): boolean {
  return baca("ular-musik") !== "mati";
}

export function simpanMusik(aktif: boolean): void {
  tulis("ular-musik", aktif ? "hidup" : "mati");
}
