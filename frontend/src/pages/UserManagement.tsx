import React, { useEffect, useState } from 'react'
import { UserCog, ShieldCheck, Check, Key, User } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/services/api'

export const UserManagement: React.FC = () => {
  const [user, setUser] = useState<any>({
    username: 'admin',
    email: 'admin@netlab.local',
    role: 'Super Admin',
    permissions: [
      'labs:manage',
      'devices:configure',
      'devices:execute',
      'eve_ng:admin',
      'vmware:admin',
      'ai:full_access',
      'settings:edit',
    ],
  })

  useEffect(() => {
    apiClient.getUser().then(setUser).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <UserCog className="h-6 w-6 text-blue-400" />
            User Roles & Access Control
          </h1>
          <p className="text-sm text-slate-400">
            Localhost single-user administrative context with full hypervisor and automation privileges.
          </p>
        </div>

        <Badge variant="success" className="text-xs px-3 py-1">
          Localhost Single-User Mode
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base">Current Profile</CardTitle>
            <CardDescription>Local administrator credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow">
                AD
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">{user.username}</h3>
                <p className="text-xs text-slate-400">{user.email}</p>
                <Badge variant="default" className="text-[10px] mt-1">
                  {user.role}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Administrative Permissions</CardTitle>
            <CardDescription>Granular capabilities assigned to this local session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {user.permissions.map((perm: string) => (
                <div key={perm} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="font-mono">{perm}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

