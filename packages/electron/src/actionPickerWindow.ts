import { BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import type { ActionType, ActionPickPayload } from '@glance/shared';

const PICKER_W = 300;
const PICKER_H = 210;   // taller to fit 4 actions

export function openActionPicker(
  cursorPos: { x: number; y: number },
  onPick: (action: ActionType, customPrompt?: string) => void,
  onCancel: () => void,
): void {
  // Position the picker above-and-centered on the cursor
  const x = Math.round(cursorPos.x - PICKER_W / 2);
  const y = Math.round(cursorPos.y - PICKER_H - 12);

  const picker = new BrowserWindow({
    x,
    y,
    width: PICKER_W,
    height: PICKER_H,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload-picker.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  picker.setAlwaysOnTop(true, 'screen-saver');
  picker.loadFile(path.join(__dirname, '../ui/picker.html'));

  picker.once('ready-to-show', () => {
    picker.show();
    picker.focus();
  });

  // Cancel on focus loss
  picker.on('blur', () => handleCancel());

  function cleanup() {
    ipcMain.removeListener('action-pick', handlePick);
    ipcMain.removeListener('action-cancel', handleCancel);
    if (!picker.isDestroyed()) picker.close();
  }

  function handlePick(_: unknown, payload: ActionPickPayload) {
    cleanup();
    onPick(payload.action, payload.customPrompt);
  }

  function handleCancel() {
    cleanup();
    onCancel();
  }

  ipcMain.once('action-pick', handlePick);
  ipcMain.once('action-cancel', handleCancel);
}
