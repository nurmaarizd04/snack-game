/** Efek suara pendek yang dibuat langsung oleh browser (Web Audio), tanpa file suara. */

let ctx: AudioContext | null = null;
let aktif = true;

export function aturSuara(hidup: boolean): void {
  aktif = hidup;
}

/** Browser baru mengizinkan suara setelah pemain menyentuh/menekan tombol. */
export function bukaSuara(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

/** AudioContext bersama (dipakai juga oleh musik), null bila belum dibuka/tidak didukung. */
export function konteksAudio(): AudioContext | null {
  return ctx;
}

function nada(frek: number, mulai: number, durasi: number, jenis: OscillatorType = "square", volume = 0.08): void {
  if (!aktif || !ctx) return;
  const t = ctx.currentTime + mulai;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = jenis;
  osc.frequency.setValueAtTime(frek, t);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + durasi);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + durasi + 0.02);
}

export const bunyi = {
  makan: () => nada(880, 0, 0.08),
  bonus: () => [660, 880, 1320].forEach((f, i) => nada(f, i * 0.07, 0.1, "triangle", 0.1)),
  kalah: () => [440, 330, 220, 150].forEach((f, i) => nada(f, i * 0.12, 0.16, "sawtooth", 0.06)),
  menang: () => [523, 659, 784, 1047].forEach((f, i) => nada(f, i * 0.1, 0.18, "triangle", 0.1)),
  klik: () => nada(1200, 0, 0.03, "square", 0.04),
  /** Sirene dua nada saat musuh datang. */
  musuhDatang: () => [740, 520, 740, 520].forEach((f, i) => nada(f, i * 0.13, 0.12, "sawtooth", 0.05)),
  musuhMakan: () => nada(220, 0, 0.1, "square", 0.05),
  /** Musuh dikalahkan: nada turun + naik kemenangan. */
  musuhMati: () => {
    [300, 200, 120].forEach((f, i) => nada(f, i * 0.05, 0.08, "sawtooth", 0.07));
    [784, 1047, 1568].forEach((f, i) => nada(f, 0.18 + i * 0.07, 0.12, "triangle", 0.09));
  },
};
