import React, { useEffect, useState } from 'react'
import { History, GitCommit, ArrowRight, User, Clock, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/services/api'

export const ConfigHistory: React.FC = () => {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    apiClient.api
      .get('/reports/audit-logs')
      .then((res) => setEvents(res.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <History className="h-6 w-6 text-blue-400" />
            Configuration Audit History & Diffs
          </h1>
          <p className="text-sm text-slate-400">
            Immutable timeline of configuration events and execution actions stored in the database.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading audit history...</div>
        ) : events.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-center p-6 text-slate-500 border border-slate-800/60 rounded-xl bg-slate-950/20">
            <History className="h-8 w-8 text-slate-600 mb-2" />
            <p className="text-xs font-semibold text-slate-400">No Configuration Audit Logs Yet</p>
            <p className="text-[11px] text-slate-600 mt-1 max-w-md">
              Whenever you execute commands or update devices, the operations will be cryptographically tracked here in real-time.
            </p>
          </div>
        ) : (
          events.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <GitCommit className="h-4 w-4 text-blue-400" />
                  <span className="font-semibold text-white text-xs">{e.action}</span>
                  <Badge variant="outline" className="text-[10px] font-mono text-slate-400 border-slate-800">
                    ID #{e.id}
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
          ))
        )}
      </div>
    </div>
  )
}
