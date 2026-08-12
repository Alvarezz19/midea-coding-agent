import { IconAlertTriangle, IconCheck, IconLoader2, IconTool } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'

import { mideaAgent } from '@/lib/agent-client'
import type { ChatState, ToolActivity } from '@/store/chat'

import { MarkdownContent } from './MarkdownContent'

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
                    {item.text ? <MarkdownContent text={item.text} /> : item.state === 'streaming' ? <span className="typing-indicator">正在思考</span> : null}
                    {item.attachments?.length ? <div className="attachment-strip">{item.attachments.map(file => <span className="attachment-chip" key={file.path}>{file.name}</span>)}</div> : null}
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
  const [expanded, setExpanded] = useState(false)
  const StateIcon = tool.state === 'running' ? IconLoader2 : tool.state === 'error' ? IconAlertTriangle : IconCheck

  return (
    <div className="tool-card-wrap">
      <button className="tool-row" data-state={tool.state} onClick={() => setExpanded(value => !value)} type="button">
        <IconTool aria-hidden="true" className="tool-icon" size={17} stroke={1.8} />
        <div>
          <strong>{tool.name}</strong>
          {tool.summary ? <span>{tool.summary}</span> : null}
          {tool.durationSeconds ? <small>{tool.durationSeconds.toFixed(1)}s</small> : null}
        </div>
        <StateIcon aria-hidden="true" className={tool.state === 'running' ? 'spin' : ''} size={16} />
      </button>
      {expanded ? <div className="tool-detail"><strong>结构化详情</strong><pre>{JSON.stringify({ args: tool.args || {}, result: tool.result || {} }, null, 2)}</pre>{tool.inlineDiff ? <DiffBlock diff={tool.inlineDiff} /> : null}</div> : null}
    </div>
  )
}

function DiffBlock({ diff }: { diff: string }) {
  const lines = diff.split('\n')

  return <pre aria-label="工具 diff" className="inline-diff">{lines.map((line, index) => <span className={line.startsWith('+') && !line.startsWith('+++') ? 'diff-add' : line.startsWith('-') && !line.startsWith('---') ? 'diff-remove' : line.startsWith('@@') ? 'diff-hunk' : ''} key={`${index}-${line}`}>{line}{index < lines.length - 1 ? '\n' : ''}</span>)}</pre>
}
