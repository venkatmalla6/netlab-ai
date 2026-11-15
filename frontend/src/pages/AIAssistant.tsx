import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Send,
  Bot,
  User,
  Plus,
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Terminal,
  RefreshCw,
  Cpu,
  Radio,
  Sliders,
  Play,
  Square,
  Headphones,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/services/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isVoice?: boolean
}

type VoiceAgentState = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking'

// Pure PCM WAV encoder for optimal 16kHz mono audio sent to Groq Whisper
function encodeWav16k(samples: Float32Array, inputSampleRate: number): Blob {
  const targetSampleRate = 16000
  const ratio = inputSampleRate / targetSampleRate
  const newLength = Math.max(1, Math.round(samples.length / ratio))
  const result = new Float32Array(newLength)
  let offsetResult = 0
  let offsetBuffer = 0
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio)
    let accum = 0
    let count = 0
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < samples.length; i++) {
      accum += samples[i]
      count++
    }
    result[offsetResult] = count > 0 ? accum / count : 0
    offsetResult++
    offsetBuffer = nextOffsetBuffer
  }

  const buffer = new ArrayBuffer(44 + result.length * 2)
  const view = new DataView(buffer)

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + result.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // Mono
  view.setUint32(24, targetSampleRate, true)
  view.setUint32(28, targetSampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, result.length * 2, true)

  let offset = 44
  for (let i = 0; i < result.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, result[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

export const AIAssistant: React.FC = () => {
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Hello! I am your AI Network Engineer Voice Agent powered by Groq Whisper & Qwen. You can talk to me directly by clicking "Launch Voice Agent" or the microphone button, or type your questions below. How can I assist your network topology today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState(initialQuery)
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [autoSpeak, setAutoSpeak] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const conversationIdRef = useRef<number | null>(null)

  // Voice Agent State
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)
  const [voiceAgentState, setVoiceAgentState] = useState<VoiceAgentState>('idle')
  const [continuousMode, setContinuousMode] = useState(true)
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState<number>(0)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [lastAgentReply, setLastAgentReply] = useState('')

  const voiceTranscriptRef = useRef<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Float32Array[]>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const recognitionRef = useRef<any>(null)
  const isRecordingActiveRef = useRef<boolean>(false)

  const quickPrompts = [
    'Explain OSPF neighbor states from Down to Full',
    'Generate Cisco IOS BGP config for AS 65001 with eBGP peer 10.0.0.2',
    'How do I configure Router-on-a-Stick for VLAN 10 and VLAN 20?',
    'Troubleshoot MTU mismatch causing OSPF stuck in EXSTART',
    'Write standard ACL to permit SSH only from 192.168.1.0/24',
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  useEffect(() => {
    if (initialQuery) {
      handleSend(initialQuery)
    }
  }, [])

  // Web Speech Recognition for live preview & robust local transcription
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event: any) => {
        let transcript = ''
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript + ' '
        }
        const text = transcript.trim()
        if (text) {
          voiceTranscriptRef.current = text
          setVoiceTranscript(text)
          if (!isVoiceModalOpen) {
            setInput(text)
          }
        }
      }

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition status:', event.error)
      }

      recognition.onend = () => {
        if (isRecordingActiveRef.current) {
          try {
            recognition.start()
          } catch {}
        }
      }

      recognitionRef.current = recognition
    }
  }, [isVoiceModalOpen])

  // Play subtle feedback chimes
  const playChime = (frequency: number, duration = 0.12, type: OscillatorType = 'sine') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(frequency, ctx.currentTime)
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + duration)
    } catch {}
  }

  // Audio Visualizer
  const setupAudioGraph = (stream: MediaStream) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioCtx

      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 64
      analyserRef.current = analyser
      source.connect(analyser)

      // PCM audio chunk collector for 16kHz WAV export to Groq Whisper
      const processor = audioCtx.createScriptProcessor(4096, 1, 1)
      audioProcessorRef.current = processor
      audioChunksRef.current = []

      processor.onaudioprocess = (e) => {
        if (!isRecordingActiveRef.current) return
        const channelData = e.inputBuffer.getChannelData(0)
        audioChunksRef.current.push(new Float32Array(channelData))
      }

      source.connect(processor)
      processor.connect(audioCtx.destination)

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      const updateLevel = () => {
        if (!isRecordingActiveRef.current) return
        analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i]
        }
        setAudioLevel(sum / bufferLength)
        animFrameRef.current = requestAnimationFrame(updateLevel)
      }
      updateLevel()
    } catch (e) {
      console.warn('Audio graph setup error:', e)
    }
  }

  const stopAudioGraph = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect()
      audioProcessorRef.current = null
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop())
      audioStreamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    setAudioLevel(0)
  }

  // Start Voice Recording
  const startVoiceRecording = async () => {
    try {
      window.speechSynthesis?.cancel()
      setSpeakingMsgId(null)
      voiceTranscriptRef.current = ''
      setVoiceTranscript('')
      isRecordingActiveRef.current = true
      playChime(660, 0.1)

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      audioStreamRef.current = stream
      setupAudioGraph(stream)

      try {
        recognitionRef.current?.start()
      } catch {}

      setVoiceAgentState('listening')
    } catch (err: any) {
      console.error('Microphone error:', err)
      alert('Microphone access was denied. Please allow microphone permissions in your browser.')
      isRecordingActiveRef.current = false
      setVoiceAgentState('idle')
    }
  }

  // Stop Voice Recording & Process
  const stopVoiceRecording = async (shouldSubmit = true) => {
    if (!isRecordingActiveRef.current) return
    isRecordingActiveRef.current = false
    playChime(440, 0.1)

    try {
      recognitionRef.current?.stop()
    } catch {}

    const sampleRate = audioContextRef.current?.sampleRate || 44100
    const capturedChunks = [...audioChunksRef.current]
    stopAudioGraph()

    if (!shouldSubmit) {
      setVoiceAgentState('idle')
      return
    }

    setVoiceAgentState('transcribing')

    let recognizedText = ''

    // 1. Try Groq Whisper with the 16kHz WAV buffer
    if (capturedChunks.length > 0) {
      try {
        let totalSamples = 0
        capturedChunks.forEach((c) => (totalSamples += c.length))
        const mergedSamples = new Float32Array(totalSamples)
        let offset = 0
        capturedChunks.forEach((c) => {
          mergedSamples.set(c, offset)
          offset += c.length
        })

        // Check if there is enough audio duration (> 0.4 seconds)
        if (totalSamples / sampleRate > 0.4) {
          const wavBlob = encodeWav16k(mergedSamples, sampleRate)
          const res = await apiClient.transcribeAudio(wavBlob, 'voice.wav')
          if (res && res.text) {
            recognizedText = res.text.trim()
          }
        }
      } catch (err) {
        console.warn('Groq Whisper transcribe error, falling back to local SpeechRecognition:', err)
      }
    }

    // 2. Fallback to live SpeechRecognition if Whisper returned empty
    if (!recognizedText && voiceTranscriptRef.current.trim()) {
      recognizedText = voiceTranscriptRef.current.trim()
    }

    // 3. Clear transcript buffer to avoid replay loops
    voiceTranscriptRef.current = ''

    if (recognizedText) {
      setVoiceTranscript(recognizedText)
      setVoiceAgentState('thinking')
      await handleSend(recognizedText, true)
    } else {
      setVoiceAgentState('idle')
    }
  }

  // Speak AI response with Text-to-Speech
  const handleSpeak = (msgId: string, text: string, onDone?: () => void) => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.')
      return
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel()
      setSpeakingMsgId(null)
      setVoiceAgentState('idle')
      return
    }

    window.speechSynthesis.cancel()

    // Clean markdown code blocks for spoken voice
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Configuration code provided below.')
      .replace(/[#*_`]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = 1.05
    utterance.pitch = 1.0
    utterance.lang = 'en-US'

    const voices = window.speechSynthesis.getVoices()
    const preferredVoice =
      voices.find((v) => (v.lang === 'en-US' || v.lang === 'en_US') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('David') || v.name.includes('Jenny') || v.name.includes('Guy'))) ||
      voices.find((v) => v.lang.startsWith('en'))
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    utterance.onstart = () => {
      setSpeakingMsgId(msgId)
      setVoiceAgentState('speaking')
    }

    utterance.onend = () => {
      setSpeakingMsgId(null)
      setVoiceAgentState('idle')
      if (onDone) onDone()
      else if (isVoiceModalOpen && continuousMode) {
        setTimeout(() => {
          startVoiceRecording()
        }, 500)
      }
    }

    utterance.onerror = () => {
      setSpeakingMsgId(null)
      setVoiceAgentState('idle')
    }

    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel()
    setSpeakingMsgId(null)
    setVoiceAgentState('idle')
  }

  // Send Chat message
  const handleSend = async (textToSend?: string, isVoice = false) => {
    const text = (textToSend || input).trim()
    if (!text || isLoading) return

    // Clear input & buffers immediately so the exact same question is never repeated
    setInput('')
    voiceTranscriptRef.current = ''
    setVoiceTranscript('')

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isVoice,
    }

    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)
    if (isVoice) setVoiceAgentState('thinking')

    try {
      const resp = await apiClient.sendChat(text, conversationIdRef.current || undefined)
      if (resp && resp.conversation_id) {
        setConversationId(resp.conversation_id)
        conversationIdRef.current = resp.conversation_id
      }

      const replyContent = resp.message || 'I have analyzed your request.'
      const assistantMsgId = (Date.now() + 1).toString()
      const assistantMsg: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, assistantMsg])
      setLastAgentReply(replyContent)

      // Auto read aloud if voice mode or autoSpeak enabled
      if (isVoice || autoSpeak || isVoiceModalOpen) {
        handleSpeak(assistantMsgId, replyContent)
      } else {
        setVoiceAgentState('idle')
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ Failed to reach AI service: ${err.message || 'Please check backend connection.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errorMsg])
      setVoiceAgentState('idle')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleNewChat = () => {
    window.speechSynthesis?.cancel()
    setSpeakingMsgId(null)
    setVoiceAgentState('idle')
    setConversationId(null)
    conversationIdRef.current = null
    voiceTranscriptRef.current = ''
    setVoiceTranscript('')
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'New network engineering session started. What are we building or diagnosing today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
  }

  const openVoiceAgentModal = () => {
    setIsVoiceModalOpen(true)
    voiceTranscriptRef.current = ''
    setVoiceTranscript('')
    startVoiceRecording()
  }

  const closeVoiceAgentModal = () => {
    stopVoiceRecording(false)
    stopSpeaking()
    setIsVoiceModalOpen(false)
  }

  return (
    <div className="relative flex h-[calc(100vh-7.5rem)] rounded-2xl border border-slate-800 bg-[#090d16] overflow-hidden shadow-2xl">
      {/* Left Chat Sidebar */}
      <div className="w-64 border-r border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between hidden md:flex">
        <div className="space-y-4">
          <Button onClick={handleNewChat} className="w-full gap-2 bg-blue-600 hover:bg-blue-500 text-xs shadow-lg shadow-blue-600/20">
            <Plus className="h-4 w-4" />
            New Conversation
          </Button>

          {/* Voice Agent Launch Banner */}
          <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/50 to-blue-950/40 p-3 text-xs space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold text-[11px]">
              <Radio className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
              Hands-Free Voice Agent
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Speak naturally to design topologies and troubleshoot Cisco IOS with Groq Whisper STT.
            </p>
            <Button
              onClick={openVoiceAgentModal}
              className="w-full gap-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-[11px] h-7 shadow"
            >
              <Mic className="h-3.5 w-3.5" />
              Launch Voice Agent
            </Button>
          </div>

          <div className="space-y-1">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Active Context
            </p>
            <div className="rounded-lg bg-blue-600/10 border border-blue-500/20 p-2.5 text-xs text-blue-300">
              <div className="font-semibold text-white">Enterprise Production Lab</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Live SQLite & EVE-NG Integration</div>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Hardware Context Attached
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Suggested Voice Topics
            </p>
            <div className="space-y-1 text-xs">
              {quickPrompts.slice(0, 4).map((topic, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(topic)}
                  className="w-full text-left truncate px-2.5 py-1.5 rounded hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-colors"
                  title={topic}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Volume2 className="h-3.5 w-3.5 text-blue-400" />
              Auto-Speak Replies
            </span>
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
              className="accent-blue-600 rounded cursor-pointer"
            />
          </div>
          <div className="text-[10px] text-slate-500 flex items-center justify-between">
            <span>Voice / STT</span>
            <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/30">
              Whisper v3 Turbo
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col bg-slate-950/30 overflow-hidden">
        {/* Messages Header */}
        <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                AI Network Engineer Copilot & Voice Console
                <Badge variant="default" className="text-[9px] py-0 px-1.5 bg-emerald-600">
                  Online
                </Badge>
              </div>
              <div className="text-[10px] text-slate-400">Whisper Voice Enabled • Cisco IOS, Linux, Windows</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={openVoiceAgentModal}
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs text-white shadow-md shadow-blue-600/20"
            >
              <Mic className="h-3.5 w-3.5 animate-pulse" />
              Voice Agent Mode
            </Button>
            <Button variant="ghost" size="sm" onClick={handleNewChat} className="text-xs text-slate-400">
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m) => {
            const isUser = m.role === 'user'
            return (
              <div key={m.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="h-8 w-8 shrink-0 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`relative max-w-2xl rounded-2xl p-4 text-xs leading-relaxed shadow-md ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {m.isVoice && (
                    <div className="mb-1 flex items-center gap-1 text-[10px] text-blue-200/80">
                      <Mic className="h-3 w-3" />
                      <span>Voice Input (Whisper STT)</span>
                    </div>
                  )}

                  <div className="whitespace-pre-wrap font-sans">{m.content}</div>

                  {!isUser && (
                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{m.timestamp}</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleSpeak(m.id, m.content)}
                          className={`flex items-center gap-1 transition-colors cursor-pointer ${
                            speakingMsgId === m.id ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'
                          }`}
                          title={speakingMsgId === m.id ? 'Stop audio playback' : 'Read aloud with Text-to-Speech'}
                        >
                          {speakingMsgId === m.id ? (
                            <>
                              <VolumeX className="h-3 w-3 text-blue-400 animate-pulse" />
                              <span className="text-blue-400">Stop</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-3 w-3" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleCopy(m.id, m.content)}
                          className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Copy response"
                        >
                          {copiedId === m.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="h-8 w-8 shrink-0 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            )
          })}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 text-xs text-slate-400 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                Thinking and formulating network architecture...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-2">
          {/* Quick macro chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(p)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-[10px] transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2"
          >
            {/* Dual-Mode Microphone Button */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                if (voiceAgentState === 'listening') {
                  stopVoiceRecording(true)
                } else {
                  startVoiceRecording()
                }
              }}
              className={
                voiceAgentState === 'listening'
                  ? 'text-red-400 border-red-500 bg-red-500/20 animate-pulse'
                  : 'text-slate-400 hover:text-blue-400 hover:border-blue-500'
              }
              title={
                voiceAgentState === 'listening'
                  ? 'Listening... Click to finish speaking'
                  : 'Click to speak (Whisper Large v3 STT)'
              }
            >
              {voiceAgentState === 'listening' ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                voiceAgentState === 'listening'
                  ? 'Listening to your voice... Speak now...'
                  : voiceAgentState === 'transcribing'
                  ? 'Transcribing audio with Groq Whisper...'
                  : "Ask anything: 'Configure OSPF Area 0', 'Why is ping failing?'..."
              }
              className="flex-1 bg-slate-900/80 border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:ring-blue-500"
              disabled={isLoading || voiceAgentState === 'transcribing'}
            />

            <Button
              type="submit"
              disabled={isLoading || !input.trim() || voiceAgentState === 'listening'}
              className="gap-2 bg-blue-600 hover:bg-blue-500 px-4 text-xs font-semibold shadow-md"
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
            <span>Voice commands powered by Groq Whisper & Web Speech Synthesis.</span>
            <button
              onClick={openVoiceAgentModal}
              className="text-blue-400 hover:text-blue-300 underline cursor-pointer"
            >
              Open Interactive Voice Console →
            </button>
          </div>
        </div>
      </div>

      {/* ── INTERACTIVE VOICE AGENT HUD MODAL ───────────────────────── */}
      {isVoiceModalOpen && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-between p-8 animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="w-full max-w-2xl flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Headphones className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Interactive AI Voice Agent
                  <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/40">
                    Groq Whisper + Qwen
                  </Badge>
                </h3>
                <p className="text-[11px] text-slate-400">Autonomous Network Engineering Voice Dialogue</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={closeVoiceAgentModal}
              className="border-slate-700 text-slate-300 hover:text-white text-xs"
            >
              Exit Voice Mode
            </Button>
          </div>

          {/* Center Voice Visualizer */}
          <div className="flex flex-col items-center justify-center space-y-6 my-auto">
            {/* Pulsing Concentric Rings */}
            <div className="relative flex items-center justify-center">
              <div
                className={`absolute h-48 w-48 rounded-full border border-blue-500/20 transition-all duration-300 ${
                  voiceAgentState === 'listening' ? 'scale-125 border-emerald-500/40 animate-ping' : ''
                } ${voiceAgentState === 'speaking' ? 'scale-110 border-blue-500/40 animate-pulse' : ''}`}
              />
              <div
                className={`absolute h-40 w-40 rounded-full border border-indigo-500/30 transition-all duration-300 ${
                  voiceAgentState === 'listening' ? 'scale-110 border-emerald-500/60' : ''
                }`}
              />

              {/* Central Glowing Orb */}
              <div
                onClick={() => {
                  if (voiceAgentState === 'listening') {
                    stopVoiceRecording(true)
                  } else if (voiceAgentState === 'speaking') {
                    stopSpeaking()
                  } else {
                    startVoiceRecording()
                  }
                }}
                className={`h-28 w-28 rounded-full flex flex-col items-center justify-center cursor-pointer shadow-2xl transition-all duration-300 ${
                  voiceAgentState === 'listening'
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/50 scale-105'
                    : voiceAgentState === 'speaking'
                    ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/50 scale-105'
                    : voiceAgentState === 'thinking' || voiceAgentState === 'transcribing'
                    ? 'bg-gradient-to-tr from-amber-600 to-yellow-500 shadow-amber-500/50 animate-pulse'
                    : 'bg-gradient-to-tr from-slate-800 to-slate-700 shadow-black/50 hover:scale-105'
                }`}
              >
                {voiceAgentState === 'listening' ? (
                  <Mic className="h-10 w-10 text-white animate-bounce" />
                ) : voiceAgentState === 'speaking' ? (
                  <Volume2 className="h-10 w-10 text-white animate-pulse" />
                ) : voiceAgentState === 'thinking' ? (
                  <Cpu className="h-10 w-10 text-white animate-spin" />
                ) : voiceAgentState === 'transcribing' ? (
                  <Zap className="h-10 w-10 text-white animate-pulse" />
                ) : (
                  <Mic className="h-10 w-10 text-slate-300" />
                )}
              </div>
            </div>

            {/* Audio Waveform Equalizer Bars */}
            <div className="flex items-center gap-1.5 h-8">
              {[4, 12, 24, 16, 28, 8, 20, 32, 14, 22, 10, 18].map((h, i) => {
                const dynamicHeight =
                  voiceAgentState === 'listening'
                    ? Math.max(6, Math.min(32, (audioLevel / 2) * (h / 16)))
                    : voiceAgentState === 'speaking'
                    ? Math.max(6, Math.min(28, (Math.sin(Date.now() / 200 + i) + 1.2) * 12))
                    : 4
                return (
                  <div
                    key={i}
                    style={{ height: `${dynamicHeight}px` }}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      voiceAgentState === 'listening'
                        ? 'bg-emerald-400'
                        : voiceAgentState === 'speaking'
                        ? 'bg-blue-400'
                        : 'bg-slate-700'
                    }`}
                  />
                )
              })}
            </div>

            {/* Live State Status Text */}
            <div className="text-center space-y-1">
              <div className="text-sm font-semibold tracking-wide uppercase text-white flex items-center justify-center gap-2">
                {voiceAgentState === 'listening' && (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    Listening to your voice... Speak now
                  </span>
                )}
                {voiceAgentState === 'transcribing' && (
                  <span className="text-amber-400 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" />
                    Transcribing speech with Groq Whisper...
                  </span>
                )}
                {voiceAgentState === 'thinking' && (
                  <span className="text-indigo-400 flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 animate-spin" />
                    Formulating network engineering answer...
                  </span>
                )}
                {voiceAgentState === 'speaking' && (
                  <span className="text-blue-400 flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5 animate-pulse" />
                    AI Network Engineer Speaking...
                  </span>
                )}
                {voiceAgentState === 'idle' && (
                  <span className="text-slate-400">Click the microphone to start speaking</span>
                )}
              </div>
              <p className="text-xs text-slate-400 max-w-md">
                Try asking: <span className="text-slate-300">"Explain OSPF neighbor states"</span> or{' '}
                <span className="text-slate-300">"How to configure router on a stick"</span>
              </p>
            </div>

            {/* Live Transcription Box */}
            <div className="w-full max-w-xl rounded-xl bg-slate-900/80 border border-slate-800 p-4 min-h-[5rem] max-h-40 overflow-y-auto text-xs text-slate-200 shadow-inner">
              {voiceTranscript ? (
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase">You Said:</span>
                  <p className="mt-0.5 text-white">{voiceTranscript}</p>
                </div>
              ) : lastAgentReply ? (
                <div>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase">Agent Reply:</span>
                  <p className="mt-0.5 text-slate-300 line-clamp-3">{lastAgentReply}</p>
                </div>
              ) : (
                <p className="text-slate-500 italic text-center">Speech transcript will appear here in real time...</p>
              )}
            </div>
          </div>

          {/* Bottom Voice Controls */}
          <div className="w-full max-w-2xl flex items-center justify-between border-t border-slate-800/80 pt-4 text-xs">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={continuousMode}
                  onChange={(e) => setContinuousMode(e.target.checked)}
                  className="accent-blue-600 rounded"
                />
                <span>Continuous Dialogue Mode (Hands-Free)</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              {voiceAgentState === 'speaking' ? (
                <Button
                  onClick={stopSpeaking}
                  size="sm"
                  className="bg-red-600 hover:bg-red-500 text-white gap-1.5 text-xs"
                >
                  <Square className="h-3.5 w-3.5" />
                  Stop Voice
                </Button>
              ) : voiceAgentState === 'listening' ? (
                <Button
                  onClick={() => stopVoiceRecording(true)}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 text-xs shadow-lg shadow-emerald-600/30"
                >
                  <Check className="h-3.5 w-3.5" />
                  Finish Speaking
                </Button>
              ) : (
                <Button
                  onClick={startVoiceRecording}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5 text-xs shadow-lg shadow-blue-600/30"
                >
                  <Mic className="h-3.5 w-3.5" />
                  Tap to Speak
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
