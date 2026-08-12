import { IconPaperclip, IconPlayerStop, IconSend, IconX } from '@tabler/icons-react'
import { type FormEvent, type KeyboardEvent, useState } from 'react'

import { mideaAgent } from '@/lib/agent-client'
import type { ChatState } from '@/store/chat'

import type { PickedFile } from '../../electron/contracts'

interface ComposerProps {
  state: ChatState
}

export function Composer({ state }: ComposerProps) {
  const [value, setValue] = useState('')
  const [files, setFiles] = useState<PickedFile[]>([])
  const available = state.connectionPhase === 'ready'

  const submit = (event?: FormEvent) => {
    event?.preventDefault()

    if ((!value.trim() && files.length === 0) || !available || state.busy) {
      return
    }

    const message = value
    const attachments = files

    setValue('')
    setFiles([])
    void mideaAgent.send(message, attachments)
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
        {files.length > 0 ? <div className="composer-attachments">{files.map(file => <span className="attachment-chip" key={file.path}>{file.name}<button aria-label={`移除 ${file.name}`} onClick={() => setFiles(current => current.filter(item => item.path !== file.path))} type="button"><IconX size={12} /></button></span>)}</div> : null}
        <textarea
          aria-label="消息"
          disabled={!available}
          onChange={event => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={available ? '发送消息' : state.connectionDetail}
          rows={1}
          value={value}
        />
        <button aria-label="添加附件" className="composer-action secondary" onClick={() => void window.mideaDesktop.runtime.pickFiles().then(selected => setFiles(current => [...current, ...selected]))} title="添加附件" type="button"><IconPaperclip size={17} /></button>
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
            disabled={!available || (!value.trim() && files.length === 0)}
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
