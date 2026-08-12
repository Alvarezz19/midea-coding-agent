import { IconDownload, IconPlus, IconSearch, IconShieldCheck, IconTrash, IconX } from '@tabler/icons-react'
import { useState } from 'react'

import { waitForBackgroundAction } from '@/lib/background-action'
import {
  createSkill,
  getActionStatus,
  getSkillContent,
  installSkill,
  previewSkill,
  scanSkill,
  searchSkills,
  type SkillHubResult,
  type SkillInfo,
  uninstallSkill,
  updateSkill
} from '@/lib/management-api'
import { refreshManagement, setManagementError, toggleManagedSkill } from '@/store/management'

type SkillMode = 'create' | 'edit' | 'hub' | null

export function SkillsManagement({ profile, skills }: { profile: string; skills: SkillInfo[] }) {
  const [mode, setMode] = useState<SkillMode>(null)
  const [editing, setEditing] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('midea')
  const [content, setContent] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SkillHubResult[]>([])
  const [preview, setPreview] = useState('')
  const [scan, setScan] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)

    try { await action(); await refreshManagement(profile) } catch (error) { setManagementError(error) } finally { setBusy(false) }
  }

  const runHubAction = async (action: () => ReturnType<typeof installSkill>) => {
    const started = await action()

    await waitForBackgroundAction({
      started,
      status: name => getActionStatus(name, profile)
    })
  }

  const edit = async (skill: SkillInfo) => {
    try { const result = await getSkillContent(skill.name, profile); setContent(result.content); setEditing(skill.name); setMode('edit') } catch (error) { setManagementError(error) }
  }

  const create = async () => {
    const skillMd = `---\nname: ${name.trim()}\ndescription: ${description.trim()}\n---\n\n${content.trim()}\n`
    await createSkill(name.trim(), skillMd, category.trim(), profile)
    setMode(null); setName(''); setDescription(''); setContent('')
  }

  const inspect = async (result: SkillHubResult) => {
    setBusy(true); setScan('')

    try { const details = await previewSkill(result.identifier, profile); setPreview(details.skill_md); const safety = await scanSkill(result.identifier, profile); setScan(`${safety.verdict.toUpperCase()} · ${safety.summary}`) } catch (error) { setManagementError(error) } finally { setBusy(false) }
  }

  return <section className="management-section">
    <div className="section-intro"><div><h3>Skills 管理</h3><p>启停 profile Skills，创建或编辑自定义 SKILL.md，并在安装 Hub Skill 前查看内容和服务端安全扫描结果。</p></div><div className="row-actions"><button className="small-button" onClick={() => setMode('hub')} type="button"><IconSearch size={15} />Hub</button><button className="primary-button" onClick={() => { setMode('create'); setContent('') }} type="button"><IconPlus size={15} />新建</button></div></div>
    <div className="management-list">{skills.map(skill => <div className="management-row" key={skill.name}><div className="row-main"><strong>{skill.name}</strong><span>{skill.description || skill.category} · {skill.provenance || 'agent'} · 使用 {skill.usage || 0} 次</span></div><div className="row-actions">{skill.provenance === 'agent' ? <button className="small-button" onClick={() => void edit(skill)} type="button">编辑</button> : null}{skill.provenance === 'hub' ? <button aria-label={`卸载 ${skill.name}`} className="icon-button small danger" disabled={busy} onClick={() => { if (window.confirm(`确认卸载 Hub Skill ${skill.name}？`)) {void run(() => runHubAction(() => uninstallSkill(skill.name, profile)))} }} type="button"><IconTrash size={15} /></button> : null}<button aria-pressed={skill.enabled} className={skill.enabled ? 'toggle on' : 'toggle'} onClick={() => void run(() => toggleManagedSkill(skill.name, !skill.enabled, profile))} type="button"><span /></button></div></div>)}</div>
    {mode === 'create' ? <div className="drawer-block"><DrawerHeader close={() => setMode(null)} label="新建自定义 Skill" /><div className="stacked-form"><input aria-label="Skill 名称" onChange={event => setName(event.target.value)} placeholder="小写名称" value={name} /><input aria-label="Skill 描述" onChange={event => setDescription(event.target.value)} placeholder="何时使用这个 Skill" value={description} /><input aria-label="Skill 分类" onChange={event => setCategory(event.target.value)} placeholder="分类" value={category} /><textarea aria-label="Skill 正文" onChange={event => setContent(event.target.value)} placeholder="工作流说明、约束和步骤" rows={12} value={content} /><button className="primary-button" disabled={!name.trim() || !description.trim() || !content.trim() || busy} onClick={() => void run(create)} type="button">创建 Skill</button></div></div> : null}
    {mode === 'edit' ? <div className="drawer-block"><DrawerHeader close={() => setMode(null)} label={`${editing}/SKILL.md`} /><textarea aria-label="Skill 内容" className="code-editor" onChange={event => setContent(event.target.value)} rows={16} value={content} /><button className="primary-button" disabled={busy} onClick={() => void run(async () => { await updateSkill(editing, content, profile); setMode(null) })} type="button">保存 Skill</button></div> : null}
    {mode === 'hub' ? <div className="drawer-block"><DrawerHeader close={() => setMode(null)} label="Skills Hub" /><div className="inline-form"><input aria-label="搜索 Skills Hub" onChange={event => setQuery(event.target.value)} placeholder="搜索 Skill" value={query} /><button className="small-button" disabled={!query.trim() || busy} onClick={() => void (async () => { setBusy(true);

 try { setResults((await searchSkills(query, profile)).results) } catch (error) { setManagementError(error) } finally { setBusy(false) } })()} type="button"><IconSearch size={15} />搜索</button></div><div className="management-list">{results.map(result => <div className="management-row" key={result.identifier}><div className="row-main"><strong>{result.name}</strong><span>{result.description} · {result.trust_level}</span></div><div className="row-actions"><button className="small-button" onClick={() => void inspect(result)} type="button"><IconShieldCheck size={15} />检查</button><button className="small-button" disabled={busy} onClick={() => void run(() => runHubAction(() => installSkill(result.identifier, profile)))} type="button"><IconDownload size={15} />安装</button></div></div>)}</div>{scan ? <div className="scan-result">{scan}</div> : null}{preview ? <pre className="skill-preview">{preview}</pre> : null}</div> : null}
  </section>
}

function DrawerHeader({ label, close }: { label: string; close: () => void }) { return <div className="editor-heading"><strong>{label}</strong><button className="icon-button small" onClick={close} type="button"><IconX size={15} /></button></div> }
