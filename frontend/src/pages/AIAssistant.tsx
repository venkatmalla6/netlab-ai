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
}

export const AIAssistant: React.FC = () => {
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Hello! I am your AI Network Engineer powered by Groq. You can speak or type to ask me to design network topologies, write Cisco IOS/Linux configs, troubleshoot routing protocols (OSPF, BGP, EIGRP), or explain packet flows. How can I assist you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState(initialQuery)
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

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

  // Web Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('')
        setInput(transcript)
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsRecording(false)
      }

      recognition.onend = () => {
        setIsRecording(false)
      }

      recognitionRef.current = recognition
    }
  }, [])

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsRecording(true)
      } catch (err) {
        console.error('Failed to start recording:', err)
      }
    }
  }

  const handleSpeak = (msgId: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.')
      return
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel()
      setSpeakingMsgId(null)
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.onend = () => setSpeakingMsgId(null)
    utterance.onerror = () => setSpeakingMsgId(null)

    setSpeakingMsgId(msgId)
    window.speechSynthesis.speak(utterance)
  }

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input
    if (!text.trim() || isLoading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const resp = await apiClient.sendChat(text)
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: resp.message || 'I have analyzed your request.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ Failed to reach AI service: ${err.message || 'Please check backend connection.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errorMsg])
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
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'New network engineering session started. What are we building or diagnosing today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
  }

  return (
    <div className="flex h-[calc(100vh-7.5rem)] rounded-2xl border border-slate-800 bg-[#090d16] overflow-hidden shadow-2xl">
      {/* Left Chat Sidebar */}
      <div className="w-64 border-r border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between hidden md:flex">
        <div className="space-y-4">
          <Button onClick={handleNewChat} className="w-full gap-2 bg-blue-600 hover:bg-blue-500 text-xs">
            <Plus className="h-4 w-4" />
            New Conversation
          </Button>

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
              Suggested Topics
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

        <div className="border-t border-slate-800/80 pt-3 text-[11px] text-slate-500 flex items-center justify-between">
          <span>AI Engine</span>
          <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">
            Groq Qwen 3.8 27B
          </Badge>
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
                <Badge variant="default" className="text-[9px] py-0 px-1.5">
                  Online
                </Badge>
              </div>
              <div className="text-[10px] text-slate-400">Voice-enabled • Cisco IOS, Linux, Windows</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleRecording}
              className={isRecording ? 'text-red-400 border-red-500 bg-red-500/20 animate-pulse' : 'text-slate-400'}
              title={isRecording ? 'Listening... click to stop' : 'Click to speak (Microphone)'}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isRecording
                  ? 'Listening to speech... speak now...'
                  : "Ask anything: 'Configure OSPF Area 0', 'Why is ping failing?'..."
              }
              className="flex-1 bg-slate-900/80 border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:ring-blue-500"
              disabled={isLoading}
            />

            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="gap-2 bg-blue-600 hover:bg-blue-500 px-4 text-xs font-semibold"
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
          </form>
          <div className="text-[10px] text-slate-500 text-center">
            {isRecording ? (
              <span className="text-red-400 font-semibold animate-pulse">● Recording audio... Speak into microphone</span>
            ) : (
              'Voice commands supported via Web Speech API. Responses can be read aloud with Text-to-Speech.'
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
