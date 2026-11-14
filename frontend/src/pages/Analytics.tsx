import React, { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, Activity, CheckCircle2, Award, Zap, Layers, Monitor, Server, FileText } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { apiClient } from '@/services/api'

export const Analytics: React.FC = () => {
  const [stats, setStats] = useState({
    totalLabs: 0,
    runningLabs: 0,
    totalDevices: 0,
    runningDevices: 0,
    totalTopologies: 0,
    totalConfigurations: 0,
    totalChatSessions: 0,
    totalChatMessages: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
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
            totalChatSessions: data.stats.total_chat_sessions ?? 0,
            totalChatMessages: data.stats.total_chat_messages ?? 0,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-400" />
            Platform Analytics & Live Telemetry
          </h1>
          <p className="text-sm text-slate-400">
            Real metrics computed from your local database sessions and virtual networking entities.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-400">Total Virtual Labs</span>
          <span className="text-2xl font-bold text-white mt-1">{stats.totalLabs}</span>
          <span className="text-[11px] text-blue-400 mt-1">{stats.runningLabs} running</span>
        </Card>
        <Card className="p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-400">Total Devices</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1">{stats.totalDevices}</span>
          <span className="text-[11px] text-emerald-300 mt-1">{stats.runningDevices} active nodes</span>
        </Card>
        <Card className="p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-400">Configurations Saved</span>
          <span className="text-2xl font-bold text-purple-400 mt-1">{stats.totalConfigurations}</span>
          <span className="text-[11px] text-purple-300 mt-1">Audit log tracking</span>
        </Card>
        <Card className="p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-400">AI Interactions</span>
          <span className="text-2xl font-bold text-amber-400 mt-1">{stats.totalChatMessages}</span>
          <span className="text-[11px] text-amber-300 mt-1">Across {stats.totalChatSessions} sessions</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Database Entity Breakdown</CardTitle>
            <CardDescription>Actual count of records stored in SQLite</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-300 flex items-center gap-2">
                <Server className="h-4 w-4 text-blue-400" /> Virtual Labs
              </span>
              <span className="font-mono text-white font-bold">{stats.totalLabs}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-300 flex items-center gap-2">
                <Monitor className="h-4 w-4 text-emerald-400" /> Devices
              </span>
              <span className="font-mono text-white font-bold">{stats.totalDevices}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-300 flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-400" /> Topologies
              </span>
              <span className="font-mono text-white font-bold">{stats.totalTopologies}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-300 flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-400" /> Device Configurations
              </span>
              <span className="font-mono text-white font-bold">{stats.totalConfigurations}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Engine Activity</CardTitle>
            <CardDescription>Interaction history and prompts processed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-300">Total Conversations</span>
              <span className="font-mono text-white font-bold">{stats.totalChatSessions}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-300">Total Chat Messages</span>
              <span className="font-mono text-white font-bold">{stats.totalChatMessages}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-300">Active AI Model</span>
              <span className="font-mono text-emerald-400 font-bold">Groq (Qwen 3.8 27B)</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
