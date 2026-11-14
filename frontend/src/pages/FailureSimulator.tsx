import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertOctagon,
  Zap,
  Play,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  ShieldAlert,
  Terminal,
  Wrench,
  Cpu,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/services/api'

export const FailureSimulator: React.FC = () => {
  const navigate = useNavigate()
  const [selectedFailure, setSelectedFailure] = useState('ospf-mtu')
  const [injected, setInjected] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [devices, setDevices] = useState<any[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null)
  const [actionLog, setActionLog] = useState<any | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const scenarios = [
    {
      id: 'ospf-mtu',
      title: 'OSPF MTU Mismatch',
      difficulty: 'Intermediate',
      description: 'Changes interface MTU to 1400 on the selected router while neighbor remains at 1500, causing DBD drops.',
      hint: 'Run "show ip ospf neighbor" and inspect MTUs with "show ip interface GigabitEthernet0/0".',
      fault_commands: ['interface GigabitEthernet0/0', 'ip mtu 1400'],
      restore_commands: ['interface GigabitEthernet0/0', 'no ip mtu'],
    },
    {
      id: 'vlan-mismatch',
      title: 'VLAN Trunk Native Mismatch',
      difficulty: 'Beginner',
      description: 'Sets Native VLAN 99 on trunk port, triggering CDP native VLAN mismatch warnings and spanning-tree blocks.',
      hint: 'Inspect switchport trunk native vlan on both ends with "show interfaces trunk".',
      fault_commands: ['interface GigabitEthernet0/1', 'switchport trunk native vlan 99'],
      restore_commands: ['interface GigabitEthernet0/1', 'switchport trunk native vlan 1'],
    },
    {
      id: 'acl-block',
      title: 'ACL Dropping VTY / SSH Access',
      difficulty: 'Intermediate',
      description: 'Applies access-class 101 blocking TCP port 22 on VTY terminal lines.',
      hint: 'Check "show access-lists" and "show running-config | section line vty".',
      fault_commands: [
        'ip access-list extended BLOCK_SSH',
        'deny tcp any any eq 22',
        'permit ip any any',
        'line vty 0 4',
        'access-class BLOCK_SSH in',
      ],
      restore_commands: ['line vty 0 4', 'no access-class BLOCK_SSH in', 'no ip access-list extended BLOCK_SSH'],
    },
    {
      id: 'bgp-as-error',
      title: 'BGP Neighbor Remote-AS Misconfiguration',
      difficulty: 'Advanced',
      description: 'Misconfigures neighbor remote-as to 65099 instead of 65002, preventing BGP OPEN negotiation.',
      hint: 'Inspect "show ip bgp summary" and check the configured neighbor remote-as number.',
      fault_commands: ['router bgp 65001', 'no neighbor 10.0.0.2', 'neighbor 10.0.0.2 remote-as 65099'],
      restore_commands: ['router bgp 65001', 'no neighbor 10.0.0.2', 'neighbor 10.0.0.2 remote-as 65002'],
    },
  ]

  useEffect(() => {
    apiClient
      .getDevices()
      .then((devs) => {
        setDevices(devs || [])
        if (devs && devs.length > 0) {
          setSelectedDeviceId(devs[0].id)
        }
      })
      .catch(() => {})
  }, [])

  const currentScenario = scenarios.find((s) => s.id === selectedFailure)

  const handleInject = async () => {
    if (!currentScenario) return
    setIsProcessing(true)
    setActionLog(null)

    const devId = selectedDeviceId || (devices.length > 0 ? devices[0].id : 1)

    try {
      const res = await apiClient.executeCommands({
        device_id: devId,
        commands: currentScenario.fault_commands,
        mode: 'autonomous',
        confirmed: true,
      })
      setActionLog(res)
      setInjected(true)
      setShowHint(false)
    } catch (err: any) {
      alert(`Fault injection error: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReset = async () => {
    if (!currentScenario) return
    setIsProcessing(true)
    setActionLog(null)

    const devId = selectedDeviceId || (devices.length > 0 ? devices[0].id : 1)

    try {
      const res = await apiClient.executeCommands({
        device_id: devId,
        commands: currentScenario.restore_commands,
        mode: 'autonomous',
        confirmed: true,
      })
      setActionLog(res)
      setInjected(false)
      setShowHint(false)
    } catch (err: any) {
      alert(`Recovery error: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <AlertOctagon className="h-6 w-6 text-red-400" />
            Network Failure Simulator & Break-Fix Arena
          </h1>
          <p className="text-sm text-slate-400">
            Inject controlled, realistic networking faults into your live virtual lab devices to test diagnostic and remediation capabilities.
          </p>
        </div>

        {devices.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Target Lab Device:</span>
            <select
              value={selectedDeviceId || ''}
              onChange={(e) => setSelectedDeviceId(Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.management_ip || 'No IP'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scenario Selection */}
        <Card className="space-y-2">
          <CardHeader>
            <CardTitle className="text-base">Break-Fix Scenarios</CardTitle>
            <CardDescription>Select a controlled fault scenario to inject</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {scenarios.map((sc) => (
              <button
                key={sc.id}
                onClick={() => {
                  setSelectedFailure(sc.id)
                  setInjected(false)
                  setShowHint(false)
                  setActionLog(null)
                }}
                className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                  selectedFailure === sc.id
                    ? 'border-red-500 bg-red-950/20 text-white font-semibold'
                    : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">{sc.title}</span>
                  <Badge variant="outline" className="text-[9px] uppercase border-slate-700">
                    {sc.difficulty}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400 font-normal leading-relaxed">{sc.description}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Fault Injection Panel */}
        {currentScenario && (
          <Card className="lg:col-span-2 flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-white font-bold">{currentScenario.title}</CardTitle>
                <Badge variant={injected ? 'destructive' : 'secondary'} className="text-xs uppercase">
                  {injected ? 'FAULT ACTIVE IN LIVE LAB' : 'STANDBY (HEALTHY)'}
                </Badge>
              </div>
              <CardDescription>{currentScenario.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 space-y-2">
                <span className="font-semibold text-white block">Engineer Mission:</span>
                <p>
                  1. Target Node: <strong className="text-blue-400">{selectedDevice?.name || 'Device'}</strong> ({selectedDevice?.management_ip || '192.168.1.1'}).<br />
                  2. Launch the Device Terminal or AI Diagnostics to observe protocol degradation.<br />
                  3. Use CLI show/debug commands to pinpoint the failure mechanism.<br />
                  4. Apply corrective configuration or click "Restore Working Baseline".
                </p>
              </div>

              {showHint && (
                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-200">
                  <strong className="block mb-0.5 text-white">Troubleshooting Hint:</strong>
                  {currentScenario.hint}
                </div>
              )}

              {/* Action Log Banner */}
              {actionLog && (
                <div className="rounded-xl bg-black/80 border border-slate-800 p-3 space-y-2 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-xs font-semibold text-white">
                    <span>Execution on {actionLog.device_name}:</span>
                    <Badge variant={injected ? 'destructive' : 'success'} className="text-[10px]">
                      {injected ? 'FAULT INJECTED' : 'RESTORED'}
                    </Badge>
                  </div>
                  {actionLog.results?.map((res: any, idx: number) => (
                    <div key={idx} className="text-slate-400">
                      <span className="text-emerald-400">$ {res.command}</span>
                      <pre className="text-[10px] text-slate-500 mt-0.5">{res.output}</pre>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHint(!showHint)}
                    className="gap-1.5 text-xs text-slate-300"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    {showHint ? 'Hide Diagnostic Hint' : 'Request Diagnostic Hint'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/terminal?device_id=${selectedDeviceId}`)}
                    className="gap-1.5 text-xs text-blue-400"
                  >
                    <Terminal className="h-3.5 w-3.5" />
                    Open VTY Terminal
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(
                        `/troubleshooting?problem=${encodeURIComponent(
                          `Failure simulated on ${selectedDevice?.name || 'Device'}: ${currentScenario.title}. ${currentScenario.description}`
                        )}`
                      )
                    }
                    className="gap-1.5 text-xs text-amber-400"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    AI Troubleshoot
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {injected ? (
                    <Button
                      onClick={handleReset}
                      disabled={isProcessing}
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-semibold"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {isProcessing ? 'Restoring...' : 'Restore Working Baseline'}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleInject}
                      disabled={isProcessing}
                      className="gap-1.5 bg-red-600 hover:bg-red-500 text-xs text-white font-semibold"
                    >
                      <Zap className="h-3.5 w-3.5 fill-current" />
                      {isProcessing ? 'Injecting Fault...' : 'Inject Fault into Live Lab'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
