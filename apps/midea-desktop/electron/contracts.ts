export const MIDEA_RUNTIME_PROFILE = 'midea-dev' as const

export interface RuntimeConnection {
  profile: typeof MIDEA_RUNTIME_PROFILE
  runtime: string
  wsUrl: string
}

export interface RuntimeStatus {
  detail?: string
  phase: 'starting' | 'ready' | 'stopped' | 'error'
  profile: typeof MIDEA_RUNTIME_PROFILE
}

export interface MideaDesktopBridge {
  runtime: {
    connect: () => Promise<RuntimeConnection>
    onStatus: (listener: (status: RuntimeStatus) => void) => () => void
    restart: () => Promise<RuntimeConnection>
  }
}
