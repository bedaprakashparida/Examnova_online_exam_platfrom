import { useState, useEffect } from 'react'
import { ArrowPathIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

export default function Captcha({ onVerify }) {
  const [num1, setNum1] = useState(0)
  const [num2, setNum2] = useState(0)
  const [answer, setAnswer] = useState('')
  const [isValid, setIsValid] = useState(false)

  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 10) + 1
    const n2 = Math.floor(Math.random() * 10) + 1
    setNum1(n1)
    setNum2(n2)
    setAnswer('')
    setIsValid(false)
    onVerify(false)
  }

  useEffect(() => {
    generateCaptcha()
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setAnswer(val)
    const valid = parseInt(val) === num1 + num2
    setIsValid(valid)
    onVerify(valid)
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
        <ShieldCheckIcon className="w-4 h-4 text-emerald-500" />
        Security Verification
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2 font-mono text-lg font-bold text-slate-700 dark:text-slate-200 text-center tracking-widest flex items-center justify-center shadow-inner">
          {num1} + {num2} = ?
        </div>
        <button 
          type="button" 
          onClick={generateCaptcha}
          className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title="Refresh Captcha"
        >
          <ArrowPathIcon className="w-5 h-5" />
        </button>
      </div>
      <input 
        type="number" 
        value={answer}
        onChange={handleChange}
        placeholder="Enter the result"
        className="mt-3 w-full input-field text-center font-bold"
        required
      />
      {answer && (
        <p className={`text-xs mt-2 text-center font-medium ${isValid ? 'text-emerald-500' : 'text-red-500'}`}>
          {isValid ? '✓ Verification passed' : '✗ Incorrect result'}
        </p>
      )}
    </div>
  )
}
