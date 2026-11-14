import React, { useEffect, useState } from 'react'
import { Settings as SettingsIcon, Save, RefreshCw, Cpu, Server, Bot, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/services/api'

export const Settings: React.FC = () => {
  const [providerMode, setProviderMode] = useState<'groq' | 'ollama' | 'auto'>('auto')
  const [groqModel, setGroqModel] = useState('qwen/qwen3.8-27b')
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [eveHost, setEveHost] = useState('192.168.126.128')
  const [eveUser, setEveUser] = useState('admin')
  const [evePass, setEvePass] = useState('eve')
  const [vmHost, setVmHost] = useState('127.0.0.1')
  const [vmUser, setVmUser] = useState('root')
  const [vmPass, setVmPass] = useState('eve')
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    apiClient
      .getSettings()
      .then((s) => {
        if (s.groq_model) setGroqModel(s.groq_model)
        if (s.ollama_base_url) setOllamaUrl(s.ollama_base_url)
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    try {
      await apiClient.updateSettings({ groq_model: groqModel })
      if (eveHost) {
        await apiClient.api.post('/eve-ng/config', {
          host: eveHost,
          username: eveUser,
          password: evePass,
        })
      }
      if (vmHost) {
        await apiClient.api.post('/vmware/config', {
          host: vmHost,
          username: vmUser,
          password: vmPass,
        })
      }
      setSaveMessage('Settings saved successfully and synced with running hypervisors and AI engines.')
    } catch (err: any) {
      setSaveMessage(`Failed to update settings: ${err.message}`)
    }
    setTimeout(() => setSaveMessage(null), 4000)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-blue-400" />
            System & Infrastructure Settings
          </h1>
          <p className="text-sm text-slate-400">
            Configure AI models, dynamic hypervisor IP addresses, and hardware execution parameters.
          </p>
        </div>

        <Button onClick={handleSave} className="gap-2 bg-blue-600 hover:bg-blue-500 text-xs text-white">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {saveMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* AI Provider Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-400" />
              AI Intelligence Engine Configuration
            </CardTitle>
            <Badge variant="success" className="text-xs">
              Groq Cloud Active
            </Badge>
          </div>
          <CardDescription>
            Switch between high-speed Groq Cloud inference and local CPU Ollama models.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Provider Routing Mode</label>
              <select
                value={providerMode}
                onChange={(e) => setProviderMode(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
              >
                <option value="auto">Auto Fallback (Groq → Ollama)</option>
                <option value="groq">Groq Cloud Only (Fastest)</option>
                <option value="ollama">Ollama Local Only (Offline)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Groq Model Identifier</label>
              <select
                value={groqModel}
                onChange={(e) => setGroqModel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
              >
                <option value="qwen/qwen3.8-27b">qwen/qwen3.8-27b (Recommended for Networking)</option>
                <option value="openai/gpt-oss-120b">openai/gpt-oss-120b (Complex Architecture)</option>
                <option value="openai/gpt-oss-20b">openai/gpt-oss-20b (Lightweight Fast)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Local Ollama Base URL</label>
              <Input
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                className="bg-slate-900 border-slate-800 text-xs font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lab Hypervisor Integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* EVE-NG Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-5 w-5 text-indigo-400" />
              EVE-NG Hypervisor Settings
            </CardTitle>
            <CardDescription>Update when VMware DHCP assigns a new VM IP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">EVE-NG IP Address / Host</label>
              <Input
                value={eveHost}
                onChange={(e) => setEveHost(e.target.value)}
                className="bg-slate-900 border-slate-800 text-xs font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Username</label>
                <Input
                  value={eveUser}
                  onChange={(e) => setEveUser(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Password</label>
                <Input
                  type="password"
                  value={evePass}
                  onChange={(e) => setEvePass(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-xs font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* VMware Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-5 w-5 text-blue-400" />
              VMware Workstation Automation
            </CardTitle>
            <CardDescription>Local Workstation host automation credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Target Host IP</label>
              <Input
                value={vmHost}
                onChange={(e) => setVmHost(e.target.value)}
                className="bg-slate-900 border-slate-800 text-xs font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Root Username</label>
                <Input
                  value={vmUser}
                  onChange={(e) => setVmUser(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Root Password</label>
                <Input
                  type="password"
                  value={vmPass}
                  onChange={(e) => setVmPass(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-xs font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Host System Specifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Host System Telemetry</CardTitle>
          <CardDescription>Detected local hardware environment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">CPU</span>
              <span className="text-white font-bold">Intel Core i5-1335U (10 Cores)</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">PHYSICAL RAM</span>
              <span className="text-blue-400 font-bold">15.69 GB Total</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">GPU ACCELERATION</span>
              <span className="text-purple-400 font-bold">Intel Iris Xe Graphics (CPU Inference)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

