import fs from 'node:fs'
import path from 'node:path'

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'

import { MideaBackend } from './backend.js'
import { DEFAULT_MIDEA_PROFILE, type PickedFile, type RuntimeApiRequest, type RuntimeStatus } from './contracts.js'
import { findRepositoryRoot, isAllowedManagementPath, mimeTypeForPath, resolveRuntimeCommand } from './runtime.js'

const currentDirectory = __dirname
let mainWindow: BrowserWindow | null = null
let backend: MideaBackend | null = null

const PROFILE_STORE = 'midea-desktop.json'

function profileStorePath(): string {
  return path.join(app.getPath('userData'), PROFILE_STORE)
}

function readStoredProfile(): string {
  try {
    const parsed = JSON.parse(fs.readFileSync(profileStorePath(), 'utf8')) as { profile?: unknown }

    return typeof parsed.profile === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(parsed.profile)
      ? parsed.profile
      : DEFAULT_MIDEA_PROFILE
  } catch {
    return DEFAULT_MIDEA_PROFILE
  }
}

function writeStoredProfile(profile: string): void {
  fs.mkdirSync(path.dirname(profileStorePath()), { recursive: true })
  fs.writeFileSync(profileStorePath(), JSON.stringify({ profile }, null, 2), { mode: 0o600 })
}

function assertManagementPath(request: RuntimeApiRequest): void {
  if (!isAllowedManagementPath(request.path)) {
    throw new Error(`Management API path is not allowed: ${request.path}`)
  }
}

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
  ipcMain.handle('midea:open-external', async (_event, url: string) => {
    const parsed = new URL(url)

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error(`External URL protocol is not allowed: ${parsed.protocol}`)
    }

    await shell.openExternal(parsed.toString())
  })
  ipcMain.handle('midea:runtime:connect', (_event, profile?: string) => backend?.connect(profile || readStoredProfile()))
  ipcMain.handle('midea:runtime:restart', (_event, profile?: string) => {
    const next = profile || readStoredProfile()
    writeStoredProfile(next)

    return backend?.restart(next)
  })
  ipcMain.handle('midea:runtime:api', (_event, request: RuntimeApiRequest) => {
    assertManagementPath(request)

    return backend?.api(request)
  })
  ipcMain.handle('midea:runtime:pick-files', async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'Files', extensions: ['*'] }],
      properties: ['openFile', 'multiSelections']
    })

    if (result.canceled) {
      return [] as PickedFile[]
    }

    return result.filePaths.map(filePath => {
      const stat = fs.statSync(filePath)

      return {
        mimeType: mimeTypeForPath(filePath),
        name: path.basename(filePath),
        path: filePath,
        size: stat.size
      }
    })
  })

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
