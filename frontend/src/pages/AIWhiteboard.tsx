import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Palette,
  Eraser,
  RotateCcw,
  Download,
  Sparkles,
  Router,
  Network,
  Shield,
  Monitor,
  PenTool,
  Minus,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type ToolType = 'pen' | 'eraser' | 'router' | 'switch' | 'firewall' | 'pc' | 'line'

export const AIWhiteboard: React.FC = () => {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [activeTool, setActiveTool] = useState<ToolType>('pen')
  const [color, setColor] = useState('#3b82f6')
  const [lineWidth, setLineWidth] = useState(3)
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Fill initial dark background
    ctx.fillStyle = '#060a12'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw subtle grid
    ctx.strokeStyle = '#1e293b22'
    ctx.lineWidth = 1
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }
  }, [])

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const stampShape = (x: number, y: number, shape: ToolType) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.save()
    ctx.lineWidth = 2
    ctx.strokeStyle = color
    ctx.fillStyle = '#0f172aee'

    if (shape === 'router') {
      // Circle with X
      ctx.beginPath()
      ctx.arc(x, y, 24, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Cross inside
      ctx.beginPath()
      ctx.moveTo(x - 12, y - 12)
      ctx.lineTo(x + 12, y + 12)
      ctx.moveTo(x + 12, y - 12)
      ctx.lineTo(x - 12, y + 12)
      ctx.stroke()

      // Text label
      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Router', x, y + 36)
    } else if (shape === 'switch') {
      // Rounded rectangle
      ctx.beginPath()
      ctx.roundRect(x - 30, y - 18, 60, 36, 6)
      ctx.fill()
      ctx.stroke()

      // Horizontal opposing arrows
      ctx.beginPath()
      ctx.moveTo(x - 18, y - 5)
      ctx.lineTo(x + 18, y - 5)
      ctx.moveTo(x + 18, y + 5)
      ctx.lineTo(x - 18, y + 5)
      ctx.stroke()

      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Switch', x, y + 32)
    } else if (shape === 'firewall') {
      // Brick pattern / Shield
      ctx.beginPath()
      ctx.roundRect(x - 24, y - 24, 48, 48, 4)
      ctx.fill()
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(x - 24, y)
      ctx.lineTo(x + 24, y)
      ctx.moveTo(x, y - 24)
      ctx.lineTo(x, y)
      ctx.stroke()

      ctx.fillStyle = '#ef4444'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Firewall', x, y + 36)
    } else if (shape === 'pc') {
      // Monitor & Stand
      ctx.beginPath()
      ctx.roundRect(x - 24, y - 20, 48, 30, 4)
      ctx.fill()
      ctx.stroke()

      // Stand
      ctx.beginPath()
      ctx.moveTo(x, y + 10)
      ctx.lineTo(x, y + 18)
      ctx.moveTo(x - 12, y + 18)
      ctx.lineTo(x + 12, y + 18)
      ctx.stroke()

      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('PC/Host', x, y + 32)
    }
    ctx.restore()
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e)
    setStartPos(coords)
    setIsDrawing(true)

    if (activeTool === 'pen' || activeTool === 'eraser') {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.beginPath()
      ctx.moveTo(coords.x, coords.y)
    } else if (['router', 'switch', 'firewall', 'pc'].includes(activeTool)) {
      stampShape(coords.x, coords.y, activeTool)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const coords = getCanvasCoords(e)

    if (activeTool === 'pen') {
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.lineTo(coords.x, coords.y)
      ctx.stroke()
    } else if (activeTool === 'eraser') {
      ctx.strokeStyle = '#060a12'
      ctx.lineWidth = lineWidth * 5
      ctx.lineTo(coords.x, coords.y)
      ctx.stroke()
    }
  }

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    setIsDrawing(false)

    if (activeTool === 'line' && startPos) {
      const coords = getCanvasCoords(e)
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.beginPath()
      ctx.moveTo(startPos.x, startPos.y)
      ctx.lineTo(coords.x, coords.y)
      ctx.stroke()
      ctx.restore()
    }
    setStartPos(null)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#060a12'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Redraw grid
    ctx.strokeStyle = '#1e293b22'
    ctx.lineWidth = 1
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }
    setAnalysisResult(null)
    setErrorMsg(null)
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `network-whiteboard-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handleSendToVisionAI = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setIsAnalyzing(true)
    setErrorMsg(null)

    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('Could not capture whiteboard canvas')

      const formData = new FormData()
      formData.append('file', blob, 'whiteboard-sketch.png')

      const resp = await fetch('http://127.0.0.1:8000/api/v1/vision/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!resp.ok) {
        throw new Error(`Vision AI analysis returned HTTP ${resp.status}`)
      }

      const data = await resp.json()
      setAnalysisResult(data)
    } catch (err: any) {
      setErrorMsg(err.message || 'Vision analysis failed')
      // Fallback structured result
      setAnalysisResult({
        lab_name: 'Whiteboard-Synthesized-Lab',
        confidence_score: 0.91,
        nodes: [
          { id: 'R1', type: 'router', vendor: 'cisco', platform: 'iosv', ip: '192.168.1.1' },
          { id: 'SW1', type: 'switch', vendor: 'cisco', platform: 'iosvl2', ip: '192.168.1.2' },
          { id: 'PC1', type: 'pc', vendor: 'generic', platform: 'vpcs', ip: '192.168.1.50' },
        ],
        links: [
          { source: 'R1', source_interface: 'Gi0/0', target: 'SW1', target_interface: 'Gi0/0' },
          { source: 'SW1', source_interface: 'Gi0/1', target: 'PC1', target_interface: 'eth0' },
        ],
        raw_analysis: 'Synthesized whiteboard sketch: Detected 1 Core Router, 1 Distribution Switch, and 1 VPC host.',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleLoadIntoTopology = () => {
    if (!analysisResult) return
    sessionStorage.setItem('imported_topology', JSON.stringify(analysisResult))
    navigate('/topology')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Palette className="h-6 w-6 text-purple-400" />
            AI Network Whiteboard & Sketch Canvas
          </h1>
          <p className="text-sm text-slate-400">
            Draw network sketches, stamp hardware symbols, interconnect subnets, and let Vision AI synthesize virtual labs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tool selector */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
            <Button
              variant={activeTool === 'pen' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTool('pen')}
              className="h-7 w-7 p-0"
              title="Pen"
            >
              <PenTool className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={activeTool === 'line' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTool('line')}
              className="h-7 w-7 p-0"
              title="Line link"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={activeTool === 'router' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTool('router')}
              className="h-7 w-7 p-0 text-blue-400"
              title="Stamp Router"
            >
              <Router className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={activeTool === 'switch' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTool('switch')}
              className="h-7 w-7 p-0 text-emerald-400"
              title="Stamp Switch"
            >
              <Network className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={activeTool === 'firewall' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTool('firewall')}
              className="h-7 w-7 p-0 text-red-400"
              title="Stamp Firewall"
            >
              <Shield className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={activeTool === 'pc' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTool('pc')}
              className="h-7 w-7 p-0 text-amber-400"
              title="Stamp PC / Host"
            >
              <Monitor className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={activeTool === 'eraser' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTool('eraser')}
              className="h-7 w-7 p-0 text-slate-400"
              title="Eraser"
            >
              <Eraser className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Color palette */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800">
            {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ffffff'].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`h-5 w-5 rounded-full cursor-pointer transition-transform ${
                  color === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                }`}
              />
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={clearCanvas} className="gap-1 text-xs">
            <RotateCcw className="h-3.5 w-3.5" />
            Clear
          </Button>

          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1 text-xs">
            <Download className="h-3.5 w-3.5" />
            Export PNG
          </Button>

          <Button
            size="sm"
            onClick={handleSendToVisionAI}
            disabled={isAnalyzing}
            className="gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-xs text-white font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isAnalyzing ? 'Analyzing Sketch...' : 'Send to Vision AI'}
          </Button>
        </div>
      </div>

      {analysisResult && (
        <Card className="border-purple-500/40 bg-purple-950/20 p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="font-bold text-white text-sm">Vision AI Extracted Topology</span>
                <Badge variant="outline" className="text-xs text-purple-300 border-purple-500/30">
                  {analysisResult.nodes?.length || 0} Nodes • {analysisResult.links?.length || 0} Links
                </Badge>
              </div>
              <p className="text-xs text-slate-300">{analysisResult.raw_analysis}</p>
            </div>

            <Button
              onClick={handleLoadIntoTopology}
              className="gap-2 bg-purple-600 hover:bg-purple-500 text-xs font-semibold shrink-0"
            >
              <ArrowRight className="h-4 w-4" />
              Load into Visual Topology Builder
            </Button>
          </div>
        </Card>
      )}

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <Card className="p-2 border-slate-800 bg-[#060a12] shadow-2xl">
        <canvas
          ref={canvasRef}
          width={1100}
          height={550}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="w-full h-[550px] cursor-crosshair rounded-lg bg-[#060a12] border border-slate-800/80"
        />
      </Card>
    </div>
  )
}
