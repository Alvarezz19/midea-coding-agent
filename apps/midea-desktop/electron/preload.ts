import { contextBridge, ipcRenderer } from 'electron'

import type { MideaDesktopBridge, RuntimeStatus } from './contracts.js'

const bridge: MideaDesktopBridge = {
  openExternal: url => ipcRenderer.invoke('midea:open-external', url),
  runtime: {
    api: request => ipcRenderer.invoke('midea:runtime:api', request),
    connect: profile => ipcRenderer.invoke('midea:runtime:connect', profile),
    onStatus: listener => {
      const handler = (_event: Electron.IpcRendererEvent, status: RuntimeStatus) => listener(status)

      ipcRenderer.on('midea:runtime:status', handler)

      return () => ipcRenderer.removeListener('midea:runtime:status', handler)
    },
    pickFiles: () => ipcRenderer.invoke('midea:runtime:pick-files'),
    restart: profile => ipcRenderer.invoke('midea:runtime:restart', profile)
  }
}

contextBridge.exposeInMainWorld('mideaDesktop', bridge)
