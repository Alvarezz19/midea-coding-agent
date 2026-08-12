import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { MIDEA_RUNTIME_PROFILE } from './contracts.js'
import {
  isAllowedManagementPath,
  isValidProfileName,
  mideaBackendArgs,
  mimeTypeForPath,
  parseBackendReadyPort,
  resolveRuntimeCommand
} from './runtime.js'

describe('Midea runtime contract', () => {
  it('pins every backend launch to midea-dev', () => {
    expect(mideaBackendArgs()).toEqual([
      '--profile',
      MIDEA_RUNTIME_PROFILE,
      'serve',
      '--isolated',
      '--host',
      '127.0.0.1',
      '--port',
      '0'
    ])
  })

  it('prefers the repository virtual environment', () => {
    const root = path.resolve('repo')
    const expected = path.join(root, '.venv', 'Scripts/hermes.exe')
    const result = resolveRuntimeCommand(root, 'win32', candidate => candidate === expected)

    expect(result).toEqual({ command: expected, label: '.venv Hermes runtime' })
  })

  it('falls back to the platform PATH command', () => {
    expect(resolveRuntimeCommand(null, 'win32').command).toBe('hermes.exe')
    expect(resolveRuntimeCommand(null, 'linux').command).toBe('hermes')
  })

  it('accepts only valid backend readiness announcements', () => {
    expect(parseBackendReadyPort('HERMES_BACKEND_READY port=43120')).toBe(43_120)
    expect(parseBackendReadyPort('HERMES_DASHBOARD_READY port=9119')).toBe(9119)
    expect(parseBackendReadyPort('HERMES_BACKEND_READY port=70000')).toBeNull()
    expect(parseBackendReadyPort('ready port=9119')).toBeNull()
  })

  it('classifies supported attachment media by file extension', () => {
    expect(mimeTypeForPath('D:\\资料\\product.JPG')).toBe('image/jpeg')
    expect(mimeTypeForPath('D:\\资料\\demo.mp4')).toBe('video/mp4')
    expect(mimeTypeForPath('D:\\资料\\unknown.bin')).toBe('application/octet-stream')
  })

  it('accepts only Hermes profile identifiers', () => {
    expect(isValidProfileName('midea-dev')).toBe(true)
    expect(isValidProfileName('service_staging')).toBe(true)
    expect(isValidProfileName('../default')).toBe(false)
    expect(isValidProfileName('Midea-Prod')).toBe(false)
    expect(isValidProfileName('a'.repeat(65))).toBe(false)
  })

  it('allows only the narrow management API surface', () => {
    expect(isAllowedManagementPath('/api/actions/tools-post-setup/status?lines=200')).toBe(true)
    expect(isAllowedManagementPath('/api/config/schema?profile=midea-dev')).toBe(true)
    expect(isAllowedManagementPath('/api/mcp/servers/reports/test')).toBe(true)
    expect(isAllowedManagementPath('/api/sessions')).toBe(false)
    expect(isAllowedManagementPath('/api/config/../sessions')).toBe(false)
    expect(isAllowedManagementPath('/api/config/%2e%2e/sessions')).toBe(false)
    expect(isAllowedManagementPath('https://example.com/api/config')).toBe(false)
  })
})
