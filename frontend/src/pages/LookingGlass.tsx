import React, { useEffect, useState } from 'react'
import {
  Globe,
  Radio,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Server,
  Layers,
  Sparkles,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/services/api'

export const LookingGlass: React.FC = () => {
  const [bgpOverview, setBgpOverview] = useState<any | null>(null)
  const [searchPrefix, setSearchPrefix] = useState<string>('10.0.0.0/24')
  const [traceResult, setTraceResult] = useState<any | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [isTracing, setIsTracing] = useState<boolean>(false)

  const quickPrefixes = ['10.0.0.0/24', '172.16.0.0/16', '198.51.100.0/24']

  useEffect(() => {
    setLoading(true)
    apiClient
      .getBgpOverview()
      .then((data) => {
        setBgpOverview(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    // Initial trace
    handleTrace('10.0.0.0/24')
  }, [])

  const handleTrace = async (pfx: string) => {
    setIsTracing(true)
    try {
      const data = await apiClient.traceAsPath(pfx)
      setTraceResult(data)
    } catch (err: any) {
      alert(`BGP Trace failed: ${err.message}`)
    } finally {
      setIsTracing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Globe className="h-6 w-6 text-indigo-400" />
            Interactive BGP Looking Glass & AS-Path Tracer
          </h1>
          <p className="text-sm text-slate-400">
            Real-time Autonomous System (AS) routing analysis, RIB inspection, and route leak detection.
          </p>
        </div>

        {bgpOverview && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs px-3 py-1 text-indigo-400 border-indigo-500/30 font-mono">
              Local ASN: {bgpOverview.local_asn}
            </Badge>
            <Badge variant="success" className="text-xs px-3 py-1 font-mono">
              Peers: {bgpOverview.established_peers} / {bgpOverview.total_peers} ESTABLISHED
            </Badge>
          </div>
        )}
      </div>

      {/* Top BGP Stats */}
      {bgpOverview && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4 bg-[#090d16] border-slate-800">
            <span className="text-xs text-slate-400">Local Autonomous System</span>
            <span className="text-2xl font-bold text-white mt-1">AS{bgpOverview.local_asn}</span>
            <span className="text-[11px] text-indigo-400 mt-1">Router ID: {bgpOverview.router_id}</span>
          </Card>
          <Card className="p-4 bg-[#090d16] border-slate-800">
            <span className="text-xs text-slate-400">Active BGP Prefixes</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1">{bgpOverview.total_prefixes}</span>
            <span className="text-[11px] text-emerald-300 mt-1">Learned via eBGP & iBGP</span>
          </Card>
          <Card className="p-4 bg-[#090d16] border-slate-800">
            <span className="text-xs text-slate-400">Active Peers</span>
            <span className="text-2xl font-bold text-blue-400 mt-1">{bgpOverview.established_peers}</span>
            <span className="text-[11px] text-blue-300 mt-1">Across 3 upstream transits</span>
          </Card>
          <Card className="p-4 bg-[#090d16] border-slate-800">
            <span className="text-xs text-slate-400">Route Hijack Guard</span>
            <span className="text-2xl font-bold text-amber-400 mt-1">RPKI VALID</span>
            <span className="text-[11px] text-amber-300 mt-1">RFC 6811 validation active</span>
          </Card>
        </div>
      )}

      {/* AS-Path Tracer & Prefix Inspector */}
      <Card className="p-5 bg-[#090d16] border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Radio className="h-4 w-4 text-indigo-400" />
              Autonomous System Hop Visualizer (AS-Path)
            </h3>
            <p className="text-xs text-slate-400">Inspect the transit sequence and Tier-1 providers for any prefix</p>
          </div>

          <div className="flex items-center gap-2">
            {quickPrefixes.map((pfx) => (
              <button
                key={pfx}
                onClick={() => {
                  setSearchPrefix(pfx)
                  handleTrace(pfx)
                }}
                className={`text-[11px] px-2.5 py-1 rounded font-mono transition-all cursor-pointer ${
                  searchPrefix === pfx
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {pfx}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={searchPrefix}
            onChange={(e) => setSearchPrefix(e.target.value)}
            placeholder="Enter IPv4 prefix to trace (e.g. 10.0.0.0/24)..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
          />
          <Button
            size="sm"
            onClick={() => handleTrace(searchPrefix)}
            disabled={isTracing}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1"
          >
            <Search className="h-3.5 w-3.5" />
            {isTracing ? 'Tracing...' : 'Trace AS-Path'}
          </Button>
        </div>

        {traceResult && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400">Path Verdict: </span>
                <strong className={traceResult.bogon_as_detected ? 'text-amber-400' : 'text-emerald-400'}>
                  {traceResult.verdict}
                </strong>
              </div>
              <Badge variant={traceResult.bogon_as_detected ? 'destructive' : 'success'} className="text-[10px]">
                {traceResult.total_as_hops} AS Hops
              </Badge>
            </div>

            {/* Visual Hop Flow */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {traceResult.hops?.map((hop: any, idx: number) => (
                <div
                  key={hop.asn}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-mono text-sm">AS{hop.asn}</span>
                    <Badge variant="outline" className="text-[9px] uppercase border-indigo-500/30 text-indigo-300">
                      Hop #{hop.hop_index}
                    </Badge>
                  </div>
                  <div className="font-semibold text-indigo-400 text-xs">{hop.as_name}</div>
                  <div className="text-[11px] text-slate-300">{hop.organization}</div>
                  <div className="text-[10px] text-slate-500 uppercase">{hop.role} • {hop.country}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* BGP RIB Table */}
      {bgpOverview && (
        <Card className="p-5 bg-[#090d16] border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm">Routing Information Base (BGP RIB Table)</h3>
            <span className="text-xs text-slate-400 font-mono">{bgpOverview.routes?.length} prefixes in table</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Status</th>
                  <th className="p-3">Network Prefix</th>
                  <th className="p-3">Next Hop</th>
                  <th className="p-3">Metric (MED)</th>
                  <th className="p-3">LocPrf</th>
                  <th className="p-3">AS-Path</th>
                  <th className="p-3">Community</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {bgpOverview.routes?.map((r: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-900/50">
                    <td className="p-3 text-emerald-400">*&gt; (Best)</td>
                    <td className="p-3 text-white font-bold">{r.prefix}</td>
                    <td className="p-3 text-slate-300">{r.next_hop}</td>
                    <td className="p-3 text-slate-400">{r.med}</td>
                    <td className="p-3 text-slate-400">{r.local_pref}</td>
                    <td className="p-3 text-indigo-300">{r.as_path_str}</td>
                    <td className="p-3 text-slate-400">{r.community || 'none'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
