import React, { useEffect, useState } from 'react'
import { Cpu, Power, RefreshCw, HardDrive, Server, ShieldCheck, Activity, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/services/api'

export const VMwareManager: React.FC = () => {
  const [vmwareHost, setVmwareHost] = useState('127.0.0.1')
  const [username, setUsername] = useState('root')
  const [password, setPassword] = useState('eve')
  const [vms, setVms] = useState<any[]>([])
  const [connected, setConnected] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  const checkStatus = async () => {
    setLoading(true)
    try {
      const res = await apiClient.api.get('/vmware/status').then((r) => r.data)
      setConnected(res.available)
      if (res.available) {
        const vmsRes = await apiClient.api.get('/vmware/vms').then((r) => r.data)
        setVms(vmsRes?.vms || (Array.isArray(vmsRes) ? vmsRes : []))
      } else {
        setVms([])
      }
    } catch {
      setConnected(false)
      setVms([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkStatus()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Cpu className="h-6 w-6 text-blue-400" />
            VMware Workstation Hypervisor Manager
          </h1>
          <p className="text-sm text-slate-400">
            Control local VMware Workstation virtual machines, resource allocation, and guest IP mapping.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={checkStatus} className="gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          Poll VMware Host
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Host Integration Settings</CardTitle>
            <Badge
              variant={connected === true ? 'success' : connected === false ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {connected === true ? 'Service Active' : 'Disconnected / vmrun Service Offline'}
            </Badge>
          </div>
          <CardDescription>VMware Workstation REST API / vmrun automation credentials</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Host Target</label>
              <Input
                value={vmwareHost}
                onChange={(e) => setVmwareHost(e.target.value)}
                className="bg-slate-900 border-slate-800 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Auth Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-slate-900 border-slate-800 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Auth Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-900 border-slate-800 text-xs font-mono"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={checkStatus} className="w-full gap-1.5 bg-blue-600 hover:bg-blue-500 text-xs">
                Save & Connect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Virtual Machines Inventory</CardTitle>
          <CardDescription>Live instances detected via VMware Workstation API</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Scanning VMware Workstation instances...</div>
          ) : !connected ? (
            <div className="flex h-48 flex-col items-center justify-center text-center p-6 text-slate-500 border border-slate-800/60 rounded-xl bg-slate-950/20">
              <Cpu className="h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-400">VMware Host Offline</p>
              <p className="text-[11px] text-slate-600 mt-1 max-w-md">
                VMware Workstation REST API service is not currently responding on {vmwareHost}. Start VMware Workstation and the VMware REST API service (`vmrest`) to inspect live VMs.
              </p>
            </div>
          ) : vms.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center p-6 text-slate-500 border border-slate-800/60 rounded-xl bg-slate-950/20">
              <Server className="h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-400">No Virtual Machines Found</p>
              <p className="text-[11px] text-slate-600 mt-1 max-w-md">
                Ensure your virtual machines are registered in VMware Workstation.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {vms.map((vm) => (
                <div
                  key={vm.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/60 gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center">
                      <Server className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-white">{vm.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Status: {vm.status || 'Active'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
