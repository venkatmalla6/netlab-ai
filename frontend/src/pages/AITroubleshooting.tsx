import React, { useState, useEffect } from 'react'
import {
  Wrench,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Play,
  ShieldAlert,
  Cpu,
  Terminal,
  Server,
  RefreshCw,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/services/api'

export const AITroubleshooting: React.FC = () => {
  const [problem, setProblem] = useState('')
  const [devices, setDevices] = useState<any[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null)
  const [isDiagnosing, setIsDiagnosing] = useState(false)
  const [report, setReport] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [executionResult, setExecutionResult] = useState<any | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)

  const quickSymptoms = [
    'OSPF adjacency stuck in INIT state on Gi0/0',
    'BGP session stuck in Active state with peer 10.0.0.2',
    '802.1Q Native VLAN mismatch between SW1 and SW2',
    'Default gateway unreachable from Host-PC1',
    'ACL blocking transit HTTPS traffic to Web Server',
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

  const handleDiagnose = async () => {
    if (!problem.trim()) return
    setIsDiagnosing(true)
    setExecutionResult(null)
    setErrorMessage(null)

    try {
      const res = await apiClient.runDiagnostics(problem)
      setReport(res)
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || err.message)
      setReport(null)
    } finally {
      setIsDiagnosing(false)
    }
  }

  const handleApplyFix = async (commands: string[]) => {
    if (!commands || commands.length === 0) return
    setIsExecuting(true)
    setExecutionResult(null)

    try {
      const devId = selectedDeviceId || (devices.length > 0 ? devices[0].id : 1)
      const res = await apiClient.executeCommands({
        device_id: devId,
        commands,
        mode: 'autonomous',
        confirmed: true,
      })
      setExecutionResult(res)
    } catch (err: any) {
      alert(`Error executing fix: ${err.message}`)
    } finally {
      setIsExecuting(false)
    }
  }

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Wrench className="h-6 w-6 text-amber-400" />
            AI Network Troubleshooting & Root Cause Analysis
          </h1>
          <p className="text-sm text-slate-400">
            Autonomous multi-layer network failure diagnosis and 1-click remediation using Groq Qwen AI inference.
          </p>
        </div>

        {devices.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Target Device:</span>
            <select
              value={selectedDeviceId || ''}
              onChange={(e) => setSelectedDeviceId(Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Network Failure or Symptom</CardTitle>
          <CardDescription>
            Enter symptoms in plain English, or pick a standard enterprise troubleshooting scenario:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick chips */}
          <div className="flex flex-wrap gap-1.5">
            {quickSymptoms.map((symptom, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setProblem(symptom)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
              >
                {symptom}
              </button>
            ))}
          </div>

          <textarea
            rows={3}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-mono"
            placeholder="e.g. PC1 cannot ping default gateway, OSPF neighbor stuck in 2-WAY state, BGP peer down..."
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Evaluated against Cisco IOS, Linux iproute2, and RFC specifications.
            </span>

            <Button
              onClick={handleDiagnose}
              disabled={isDiagnosing || !problem.trim()}
              className="gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 text-xs font-semibold text-white"
            >
              <Sparkles className="h-4 w-4" />
              {isDiagnosing ? 'Running AI Diagnostics...' : 'Diagnose Issue with AI'}
            </Button>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execution Results Banner if fix was applied */}
      {executionResult && (
        <Card className="border-emerald-500/40 bg-emerald-950/20 shadow-2xl p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span className="font-bold text-white text-sm">
                  Remediation Deployed to {executionResult.device_name}
                </span>
                <Badge variant="success" className="text-[10px]">
                  Mode: {executionResult.mode}
                </Badge>
              </div>
              <span className="text-xs text-emerald-400 font-mono">
                {executionResult.results?.length || 0} Commands Executed
              </span>
            </div>

            <div className="rounded-lg bg-black/80 border border-slate-800 p-3 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto space-y-2">
              {executionResult.results?.map((res: any, idx: number) => (
                <div key={idx} className="border-b border-slate-800/60 pb-1.5 last:border-0 last:pb-0">
                  <div className="text-emerald-400 font-bold">$ {res.command}</div>
                  <pre className="text-slate-400 whitespace-pre-wrap text-[10px] mt-0.5">{res.output}</pre>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {report && (
        <Card className="border-amber-500/30 bg-slate-900/90 shadow-2xl">
          <CardHeader className="border-b border-slate-800 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <CardTitle className="text-base text-white">{report.summary}</CardTitle>
              </div>
              <Badge variant="warning" className="text-xs">
                Confidence: {Math.round(report.confidence * 100)}%
              </Badge>
            </div>
            <CardDescription className="text-amber-300/80 font-mono text-xs mt-1">
              {report.root_cause}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6 text-xs">
            <div>
              <h4 className="font-semibold text-white uppercase text-[11px] mb-2 tracking-wider">
                Engineering Explanation
              </h4>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 leading-relaxed whitespace-pre-wrap">
                {report.ai_explanation}
              </div>
            </div>

            {report.findings && report.findings.length > 0 && (
              <div>
                <h4 className="font-semibold text-white uppercase text-[11px] mb-2 tracking-wider">
                  Identified Findings & Recommended CLI Actions
                </h4>
                <div className="space-y-3">
                  {report.findings.map((finding: any, i: number) => (
                    <div key={i} className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{finding.component}</span>
                        <Badge variant="destructive" className="text-[10px] uppercase">
                          {finding.severity}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-xs">{finding.issue}</p>
                      <div className="p-2.5 rounded bg-slate-900 font-mono text-[11px] text-blue-300 border border-slate-800/80">
                        Evidence: {finding.evidence}
                      </div>

                      {finding.fix_commands && finding.fix_commands.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-800">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-semibold text-white text-[11px]">
                              Remediation CLI for {selectedDevice?.name || 'Device'}:
                            </span>
                            <Button
                              size="sm"
                              onClick={() => handleApplyFix(finding.fix_commands)}
                              disabled={isExecuting}
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
                            >
                              <Play className="h-3 w-3" />
                              {isExecuting ? 'Deploying...' : 'Execute Remediation Fix'}
                            </Button>
                          </div>
                          <pre className="p-3 rounded bg-black/60 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                            {finding.fix_commands.join('\n')}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
