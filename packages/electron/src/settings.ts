import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type { GlanceSettings } from '@glance/shared';
import { DEFAULT_SETTINGS } from '@glance/shared';

const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');

export function loadSettings(): GlanceSettings {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GlanceSettings): void {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}
