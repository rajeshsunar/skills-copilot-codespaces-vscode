import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('powerSticky', {
  loadState: () => ipcRenderer.invoke('state:load'),
  saveState: (state) => ipcRenderer.invoke('state:save', state),
  setAlwaysOnTop: (value) => ipcRenderer.invoke('window:set-always-on-top', value),
  minimizeToTray: () => ipcRenderer.invoke('window:minimize-to-tray'),
  setLaunchOnStartup: (enabled) => ipcRenderer.invoke('startup:set', enabled),
  onBlur: (cb) => ipcRenderer.on('app-window-blur', cb),
  onAlwaysOnTopChanged: (cb) => ipcRenderer.on('always-on-top-changed', (_event, value) => cb(value)),
});
