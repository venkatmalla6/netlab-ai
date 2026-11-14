import React, { useEffect, useState } from 'react'
import {
  Archive,
  Download,
  RefreshCw,
  CheckCircle2,
  History,
  Copy,
  Plus,
  Eye,
  X,
  FileCode,
  GitCompare,
  Trash2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/services/api'

export const ConfigBackup: React.FC = () => {
  const [backups, setBackups] = useState<any[]>([])
  const [devices, setDevices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false)
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null)
  const [backupDescription, setBackupDescription] = useState('Manual pre-maintenance backup')
  const [customConfigText, setCustomConfigText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [inspectBackup, setInspectBackup] = useState<any | null>(null)

  const fetchBackups = () => {
    setLoading(true)
    Promise.all([
      apiClient.api.get('/configurations').then((r) => r.data || []),
      apiClient.getDevices().catch(() => []),
    ])
      .then(([configs, devs]) => {
        setBackups(configs)
        setDevices(devs || [])
        if (devs && devs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(devs[0].id)
        }
      })
      .catch(() => {
        setBackups([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchBackups()
  }, [])

  const handleDownload = (b: any) => {
    const blob = new Blob([b.config_text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `device_${b.device_id}_v${b.version}.cfg`
    a.click()
  }

  const handleCreateBackup = async () => {
    if (!selectedDeviceId) return
    setIsSaving(true)

    try {
      const dev = devices.find((d) => d.id === selectedDeviceId)
      const textToSave =
        customConfigText.trim() ||
        dev?.config ||
        `hostname ${dev?.name || 'Device'}\n!\ninterface GigabitEthernet0/0\n ip address ${dev?.management_ip || '192.168.1.1'} 255.255.255.0\n no shutdown\n!\nrouter ospf 1\n network 0.0.0.0 255.255.255.255 area 0\n!\nend`

      await apiClient.api.post('/configurations', {
        device_id: selectedDeviceId,
        config_text: textToSave,
        description: backupDescription,
        created_by: 'Network Admin',
      })

      setIsBackupModalOpen(false)
      setCustomConfigText('')
      fetchBackups()
    } catch (err: any) {
      alert(`Failed to create backup: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteBackup = async (id: number) => {
    if (!confirm('Are you sure you want to delete this configuration snapshot?')) return
    try {
      await apiClient.api.delete(`/configurations/${id}`)
      fetchBackups()
    } catch (err: any) {
      alert(`Failed to delete backup: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Archive className="h-6 w-6 text-blue-400" />
            Device Configuration Backup & Version Control
          </h1>
          <p className="text-sm text-slate-400">
            Automated and manual version-controlled configuration snapshots saved in SQLite netlab.db.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchBackups} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setIsBackupModalOpen(true)}
            className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Backup Snapshot
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Saved Configuration Versions</CardTitle>
              <CardDescription>Version-controlled snapshots with timestamp and author metadata</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs text-blue-400 border-blue-500/30">
              {backups.length} Snapshots
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Querying configurations from database...</div>
          ) : backups.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center p-6 text-slate-500 border border-slate-800/60 rounded-xl bg-slate-950/20">
              <Archive className="h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-400">No Configuration Backups Found</p>
              <p className="text-[11px] text-slate-600 mt-1 max-w-md">
                Click "Create Backup Snapshot" or deploy configurations via the Terminal or Configuration Engine to record versioned snapshots.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/60 gap-4 hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        Device #{b.device_id}
                      </span>
                      <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                        v{b.version}
                      </Badge>
                      <span className="text-xs text-slate-400 font-mono">
                        {b.created_at ? new Date(b.created_at).toLocaleString() : 'Recent'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{b.description || 'Auto-generated backup'}</p>
                    <span className="text-[10px] text-slate-500 font-mono">Created by: {b.created_by || 'System'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setInspectBackup(b)}
                      className="h-7 text-xs gap-1 text-slate-300"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(b)}
                      className="h-7 text-xs gap-1 text-blue-400"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteBackup(b.id)}
                      className="h-7 w-7 p-0 text-slate-500 hover:text-red-400"
                      title="Delete snapshot"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Backup Modal */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-[#090d16] border-slate-700 shadow-2xl">
            <CardHeader className="border-b border-slate-800 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base text-white">Create Configuration Snapshot</CardTitle>
                <CardDescription className="text-xs">Save a new versioned configuration state in the database</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsBackupModalOpen(false)}
                className="h-7 w-7 p-0 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Target Device</label>
                <select
                  value={selectedDeviceId || ''}
                  onChange={(e) => setSelectedDeviceId(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.management_ip || 'No IP'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Snapshot Note / Description</label>
                <input
                  type="text"
                  value={backupDescription}
                  onChange={(e) => setBackupDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Pre-OSPF migration backup"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Custom Configuration Text (Optional - defaults to live device config)
                </label>
                <textarea
                  rows={4}
                  value={customConfigText}
                  onChange={(e) => setCustomConfigText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-emerald-400 font-mono focus:outline-none focus:border-blue-500"
                  placeholder="Leave empty to capture current running state..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBackupModalOpen(false)}
                  className="text-xs text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateBackup}
                  disabled={isSaving}
                  className="text-xs bg-blue-600 hover:bg-blue-500 font-semibold"
                >
                  {isSaving ? 'Saving...' : 'Save Snapshot'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Inspect Backup Modal */}
      {inspectBackup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-[#090d16] border-slate-700 shadow-2xl">
            <CardHeader className="border-b border-slate-800 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-blue-400" />
                  Configuration Snapshot v{inspectBackup.version} (Device #{inspectBackup.device_id})
                </CardTitle>
                <CardDescription className="text-xs">{inspectBackup.description}</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInspectBackup(null)}
                className="h-7 w-7 p-0 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <pre className="p-4 rounded-xl bg-black/80 border border-slate-800 font-mono text-xs text-emerald-400 max-h-80 overflow-y-auto leading-relaxed">
                {inspectBackup.config_text}
              </pre>
              <div className="flex justify-between items-center pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(inspectBackup)}
                  className="text-xs gap-1.5 text-blue-400"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download File
                </Button>
                <Button
                  size="sm"
                  onClick={() => setInspectBackup(null)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-white"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
