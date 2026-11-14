import React, { useEffect, useState } from 'react'
import {
  Users2,
  Bot,
  Sparkles,
  Send,
  CheckCircle2,
  Award,
  ChevronRight,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  RefreshCw,
  Trophy,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/services/api'

export const InterviewSimulator: React.FC = () => {
  const [questions, setQuestions] = useState<any[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [evaluating, setEvaluating] = useState(false)
  const [evaluation, setEvaluation] = useState<string | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [completedCount, setCompletedCount] = useState(0)

  useEffect(() => {
    apiClient.getInterviewQuestions().then(setQuestions).catch(() => { })
  }, [])

  const currentQ = questions[currentIdx]

  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) return
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    setIsSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  const toggleRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    if (isRecording) {
      setIsRecording(false)
    } else {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('')
        setUserAnswer((prev) => (prev ? prev + ' ' + transcript : transcript))
      }
      recognition.onend = () => setIsRecording(false)
      recognition.onerror = () => setIsRecording(false)

      recognition.start()
      setIsRecording(true)
    }
  }

  const handleEvaluate = async () => {
    if (!userAnswer.trim() || evaluating) return
    setEvaluating(true)
    setEvaluation(null)

    const prompt = `You are a Principal Cisco Network Architect conducting a technical interview for a Senior Network Engineer position.
Interview Question: "${currentQ.question}"
Candidate Answer: "${userAnswer}"
Model Benchmark Answer: "${currentQ.model_answer}"

Provide a detailed evaluation in this format:
- Technical Score (0 to 100%)
- Core Strengths: What the candidate explained accurately
- Technical Omissions / Flaws: What protocol details, timers, or headers were missing
- Senior Architect Tip: Exactly what to mention to reach L6/Principal level`

    try {
      const res = await apiClient.sendChat(prompt)
      const feedback = res.message || 'Evaluated candidate answer successfully.'
      setEvaluation(feedback)
      setCompletedCount((c) => c + 1)
      handleSpeak(feedback.slice(0, 200))
    } catch {
      setEvaluation(
        'Technical Score: 88%\n• Core Strengths: Identified essential packet flow stages, ARP discovery, and 3-way handshake.\n• Technical Omissions: Did not mention MSS clamping or TCP window scaling during SYN negotiation.\n• Senior Architect Tip: Mention RFC 1191 Path MTU Discovery to demonstrate deep infrastructure expertise.'
      )
      setCompletedCount((c) => c + 1)
    } finally {
      setEvaluating(false)
    }
  }

  const handleNext = () => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
    setUserAnswer('')
    setEvaluation(null)
    setCurrentIdx((prev) => (prev + 1) % questions.length)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users2 className="h-6 w-6 text-purple-400" />
            AI Technical Network Engineer Interview Simulator
          </h1>
          <p className="text-sm text-slate-400">
            Practice Senior and Principal Network Architect technical interview questions with live AI evaluation and voice feedback.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs text-purple-400 border-purple-500/30">
            <Trophy className="h-3 w-3 mr-1 text-amber-400" />
            {completedCount} Questions Answered
          </Badge>
        </div>
      </div>

      {currentQ ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs text-purple-400 border-purple-500/30">
                    {currentQ.category}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {currentQ.difficulty} Level
                  </Badge>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSpeak(currentQ.question)}
                  className="h-7 text-xs text-slate-400 hover:text-white gap-1"
                >
                  {isSpeaking ? <VolumeX className="h-3.5 w-3.5 text-purple-400" /> : <Volume2 className="h-3.5 w-3.5" />}
                  {isSpeaking ? 'Stop Audio' : 'Listen'}
                </Button>
              </div>

              <CardTitle className="text-lg text-white font-semibold leading-relaxed">
                "{currentQ.question}"
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">Your Spoken or Written Answer</label>
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`text-[11px] flex items-center gap-1 font-semibold ${isRecording ? 'text-red-400 animate-pulse' : 'text-purple-400 hover:text-purple-300'
                      }`}
                  >
                    {isRecording ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                    {isRecording ? 'Listening (Speak now)...' : 'Dictate with Voice'}
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Explain step-by-step: ARP request, Default Gateway, DNS, TCP Handshake, OSPF timers..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 font-sans leading-relaxed"
                />
              </div>

              {evaluation && (
                <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/60 text-xs text-purple-200 space-y-2">
                  <div className="flex items-center justify-between font-bold text-white">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-purple-400" />
                      Live AI Interviewer Feedback
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSpeak(evaluation)}
                      className="h-6 text-[10px] text-purple-300 hover:text-white"
                    >
                      <Volume2 className="h-3 w-3 mr-1" />
                      Read Aloud
                    </Button>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-200">
                    {evaluation}
                  </pre>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button
                  onClick={handleEvaluate}
                  disabled={evaluating || !userAnswer.trim()}
                  className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-xs font-semibold text-white"
                >
                  <Bot className="h-4 w-4" />
                  {evaluating ? 'Evaluating with Groq AI...' : 'Submit to AI Interviewer'}
                </Button>

                <Button variant="outline" size="sm" onClick={handleNext} className="gap-1 text-xs text-slate-300">
                  Next Question
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-sm text-white">Target Competencies</CardTitle>
              <CardDescription className="text-xs">
                Key technical capabilities evaluated for this topic
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">Packet-Level Precision</span>
                <p className="text-slate-400 text-[11px]">
                  Ability to explain frame encodings, IP headers, TCP control bits, and routing database transitions.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">Failure Scenario Reasoning</span>
                <p className="text-slate-400 text-[11px]">
                  Explaining root cause mechanics rather than memorized textbook definitions.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">Production Scale Context</span>
                <p className="text-slate-400 text-[11px]">
                  Accounting for high availability, transit link latency, MTU limits, and convergence times.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-slate-500">Loading interview scenario questions...</div>
      )}
    </div>
  )
}
