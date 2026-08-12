import { IconLink, IconPlus, IconRefresh, IconTrash, IconX } from '@tabler/icons-react'
import { useState } from 'react'

import {
  addMcp,
  deleteMcp,
  getMcpOAuthFlow,
  type McpCatalogEntry,
  type McpServerSummary,
  startMcpOAuth
} from '@/lib/management-api'
import { completeMcpOAuth } from '@/lib/mcp-oauth'
import { installManagedMcp, refreshManagement, setManagementError, testManagedMcp, toggleManagedMcp } from '@/store/management'

export function McpManagement({ catalog, profile, servers }: { catalog: McpCatalogEntry[]; profile: string; servers: McpServerSummary[] }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [command, setCommand] = useState('')
  const [args, setArgs] = useState('')
  const [auth, setAuth] = useState<'none' | 'header' | 'oauth'>('none')
  const [token, setToken] = useState('')
  const [catalogEntry, setCatalogEntry] = useState<McpCatalogEntry | null>(null)
  const [env, setEnv] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)

    try { await action(); await refreshManagement(profile) } catch (error) { setManagementError(error) } finally { setBusy(false) }
  }

  const create = async () => {
    await addMcp({ args: args.split(/\s+/).filter(Boolean), auth: url ? auth : 'none', bearer_token: token || undefined, command: command || undefined, name: name.trim(), url: url || undefined }, profile)
    setAdding(false); setName(''); setUrl(''); setCommand(''); setArgs(''); setToken('')
  }

  const authenticate = async (server: McpServerSummary) => {
    setBusy(true)
    setNotice('正在等待 OAuth 授权...')

    try {
      const flow = await completeMcpOAuth({
        openExternal: window.mideaDesktop.openExternal,
        serverName: server.name,
        start: name => startMcpOAuth(name, profile),
        status: getMcpOAuthFlow
      })

      setNotice(flow.tools?.length ? `OAuth 授权完成，${flow.tools.length} 个工具可用。` : 'OAuth 授权完成。')
      await refreshManagement(profile)
    } catch (error) { setManagementError(error) } finally { setBusy(false) }
  }

  const installCatalog = async () => {
    if (!catalogEntry) {return}
    await installManagedMcp(catalogEntry.name, env, profile)
    setCatalogEntry(null); setEnv({}); setNotice(`${catalogEntry.name} 已安装`)
  }

  return <section className="management-section">
    <div className="section-intro"><div><h3>MCP 服务</h3><p>新增、启停、测试和删除当前 profile 的 MCP 服务；OAuth 与目录安装均由 Hermes Runtime 处理。</p></div><div className="row-actions"><button className="icon-button" onClick={() => void refreshManagement(profile)} title="刷新" type="button"><IconRefresh size={17} /></button><button className="primary-button" onClick={() => setAdding(true)} type="button"><IconPlus size={15} />新增服务</button></div></div>
    {notice ? <div className="management-notice">{notice}</div> : null}
    {adding ? <div className="drawer-block"><div className="editor-heading"><strong>新增 MCP 服务</strong><button className="icon-button small" onClick={() => setAdding(false)} type="button"><IconX size={15} /></button></div><div className="stacked-form"><input aria-label="MCP 名称" onChange={event => setName(event.target.value)} placeholder="服务名称" value={name} /><input aria-label="MCP URL" onChange={event => setUrl(event.target.value)} placeholder="HTTP URL（与命令二选一）" value={url} /><input aria-label="MCP 命令" onChange={event => setCommand(event.target.value)} placeholder="stdio 命令（与 URL 二选一）" value={command} /><input aria-label="MCP 参数" onChange={event => setArgs(event.target.value)} placeholder="命令参数，以空格分隔" value={args} />{url ? <><select aria-label="MCP 认证" onChange={event => setAuth(event.target.value as typeof auth)} value={auth}><option value="none">无认证</option><option value="header">Bearer/API Key</option><option value="oauth">OAuth</option></select>{auth === 'header' ? <input aria-label="MCP Bearer Token" onChange={event => setToken(event.target.value)} placeholder="Bearer Token（仅发送至 Runtime）" type="password" value={token} /> : null}</> : null}<button className="primary-button" disabled={!name.trim() || (!url.trim() && !command.trim()) || busy} onClick={() => void run(create)} type="button">保存服务</button></div></div> : null}
    <h4>已配置服务</h4><div className="management-list">{servers.map(server => <div className="management-row" key={server.name}><div className="row-main"><strong>{server.name}</strong><span>{server.transport} · {server.url || server.command || '未声明端点'} · {server.tools?.length || 0} 个工具</span></div><div className="row-actions"><button className="small-button" disabled={busy} onClick={() => void testManagedMcp(server.name, profile).then(setNotice).catch(setManagementError)} type="button">测试</button>{server.auth === 'oauth' ? <button className="small-button" disabled={busy} onClick={() => void authenticate(server)} type="button"><IconLink size={15} />OAuth</button> : null}<button aria-pressed={server.enabled} className={server.enabled ? 'toggle on' : 'toggle'} onClick={() => void run(() => toggleManagedMcp(server.name, !server.enabled, profile))} type="button"><span /></button><button aria-label={`删除 ${server.name}`} className="icon-button small danger" onClick={() => { if (window.confirm(`确认删除 MCP 服务 ${server.name}？`)) {void run(() => deleteMcp(server.name, profile))} }} type="button"><IconTrash size={15} /></button></div></div>)}</div>
    <h4>安全目录</h4><div className="management-list">{catalog.map(entry => <div className="management-row" key={entry.name}><div className="row-main"><strong>{entry.name}</strong><span>{entry.description} · {entry.transport} · {entry.auth_type}</span></div><button className="small-button" disabled={entry.installed} onClick={() => { setCatalogEntry(entry); setEnv({}) }} type="button">{entry.installed ? '已安装' : '查看并安装'}</button></div>)}</div>
    {catalogEntry ? <div className="drawer-block"><div className="editor-heading"><strong>安装 {catalogEntry.name}</strong><button className="icon-button small" onClick={() => setCatalogEntry(null)} type="button"><IconX size={15} /></button></div><p className="subtle-text">{catalogEntry.description}</p>{catalogEntry.required_env.map(required => <label className="stacked-label" key={required.name}><span>{required.prompt} <code>{required.name}</code></span><input onChange={event => setEnv(values => ({ ...values, [required.name]: event.target.value }))} placeholder={required.required ? '必填' : '可选'} type="password" value={env[required.name] || ''} /></label>)}<pre className="skill-preview">{catalogEntry.command ? `${catalogEntry.command} ${(catalogEntry.args || []).join(' ')}` : catalogEntry.url || '目录服务'}</pre><button className="primary-button" disabled={catalogEntry.required_env.some(required => required.required && !env[required.name]?.trim()) || busy} onClick={() => void installCatalog()} type="button">安装并启用</button></div> : null}
  </section>
}
