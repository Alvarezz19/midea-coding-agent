import { IconRefresh } from '@tabler/icons-react'

import { mideaAgent } from '@/lib/agent-client'
import type { ChatState } from '@/store/chat'

interface HeaderProps {
  state: ChatState
}

const phaseLabels = {
  connecting: '连接中',
  error: '连接异常',
  ready: '已连接',
  starting: '启动中'
} as const

export function Header({ state }: HeaderProps) {
  return (
    <header className="app-header">
      <div>
        <h1>美的智能助理</h1>
        <p>{state.actualProfile || state.expectedProfile}</p>
      </div>
      <div className="runtime-status" data-phase={state.connectionPhase}>
        <span aria-hidden="true" className="status-dot" />
        <span>{phaseLabels[state.connectionPhase]}</span>
        {state.connectionPhase === 'error' ? (
          <button
            aria-label="重新连接 Runtime"
            className="icon-button"
            onClick={() => void mideaAgent.retry()}
            title="重新连接 Runtime"
            type="button"
          >
            <IconRefresh aria-hidden="true" size={16} />
          </button>
        ) : null}
      </div>
    </header>
  )
}
