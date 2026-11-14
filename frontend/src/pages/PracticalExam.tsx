import React, { useEffect, useState } from 'react'
import {
  FileCheck2,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Code2,
  Sliders,
  Sparkles,
  Terminal,
  AlertCircle,
  BookOpen,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/services/api'

export const PracticalExam: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'theory' | 'lab'>('theory')

  // Theory MCQ state
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Lab Practical state
  const [labScenario, setLabScenario] = useState<string>('Enterprise OSPF & Interface Hardening Lab')
  const [deviceName, setDeviceName] = useState<string>('R1-Core')
  const [configText, setConfigText] = useState<string>(`hostname R1-Core
!
interface GigabitEthernet0/0
 description WAN to Internet
 ip address 203.0.113.1 255.255.255.252
 no shutdown
!
interface GigabitEthernet0/1
 description LAN Gateway
 ip address 10.10.10.1 255.255.255.0
 no shutdown
!
router ospf 1
 router-id 1.1.1.1
 network 10.10.10.0 0.0.0.255 area 0
 default-information originate
!
ip route 0.0.0.0 0.0.0.0 203.0.113.2
!
service password-encryption
line vty 0 4
 transport input ssh
 login local
!`)
  const [isGrading, setIsGrading] = useState<boolean>(false)
  const [labReport, setLabReport] = useState<any | null>(null)

  useEffect(() => {
    apiClient.getQuestions().then(setQuestions).catch(() => {})
  }, [])

  const handleSelectOption = (qId: number, optIdx: number) => {
    if (submitted) return
    setAnswers((prev) => ({ ...prev, [qId]: optIdx }))
  }

  const handleSubmitTheory = async () => {
    try {
      const resp = await apiClient.api.post('/assessments/evaluate', {
        assessment_id: 'CCNA-MOCK-01',
        answers,
      })
      setScore(resp.data.score_percent)
      setFeedback(resp.data.feedback)
      setSubmitted(true)
    } catch {
      let correct = 0
      questions.forEach((q) => {
        if (answers[q.id] === q.correct_answer) correct++
      })
      const pct = Math.round((correct / (questions.length || 1)) * 100)
      setScore(pct)
      setFeedback('Assessment completed. Solid understanding of CCNA enterprise routing protocols.')
      setSubmitted(true)
    }
  }

  const handleGradeLab = async () => {
    setIsGrading(true)
    try {
      const resp = await apiClient.gradeLab({
        lab_id: 'ccna-lab-01',
        task_title: labScenario,
        device_name: deviceName,
        config_text: configText,
      })
      setLabReport(resp)
    } catch (err: any) {
      alert(`Grading failed: ${err.message}`)
    } finally {
      setIsGrading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileCheck2 className="h-6 w-6 text-emerald-400" />
            CCNA / CCNP Practical Examination & Lab Grading Simulator
          </h1>
          <p className="text-sm text-slate-400">
            Automated scoring against official Cisco blueprints with hands-on CLI configuration verification.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
          <button
            onClick={() => setActiveTab('theory')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'theory'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Theory Assessment (MCQ)
          </button>
          <button
            onClick={() => setActiveTab('lab')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'lab'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Hands-On Lab Practical
          </button>
        </div>
      </div>

      {activeTab === 'theory' ? (
        <div className="space-y-6">
          {score !== null && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Award className="h-8 w-8 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Examination Result: {score}%</h3>
                  <p className="text-xs text-slate-300">{feedback}</p>
                </div>
              </div>
              <Badge variant={score >= 75 ? 'success' : 'destructive'} className="text-xs px-3 py-1 font-bold">
                {score >= 75 ? 'PASSED (CCNA CERTIFIED)' : 'RETAKE RECOMMENDED'}
              </Badge>
            </div>
          )}

          <div className="space-y-6">
            {questions.map((q, idx) => (
              <Card key={q.id} className="p-5 space-y-4 bg-[#090d16] border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white text-xs">
                    Question {idx + 1} of {questions.length}
                  </span>
                  <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">
                    {q.category}
                  </Badge>
                </div>

                <p className="text-sm font-semibold text-slate-100">{q.question}</p>

                <div className="space-y-2">
                  {q.options.map((opt: string, optIdx: number) => {
                    const isSelected = answers[q.id] === optIdx
                    const isCorrect = q.correct_answer === optIdx
                    let optStyle = 'border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-850'

                    if (submitted) {
                      if (isCorrect) {
                        optStyle = 'border-emerald-500 bg-emerald-950/40 text-emerald-300 font-semibold'
                      } else if (isSelected && !isCorrect) {
                        optStyle = 'border-red-500 bg-red-950/40 text-red-300 line-through'
                      }
                    } else if (isSelected) {
                      optStyle = 'border-blue-500 bg-blue-600/20 text-blue-300 font-semibold'
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${optStyle}`}
                      >
                        <span>{opt}</span>
                        {submitted && isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                        {submitted && isSelected && !isCorrect && (
                          <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>

                {submitted && (
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                    <strong className="text-emerald-400 block mb-0.5">Explanation:</strong>
                    {q.explanation}
                  </div>
                )}
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4">
            {submitted ? (
              <Button
                onClick={() => {
                  setAnswers({})
                  setSubmitted(false)
                  setScore(null)
                }}
                variant="outline"
                className="gap-2 text-xs"
              >
                <RotateCcw className="h-4 w-4" />
                Retake Examination
              </Button>
            ) : (
              <Button
                onClick={handleSubmitTheory}
                disabled={Object.keys(answers).length < questions.length}
                className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-xs text-white"
              >
                Submit Examination for Grading
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Hands-on Lab Practical Tab */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-[#090d16] border-slate-800 p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Sliders className="h-5 w-5 text-blue-400" />
                <h3 className="font-bold text-white text-sm">Lab Objective & Specification</h3>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Target Certification Task</label>
                <select
                  value={labScenario}
                  onChange={(e) => setLabScenario(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Enterprise OSPF & Interface Hardening Lab">
                    Task 1: OSPF Multi-Area & Edge Gateway Propagation
                  </option>
                  <option value="VLAN Trunking & Inter-VLAN ROAS Configuration">
                    Task 2: VLAN Trunking & Router-on-a-Stick
                  </option>
                  <option value="NAT Overload & ACL Security Policy">
                    Task 3: Dynamic PAT Overload & Extended ACL Hardening
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Target Device Identifier</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
                />
              </div>

              <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800/80 text-xs text-slate-300 space-y-2">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                  Grading Rubric (100 Points Total)
                </div>
                <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                  <li>Device hostname configured (20 pts)</li>
                  <li>Interface IP addressing & active state (20 pts)</li>
                  <li>OSPFv2 routing process & network statements (20 pts)</li>
                  <li>Default route propagation (20 pts)</li>
                  <li>SSH & password encryption controls (20 pts)</li>
                </ul>
              </div>

              <Button
                onClick={handleGradeLab}
                disabled={isGrading || !configText.trim()}
                className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-xs text-white shadow-md shadow-blue-500/20"
              >
                <Sparkles className="h-4 w-4" />
                {isGrading ? 'Grading Configuration...' : 'Grade My Configuration'}
              </Button>
            </Card>

            <Card className="lg:col-span-2 bg-[#090d16] border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-bold text-white text-sm">Cisco IOS Candidate Running Configuration</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">device: {deviceName}</span>
              </div>

              <textarea
                rows={14}
                value={configText}
                onChange={(e) => setConfigText(e.target.value)}
                className="w-full font-mono text-xs bg-slate-950 border border-slate-800 rounded-xl p-4 text-emerald-400 focus:outline-none focus:border-blue-500 leading-relaxed shadow-inner"
              />
            </Card>
          </div>

          {/* Scored Evaluation Report Card */}
          {labReport && (
            <Card className="bg-[#0b101c] border-slate-800 p-6 space-y-5 shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-white text-lg flex items-center gap-2">
                    <Award className="h-6 w-6 text-emerald-400" />
                    Automated Lab Practical Scorecard: {labReport.task_title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Evaluated device: <strong className="text-white font-mono">{labReport.device_name}</strong> • Total Points: <strong className="text-white">{labReport.total_score} / {labReport.max_score}</strong>
                  </p>
                </div>
                <Badge
                  variant={labReport.passed ? 'success' : 'destructive'}
                  className="text-sm px-4 py-1.5 font-bold"
                >
                  Score: {labReport.score_percent}% ({labReport.passed ? 'PASSED' : 'RETAKE RECOMMENDED'})
                </Badge>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300">
                <strong>Summary Feedback:</strong> {labReport.summary_feedback}
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Detailed Criteria Breakdown</h4>
                <div className="grid grid-cols-1 gap-3">
                  {labReport.evaluation_breakdown?.map((obj: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                        obj.passed
                          ? 'border-emerald-500/30 bg-emerald-950/15 text-slate-200'
                          : 'border-red-500/30 bg-red-950/15 text-slate-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-white flex items-center gap-2">
                          {obj.passed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                          )}
                          {obj.title}
                        </div>
                        <p className="text-[11px] text-slate-400">{obj.details}</p>
                        {obj.recommendation && (
                          <p className="text-[11px] text-amber-400 font-mono">Tip: {obj.recommendation}</p>
                        )}
                      </div>

                      <Badge
                        variant={obj.passed ? 'success' : 'destructive'}
                        className="self-start md:self-center shrink-0 font-mono"
                      >
                        {obj.points_awarded} / {obj.points_possible} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
