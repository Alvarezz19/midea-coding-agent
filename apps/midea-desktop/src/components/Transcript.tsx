import { IconAlertTriangle, IconCheck, IconLoader2, IconTool } from '@tabler/icons-react'
import { useEffect, useRef } from 'react'

import { mideaAgent } from '@/lib/agent-client'
import type { ChatState, ToolActivity } from '@/store/chat'

interface TranscriptProps {
  state: ChatState
}

const starters = ['整理已有资料', '分析当前工作区', '开始新的任务']

export function Transcript({ state }: TranscriptProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: state.busy ? 'smooth' : 'auto', block: 'end' })
  }, [state.busy, state.timeline])

  return (
    <main aria-live="polite" className="transcript">
      <div className="transcript-inner">
        {state.timeline.length === 0 ? (
          <div className="empty-state">
            <span aria-hidden="true" className="empty-mark">
              M
            </span>
            <h2>今天需要处理什么？</h2>
            <div className="starter-list">
              {starters.map(starter => (
                <button
                  disabled={state.connectionPhase !== 'ready'}
                  key={starter}
                  onClick={() => void mideaAgent.send(starter)}
                  type="button"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="timeline">
            {state.timeline.map(item =>
              item.kind === 'message' ? (
                <article className={`message ${item.role}`} key={item.id}>
                  <div className="message-role">
                    {item.role === 'user' ? '你' : item.role === 'error' ? '系统' : 'Midea Agent'}
                  </div>
                  <div className="message-content">
                    {item.text || (item.state === 'streaming' ? <span className="typing-indicator">正在思考</span> : null)}
                  </div>
                </article>
              ) : (
                <ToolRow key={item.id} tool={item} />
              )
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>
    </main>
  )
}

function ToolRow({ tool }: { tool: ToolActivity }) {
  const StateIcon = tool.state === 'running' ? IconLoader2 : tool.state === 'error' ? IconAlertTriangle : IconCheck

  return (
    <div className="tool-row" data-state={tool.state}>
      <IconTool aria-hidden="true" className="tool-icon" size={17} stroke={1.8} />
      <div>
        <strong>{tool.name}</strong>
        {tool.summary ? <span>{tool.summary}</span> : null}
      </div>
      <StateIcon aria-hidden="true" className={tool.state === 'running' ? 'spin' : ''} size={16} />
    </div>
  )
}
