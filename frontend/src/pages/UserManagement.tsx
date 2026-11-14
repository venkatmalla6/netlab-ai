import React, { useEffect, useState } from 'react'
import {
  UserCog,
  ShieldCheck,
  Check,
  Key,
  User,
  PlusCircle,
  Trash2,
  Lock,
  UserCheck,
  Building,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/services/api'

interface UserItem {
  id: string
  username: string
  full_name: string
  email: string
  role: string
  is_active: boolean
  permissions: string[]
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('NOC Engineer')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadUsers = () => {
    apiClient
      .getUsers()
      .then((data: UserItem[]) => {
        if (data && data.length > 0) {
          setUsers(data)
        }
      })
      .catch(() => {})

    apiClient.getUser().then(setCurrentUser).catch(() => {})
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !fullName.trim() || !email.trim()) return

    setIsSubmitting(true)
    try {
      await apiClient.createUser({
        username,
        full_name: fullName,
        email,
        role,
      })
      setShowAddModal(false)
      setUsername('')
      setFullName('')
      setEmail('')
      loadUsers()
    } catch (err: any) {
      alert(`Error creating user: ${err.response?.data?.detail || err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: string, uName: string) => {
    if (!confirm(`Are you sure you want to delete user account '${uName}'?`)) return
    try {
      await apiClient.deleteUser(userId)
      loadUsers()
    } catch (err: any) {
      alert(`Error deleting user: ${err.response?.data?.detail || err.message}`)
    }
  }

  const getRoleBadgeVariant = (userRole: string) => {
    switch (userRole) {
      case 'Super Admin':
        return 'destructive'
      case 'Network Architect':
        return 'default'
      case 'NOC Engineer':
        return 'success'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <UserCog className="h-6 w-6 text-blue-400" />
            Enterprise Multi-Tenant User Management & RBAC
          </h1>
          <p className="text-sm text-slate-400">
            Role-Based Access Control matrix with granular device execution, hypervisor, and design privileges.
          </p>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-xs text-white"
        >
          <PlusCircle className="h-4 w-4" />
          Add Engineer / Student
        </Button>
      </div>

      {/* Role Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-[#090d16] border-slate-800">
          <span className="text-xs text-slate-400">Super Administrators</span>
          <span className="text-2xl font-bold text-red-400 mt-1">
            {users.filter((u) => u.role === 'Super Admin').length}
          </span>
          <span className="text-[11px] text-slate-500 mt-1">Full root privileges</span>
        </Card>
        <Card className="p-4 bg-[#090d16] border-slate-800">
          <span className="text-xs text-slate-400">Network Architects</span>
          <span className="text-2xl font-bold text-blue-400 mt-1">
            {users.filter((u) => u.role === 'Network Architect').length}
          </span>
          <span className="text-[11px] text-slate-500 mt-1">Design & IaC Exporters</span>
        </Card>
        <Card className="p-4 bg-[#090d16] border-slate-800">
          <span className="text-xs text-slate-400">NOC Operations</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1">
            {users.filter((u) => u.role === 'NOC Engineer').length}
          </span>
          <span className="text-[11px] text-slate-500 mt-1">Assisted Execution & Telemetry</span>
        </Card>
        <Card className="p-4 bg-[#090d16] border-slate-800">
          <span className="text-xs text-slate-400">Academy Students</span>
          <span className="text-2xl font-bold text-purple-400 mt-1">
            {users.filter((u) => u.role === 'Student / Auditor').length}
          </span>
          <span className="text-[11px] text-slate-500 mt-1">Read-Only & Lab Exam</span>
        </Card>
      </div>

      {/* User Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.map((u) => (
          <Card key={u.id} className="p-5 bg-[#090d16] border-slate-800 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow">
                  {u.username.substring(0, 2)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">{u.full_name}</h3>
                  <p className="text-xs text-slate-400 font-mono">@{u.username} • {u.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={getRoleBadgeVariant(u.role) as any} className="text-[10px]">
                  {u.role}
                </Badge>
                {u.id !== 'usr-01' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteUser(u.id, u.username)}
                    className="h-7 w-7 p-0 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400 font-semibold block">Effective Capabilities:</span>
              <div className="flex flex-wrap gap-1">
                {u.permissions?.map((p: string) => (
                  <span
                    key={p}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b101c] border border-blue-600/50 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Provision Enterprise Account</h3>
              <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">
                RBAC
              </Badge>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. j.smith"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Corporate Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. j.smith@netlab.local"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Assigned RBAC Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Super Admin">Super Admin (Unrestricted System Root)</option>
                  <option value="Network Architect">Network Architect (Design, Config, IaC)</option>
                  <option value="NOC Engineer">NOC Engineer (Monitoring, Diagnostics)</option>
                  <option value="Student / Auditor">Student / Auditor (Read-Only Labs)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  className="text-xs border-slate-800 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="text-xs bg-blue-600 hover:bg-blue-500 text-white"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
