import { useStore } from '@nanostores/react'
import { IconLoader2, IconX } from '@tabler/icons-react'
import { useEffect } from 'react'

import { McpManagement } from '@/components/management/McpManagement'
import { ModelsManagement } from '@/components/management/ModelsManagement'
import { OnboardingManagement } from '@/components/management/OnboardingManagement'
import { ProfilesManagement } from '@/components/management/ProfilesManagement'
import { SettingsManagement } from '@/components/management/SettingsManagement'
import { SkillsManagement } from '@/components/management/SkillsManagement'
import { ToolsManagement } from '@/components/management/ToolsManagement'
import { $management, type ManagementTab, refreshManagement, setManagementTab } from '@/store/management'

const tabs: { id: ManagementTab; label: string }[] = [
  { id: 'onboarding', label: '首次设置' },
  { id: 'profiles', label: 'Profiles' },
  { id: 'models', label: '模型' },
  { id: 'settings', label: '设置与凭据' },
  { id: 'tools', label: '工具' },
  { id: 'skills', label: 'Skills' },
  { id: 'mcp', label: 'MCP' }
]

export function ManagementPanel({ onClose, profile }: { onClose: () => void; profile: string }) {
  const state = useStore($management)

  useEffect(() => {
    void refreshManagement(profile)
  }, [profile])

  return (
    <div aria-modal="true" className="management-backdrop" role="dialog">
      <section className="management-panel">
        <header className="management-header">
          <div><p className="eyebrow">MIDEA DESKTOP</p><h2>工作台管理</h2></div>
          <button aria-label="关闭管理面板" className="icon-button" onClick={onClose} type="button"><IconX size={18} /></button>
        </header>
        <div className="management-body">
          <nav aria-label="管理分类" className="management-tabs">
            {tabs.map(tab => <button className={state.activeTab === tab.id ? 'management-tab active' : 'management-tab'} key={tab.id} onClick={() => setManagementTab(tab.id)} type="button">{tab.label}</button>)}
          </nav>
          <div className="management-content">
            {state.error ? <div className="management-error" role="alert">{state.error}</div> : null}
            {state.busy ? <div className="management-loading"><IconLoader2 className="spin" size={18} />正在读取 {profile} 配置</div> : null}
            {state.activeTab === 'onboarding' ? <OnboardingManagement profile={profile} /> : null}
            {state.activeTab === 'profiles' ? <ProfilesManagement current={profile} profiles={state.profiles} /> : null}
            {state.activeTab === 'models' ? <ModelsManagement model={state.model} profile={profile} /> : null}
            {state.activeTab === 'settings' ? <SettingsManagement config={state.config} env={state.env} profile={profile} schema={state.configSchema} /> : null}
            {state.activeTab === 'tools' ? <ToolsManagement profile={profile} toolsets={state.toolsets} /> : null}
            {state.activeTab === 'skills' ? <SkillsManagement profile={profile} skills={state.skills} /> : null}
            {state.activeTab === 'mcp' ? <McpManagement catalog={state.mcpCatalog} profile={profile} servers={state.mcpServers} /> : null}
          </div>
        </div>
      </section>
    </div>
  )
}
