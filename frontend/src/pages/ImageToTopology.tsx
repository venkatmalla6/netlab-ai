import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Layers,
  Network,
  Cpu,
  FileText,
  Router,
  Server,
  Monitor,
  Plus,
  Trash2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/services/api'

export const ImageToTopology: React.FC = () => {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      setFile(selected)
      setPreview(URL.createObjectURL(selected))
      setResult(null)
      setErrorMessage(null)
    }
  }

  const getNodeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'router':
        return <Router className="h-3.5 w-3.5 text-blue-400" />
      case 'switch':
        return <Network className="h-3.5 w-3.5 text-emerald-400" />
      case 'server':
        return <Server className="h-3.5 w-3.5 text-purple-400" />
      default:
        return <Monitor className="h-3.5 w-3.5 text-amber-400" />
    }
  }

  const handleAnalyze = async () => {
    if (!file) return
    setIsAnalyzing(true)
    setErrorMessage(null)
    setAnalysisStatus('Uploading diagram to Multimodal Vision AI...')

    try {
      const formData = new FormData()
      formData.append('file', file)

      setAnalysisStatus('Vision AI extracting routers, switches, subnets, links, and ACL requirements...')
      const resp = await apiClient.api.post('/vision/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000,
      })

      if (resp.data) {
        setResult(resp.data)
        setAnalysisStatus(null)
      } else {
        throw new Error('Analysis failed')
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || err.message || 'Vision AI analysis failed')
      setAnalysisStatus(null)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-400" />
          Image-to-Topology Recognition
        </h1>
        <p className="text-sm text-slate-400">
          Upload any network architecture diagram, whiteboard sketch, or Packet Tracer screenshot to automatically
          convert it into an executable EVE-NG virtual topology.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Upload Box */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base">Upload Network Diagram</CardTitle>
            <CardDescription>Supported formats: PNG, JPG, JPEG, WEBP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/40 p-8 text-center transition-colors hover:border-blue-500/50">
              {preview ? (
                <div className="space-y-3">
                  <img
                    src={preview}
                    alt="Uploaded diagram preview"
                    className="max-h-64 rounded-lg object-contain border border-slate-800 shadow"
                  />
                  <div className="text-xs text-slate-400 font-mono truncate">{file?.name}</div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Click or drag & drop diagram</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Visio, Draw.io, or camera photo</p>
                  </div>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={!file || isAnalyzing}
              className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-xs font-semibold"
            >
              <Sparkles className="h-4 w-4" />
              {isAnalyzing ? (analysisStatus || 'Extracting Topology with Vision AI...') : 'Analyze & Extract Topology'}
            </Button>

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Extracted Topology Output */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Structured Extraction</CardTitle>
              {result && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs text-blue-400 border-blue-500/30">
                    {result.nodes?.length || 0} Devices • {result.links?.length || 0} Links
                  </Badge>
                  <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">
                    Confidence: {Math.round((result.confidence_score || 0.85) * 100)}%
                  </Badge>
                </div>
              )}
            </div>
            <CardDescription>Detected nodes, subnets, and interface interconnections</CardDescription>
          </CardHeader>

          <CardContent className="flex-1 space-y-4">
            {!result ? (
              <div className="flex h-64 flex-col items-center justify-center text-center text-slate-500 border border-slate-800/60 rounded-xl bg-slate-950/20 p-6">
                <Network className="h-10 w-10 text-slate-600 mb-2" />
                <p className="text-xs font-medium">No diagram analyzed yet.</p>
                <p className="text-[11px] text-slate-600">
                  Upload an image on the left and run analysis to inspect detected devices.
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                  <span className="font-semibold text-white block mb-1">Architecture Summary</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-line">{result.raw_analysis}</p>
                </div>

                {result.acl_requirements && result.acl_requirements.length > 0 && (
                  <div className="rounded-lg bg-blue-950/20 p-3 border border-blue-900/40">
                    <span className="font-semibold text-blue-300 flex items-center gap-1.5 mb-1.5">
                      <ShieldCheck className="h-4 w-4 text-blue-400" />
                      Extracted ACL & Configuration Requirements ({result.acl_requirements.length})
                    </span>
                    <ul className="space-y-1">
                      {result.acl_requirements.map((req: string, idx: number) => (
                        <li key={idx} className="text-[11px] text-slate-300 font-mono flex items-start gap-1.5">
                          <span className="text-blue-400">›</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <span className="font-semibold text-white block mb-1.5">Detected Devices ({result.nodes?.length || 0})</span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {result.nodes?.map((node: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800/80"
                      >
                        <div className="flex items-center gap-2">
                          {getNodeIcon(node.type)}
                          <span className="font-bold text-white">{node.id || node.name}</span>
                          <span className="text-[10px] text-slate-400 uppercase">({node.type || 'device'})</span>
                        </div>
                        <span className="font-mono text-[10px] text-emerald-400">{node.ip || 'DHCP/Dynamic'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="font-semibold text-white block mb-1.5">Detected Links ({result.links?.length || 0})</span>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1 font-mono text-[11px] text-slate-300">
                    {result.links?.map((link: any, idx: number) => (
                      <div key={idx} className="p-1.5 rounded bg-slate-900/60 border border-slate-800/60 flex items-center justify-between">
                        <span>{link.source}:{link.source_interface || 'Gi0/0'}</span>
                        <span className="text-blue-400 text-xs">⟷</span>
                        <span>{link.target}:{link.target_interface || 'Gi0/0'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => {
                    sessionStorage.setItem('imported_topology', JSON.stringify(result))
                    navigate('/topology')
                  }}
                  className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-xs font-semibold py-2.5"
                >
                  <ArrowRight className="h-4 w-4" />
                  Load into Visual Topology Builder ({result.nodes?.length || 0} Devices)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

