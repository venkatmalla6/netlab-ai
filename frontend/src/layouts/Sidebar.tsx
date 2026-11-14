import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Bot,
  Network,
  Image,
  Server,
  Cpu,
  Boxes,
  Sliders,
  Terminal,
  Activity,
  Wrench,
  Layers,
  ShieldAlert,
  Archive,
  History,
  Globe,
  GraduationCap,
  FileCheck2,
  Users2,
  Compass,
  AlertOctagon,
  FileText,
  Palette,
  BarChart3,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react'
import { useSidebarStore } from '@/stores/themeStore'
import { cn } from '@/lib/utils'

interface NavSection {
  title: string
  items: {
    name: string
    path: string
    icon: React.ComponentType<{ className?: string }>
    badge?: string
  }[]
}

const navSections: NavSection[] = [
  {
    title: 'CORE PLATFORM',
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'AI Assistant', path: '/assistant', icon: Bot, badge: 'Groq' },
      { name: 'Topology Builder', path: '/topology', icon: Network },
      { name: 'Image-to-Topology', path: '/vision', icon: Image },
    ],
  },
  {
    title: 'LAB INFRASTRUCTURE',
    items: [
      { name: 'EVE-NG Manager', path: '/eve-ng', icon: Server },
      { name: 'VMware Manager', path: '/vmware', icon: Cpu },
      { name: 'Device Inventory', path: '/devices', icon: Boxes },
      { name: 'Device Config', path: '/device-config', icon: Sliders },
      { name: 'Device Terminal', path: '/terminal', icon: Terminal },
    ],
  },
  {
    title: 'DIAGNOSTICS & TELEMETRY',
    items: [
      { name: 'Monitoring', path: '/monitoring', icon: Activity },
      { name: 'AI Troubleshooting', path: '/troubleshooting', icon: Wrench, badge: 'Auto' },
      { name: 'Packet Analyzer', path: '/packets', icon: Layers },
      { name: 'Looking Glass', path: '/looking-glass', icon: Globe, badge: 'BGP' },
      { name: 'Security Analyzer', path: '/security', icon: ShieldAlert },
      { name: 'Config Backup', path: '/backup', icon: Archive },
      { name: 'Config History', path: '/history', icon: History },
    ],
  },
  {
    title: 'NETWORKING ACADEMY',
    items: [
      { name: 'Academy Courses', path: '/academy', icon: GraduationCap },
      { name: 'Practical Exams', path: '/exams', icon: FileCheck2 },
      { name: 'Interview Simulator', path: '/interview', icon: Users2 },
      { name: 'Learning Roadmap', path: '/roadmap', icon: Compass },
      { name: 'Failure Simulator', path: '/failure-sim', icon: AlertOctagon },
    ],
  },
  {
    title: 'ENGINEERING & SYSTEM',
    items: [
      { name: 'Network Docs', path: '/docs-gen', icon: FileText },
      { name: 'AI Whiteboard', path: '/whiteboard', icon: Palette },
      { name: 'Analytics', path: '/analytics', icon: BarChart3 },
      { name: 'User Management', path: '/users', icon: UserCog },
      { name: 'Settings', path: '/settings', icon: Settings },
    ],
  },
]

export const Sidebar: React.FC = () => {
  const { isCollapsed, toggleSidebar } = useSidebarStore()

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-slate-800 bg-[#0b1120] text-slate-300 transition-all duration-300 z-20 h-screen select-none',
        isCollapsed ? 'w-20' : 'w-72'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-wide text-white flex items-center gap-1.5">
                NETLAB <span className="text-blue-400 font-extrabold">AI</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                Autonomous Network Platform
              </span>
            </div>
          )}
        </div>

        <button
          onClick={toggleSidebar}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav Items List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150',
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 font-semibold border-l-2 border-blue-500 shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    )
                  }
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon className={cn('h-4 w-4 shrink-0 transition-transform group-hover:scale-110')} />
                  {!isCollapsed && (
                    <span className="flex-1 truncate">{item.name}</span>
                  )}
                  {!isCollapsed && item.badge && (
                    <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-1.5 py-0.2 text-[9px] font-semibold text-blue-300 uppercase">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer Info */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Localhost Mode</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">v1.0.0</span>
        </div>
      )}
    </aside>
  )
}

