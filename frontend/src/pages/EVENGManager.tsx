import React, { useEffect, useState } from 'react'
import {
  Server,
  Play,
  Square,
  RefreshCw,
  FolderPlus,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Plus,
  Layers,
  Activity,
  Cpu,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/services/api'

export const EVENGManager: React.FC = () => {
  const [eveHost, setEveHost] = useState('')
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('eve')
  const [connected, setConnected] = useState<boolean | null>(null)
  const [labs, setLabs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [actionStatus, setActionStatus] = useState<string | null>(null)

  // New Lab Modal
  const [showNewLabModal, setShowNewLabModal] = useState(false)
  const [newLabName, setNewLabName] = useState('')
  const [isCreatingLab, setIsCreatingLab] = useState(false)

  const checkStatusAndFetchLabs = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const status = await apiClient.getEVEStatus()
      setConnected(status.available)
      if (status.host && status.host !== 'Not configured') {
        setEveHost(status.host)
      }

      if (status.available) {
        const labsData = await apiClient.getEVELabs()
        const rawLabs = labsData?.labs || labsData || []
        setLabs(Array.isArray(rawLabs) ? rawLabs : Object.values(rawLabs))
      } else {
        setLabs([])
      }
    } catch (err: any) {
      setConnected(false)
      setErrorMessage(err.response?.data?.detail || err.message)
      setLabs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkStatusAndFetchLabs()
  }, [])

  const handleUpdateAndConnect = async () => {
    if (!eveHost.trim()) {
      alert('Please enter your EVE-NG VM IP address.')
      return
    }
    setLoading(true)
    setErrorMessage(null)
    try {
      const resp = await apiClient.updateEVEConfig({
        host: eveHost.trim(),
        username: username.trim(),
        password: password.trim(),
      })
      setConnected(resp.available)
      if (resp.available) {
        await apiClient.api.post('/eve-ng/login')
        await checkStatusAndFetchLabs()
      } else {
        setErrorMessage(`Host saved, but EVE-NG at ${eveHost} is not reachable over port 80. Ensure the VM is powered on.`)
        setLoading(false)
      }
    } catch (err: any) {
      setConnected(false)
      setErrorMessage(`Failed to reach EVE-NG at ${eveHost}: ${err.message}`)
      setLoading(false)
    }
  }

  const handleStartAll = async (labName: string) => {
    setActionStatus(`Starting all nodes in ${labName}...`)
    try {
      const resp = await apiClient.startALLNodes(labName)
      setActionStatus(resp.message || `Nodes started for ${labName}`)
      setTimeout(() => setActionStatus(null), 3500)
    } catch (err: any) {
      setActionStatus(`Error starting nodes: ${err.message}`)
      setTimeout(() => setActionStatus(null), 4000)
    }
  }

  const handleStopAll = async (labName: string) => {
    setActionStatus(`Stopping all nodes in ${labName}...`)
    try {
      const resp = await apiClient.stopALLNodes(labName)
      setActionStatus(resp.message || `Nodes stopped for ${labName}`)
      setTimeout(() => setActionStatus(null), 3500)
    } catch (err: any) {
      setActionStatus(`Error stopping nodes: ${err.message}`)
      setTimeout(() => setActionStatus(null), 4000)
    }
  }

  const handleCreateLab = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLabName.trim()) return
    setIsCreatingLab(true)
    try {
      await apiClient.api.post('/eve-ng/labs', {
        name: newLabName.trim(),
        nodes: [],
        edges: [],
      })
      setShowNewLabModal(false)
      setNewLabName('')
      await checkStatusAndFetchLabs()
      setActionStatus(`Lab '${newLabName}' created successfully.`)
      setTimeout(() => setActionStatus(null), 3000)
    } catch (err: any) {
      alert(`Error creating lab: ${err.message}`)
    } finally {
      setIsCreatingLab(false)
    }
  }

  const getLabWebUrl = (lab: any) => {
    if (!eveHost) return '#'
    const path = lab.path || (lab.file ? `/${lab.file}` : `/${lab.name}.unl`)
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    const encodedPath = cleanPath
      .split('/')
      .map((seg: string) => encodeURIComponent(seg))
      .join('/')
    return `http://${eveHost}/legacy${encodedPath}/topology`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Server className="h-6 w-6 text-blue-400" />
            EVE-NG Community Lab Orchestrator
          </h1>
          <p className="text-sm text-slate-400">
            Real REST API interface to your virtualized EVE-NG network hypervisor with automated provisioning.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewLabModal(true)}
            className="gap-1.5 text-xs text-slate-200 border-slate-800 hover:border-blue-500"
          >
            <Plus className="h-3.5 w-3.5 text-blue-400" />
            New Lab
          </Button>
          <Button variant="outline" size="sm" onClick={checkStatusAndFetchLabs} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          {eveHost && (
            <a href={`http://${eveHost}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs text-indigo-300 border-slate-800 hover:border-indigo-500">
                <ExternalLink className="h-3.5 w-3.5" />
                EVE-NG Portal
              </Button>
            </a>
          )}
        </div>
      </div>

      {actionStatus && (
        <div className="p-3 rounded-xl border border-blue-800/60 bg-blue-950/30 text-blue-300 text-xs flex items-center gap-2">
          <Activity className="h-4 w-4 animate-spin shrink-0 text-blue-400" />
          <span>{actionStatus}</span>
        </div>
      )}

      {/* Dynamic IP & Connection Card */}
      <Card className="bg-[#090d16] border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-white">EVE-NG VM Connection Settings</CardTitle>
            <Badge
              variant={connected === true ? 'success' : connected === false ? 'destructive' : 'secondary'}
              className="text-xs font-mono"
            >
              {connected === true ? 'ONLINE & CONNECTED' : connected === false ? 'OFFLINE / UNREACHABLE' : 'CHECKING...'}
            </Badge>
          </div>
          <CardDescription className="text-slate-400">
            Whenever VMware restarts and DHCP assigns a new IP address to your EVE-NG VM, update the host address here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">EVE-NG IP Address / Host</label>
              <Input
                value={eveHost}
                onChange={(e) => setEveHost(e.target.value)}
                placeholder="e.g. 192.168.126.128"
                className="bg-slate-900 border-slate-800 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Web UI Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-slate-900 border-slate-800 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Web UI Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-900 border-slate-800 text-xs font-mono"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleUpdateAndConnect}
                disabled={loading}
                className="w-full gap-1.5 bg-blue-600 hover:bg-blue-500 text-xs text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {loading ? 'Validating...' : 'Connect & Save'}
              </Button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lab List */}
      <Card className="bg-[#090d16] border-slate-800">
        <CardHeader>
          <CardTitle className="text-base text-white">Active Virtual Labs in Hypervisor</CardTitle>
          <CardDescription className="text-slate-400">
            Real labs deployed and available inside your EVE-NG instance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Querying EVE-NG REST endpoint...</div>
          ) : !connected ? (
            <div className="flex h-48 flex-col items-center justify-center text-center p-6 text-slate-500 border border-slate-800/60 rounded-xl bg-slate-950/20">
              <Server className="h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-400">EVE-NG Is Currently Offline</p>
              <p className="text-[11px] text-slate-600 mt-1 max-w-md">
                Ensure your EVE-NG virtual machine is powered on in VMware Workstation. Any topologies deployed from the Topology Builder will remain cached and automatically sync upon VM boot.
              </p>
            </div>
          ) : labs.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center p-6 text-slate-500 border border-slate-800/60 rounded-xl bg-slate-950/20">
              <FolderPlus className="h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-400">No Labs Currently Found in EVE-NG</p>
              <p className="text-[11px] text-slate-600 mt-1 max-w-md">
                Click &apos;New Lab&apos; above or use the Topology Builder to visually construct and deploy your network topology.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {labs.map((lab: any, idx: number) => {
                const labName = lab.name || lab.filename || `Lab-${idx + 1}`
                return (
                  <div
                    key={lab.id || labName}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/60 gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center">
                        <Server className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-white flex items-center gap-2">
                          {labName}
                          <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30">
                            UNL ACTIVE
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 font-mono">
                          Path: {lab.path || '/'} • Version: {lab.version || '1'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartAll(labName)}
                        className="gap-1.5 text-xs text-emerald-400 border-slate-800 hover:border-emerald-500 hover:bg-emerald-950/20"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" /> Start All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStopAll(labName)}
                        className="gap-1.5 text-xs text-red-400 border-slate-800 hover:border-red-500 hover:bg-red-950/20"
                      >
                        <Square className="h-3.5 w-3.5 fill-current" /> Stop All
                      </Button>
                      {eveHost && (
                        <a
                          href={getLabWebUrl(lab)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Open ${labName} in EVE-NG Web Console`}
                        >
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs text-blue-300 border-slate-800 hover:border-blue-500 hover:bg-blue-950/20">
                            <ExternalLink className="h-3.5 w-3.5" /> Web Console
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Lab Modal */}
      {showNewLabModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b101c] border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Create New EVE-NG Lab</h3>
              <button
                onClick={() => setShowNewLabModal(false)}
                className="text-xs text-slate-500 hover:text-white"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateLab} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Lab Name</label>
                <Input
                  value={newLabName}
                  onChange={(e) => setNewLabName(e.target.value)}
                  placeholder="e.g. Enterprise-BGP-Core"
                  className="bg-slate-900 border-slate-800"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewLabModal(false)}
                  className="text-xs text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreatingLab || !newLabName.trim()}
                  className="text-xs bg-blue-600 hover:bg-blue-500 text-white"
                >
                  {isCreatingLab ? 'Creating...' : 'Create Lab'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
