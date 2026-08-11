import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { Composer } from '@/components/Composer'
import { Header } from '@/components/Header'
import { InteractionDialog } from '@/components/InteractionDialog'
import { Sidebar } from '@/components/Sidebar'
import { Transcript } from '@/components/Transcript'
import { mideaAgent } from '@/lib/agent-client'
import { $chat } from '@/store/chat'

export function App() {
  const state = useStore($chat)

  useEffect(() => {
    void mideaAgent.start()
  }, [])

  return (
    <div className="app-shell">
      <Sidebar disabled={state.connectionPhase !== 'ready' || state.busy} />
      <section className="workspace">
        <Header state={state} />
        <Transcript state={state} />
        <Composer state={state} />
      </section>
      {state.interaction ? <InteractionDialog interaction={state.interaction} /> : null}
    </div>
  )
}
