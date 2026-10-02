import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AlertDrawer } from '../alerts/AlertDrawer'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="flex min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 lg:px-6">
          <Outlet />
        </main>
      </div>
      <AlertDrawer />
    </div>
  )
}
