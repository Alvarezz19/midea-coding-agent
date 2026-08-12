import { IconCheck, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'

import { mideaAgent } from '@/lib/agent-client'
import { createManagedProfile, deleteManagedProfile, renameManagedProfile, setManagementError } from '@/store/management'

import type { RuntimeProfile } from '../../../electron/contracts'

export function ProfilesManagement({ profiles, current }: { profiles: RuntimeProfile[]; current: string }) {
  const [name, setName] = useState('')
  const [cloneFrom, setCloneFrom] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)

    try { await action() } catch (error) { setManagementError(error) } finally { setBusy(false) }
  }

  const rename = async (oldName: string, nextName: string) => {
    if (oldName === current) {
      await mideaAgent.releaseProfile()
      await renameManagedProfile(oldName, nextName, 'default')
      await mideaAgent.switchProfile(nextName)

      return
    }

    await renameManagedProfile(oldName, nextName, current)
  }

  const remove = async (profile: string) => {
    if (profile === current) {
      await mideaAgent.releaseProfile()
      await deleteManagedProfile(profile, 'default')

      return
    }

    await deleteManagedProfile(profile, current)
  }

  return (
    <section className="management-section">
      <div className="section-intro"><div><h3>运行 Profile</h3><p>配置、凭据、会话、Skills、MCP 和日志按 profile 隔离。当前 Runtime 切换时会创建新的会话。</p></div><span className="profile-chip">当前: {current}</span></div>
      <div className="inline-form">
        <input aria-label="新 profile 名称" onChange={event => setName(event.target.value)} placeholder="例如 service-staging" value={name} />
        <select aria-label="复制来源" onChange={event => setCloneFrom(event.target.value)} value={cloneFrom}><option value="">空白 profile</option>{profiles.map(item => <option key={item.name} value={item.name}>复制 {item.name}</option>)}</select>
        <button className="primary-button" disabled={!name.trim() || busy} onClick={() => void run(async () => { await createManagedProfile(name.trim(), cloneFrom || undefined, current); setName('') })} type="button"><IconPlus size={16} />创建</button>
      </div>
      <div className="management-list">
        {profiles.map(item => <div className={item.name === current ? 'management-row selected' : 'management-row'} key={item.name}>
          <div className="row-main"><strong>{item.name}</strong><span>{item.model ? `${item.provider || ''} / ${item.model}` : '尚未设置模型'} · {item.skill_count} Skills</span></div>
          <div className="row-actions">
            {item.name !== current ? <button className="small-button" disabled={busy} onClick={() => void run(() => mideaAgent.switchProfile(item.name))} type="button">切换</button> : <span className="active-label"><IconCheck size={14} />当前</span>}
            {!item.is_default ? <><button aria-label={`重命名 ${item.name}`} className="icon-button small" onClick={() => { setEditing(item.name); setNewName(item.name) }} type="button"><IconEdit size={15} /></button><button aria-label={`删除 ${item.name}`} className="icon-button small danger" onClick={() => { if (window.confirm(`确认永久删除 profile ${item.name} 及其配置、会话和 Skills？`)) {void run(() => remove(item.name))} }} type="button"><IconTrash size={15} /></button></> : null}
          </div>
        </div>)}
      </div>
      {editing ? <div className="inline-form rename-form"><input aria-label="新名称" onChange={event => setNewName(event.target.value)} value={newName} /><button className="primary-button" disabled={!newName.trim() || newName === editing || busy} onClick={() => void run(async () => { await rename(editing, newName.trim()); setEditing(null) })} type="button">保存</button><button className="secondary-button" onClick={() => setEditing(null)} type="button">取消</button></div> : null}
    </section>
  )
}
