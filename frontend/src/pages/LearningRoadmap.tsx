import React from 'react'
import { Compass, CheckCircle2, Circle, ArrowDown, Award, Star } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const LearningRoadmap: React.FC = () => {
  const steps = [
    { title: '1. Network Fundamentals', desc: 'OSI 7 layers, TCP/IP stack, Ethernet frame structure, Cabling & Fiber', status: 'completed' },
    { title: '2. IP Addressing & Subnetting', desc: 'IPv4 VLSM calculation, CIDR blocks, Private RFC 1918, IPv6 addressing', status: 'completed' },
    { title: '3. Layer 2 Switching & VLANs', desc: '802.1Q trunks, VTP, Spanning Tree (802.1D / RSTP 802.1w), EtherChannel (LACP)', status: 'in-progress' },
    { title: '4. IP Routing Technologies', desc: 'Static routes, Router-on-a-Stick, Inter-VLAN routing, OSPFv2 Single & Multi-Area', status: 'pending' },
    { title: '5. Wide Area Networks & BGP', desc: 'eBGP / iBGP peering, Autonomous Systems, WAN redundancy, GRE tunnels', status: 'pending' },
    { title: '6. Network Security & ACLs', desc: 'Standard & Extended ACLs, NAT/PAT, SSH hardening, Port Security, DHCP Snooping', status: 'pending' },
    { title: '7. Network Automation & Programmability', desc: 'Python Netmiko, NAPALM, RESTCONF, JSON/YAML schemas, Ansible playbooks', status: 'pending' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Compass className="h-6 w-6 text-blue-400" />
            Cisco Certified Network Associate (CCNA) Study Roadmap
          </h1>
          <p className="text-sm text-slate-400">
            Step-by-step structured curriculum guiding you from network basics to enterprise automation.
          </p>
        </div>

        <Badge variant="success" className="text-xs px-3 py-1">
          28% Overall Completion
        </Badge>
      </div>

      <div className="space-y-4 max-w-3xl mx-auto">
        {steps.map((s, idx) => (
          <div key={idx} className="relative">
            <Card
              className={`p-4 transition-all ${
                s.status === 'completed'
                  ? 'border-emerald-500/30 bg-emerald-950/10'
                  : s.status === 'in-progress'
                  ? 'border-blue-500/50 bg-blue-950/20 shadow-lg shadow-blue-500/10'
                  : 'border-slate-800 bg-slate-900/40 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {s.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  ) : s.status === 'in-progress' ? (
                    <div className="h-5 w-5 rounded-full border-2 border-blue-400 flex items-center justify-center shrink-0">
                      <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                    </div>
                  ) : (
                    <Circle className="h-5 w-5 text-slate-600 shrink-0" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm text-white">{s.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{s.desc}</p>
                  </div>
                </div>

                <Badge
                  variant={
                    s.status === 'completed' ? 'success' : s.status === 'in-progress' ? 'default' : 'secondary'
                  }
                  className="text-[10px] uppercase font-semibold shrink-0 ml-4"
                >
                  {s.status.replace('-', ' ')}
                </Badge>
              </div>
            </Card>

            {idx < steps.length - 1 && (
              <div className="flex justify-center my-1.5 text-slate-700">
                <ArrowDown className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

