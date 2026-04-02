/**
 * Gerador de ícones PNG para PWA — sem dependências externas
 * Cria icon-192.png, icon-512.png e apple-touch-icon.png (180x180)
 * Fundo: gradiente escuro com "G" estilizado em pixel art
 */
const zlib = require('zlib');
const fs   = require('fs');

// ── CRC32 ────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ── Chunk PNG ────────────────────────────────────────────────
function pngChunk(type, data) {
  const len  = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const tb   = Buffer.from(type, 'ascii');
  const body = Buffer.concat([tb, data]);
  const c    = Buffer.alloc(4); c.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, tb, data, c]);
}

// ── Pixel G em grade 7×8 (coordenadas 0-based col,row) ──────
const G_PIXELS = new Set([
  // Topo
  '1,0','2,0','3,0','4,0','5,0',
  '0,1',
  '0,2',
  '0,3','3,3','4,3','5,3',
  '0,4',            '5,4',
  '0,5',            '5,5',
  '1,6','2,6','3,6','4,6','5,6',
]);
const G_COLS = 7, G_ROWS = 8;

// ── Renderiza ícone ──────────────────────────────────────────
function createIcon(size) {
  const pixels = new Uint8Array(size * size * 4); // RGBA

  const cx = size / 2, cy = size / 2;
  const r  = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Distância ao centro (para gradiente radial e borda circular)
      const dx = (x - cx) / r, dy = (y - cy) / r;
      const d  = Math.sqrt(dx * dx + dy * dy);

      if (d > 1.0) {
        // Fora do círculo → transparente
        pixels[i]   = 0;
        pixels[i+1] = 0;
        pixels[i+2] = 0;
        pixels[i+3] = 0;
        continue;
      }

      // Gradiente: canto sup-esq azul → canto inf-dir violeta
      const t = (x / size + y / size) / 2;
      let bgR = Math.round(15  + t * (91  - 15));   // #0f172a → #5b21b6
      let bgG = Math.round(23  + t * (33  - 23));
      let bgB = Math.round(42  + t * (182 - 42));

      // Brilho interno suave
      const glow = Math.max(0, 1 - d) * 40;
      bgR = Math.min(255, bgR + glow);
      bgG = Math.min(255, bgG + glow);
      bgB = Math.min(255, bgB + glow);

      pixels[i]   = bgR;
      pixels[i+1] = bgG;
      pixels[i+2] = bgB;
      pixels[i+3] = 255;
    }
  }

  // Desenha o "G" centrado
  const scale  = Math.floor(size * 0.10);  // escala do glifo
  const pad    = Math.floor(size * 0.05);
  const GW     = G_COLS * scale;
  const GH     = G_ROWS * scale;
  const offX   = Math.round((size - GW) / 2);
  const offY   = Math.round((size - GH) / 2);

  for (let row = 0; row < G_ROWS; row++) {
    for (let col = 0; col < G_COLS; col++) {
      if (!G_PIXELS.has(col + ',' + row)) continue;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const px = offX + col * scale + sx;
          const py = offY + row * scale + sy;
          if (px < 0 || py < 0 || px >= size || py >= size) continue;
          const pi = (py * size + px) * 4;
          if (pixels[pi + 3] === 0) continue; // fora do círculo
          pixels[pi]   = 255;
          pixels[pi+1] = 255;
          pixels[pi+2] = 255;
          pixels[pi+3] = 255;
        }
      }
    }
  }

  // ── Monta PNG (RGBA = color type 6) ─────────────────────────
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // RGBA

  // Raw image: 1 byte filtro + 4 bytes/pixel por linha
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const src  = (y * size + x) * 4;
      const dest = y * (1 + size * 4) + 1 + x * 4;
      raw[dest]   = pixels[src];
      raw[dest+1] = pixels[src+1];
      raw[dest+2] = pixels[src+2];
      raw[dest+3] = pixels[src+3];
    }
  }

  const idat = zlib.deflateSync(raw, { level: 6 });

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const sizes = { 'icon-192.png': 192, 'icon-512.png': 512, 'apple-touch-icon.png': 180 };
for (const [file, size] of Object.entries(sizes)) {
  fs.writeFileSync(file, createIcon(size));
  console.log(`✔  ${file}  (${size}×${size})`);
}
console.log('Ícones gerados com sucesso!');
