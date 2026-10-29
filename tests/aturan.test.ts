import { describe, expect, it } from "vitest";
import {
  BONUS_SETIAP,
  PANJANG_AWAL,
  SKOR_BONUS,
  SKOR_MAKAN,
  UMUR_BONUS,
  buatGame,
  JEDA_MUSUH,
  PANJANG_MUSUH,
  SKOR_KALAHKAN_MUSUH,
  SKOR_MUSUH,
  jedaLangkah,
  munculkanMusuh,
  pilihArahMusuh,
  langkah,
  petakKosong,
  ubahArah,
  arahKetuk,
} from "../src/game/aturan";
import type { StateGame } from "../src/game/tipe";

const acakNol = () => 0;

/** Game kecil dengan ular & makanan di posisi tertentu. */
function siapkan(ubah: Partial<StateGame> = {}): StateGame {
  return {
    ...buatGame("klasik", acakNol, 10),
    ular: [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ],
    makanan: { posisi: { x: 9, y: 9 }, jenis: 0 },
    ...ubah,
  };
}

describe("buatGame", () => {
  it("ular di tengah menghadap kanan, makanan tidak di badan ular", () => {
    const g = buatGame("klasik", Math.random);
    expect(g.ular).toHaveLength(PANJANG_AWAL);
    expect(g.ular[0]).toEqual({ x: 10, y: 10 });
    expect(g.arah).toBe("kanan");
    expect(g.ular.some((t) => t.x === g.makanan.posisi.x && t.y === g.makanan.posisi.y)).toBe(false);
  });
});

describe("ubahArah", () => {
  it("putar balik diabaikan", () => {
    expect(ubahArah(siapkan(), "kiri").antrianArah).toEqual([]);
  });

  it("dua belokan cepat disimpan berurutan, lalu dijalankan satu per langkah", () => {
    let g = ubahArah(siapkan(), "atas");
    g = ubahArah(g, "kiri");
    expect(g.antrianArah).toEqual(["atas", "kiri"]);
    g = langkah(g, acakNol).state;
    expect(g.ular[0]).toEqual({ x: 5, y: 4 });
    g = langkah(g, acakNol).state;
    expect(g.ular[0]).toEqual({ x: 4, y: 4 });
  });

  it("belokan yang membalik arah antrian terakhir diabaikan", () => {
    const g = ubahArah(ubahArah(siapkan(), "atas"), "bawah");
    expect(g.antrianArah).toEqual(["atas"]);
  });
});
describe("arahKetuk", () => {
  it("jalan ke kanan: ketuk di atas kepala = naik, di bawah = turun", () => {
    const g = siapkan({ arah: "kanan" });
    expect(arahKetuk(g, 8, 1)).toBe("atas");
    expect(arahKetuk(g, 2, 9)).toBe("bawah");
  });

  it("jalan ke atas: ketuk di kiri/kanan kepala", () => {
    const g = siapkan({ arah: "atas" });
    expect(arahKetuk(g, 1, 5)).toBe("kiri");
    expect(arahKetuk(g, 7.2, 0)).toBe("kanan");
  });

  it("memakai arah terakhir di antrian", () => {
    const g = siapkan({ arah: "kanan", antrianArah: ["atas"] });
    expect(arahKetuk(g, 1, 5)).toBe("kiri");
  });
});


