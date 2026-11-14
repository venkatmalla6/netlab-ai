import axios from 'axios'

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export const apiClient = {
  api,
  // Dashboard
  getDashboard: () => api.get('/dashboard').then((r) => r.data),

  // AI Chat
  sendChat: (message: string, conversation_id?: number, model?: string) =>
    api.post('/ai/chat', { message, conversation_id, model, stream: false }).then((r) => r.data),
  getConversations: () => api.get('/ai/conversations').then((r) => r.data),
  getMessages: (sessionId: number) => api.get(`/ai/conversations/${sessionId}`).then((r) => r.data),

  // Labs & Topologies
  getLabs: () => api.get('/labs').then((r) => r.data),
  createLab: (data: { name: string; description?: string }) => api.post('/labs', data).then((r) => r.data),
  getTopologies: () => api.get('/topologies').then((r) => r.data),
  saveTopology: (data: { name: string; topology_json: string }) => api.post('/topologies', data).then((r) => r.data),
  syncTopologyDevices: (topologyId: number) => api.post(`/topologies/${topologyId}/sync`).then((r) => r.data),

  // EVE-NG Integration
  getEVEStatus: () => api.get('/eve-ng/status').then((r) => r.data),
  getEVELabs: () => api.get('/eve-ng/labs').then((r) => r.data),
  deployEVE: (data: { name: string; nodes: any[]; edges: any[] }) => api.post('/eve-ng/deploy', data).then((r) => r.data),
  updateEVEConfig: (data: { host: string; username?: string; password?: string }) => api.post('/eve-ng/config', data).then((r) => r.data),
  startALLNodes: (labPath: string) => api.post(`/eve-ng/labs/${encodeURIComponent(labPath)}/start-all`).then((r) => r.data),
  stopALLNodes: (labPath: string) => api.post(`/eve-ng/labs/${encodeURIComponent(labPath)}/stop-all`).then((r) => r.data),

  // Devices & Automation
  getDevices: (lab_id?: number) => api.get('/devices', { params: { lab_id } }).then((r) => r.data),
  getDevice: (deviceId: number) => api.get(`/devices/${deviceId}`).then((r) => r.data),
  createDevice: (data: any) => api.post('/devices', data).then((r) => r.data),
  executeCommands: (data: { device_id: number; commands: string[]; mode: string; confirmed?: boolean }) =>
    api.post('/executions', data).then((r) => r.data),

  // Configurations
  getConfigurations: (deviceId?: number) => api.get('/configurations', { params: { device_id: deviceId } }).then((r) => r.data),
  generateConfig: (data: { device_name: string; vendor?: string; platform?: string; protocols?: string[]; prompt?: string; device_id?: number }) =>
    api.post('/configurations/generate', data).then((r) => r.data),
  diffConfigs: (data: { source_text: string; target_text: string }) => api.post('/configurations/diff', data).then((r) => r.data),
  validateConfig: (data: { config_text: string; vendor?: string }) => api.post('/configurations/validate', data).then((r) => r.data),

  // Troubleshooting & Verification
  runDiagnostics: (problem_description: string, affected_device_ids: number[] = []) =>
    api.post('/troubleshooting/diagnose', { problem_description, affected_device_ids }).then((r) => r.data),
  verifyPing: (source_device_id: number, target_ip: string) =>
    api.post('/verification/ping', { source_device_id, target_ip }).then((r) => r.data),

  // Monitoring
  getMonitoringOverview: () => api.get('/monitoring/overview').then((r) => r.data),

  // Academy & Questions
  getTracks: () => api.get('/learning/tracks').then((r) => r.data),
  getLessons: () => api.get('/learning/lessons').then((r) => r.data),
  getQuestions: () => api.get('/assessments/questions').then((r) => r.data),
  getInterviewQuestions: () => api.get('/assessments/interview/questions').then((r) => r.data),

  // Settings & Status
  getSettings: () => api.get('/settings').then((r) => r.data),
  updateSettings: (data: any) => api.put('/settings', data).then((r) => r.data),
  getSettingsStatus: () => api.get('/settings/status').then((r) => r.data),
  getUser: () => api.get('/users/me').then((r) => r.data),
}
