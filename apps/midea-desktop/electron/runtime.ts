import fs from 'node:fs'
import path from 'node:path'

import { DEFAULT_MIDEA_PROFILE } from './contracts.js'

export interface RuntimeCommand {
  command: string
  label: string
}

export function isValidProfileName(profile: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(profile)
}

export function mideaBackendArgs(profile: string = DEFAULT_MIDEA_PROFILE): string[] {
  return ['--profile', profile, 'serve', '--isolated', '--host', '127.0.0.1', '--port', '0']
}

export function resolveRuntimeCommand(
  repositoryRoot: string | null,
  platform = process.platform,
  fileExists: (candidate: string) => boolean = fs.existsSync
): RuntimeCommand {
  if (repositoryRoot) {
    const executable = platform === 'win32' ? 'Scripts/hermes.exe' : 'bin/hermes'

    for (const environment of ['.venv', 'venv']) {
      const candidate = path.join(repositoryRoot, environment, executable)

      if (fileExists(candidate)) {
        return { command: candidate, label: `${environment} Hermes runtime` }
      }
    }
  }

  return {
    command: platform === 'win32' ? 'hermes.exe' : 'hermes',
    label: 'Hermes runtime on PATH'
  }
}

export function findRepositoryRoot(start: string): string | null {
  let current = path.resolve(start)

  for (let depth = 0; depth < 10; depth += 1) {
    if (fs.existsSync(path.join(current, 'pyproject.toml')) && fs.existsSync(path.join(current, 'apps'))) {
      return current
    }

    const parent = path.dirname(current)

    if (parent === current) {
      return null
    }

    current = parent
  }

  return null
}

export function parseBackendReadyPort(line: string): number | null {
  const match = /^HERMES_(?:BACKEND|DASHBOARD)_READY port=(\d+)$/m.exec(line)
  const port = Number(match?.[1])

  return Number.isInteger(port) && port > 0 && port <= 65_535 ? port : null
}

const MIME_TYPES: Record<string, string> = {
  '.aac': 'audio/aac',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.csv': 'text/csv',
  '.gif': 'image/gif',
  '.htm': 'text/html',
  '.html': 'text/html',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.m4a': 'audio/mp4',
  '.md': 'text/markdown',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.ogg': 'audio/ogg',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.yaml': 'application/yaml',
  '.yml': 'application/yaml'
}

export function mimeTypeForPath(filePath: string): string {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
}

const MANAGEMENT_API_ROOTS = [
  '/api/actions',
  '/api/config',
  '/api/env',
  '/api/mcp',
  '/api/memory',
  '/api/model',
  '/api/profiles',
  '/api/providers',
  '/api/skills',
  '/api/tools'
]

export function isAllowedManagementPath(value: string): boolean {
  if (!value.startsWith('/api/') || /%(?:2e|2f|5c)/i.test(value)) {
    return false
  }

  try {
    const pathname = new URL(value, 'http://midea.local').pathname

    return MANAGEMENT_API_ROOTS.some(root => pathname === root || pathname.startsWith(`${root}/`))
  } catch {
    return false
  }
}
