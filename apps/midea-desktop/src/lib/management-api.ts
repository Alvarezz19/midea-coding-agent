import type { RuntimeProfile } from '../../electron/contracts'

export interface ModelOptionProvider {
  authenticated?: boolean
  auth_type?: string
  key_env?: string
  models?: string[]
  name: string
  slug: string
  warning?: string
}

export interface ModelOptionsResponse {
  model?: string
  provider?: string
  providers?: ModelOptionProvider[]
}

export interface ModelSetResponse {
  confirm_message?: string
  confirm_required?: boolean
  model: string
  ok: boolean
  provider: string
}

export interface EnvVarInfo {
  advanced: boolean
  category: string
  channel_managed?: boolean
  custom?: boolean
  description: string
  is_password: boolean
  is_set: boolean
  provider?: string
  provider_label?: string
  redacted_value: string | null
  tools: string[]
  url: string | null
}

export interface ConfigFieldSchema {
  category: string
  description: string
  max?: number
  min?: number
  options?: unknown[]
  type: 'boolean' | 'list' | 'number' | 'object' | 'select' | 'string' | 'text'
}

export interface ConfigSchemaResponse {
  category_order: string[]
  fields: Record<string, ConfigFieldSchema>
}

export interface SkillInfo {
  category: string
  description: string
  enabled: boolean
  name: string
  provenance?: 'agent' | 'bundled' | 'hub'
  usage?: number
}

export interface SkillHubResult {
  description: string
  identifier: string
  name: string
  source: string
  tags: string[]
  trust_level: string
}

export interface SkillHubPreview extends SkillHubResult {
  files: string[]
  skill_md: string
}

export interface SkillHubScan {
  findings: { category: string; description: string; file: string; line: number; severity: string }[]
  policy: 'allow' | 'ask' | 'block'
  policy_reason: string
  summary: string
  verdict: string
}

export interface ToolsetInfo {
  configured: boolean
  description: string
  enabled: boolean
  label: string
  name: string
  tools: string[]
}

export interface ToolsetProviderEnvVar {
  default: string | null
  is_set: boolean
  key: string
  prompt: string
  url: string | null
}

export interface ToolsetProvider {
  badge: string
  env_vars: ToolsetProviderEnvVar[]
  is_active: boolean
  name: string
  post_setup: string | null
  requires_nous_auth: boolean
  status?: string
  tag: string
}

export interface ToolsetConfig {
  active_provider: string | null
  has_category: boolean
  name: string
  providers: ToolsetProvider[]
}

export interface ToolsetModel {
  display: string
  id: string
  price: string
  speed: string
  strengths: string
}

export interface ToolsetModelsResponse {
  current: string | null
  default: string | null
  has_models: boolean
  models: ToolsetModel[]
  name: string
  provider?: string | null
}

export interface ActionStartResponse {
  action?: string
  background?: boolean
  name: string
  ok: boolean
  pid?: number | null
}

export interface ActionStatusResponse {
  exit_code: number | null
  lines: string[]
  name: string
  pid: number | null
  running: boolean
}

export interface McpServerSummary {
  args: string[]
  auth: 'header' | 'oauth' | null
  command: string | null
  enabled: boolean
  env: Record<string, string>
  name: string
  tools: string[] | null
  transport: string
  url: string | null
}

export interface McpServerCreate {
  args?: string[]
  auth?: 'header' | 'none' | 'oauth'
  bearer_token?: string
  command?: string
  env?: Record<string, string>
  name: string
  url?: string
}

export interface McpCatalogEntry {
  args: string[]
  auth_type: 'api_key' | 'none' | 'oauth'
  command: string | null
  description: string
  enabled: boolean
  installed: boolean
  name: string
  needs_install: boolean
  required_env: { name: string; prompt: string; required: boolean }[]
  transport: string
  url: string | null
}

export interface McpOAuthFlow {
  authorization_url: string | null
  error: string | null
  flow_id: string
  status: 'approved' | 'authorization_required' | 'error' | 'starting'
  tools?: { description: string; name: string }[]
}

type ApiMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT'

