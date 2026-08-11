import { IconPlayerStop, IconSend } from '@tabler/icons-react'
import { type FormEvent, type KeyboardEvent, useState } from 'react'

import { mideaAgent } from '@/lib/agent-client'
import type { ChatState } from '@/store/chat'

interface ComposerProps {
  state: ChatState
}

export function Composer({ state }: ComposerProps) {
  const [value, setValue] = useState('')
  const available = state.connectionPhase === 'ready'

  const submit = (event?: FormEvent) => {
    event?.preventDefault()

    if (!value.trim() || !available || state.busy) {
      return
    }

    const message = value

    setValue('')
    void mideaAgent.send(message)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className="composer-band">
      <form className="composer" onSubmit={submit}>
        <textarea
          aria-label="消息"
          disabled={!available}
          onChange={event => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={available ? '发送消息' : state.connectionDetail}
          rows={1}
          value={value}
        />
        {state.busy ? (
          <button
            aria-label="停止生成"
            className="composer-action stop"
            onClick={() => void mideaAgent.interrupt()}
            title="停止生成"
            type="button"
          >
            <IconPlayerStop aria-hidden="true" fill="currentColor" size={18} />
          </button>
        ) : (
          <button
            aria-label="发送"
            className="composer-action"
            disabled={!available || !value.trim()}
            title="发送"
            type="submit"
          >
            <IconSend aria-hidden="true" size={18} />
          </button>
        )}
      </form>
      <p className="composer-meta">{state.actualProfile || state.expectedProfile}</p>
    </div>
  )
}
