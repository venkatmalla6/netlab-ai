export interface Lab {
  id: number
  name: string
  description?: string
  status: 'stopped' | 'running' | 'error' | 'building'
  eve_ng_lab_id?: string
  created_at?: string
  updated_at?: string
}

export interface Device {
  id: number
  lab_id?: number
  name: string
  type: 'router' | 'switch' | 'l3switch' | 'firewall' | 'pc' | 'server' | 'cloud'
  vendor: 'cisco' | 'juniper' | 'arista' | 'linux' | 'windows' | 'generic'
  platform?: string
  status: 'offline' | 'online' | 'rebooting' | 'error'
  x_position?: number
  y_position?: number
  config?: string
}

export interface Interface {
  id: number
  device_id: number
  name: string
  ip_address?: string
  subnet_mask?: string
  mac_address?: string
  status: 'up' | 'down' | 'admin_down'
  speed?: string
  duplex?: string
}

export interface TopologyNode {
  id: string
  type: string
  vendor?: string
  platform?: string
  interfaces?: string[]
}

export interface TopologyLink {
  source: string
  source_interface: string
  target: string
  target_interface: string
}

export interface TopologyData {
  lab_name: string
  nodes: TopologyNode[]
  links: TopologyLink[]
}

export interface ChatMessage {
  id?: number
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at?: string
}

export interface ChatSession {
  id: number
  title: string
  model?: string
  provider?: string
  message_count?: number
  created_at?: string
}

export interface SystemStatus {
  groq_configured: boolean
  ollama_available: boolean
  eve_ng_connected: boolean
  vmware_connected: boolean
  stt_available: boolean
  tts_available: boolean
}

