export interface Titik {
  x: number;
  y: number;
}

export type Arah = "atas" | "bawah" | "kiri" | "kanan";

/** klasik = tembus tepi dan keluar di sisi seberang; dinding = menyentuh tepi berarti kalah. */
export type Mode = "klasik" | "dinding";

export type Status = "main" | "kalah" | "menang";

export interface Makanan {
  posisi: Titik;
  /** Indeks gambar buah (untuk tampilan saja). */
  jenis: number;
}

export interface Bonus {
  posisi: Titik;
  /** Langkah tersisa sebelum bonus hilang. */
  sisaLangkah: number;
}

/** Ular musuh: berebut buah; kepalanya menabrak badan pemain = musuh mati. */
export interface Musuh {
  /** Kepala di indeks 0. */
  ular: Titik[];
  arah: Arah;
  tumbuh: number;
}

export interface StateGame {
  kolom: number;
  baris: number;
  mode: Mode;
  /** Kepala di indeks 0. */
  ular: Titik[];
  arah: Arah;
  /** Arah yang sudah ditekan tapi belum dijalankan (maks. 2, supaya belokan cepat tidak hilang). */
  antrianArah: Arah[];
  makanan: Makanan;
  bonus: Bonus | null;
  skor: number;
  jumlahMakan: number;
  /** Ruas yang masih harus ditambahkan di ekor. */
  tumbuh: number;
  status: Status;
  musuh: Musuh | null;
  /** Langkah sampai musuh (berikutnya) muncul; null = menunggu skor mencapai SKOR_MUSUH. */
  musuhDalam: number | null;
}

/** Kejadian dalam satu langkah, untuk suara dan efek. */
export type Kejadian =
  | "makan"
  | "bonus"
  | "bonus-hilang"
  | "kalah"
  | "menang"
  | "musuh-datang"
  | "musuh-makan"
  /** Musuh menabrak badan pemain: pemain dapat SKOR_KALAHKAN_MUSUH. */
  | "musuh-mati"
  /** Musuh menabrak dinding/badannya sendiri (tanpa skor). */
  | "musuh-tabrak";

/** Angka acak 0 ≤ n < 1 (bisa diganti di test). */
export type Acak = () => number;
