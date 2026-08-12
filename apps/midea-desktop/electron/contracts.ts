export const DEFAULT_MIDEA_PROFILE = 'midea-dev' as const
export const MIDEA_RUNTIME_PROFILE = DEFAULT_MIDEA_PROFILE

export interface RuntimeProfile {
  has_env: boolean
  is_default: boolean
  model: null | string
  name: string
  path: string
  provider: null | string
  skill_count: number
}

export interface RuntimeConnection {
  profile: string
  runtime: string
  wsUrl: string
}

export interface RuntimeStatus {
  detail?: string
  phase: 'starting' | 'ready' | 'stopped' | 'error'
  profile: string
}

export interface RuntimeApiRequest {
  body?: unknown
  method?: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT'
  path: string
  profile?: string
}

export interface PickedFile {
  mimeType: string
  name: string
  path: string
  size: number
}

export interface MideaDesktopBridge {
  openExternal: (url: string) => Promise<void>
  runtime: {
    api: (request: RuntimeApiRequest) => Promise<unknown>
    connect: (profile?: string) => Promise<RuntimeConnection>
    onStatus: (listener: (status: RuntimeStatus) => void) => () => void
    pickFiles: () => Promise<PickedFile[]>
    restart: (profile?: string) => Promise<RuntimeConnection>
  }
}
