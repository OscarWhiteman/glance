import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('overlay', {
  onScreenshot: (cb: (dataUrl: string) => void) => {
    ipcRenderer.on('screenshot', (_event, dataUrl: string) => cb(dataUrl));
  },
  selectRegion: (region: { x: number; y: number; width: number; height: number }) => {
    ipcRenderer.send('region-selected', region);
  },
  cancel: () => {
    ipcRenderer.send('region-cancelled');
  },
});
