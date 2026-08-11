import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const electronPackage = require.resolve('electron/package.json')
const electronDist = path.join(path.dirname(electronPackage), 'dist')
const electronBinary = process.platform === 'win32' ? 'electron.exe' : process.platform === 'darwin' ? 'Electron.app' : 'electron'

if (!fs.existsSync(path.join(electronDist, electronBinary))) {
  throw new Error(`Installed Electron distribution is incomplete: ${electronDist}`)
}

const builderPackage = require.resolve('electron-builder/package.json')
const builderMetadata = require(builderPackage)
const builderRelative =
  typeof builderMetadata.bin === 'string' ? builderMetadata.bin : builderMetadata.bin['electron-builder']
const builderCli = path.join(path.dirname(builderPackage), builderRelative)
const args = [`-c.electronDist=${electronDist}`, ...process.argv.slice(2)]
const result = spawnSync(process.execPath, [builderCli, ...args], { stdio: 'inherit' })

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 1)
