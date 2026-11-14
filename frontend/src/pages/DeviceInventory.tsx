import React, { useEffect, useState } from 'react'
import {
  Boxes,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Router,
  Network,
  Monitor,
  Terminal,
  Sliders,
  Trash2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Link } from 'react-router-dom'
import { apiClient } from '@/services/api'

export const DeviceInventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [devices, setDevices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newDevice, setNewDevice] = useState({
    name: '',
    type: 'router',
    vendor: 'cisco',
    platform: 'iosv',
  })

  const loadDevices = () => {
    setLoading(true)
    apiClient
      .getDevices()
      .then((data) => setDevices(data || []))
      .catch(() => setDevices([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDevices()
  }, [])

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDevice.name.trim()) return

    try {
      await apiClient.createDevice({
        name: newDevice.name.trim(),
        device_type: newDevice.type === 'l3switch' ? 'switch' : newDevice.type,
        vendor: newDevice.vendor,
        platform: newDevice.type === 'switch' ? 'IOSvL2' : (newDevice.type === 'router' ? 'IOSv' : 'Native'),
      })
      setShowAddModal(false)
      setNewDevice({ name: '', type: 'router', vendor: 'cisco', platform: 'iosv' })
      loadDevices()
    } catch (err: any) {
      alert(`Error creating device: ${err.response?.data?.detail || err.message}`)
    }
  }

  const filtered = devices.filter(
    (d) =>
      d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.type?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Boxes className="h-6 w-6 text-blue-400" />
            Device Inventory & State
          </h1>
          <p className="text-sm text-slate-400">
            Registered virtual network elements and operating systems stored in the local database.
          </p>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          size="sm"
          className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-xs text-white"
        >
          <Plus className="h-4 w-4" />
          Add Device
        </Button>
      </div>

      {showAddModal && (
        <Card className="border-blue-500/40 bg-slate-900/95 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-sm text-white">Add Device to Inventory</CardTitle>
            <CardDescription>Creates a new device entity in the SQLite database</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddDevice} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Device Hostname</label>
                <Input
                  value={newDevice.name}
                  onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                  placeholder="e.g. R1-Gateway"
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Device Type</label>
                <select
                  value={newDevice.type}
                  onChange={(e) => setNewDevice({ ...newDevice, type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                >
                  <option value="router">Router</option>
                  <option value="switch">Switch</option>
                  <option value="l3switch">Layer 3 Switch</option>
                  <option value="firewall">Firewall</option>
                  <option value="pc">PC / Endpoint</option>
                  <option value="server">Server</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Vendor</label>
                <select
                  value={newDevice.vendor}
                  onChange={(e) => setNewDevice({ ...newDevice, vendor: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                >
                  <option value="cisco">Cisco</option>
                  <option value="juniper">Juniper</option>
                  <option value="arista">Arista</option>
                  <option value="linux">Linux</option>
                  <option value="windows">Windows</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-500 text-xs text-white">
                  Save Device
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  className="text-xs text-slate-400"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search device name, vendor, type..."
                className="pl-9 bg-slate-900 border-slate-800 text-xs"
              />
            </div>

            <Badge variant="outline" className="text-xs text-slate-400 border-slate-800">
              Total Registered: {devices.length}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading devices from database...</div>
          ) : devices.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center text-center p-6 text-slate-500 border border-slate-800/60 rounded-xl bg-slate-950/20">
              <Boxes className="h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-400">No Devices In Inventory</p>
              <p className="text-[11px] text-slate-600 mt-1 max-w-md">
                Click "+ Add Device" above or use the Topology Builder to add virtual network devices to your database.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5">Device Name</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Vendor / Platform</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                  {filtered.map((device) => (
                    <tr key={device.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3.5 font-semibold text-white flex items-center gap-2">
                        {(device.device_type || device.type) === 'router' ? (
                          <Router className="h-4 w-4 text-blue-400" />
                        ) : (device.device_type || device.type) === 'switch' ? (
                          <Network className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Monitor className="h-4 w-4 text-amber-400" />
                        )}
                        {device.name}
                      </td>
                      <td className="p-3.5 capitalize text-slate-400">{device.device_type || device.type}</td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-300">
                        {device.vendor} ({device.platform || 'native'})
                      </td>
                      <td className="p-3.5">
                        <Badge
                          variant={device.status === 'running' ? 'success' : 'secondary'}
                          className="text-[10px] uppercase"
                        >
                          {device.status || 'OFFLINE'}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link to={`/terminal?device=${encodeURIComponent(device.name)}`}>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] gap-1 text-slate-300">
                              <Terminal className="h-3 w-3 text-emerald-400" /> CLI
                            </Button>
                          </Link>
                          <Link to={`/device-config?device=${encodeURIComponent(device.name)}`}>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] gap-1 text-slate-300">
                              <Sliders className="h-3 w-3 text-blue-400" /> Config
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
