import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  Play,
  Award,
  Sparkles,
  Network,
  Cpu,
  Layers,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/services/api'

export const NetworkAcademy: React.FC = () => {
  const navigate = useNavigate()
  const [tracks, setTracks] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])

  useEffect(() => {
    apiClient.getTracks().then(setTracks).catch(() => {})
    apiClient.getLessons().then(setLessons).catch(() => {})
  }, [])

  const handleLoadLessonTopology = (les: any) => {
    let nodes: any[] = []
    let links: any[] = []
    let labName = les.title

    if (les.id === 'les-01') {
      // OSPF Single Area Lab
      labName = 'OSPFv2-Single-Area-Lab'
      nodes = [
        { id: 'R1-HQ', type: 'router', vendor: 'cisco', platform: 'iosv', ip: '10.0.0.1/30' },
        { id: 'R2-Branch', type: 'router', vendor: 'cisco', platform: 'iosv', ip: '10.0.0.2/30' },
        { id: 'Host-PC1', type: 'pc', vendor: 'generic', platform: 'vpcs', ip: '192.168.10.50/24' },
      ]
      links = [
        { source: 'R1-HQ', source_interface: 'Gi0/0', target: 'R2-Branch', target_interface: 'Gi0/0' },
        { source: 'R1-HQ', source_interface: 'Gi0/1', target: 'Host-PC1', target_interface: 'eth0' },
      ]
    } else if (les.id === 'les-02') {
      // VLANs & ROAS
      labName = 'ROAS-InterVLAN-Lab'
      nodes = [
        { id: 'R1-Router', type: 'router', vendor: 'cisco', platform: 'iosv', ip: '192.168.10.1/24' },
        { id: 'SW1-Distribution', type: 'switch', vendor: 'cisco', platform: 'iosvl2', ip: '192.168.10.2/24' },
        { id: 'PC-VLAN10', type: 'pc', vendor: 'generic', platform: 'vpcs', ip: '192.168.10.100/24' },
        { id: 'PC-VLAN20', type: 'pc', vendor: 'generic', platform: 'vpcs', ip: '192.168.20.100/24' },
      ]
      links = [
        { source: 'R1-Router', source_interface: 'Gi0/0', target: 'SW1-Distribution', target_interface: 'Gi0/0' },
        { source: 'SW1-Distribution', source_interface: 'Gi0/1', target: 'PC-VLAN10', target_interface: 'eth0' },
        { source: 'SW1-Distribution', source_interface: 'Gi0/2', target: 'PC-VLAN20', target_interface: 'eth0' },
      ]
    } else {
      // BGP eBGP Lab
      labName = 'eBGP-Multi-AS-Transit-Lab'
      nodes = [
        { id: 'Edge-AS65001', type: 'router', vendor: 'cisco', platform: 'iosv', ip: '198.51.100.1/30' },
        { id: 'ISP-AS65002', type: 'router', vendor: 'cisco', platform: 'iosv', ip: '198.51.100.2/30' },
        { id: 'Server-DMZ', type: 'server', vendor: 'generic', platform: 'linux', ip: '198.51.100.10/24' },
      ]
      links = [
        { source: 'Edge-AS65001', source_interface: 'Gi0/0', target: 'ISP-AS65002', target_interface: 'Gi0/0' },
        { source: 'ISP-AS65002', source_interface: 'Gi0/1', target: 'Server-DMZ', target_interface: 'eth0' },
      ]
    }

    sessionStorage.setItem(
      'imported_topology',
      JSON.stringify({
        lab_name: labName,
        nodes,
        links,
        raw_analysis: `Pre-configured architecture for lesson '${les.title}'. Ready for configuration and live verification.`,
      })
    )
    navigate('/topology')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-emerald-400" />
            Interactive Networking Academy & Lab Simulator
          </h1>
          <p className="text-sm text-slate-400">
            CCNA & CCNP exam preparation connected directly to interactive virtual lab topologies and automated evaluation.
          </p>
        </div>

        <Link to="/exams">
          <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-semibold">
            <Award className="h-3.5 w-3.5" />
            Take Practice Exam
          </Button>
        </Link>
      </div>

      {/* Certification Tracks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tracks.map((track) => (
          <Card key={track.id} className="flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between mb-1">
                <Badge variant="default" className="text-[10px] bg-emerald-600/20 text-emerald-400 border-emerald-500/30">
                  {track.track}
                </Badge>
                <span className="text-xs font-semibold text-emerald-400 font-mono">
                  {track.progress_percent}% Complete
                </span>
              </div>
              <CardTitle className="text-base text-white">{track.title}</CardTitle>
              <CardDescription className="text-xs">{track.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-4">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${track.progress_percent}%` }}
                />
              </div>

              <Button
                variant="outline"
                onClick={() =>
                  navigate(
                    `/assistant?q=${encodeURIComponent(
                      `Let's start the ${track.title} curriculum. Walk me through the first core objective.`
                    )}`
                  )
                }
                className="w-full text-xs text-slate-200"
              >
                Continue Track ({track.completed_modules}/{track.total_modules} Modules)
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Interactive Hands-On Lessons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hands-On Virtual Lab Scenarios</CardTitle>
          <CardDescription>
            Launch interactive topologies onto the canvas, execute configuration commands, and verify routing states
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lessons.map((les) => (
              <div
                key={les.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/60 gap-4 hover:border-slate-700 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">{les.title}</span>
                    <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">
                      {les.category}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {les.difficulty}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-300">{les.summary}</p>
                  <div className="flex items-center gap-2 pt-1 font-mono text-[10px] text-slate-400">
                    <Clock className="h-3 w-3" />
                    <span>{les.duration_min} minutes</span>
                    <span>•</span>
                    <span className="text-emerald-400">CLI: {les.key_commands.join(', ')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleLoadLessonTopology(les)}
                    className="gap-1.5 text-xs text-blue-400 hover:text-blue-300"
                  >
                    <Network className="h-3.5 w-3.5" />
                    Load Topology on Canvas
                  </Button>

                  <Button
                    size="sm"
                    onClick={() =>
                      navigate(
                        `/assistant?q=${encodeURIComponent(
                          `I am studying the hands-on lesson: "${les.title}". Explain the theory, show me the exact Cisco IOS configuration, and provide verification commands like "${les.key_commands[0]}".`
                        )}`
                      )
                    }
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs text-white"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    AI Instructor Guide
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
