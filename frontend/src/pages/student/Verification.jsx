import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { invitationsAPI, studentsAPI, resultsAPI, authAPI } from '../../services/api'
import {
  CheckCircleIcon, ExclamationCircleIcon, CameraIcon,
  MicrophoneIcon, ArrowsPointingOutIcon, AcademicCapIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const STEPS = [
  { id: 1, label: 'Identity', icon: '🎓' },
  { id: 2, label: 'Capture Photo', icon: '📸' },
  { id: 3, label: 'Camera Access', icon: '📹' },
  { id: 4, label: 'Microphone', icon: '🎙️' },
  { id: 5, label: 'Fullscreen', icon: '⛶' },
  { id: 6, label: 'Start Exam', icon: '🚀' },
]

export default function Verification() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { user, login } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [examData, setExamData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [autoLoggingIn, setAutoLoggingIn] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [cameraStream, setCameraStream] = useState(null)
  const [micGranted, setMicGranted] = useState(false)
  const [cameraGranted, setCameraGranted] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  // On mount: verify QR token + auto-login student if not authenticated
  useEffect(() => {
    if (!token) {
      setError('No QR token found in URL. Please scan a valid QR code or use your exam link.')
      return
    }

    const init = async () => {
      try {
        // First verify the token to get exam info
        const { data } = await invitationsAPI.verifyQR(token)
        if (data.is_used) {
          setError('This exam link has already been used. Contact your teacher.')
          return
        }
        setExamData(data)

        // If student is not logged in → auto-login via exam token (no password!)
        if (!user || user.role !== 'student') {
          setAutoLoggingIn(true)
          try {
            const { data: authData } = await authAPI.examTokenLogin(token)
            login(authData)
            toast.success(`Welcome, ${authData.name}! Proceeding to exam…`)
          } catch {
            setError('Could not auto-login. The exam link may have expired.')
          } finally {
            setAutoLoggingIn(false)
          }
        }
      } catch {
        setError('Invalid or expired QR code. Please contact your teacher.')
      }
    }

    init()
  }, [token])

  // Start webcam
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      setCameraStream(stream)
      setCameraGranted(true)
      if (videoRef.current) videoRef.current.srcObject = stream
      return true
    } catch {
      return false
    }
  }, [])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop())
      setCameraStream(null)
    }
  }, [cameraStream])

  // Step 1: identity confirmed (auto-login handled above)
  const handleStep1 = () => {
    if (!examData) { setError('Invalid QR code.'); return }
    setError('')
    setStep(2)
    setTimeout(() => startCamera(), 300)
  }


  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d').drawImage(video, 0, 0)
    const photo = canvas.toDataURL('image/jpeg', 0.8)
    setCapturedPhoto(photo)

    // Save photo to student profile
    studentsAPI.updatePhoto({ photo_data: photo }).catch(() => {})
    toast.success('Photo captured!')
  }

  const handleStep2 = () => {
    if (!capturedPhoto) { toast.error('Please capture your photo first'); return }
    stopCamera()
    setStep(3)
    handleCameraPermission()
  }

  const handleCameraPermission = async () => {
    const ok = await startCamera()
    if (ok) {
      setCameraGranted(true)
      toast.success('Camera access granted')
    } else {
      setCameraGranted(false)
      toast.error('Camera access denied')
    }
  }

  const handleStep3 = () => {
    if (!cameraGranted) { toast.error('Camera access required to proceed'); return }
    setStep(4)
    handleMicPermission()
  }

  const handleMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
      setMicGranted(true)
      toast.success('Microphone access granted')
    } catch {
      setMicGranted(false)
      toast.error('Microphone access denied')
    }
  }

  const handleStep4 = () => {
    if (!micGranted) { toast.error('Microphone access required'); return }
    setStep(5)
  }

  const handleFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen()
      toast.success('Fullscreen activated!')
      setStep(6)
    } catch {
      toast.error('Fullscreen request failed. Please allow fullscreen.')
    }
  }

  const handleStartExam = async () => {
    setLoading(true)
    try {
      await resultsAPI.logActivity({
        exam_id: examData.exam_id,
        activity_type: 'exam_start',
        details: 'Verification complete, exam started',
      })
      stopCamera()
      navigate(`/student/exam/${examData.exam_id}`)
    } catch {
      toast.error('Failed to start exam')
    } finally {
      setLoading(false)
    }
  }

  // Error state
  if (error && !examData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950 to-slate-900
        flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
          <ExclamationCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-300 mb-6">{error}</p>
          <button onClick={() => navigate('/student')} className="btn-primary">
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!examData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">Verifying your exam access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-violet-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Exam Info Banner */}
        <div className="glass rounded-2xl p-4 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-violet-600 rounded-xl
            flex items-center justify-center flex-shrink-0">
            <AcademicCapIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white">{examData.exam_title}</h1>
            <p className="text-primary-200 text-sm">{examData.exam_duration} minutes · For: {examData.student_name}</p>
          </div>
        </div>

        {/* Step Progress */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between relative">
            {/* Progress line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-700 z-0">
              <div className="h-full bg-primary-500 transition-all duration-700"
                style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }} />
            </div>
            {STEPS.map((s) => (
              <div key={s.id} className="relative z-10 flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                  transition-all duration-500 border-2
                  ${step > s.id
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : step === s.id
                    ? 'bg-primary-600 border-primary-400 text-white animate-pulse'
                    : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}>
                  {step > s.id ? <CheckCircleIcon className="w-5 h-5" /> : s.icon}
                </div>
                <span className="text-xs mt-1.5 text-slate-400 hidden sm:block">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="glass rounded-2xl p-8 animate-fade-in">
          {/* Step 1: Identity (auto-login) */}
          {step === 1 && (
            <div className="text-center space-y-4">
              {autoLoggingIn ? (
                <>
                  <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <h2 className="text-xl font-bold text-white">Signing you in…</h2>
                  <p className="text-slate-300 text-sm">Verifying your exam link, please wait.</p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-2">🎓</div>
                  <h2 className="text-2xl font-bold text-white">Identity Confirmed</h2>
                  <p className="text-slate-300 text-sm">Your exam access has been verified via QR / email link.</p>
                  <div className="bg-slate-800 rounded-xl p-4 text-left space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Student Name:</span>
                      <span className="text-white font-semibold">{examData?.student_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Email:</span>
                      <span className="text-white">{examData?.student_email}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Exam:</span>
                      <span className="text-white font-semibold">{examData?.exam_title}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Duration:</span>
                      <span className="text-primary-300 font-medium">{examData?.exam_duration} minutes</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-center text-emerald-400 text-sm">
                    <CheckCircleIcon className="w-5 h-5" />
                    <span>No password required — you're in!</span>
                  </div>
                  {error && (
                    <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 flex items-center gap-2">
                      <ExclamationCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <p className="text-red-300 text-sm">{error}</p>
                    </div>
                  )}
                  <button onClick={handleStep1} disabled={!!error || autoLoggingIn}
                    className="btn-primary w-full disabled:opacity-50">
                    Continue to Photo Capture →
                  </button>
                </>
              )}
            </div>
          )}

          {/* Step 2: Photo Capture */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl mb-2">📸</div>
                <h2 className="text-xl font-bold text-white">Capture Your Photo</h2>
                <p className="text-slate-400 text-sm mt-1">This photo will be recorded for verification.</p>
              </div>
              <div className="relative rounded-xl overflow-hidden bg-slate-800 aspect-video max-w-xs mx-auto">
                {capturedPhoto ? (
                  <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                ) : (
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex gap-3">
                {!capturedPhoto ? (
                  <button onClick={handleCapturePhoto} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <CameraIcon className="w-5 h-5" /> Capture Photo
                  </button>
                ) : (
                  <>
                    <button onClick={() => setCapturedPhoto(null)} className="btn-secondary flex-1">
                      Retake
                    </button>
                    <button onClick={handleStep2} className="btn-primary flex-1">
                      Continue →
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Camera Permission */}
          {step === 3 && (
            <div className="text-center space-y-4">
              <div className="text-5xl mb-2">📹</div>
              <h2 className="text-xl font-bold text-white">Camera Access</h2>
              <p className="text-slate-400 text-sm">Camera must be active during the entire exam.</p>
              <div className={`rounded-xl p-4 flex items-center gap-3 ${cameraGranted
                ? 'bg-emerald-900/30 border border-emerald-700'
                : 'bg-slate-800 border border-slate-700'}`}>
                {cameraGranted
                  ? <><CheckCircleIcon className="w-6 h-6 text-emerald-400" /><span className="text-emerald-300 font-medium">Camera access granted ✓</span></>
                  : <><CameraIcon className="w-6 h-6 text-slate-400" /><span className="text-slate-300">Click below to grant camera access</span></>}
              </div>
              {!cameraGranted && (
                <button onClick={handleCameraPermission} className="btn-secondary w-full flex items-center justify-center gap-2">
                  <CameraIcon className="w-5 h-5" /> Grant Camera Access
                </button>
              )}
              <button onClick={handleStep3} disabled={!cameraGranted} className="btn-primary w-full disabled:opacity-50">
                Continue →
              </button>
            </div>
          )}

          {/* Step 4: Microphone */}
          {step === 4 && (
            <div className="text-center space-y-4">
              <div className="text-5xl mb-2">🎙️</div>
              <h2 className="text-xl font-bold text-white">Microphone Access</h2>
              <p className="text-slate-400 text-sm">Microphone will be monitored during the exam.</p>
              <div className={`rounded-xl p-4 flex items-center gap-3 ${micGranted
                ? 'bg-emerald-900/30 border border-emerald-700'
                : 'bg-slate-800 border border-slate-700'}`}>
                {micGranted
                  ? <><CheckCircleIcon className="w-6 h-6 text-emerald-400" /><span className="text-emerald-300 font-medium">Microphone access granted ✓</span></>
                  : <><MicrophoneIcon className="w-6 h-6 text-slate-400" /><span className="text-slate-300">Click below to grant microphone access</span></>}
              </div>
              {!micGranted && (
                <button onClick={handleMicPermission} className="btn-secondary w-full flex items-center justify-center gap-2">
                  <MicrophoneIcon className="w-5 h-5" /> Grant Microphone Access
                </button>
              )}
              <button onClick={handleStep4} disabled={!micGranted} className="btn-primary w-full disabled:opacity-50">
                Continue →
              </button>
            </div>
          )}

          {/* Step 5: Fullscreen */}
          {step === 5 && (
            <div className="text-center space-y-4">
              <div className="text-5xl mb-2">⛶</div>
              <h2 className="text-xl font-bold text-white">Enable Fullscreen</h2>
              <p className="text-slate-400 text-sm">The exam must be taken in fullscreen mode. Exiting will be logged.</p>
              <div className="bg-amber-900/20 border border-amber-700 rounded-xl p-4 text-left">
                <p className="text-amber-300 text-sm font-medium mb-2">⚠️ Exam Security Rules:</p>
                <ul className="text-amber-200 text-xs space-y-1">
                  <li>• Tab switching will be detected and logged</li>
                  <li>• Fullscreen exit will be logged</li>
                  <li>• Right-click and copy-paste are disabled</li>
                  <li>• Exam auto-submits when timer reaches zero</li>
                </ul>
              </div>
              <button onClick={handleFullscreen} className="btn-primary w-full flex items-center justify-center gap-2">
                <ArrowsPointingOutIcon className="w-5 h-5" /> Enter Fullscreen
              </button>
            </div>
          )}

          {/* Step 6: Start Exam */}
          {step === 6 && (
            <div className="text-center space-y-4">
              <div className="text-5xl mb-2">🚀</div>
              <h2 className="text-2xl font-bold text-white">Ready to Start!</h2>
              <p className="text-slate-300">All verifications complete. Click below to begin your exam.</p>
              <div className="bg-emerald-900/20 border border-emerald-700 rounded-xl p-4 space-y-2">
                {[
                  ['Exam', examData.exam_title],
                  ['Duration', `${examData.exam_duration} minutes`],
                  ['Student', examData.student_name],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-slate-400">{k}:</span>
                    <span className="text-white font-medium">{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 text-xs text-emerald-400">
                <CheckCircleIcon className="w-4 h-4" />
                <span>Email verified · Photo captured · Camera active · Microphone active · Fullscreen enabled</span>
              </div>
              <button onClick={handleStartExam} disabled={loading} className="btn-primary w-full text-lg py-4">
                {loading ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Starting...</>
                ) : '🚀 Begin Exam Now'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
