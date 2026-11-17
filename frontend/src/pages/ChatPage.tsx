/**
 * ChatPage.tsx – Full ChatGPT-style interface for NETLAB AI.
 *
 * Everything happens through this single page:
 * - Text chat with AI (network engineering copilot)
 * - Image upload → topology extraction & deployment
 * - Voice input via Groq Whisper STT
 * - EVE-NG queries (labs, nodes, configs) answered in real-time
 * - Configuration commands pushed to live devices
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient } from '@/services/api'

/* ────────────────────────── types ────────────────────────── */

interface ChatMsg {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  image?: string          // base64 data-url for user-uploaded images
  timestamp: Date
  topology?: any          // extracted topology data from vision
  deployment?: any        // EVE-NG deployment response
}

interface Conversation {
  id: number
  title: string
  updated_at: string
}

/* ────────────────────── SVG icon helpers ────────────────── */

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)
const MicIcon = ({ active }: { active?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? '#ef4444' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)
const ImageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
  </svg>
)
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)
const MenuIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)
const SpeakerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
)
const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)
const StopIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
)
const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

/* ────────────────── WAV encoder for Whisper ──────────────── */

function encodeWav16k(samples: Float32Array, sampleRate: number): Blob {
  const targetRate = 16000
  const ratio = sampleRate / targetRate
  const targetLen = Math.round(samples.length / ratio)
  const resampled = new Int16Array(targetLen)
  for (let i = 0; i < targetLen; i++) {
    const srcIdx = Math.round(i * ratio)
    const s = Math.max(-1, Math.min(1, samples[srcIdx] || 0))
    resampled[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
  }
  const buffer = new ArrayBuffer(44 + resampled.byteLength)
  const view = new DataView(buffer)
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)) }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + resampled.byteLength, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, targetRate, true)
  view.setUint32(28, targetRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, resampled.byteLength, true)
  const output = new Uint8Array(buffer)
  output.set(new Uint8Array(resampled.buffer), 44)
  return new Blob([buffer], { type: 'audio/wav' })
}

/* ────────────────── Markdown-ish renderer ────────────────── */

