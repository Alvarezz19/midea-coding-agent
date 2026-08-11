import { IconMessageCircle, IconPlus } from '@tabler/icons-react'

import { mideaAgent } from '@/lib/agent-client'

interface SidebarProps {
  disabled: boolean
}

export function Sidebar({ disabled }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span aria-hidden="true" className="brand-mark">
          M
        </span>
        <div className="brand-copy">
          <strong>Midea Agent</strong>
          <span>企业智能工作台</span>
        </div>
      </div>

      <button
        className="new-chat-button"
        disabled={disabled}
        onClick={() => void mideaAgent.newConversation()}
        type="button"
      >
        <IconPlus aria-hidden="true" size={17} stroke={2} />
        新建对话
      </button>

      <nav aria-label="会话" className="sidebar-nav">
        <p className="nav-heading">会话</p>
        <button aria-current="page" className="nav-item active" type="button">
          <IconMessageCircle aria-hidden="true" size={17} stroke={1.8} />
          <span>当前对话</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <span className="footer-label">Runtime profile</span>
        <strong>midea-dev</strong>
      </div>
    </aside>
  )
}
