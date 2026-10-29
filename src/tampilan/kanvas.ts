import { UMUR_BONUS } from "../game/aturan";
import type { Arah, StateGame, Titik } from "../game/tipe";

/** Menggambar papan ke canvas: ular bergradasi, buah, bintang bonus, dan partikel. */

const BUAH = ["🍎", "🍊", "🍇", "🍓", "🍉"];
const WARNA_BUAH = ["#ff5d73", "#ffa23e", "#a970ff", "#ff4f9a", "#4fdc7c"];

/** Warna ruas ke-i dari n. */
type Palet = (i: number, n: number) => string;
type Mata = "biasa" | "marah" | "mati";

const warnaPemain: Palet = (i, n) => `hsl(${155 + (i / Math.max(1, n - 1)) * 130}, 85%, ${60 - (i / n) * 12}%)`;
/** Musuh: merah ke oranye. */
const warnaMusuh: Palet = (i, n) => `hsl(${(352 + (i / Math.max(1, n - 1)) * 40) % 360}, 90%, ${58 - (i / n) * 10}%)`;

interface Partikel {
  x: number;
  y: number;
  vx: number;
  vy: number;
  umur: number;
  warna: string;
}

export class Kanvas {
  private readonly ctx: CanvasRenderingContext2D;
  private sel = 0;
  private partikel: Partikel[] = [];
  private kilat = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D tidak didukung");
    this.ctx = ctx;
  }

  /** Sesuaikan ukuran piksel dengan ukuran tampil × devicePixelRatio supaya tajam. */
  ukurUlang(kolom: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const lebar = this.canvas.clientWidth;
    this.canvas.width = Math.round(lebar * dpr);
    this.canvas.height = Math.round(lebar * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.sel = lebar / kolom;
  }

  /** Ledakan partikel kecil di petak `titik`. */
  ledak(titik: Titik, warna: string[], jumlah = 14): void {
    const cx = (titik.x + 0.5) * this.sel;
    const cy = (titik.y + 0.5) * this.sel;
    for (let i = 0; i < jumlah; i++) {
      const sudut = (Math.PI * 2 * i) / jumlah + Math.random() * 0.5;
      const laju = this.sel * (0.04 + Math.random() * 0.08);
      this.partikel.push({
        x: cx,
        y: cy,
        vx: Math.cos(sudut) * laju,
        vy: Math.sin(sudut) * laju,
        umur: 1,
        warna: warna[i % warna.length] ?? "#fff",
      });
    }
  }

  warnaBuah(jenis: number): string {
    return WARNA_BUAH[jenis % WARNA_BUAH.length] ?? "#fff";
  }

  /** Layar berkedip merah sebentar (saat kalah). */
  kedip(): void {
    this.kilat = 1;
  }

  /** Musuh baru muncul: berkedip sebentar sebagai peringatan. */
  musuhMuncul(waktu: number): void {
    this.munculSejak = waktu;
  }

  private munculSejak = -Infinity;

  /**
   * Gambar satu frame. `sebelum`/`sebelumMusuh` = posisi ular di langkah sebelumnya, `t` = 0..1 kemajuan
   * menuju langkah berikutnya (untuk gerak halus di antara langkah).
   */
  gambar(state: StateGame, sebelum: Titik[], sebelumMusuh: Titik[], t: number, waktu: number): void {
    const { ctx, sel } = this;
    const lebar = sel * state.kolom;
    ctx.clearRect(0, 0, lebar, lebar);

    // Papan kotak-kotak.
    for (let y = 0; y < state.baris; y++) {
      for (let x = 0; x < state.kolom; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#18213b" : "#1c2644";
        ctx.fillRect(x * sel, y * sel, sel, sel);
      }
    }

    this.gambarMakanan(state, waktu);
    this.gambarBonus(state, waktu);
    if (state.musuh) {
      const umur = waktu - this.munculSejak;
      // Berkedip 0,8 detik pertama.
      ctx.globalAlpha = umur < 800 ? (Math.floor(umur / 100) % 2 === 0 ? 0.25 : 0.9) : 1;
      this.gambarUlar(state.musuh.ular, sebelumMusuh, t, state.musuh.arah, warnaMusuh, "marah");
      ctx.globalAlpha = 1;
    }
    this.gambarUlar(state.ular, sebelum, t, state.arah, warnaPemain, state.status === "kalah" ? "mati" : "biasa");
    this.gambarPartikel();

    if (this.kilat > 0) {
      ctx.fillStyle = `rgba(255, 70, 90, ${this.kilat * 0.35})`;
      ctx.fillRect(0, 0, lebar, lebar);
      this.kilat = Math.max(0, this.kilat - 0.04);
    }
  }

  private pusat(t: Titik): Titik {
    return { x: (t.x + 0.5) * this.sel, y: (t.y + 0.5) * this.sel };
  }

  private gambarMakanan(state: StateGame, waktu: number): void {
    const { ctx, sel } = this;
    const p = this.pusat(state.makanan.posisi);
    const denyut = 1 + Math.sin(waktu / 180) * 0.08;
    const warna = this.warnaBuah(state.makanan.jenis);
    const cahaya = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sel * 0.9);
    cahaya.addColorStop(0, `${warna}66`);
    cahaya.addColorStop(1, `${warna}00`);
    ctx.fillStyle = cahaya;
    ctx.fillRect(p.x - sel, p.y - sel, sel * 2, sel * 2);
    ctx.font = `${sel * 0.78 * denyut}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(BUAH[state.makanan.jenis % BUAH.length] ?? "🍎", p.x, p.y + sel * 0.05);
  }

  private gambarBonus(state: StateGame, waktu: number): void {
    if (!state.bonus) return;
    const { ctx, sel } = this;
    const p = this.pusat(state.bonus.posisi);
    const sisa = state.bonus.sisaLangkah / UMUR_BONUS;
    // Berkedip cepat saat hampir hilang.
    if (sisa < 0.3 && Math.floor(waktu / 120) % 2 === 0) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.sin(waktu / 250) * 0.25);
    ctx.font = `${sel * 0.9}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⭐", 0, sel * 0.05);
    ctx.restore();
    // Cincin sisa waktu.
    ctx.strokeStyle = "#ffd84d";
    ctx.lineWidth = Math.max(2, sel * 0.08);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(p.x, p.y, sel * 0.62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sisa);
    ctx.stroke();
  }

  private gambarUlar(ular: Titik[], sebelum: Titik[], t: number, arah: Arah, palet: Palet, mata: Mata): void {
    const { ctx, sel } = this;
    const n = ular.length;
    // Posisi halus: geser dari posisi sebelumnya; lompatan tembus tepi tidak dihaluskan.
    const titik = ular.map((s, i) => {
      const lama = sebelum[i] ?? sebelum.at(-1) ?? s;
      const lompat = Math.abs(lama.x - s.x) > 1 || Math.abs(lama.y - s.y) > 1;
      const a = lompat ? s : { x: lama.x + (s.x - lama.x) * t, y: lama.y + (s.y - lama.y) * t };
      return this.pusat(a);
    });
    const warna = (i: number) => palet(i, n);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = n - 1; i > 0; i--) {
      const a = titik[i]!;
      const b = titik[i - 1]!;
      const tebal = sel * (0.78 - (i / n) * 0.22);
      if (Math.hypot(a.x - b.x, a.y - b.y) > sel * 1.5) {
        ctx.fillStyle = warna(i);
        ctx.beginPath();
        ctx.arc(a.x, a.y, tebal / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.strokeStyle = warna(i);
      ctx.lineWidth = tebal;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Kepala + mata.
    const kepala = titik[0]!;
    ctx.fillStyle = warna(0);
    ctx.shadowColor = warna(0);
    ctx.shadowBlur = sel * 0.6;
    ctx.beginPath();
    ctx.arc(kepala.x, kepala.y, sel * 0.46, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    this.gambarMata(kepala, arah, mata);
  }

  private gambarMata(kepala: Titik, arah: Arah, mata: Mata): void {
    const { ctx, sel } = this;
    const maju = { atas: [0, -1], bawah: [0, 1], kiri: [-1, 0], kanan: [1, 0] }[arah];
    const [fx, fy] = maju as [number, number];
    const samping = [-fy, fx];
    for (const s of [-1, 1]) {
      const mx = kepala.x + fx * sel * 0.14 + samping[0]! * s * sel * 0.2;
      const my = kepala.y + fy * sel * 0.14 + samping[1]! * s * sel * 0.2;
      if (mata === "mati") {
        // Mata silang saat kalah.
        ctx.strokeStyle = "#101626";
        ctx.lineWidth = sel * 0.07;
        const r = sel * 0.08;
        ctx.beginPath();
        ctx.moveTo(mx - r, my - r);
        ctx.lineTo(mx + r, my + r);
        ctx.moveTo(mx + r, my - r);
        ctx.lineTo(mx - r, my + r);
        ctx.stroke();
        continue;
      }
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(mx, my, sel * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#101626";
      ctx.beginPath();
      ctx.arc(mx + fx * sel * 0.04, my + fy * sel * 0.04, sel * 0.06, 0, Math.PI * 2);
      ctx.fill();
      if (mata === "marah") {
        // Alis miring ke arah tengah kepala.
        const bx = mx + fx * sel * 0.1;
        const by = my + fy * sel * 0.1;
        const panjang = sel * 0.13;
        ctx.strokeStyle = "#101626";
        ctx.lineWidth = sel * 0.07;
        ctx.beginPath();
        ctx.moveTo(bx - samping[0]! * s * panjang - fx * panjang * 0.6, by - samping[1]! * s * panjang - fy * panjang * 0.6);
        ctx.lineTo(bx + samping[0]! * s * panjang * 0.2 + fx * panjang * 0.2, by + samping[1]! * s * panjang * 0.2 + fy * panjang * 0.2);
        ctx.stroke();
      }
    }
  }

  private gambarPartikel(): void {
    const { ctx, sel } = this;
    this.partikel = this.partikel.filter((p) => p.umur > 0);
    for (const p of this.partikel) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.umur -= 0.035;
      ctx.globalAlpha = Math.max(0, p.umur);
      ctx.fillStyle = p.warna;
      ctx.beginPath();
      ctx.arc(p.x, p.y, sel * 0.12 * p.umur + 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
