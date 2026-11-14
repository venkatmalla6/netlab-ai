import React, { useEffect, useState } from 'react'
import {
  History,
  GitCommit,
  ArrowRight,
  User,
  Clock,
  CheckCircle2,
  RotateCcw,
  Star,
  FileCode,
  ShieldAlert,
  Play,
  Terminal,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/services/api'

export const ConfigHistory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'snapshots' | 'audit'>('snapshots')
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSnapshot, setSelectedSnapshot] = useState<any | null>(null)
  const [rollbackResult, setRollbackResult] = useState<any | null>(null)
  const [isRollingBack, setIsRollingBack] = useState(false)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      apiClient.getConfigurations().catch(() => []),
      apiClient.api.get('/reports/audit-logs').then((r) => r.data).catch(() => []),
    ])
      .then(([cfgs, logs]) => {
        setSnapshots(cfgs || [])
        setEvents(logs || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRollback = async (configId: number) => {
    if (!confirm('Initiate automated configuration rollback on target device?')) return
    setIsRollingBack(true)
    try {
      const res = await apiClient.rollbackConfig(configId)
      setRollbackResult(res)
      loadData()
    } catch (err: any) {
      alert(`Rollback error: ${err.response?.data?.detail || err.message}`)
    } finally {
      setIsRollingBack(false)
    }
  }

  const handleMarkGolden = async (configId: number) => {
    try {
      await apiClient.markGoldenConfig(configId)
      alert('Snapshot successfully flagged as Golden Baseline Standard!')
      loadData()
    } catch (err: any) {
      alert(`Error setting golden baseline: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <History className="h-6 w-6 text-blue-400" />
            Configuration Governance, Golden Baselines & Rollback
          </h1>
          <p className="text-sm text-slate-400">
            Immutable version control, golden standard tagging, and 1-click emergency reverse patching.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
          <button
            onClick={() => setActiveTab('snapshots')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'snapshots'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Version Snapshots ({snapshots.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Audit Trail ({events.length})
          </button>
        </div>
      </div>

      {activeTab === 'snapshots' ? (
        <div className="space-y-4">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading version snapshots...</div>
          ) : snapshots.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center p-6 text-slate-500 border border-slate-800/60 rounded-xl bg-slate-950/20">
              <FileCode className="h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-400">No Saved Snapshots Yet</p>
              <p className="text-[11px] text-slate-600 mt-1 max-w-md">
                Configure devices or save candidate configurations to record version snapshots automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {snapshots.map((s) => {
                const isGolden = s.description?.includes('[GOLDEN BASELINE]')
                return (
                  <Card
                    key={s.id}
                    className={`p-5 space-y-4 bg-[#090d16] border ${
                      isGolden ? 'border-amber-500/50 shadow-amber-500/5' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={isGolden ? 'default' : 'outline'}
                          className={`font-mono text-xs ${isGolden ? 'bg-amber-500 text-black font-bold' : ''}`}
                        >
                          v{s.version}
                        </Badge>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-white">
                              Device #{s.device_id} Snapshot
                            </h3>
                            {isGolden && (
                              <span className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                Golden Standard
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Author: <span className="text-slate-300">{s.created_by || 'NETLAB Engine'}</span> •{' '}
                            {new Date(s.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkGolden(s.id)}
                          className="text-xs border-slate-800 text-slate-300 hover:text-amber-400 gap-1"
                        >
                          <Star className="h-3.5 w-3.5" />
                          Set Golden
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleRollback(s.id)}
                          disabled={isRollingBack}
                          className="text-xs bg-red-600 hover:bg-red-500 text-white gap-1"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Emergency Rollback
                        </Button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-300">{s.description || 'Automated configuration snapshot.'}</div>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 font-mono text-[11px] text-emerald-400 max-h-36 overflow-y-auto whitespace-pre-wrap">
                      {s.config_text}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* Audit Trail Timeline */
        <div className="space-y-4">
          {events.map((e) => (
            <Card key={e.id} className="p-4 bg-[#090d16] border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <GitCommit className="h-4 w-4 text-blue-400" />
                  <span className="font-semibold text-white text-xs">{e.action}</span>
                  <Badge variant="outline" className="text-[10px] font-mono text-slate-400 border-slate-800">
                    #{e.id}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{new Date(e.created_at).toLocaleString()}</span>
                  <span>•</span>
                  <span className="text-slate-300">Target: {e.entity_type} #{e.entity_id}</span>
                </div>
              </div>
              <p className="text-xs text-slate-300 font-mono">{e.details}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Rollback Result Modal */}
      {rollbackResult && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b101c] border border-red-600/50 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-red-400" />
                <h3 className="font-bold text-white text-sm">Rollback Synthesized Successfully</h3>
              </div>
              <Badge variant="destructive" className="text-xs">
                Target: Device #{rollbackResult.device_id} (v{rollbackResult.target_version})
              </Badge>
            </div>

            <p className="text-xs text-slate-300">{rollbackResult.message}</p>

            <div>
              <span className="text-xs text-slate-400 block mb-1 font-semibold">Synthesized Reverse Patch:</span>
              <div className="max-h-64 overflow-y-auto bg-slate-950 rounded-lg p-3 border border-slate-800 font-mono text-xs text-red-300 whitespace-pre-wrap">
                {rollbackResult.rollback_script}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button
                size="sm"
                onClick={() => setRollbackResult(null)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
