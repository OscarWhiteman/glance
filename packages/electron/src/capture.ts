import { desktopCapturer, screen } from 'electron';
import type { NativeImage } from 'electron';
import { log } from './logger';

export interface CaptureRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CroppedImage {
  base64: string;
  mimeType: 'image/jpeg';  // always JPEG for compact API payloads
}

// Images larger than this (logical pixels, either dimension) are downscaled
const MAX_LOGICAL_DIM = 1280;
const JPEG_QUALITY = 85;

export async function captureFullScreen(): Promise<NativeImage> {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.size;
  const scale = display.scaleFactor;

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    },
  });

  const primary = sources[0];
  if (!primary) throw new Error('desktopCapturer: no screen source found');
  return primary.thumbnail;
}

/**
 * Crops the screenshot to the selected region (HiDPI-aware), downscales if
 * necessary, then encodes as JPEG 85% for compact API payloads.
 */
export function cropToRegion(image: NativeImage, region: CaptureRegion): CroppedImage {
  const scale = screen.getPrimaryDisplay().scaleFactor;

  let cropped = image.crop({
    x: Math.round(region.x * scale),
    y: Math.round(region.y * scale),
    width: Math.max(1, Math.round(region.width * scale)),
    height: Math.max(1, Math.round(region.height * scale)),
  });

  // Downscale if the region is large (reduces API payload & latency)
  const { width, height } = cropped.getSize();
  const logicalW = Math.round(width / scale);
  const logicalH = Math.round(height / scale);

  if (logicalW > MAX_LOGICAL_DIM || logicalH > MAX_LOGICAL_DIM) {
    const ratio = Math.min(MAX_LOGICAL_DIM / logicalW, MAX_LOGICAL_DIM / logicalH);
    const newW = Math.max(1, Math.round(width * ratio));
    const newH = Math.max(1, Math.round(height * ratio));
    cropped = cropped.resize({ width: newW, height: newH, quality: 'good' });
    log('info', `Image compressed: ${width}×${height} → ${newW}×${newH}`);
  }

  const base64 = cropped.toJPEG(JPEG_QUALITY).toString('base64');
  const kb = Math.round((base64.length * 3) / 4 / 1024);
  log('info', `Capture ready: ${logicalW}×${logicalH}px, ~${kb} KB`);

  return { base64, mimeType: 'image/jpeg' };
}
