import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { Dashboard } from '@/pages/Dashboard'
import { AIAssistant } from '@/pages/AIAssistant'
import { TopologyBuilder } from '@/pages/TopologyBuilder'
import { ImageToTopology } from '@/pages/ImageToTopology'
import { EVENGManager } from '@/pages/EVENGManager'
import { VMwareManager } from '@/pages/VMwareManager'
import { DeviceInventory } from '@/pages/DeviceInventory'
import { DeviceConfiguration } from '@/pages/DeviceConfiguration'
import { DeviceTerminal } from '@/pages/DeviceTerminal'
import { NetworkMonitoring } from '@/pages/NetworkMonitoring'
import { AITroubleshooting } from '@/pages/AITroubleshooting'
import { PacketAnalyzer } from '@/pages/PacketAnalyzer'
import { SecurityAnalyzer } from '@/pages/SecurityAnalyzer'
import { ConfigBackup } from '@/pages/ConfigBackup'
import { ConfigHistory } from '@/pages/ConfigHistory'
import { NetworkAcademy } from '@/pages/NetworkAcademy'
import { PracticalExam } from '@/pages/PracticalExam'
import { InterviewSimulator } from '@/pages/InterviewSimulator'
import { LearningRoadmap } from '@/pages/LearningRoadmap'
import { FailureSimulator } from '@/pages/FailureSimulator'
import { NetworkDocumentation } from '@/pages/NetworkDocumentation'
import { AIWhiteboard } from '@/pages/AIWhiteboard'
import { LookingGlass } from '@/pages/LookingGlass'
import { Analytics } from '@/pages/Analytics'
import { UserManagement } from '@/pages/UserManagement'
import { Settings } from '@/pages/Settings'

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="assistant" element={<AIAssistant />} />
          <Route path="topology" element={<TopologyBuilder />} />
          <Route path="vision" element={<ImageToTopology />} />
          <Route path="eve-ng" element={<EVENGManager />} />
          <Route path="vmware" element={<VMwareManager />} />
          <Route path="devices" element={<DeviceInventory />} />
          <Route path="device-config" element={<DeviceConfiguration />} />
          <Route path="terminal" element={<DeviceTerminal />} />
          <Route path="monitoring" element={<NetworkMonitoring />} />
          <Route path="troubleshooting" element={<AITroubleshooting />} />
          <Route path="packets" element={<PacketAnalyzer />} />
          <Route path="security" element={<SecurityAnalyzer />} />
          <Route path="backup" element={<ConfigBackup />} />
          <Route path="history" element={<ConfigHistory />} />
          <Route path="academy" element={<NetworkAcademy />} />
          <Route path="exams" element={<PracticalExam />} />
          <Route path="interview" element={<InterviewSimulator />} />
          <Route path="roadmap" element={<LearningRoadmap />} />
          <Route path="failure-sim" element={<FailureSimulator />} />
          <Route path="docs-gen" element={<NetworkDocumentation />} />
          <Route path="whiteboard" element={<AIWhiteboard />} />
          <Route path="looking-glass" element={<LookingGlass />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
