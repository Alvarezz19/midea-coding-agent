import { IconCheck, IconKey, IconTrash } from '@tabler/icons-react'
import { useMemo, useState } from 'react'

import { type ConfigSchemaResponse, deleteEnv, type EnvVarInfo, saveConfig, setEnv } from '@/lib/management-api'
import { refreshManagement, setManagementError } from '@/store/management'

interface SettingsProps {
  config: Record<string, unknown>
  env: Record<string, EnvVarInfo>
  profile: string
  schema: ConfigSchemaResponse
}

export function SettingsManagement({ config, env, profile, schema }: SettingsProps) {
  const [mode, setMode] = useState<'config' | 'credentials'>('config')
  const [query, setQuery] = useState('')
  const [drafts, setDrafts] = useState<Record<string, unknown>>({})
  const [secretDrafts, setSecretDrafts] = useState<Record<string, string>>({})
  const [customKey, setCustomKey] = useState('')
  const [customValue, setCustomValue] = useState('')
  const [saving, setSaving] = useState(false)

  const fields = useMemo(() => Object.entries(schema.fields).filter(([key, field]) => {
    const haystack = `${key} ${field.description} ${field.category}`.toLowerCase()

    return !query || haystack.includes(query.toLowerCase())
  }), [query, schema.fields])

  const credentials = useMemo(() => Object.entries(env).filter(([, info]) => !info.channel_managed && (!query || `${info.provider_label || ''} ${info.description}`.toLowerCase().includes(query.toLowerCase()))).sort((a, b) => Number(b[1].is_set) - Number(a[1].is_set)), [env, query])

  const readPath = (path: string): unknown => path.split('.').reduce<unknown>((value, part) => value && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined, config)

  const nestedPatch = (path: string, value: unknown): Record<string, unknown> => {
    const root: Record<string, unknown> = {}
    let cursor = root
    const parts = path.split('.')
    parts.forEach((part, index) => { if (index === parts.length - 1) {cursor[part] = value;} else { cursor[part] = {}; cursor = cursor[part] as Record<string, unknown> } })

    return root
  }

  const saveField = async (path: string) => {
    const field = schema.fields[path]
    let value = drafts[path]

    if ((field?.type === 'list' || field?.type === 'object') && typeof value === 'string') {
      try {
        value = JSON.parse(value) as unknown
      } catch {
        setManagementError(new Error(`${path} 必须是有效 JSON`))

        return
      }

      if (field.type === 'list' && !Array.isArray(value)) {
        setManagementError(new Error(`${path} 必须是 JSON 数组`))

        return
      }

      if (field.type === 'object' && (!value || Array.isArray(value) || typeof value !== 'object')) {
        setManagementError(new Error(`${path} 必须是 JSON 对象`))

        return
      }
    }

    setSaving(true)

    try {
      await saveConfig(nestedPatch(path, value), profile)
      setDrafts(current => {
        const next = { ...current }

        delete next[path]

        return next
      })
      await refreshManagement(profile)
    } catch (error) { setManagementError(error) } finally { setSaving(false) }
  }

  const saveSecret = async (key: string, value: string) => {
    setSaving(true)

    try { await setEnv(key, value, profile); setSecretDrafts(current => ({ ...current, [key]: '' })); await refreshManagement(profile) } catch (error) { setManagementError(error) } finally { setSaving(false) }
  }

  return <section className="management-section">
    <div className="section-intro"><div><h3>设置与凭据</h3><p>非敏感行为写入 config.yaml；密钥只写入 {profile} 的 .env，界面不会读取或回显明文。</p></div></div>
    <div className="segmented-control"><button className={mode === 'config' ? 'active' : ''} onClick={() => setMode('config')} type="button">Runtime 设置</button><button className={mode === 'credentials' ? 'active' : ''} onClick={() => setMode('credentials')} type="button">凭据</button></div>
    <input aria-label="搜索设置" className="search-input" onChange={event => setQuery(event.target.value)} placeholder="搜索设置" value={query} />
    {mode === 'config' ? <div className="settings-fields">{fields.map(([key, field]) => {
      const current = drafts[key] ?? readPath(key)
      const structured = field.type === 'list' || field.type === 'object'

      const value = structured && typeof current !== 'string'
        ? JSON.stringify(current ?? (field.type === 'list' ? [] : {}), null, 2)
        : String(current ?? '')

      return <div className="setting-row" key={key}><div><strong>{key}</strong><span>{field.description}</span></div><div className={structured || field.type === 'text' ? 'setting-control multiline' : 'setting-control'}>{field.type === 'boolean' ? <button aria-pressed={Boolean(current)} className={current ? 'toggle on' : 'toggle'} onClick={() => setDrafts(values => ({ ...values, [key]: !current }))} type="button"><span /></button> : structured || field.type === 'text' ? <textarea aria-label={key} onChange={event => setDrafts(values => ({ ...values, [key]: event.target.value }))} rows={structured ? 5 : 3} value={value} /> : field.options?.length ? <select onChange={event => setDrafts(values => ({ ...values, [key]: event.target.value }))} value={value}>{field.options.map(option => <option key={String(option)} value={String(option)}>{String(option)}</option>)}</select> : <input max={field.max} min={field.min} onChange={event => setDrafts(values => ({ ...values, [key]: field.type === 'number' ? Number(event.target.value) : event.target.value }))} type={field.type === 'number' ? 'number' : 'text'} value={value} />}<button aria-label={`保存 ${key}`} className="icon-button small" disabled={drafts[key] === undefined || saving} onClick={() => void saveField(key)} type="button"><IconCheck size={15} /></button></div></div>
    })}</div> : <><div className="credentials-list">{credentials.map(([key, info]) => <div className="credential-row" key={key}><div className="credential-status"><IconKey size={16} /><div><strong>{info.provider_label || key}</strong><span>{info.description || key}</span><code>{key} · {info.is_set ? info.redacted_value || '已配置' : '未配置'}</code></div></div><div className="credential-actions"><input aria-label={`${key} 新值`} onChange={event => setSecretDrafts(values => ({ ...values, [key]: event.target.value }))} placeholder={info.is_set ? '输入新值以轮换' : '输入密钥'} type="password" value={secretDrafts[key] || ''} /><button className="small-button" disabled={!secretDrafts[key]?.trim() || saving} onClick={() => void saveSecret(key, secretDrafts[key])} type="button">保存</button>{info.is_set ? <button aria-label={`清除 ${key}`} className="icon-button small danger" onClick={() => { if (window.confirm(`确认清除 ${key}？`)) {void deleteEnv(key, profile).then(() => refreshManagement(profile)).catch(setManagementError)} }} type="button"><IconTrash size={15} /></button> : null}</div></div>)}</div><h4>自定义凭据</h4><div className="inline-form"><input aria-label="环境变量名" onChange={event => setCustomKey(event.target.value.toUpperCase())} placeholder="VARIABLE_NAME" value={customKey} /><input aria-label="环境变量值" onChange={event => setCustomValue(event.target.value)} placeholder="值" type="password" value={customValue} /><button className="primary-button" disabled={!/^[A-Z_][A-Z0-9_]*$/.test(customKey) || !customValue || saving} onClick={() => void saveSecret(customKey, customValue).then(() => { setCustomKey(''); setCustomValue('') })} type="button">添加</button></div></>}
  </section>
}
