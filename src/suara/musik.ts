import { konteksAudio } from "./bunyi";

/**
 * Musik latar chiptune yang dibuat langsung dengan Web Audio (tanpa file, tanpa masalah hak cipta).
 * Pola 4 birama × 16 ketukan diulang terus. Dua suasana: santai, dan tegang saat ada ular musuh.
 * Penjadwal "lookahead": setiap 25 ms, not-not untuk 0,12 detik ke depan dijadwalkan di jam audio.
 */

interface Suasana {
  /** Nada akor per birama (MIDI), dimainkan sebagai arpeggio. */
  akor: number[][];
  /** Urutan indeks nada akor per ketukan dalam satu birama; null = diam. */
  arpeggio: (number | null)[];
  /** Ketukan bass dalam satu birama (bass = nada terendah akor, satu oktaf di bawah). */
  bass: number[];
  /** Ketukan hi-hat. */
  hihat: number[];
  /** Ketukan kick. */
  kick: number[];
}

const SANTAI: Suasana = {
  // C – Am – F – G
  akor: [
    [60, 64, 67, 72],
    [57, 60, 64, 69],
    [53, 57, 60, 65],
    [55, 59, 62, 67],
  ],
  arpeggio: [0, null, 1, null, 2, null, 3, 2, null, 1, 2, null, 3, null, 2, 1],
  bass: [0, 3, 6, 8, 11, 14],
  hihat: [2, 6, 10, 14],
  kick: [0, 8],
};

const TEGANG: Suasana = {
  // Am – F – G – E
  akor: [
    [57, 60, 64, 69],
    [53, 57, 60, 65],
    [55, 59, 62, 67],
    [52, 56, 59, 64],
  ],
  arpeggio: [0, 1, 2, 3, 2, 1, 0, 1, 3, 2, 1, 2, 3, 2, 1, 0],
  bass: [0, 2, 4, 6, 8, 10, 12, 14],
  hihat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  kick: [0, 4, 8, 12],
};

const frek = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

let keluaran: GainNode | null = null;
let derau: AudioBuffer | null = null;
let timer: number | null = null;
let ketukan = 0;
let waktuBerikut = 0;
let bpm = 118;
let tegang = false;
let aktif = true;

function siapkan(ctx: AudioContext): GainNode {
  if (!keluaran) {
    keluaran = ctx.createGain();
    keluaran.gain.value = 0.55;
    keluaran.connect(ctx.destination);
  }
  if (!derau) {
    derau = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const data = derau.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return keluaran;
}

function nada(ctx: AudioContext, ke: AudioNode, f: number, t: number, durasi: number, jenis: OscillatorType, volume: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = jenis;
  osc.frequency.setValueAtTime(f, t);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + durasi);
  osc.connect(gain).connect(ke);
  osc.start(t);
  osc.stop(t + durasi + 0.02);
}

function kick(ctx: AudioContext, ke: AudioNode, t: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  gain.gain.setValueAtTime(0.22, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  osc.connect(gain).connect(ke);
  osc.start(t);
  osc.stop(t + 0.17);
}

function hihat(ctx: AudioContext, ke: AudioNode, t: number, volume: number): void {
  if (!derau) return;
  const sumber = ctx.createBufferSource();
  sumber.buffer = derau;
  const saring = ctx.createBiquadFilter();
  saring.type = "highpass";
  saring.frequency.value = 7000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  sumber.connect(saring).connect(gain).connect(ke);
  sumber.start(t);
  sumber.stop(t + 0.05);
}

function jadwalkan(ctx: AudioContext, ke: AudioNode): void {
  const s = tegang ? TEGANG : SANTAI;
  const dalamBirama = ketukan % 16;
  const birama = Math.floor(ketukan / 16) % 4;
  const akor = s.akor[birama]!;
  const durasi = 60 / bpm / 4;
  const t = waktuBerikut;

  const i = s.arpeggio[dalamBirama];
  if (i !== null && i !== undefined) nada(ctx, ke, frek(akor[i]! + 12), t, durasi * 0.9, "square", 0.035);
  if (s.bass.includes(dalamBirama)) {
    const oktaf = dalamBirama % 4 === 0 ? -12 : 0;
    nada(ctx, ke, frek(akor[0]! - 12 + oktaf), t, durasi * 1.6, "triangle", 0.12);
  }
  if (s.kick.includes(dalamBirama)) kick(ctx, ke, t);
  if (s.hihat.includes(dalamBirama)) hihat(ctx, ke, t, dalamBirama % 2 === 0 ? 0.05 : 0.025);

  ketukan = (ketukan + 1) % 64;
  waktuBerikut += durasi;
}

export const musik = {
  aturAktif(hidup: boolean): void {
    aktif = hidup;
    if (!hidup) this.berhenti();
  },

  /** Mulai (atau lanjutkan) musik. `dariAwal` = ulang dari birama pertama. */
  putar(dariAwal = false): void {
    const ctx = konteksAudio();
    if (!aktif || !ctx || timer !== null) return;
    const ke = siapkan(ctx);
    if (dariAwal) ketukan = 0;
    waktuBerikut = ctx.currentTime + 0.05;
    timer = window.setInterval(() => {
      while (waktuBerikut < ctx.currentTime + 0.12) jadwalkan(ctx, ke);
    }, 25);
  },

  berhenti(): void {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
  },

  /** Suasana tegang (ada ular musuh) atau santai. */
  aturTegang(nilai: boolean): void {
    tegang = nilai;
  },

  /** Tempo ikut naik saat ular makin cepat (118–150 BPM). */
  aturTempo(jumlahMakan: number): void {
    bpm = Math.min(150, 118 + jumlahMakan);
  },
};
