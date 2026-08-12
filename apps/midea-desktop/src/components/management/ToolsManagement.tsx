import { IconSettings, IconX } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

import { waitForBackgroundAction } from '@/lib/background-action'
import {
  getActionStatus,
  getToolsetConfig,
  getToolsetModels,
  runToolsetPostSetup,
  saveToolsetEnv,
  setToolsetModel,
  setToolsetProvider,
  type ToolsetConfig,
  type ToolsetInfo,
  type ToolsetModelsResponse
} from '@/lib/management-api'
import { refreshManagement, setManagementError, toggleManagedToolset } from '@/store/management'

export function ToolsManagement({ profile, toolsets }: { profile: string; toolsets: ToolsetInfo[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [config, setConfig] = useState<ToolsetConfig | null>(null)
  const [models, setModels] = useState<ToolsetModelsResponse | null>(null)
  const [env, setEnv] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const active = config?.providers.find(provider => provider.is_active)

  useEffect(() => {
    if (!selected) { setConfig(null);

 return }

    setConfig(null)
    setModels(null)
    void getToolsetConfig(selected, profile).then(setConfig).catch(setManagementError)
  }, [profile, selected])

  useEffect(() => {
    if (!selected || !active) {
      setModels(null)

      return
    }

    void getToolsetModels(selected, active.name, profile).then(setModels).catch(setManagementError)
  }, [active, profile, selected])

  const run = async (action: () => Promise<unknown>, reload = true) => {
    setBusy(true)

    try {
      await action()

      if (reload && selected) {setConfig(await getToolsetConfig(selected, profile))}
      await refreshManagement(profile)
    } catch (error) { setManagementError(error) } finally { setBusy(false) }
  }

  const runPostSetup = async () => {
    if (!selected || !active?.post_setup) {return}
    setBusy(true)
    setNotice('正在运行安装步骤...')

    try {
      const started = await runToolsetPostSetup(selected, active.post_setup, profile)

      await waitForBackgroundAction({
        started,
        status: async name => {
          const action = await getActionStatus(name, profile)
          const latest = action.lines.at(-1)?.trim()

          if (latest) {setNotice(latest)}

          return action
        }
      })
      setNotice('安装步骤已完成。')
      setConfig(await getToolsetConfig(selected, profile))
      await refreshManagement(profile)
    } catch (error) { setManagementError(error) } finally { setBusy(false) }
  }

  const saveToolModel = async (model: string) => {
    if (!selected || !active) {return}

    await run(async () => {
      await setToolsetModel(selected, model, active.name, profile)
      setModels(current => current ? { ...current, current: model } : current)
    }, false)
  }

  return <section className="management-section">
    <div className="section-intro"><div><h3>工具管理</h3><p>控制当前 profile 的工具集、Provider、密钥和安装步骤。启停对新会话生效，业务权限仍由后端策略决定。</p></div></div>
    {notice ? <div className="management-notice">{notice}</div> : null}
    <div className="management-list">{toolsets.map(tool => <div className="management-row" key={tool.name}><div className="row-main"><strong>{tool.label || tool.name}</strong><span>{tool.description || tool.tools.join(', ')} · {tool.configured ? '已配置' : '待配置'}</span></div><div className="row-actions"><button aria-label={`配置 ${tool.label}`} className="icon-button small" onClick={() => setSelected(tool.name)} type="button"><IconSettings size={15} /></button><button aria-pressed={tool.enabled} className={tool.enabled ? 'toggle on' : 'toggle'} onClick={() => void run(() => toggleManagedToolset(tool.name, !tool.enabled, profile), false)} type="button"><span /></button></div></div>)}</div>
    {selected ? <div className="drawer-block"><div className="editor-heading"><strong>{selected} Provider 配置</strong><button className="icon-button small" onClick={() => setSelected(null)} type="button"><IconX size={15} /></button></div>
      {!config ? <p className="subtle-text">正在读取 Provider...</p> : !config.has_category ? <p className="subtle-text">此工具集没有额外 Provider 配置。</p> : <>
        <div className="provider-cards">{config.providers.map(provider => <button className={provider.is_active ? 'provider-card selected' : 'provider-card'} disabled={busy} key={provider.name} onClick={() => void run(() => setToolsetProvider(selected, provider.name, profile))} type="button"><strong>{provider.name}</strong><span>{provider.status || provider.tag || provider.badge || (provider.is_active ? '已选择' : '可选')}</span></button>)}</div>
        {active?.env_vars.length ? <div className="tool-env-form"><h4>{active.name} 凭据</h4>{active.env_vars.map(variable => <label key={variable.key}><span>{variable.prompt} <code>{variable.key}</code>{variable.is_set ? <small>已配置</small> : null}</span><input onChange={event => setEnv(values => ({ ...values, [variable.key]: event.target.value }))} placeholder={variable.is_set ? '输入新值以轮换' : variable.default || '输入值'} type="password" value={env[variable.key] || ''} /></label>)}<button className="small-button" disabled={busy || Object.values(env).every(value => !value.trim())} onClick={() => void run(async () => { await saveToolsetEnv(selected, env, profile); setEnv({}) })} type="button">保存 Provider 凭据</button></div> : null}
        {models?.has_models ? <label className="stacked-label"><span>工具模型</span><select aria-label="工具模型" disabled={busy} onChange={event => void saveToolModel(event.target.value)} value={models.current || models.default || models.models[0]?.id || ''}>{models.models.map(model => <option key={model.id} value={model.id}>{model.display || model.id}{model.speed ? ` · ${model.speed}` : ''}{model.price ? ` · ${model.price}` : ''}</option>)}</select></label> : null}
        {active?.post_setup ? <div className="post-setup"><span>{active.status === 'ready' ? '本机依赖已就绪，可按需重新安装。' : '该 Provider 需要安装本机依赖。'}</span><button className="small-button" disabled={busy} onClick={() => void runPostSetup()} type="button">{busy ? '安装中...' : active.status === 'ready' ? '重新安装' : '运行安装'}</button></div> : null}
      </>}
    </div> : null}
  </section>
}
