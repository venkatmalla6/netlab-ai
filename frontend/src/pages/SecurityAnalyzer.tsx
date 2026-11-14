import React, { useState, useEffect } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Key,
  Server,
  Terminal,
  AlertCircle,
  Play,
  Download,
  RefreshCw,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/services/api'

export const SecurityAnalyzer: React.FC = () => {
  const [configText, setConfigText] = useState('')
  const [devices, setDevices] = useState<any[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null)
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remediationLog, setRemediationLog] = useState<any | null>(null)
  const [isRemediating, setIsRemediating] = useState(false)

  const sampleScenarios = [
    {
      name: 'Insecure Management & Plaintext Secrets',
      config: `hostname R1-Insecure
!
enable password cisco
service password-encryption
!
username admin password cisco
!
line vty 0 4
 transport input telnet
 login local
!
snmp-server community public RO
snmp-server community private RW
!
router ospf 1
 network 192.168.1.0 0.0.0.255 area 0
!
end`,
    },
    {
      name: 'Unauthenticated Routing & Open HTTP Server',
      config: `hostname SW1-Distribution
!
ip http server
ip http authentication local
!
router ospf 10
 router-id 1.1.1.1
 network 10.0.0.0 0.0.0.3 area 0
!
line vty 0 15
 transport input all
 login
!
end`,
    },
    {
      name: 'Hardened CIS Cisco IOS Benchmark',
      config: `hostname Core-Router-Hardened
!
service password-encryption
enable secret 9 $9$vD7b1...
!
username secadmin privilege 15 secret 9 $9$kLm8...
!
ip ssh version 2
ip ssh time-out 60
ip ssh authentication-retries 3
!
no ip http server
no ip http secure-server
!
banner motd ^
*** AUTHORIZED ACCESS ONLY - ALL ACTIVITIES MONITORED ***
^
!
line vty 0 4
 transport input ssh
 exec-timeout 10 0
 login local
!
router ospf 1
 area 0 authentication message-digest
!
interface GigabitEthernet0/0
 ip ospf message-digest-key 1 md5 CiscoSecPass123!
!
end`,
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

  const handleLoadDeviceConfig = async () => {
    if (!selectedDeviceId) return
    try {
      const dev = await apiClient.getDevice(selectedDeviceId)
      if (dev && dev.config) {
        setConfigText(dev.config)
      } else {
        setConfigText(
          `hostname ${dev?.name || 'Device'}\n!\ninterface GigabitEthernet0/0\n ip address ${dev?.management_ip || '192.168.1.1'} 255.255.255.0\n no shutdown\n!\nline vty 0 4\n transport input telnet\n login\n!\nend`
        )
      }
    } catch {
      alert('Could not fetch device configuration from database.')
    }
  }

  const handleAudit = async () => {
    if (!configText.trim()) return
    setLoading(true)
    setError(null)
    setRemediationLog(null)

    try {
      const resp = await apiClient.api.post('/security/audit', {
        config_text: configText,
        device_id: selectedDeviceId,
      })
      setReport(resp.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message)
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFix = async (commandSnippet: string) => {
    if (!commandSnippet) return
    setIsRemediating(true)
    setRemediationLog(null)

    const commands = commandSnippet.split('\n').map((c) => c.trim()).filter(Boolean)
    const devId = selectedDeviceId || (devices.length > 0 ? devices[0].id : 1)

    try {
      const res = await apiClient.executeCommands({
        device_id: devId,
        commands,
        mode: 'autonomous',
        confirmed: true,
      })
      setRemediationLog(res)
    } catch (err: any) {
      alert(`Hardening command failed: ${err.message}`)
    } finally {
      setIsRemediating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-400" />
            Network Security & Hardening Analyzer
          </h1>
          <p className="text-sm text-slate-400">
            Audit Cisco IOS device configurations against CIS benchmarks, NIST guidelines, and 1-click apply hardening scripts.
          </p>
        </div>

        {devices.length > 0 && (
          <div className="flex items-center gap-2">
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
            <Button variant="outline" size="sm" onClick={handleLoadDeviceConfig} className="text-xs">
              Load From DB
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Paste Device Configuration or Choose Benchmark Scenario</CardTitle>
              <CardDescription>
                Audits Telnet/SSH, password encryption, OSPF/BGP authentication, default SNMP community strings, and MOTD banners.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sampleScenarios.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setConfigText(s.config)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            rows={8}
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            placeholder="Paste Cisco running-config text here (e.g. line vty 0 4, transport input telnet, service password-encryption...)"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-400 focus:outline-none focus:border-red-500"
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Evaluates management plane, control plane, and data plane security vulnerabilities.
            </span>

            <Button
              onClick={handleAudit}
              disabled={loading || !configText.trim()}
              className="gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-xs font-semibold text-white"
            >
              <ShieldCheck className="h-4 w-4" />
              {loading ? 'Auditing Configuration...' : 'Run Security Audit'}
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

      {/* Remediation Log Banner if hardening was applied */}
      {remediationLog && (
        <Card className="border-emerald-500/40 bg-emerald-950/20 shadow-2xl p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span className="font-bold text-white text-sm">
                  Hardening Deployed to {remediationLog.device_name}
                </span>
                <Badge variant="success" className="text-[10px]">
                  Mode: {remediationLog.mode}
                </Badge>
              </div>
              <span className="text-xs text-emerald-400 font-mono">
                {remediationLog.results?.length || 0} Commands Executed
              </span>
            </div>

            <div className="rounded-lg bg-black/80 border border-slate-800 p-3 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto space-y-2">
              {remediationLog.results?.map((res: any, idx: number) => (
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400">Overall Security Score</span>
              <span
                className={`text-3xl font-extrabold mt-1 ${
                  report.overall_score >= 80 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {report.overall_score} / 100
              </span>
              <span className="text-[11px] text-slate-400 mt-1">Risk Level: {report.risk_level}</span>
            </Card>

            <Card className="p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400">Security Findings</span>
              <span className="text-3xl font-extrabold text-red-400 mt-1">{report.total_issues} Issues</span>
              <span className="text-[11px] text-red-300 mt-1">Requires hardening</span>
            </Card>

            <Card className="p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400">Passed Checks</span>
              <span className="text-3xl font-extrabold text-emerald-400 mt-1">
                {report.passed_checks?.length || 0}
              </span>
              <span className="text-[11px] text-emerald-300 mt-1">Compliant controls</span>
            </Card>
          </div>

          {report.issues && report.issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Identified Security Issues</CardTitle>
                <CardDescription>Actionable findings extracted from provided configuration text</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.issues.map((issue: any) => (
                  <div key={issue.rule_id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{issue.title}</span>
                        <span className="font-mono text-[10px] text-slate-400">({issue.rule_id})</span>
                      </div>
                      <Badge variant={issue.severity === 'high' ? 'destructive' : 'warning'} className="text-[10px] uppercase">
                        {issue.severity}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-300">{issue.description}</p>
                    <p className="text-xs text-slate-400">
                      <strong className="text-slate-200">Recommendation:</strong> {issue.recommendation}
                    </p>

                    {issue.remediation_command && (
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-semibold uppercase text-slate-400">
                            Remediation Hardening CLI
                          </span>
                          <Button
                            size="sm"
                            onClick={() => handleApplyFix(issue.remediation_command)}
                            disabled={isRemediating}
                            className="h-6 text-[10px] bg-red-600 hover:bg-red-500 text-white gap-1"
                          >
                            <Play className="h-3 w-3" />
                            {isRemediating ? 'Applying...' : 'Apply Hardening Fix'}
                          </Button>
                        </div>
                        <pre className="p-2.5 rounded bg-black/60 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                          {issue.remediation_command}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {report.passed_checks && report.passed_checks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Passed Compliance Checks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 text-xs text-slate-300">
                  {report.passed_checks.map((p: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!report && !loading && (
        <div className="flex h-48 flex-col items-center justify-center text-center p-6 text-slate-500 border border-slate-800/60 rounded-xl bg-slate-950/20">
          <ShieldAlert className="h-8 w-8 text-slate-600 mb-2" />
          <p className="text-xs font-semibold text-slate-400">No Configuration Audited Yet</p>
          <p className="text-[11px] text-slate-600 mt-1 max-w-md">
            Paste a device configuration above or choose a benchmark scenario to audit compliance against security baselines.
          </p>
        </div>
      )}
    </div>
  )
}
