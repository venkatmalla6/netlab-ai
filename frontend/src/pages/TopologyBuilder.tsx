import React, { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Handle,
  Position,
} from '@xyflow/react'
import type { Node, Edge, OnNodesChange, OnEdgesChange, OnConnect } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Router,
  Network,
  Shield,
  Monitor,
  Server,
  Cloud,
  Save,
  Play,
  RotateCcw,
  CheckCircle2,
  Trash2,
  PlusCircle,
  Terminal,
  Sliders,
  ExternalLink,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/services/api'

interface CustomDeviceData {
  label: string
  type: string
  vendor?: string
  platform?: string
  ip?: string
  interfaces?: string[]
}

// Custom Node for Network Devices with multiple connection ports
const DeviceNode = ({ data, selected }: any) => {
  const getIcon = () => {
    switch (data.type) {
      case 'router':
        return <Router className="h-5 w-5 text-blue-400" />
      case 'switch':
        return <Network className="h-5 w-5 text-emerald-400" />
      case 'firewall':
        return <Shield className="h-5 w-5 text-red-400" />
      case 'server':
        return <Server className="h-5 w-5 text-purple-400" />
      case 'cloud':
        return <Cloud className="h-5 w-5 text-cyan-400" />
      default:
        return <Monitor className="h-5 w-5 text-amber-400" />
    }
  }

  return (
    <div
      className={`rounded-xl border px-4 py-3 bg-[#0d1322]/95 text-white shadow-xl backdrop-blur-md min-w-[150px] transition-all ${
        selected
          ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-blue-500/20'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 !bg-blue-500 !border-slate-900" />
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-slate-800/80 p-2 border border-slate-700/60 shadow-inner">
          {getIcon()}
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-xs text-white tracking-wide">{data.label}</span>
          <span className="text-[10px] text-slate-400 font-mono uppercase">{data.type} • {data.platform || 'IOSv'}</span>
          {data.ip && <span className="text-[9px] text-blue-400 font-mono mt-0.5">{data.ip}</span>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 !bg-blue-500 !border-slate-900" />
    </div>
  )
}

const nodeTypes = {
  deviceNode: DeviceNode,
}

export const TopologyBuilder: React.FC = () => {
  const navigate = useNavigate()
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [labName, setLabName] = useState('Enterprise-Campus-Topology')
  const [savedTopologies, setSavedTopologies] = useState<any[]>([])
  const [isDeploying, setIsDeploying] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [statusNotification, setStatusNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [deploymentResult, setDeploymentResult] = useState<any | null>(null)

  useEffect(() => {
    // 1. Check if a topology was imported via Vision AI or AI Whiteboard
    const importedRaw = sessionStorage.getItem('imported_topology')
    if (importedRaw) {
      try {
        const imported = JSON.parse(importedRaw)
        sessionStorage.removeItem('imported_topology')

        if (imported.nodes && imported.nodes.length > 0) {
          const flowNodes: Node[] = imported.nodes.map((n: any, idx: number) => ({
            id: n.id || `node-${idx + 1}`,
            type: 'deviceNode',
            position: n.position || {
              x: 100 + (idx % 3) * 280,
              y: 100 + Math.floor(idx / 3) * 180,
            },
            data: {
              label: n.id || n.name || `Device-${idx + 1}`,
              type: n.type || 'router',
              platform: n.platform || (n.type === 'switch' ? 'IOSvL2' : 'IOSv'),
              ip: n.ip || `192.168.1.${10 + idx}`,
            },
          }))

          const flowEdges: Edge[] = (imported.links || []).map((l: any, idx: number) => ({
            id: `imported-edge-${idx}`,
            source: l.source,
            target: l.target,
            label: `${l.source_interface || 'Gi0/0'} <-> ${l.target_interface || 'Gi0/0'}`,
            labelStyle: { fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
            labelBgStyle: { fill: '#0f172a', stroke: '#334155', rx: 4, ry: 4 },
            style: { stroke: '#3b82f6', strokeWidth: 2 },
          }))

          setNodes(flowNodes)
          setEdges(flowEdges)
          if (imported.lab_name) {
            setLabName(imported.lab_name.replace(/\s+/g, '-'))
          }
          setStatusNotification({
            message: `Successfully imported ${flowNodes.length} devices from Vision AI diagram analysis!`,
            type: 'success',
          })
          return
        }
      } catch (err) {
        console.error('Failed to parse imported topology:', err)
      }
    }

    // 2. Otherwise fetch saved topologies from database
    apiClient
      .getTopologies()
      .then((topos) => {
        setSavedTopologies(topos || [])
        if (topos && topos.length > 0) {
          try {
            const parsed = JSON.parse(topos[0].topology_json)
            if (parsed.nodes && parsed.nodes.length > 0) setNodes(parsed.nodes)
            if (parsed.edges && parsed.edges.length > 0) setEdges(parsed.edges)
            setLabName(topos[0].name)
          } catch {}
        }
      })
      .catch(() => {})
  }, [])

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  )
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  )

  const onConnect: OnConnect = useCallback(
    (connection) => {
      const sourceCount = edges.filter((e) => e.source === connection.source).length
      const targetCount = edges.filter((e) => e.target === connection.target).length
      const label = `Gi0/${sourceCount} <-> Gi0/${targetCount}`

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            label,
            labelStyle: { fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
            labelBgStyle: { fill: '#0f172a', stroke: '#334155', rx: 4, ry: 4 },
            style: { stroke: '#3b82f6', strokeWidth: 2 },
          },
          eds
        )
      )
    },
    [edges]
  )

  const addDevice = (type: string, prefix: string, platform: string = 'IOSv') => {
    const count = nodes.filter((n) => n.data.type === type).length + 1
    const id = `${prefix}${count}`
    const newNode: Node = {
      id,
      type: 'deviceNode',
      position: { x: 180 + (nodes.length % 4) * 110, y: 100 + Math.floor(nodes.length / 4) * 100 },
      data: {
        label: id,
        type,
        vendor: 'cisco',
        platform,
        ip: type === 'router' ? `10.0.${nodes.length}.1/24` : (type === 'pc' ? `192.168.1.${10 + nodes.length}/24` : ''),
      },
    }
    setNodes((nds) => [...nds, newNode])
  }

  const loadTemplate = (templateName: string) => {
    if (templateName === 'router-on-a-stick') {
      const tNodes: Node[] = [
        { id: 'R1', type: 'deviceNode', position: { x: 300, y: 80 }, data: { label: 'R1-Core', type: 'router', vendor: 'cisco', platform: 'IOSv', ip: '192.168.10.1/24' } },
        { id: 'SW1', type: 'deviceNode', position: { x: 300, y: 220 }, data: { label: 'SW1-Distribution', type: 'switch', vendor: 'cisco', platform: 'IOSvL2', ip: '192.168.1.2/24' } },
        { id: 'PC1', type: 'deviceNode', position: { x: 160, y: 360 }, data: { label: 'PC1-VLAN10', type: 'pc', vendor: 'linux', platform: 'VPCS', ip: '192.168.10.10/24' } },
        { id: 'PC2', type: 'deviceNode', position: { x: 440, y: 360 }, data: { label: 'PC2-VLAN20', type: 'pc', vendor: 'linux', platform: 'VPCS', ip: '192.168.20.20/24' } },
      ]
      const tEdges: Edge[] = [
        { id: 'e-r1-sw1', source: 'R1', target: 'SW1', label: '802.1Q Trunk (Gi0/0 <-> Gi0/1)', style: { stroke: '#3b82f6', strokeWidth: 2 } },
        { id: 'e-sw1-pc1', source: 'SW1', target: 'PC1', label: 'VLAN 10 Access (Gi0/2)', style: { stroke: '#10b981', strokeWidth: 2 } },
        { id: 'e-sw1-pc2', source: 'SW1', target: 'PC2', label: 'VLAN 20 Access (Gi0/3)', style: { stroke: '#10b981', strokeWidth: 2 } },
      ]
      setNodes(tNodes)
      setEdges(tEdges)
      setLabName('CCNA-Router-On-A-Stick-Lab')
    } else if (templateName === 'dual-core-mesh') {
      const tNodes: Node[] = [
        { id: 'R1', type: 'deviceNode', position: { x: 180, y: 80 }, data: { label: 'R1-Edge-A', type: 'router', vendor: 'cisco', platform: 'IOSv', ip: '10.0.0.1/30' } },
        { id: 'R2', type: 'deviceNode', position: { x: 420, y: 80 }, data: { label: 'R2-Edge-B', type: 'router', vendor: 'cisco', platform: 'IOSv', ip: '10.0.0.2/30' } },
        { id: 'SW1', type: 'deviceNode', position: { x: 180, y: 240 }, data: { label: 'SW1-Core', type: 'switch', vendor: 'cisco', platform: 'IOSvL2', ip: '192.168.1.1/24' } },
        { id: 'SW2', type: 'deviceNode', position: { x: 420, y: 240 }, data: { label: 'SW2-Core', type: 'switch', vendor: 'cisco', platform: 'IOSvL2', ip: '192.168.1.2/24' } },
      ]
      const tEdges: Edge[] = [
        { id: 'e-r1-r2', source: 'R1', target: 'R2', label: 'OSPF P2P Area 0', style: { stroke: '#3b82f6', strokeWidth: 2 } },
        { id: 'e-r1-sw1', source: 'R1', target: 'SW1', label: 'Gi0/1 <-> Gi0/1', style: { stroke: '#3b82f6', strokeWidth: 2 } },
        { id: 'e-r2-sw2', source: 'R2', target: 'SW2', label: 'Gi0/1 <-> Gi0/1', style: { stroke: '#3b82f6', strokeWidth: 2 } },
        { id: 'e-sw1-sw2', source: 'SW1', target: 'SW2', label: 'LACP EtherChannel', style: { stroke: '#8b5cf6', strokeWidth: 3 } },
      ]
      setNodes(tNodes)
      setEdges(tEdges)
      setLabName('Dual-Core-Redundant-Mesh')
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setStatusNotification(null)
    try {
      const payload = {
        name: labName,
        topology_json: JSON.stringify({ nodes, edges }),
      }
      await apiClient.saveTopology(payload)
      setStatusNotification({
        message: `Topology saved and synced to database! ${nodes.length} devices active in inventory.`,
        type: 'success',
      })
      setTimeout(() => setStatusNotification(null), 4000)
    } catch (err: any) {
      setStatusNotification({
        message: `Error saving: ${err.message}`,
        type: 'error',
      })
      setTimeout(() => setStatusNotification(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeployEVE = async () => {
    if (nodes.length === 0) {
      alert('Add at least one device node before deploying to EVE-NG.')
      return
    }
    setIsDeploying(true)
    setDeploymentResult(null)
    try {
      const resp = await apiClient.deployEVE({
        name: labName,
        nodes: nodes.map((n) => ({
          id: n.id,
          label: (n.data as any)?.label || n.id,
          type: (n.data as any)?.type || 'router',
          position: n.position,
        })),
        edges: edges.map((e) => ({
          source: e.source,
          target: e.target,
        })),
      })
      setDeploymentResult(resp)
    } catch (err: any) {
      setDeploymentResult({
        success: false,
        message: err.response?.data?.detail || err.message,
      })
    } finally {
      setIsDeploying(false)
    }
  }

  const clearCanvas = () => {
    if (nodes.length === 0) return
    if (window.confirm('Clear all devices and links from canvas?')) {
      setNodes([])
      setEdges([])
      setSelectedNode(null)
    }
  }

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col space-y-4">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#090d16] p-3 shadow-md">
        <div className="flex items-center gap-3">
          <Input
            value={labName}
            onChange={(e) => setLabName(e.target.value)}
            className="w-64 h-8 text-xs font-semibold bg-slate-900 border-slate-800 text-white"
            placeholder="Topology Name"
          />
          <Badge variant="outline" className="text-xs font-mono text-slate-400 border-slate-800">
            {nodes.length} Nodes • {edges.length} Links
          </Badge>
          {statusNotification && (
            <span
              className={`text-xs font-medium flex items-center gap-1 ${
                statusNotification.type === 'success' ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> {statusNotification.message}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick template loader */}
          <div className="hidden lg:flex items-center gap-1 border-r border-slate-800 pr-2 mr-1">
            <span className="text-[11px] text-slate-500 font-medium">Templates:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadTemplate('router-on-a-stick')}
              className="text-[11px] h-7 px-2 text-slate-300 hover:text-white"
            >
              Router-on-a-Stick
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadTemplate('dual-core-mesh')}
              className="text-[11px] h-7 px-2 text-slate-300 hover:text-white"
            >
              Dual Core Mesh
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={clearCanvas} className="gap-1 text-xs text-slate-400">
            <RotateCcw className="h-3.5 w-3.5" />
            Clear
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-1.5 text-xs text-slate-200 hover:border-blue-500"
          >
            <Save className="h-3.5 w-3.5 text-blue-400" />
            {isSaving ? 'Syncing...' : 'Save & Sync'}
          </Button>

          <Button
            size="sm"
            onClick={handleDeployEVE}
            disabled={isDeploying || nodes.length === 0}
            className="gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-xs text-white shadow-md shadow-blue-500/20"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            {isDeploying ? 'Deploying...' : 'Deploy to EVE-NG'}
          </Button>
        </div>
      </div>

      {/* Main Canvas + Sidebar Layout */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left Palette */}
        <div className="w-60 shrink-0 rounded-xl border border-slate-800 bg-[#090d16] p-4 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Device Palette</span>
              <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">Phase 2</Badge>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => addDevice('router', 'R', 'IOSv')}
                className="w-full flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 text-left text-xs text-slate-200 hover:border-blue-500/60 hover:bg-slate-850 transition-all cursor-pointer"
              >
                <div className="rounded bg-blue-500/10 p-1.5 text-blue-400">
                  <Router className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">Router</div>
                  <div className="text-[10px] text-slate-500">Cisco IOSv (L3)</div>
                </div>
              </button>

              <button
                onClick={() => addDevice('switch', 'SW', 'IOSvL2')}
                className="w-full flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 text-left text-xs text-slate-200 hover:border-emerald-500/60 hover:bg-slate-850 transition-all cursor-pointer"
              >
                <div className="rounded bg-emerald-500/10 p-1.5 text-emerald-400">
                  <Network className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">L2/L3 Switch</div>
                  <div className="text-[10px] text-slate-500">Cisco IOSvL2</div>
                </div>
              </button>

              <button
                onClick={() => addDevice('firewall', 'FW', 'ASAv')}
                className="w-full flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 text-left text-xs text-slate-200 hover:border-red-500/60 hover:bg-slate-850 transition-all cursor-pointer"
              >
                <div className="rounded bg-red-500/10 p-1.5 text-red-400">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">Firewall</div>
                  <div className="text-[10px] text-slate-500">Cisco ASAv</div>
                </div>
              </button>

              <button
                onClick={() => addDevice('pc', 'PC', 'VPCS')}
                className="w-full flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 text-left text-xs text-slate-200 hover:border-amber-500/60 hover:bg-slate-850 transition-all cursor-pointer"
              >
                <div className="rounded bg-amber-500/10 p-1.5 text-amber-400">
                  <Monitor className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">Endpoint / PC</div>
                  <div className="text-[10px] text-slate-500">VPCS Client</div>
                </div>
              </button>

              <button
                onClick={() => addDevice('server', 'SRV', 'Ubuntu')}
                className="w-full flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 text-left text-xs text-slate-200 hover:border-purple-500/60 hover:bg-slate-850 transition-all cursor-pointer"
              >
                <div className="rounded bg-purple-500/10 p-1.5 text-purple-400">
                  <Server className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">Linux Server</div>
                  <div className="text-[10px] text-slate-500">Ubuntu 22.04</div>
                </div>
              </button>

              <button
                onClick={() => addDevice('cloud', 'WAN', 'NAT')}
                className="w-full flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 text-left text-xs text-slate-200 hover:border-cyan-500/60 hover:bg-slate-850 transition-all cursor-pointer"
              >
                <div className="rounded bg-cyan-500/10 p-1.5 text-cyan-400">
                  <Cloud className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">Internet / Cloud</div>
                  <div className="text-[10px] text-slate-500">NAT Interface</div>
                </div>
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3 text-[11px] text-slate-400 space-y-1">
            <span className="font-semibold text-white block">Interactive Port Linking</span>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Drag from one node handle to another. Port labels (e.g. Gi0/0) are auto-generated.
            </p>
          </div>
        </div>

        {/* Center React Flow Canvas */}
        <div className="flex-1 rounded-xl border border-slate-800 bg-[#060a12] relative overflow-hidden">
          {nodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-slate-500 pointer-events-none z-10">
              <PlusCircle className="h-10 w-10 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-400">Topology Canvas is Ready</p>
              <p className="text-xs text-slate-600 mt-1 max-w-sm">
                Add devices from the palette or click a template above to construct your network topology.
              </p>
            </div>
          ) : null}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNode(node)}
            fitView
          >
            <Background color="#1e293b" gap={20} size={1} />
            <Controls className="!bg-slate-900 !border-slate-800 !text-slate-300" />
          </ReactFlow>
        </div>

        {/* Right Node Properties Inspector */}
        {selectedNode && (
          <div className="w-80 shrink-0 rounded-xl border border-slate-800 bg-[#090d16] p-4 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-blue-400" />
                  Device Inspector
                </span>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-xs text-slate-500 hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Hostname</label>
                  <Input
                    value={(selectedNode.data as unknown as CustomDeviceData)?.label || ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setNodes((nds) =>
                        nds.map((n) =>
                          n.id === selectedNode.id
                            ? { ...n, data: { ...(n.data as unknown as CustomDeviceData), label: val } }
                            : n
                        )
                      )
                      setSelectedNode((prev) =>
                        prev
                          ? { ...prev, data: { ...(prev.data as unknown as CustomDeviceData), label: val } }
                          : null
                      )
                    }}
                    className="bg-slate-900 border-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Management IP / Subnet</label>
                  <Input
                    value={(selectedNode.data as unknown as CustomDeviceData)?.ip || ''}
                    placeholder="e.g. 192.168.1.1/24"
                    onChange={(e) => {
                      const val = e.target.value
                      setNodes((nds) =>
                        nds.map((n) =>
                          n.id === selectedNode.id
                            ? { ...n, data: { ...(n.data as unknown as CustomDeviceData), ip: val } }
                            : n
                        )
                      )
                      setSelectedNode((prev) =>
                        prev
                          ? { ...prev, data: { ...(prev.data as unknown as CustomDeviceData), ip: val } }
                          : null
                      )
                    }}
                    className="bg-slate-900 border-slate-800 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Type</label>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 capitalize">
                      {String((selectedNode.data as unknown as CustomDeviceData)?.type || 'device')}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Platform</label>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300">
                      {String((selectedNode.data as unknown as CustomDeviceData)?.platform || 'IOSv')}
                    </div>
                  </div>
                </div>

                {/* Interfaces list */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1.5 font-semibold">Connected Interfaces</label>
                  <div className="space-y-1">
                    {edges
                      .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                      .map((e) => (
                        <div
                          key={e.id}
                          className="p-1.5 rounded bg-slate-900/80 border border-slate-800/80 text-[10px] font-mono text-slate-300 flex items-center justify-between"
                        >
                          <span>{e.source === selectedNode.id ? `Peer: ${e.target}` : `Peer: ${e.source}`}</span>
                          <span className="text-blue-400">{e.label || 'Gigabit'}</span>
                        </div>
                      ))}
                    {edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id).length === 0 && (
                      <div className="text-[10px] text-slate-500 italic p-1">No links attached</div>
                    )}
                  </div>
                </div>

                {/* Direct Page Navigation Shortcuts */}
                <div className="pt-2 space-y-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/terminal')}
                    className="w-full gap-1.5 text-xs text-slate-300 border-slate-800 hover:border-blue-500 justify-start"
                  >
                    <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                    Open Device CLI Console
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/device-config')}
                    className="w-full gap-1.5 text-xs text-slate-300 border-slate-800 hover:border-blue-500 justify-start"
                  >
                    <Sliders className="h-3.5 w-3.5 text-blue-400" />
                    Configure Routing / ACLs
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-800">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id))
                  setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id))
                  setSelectedNode(null)
                }}
                className="w-full gap-1.5 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove Device
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Deployment Result Modal */}
      {deploymentResult && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b101c] border border-slate-800 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 text-blue-400" />
                <h3 className="font-bold text-white text-sm">EVE-NG Deployment Report</h3>
              </div>
              <Badge variant={deploymentResult.mode === 'live' ? 'success' : 'outline'}>
                {deploymentResult.mode === 'live' ? 'LIVE DEPLOYED' : 'CACHED & READY'}
              </Badge>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Lab Name:</span>
                <span className="font-mono text-white">{deploymentResult.lab_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nodes Provisioned:</span>
                <span className="font-mono text-blue-400">{deploymentResult.node_count} nodes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Interconnects:</span>
                <span className="font-mono text-emerald-400">{deploymentResult.link_count} links</span>
              </div>
              <p className="text-slate-300 text-[11px] pt-1 border-t border-slate-800/80">
                {deploymentResult.message}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/eve-ng')}
                className="text-xs gap-1 text-slate-300"
              >
                Go to EVE-NG Lab Manager
                <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </Button>
              <Button
                size="sm"
                onClick={() => setDeploymentResult(null)}
                className="text-xs bg-blue-600 hover:bg-blue-500 text-white"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
