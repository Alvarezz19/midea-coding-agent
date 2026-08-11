import fs from 'node:fs'
import path from 'node:path'

import { MIDEA_RUNTIME_PROFILE } from './contracts.js'

export interface RuntimeCommand {
  command: string
  label: string
}

export function mideaBackendArgs(): string[] {
  return ['--profile', MIDEA_RUNTIME_PROFILE, 'serve', '--isolated', '--host', '127.0.0.1', '--port', '0']
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
