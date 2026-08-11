import { IconLock, IconShieldCheck } from '@tabler/icons-react'
import { type FormEvent, useEffect, useState } from 'react'

import { mideaAgent } from '@/lib/agent-client'
import type { PendingInteraction } from '@/store/chat'

interface InteractionDialogProps {
  interaction: PendingInteraction
}

export function InteractionDialog({ interaction }: InteractionDialogProps) {
  const [value, setValue] = useState('')

  useEffect(() => setValue(''), [interaction])

  if (interaction.type === 'approval') {
    return (
      <DialogFrame icon={<IconShieldCheck aria-hidden="true" size={20} />} title="执行确认">
        <p>{interaction.description}</p>
        {interaction.command ? <pre>{interaction.command}</pre> : null}
        <div className="dialog-actions">
          <button className="secondary-button" onClick={() => void mideaAgent.resolveInteraction('deny')} type="button">
            拒绝
          </button>
          {interaction.allowPermanent ? (
            <button
              className="secondary-button"
              onClick={() => void mideaAgent.resolveInteraction('always')}
              type="button"
            >
              始终允许
            </button>
          ) : null}
          <button className="primary-button" onClick={() => void mideaAgent.resolveInteraction('once')} type="button">
            允许一次
          </button>
        </div>
      </DialogFrame>
    )
  }

  const secret = interaction.type === 'secret' || interaction.type === 'sudo'
  const prompt = interaction.type === 'clarify' ? interaction.question : interaction.type === 'secret' ? interaction.prompt : '请输入系统密码'
  const choices = interaction.type === 'clarify' ? interaction.choices : []

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void mideaAgent.resolveInteraction(value)
  }

  return (
    <DialogFrame
      icon={secret ? <IconLock aria-hidden="true" size={20} /> : <IconShieldCheck aria-hidden="true" size={20} />}
      title={secret ? '安全输入' : '需要确认'}
    >
      <p>{prompt}</p>
      {choices.length > 0 ? (
        <div className="choice-list">
          {choices.map(choice => (
            <button key={choice} onClick={() => void mideaAgent.resolveInteraction(choice)} type="button">
              {choice}
            </button>
          ))}
        </div>
      ) : null}
      <form className="dialog-form" onSubmit={submit}>
        <input
          autoFocus
          onChange={event => setValue(event.target.value)}
          type={secret ? 'password' : 'text'}
          value={value}
        />
        <button className="primary-button" disabled={!value} type="submit">
          确认
        </button>
      </form>
    </DialogFrame>
  )
}

function DialogFrame({ children, icon, title }: { children: React.ReactNode; icon: React.ReactNode; title: string }) {
  return (
    <div aria-modal="true" className="dialog-backdrop" role="dialog">
      <section className="dialog-panel">
        <header>
          <span className="dialog-icon">{icon}</span>
          <h2>{title}</h2>
        </header>
        {children}
      </section>
    </div>
  )
}
