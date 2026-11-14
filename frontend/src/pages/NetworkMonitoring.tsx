import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  Monitor,
  Terminal,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/services/api'

export const NetworkMonitoring: React.FC = () => {
  const navigate = useNavigate()
  const [data, setData] = useState<any>({
    total_monitored: 0,
    online_count: 0,
    offline_count: 0,
    avg_cpu: 0.0,
    avg_memory: 0.0,
    alerts_count: 0,
    devices: [],
  })
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchOverview = () => {
    setLoading(true)
    Promise.all([
      apiClient.getMonitoringOverview(),
      fetch('http://127.0.0.1:8000/api/v1/monitoring/alerts')
        .then((r) => r.json())
        .catch(() => ({ alerts: [] })),
    ])
      .then(([overview, alertsData]) => {
        setData(overview)
        setAlerts(alertsData.alerts || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchOverview()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchOverview, 10000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-400" />
            Real-Time Network Telemetry & Monitoring
          </h1>
          <p className="text-sm text-slate-400">
            Live telemetry polling, device state, and interface operational status from registered elements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="text-xs gap-1.5"
          >
            <span className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            {autoRefresh ? 'Auto-Polling (10s)' : 'Auto-Poll: Off'}
          </Button>

          <Button variant="outline" size="sm" onClick={fetchOverview} disabled={loading} className="gap-1.5 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Poll Telemetry
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-400">Monitored Elements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.total_monitored} Nodes</div>
            <p className="text-xs text-slate-400 mt-1">In local database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-400">Online Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{data.online_count}</div>
            <p className="text-xs text-slate-400 mt-1">Operational state</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-400">Offline Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{data.offline_count}</div>
            <p className="text-xs text-slate-400 mt-1">Standby or stopped</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-400">Telemetry Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{alerts.length || data.alerts_count}</div>
            <p className="text-xs text-slate-400 mt-1">Active warnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts Feed */}
      {alerts.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-950/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <span className="font-bold text-sm text-white">Active Telemetry Warnings ({alerts.length})</span>
          </div>
          <div className="space-y-2">
            {alerts.map((alert: any) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-2.5 rounded bg-slate-900 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2">
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : 'warning'} className="text-[9px]">
                    {alert.severity}
                  </Badge>
                  <span className="text-slate-300">{alert.message}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/terminal?device_id=${alert.device_id}`)}
                  className="h-6 text-[10px] gap-1 text-slate-300"
                >
                  <Terminal className="h-3 w-3" />
                  Investigate CLI
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Device Telemetry Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Device Telemetry & Operational State</CardTitle>
          <CardDescription>Live state polled from registered database elements</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Querying telemetry endpoints...</div>
          ) : data.devices.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center p-6 text-slate-500 border border-slate-800/60 rounded-xl bg-slate-950/20">
              <Monitor className="h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-400">No Devices Currently Monitored</p>
              <p className="text-[11px] text-slate-600 mt-1 max-w-md">
                Register devices in Device Inventory or deploy a topology in Topology Builder to view live telemetry counters.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.devices.map((dev: any) => (
                <div
                  key={dev.device_id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/60 gap-4 transition-colors hover:border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center font-bold text-sm">
                      {dev.device_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-white flex items-center gap-2">
                        {dev.device_name}
                        <Badge
                          variant={dev.status === 'running' || dev.status === 'online' ? 'success' : 'secondary'}
                          className="text-[9px] uppercase"
                        >
                          {dev.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Interfaces: <span className="text-emerald-400 font-semibold">{dev.interfaces_up} UP</span>,{' '}
                        <span className="text-slate-500">{dev.interfaces_down} DOWN</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 block text-[10px]">PACKET LOSS</span>
                      <span className={`font-bold ${dev.packet_loss_percent > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {dev.packet_loss_percent}%
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/terminal?device_id=${dev.device_id}`)}
                      className="gap-1.5 text-xs text-blue-400 hover:text-blue-300"
                    >
                      <Terminal className="h-3.5 w-3.5" />
                      VTY Terminal
                    </Button>
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