async function api<T>(path: string, method: ApiMethod = 'GET', body?: unknown, profile?: string): Promise<T> {
  return (await window.mideaDesktop.runtime.api({ body, method, path, profile })) as T
}

export function listProfiles(): Promise<{ profiles: RuntimeProfile[] }> {
  return api('/api/profiles')
}

export function createProfile(name: string, cloneFrom?: string): Promise<{ name: string; ok: boolean }> {
  return api('/api/profiles', 'POST', { clone_from: cloneFrom || null, name })
}

export function renameProfile(name: string, newName: string): Promise<{ name: string; ok: boolean }> {
  return api(`/api/profiles/${encodeURIComponent(name)}`, 'PATCH', { new_name: newName })
}

export function deleteProfile(name: string): Promise<{ ok: boolean }> {
  return api(`/api/profiles/${encodeURIComponent(name)}`, 'DELETE')
}

export function getConfig(profile: string): Promise<Record<string, unknown>> {
  return api('/api/config', 'GET', undefined, profile)
}

export function saveConfig(config: Record<string, unknown>, profile: string): Promise<{ ok: boolean }> {
  return api('/api/config', 'PUT', { config }, profile)
}

export function getConfigSchema(profile: string): Promise<ConfigSchemaResponse> {
  return api('/api/config/schema', 'GET', undefined, profile)
}

export function getEnv(profile: string): Promise<Record<string, EnvVarInfo>> {
  return api('/api/env', 'GET', undefined, profile)
}

export function setEnv(key: string, value: string, profile: string): Promise<{ ok: boolean }> {
  return api('/api/env', 'PUT', { key, value }, profile)
}

export function deleteEnv(key: string, profile: string): Promise<{ ok: boolean }> {
  return api('/api/env', 'DELETE', { key }, profile)
}

export function getModelOptions(profile: string, refresh = false): Promise<ModelOptionsResponse> {
  const params = new URLSearchParams({ explicit_only: '1', include_unconfigured: '1' })

  if (refresh) {
    params.set('refresh', '1')
  }

  return api(`/api/model/options?${params}`, 'GET', undefined, profile)
}

export function setModel(provider: string, model: string, profile: string, confirmExpensiveModel = false): Promise<ModelSetResponse> {
  return api('/api/model/set', 'POST', { confirm_expensive_model: confirmExpensiveModel, model, provider, scope: 'main' }, profile)
}

export function getToolsets(profile: string): Promise<ToolsetInfo[]> {
  return api('/api/tools/toolsets', 'GET', undefined, profile)
}

export function setToolsetEnabled(name: string, enabled: boolean, profile: string): Promise<{ ok: boolean }> {
  return api(`/api/tools/toolsets/${encodeURIComponent(name)}`, 'PUT', { enabled }, profile)
}

export function getToolsetConfig(name: string, profile: string): Promise<ToolsetConfig> {
  return api(`/api/tools/toolsets/${encodeURIComponent(name)}/config`, 'GET', undefined, profile)
}

export function getToolsetModels(name: string, provider: string | undefined, profile: string): Promise<ToolsetModelsResponse> {
  const query = provider ? `?provider=${encodeURIComponent(provider)}` : ''

  return api(`/api/tools/toolsets/${encodeURIComponent(name)}/models${query}`, 'GET', undefined, profile)
}

export function setToolsetModel(name: string, model: string, provider: string | undefined, profile: string): Promise<{ ok: boolean }> {
  return api(`/api/tools/toolsets/${encodeURIComponent(name)}/model`, 'PUT', { model, provider }, profile)
}

export function setToolsetProvider(name: string, provider: string, profile: string): Promise<{ ok: boolean }> {
  return api(`/api/tools/toolsets/${encodeURIComponent(name)}/provider`, 'PUT', { provider }, profile)
}

export function saveToolsetEnv(name: string, env: Record<string, string>, profile: string): Promise<{ ok: boolean }> {
  return api(`/api/tools/toolsets/${encodeURIComponent(name)}/env`, 'PUT', { env }, profile)
}

