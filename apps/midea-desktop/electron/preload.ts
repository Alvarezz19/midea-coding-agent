import { contextBridge, ipcRenderer } from 'electron'

import type { MideaDesktopBridge, RuntimeStatus } from './contracts.js'

const bridge: MideaDesktopBridge = {
  runtime: {
    connect: () => ipcRenderer.invoke('midea:runtime:connect'),
    onStatus: listener => {
      const handler = (_event: Electron.IpcRendererEvent, status: RuntimeStatus) => listener(status)

      ipcRenderer.on('midea:runtime:status', handler)

      return () => ipcRenderer.removeListener('midea:runtime:status', handler)
    },
    restart: () => ipcRenderer.invoke('midea:runtime:restart')
  }
}

contextBridge.exposeInMainWorld('mideaDesktop', bridge)
