import { contextBridge, ipcRenderer } from 'electron';
import type { ActionPickPayload } from '@glance/shared';

contextBridge.exposeInMainWorld('picker', {
  pick: (payload: ActionPickPayload) => ipcRenderer.send('action-pick', payload),
  cancel: () => ipcRenderer.send('action-cancel'),
});
