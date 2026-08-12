import { IconCheck, IconKey, IconRefresh } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'

import { deleteEnv, getModelOptions, type ModelOptionsResponse, setEnv } from '@/lib/management-api'
import { refreshManagement, selectManagedModel, setManagementError, setManagementTab } from '@/store/management'

export function ModelsManagement({ model, profile }: { model: ModelOptionsResponse | null; profile: string }) {
  const [selection, setSelection] = useState('')
  const [providerFilter, setProviderFilter] = useState('')
  const [search, setSearch] = useState('')
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const providers = model?.providers || []
  const selectedProvider = providers.find(item => item.slug === providerFilter) || providers.find(item => item.slug === model?.provider) || providers[0]
  const [provider, modelId] = selection.split('::')

  useEffect(() => {
    if (!providerFilter && selectedProvider) {setProviderFilter(selectedProvider.slug)}
  }, [providerFilter, selectedProvider])

  const visibleModels = useMemo(() => (selectedProvider?.models || []).filter(id => id.toLowerCase().includes(search.toLowerCase())), [search, selectedProvider])

  const saveKey = async () => {
    if (!selectedProvider?.key_env || !key.trim()) {return}
    setSaving(true)

    try {
      await setEnv(selectedProvider.key_env, key.trim(), profile)
      setKey('')
      await refreshManagement(profile)
    } catch (error) { setManagementError(error) } finally { setSaving(false) }
  }

  const refresh = async () => {
    setRefreshing(true)

    try {
      const latest = await getModelOptions(profile, true)
      await refreshManagement(profile)

      if (!latest.providers?.length) {throw new Error('没有可用的 Provider')}
    } catch (error) { setManagementError(error) } finally { setRefreshing(false) }
  }

  return <section className="management-section">
    <div className="section-intro"><div><h3>模型与 Provider</h3><p>选择写入当前 profile，并对高成本模型保留 Hermes 的二次确认。新配置用于后续新会话。</p></div><button className="icon-button" onClick={() => void refresh()} title="刷新模型目录" type="button"><IconRefresh className={refreshing ? 'spin' : ''} size={17} /></button></div>
    <div className="model-current">当前: <strong>{model?.provider || '未设置'} / {model?.model || '未设置'}</strong></div>
    <div className="model-layout">
      <div className="provider-list">{providers.map(item => <button className={selectedProvider?.slug === item.slug ? 'provider-option selected' : 'provider-option'} key={item.slug} onClick={() => { setProviderFilter(item.slug); setSelection(''); setSearch('') }} type="button"><strong>{item.name}</strong><span>{item.authenticated === false ? '需要配置' : `${item.models?.length || 0} 模型`}</span></button>)}</div>
      <div className="model-picker-pane">
        {selectedProvider ? <><div className="provider-heading"><div><strong>{selectedProvider.name}</strong><span>{selectedProvider.warning || (selectedProvider.authenticated === false ? '尚未认证' : '可用')}</span></div>{selectedProvider.key_env ? <code>{selectedProvider.key_env}</code> : null}</div>
          {selectedProvider.authenticated === false && selectedProvider.key_env ? <div className="credential-form"><IconKey size={16} /><input aria-label={`${selectedProvider.name} API Key`} onChange={event => setKey(event.target.value)} placeholder={`输入 ${selectedProvider.key_env}`} type="password" value={key} /><button className="small-button" disabled={!key.trim() || saving} onClick={() => void saveKey()} type="button">保存凭据</button></div> : null}
          {selectedProvider.authenticated !== false && selectedProvider.key_env ? <button className="text-button danger-text" onClick={() => { if (window.confirm(`确认清除 ${selectedProvider.key_env}？`)) {void deleteEnv(selectedProvider.key_env!, profile).then(() => refreshManagement(profile)).catch(setManagementError)} }} type="button">清除该 Provider 凭据</button> : null}
          <input aria-label="搜索模型" className="search-input" onChange={event => setSearch(event.target.value)} placeholder="搜索模型" value={search} />
          <div className="model-grid">{visibleModels.map(id => <button className={selection === `${selectedProvider.slug}::${id}` ? 'model-option selected' : 'model-option'} key={id} onClick={() => setSelection(`${selectedProvider.slug}::${id}`)} type="button"><strong>{id}</strong><span>{selectedProvider.name}</span></button>)}</div>
          {visibleModels.length === 0 ? <div className="empty-panel">当前 Provider 没有可选模型。请先配置凭据并刷新目录，或在设置页检查 Provider。</div> : null}
        </> : <div className="empty-panel">没有可用 Provider。<button className="text-button" onClick={() => setManagementTab('settings')} type="button">打开凭据设置</button></div>}
      </div>
    </div>
    <button className="primary-button" disabled={!provider || !modelId || saving} onClick={() => void (async () => { setSaving(true);

 try { await selectManagedModel(provider, modelId, profile) } catch (error) { setManagementError(error) } finally { setSaving(false) } })()} type="button"><IconCheck size={16} />保存模型</button>
  </section>
}
