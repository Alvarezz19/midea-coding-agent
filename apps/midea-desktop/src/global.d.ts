import type { MideaDesktopBridge } from '../electron/contracts'

declare global {
  interface Window {
    mideaDesktop: MideaDesktopBridge
  }
}

export {}
