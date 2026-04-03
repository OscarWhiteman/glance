import { nativeImage } from 'electron';

/**
 * Generate a 22×22 (44×44 @2x) tray icon — a stylised "G" eye.
 *
 * macOS template images use black + alpha only. The OS recolours them
 * to match the menu bar (white in dark mode, black in light mode).
 * On Windows/Linux the icon is used as-is (black on transparent works fine).
 */
export function createTrayIcon(): Electron.NativeImage {
  const size = 44; // @2x for Retina
  const buf = Buffer.alloc(size * size * 4, 0); // RGBA, fully transparent

  function setPixel(x: number, y: number, a: number) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    // Template image: black channel, only alpha varies
    buf[i] = 0;
    buf[i + 1] = 0;
    buf[i + 2] = 0;
    buf[i + 3] = a;
  }

  function fillCircle(cx: number, cy: number, radius: number, alpha: number) {
    const r2 = radius * radius;
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r2) setPixel(x, y, alpha);
      }
    }
  }

  function strokeCircle(cx: number, cy: number, radius: number, thickness: number, alpha: number) {
    const outer2 = (radius + thickness / 2) ** 2;
    const inner2 = (radius - thickness / 2) ** 2;
    for (let y = Math.floor(cy - radius - thickness); y <= Math.ceil(cy + radius + thickness); y++) {
      for (let x = Math.floor(cx - radius - thickness); x <= Math.ceil(cx + radius + thickness); x++) {
        const dx = x - cx, dy = y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 <= outer2 && d2 >= inner2) setPixel(x, y, alpha);
      }
    }
  }

  const cx = 22, cy = 22;

  // Outer ring (the "G" shape / eye outline)
  strokeCircle(cx, cy, 14, 3.5, 220);

  // Cut a gap in the right side to form the "G" opening
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx > 6 && Math.abs(dy) < 5) {
        setPixel(x, y, 0); // transparent
      }
    }
  }

  // Horizontal bar of the "G"
  for (let y = cy - 1; y <= cy + 1; y++) {
    for (let x = cx; x <= cx + 12; x++) {
      setPixel(x, y, 220);
    }
  }

  // Inner dot (the "pupil" / eye center) — slightly lighter
  fillCircle(cx, cy, 5, 200);

  const img = nativeImage.createFromBuffer(buf, { width: size, height: size, scaleFactor: 2 });
  img.setTemplateImage(true);
  return img;
}
