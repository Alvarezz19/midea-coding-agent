import path from 'node:path'

import { app, BrowserWindow, ipcMain, shell } from 'electron'

import { MideaBackend } from './backend.js'
import type { RuntimeStatus } from './contracts.js'
import { findRepositoryRoot, resolveRuntimeCommand } from './runtime.js'

const currentDirectory = __dirname
let mainWindow: BrowserWindow | null = null
let backend: MideaBackend | null = null

function sendRuntimeStatus(status: RuntimeStatus): void {
  mainWindow?.webContents.send('midea:runtime:status', status)
}

function createBackend(): MideaBackend {
  const repositoryRoot = findRepositoryRoot(app.getAppPath()) ?? findRepositoryRoot(process.cwd())
  const runtime = resolveRuntimeCommand(repositoryRoot)

  return new MideaBackend(runtime, repositoryRoot ?? process.cwd(), sendRuntimeStatus)
}

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
    autoHideMenuBar: true,
    backgroundColor: '#f5f6f8',
    height: 820,
    minHeight: 640,
    minWidth: 920,
    show: true,
    title: 'Midea Agent',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(currentDirectory, 'preload.cjs'),
      sandbox: true
    },
    width: 1280
  })

  mainWindow = window
  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null
    }
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    const protocol = new URL(url).protocol

    if (protocol === 'https:' || protocol === 'http:') {
      void shell.openExternal(url)
    }

    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', event => event.preventDefault())

  const devServer = process.env.MIDEA_DESKTOP_DEV_SERVER

  if (devServer) {
    await window.loadURL(devServer)
  } else {
    await window.loadFile(path.join(currentDirectory, 'index.html'))
  }
}

app.whenReady().then(async () => {
  backend = createBackend()
  ipcMain.handle('midea:runtime:connect', () => backend?.connect())
  ipcMain.handle('midea:runtime:restart', () => backend?.restart())

  await createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => backend?.stop())