function renderMarkdown(text: string): string {
  let html = text
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="cb"><code class="lang-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="ic">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="mh">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="mh">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="mh">$1</h2>')
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    // Line breaks
    .replace(/\n/g, '<br/>')
  return html
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */

export const ChatPage: React.FC = () => {
  /* ── state ── */
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [recording, setRecording] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(false)

  /* ── refs ── */
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const pcmChunksRef = useRef<Float32Array[]>([])
  const abortRef = useRef<AbortController | null>(null)

  /* ── auto-scroll ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* ── load conversations on mount ── */
  useEffect(() => {
    loadConversations()
  }, [])

  /* ── auto-resize textarea ── */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [input])

  /* ── helpers ── */

  const loadConversations = async () => {
    try {
      const res = await apiClient.getConversations()
      setConversations(
        (res.sessions || []).map((s: any) => ({
          id: s.id,
          title: s.title || `Chat ${s.id}`,
          updated_at: s.updated_at,
        }))
      )
    } catch { /* ignore */ }
  }

  const loadConversation = async (id: number) => {
    try {
      const res = await apiClient.getMessages(id)
      const msgs: ChatMsg[] = (res.messages || []).map((m: any) => ({
        id: String(m.id),
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.created_at),
      }))
      setMessages(msgs)
      setConversationId(id)
    } catch { /* ignore */ }
  }

  const deleteConversation = async (id: number) => {
    try {
      await apiClient.api.delete(`/ai/conversations/${id}`)
      if (conversationId === id) {
        newChat()
      }
      loadConversations()
    } catch { /* ignore */ }
  }

  const newChat = () => {
    setMessages([])
    setConversationId(null)
    setInput('')
    setImagePreview(null)
    setImageFile(null)
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

  /* ── speak text via Web Speech API ── */
  const speak = useCallback((text: string) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return
    // Strip markdown for cleaner speech
    const clean = text.replace(/```[\s\S]*?```/g, '').replace(/[*#_`]/g, '').replace(/<[^>]+>/g, '')
    if (!clean.trim()) return
    const utter = new SpeechSynthesisUtterance(clean.slice(0, 500))
    utter.lang = 'en-US'
    utter.rate = 1.05
    speechSynthesis.cancel()
    speechSynthesis.speak(utter)
  }, [ttsEnabled])

  /* ── copy text ── */
  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  /* ═══════════════════════ SEND MESSAGE ═══════════════════════ */

  const sendMessage = async () => {
    const text = input.trim()
    if (!text && !imageFile) return
    if (loading) return

    // Abort any pending request
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    // Build user message
    const userMsg: ChatMsg = {
      id: uid(),
      role: 'user',
      content: text || '(image uploaded)',
      image: imagePreview || undefined,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setImagePreview(null)
    setLoading(true)

    // Placeholder for assistant
    const assistantId = uid()
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }])

    try {
      let result: any

      if (imageFile) {
        // ── Image + text → vision endpoint + chat ──
        const formData = new FormData()
        formData.append('file', imageFile)
        if (text) formData.append('message', text)
        if (conversationId) formData.append('conversation_id', String(conversationId))

        const resp = await apiClient.api.post('/ai/chat-with-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000,
          signal: abortRef.current.signal,
        })
        result = resp.data
        setImageFile(null)
      } else {
        // ── Text-only chat ──
        result = await apiClient.sendChat(text, conversationId ?? undefined)
      }

      const reply = result.message || result.reply || 'No response'
      const newConvId = result.conversation_id || conversationId

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: reply, topology: result.topology, deployment: result.deployment }
            : m
        )
      )
      if (newConvId) setConversationId(newConvId)
      loadConversations()
      speak(reply)
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.name === 'AbortError') return
      const errMsg = err?.response?.data?.detail || err?.message || 'Something went wrong'
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: `⚠️ Error: ${errMsg}` }
            : m
        )
      )
    } finally {
      setLoading(false)
    }
  }

  /* ── stop generation ── */
  const stopGeneration = () => {
    abortRef.current?.abort()
    setLoading(false)
  }

  /* ═══════════════════════ IMAGE UPLOAD ═══════════════════════ */

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  /* ── drag & drop ── */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  /* ═══════════════════════ VOICE RECORDING ═══════════════════════ */

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      pcmChunksRef.current = []
      processor.onaudioprocess = (e) => {
        const data = e.inputBuffer.getChannelData(0)
        pcmChunksRef.current.push(new Float32Array(data))
      }
      source.connect(processor)
      processor.connect(ctx.destination)
      processorRef.current = processor
      setRecording(true)
    } catch {
      alert('Microphone access denied')
    }
  }

  const stopRecording = async () => {
    setRecording(false)
    // Stop processor + stream
    processorRef.current?.disconnect()
    mediaStreamRef.current?.getTracks().forEach(t => t.stop())
    const ctx = audioCtxRef.current
    if (!ctx) return

    // Merge PCM chunks
    const chunks = pcmChunksRef.current
    const totalLen = chunks.reduce((s, c) => s + c.length, 0)
    const merged = new Float32Array(totalLen)
    let off = 0
    for (const c of chunks) { merged.set(c, off); off += c.length }

    if (totalLen < 1600) return // too short

    // Encode WAV
    const wavBlob = encodeWav16k(merged, ctx.sampleRate)
    await ctx.close()

    // Transcribe
    setLoading(true)
    try {
      const sttRes = await apiClient.transcribeAudio(wavBlob, 'audio.wav')
      const text = sttRes.text?.trim()
      if (text) {
        setInput(text)
        // Auto-send after short delay
        setTimeout(() => {
          setInput(prev => {
            if (prev === text) {
              // trigger send
              const fakeEvent = { key: 'Enter', shiftKey: false, preventDefault: () => {} }
              handleKeyDown(fakeEvent as any)
            }
            return prev
          })
        }, 300)
      }
    } catch {
      alert('Speech recognition failed')
    } finally {
      setLoading(false)
    }
  }

  const toggleRecording = () => {
    if (recording) stopRecording()
    else startRecording()
  }

  /* ── keyboard ── */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  /* ═══════════════════════ RENDER ═══════════════════════ */

  const quickPrompts = [
    'Configure OSPF Area 0 on R1',
    'How many labs are in my EVE-NG?',
    'Generate BGP config for AS 65001',
    'Explain VLAN trunking',
  ]

  return (
    <div className="dark" style={{ height: '100vh', display: 'flex', background: '#0a0a0a' }}>
      {/* ══════ SIDEBAR ══════ */}
      <aside
        style={{
          width: sidebarOpen ? 280 : 0,
          minWidth: sidebarOpen ? 280 : 0,
          background: '#111111',
          borderRight: sidebarOpen ? '1px solid #222' : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 0.25s ease, min-width 0.25s ease',
        }}
      >
        {/* New Chat button */}
        <div style={{ padding: '12px' }}>
          <button
            onClick={newChat}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 8,
              color: '#e5e5e5',
              cursor: 'pointer',
              fontSize: 14,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#252525')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1a1a1a')}
          >
            <PlusIcon /> New Chat
          </button>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px' }}>
          {conversations.map(c => (
            <div
              key={c.id}
              onClick={() => loadConversation(c.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                margin: '2px 0',
                borderRadius: 8,
                cursor: 'pointer',
                background: conversationId === c.id ? '#1e1e1e' : 'transparent',
                color: '#ccc',
                fontSize: 13,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (conversationId !== c.id) e.currentTarget.style.background = '#1a1a1a' }}
              onMouseLeave={e => { if (conversationId !== c.id) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.title}
              </span>
              <button
                onClick={e => { e.stopPropagation(); deleteConversation(c.id) }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: 4,
                  display: 'flex',
                  opacity: 0.6,
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ef4444' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = '#666' }}
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #222', fontSize: 11, color: '#555' }}>
          NETLAB AI • EVE-NG Copilot
        </div>
      </aside>

      {/* ══════ MAIN AREA ══════ */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          position: 'relative',
        }}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Top bar */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 16px',
            borderBottom: '1px solid #1a1a1a',
            background: '#0a0a0a',
            gap: 12,
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', padding: 4 }}
          >
            <MenuIcon />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#e5e5e5' }}>
              NETLAB AI
            </h1>
          </div>
          {/* TTS Toggle */}
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            style={{
              background: ttsEnabled ? '#1d4ed8' : '#1a1a1a',
              border: '1px solid ' + (ttsEnabled ? '#2563eb' : '#333'),
              borderRadius: 6,
              color: ttsEnabled ? '#fff' : '#888',
              cursor: 'pointer',
              padding: '5px 10px',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <SpeakerIcon /> {ttsEnabled ? 'TTS On' : 'TTS Off'}
          </button>
        </header>

        {/* ══════ MESSAGES ══════ */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 16px',
          }}
        >
          <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 24, paddingBottom: 24 }}>
            {messages.length === 0 ? (
              /* ── EMPTY STATE ── */
              <div style={{ textAlign: 'center', paddingTop: '15vh' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                  fontSize: 28,
                }}>
                  🌐
                </div>
                <h2 style={{ color: '#e5e5e5', fontSize: 24, fontWeight: 600, margin: '0 0 8px' }}>
                  Welcome to NETLAB AI
                </h2>
                <p style={{ color: '#777', fontSize: 14, margin: '0 0 32px' }}>
                  Your AI-powered network engineering copilot. Ask anything, upload topologies, or voice your queries.
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 10,
                  maxWidth: 650,
                  margin: '0 auto',
                }}>
                  {quickPrompts.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(p) }}
                      style={{
                        background: '#141414',
                        border: '1px solid #252525',
                        borderRadius: 10,
                        padding: '14px 16px',
                        color: '#bbb',
                        cursor: 'pointer',
                        fontSize: 13,
                        textAlign: 'left',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.background = '#1a1a1a' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#252525'; e.currentTarget.style.background = '#141414' }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* ── MESSAGE LIST ── */
              messages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    gap: 14,
                    padding: '20px 0',
                    borderBottom: '1px solid #141414',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                        : 'linear-gradient(135deg, #059669, #10b981)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      flexShrink: 0,
                      color: '#fff',
                    }}
                  >
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0, maxWidth: msg.role === 'user' ? '70%' : '100%' }}>
                    {/* Image if present */}
                    {msg.image && (
                      <div style={{ marginBottom: 10 }}>
                        <img
                          src={msg.image}
                          alt="Uploaded"
                          style={{
                            maxWidth: 300,
                            maxHeight: 200,
                            borderRadius: 10,
                            border: '1px solid #333',
                          }}
                        />
                      </div>
                    )}

                    {/* Text */}
                    {msg.role === 'user' ? (
                      <div
                        style={{
                          background: '#1d4ed8',
                          color: '#fff',
                          padding: '10px 16px',
                          borderRadius: '18px 18px 4px 18px',
                          fontSize: 14,
                          lineHeight: 1.6,
                          display: 'inline-block',
                          maxWidth: '100%',
                          wordBreak: 'break-word',
                        }}
                      >
                        {msg.content}
                      </div>
                    ) : (
                      <div>
                        {msg.content ? (
                          <div
                            className="ai-msg"
                            style={{
                              color: '#d4d4d4',
                              fontSize: 14,
                              lineHeight: 1.7,
                              wordBreak: 'break-word',
                            }}
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                          />
                        ) : (
                          <div style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
                            <span className="dot-bounce" style={{ animationDelay: '0s' }} />
                            <span className="dot-bounce" style={{ animationDelay: '0.15s' }} />
                            <span className="dot-bounce" style={{ animationDelay: '0.3s' }} />
                          </div>
                        )}

                        {/* Action buttons */}
                        {msg.content && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            <button
                              onClick={() => copyText(msg.content)}
                              style={{
                                background: 'none', border: 'none', color: '#555', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 6px',
                                borderRadius: 4,
                              }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
                              onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                            >
                              <CopyIcon /> Copy
                            </button>
                            <button
                              onClick={() => speak(msg.content)}
                              style={{
                                background: 'none', border: 'none', color: '#555', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 6px',
                                borderRadius: 4,
                              }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
                              onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                            >
                              <SpeakerIcon /> Listen
                            </button>
                          </div>
                        )}

                        {/* Topology & EVE-NG Deployment card if present */}
                        {(msg.topology || msg.deployment) && (
                          <div style={{
                            marginTop: 14,
                            background: '#12161f',
                            border: '1px solid #1e293b',
                            borderRadius: 12,
                            padding: 16,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 18 }}>🗺️</span>
                                <span style={{ color: '#38bdf8', fontWeight: 600, fontSize: 14 }}>
                                  {msg.deployment ? 'EVE-NG Lab Deployed' : 'Topology Extracted'}
                                </span>
                              </div>
                              <span style={{
                                background: msg.deployment?.mode === 'live' ? '#065f46' : '#1e3a8a',
                                color: msg.deployment?.mode === 'live' ? '#34d399' : '#93c5fd',
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: 12,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                              }}>
                                {msg.deployment?.mode === 'live' ? 'Live Hypervisor' : 'Topology Built'}
                              </span>
                            </div>

                            {msg.deployment?.message && (
                              <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>
                                {msg.deployment.message}
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#cbd5e1', marginBottom: 12 }}>
                              <div><strong>Lab:</strong> {msg.deployment?.lab_name || msg.topology?.lab_name || 'Lab Topology'}</div>
                              <div><strong>Devices:</strong> {msg.deployment?.node_count || msg.topology?.nodes?.length || 0}</div>
                              <div><strong>Links:</strong> {msg.deployment?.link_count || msg.topology?.links?.length || 0}</div>
                            </div>

                            {msg.topology?.nodes && msg.topology.nodes.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {msg.topology.nodes.map((n: any, idx: number) => (
                                  <span key={idx} style={{
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    color: '#e2e8f0',
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    fontSize: 11,
                                  }}>
                                    {n.name || n.id} <span style={{ color: '#64748b' }}>({n.type || 'device'})</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* ══════ INPUT BAR ══════ */}
        <div style={{
          padding: '12px 16px 20px',
          background: '#0a0a0a',
          borderTop: '1px solid #1a1a1a',
        }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            {/* Image preview */}
            {imagePreview && (
              <div style={{ marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      width: 80,
                      height: 60,
                      objectFit: 'cover',
                      borderRadius: 8,
                      border: '1px solid #333',
                    }}
                  />
                  <button
                    onClick={removeImage}
                    style={{
                      position: 'absolute', top: -6, right: -6,
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#333', border: 'none', color: '#fff',
                      cursor: 'pointer', fontSize: 12, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ×
                  </button>
                </div>
                <span style={{ color: '#777', fontSize: 12, paddingTop: 4 }}>
                  {imageFile?.name}
                </span>
              </div>
            )}

            {/* Input row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
                background: '#141414',
                border: '1px solid #2a2a2a',
                borderRadius: 14,
                padding: '8px 12px',
                transition: 'border-color 0.15s',
              }}
              onFocus={() => {}}
            >
              {/* Image upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Upload network diagram"
                style={{
                  background: 'none', border: 'none', color: '#666',
                  cursor: 'pointer', display: 'flex', padding: 4, borderRadius: 6,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
                onMouseLeave={e => (e.currentTarget.style.color = '#666')}
              >
                <ImageIcon />
              </button>

              {/* Text input */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message NETLAB AI..."
                rows={1}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#e5e5e5',
                  fontSize: 14,
                  resize: 'none',
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                  maxHeight: 200,
                  minHeight: 24,
                }}
              />

              {/* Voice */}
              <button
                onClick={toggleRecording}
                title={recording ? 'Stop recording' : 'Voice input'}
                style={{
                  background: recording ? '#dc2626' : 'none',
                  border: 'none',
                  color: recording ? '#fff' : '#666',
                  cursor: 'pointer',
                  display: 'flex',
                  padding: 4,
                  borderRadius: 6,
                  animation: recording ? 'pulse 1.5s infinite' : 'none',
                }}
                onMouseEnter={e => { if (!recording) e.currentTarget.style.color = '#aaa' }}
                onMouseLeave={e => { if (!recording) e.currentTarget.style.color = '#666' }}
              >
                <MicIcon active={recording} />
              </button>

              {/* Send / Stop */}
              {loading ? (
                <button
                  onClick={stopGeneration}
                  title="Stop"
                  style={{
                    background: '#333',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    padding: 6,
                    borderRadius: 8,
                  }}
                >
                  <StopIcon />
                </button>
              ) : (
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() && !imageFile}
                  title="Send"
                  style={{
                    background: (input.trim() || imageFile) ? '#2563eb' : '#1a1a1a',
                    border: 'none',
                    color: (input.trim() || imageFile) ? '#fff' : '#555',
                    cursor: (input.trim() || imageFile) ? 'pointer' : 'default',
                    display: 'flex',
                    padding: 6,
                    borderRadius: 8,
                    transition: 'background 0.15s',
                  }}
                >
                  <SendIcon />
                </button>
              )}
            </div>

            <p style={{ textAlign: 'center', color: '#444', fontSize: 11, marginTop: 8 }}>
              NETLAB AI can make mistakes. Verify configurations before applying to production networks.
            </p>
          </div>
        </div>
      </main>

      {/* ── Global styles ── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        .dot-bounce {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #555;
          display: inline-block;
          animation: bounce-dot 1.2s infinite ease-in-out;
        }
        .ai-msg pre.cb {
          background: #111;
          border: 1px solid #252525;
          border-radius: 8px;
          padding: 14px;
          overflow-x: auto;
          margin: 10px 0;
          font-size: 13px;
          line-height: 1.5;
        }
        .ai-msg pre.cb code {
          font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
          color: #a5f3fc;
        }
        .ai-msg code.ic {
          background: #1e1e1e;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 13px;
          color: #f97316;
          font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
        }
        .ai-msg .mh {
          color: #e5e5e5;
          margin: 14px 0 6px;
        }
        .ai-msg li {
          margin-left: 18px;
          list-style: disc;
          color: #bbb;
        }
        .ai-msg strong { color: #e5e5e5; }
        .ai-msg em { color: #94a3b8; }
        textarea::placeholder { color: #555; }

        /* Mobile */
        @media (max-width: 768px) {
          aside { position: fixed !important; z-index: 50; height: 100vh; }
        }
      `}</style>
    </div>
  )
}

export default ChatPage
