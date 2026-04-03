import { systemPreferences, shell } from 'electron';

export function hasScreenCapturePermission(): boolean {
  if (process.platform !== 'darwin') return true;
  return systemPreferences.getMediaAccessStatus('screen') === 'granted';
}

export function openScreenCaptureSettings(): void {
  if (process.platform === 'darwin') {
    void shell.openExternal(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
    );
  } else if (process.platform === 'win32') {
    void shell.openExternal('ms-settings:privacy-broadfileSystemAccess');
  }
  // Linux has no standard URI for privacy settings — no-op
}
