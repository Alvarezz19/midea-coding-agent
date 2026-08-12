import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'

import { Composer } from '@/components/Composer'
import { Header } from '@/components/Header'
import { InteractionDialog } from '@/components/InteractionDialog'
import { ManagementPanel } from '@/components/ManagementPanel'
import { Sidebar } from '@/components/Sidebar'
import { Transcript } from '@/components/Transcript'
import { mideaAgent } from '@/lib/agent-client'
import { $chat } from '@/store/chat'

export function App() {
  const state = useStore($chat)
  const [managementOpen, setManagementOpen] = useState(false)

  useEffect(() => {
    void mideaAgent.start()
  }, [])

  return (
    <div className="app-shell">
      <Sidebar disabled={state.connectionPhase !== 'ready' || state.busy} onOpenManagement={() => setManagementOpen(true)} profile={state.expectedProfile} />
      <section className="workspace">
        <Header state={state} />
        <Transcript state={state} />
        <Composer state={state} />
      </section>
      {state.interaction ? <InteractionDialog interaction={state.interaction} /> : null}
      {managementOpen ? <ManagementPanel onClose={() => setManagementOpen(false)} profile={state.expectedProfile} /> : null}
    </div>
  )
}
