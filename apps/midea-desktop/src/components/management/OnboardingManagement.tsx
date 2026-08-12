import { useStore } from '@nanostores/react'
import { IconCheck, IconCircle, IconKey, IconPuzzle, IconRobot, IconTool } from '@tabler/icons-react'
import { useState } from 'react'

import { saveConfig } from '@/lib/management-api'
import { $management, refreshManagement, setManagementError, setManagementTab } from '@/store/management'

export function OnboardingManagement({ profile }: { profile: string }) {
  const state = useStore($management)
  const [saving, setSaving] = useState(false)
  const onboarding = state.config.onboarding as Record<string, unknown> | undefined
  const complete = onboarding?.midea_desktop_complete === true
  const hasCredential = Object.values(state.env).some(entry => entry.is_set && !entry.channel_managed)
  const hasModel = Boolean(state.model?.provider && state.model?.model)
  const hasTool = state.toolsets.some(tool => tool.enabled)
  const extensions = state.skills.filter(skill => skill.enabled).length + state.mcpServers.filter(server => server.enabled).length

  const steps = [
    { done: hasCredential, icon: IconKey, label: '连接 Provider', note: hasCredential ? '已保存至少一个 Runtime 凭据' : '添加 API Key；本地或无密钥 Provider 可跳过', tab: 'settings' as const },
    { done: hasModel, icon: IconRobot, label: '选择模型', note: hasModel ? `${state.model?.provider} / ${state.model?.model}` : '选择当前 profile 的主模型', tab: 'models' as const },
    { done: hasTool, icon: IconTool, label: '配置工具', note: hasTool ? `${state.toolsets.filter(tool => tool.enabled).length} 个工具集已启用` : '只启用业务所需的最小工具集', tab: 'tools' as const },
    { done: extensions > 0, icon: IconPuzzle, label: '检查 Skills 与 MCP', note: `${state.skills.filter(skill => skill.enabled).length} Skills · ${state.mcpServers.filter(server => server.enabled).length} MCP`, tab: 'skills' as const }
  ]

  const finish = async () => {
    setSaving(true)

    try {
      await saveConfig({ onboarding: { midea_desktop_complete: true } }, profile)
      await refreshManagement(profile)
    } catch (error) { setManagementError(error) } finally { setSaving(false) }
  }

  return <section className="management-section onboarding-section">
    <div className="section-intro"><div><h3>{complete ? '工作台已就绪' : '设置 Midea Desktop'}</h3><p>这套流程只写入 {profile}。业务系统权限、数据访问和审计仍由 Midea 插件或 MCP 服务端控制。</p></div><span className={complete ? 'setup-badge ready' : 'setup-badge'}>{complete ? '已完成' : '进行中'}</span></div>
    <div className="setup-steps">{steps.map(step => { const StepIcon = step.icon;

 return <button className="setup-step" key={step.label} onClick={() => setManagementTab(step.tab)} type="button"><span className={step.done ? 'step-icon done' : 'step-icon'}><StepIcon size={18} /></span><span><strong>{step.label}</strong><small>{step.note}</small></span>{step.done ? <IconCheck className="step-state done" size={18} /> : <IconCircle className="step-state" size={18} />}</button> })}</div>
    <div className="onboarding-finish"><div><strong>开始使用</strong><span>模型设置是必需项；凭据取决于所选 Provider，Skills 与 MCP 可在需要时添加。</span></div><button className="primary-button" disabled={!hasModel || saving} onClick={() => void finish()} type="button">{complete ? '重新确认配置' : '完成设置'}</button></div>
  </section>
}
