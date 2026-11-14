import React, { useEffect, useState } from 'react'
import { Bell, Moon, Sun, Search, Sparkles, Shield, User } from 'lucide-react'
import { useThemeStore } from '@/stores/themeStore'
import { apiClient } from '@/services/api'

export const TopBar: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore()
  const [groqOnline, setGroqOnline] = useState(true)

  useEffect(() => {
    apiClient
      .getSettingsStatus()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.services || [])
        const groq = list.find((s: any) => (s.name || '').toLowerCase().includes('groq'))
        setGroqOnline(groq ? groq.status === 'connected' : true)
      })
      .catch(() => setGroqOnline(true))
  }, [])

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-[#090d16]/90 px-6 backdrop-blur-md">
      {/* Search Input */}
      <div className="flex items-center gap-3 w-96">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search topologies, devices, commands, lessons (Ctrl+K)..."
            className="h-9 w-full rounded-lg border border-slate-800 bg-slate-900/60 pl-9 pr-4 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* AI Engine Status Pill */}
        <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-slate-300 font-medium">AI Engine:</span>
          <span className={`flex items-center gap-1.5 font-semibold ${groqOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${groqOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {groqOnline ? 'Groq (Online)' : 'Local Engine'}
          </span>
        </div>

        {/* EVE-NG Integration indicator */}
        <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 px-2.5 py-1 text-xs text-slate-400">
          <Shield className="h-3.5 w-3.5 text-indigo-400" />
          <span>EVE-NG: Ready</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-blue-400" />}
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-semibold text-xs shadow-md">
            AD
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-semibold text-white">Admin Engineer</span>
            <span className="text-[10px] text-blue-400 font-medium">Super Admin</span>
          </div>
        </div>
      </div>
    </header>
  )
}