export function runToolsetPostSetup(name: string, key: string, profile: string): Promise<ActionStartResponse> {
  return api(`/api/tools/toolsets/${encodeURIComponent(name)}/post-setup`, 'POST', { key }, profile)
}

export function getActionStatus(name: string, profile: string): Promise<ActionStatusResponse> {
  return api(`/api/actions/${encodeURIComponent(name)}/status?lines=300`, 'GET', undefined, profile)
}

export function getSkills(profile: string): Promise<SkillInfo[]> {
  return api('/api/skills', 'GET', undefined, profile)
}

export function setSkillEnabled(name: string, enabled: boolean, profile: string): Promise<{ ok: boolean }> {
  return api('/api/skills/toggle', 'PUT', { enabled, name }, profile)
}

export function getSkillContent(name: string, profile: string): Promise<{ content: string }> {
  return api(`/api/skills/content?name=${encodeURIComponent(name)}`, 'GET', undefined, profile)
}

export function createSkill(name: string, content: string, category: string, profile: string): Promise<{ success: boolean }> {
  return api('/api/skills', 'POST', { category, content, name, profile }, profile)
}

export function updateSkill(name: string, content: string, profile: string): Promise<{ success: boolean }> {
  return api('/api/skills/content', 'PUT', { content, name, profile }, profile)
}

export function searchSkills(query: string, profile: string): Promise<{ results: SkillHubResult[] }> {
  return api(`/api/skills/hub/search?q=${encodeURIComponent(query)}&limit=20`, 'GET', undefined, profile)
}

export function previewSkill(identifier: string, profile: string): Promise<SkillHubPreview> {
  return api(`/api/skills/hub/preview?identifier=${encodeURIComponent(identifier)}`, 'GET', undefined, profile)
}

export function scanSkill(identifier: string, profile: string): Promise<SkillHubScan> {
  return api(`/api/skills/hub/scan?identifier=${encodeURIComponent(identifier)}`, 'GET', undefined, profile)
}

export function installSkill(identifier: string, profile: string): Promise<ActionStartResponse> {
  return api('/api/skills/hub/install', 'POST', { identifier, profile }, profile)
}

export function uninstallSkill(name: string, profile: string): Promise<ActionStartResponse> {
  return api('/api/skills/hub/uninstall', 'POST', { name, profile }, profile)
}

export function getMcpServers(profile: string): Promise<{ servers: McpServerSummary[] }> {
  return api('/api/mcp/servers', 'GET', undefined, profile)
}

export function addMcp(server: McpServerCreate, profile: string): Promise<McpServerSummary> {
  return api('/api/mcp/servers', 'POST', { ...server, profile }, profile)
}

export function setMcpEnabled(name: string, enabled: boolean, profile: string): Promise<{ ok: boolean }> {
  return api(`/api/mcp/servers/${encodeURIComponent(name)}/enabled`, 'PUT', { enabled }, profile)
}

export function deleteMcp(name: string, profile: string): Promise<{ ok: boolean }> {
  return api(`/api/mcp/servers/${encodeURIComponent(name)}`, 'DELETE', undefined, profile)
}

export function testMcp(name: string, profile: string): Promise<{ ok: boolean; error?: string; tools: { name: string; description: string }[] }> {
  return api(`/api/mcp/servers/${encodeURIComponent(name)}/test`, 'POST', undefined, profile)
}

export function startMcpOAuth(name: string, profile: string): Promise<McpOAuthFlow> {
  return api(`/api/mcp/servers/${encodeURIComponent(name)}/auth`, 'POST', undefined, profile)
}

export function getMcpOAuthFlow(flowId: string): Promise<McpOAuthFlow> {
  return api(`/api/mcp/oauth/flows/${encodeURIComponent(flowId)}`)
}

export function getMcpCatalog(profile: string): Promise<{ entries: McpCatalogEntry[] }> {
  return api('/api/mcp/catalog', 'GET', undefined, profile)
}

export function installMcp(name: string, env: Record<string, string>, profile: string): Promise<ActionStartResponse> {
  return api('/api/mcp/catalog/install', 'POST', { enable: true, env, name, profile }, profile)
}
