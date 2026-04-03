import { BrowserWindow, ipcMain, screen } from 'electron';
import * as path from 'path';

export interface SelectionRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function openSelectionOverlay(
  screenshotDataUrl: string,
  onSelect: (region: SelectionRegion) => void,
  onCancel: () => void,
): void {
  const { bounds } = screen.getPrimaryDisplay();

  const overlay = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    fullscreenable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload-overlay.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.loadFile(path.join(__dirname, '../ui/overlay.html'));

  overlay.once('ready-to-show', () => {
    overlay.show();
    overlay.focus();
    // Send screenshot to the renderer so it can draw the background
    overlay.webContents.send('screenshot', screenshotDataUrl);
  });

  function cleanup() {
    ipcMain.removeListener('region-selected', handleSelect);
    ipcMain.removeListener('region-cancelled', handleCancel);
    if (!overlay.isDestroyed()) overlay.close();
  }

  function handleSelect(_: unknown, region: SelectionRegion) {
    cleanup();
    // Ensure positive width/height regardless of drag direction
    const normalized: SelectionRegion = {
      x: region.width < 0 ? region.x + region.width : region.x,
      y: region.height < 0 ? region.y + region.height : region.y,
      width: Math.abs(region.width),
      height: Math.abs(region.height),
    };
    if (normalized.width > 4 && normalized.height > 4) {
      onSelect(normalized);
    } else {
      onCancel(); // Too small — treat as cancel
    }
  }

  function handleCancel() {
    cleanup();
    onCancel();
  }

  ipcMain.once('region-selected', handleSelect);
  ipcMain.once('region-cancelled', handleCancel);
}
