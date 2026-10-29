import type { Arah } from "../game/tipe";

export interface AksiKontrol {
  arah: (arah: Arah) => void;
  /** Spasi / P / Esc. */
  jeda: () => void;
  /** Enter. */
  mulai: () => void;
  /** Ketuk papan; x, y = 0..1 dari lebar/tinggi papan. */
  ketuk: (x: number, y: number) => void;
}

const TOMBOL: Record<string, Arah> = {
  ArrowUp: "atas",
  ArrowDown: "bawah",
  ArrowLeft: "kiri",
  ArrowRight: "kanan",
  w: "atas",
  s: "bawah",
  a: "kiri",
  d: "kanan",
};

/** Keyboard: panah/WASD, Spasi/P/Esc untuk jeda, Enter untuk mulai. */
export function pasangKeyboard(aksi: AksiKontrol): void {
  window.addEventListener("keydown", (e) => {
    const arah = TOMBOL[e.key] ?? TOMBOL[e.key.toLowerCase()];
    if (arah) {
      e.preventDefault();
      aksi.arah(arah);
    } else if (e.key === " " || e.key === "p" || e.key === "P" || e.key === "Escape") {
      e.preventDefault();
      aksi.jeda();
    } else if (e.key === "Enter") {
      aksi.mulai();
    }
  });
}

/**
 * Kontrol layar (jari atau mouse), di mana saja di halaman:
 * - geser/seret = belok ke arah geseran (satu geseran = satu belokan),
 * - ketuk papan = belok ke sisi ketukan; posisi dikirim sebagai pecahan 0..1 dari ukuran papan.
 */
export function pasangLayar(papan: HTMLElement, aksi: AksiKontrol): void {
  let awal: { x: number; y: number } | null = null;
  let sudahGeser = false;
  const AMBANG = 20;

  document.addEventListener("pointerdown", (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    awal = { x: e.clientX, y: e.clientY };
    sudahGeser = false;
  });
  // Arah dibaca saat jari masih bergerak supaya terasa responsif.
  document.addEventListener("pointermove", (e) => {
    if (!awal || !e.isPrimary) return;
    const dx = e.clientX - awal.x;
    const dy = e.clientY - awal.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < AMBANG) return;
    aksi.arah(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "kanan" : "kiri") : dy > 0 ? "bawah" : "atas");
    awal = { x: e.clientX, y: e.clientY };
    sudahGeser = true;
  });
  document.addEventListener("pointerup", (e) => {
    if (awal && !sudahGeser && e.isPrimary && e.target instanceof Node && papan.contains(e.target)) {
      const kotak = papan.getBoundingClientRect();
      aksi.ketuk((e.clientX - kotak.left) / kotak.width, (e.clientY - kotak.top) / kotak.height);
    }
    awal = null;
  });
  document.addEventListener("pointercancel", () => {
    awal = null;
  });
}
