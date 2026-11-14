import React, { useEffect, useState } from 'react'
import { FileText, Download, Copy, Check, Sparkles, Network, RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/services/api'

export const NetworkDocumentation: React.FC = () => {
  const [docContent, setDocContent] = useState<string>('')
  const [labs, setLabs] = useState<any[]>([])
  const [selectedLabId, setSelectedLabId] = useState<number>(1)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isEnriching, setIsEnriching] = useState(false)

  const fetchDoc = (labId: number) => {
    setLoading(true)
    apiClient.api
      .get(`/reports/documentation/${labId}`)
      .then((res) => {
        setDocContent(res.data?.markdown_content || '')
      })
      .catch(() => {
        setDocContent('# No Lab Found\nCreate a lab in EVE-NG or Topology Builder to generate real documentation.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    apiClient
      .getTopologies()
      .then((topos) => {
        setLabs(topos || [])
        if (topos && topos.length > 0) {
          setSelectedLabId(topos[0].id)
          fetchDoc(topos[0].id)
        } else {
          fetchDoc(1)
        }
      })
      .catch(() => fetchDoc(1))
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(docContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([docContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `network_architecture_documentation_lab_${selectedLabId}.md`
    a.click()
  }

  const handleEnrichWithAI = async () => {
    if (!docContent || isEnriching) return
    setIsEnriching(true)

    const prompt = `You are a Principal Enterprise Network Architect. Review this generated network architecture specification:

${docContent}

Please add two comprehensive sections at the bottom:
## 4. High Availability & Failure Domain Analysis
- Single points of failure, redundancy analysis (HSRP/VRRP, ECMP, port-channels).
## 5. Security & Capacity Planning Recommendations
- Hardening baselines, MTU considerations, and future IP subnet scalability.

Return the complete Markdown document.`

    try {
      const res = await apiClient.sendChat(prompt)
      if (res.message) {
        setDocContent(res.message)
      }
    } catch (err: any) {
      alert(`AI enrichment failed: ${err.message}`)
    } finally {
      setIsEnriching(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-400" />
            Automated Network Architecture Documentation
          </h1>
          <p className="text-sm text-slate-400">
            Real-time Markdown architecture specifications generated directly from database topologies, devices, and interfaces.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {labs.length > 0 && (
            <select
              value={selectedLabId}
              onChange={(e) => {
                const id = Number(e.target.value)
                setSelectedLabId(id)
                fetchDoc(id)
              }}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            >
              {labs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleEnrichWithAI}
            disabled={isEnriching || loading}
            className="gap-1.5 text-xs text-purple-300 border-purple-500/30 hover:bg-purple-950/30"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            {isEnriching ? 'Synthesizing HA Analysis...' : 'Enrich with AI Insights'}
          </Button>

          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 text-xs text-slate-300">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy Markdown'}
          </Button>

          <Button size="sm" onClick={handleDownload} className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-xs text-white">
            <Download className="h-3.5 w-3.5" />
            Export Document (.md)
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Generating live documentation from database records...
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
              {docContent}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