describe("langkah", () => {
  it("bergerak tanpa memanjang", () => {
    const { state } = langkah(siapkan(), acakNol);
    expect(state.ular).toEqual([
      { x: 6, y: 5 },
      { x: 5, y: 5 },
      { x: 4, y: 5 },
    ]);
  });

  it("makan: memanjang, skor +10, makanan baru di petak kosong", () => {
    const { state, kejadian } = langkah(siapkan({ makanan: { posisi: { x: 6, y: 5 }, jenis: 0 } }), acakNol);
    expect(kejadian).toContain("makan");
    expect(state.ular).toHaveLength(4);
    expect(state.skor).toBe(SKOR_MAKAN);
    expect(state.jumlahMakan).toBe(1);
    expect(state.ular.some((t) => t.x === state.makanan.posisi.x && t.y === state.makanan.posisi.y)).toBe(false);
  });

  it("mode klasik: tembus tepi kanan dan keluar di kiri", () => {
    const g = siapkan({ ular: [{ x: 9, y: 2 }, { x: 8, y: 2 }] });
    expect(langkah(g, acakNol).state.ular[0]).toEqual({ x: 0, y: 2 });
  });

  it("mode dinding: menyentuh tepi = kalah", () => {
    const g = siapkan({ mode: "dinding", ular: [{ x: 9, y: 2 }, { x: 8, y: 2 }] });
    const { state, kejadian } = langkah(g, acakNol);
    expect(state.status).toBe("kalah");
    expect(kejadian).toEqual(["kalah"]);
  });

  it("menabrak badan sendiri = kalah", () => {
    // Ular melingkar, kepala belok ke badannya.
    const g = siapkan({
      ular: [
        { x: 5, y: 5 },
        { x: 5, y: 6 },
        { x: 6, y: 6 },
        { x: 6, y: 5 },
        { x: 6, y: 4 },
      ],
      arah: "atas",
      antrianArah: ["kanan"],
    });
    expect(langkah(g, acakNol).state.status).toBe("kalah");
  });

  it("boleh masuk ke petak ekor karena ekornya ikut bergeser", () => {
    const g = siapkan({
      ular: [
        { x: 5, y: 5 },
        { x: 5, y: 6 },
        { x: 6, y: 6 },
        { x: 6, y: 5 },
      ],
      arah: "atas",
      antrianArah: ["kanan"],
    });
    const { state } = langkah(g, acakNol);
    expect(state.status).toBe("main");
    expect(state.ular[0]).toEqual({ x: 6, y: 5 });
  });

  it(`bonus muncul setiap ${BONUS_SETIAP} kali makan dan memberi +${SKOR_BONUS}`, () => {
    let g = siapkan({ jumlahMakan: BONUS_SETIAP - 1, makanan: { posisi: { x: 6, y: 5 }, jenis: 0 } });
    g = langkah(g, acakNol).state;
    expect(g.bonus).not.toBeNull();
    expect(g.bonus?.sisaLangkah).toBe(UMUR_BONUS);

    const skorAwal = g.skor;
    const { state, kejadian } = langkah({ ...g, bonus: { posisi: { x: 7, y: 5 }, sisaLangkah: 10 } }, acakNol);
    expect(kejadian).toContain("bonus");
    expect(state.skor).toBe(skorAwal + SKOR_BONUS);
    expect(state.bonus).toBeNull();
  });

  it("bonus hilang bila waktunya habis", () => {
    const g = siapkan({ bonus: { posisi: { x: 0, y: 9 }, sisaLangkah: 1 } });
    const { state, kejadian } = langkah(g, acakNol);
    expect(state.bonus).toBeNull();
    expect(kejadian).toContain("bonus-hilang");
  });

  it("papan penuh setelah makan = menang", () => {
    // Papan 2×2: ular 3 ruas, makanan di petak terakhir.
    const g: StateGame = {
      ...siapkan(),
      kolom: 2,
      baris: 2,
      ular: [
        { x: 0, y: 1 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
      arah: "kanan",
      makanan: { posisi: { x: 1, y: 1 }, jenis: 0 },
    };
    const { state, kejadian } = langkah(g, acakNol);
    expect(state.status).toBe("menang");
    expect(kejadian).toContain("menang");
  });

  it("state yang sudah kalah tidak berubah", () => {
    const g = siapkan({ status: "kalah" });
    expect(langkah(g, acakNol).state).toBe(g);
  });
});

describe("pendukung", () => {
  it("makin banyak makan makin cepat, paling cepat 60 ms", () => {
    expect(jedaLangkah(0)).toBe(140);
    expect(jedaLangkah(10)).toBeLessThan(jedaLangkah(0));
    expect(jedaLangkah(1000)).toBe(60);
  });

  it("petakKosong mengembalikan null bila papan penuh", () => {
    const g: StateGame = {
      ...siapkan(),
      kolom: 1,
      baris: 2,
      ular: [{ x: 0, y: 0 }],
      makanan: { posisi: { x: 0, y: 1 }, jenis: 0 },
    };
    expect(petakKosong(g, acakNol)).toBeNull();
  });
});

describe("ular musuh", () => {
  /** Papan 10×10 dengan ular pemain di baris 5 (kepala 5,5 menghadap kanan). */
  const denganMusuh = (musuh: StateGame["musuh"], ubah: Partial<StateGame> = {}) => siapkan({ musuh, ...ubah });

  it(`belum muncul sebelum skor ${SKOR_MUSUH}, lalu muncul jauh dari kepala pemain`, () => {
    expect(langkah(siapkan({ skor: SKOR_MUSUH - 10 }), acakNol).state.musuh).toBeNull();

    const { state, kejadian } = langkah(siapkan({ skor: SKOR_MUSUH }), acakNol);
    expect(kejadian).toContain("musuh-datang");
    expect(state.musuh?.ular).toHaveLength(PANJANG_MUSUH);
    const kepala = state.musuh!.ular[0]!;
    expect(Math.abs(kepala.x - state.ular[0]!.x) + Math.abs(kepala.y - state.ular[0]!.y)).toBeGreaterThanOrEqual(6);
  });

  it("musuh bergerak mendekati buah", () => {
    const musuh = { ular: [{ x: 2, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 1 }], arah: "kanan" as const, tumbuh: 0 };
    const g = denganMusuh(musuh, { makanan: { posisi: { x: 2, y: 4 }, jenis: 0 } });
    expect(pilihArahMusuh(g, musuh, () => 0.99)).toBe("bawah");
  });

  it("mode klasik: musuh memakai jalan pintas lewat tepi", () => {
    const musuh = { ular: [{ x: 2, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 1 }], arah: "kanan" as const, tumbuh: 0 };
    const g = denganMusuh(musuh, { makanan: { posisi: { x: 2, y: 8 }, jenis: 0 } });
    expect(pilihArahMusuh(g, musuh, () => 0.99)).toBe("atas");
  });

  it("musuh makan buah: memanjang, pemain tidak dapat skor", () => {
    const musuh = { ular: [{ x: 2, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 1 }], arah: "kanan" as const, tumbuh: 0 };
    const g = denganMusuh(musuh, { makanan: { posisi: { x: 3, y: 1 }, jenis: 0 } });
    const { state, kejadian } = langkah(g, () => 0.99);
    expect(kejadian).toContain("musuh-makan");
    expect(state.musuh?.ular).toHaveLength(4);
    expect(state.skor).toBe(0);
  });

  it(`kepala musuh menabrak badan pemain: musuh mati, pemain +${SKOR_KALAHKAN_MUSUH}, musuh baru menyusul`, () => {
    // Musuh di atas badan pemain (4,5), menghadap bawah, tidak punya jalan lain yang aman selain menabrak.
    const musuh = { ular: [{ x: 4, y: 4 }, { x: 4, y: 3 }, { x: 4, y: 2 }], arah: "bawah" as const, tumbuh: 0 };
    const g = denganMusuh(musuh, { mode: "dinding" });
    const { state, kejadian } = langkah(g, () => 0.99);
    // Pemain bergerak ke (6,5): badan pemain sekarang (5,5),(4,5). Musuh memilih arah aman (kiri/kanan).
    expect(kejadian).not.toContain("musuh-mati");
    expect(state.musuh).not.toBeNull();

    const terjepit = {
      // Kiri (3,4) dan kanan (5,4) tertutup badannya sendiri, jadi terpaksa maju ke badan pemain (4,5).
      ular: [{ x: 4, y: 4 }, { x: 4, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 4 }, { x: 5, y: 4 }, { x: 5, y: 3 }],
      arah: "bawah" as const,
      tumbuh: 0,
    };
    const hasil = langkah(denganMusuh(terjepit), () => 0.99);
    expect(hasil.kejadian).toContain("musuh-mati");
    expect(hasil.state.musuh).toBeNull();
    expect(hasil.state.skor).toBe(SKOR_KALAHKAN_MUSUH);
    expect(hasil.state.musuhDalam).toBe(JEDA_MUSUH);
  });

  it("kepala pemain menabrak badan musuh = kalah", () => {
    const musuh = { ular: [{ x: 6, y: 3 }, { x: 6, y: 4 }, { x: 6, y: 5 }, { x: 6, y: 6 }], arah: "atas" as const, tumbuh: 0 };
    const { state, kejadian } = langkah(denganMusuh(musuh), () => 0.99);
    expect(kejadian).toContain("kalah");
    expect(state.status).toBe("kalah");
  });

  it("adu kepala = kalah", () => {
    // Musuh di baris paling atas: atas = dinding, bawah (7,1) = badannya sendiri, jadi terpaksa maju ke (6,0),
    // petak yang sama dengan kepala pemain.
    const musuh = {
      ular: [{ x: 7, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 1 }, { x: 7, y: 1 }, { x: 6, y: 1 }, { x: 6, y: 2 }],
      arah: "kiri" as const,
      tumbuh: 0,
    };
    const g = denganMusuh(musuh, { ular: [{ x: 5, y: 0 }, { x: 4, y: 0 }, { x: 3, y: 0 }], mode: "dinding" });
    const { state, kejadian } = langkah(g, () => 0.99);
    expect(kejadian).toContain("kalah");
    expect(state.status).toBe("kalah");
  });

  it("musuh yang terjebak menabrak dinding hilang tanpa skor, lalu muncul lagi setelah jeda", () => {
    const musuh = { ular: [{ x: 9, y: 0 }, { x: 8, y: 0 }, { x: 7, y: 0 }], arah: "kanan" as const, tumbuh: 0 };
    const g = denganMusuh(musuh, { mode: "dinding", ular: [{ x: 9, y: 2 }, { x: 9, y: 1 }, { x: 8, y: 1 }], arah: "bawah" });
    const { state, kejadian } = langkah(g, () => 0.99);
    expect(kejadian).toContain("musuh-tabrak");
    expect(state.skor).toBe(0);
    expect(state.musuhDalam).toBe(JEDA_MUSUH);

    let s = state;
    for (let i = 0; i < JEDA_MUSUH; i++) s = langkah({ ...s, ular: [{ x: 5, y: 5 }, { x: 4, y: 5 }], arah: "kanan", antrianArah: [] }, acakNol).state;
    expect(s.musuh).toBeNull();
    s = langkah({ ...s, ular: [{ x: 5, y: 5 }, { x: 4, y: 5 }], arah: "kanan" }, acakNol).state;
    expect(s.musuh).not.toBeNull();
  });

  it("munculkanMusuh tidak menaruh musuh di atas pemain atau buah", () => {
    const g = buatGame("klasik", Math.random);
    for (let i = 0; i < 50; i++) {
      const m = munculkanMusuh(g, Math.random);
      expect(m).not.toBeNull();
      for (const t of m!.ular) {
        expect(g.ular.some((u) => u.x === t.x && u.y === t.y)).toBe(false);
        expect(t.x === g.makanan.posisi.x && t.y === g.makanan.posisi.y).toBe(false);
      }
    }
  });
});
