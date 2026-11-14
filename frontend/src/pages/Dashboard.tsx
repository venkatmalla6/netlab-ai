import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Server,
  Play,
  Monitor,
  Activity,
  Bot,
  PlusCircle,
  Wrench,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/services/api'

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalLabs: 0,
    runningLabs: 0,
    totalDevices: 0,
    runningDevices: 0,
    totalTopologies: 0,
    totalConfigurations: 0,
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [quickPrompt, setQuickPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    apiClient
      .getDashboard()
      .then((data) => {
        if (data.stats) {
          setStats({
            totalLabs: data.stats.total_labs ?? 0,
            runningLabs: data.stats.running_labs ?? 0,
            totalDevices: data.stats.total_devices ?? 0,
            runningDevices: data.stats.running_devices ?? 0,
            totalTopologies: data.stats.total_topologies ?? 0,
            totalConfigurations: data.stats.total_configurations ?? 0,
          })
        }
        if (data.recent_activity) {
          setRecentActivity(data.recent_activity)
        }
      })
      .catch((err) => {
        console.error('Failed to load dashboard data:', err)
      })
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-900/40 via-indigo-950/40 to-slate-900/40 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs font-medium">
                Live Environment
              </Badge>
              <span className="text-xs text-slate-400">Localhost Workspace</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              NETLAB <span className="text-blue-400">AI</span> Dashboard
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Real-time telemetry, automated topology design, and EVE-NG virtual lab orchestration.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/topology">
              <Button className="gap-2 bg-blue-600 hover:bg-blue-500">
                <PlusCircle className="h-4 w-4" />
                Build Topology
              </Button>
            </Link>
            <Link to="/assistant">
              <Button variant="secondary" className="gap-2">
                <Bot className="h-4 w-4 text-blue-400" />
                AI Assistant
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Real-time Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-400">Total Virtual Labs</CardTitle>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
              <Server className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalLabs}</div>
            <p className="text-xs text-slate-400 mt-1">
              {stats.totalLabs === 0 ? 'No labs created yet' : 'In local database'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-400">Running Labs</CardTitle>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <Play className="h-4 w-4 fill-current" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.runningLabs}</div>
            <p className="text-xs text-slate-400 mt-1">
              {stats.runningLabs > 0 ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active sessions
                </span>
              ) : (
                'All labs stopped'
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-400">Registered Devices</CardTitle>
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
              <Monitor className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalDevices}</div>
            <p className="text-xs text-slate-400 mt-1">
              {stats.runningDevices} currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-400">Saved Configurations</CardTitle>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{stats.totalConfigurations}</div>
            <p className="text-xs text-slate-400 mt-1">Versioned snapshots</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Two-Column Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Real Audit Activity Stream */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Audit Trail & Events</CardTitle>
              <CardDescription>Live telemetry and operations logged to database</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              Database Stream
            </Badge>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center text-center text-slate-500 border border-slate-800/60 rounded-xl bg-slate-950/20 p-6">
                <Clock className="h-8 w-8 text-slate-600 mb-2" />
                <p className="text-xs font-medium text-slate-400">No activity recorded yet</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Actions like creating labs, executing commands, or updating topologies will appear here in real-time.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {recentActivity.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white block">{act.action}</span>
                      <span className="text-[11px] text-slate-400">{act.details || 'System event'}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: AI Copilot */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">AI Copilot</span>
            </div>
            <CardTitle>Ask AI Network Engineer</CardTitle>
            <CardDescription>Connected to live Groq Qwen 3.8 27B model</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-slate-950/70 p-3.5 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              Describe any network requirement, routing protocol, or failure in plain English to design or troubleshoot.
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Suggested Prompts</p>
              <div className="space-y-1.5">
                {[
                  'Configure OSPF Area 0 on 3 Cisco routers',
                  'Explain Router-on-a-Stick VLAN routing',
                  'Troubleshoot OSPF neighbor stuck in 2-WAY',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setQuickPrompt(prompt)}
                    className="w-full text-left text-xs text-slate-300 bg-slate-800/40 hover:bg-slate-800 hover:text-white px-2.5 py-1.5 rounded border border-slate-800/80 transition-colors flex items-center justify-between"
                  >
                    <span className="truncate">{prompt}</span>
                    <ArrowRight className="h-3 w-3 text-slate-500 shrink-0 ml-1" />
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Link to={quickPrompt ? `/assistant?q=${encodeURIComponent(quickPrompt)}` : '/assistant'}>
                <Button className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500">
                  <Bot className="h-4 w-4" />
                  Launch Conversation
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Quick Launchpad */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link to="/topology" className="group">
          <Card className="h-full transition-all duration-200 hover:border-blue-500/50 hover:bg-slate-900/90 cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-xl bg-blue-600/10 p-3 text-blue-400 group-hover:scale-110 transition-transform">
                <PlusCircle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Create New Lab</h4>
                <p className="text-xs text-slate-400">Blank canvas designer</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/vision" className="group">
          <Card className="h-full transition-all duration-200 hover:border-indigo-500/50 hover:bg-slate-900/90 cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-xl bg-indigo-600/10 p-3 text-indigo-400 group-hover:scale-110 transition-transform">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Image-to-Topology</h4>
                <p className="text-xs text-slate-400">Convert diagrams to EVE-NG</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/troubleshooting" className="group">
          <Card className="h-full transition-all duration-200 hover:border-amber-500/50 hover:bg-slate-900/90 cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-xl bg-amber-600/10 p-3 text-amber-400 group-hover:scale-110 transition-transform">
                <Wrench className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">AI Diagnostics</h4>
                <p className="text-xs text-slate-400">Live symptom analysis</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/academy" className="group">
          <Card className="h-full transition-all duration-200 hover:border-emerald-500/50 hover:bg-slate-900/90 cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-xl bg-emerald-600/10 p-3 text-emerald-400 group-hover:scale-110 transition-transform">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Networking Academy</h4>
                <p className="text-xs text-slate-400">Interactive curriculum</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
