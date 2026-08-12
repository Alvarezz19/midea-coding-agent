import fs from 'node:fs/promises'
import path from 'node:path'

import { _electron as electron } from 'playwright'

const root = path.resolve(import.meta.dirname, '..')
const output = path.join(root, 'test-results')

await fs.mkdir(output, { recursive: true })

const app = await electron.launch({
  args: [root],
  env: Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'ELECTRON_RUN_AS_NODE'))
})

const errors = []

try {
  const page = await app.firstWindow({ timeout: 90_000 })

  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', error => errors.push(`page: ${error.message}`))

  await page.getByText('已连接').waitFor({ timeout: 90_000 })
  await page.setViewportSize({ width: 1280, height: 820 })
  await page.screenshot({ path: path.join(output, 'midea-desktop-1280.png') })

  await page.getByRole('button', { name: '打开工作台管理' }).click()
  await page.getByRole('heading', { name: '工作台管理' }).waitFor()

  const tabs = ['首次设置', 'Profiles', '模型', '设置与凭据', '工具', 'Skills', 'MCP']
  const result = {}

  for (const tab of tabs) {
    await page.getByRole('button', { name: tab, exact: true }).click()
    await page.waitForTimeout(150)
    result[tab] = await page.locator('.management-section').innerText()
  }

  await page.screenshot({ path: path.join(output, 'midea-desktop-management-1280.png') })
  await page.setViewportSize({ width: 920, height: 640 })
  await page.screenshot({ path: path.join(output, 'midea-desktop-management-920.png') })

  const overflow = await page.evaluate(() => {
    const elements = [...document.querySelectorAll('body *')]
    return elements.filter(element => {
      const rect = element.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0 && (rect.right > window.innerWidth + 1 || rect.left < -1)
    }).slice(0, 10).map(element => ({ className: element.className, tag: element.tagName }))
  })

  const profileContract = await page.evaluate(async () => {
    const current = await window.mideaDesktop.runtime.connect()
    const suffix = Date.now().toString(36)
    const createdName = `midea-e2e-${suffix}`
    const renamedName = `${createdName}-renamed`
    let cleanupName = createdName

    try {
      await window.mideaDesktop.runtime.api({
        body: { clone_from: current.profile, name: createdName },
        method: 'POST',
        path: '/api/profiles'
      })

      const switched = await window.mideaDesktop.runtime.connect(createdName)
      await window.mideaDesktop.runtime.connect(current.profile)
      await window.mideaDesktop.runtime.api({
        body: { new_name: renamedName },
        method: 'PATCH',
        path: `/api/profiles/${encodeURIComponent(createdName)}`
      })
      cleanupName = renamedName

      const renamed = await window.mideaDesktop.runtime.connect(renamedName)
      const restored = await window.mideaDesktop.runtime.connect(current.profile)
      const profiles = await window.mideaDesktop.runtime.api({ path: '/api/profiles' })

      return {
        created: switched.profile,
        current: current.profile,
        renamed: renamed.profile,
        renamedListed: profiles.profiles.some(profile => profile.name === renamedName),
        restored: restored.profile
      }
    } finally {
      await window.mideaDesktop.runtime.connect(current.profile)
      await window.mideaDesktop.runtime.api({
        method: 'DELETE',
        path: `/api/profiles/${encodeURIComponent(cleanupName)}`
      }).catch(() => undefined)
    }
  })

  if (profileContract.created === profileContract.current) {
    throw new Error(`Runtime connect returned the previous profile: ${JSON.stringify(profileContract)}`)
  }
  if (profileContract.restored !== profileContract.current || profileContract.renamed === profileContract.current || !profileContract.renamedListed) {
    throw new Error(`Runtime profile restoration failed: ${JSON.stringify(profileContract)}`)
  }
  if (overflow.length > 0) throw new Error(`Horizontal overflow: ${JSON.stringify(overflow)}`)
  if (errors.length > 0) throw new Error(errors.join('\n'))

  console.log(JSON.stringify({ profileContract, profiles: result.Profiles.includes('midea-dev'), tabs, viewport: '920x640 and 1280x820' }))
} finally {
  await app.close()
}
