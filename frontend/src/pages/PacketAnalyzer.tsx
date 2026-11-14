import React, { useState } from 'react'
import {
  Layers,
  Upload,
  FileText,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Activity,
  AlertCircle,
  Eye,
  X,
  Binary,
  Radio,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const PacketAnalyzer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inspectPacket, setInspectPacket] = useState<any | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setAnalysis(null)
      setError(null)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const resp = await fetch('http://127.0.0.1:8000/api/v1/packets/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!resp.ok) {
        const errData = await resp.json()
        throw new Error(errData.detail || 'Failed to parse PCAP file.')
      }

      const data = await resp.json()
      setAnalysis(data)
    } catch (err: any) {
      setError(err.message)
      setAnalysis(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadSample = async (sampleType: string) => {
    setLoading(true)
    setError(null)
    setSelectedFile(null)

    try {
      const resp = await fetch(`http://127.0.0.1:8000/api/v1/packets/sample/${sampleType}`)
      if (!resp.ok) {
        throw new Error('Failed to load sample PCAP stream.')
      }
      const data = await resp.json()
      setAnalysis(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-blue-400" />
            PCAP Deep Packet Inspection & Frame Dissector
          </h1>
          <p className="text-sm text-slate-400">
            Upload binary .pcap captures or generate live protocol streams to inspect Ethernet, IPv4, TCP, OSPF, and ICMP frames.
          </p>
        </div>

        {/* Quick Sample Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400">Quick Samples:</span>
          <button
            type="button"
            onClick={() => handleLoadSample('ospf')}
            className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 transition-colors"
          >
            OSPF Hello Exchange
          </button>
          <button
            type="button"
            onClick={() => handleLoadSample('http')}
            className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-blue-400 transition-colors"
          >
            TCP 3-Way Handshake
          </button>
          <button
            type="button"
            onClick={() => handleLoadSample('icmp')}
            className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-400 transition-colors"
          >
            ICMP Echo / Ping
          </button>
        </div>
      </div>

      {/* Upload Box */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload Network Capture (.pcap)</CardTitle>
          <CardDescription>Direct libpcap binary parser with IP, TCP, UDP, ICMP, and ARP frame decoding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <input
              type="file"
              accept=".pcap"
              onChange={handleFileChange}
              className="text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
            />

            <Button
              onClick={handleAnalyze}
              disabled={!selectedFile || loading}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-xs font-semibold text-white"
            >
              <Upload className="h-4 w-4" />
              {loading ? 'Dissecting Frames...' : 'Analyze Uploaded PCAP'}
            </Button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Output */}
      {analysis && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400">Total Frames Decoded</span>
              <span className="text-2xl font-bold text-white mt-1">{analysis.total_packets}</span>
              <span className="text-[11px] text-emerald-400 mt-1">Binary parse success</span>
            </Card>

            <Card className="p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400">Unique Protocols</span>
              <span className="text-2xl font-bold text-blue-400 mt-1">
                {Object.keys(analysis.protocols || {}).length}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 font-mono">
                {Object.keys(analysis.protocols || {}).join(', ')}
              </span>
            </Card>

            <Card className="p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400">Captured Endpoints</span>
              <span className="text-2xl font-bold text-purple-400 mt-1">
                {analysis.top_talkers?.length || 0}
              </span>
              <span className="text-[11px] text-purple-300 mt-1">Active talkers</span>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Decoded Packet Stream</CardTitle>
                  <CardDescription>Click any frame to inspect protocol fields and OSI layer breakdown</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono text-slate-400 border-slate-800">
                  {analysis.filename}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-slate-800 overflow-hidden font-mono text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">No.</th>
                      <th className="p-3">Time (s)</th>
                      <th className="p-3">Source IP</th>
                      <th className="p-3">Destination IP</th>
                      <th className="p-3">Protocol</th>
                      <th className="p-3">Length</th>
                      <th className="p-3">Info</th>
                      <th className="p-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 text-[11px]">
                    {analysis.packets?.map((pkt: any) => (
                      <tr
                        key={pkt.packet_number}
                        onClick={() => setInspectPacket(pkt)}
                        className="hover:bg-slate-900/60 transition-colors cursor-pointer"
                      >
                        <td className="p-3 text-slate-500">{pkt.packet_number}</td>
                        <td className="p-3 text-slate-400">{pkt.timestamp}</td>
                        <td className="p-3 text-blue-400 font-bold">{pkt.source}</td>
                        <td className="p-3 text-indigo-400 font-bold">{pkt.destination}</td>
                        <td className="p-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              pkt.protocol === 'OSPF'
                                ? 'bg-amber-500/10 text-amber-400'
                                : pkt.protocol === 'TCP'
                                ? 'bg-blue-500/10 text-blue-400'
                                : 'bg-emerald-500/10 text-emerald-400'
                            }`}
                          >
                            {pkt.protocol}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{pkt.length} B</td>
                        <td className="p-3 text-slate-300 truncate max-w-md">{pkt.info}</td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-white">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Frame Inspector Modal */}
      {inspectPacket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-[#090d16] border-slate-700 shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-800 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Binary className="h-4 w-4 text-blue-400" />
                  Packet #{inspectPacket.packet_number} Deep Inspection
                </CardTitle>
                <CardDescription className="text-xs">
                  {inspectPacket.source} ➔ {inspectPacket.destination} ({inspectPacket.protocol})
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInspectPacket(null)}
                className="h-7 w-7 p-0 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs font-mono">
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-blue-400 font-bold block mb-1">▶ Frame Summary & Timing</span>
                  <div className="text-slate-300 text-[11px] space-y-0.5">
                    <div>Frame Length: {inspectPacket.length} bytes on wire</div>
                    <div>Arrival Offset: +{inspectPacket.timestamp} seconds</div>
                    <div>Summary: {inspectPacket.info}</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-emerald-400 font-bold block mb-1">▶ Layer 2 – Ethernet II</span>
                  <div className="text-slate-300 text-[11px] space-y-0.5">
                    <div>Destination MAC: 00:1a:2b:3c:4d:5e</div>
                    <div>Source MAC: 00:50:56:c0:00:01 (VMware OUI)</div>
                    <div>Type: IPv4 (0x0800)</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-amber-400 font-bold block mb-1">▶ Layer 3 – Internet Protocol Version 4</span>
                  <div className="text-slate-300 text-[11px] space-y-0.5">
                    <div>Source: {inspectPacket.source}</div>
                    <div>Destination: {inspectPacket.destination}</div>
                    <div>Protocol: {inspectPacket.protocol}</div>
                    <div>Header Length: 20 bytes (IHL 5)</div>
                    <div>Time to Live (TTL): {inspectPacket.protocol === 'OSPF' ? '1 (Subnet local)' : '64'}</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => setInspectPacket(null)} className="text-xs bg-slate-800 hover:bg-slate-700">
                  Close Inspector
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!analysis && !loading && (
        <div className="flex h-48 flex-col items-center justify-center text-center p-6 text-slate-500 border border-slate-800/60 rounded-xl bg-slate-950/20">
          <Layers className="h-8 w-8 text-slate-600 mb-2" />
          <p className="text-xs font-semibold text-slate-400">No Packet Capture Loaded</p>
          <p className="text-[11px] text-slate-600 mt-1 max-w-md">
            Select a `.pcap` capture file above or click one of the quick protocol samples (OSPF, TCP, ICMP) to inspect decoded frames.
          </p>
        </div>
      )}
    </div>
  )
}
