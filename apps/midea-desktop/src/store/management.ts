import { atom } from 'nanostores'

import { waitForBackgroundAction } from '@/lib/background-action'
import {
  type ConfigSchemaResponse,
  createProfile,
  deleteProfile,
  type EnvVarInfo,
  getActionStatus,
  getConfig,
  getConfigSchema,
  getEnv,
  getMcpCatalog,
  getMcpServers,
  getModelOptions,
  getSkills,
  getToolsets,
  installMcp,
  listProfiles,
  type McpCatalogEntry,
  type McpServerSummary,
  type ModelOptionsResponse,
  renameProfile,
  setMcpEnabled,
  setModel,
  setSkillEnabled,
  setToolsetEnabled,
  type SkillInfo,
  testMcp,
  type ToolsetInfo
} from '@/lib/management-api'
import { $chat } from '@/store/chat'

import type { RuntimeProfile } from '../../electron/contracts'

export type ManagementTab = 'onboarding' | 'profiles' | 'models' | 'settings' | 'skills' | 'tools' | 'mcp'

export interface ManagementState {
  activeTab: ManagementTab
  busy: boolean
  config: Record<string, unknown>
  configSchema: ConfigSchemaResponse
  env: Record<string, EnvVarInfo>
  error: string | null
  mcpCatalog: McpCatalogEntry[]
  mcpServers: McpServerSummary[]
  model: ModelOptionsResponse | null
  profiles: RuntimeProfile[]
  skills: SkillInfo[]
  toolsets: ToolsetInfo[]
}

export const $management = atom<ManagementState>({
  activeTab: 'onboarding',
  busy: false,
  config: {},
  configSchema: { category_order: [], fields: {} },
  env: {},
  error: null,
  mcpCatalog: [],
  mcpServers: [],
  model: null,
  profiles: [],
  skills: [],
  toolsets: []
})

let refreshGeneration = 0

function isCurrentProfile(profile: string): boolean {
  return $chat.get().expectedProfile === profile
}

export function setManagementTab(activeTab: ManagementTab): void {
  $management.set({ ...$management.get(), activeTab, error: null })
}

export function setManagementError(error: unknown): void {
  $management.set({ ...$management.get(), error: error instanceof Error ? error.message : String(error) })
}

export async function refreshManagement(profile: string): Promise<void> {
  if (!isCurrentProfile(profile)) {
    return
  }

  const generation = ++refreshGeneration

  $management.set({ ...$management.get(), busy: true, error: null })

  try {
    const [profiles, model, skills, toolsets, mcpServers, mcpCatalog, config, configSchema, env] = await Promise.all([
      listProfiles(),
      getModelOptions(profile),
      getSkills(profile),
      getToolsets(profile),
      getMcpServers(profile),
      getMcpCatalog(profile),
      getConfig(profile),
      getConfigSchema(profile),
      getEnv(profile)
    ])

    if (generation !== refreshGeneration || !isCurrentProfile(profile)) {
      return
    }

    $management.set({
      ...$management.get(),
      busy: false,
      config,
      configSchema,
      env,
      mcpCatalog: mcpCatalog.entries,
      mcpServers: mcpServers.servers,
      model,
      profiles: profiles.profiles,
      skills,
      toolsets
    })
  } catch (error) {
    if (generation !== refreshGeneration || !isCurrentProfile(profile)) {
      return
    }

    $management.set({ ...$management.get(), busy: false, error: error instanceof Error ? error.message : String(error) })
  }
}

export async function createManagedProfile(name: string, cloneFrom: string | undefined, current: string): Promise<void> {
  await createProfile(name, cloneFrom)
  await refreshManagement(current)
}

export async function renameManagedProfile(name: string, newName: string, current: string): Promise<void> {
  await renameProfile(name, newName)
  await refreshManagement(current)
}

export async function deleteManagedProfile(name: string, current: string): Promise<void> {
  await deleteProfile(name)
  await refreshManagement(current)
}

export async function selectManagedModel(provider: string, model: string, profile: string): Promise<void> {
  let result = await setModel(provider, model, profile)

  if (result.confirm_required) {
    if (!window.confirm(result.confirm_message || `确认使用模型 ${model}？`)) {
      return
    }

    result = await setModel(provider, model, profile, true)
  }

  if (!result.ok) {
    throw new Error(result.confirm_message || '模型保存失败')
  }

  await refreshManagement(profile)
}

export async function toggleManagedToolset(name: string, enabled: boolean, profile: string): Promise<void> {
  await setToolsetEnabled(name, enabled, profile)
  const toolsets = await getToolsets(profile)

  if (isCurrentProfile(profile)) {$management.set({ ...$management.get(), toolsets })}
}

export async function toggleManagedSkill(name: string, enabled: boolean, profile: string): Promise<void> {
  await setSkillEnabled(name, enabled, profile)
  const skills = await getSkills(profile)

  if (isCurrentProfile(profile)) {$management.set({ ...$management.get(), skills })}
}

export async function toggleManagedMcp(name: string, enabled: boolean, profile: string): Promise<void> {
  await setMcpEnabled(name, enabled, profile)
  const result = await getMcpServers(profile)

  if (isCurrentProfile(profile)) {$management.set({ ...$management.get(), mcpServers: result.servers })}
}

export async function testManagedMcp(name: string, profile: string): Promise<string> {
  const result = await testMcp(name, profile)

  return result.ok ? `${result.tools.length} 个工具可用` : result.error || 'MCP 连接失败'
}

export async function installManagedMcp(name: string, env: Record<string, string>, profile: string): Promise<void> {
  const started = await installMcp(name, env, profile)

  await waitForBackgroundAction({
    started,
    status: action => getActionStatus(action, profile)
  })
  await refreshManagement(profile)
}
