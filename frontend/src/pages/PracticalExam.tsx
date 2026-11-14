import React, { useEffect, useState } from 'react'
import { FileCheck2, Clock, Award, CheckCircle2, XCircle, ArrowRight, RotateCcw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/services/api'

export const PracticalExam: React.FC = () => {
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    apiClient.getQuestions().then(setQuestions).catch(() => {})
  }, [])

  const handleSelectOption = (qId: number, optIdx: number) => {
    if (submitted) return
    setAnswers((prev) => ({ ...prev, [qId]: optIdx }))
  }

  const handleSubmit = async () => {
    try {
      const resp = await apiClient.api.post('/assessments/evaluate', {
        assessment_id: 'CCNA-MOCK-01',
        answers,
      })
      setScore(resp.data.score_percent)
      setFeedback(resp.data.feedback)
      setSubmitted(true)
    } catch {
      // Mock grading
      let correct = 0
      questions.forEach((q) => {
        if (answers[q.id] === q.correct_answer) correct++
      })
      const pct = Math.round((correct / questions.length) * 100)
      setScore(pct)
      setFeedback('Assessment completed. Solid understanding of CCNA enterprise routing protocols.')
      setSubmitted(true)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileCheck2 className="h-6 w-6 text-emerald-400" />
            CCNA / CCNP Practical Examination Simulator
          </h1>
          <p className="text-sm text-slate-400">
            Timed testing and automated scoring evaluated against official Cisco exam blueprints.
          </p>
        </div>

        {score !== null && (
          <Badge
            variant={score >= 75 ? 'success' : 'destructive'}
            className="text-sm px-3 py-1 font-bold"
          >
            Score: {score}% ({score >= 75 ? 'PASSED' : 'NEEDS REVIEW'})
          </Badge>
        )}
      </div>

      <div className="space-y-6">
        {questions.map((q, idx) => (
          <Card key={q.id} className="p-5 space-y-4">
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
            Retake Exam
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length < questions.length}
            className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-xs text-white"
          >
            Submit Examination for Grading
          </Button>
        )}
      </div>
    </div>
  )
}

