import React, { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Terminal as TerminalIcon, Play, RefreshCw, Layers, ShieldCheck, Copy, Check, Sparkles, Wifi, WifiOff } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/services/api'

interface DeviceOption {
  id: number
  name: string
  vendor: string
  platform: string
  management_ip: string
  device_type?: string
}

export const DeviceTerminal: React.FC = () => {
  const [searchParams] = useSearchParams()
  const targetDeviceQuery = searchParams.get('device')

  const [devices, setDevices] = useState<DeviceOption[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<number>(1)
  const [device, setDevice] = useState<string>('Router-1')
  const [history, setHistory] = useState<string[]>([
    'NETLAB AI Device Terminal Console v2.1.0 (Phase 8 WebSocket Engine)',
    'Real-time execution shell connected to local SQLite device engine & automation adapter.',
    'Available quick commands: show ip int brief | show ip route | show run | show version | ping <ip>',
    '',
  ])
  const [currentPrompt, setCurrentPrompt] = useState<string>('Router-1#')
  const [cmdInput, setCmdInput] = useState<string>('')
  const [isExecuting, setIsExecuting] = useState<boolean>(false)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyPointer, setHistoryPointer] = useState<number>(-1)
  const [useWebSocket, setUseWebSocket] = useState<boolean>(true)
  const [wsConnected, setWsConnected] = useState<boolean>(false)
  const wsRef = useRef<WebSocket | null>(null)
  const terminalEndRef = useRef<HTMLDivElement>(null)

  // Initialize WebSocket connection
  useEffect(() => {
    if (!useWebSocket) {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setWsConnected(false)
      return
    }

    const host = window.location.hostname === 'localhost' ? '127.0.0.1:8000' : window.location.host
    const wsUrl = `ws://${host}/api/v1/executions/ws/terminal/${selectedDeviceId}`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setWsConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'banner') {
            setHistory((prev) => [...prev, msg.banner])
            if (msg.prompt) setCurrentPrompt(msg.prompt)
          } else if (msg.type === 'output') {
            if (msg.command) {
              // Command echoed
            }
            if (msg.output) {
              setHistory((prev) => [...prev, msg.output])
            }
            if (msg.prompt) {
              setCurrentPrompt(msg.prompt)
            }
          }
        } catch {
          setHistory((prev) => [...prev, event.data])
        }
      }

      ws.onclose = () => {
        setWsConnected(false)
      }

      ws.onerror = () => {
        setWsConnected(false)
      }

      return () => {
        ws.close()
      }
    } catch {
      setWsConnected(false)
    }
  }, [selectedDeviceId, useWebSocket])

  useEffect(() => {
    apiClient
      .getDevices()
      .then((data: DeviceOption[]) => {
        if (data && data.length > 0) {
          setDevices(data)

          // Check if specific device requested in URL
          const match = targetDeviceQuery
            ? data.find((d) => d.name.toLowerCase() === targetDeviceQuery.toLowerCase() || d.id.toString() === targetDeviceQuery)
            : null

          const active = match || data[0]
          setSelectedDeviceId(active.id)
          setDevice(active.name)
          setCurrentPrompt(`${active.name}#`)
        }
      })
      .catch(() => {})
  }, [targetDeviceQuery])

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  const executeCommandString = async (cmdToRun: string) => {
    const cmd = cmdToRun.trim()
    if (!cmd || isExecuting) return

    if (cmd === 'clear') {
      setHistory([])
      setCmdInput('')
      return
    }

    // Add to command history buffer
    setCommandHistory((prev) => [...prev, cmd])
    setHistoryPointer(-1)

    // Echo command in history
    setHistory((prev) => [...prev, `${currentPrompt} ${cmd}`])
    setCmdInput('')

    // If WebSocket is open and connected, send directly over WS stream
    if (useWebSocket && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(cmd)
      return
    }

    // Fallback to HTTP execution
    setIsExecuting(true)
    try {
      const resp = await apiClient.executeCommands({
        device_id: selectedDeviceId,
        commands: [cmd],
        mode: 'assisted',
        confirmed: true,
      })

      const outputText = resp.results?.[0]?.output || resp.explanation || 'Command accepted.'
      setHistory((prev) => [...prev, outputText])
    } catch (err: any) {
      setHistory((prev) => [
        ...prev,
        `% Error executing command: ${err.response?.data?.detail || err.message}`,
      ])
    } finally {
      setIsExecuting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommandString(cmdInput)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length === 0) return
      const nextPointer = historyPointer === -1 ? commandHistory.length - 1 : Math.max(0, historyPointer - 1)
      setHistoryPointer(nextPointer)
      setCmdInput(commandHistory[nextPointer])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyPointer === -1) return
      const nextPointer = historyPointer + 1
      if (nextPointer >= commandHistory.length) {
        setHistoryPointer(-1)
        setCmdInput('')
      } else {
        setHistoryPointer(nextPointer)
        setCmdInput(commandHistory[nextPointer])
      }
    }
  }

  const switchDevice = (devId: number) => {
    setSelectedDeviceId(devId)
    const active = devices.find((d) => d.id === devId)
    if (active) {
      setDevice(active.name)
      setCurrentPrompt(`${active.name}#`)
      setHistory((prev) => [
        ...prev,
        `Switching session to ${active.name} (${active.management_ip})...`,
      ])
    }
  }

  const quickCommands = [
    'show ip int brief',
    'show ip route',
    'show run',
    'show version',
    'conf t',
    'ping 10.0.0.1',
    '?',
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <TerminalIcon className="h-6 w-6 text-emerald-400" />
            Interactive Device Terminal Console
          </h1>
          <p className="text-sm text-slate-400">
            Real CLI session with stateful prompts ({currentPrompt}), live execution, and WebSocket streaming.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {devices.length > 0 ? (
            <select
              value={selectedDeviceId}
              onChange={(e) => switchDevice(parseInt(e.target.value, 10))}
              className="bg-[#090d16] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.vendor.toUpperCase()} {d.platform || d.device_type} - {d.management_ip})
                </option>
              ))}
            </select>
          ) : (
            <Badge variant="outline" className="text-xs text-slate-400">
              Target: {device}
            </Badge>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setUseWebSocket(!useWebSocket)}
            className="text-xs border-slate-800 text-slate-300 gap-1.5"
          >
            {wsConnected ? <Wifi className="h-3.5 w-3.5 text-emerald-400" /> : <WifiOff className="h-3.5 w-3.5 text-slate-500" />}
            {wsConnected ? 'WebSocket Live' : 'HTTP Mode'}
          </Button>

          <Badge variant={wsConnected ? 'success' : 'outline'} className="text-xs font-mono">
            {wsConnected ? 'LIVE STREAM' : 'REST ACTIVE'}
          </Badge>
        </div>
      </div>

      {/* Quick Macro Commands Bar */}
      <div className="flex items-center gap-2 overflow-x-auto py-1">
        <span className="text-[11px] text-slate-500 font-medium shrink-0 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-emerald-400" /> Quick Macros:
        </span>
        {quickCommands.map((qc) => (
          <button
            key={qc}
            onClick={() => executeCommandString(qc)}
            disabled={isExecuting}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 hover:text-white hover:border-emerald-500/60 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            {qc}
          </button>
        ))}
      </div>

      <Card className="border-slate-800 bg-[#040810] shadow-2xl overflow-hidden">
        <CardHeader className="py-2.5 px-4 bg-[#090e1a] border-b border-slate-800/80 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500/80" />
            <div className="h-3 w-3 rounded-full bg-amber-500/80" />
            <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
            <span className="font-mono text-xs text-slate-400 ml-2">
              vty://admin@{device} [{wsConnected ? 'WebSocket: Connected' : 'HTTP Mode'}]
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistory([])}
            className="h-6 px-2 text-[10px] text-slate-400 hover:text-white"
          >
            Clear Screen
          </Button>
        </CardHeader>

        <CardContent className="p-4 font-mono text-xs min-h-[460px] max-h-[560px] overflow-y-auto space-y-1.5 bg-[#02050a] text-slate-200">
          {history.map((line, i) => (
            <div
              key={i}
              className={`whitespace-pre-wrap leading-relaxed ${
                line.includes('#') || line.includes('>')
                  ? 'text-emerald-400 font-bold'
                  : line.startsWith('%')
                  ? 'text-red-400'
                  : 'text-slate-300'
              }`}
            >
              {line}
            </div>
          ))}

          {/* Interactive command prompt input line */}
          <div className="flex items-center gap-2 pt-1 text-emerald-400">
            <span className="shrink-0 font-bold select-none">{currentPrompt}</span>
            <input
              type="text"
              value={cmdInput}
              onChange={(e) => setCmdInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isExecuting}
              placeholder="Type command and press Enter (e.g. conf t, show ip int brief)..."
              autoFocus
              className="flex-1 bg-transparent border-none outline-none text-emerald-400 font-mono text-xs placeholder:text-slate-600 focus:ring-0"
            />
          </div>
          <div ref={terminalEndRef} />
        </CardContent>
      </Card>
    </div>
  )
}
