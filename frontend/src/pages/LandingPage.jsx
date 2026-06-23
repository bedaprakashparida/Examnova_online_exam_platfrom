import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import LogoIcon from '../components/common/LogoIcon'

// ── Animated Counter ──────────────────────────────────────────────────────────
function Counter({ target, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const start = performance.now()
        const animate = (now) => {
          const elapsed = now - start
          const progress = Math.min(elapsed / duration, 1)
          const ease = 1 - Math.pow(1 - progress, 3)
          setCount(Math.floor(ease * target))
          if (progress < 1) requestAnimationFrame(animate)
        }
        requestAnimationFrame(animate)
      }
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

// ── Floating Particle ─────────────────────────────────────────────────────────
function Particle({ style }) {
  return <div className="landing-particle" style={style} />
}

// ── Feature Card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, description, delay }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setVisible(true)
    }, { threshold: 0.2 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className="feature-card"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(40px)',
        transition: `all 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      <div className="feature-icon">{icon}</div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-desc">{description}</p>
    </div>
  )
}

// ── Main Landing Page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()
  const [scrollY, setScrollY] = useState(0)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    const onMouse = (e) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('scroll', onScroll)
    window.addEventListener('mousemove', onMouse)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('mousemove', onMouse)
    }
  }, [])

  const parallaxY = scrollY * 0.4
  const glowX = (mousePos.x / (window.innerWidth || 1) - 0.5) * 40
  const glowY = (mousePos.y / (window.innerHeight || 1) - 0.5) * 40

  const particles = Array.from({ length: 18 }, (_, i) => ({
    width: `${4 + (i % 5)}px`,
    height: `${4 + (i % 5)}px`,
    left: `${(i * 5.5) % 100}%`,
    top: `${(i * 7.3) % 100}%`,
    animationDelay: `${(i * 0.9) % 8}s`,
    animationDuration: `${10 + (i % 8)}s`,
    opacity: 0.15 + (i % 4) * 0.08,
  }))

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Sora:wght@700;800;900&display=swap');

        .landing-root {
          font-family: 'Inter', sans-serif;
          background: #03020d;
          color: #f8fafc;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .landing-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 3rem;
          backdrop-filter: blur(20px);
          background: rgba(3,2,13,0.75);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }

        .landing-logo-container {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          cursor: pointer;
        }

        .landing-logo-text {
          font-family: 'Sora', sans-serif;
          font-size: 1.45rem;
          font-weight: 900;
          background: linear-gradient(135deg, #10b981, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .nav-links { display: flex; gap: 2rem; list-style: none; margin: 0; padding: 0; }
        .nav-links a { color: rgba(248,250,252,0.55); text-decoration: none; font-size: 0.875rem; font-weight: 500; transition: color 0.2s; }
        .nav-links a:hover { color: #f8fafc; }

        .nav-cta-group { display: flex; gap: 0.75rem; align-items: center; }

        .btn-ghost {
          padding: 0.5rem 1.25rem; border-radius: 10px; font-size: 0.875rem; font-weight: 600;
          color: rgba(248,250,252,0.55); background: transparent;
          border: 1px solid rgba(255,255,255,0.1); cursor: pointer; transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .btn-ghost:hover { color: #f8fafc; border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); }

        .btn-glow {
          padding: 0.5rem 1.35rem; border-radius: 10px; font-size: 0.875rem; font-weight: 700;
          background: linear-gradient(135deg, #7c3aed, #06b6d4); color: white; border: none;
          cursor: pointer; transition: all 0.3s; box-shadow: 0 0 20px rgba(124,58,237,0.4);
          font-family: 'Inter', sans-serif;
        }
        .btn-glow:hover { box-shadow: 0 0 35px rgba(124,58,237,0.65); transform: translateY(-1px); }

        .hero-section {
          position: relative; min-height: 100vh;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center; padding: 8rem 1.5rem 4rem; overflow: hidden;
        }

        .hero-glow-orb { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; }
        .orb-1 { width: 600px; height: 600px; background: radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%); top: -100px; left: -100px; }
        .orb-2 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(6,182,212,0.22) 0%, transparent 70%); bottom: -100px; right: -100px; }
        .orb-3 { width: 250px; height: 250px; background: radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%); top: 40%; left: 60%; }

        .hero-badge {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.4rem 1rem; border-radius: 100px;
          background: rgba(124,58,237,0.13); border: 1px solid rgba(124,58,237,0.35);
          font-size: 0.78rem; font-weight: 600; color: #a78bfa; margin-bottom: 1.5rem;
          animation: lp-fadeDown 0.8s ease both;
        }
        .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #a78bfa; animation: lp-pulse 2s ease infinite; }

        .hero-title {
          font-family: 'Sora', sans-serif;
          font-size: clamp(2.8rem, 7vw, 5.5rem);
          font-weight: 900; line-height: 1.05; letter-spacing: -2px; margin: 0 0 1.25rem;
          animation: lp-fadeDown 0.9s ease 0.1s both;
        }
        .gradient-text {
          background: linear-gradient(135deg, #a78bfa 0%, #06b6d4 50%, #f59e0b 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-size: 200% 200%; animation: lp-gradient 4s ease infinite;
        }

        .hero-subtitle {
          font-size: clamp(1rem, 2vw, 1.15rem); color: rgba(248,250,252,0.55);
          max-width: 580px; margin: 0 auto 2.5rem; line-height: 1.7;
          animation: lp-fadeDown 1s ease 0.2s both;
        }

        .hero-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; animation: lp-fadeDown 1.1s ease 0.3s both; }

        .btn-hero-primary {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.875rem 2rem; border-radius: 14px; font-size: 1rem; font-weight: 700;
          background: linear-gradient(135deg, #7c3aed, #5b21b6); color: white; border: none;
          cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 25px rgba(124,58,237,0.45);
          font-family: 'Inter', sans-serif;
        }
        .btn-hero-primary:hover { transform: translateY(-3px); box-shadow: 0 8px 40px rgba(124,58,237,0.65); }

        .btn-hero-outline {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.875rem 2rem; border-radius: 14px; font-size: 1rem; font-weight: 700;
          background: transparent; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15);
          cursor: pointer; transition: all 0.3s; font-family: 'Inter', sans-serif;
        }
        .btn-hero-outline:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.3); transform: translateY(-3px); }

        .hero-visual { max-width: 900px; width: 100%; margin: 4rem auto 0; animation: lp-fadeUp 1.2s ease 0.4s both; }
        .mockup-frame {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
          border-radius: 20px; padding: 1.5rem; backdrop-filter: blur(20px);
          box-shadow: 0 40px 100px rgba(0,0,0,0.6);
          position: relative; overflow: hidden;
        }
        .mockup-frame::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background: linear-gradient(90deg, transparent, rgba(124,58,237,0.6), rgba(6,182,212,0.6), transparent); }
        .mockup-topbar { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.25rem; }
        .mockup-dot { width: 12px; height: 12px; border-radius: 50%; }
        .mockup-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 0.75rem; margin-bottom: 1rem; }
        .mockup-stat { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 1rem; text-align: left; }
        .mockup-stat-label { font-size: 0.7rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; }
        .mockup-stat-value { font-size: 1.5rem; font-weight: 800; font-family: 'Sora', sans-serif; }
        .mockup-chart-area { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 1rem; height: 90px; display: flex; align-items: flex-end; gap: 0.35rem; overflow: hidden; }
        .chart-bar { flex: 1; border-radius: 4px 4px 0 0; transform-origin: bottom; animation: lp-barGrow 1.2s ease backwards; }

        .stats-strip { padding: 4rem 2rem; }
        .stats-inner { max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap: 1.5rem; text-align: center; }
        .stat-item { padding: 2rem 1rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; transition: all 0.3s; }
        .stat-item:hover { border-color: rgba(124,58,237,0.4); background: rgba(124,58,237,0.06); transform: translateY(-4px); }
        .stat-number { font-family: 'Sora', sans-serif; font-size: 2.75rem; font-weight: 900; background: linear-gradient(135deg, #a78bfa, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; line-height: 1; margin-bottom: 0.5rem; }
        .stat-label { color: rgba(248,250,252,0.55); font-size: 0.875rem; font-weight: 500; }

        .features-section { padding: 5rem 2rem; max-width: 1200px; margin: 0 auto; }
        .section-tag { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.9rem; border-radius: 100px; background: rgba(6,182,212,0.1); border: 1px solid rgba(6,182,212,0.3); font-size: 0.75rem; font-weight: 600; color: #06b6d4; margin-bottom: 1rem; }
        .section-title { font-family: 'Sora', sans-serif; font-size: clamp(1.8rem,4vw,2.8rem); font-weight: 800; letter-spacing: -1px; margin-bottom: 0.75rem; }
        .section-desc { color: rgba(248,250,252,0.55); font-size: 1rem; max-width: 500px; line-height: 1.7; margin-bottom: 3rem; }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px,1fr)); gap: 1.25rem; }
        .feature-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 1.75rem; transition: border-color 0.3s, background 0.3s, transform 0.3s, box-shadow 0.3s; }
        .feature-card:hover { border-color: rgba(124,58,237,0.35); background: rgba(124,58,237,0.05); transform: translateY(-6px); box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
        .feature-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 1.1rem; background: rgba(124,58,237,0.13); border: 1px solid rgba(124,58,237,0.22); }
        .feature-title { font-size: 1.05rem; font-weight: 700; margin-bottom: 0.5rem; color: #f8fafc; }
        .feature-desc { color: rgba(248,250,252,0.55); font-size: 0.875rem; line-height: 1.65; }

        .how-section { padding: 5rem 2rem; background: rgba(255,255,255,0.015); border-top: 1px solid rgba(255,255,255,0.07); border-bottom: 1px solid rgba(255,255,255,0.07); }
        .how-inner { max-width: 900px; margin: 0 auto; }
        .steps-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap: 2rem; }
        .step-card { text-align: center; padding: 2rem 1rem; }
        .step-number { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #06b6d4); display: flex; align-items: center; justify-content: center; font-family: 'Sora', sans-serif; font-size: 1.25rem; font-weight: 800; color: white; margin: 0 auto 1.25rem; box-shadow: 0 0 0 8px rgba(124,58,237,0.1); }
        .step-title { font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; color: #f8fafc; }
        .step-desc { color: rgba(248,250,252,0.55); font-size: 0.85rem; line-height: 1.6; }

        .roles-section { padding: 5rem 2rem; max-width: 1200px; margin: 0 auto; }
        .roles-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px,1fr)); gap: 1.5rem; }
        .role-card { border-radius: 24px; padding: 2.5rem; border: 1px solid rgba(255,255,255,0.08); cursor: pointer; transition: all 0.35s cubic-bezier(0.22,1,0.36,1); position: relative; overflow: hidden; }
        .role-card:hover { transform: translateY(-8px) scale(1.02); }
        .role-card-admin { background: linear-gradient(135deg, rgba(124,58,237,0.13), rgba(76,29,149,0.07)); }
        .role-card-admin:hover { border-color: rgba(124,58,237,0.5); box-shadow: 0 20px 60px rgba(124,58,237,0.22); }
        .role-card-teacher { background: linear-gradient(135deg, rgba(6,182,212,0.1), rgba(14,116,144,0.05)); }
        .role-card-teacher:hover { border-color: rgba(6,182,212,0.5); box-shadow: 0 20px 60px rgba(6,182,212,0.18); }
        .role-card-student { background: linear-gradient(135deg, rgba(245,158,11,0.1), rgba(180,83,9,0.05)); }
        .role-card-student:hover { border-color: rgba(245,158,11,0.5); box-shadow: 0 20px 60px rgba(245,158,11,0.18); }
        .role-emoji { font-size: 2.5rem; margin-bottom: 1rem; }
        .role-name { font-family: 'Sora', sans-serif; font-size: 1.4rem; font-weight: 800; margin-bottom: 0.5rem; color: #f8fafc; }
        .role-desc { color: rgba(248,250,252,0.55); font-size: 0.875rem; line-height: 1.65; margin-bottom: 1.5rem; }
        .role-features { list-style: none; padding: 0; margin: 0 0 1.75rem; display: flex; flex-direction: column; gap: 0.4rem; }
        .role-features li { font-size: 0.82rem; color: rgba(248,250,252,0.55); display: flex; align-items: center; gap: 0.5rem; }
        .role-features li::before { content: '✓'; color: #a78bfa; font-weight: 700; }
        .role-btn { width: 100%; padding: 0.75rem; border-radius: 12px; font-size: 0.875rem; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; }
        .role-btn-admin { background: linear-gradient(135deg, #7c3aed, #5b21b6); color: white; }
        .role-btn-admin:hover { box-shadow: 0 6px 20px rgba(124,58,237,0.5); transform: translateY(-2px); }
        .role-btn-teacher { background: linear-gradient(135deg, #06b6d4, #0284c7); color: white; }
        .role-btn-teacher:hover { box-shadow: 0 6px 20px rgba(6,182,212,0.5); transform: translateY(-2px); }
        .role-btn-student { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; }
        .role-btn-student:hover { box-shadow: 0 6px 20px rgba(245,158,11,0.5); transform: translateY(-2px); }

        .cta-section { padding: 6rem 2rem; text-align: center; position: relative; overflow: hidden; }
        .cta-glow { position: absolute; width: 600px; height: 400px; border-radius: 50%; filter: blur(80px); background: radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%); top: 50%; left: 50%; transform: translate(-50%,-50%); pointer-events: none; }
        .cta-title { font-family: 'Sora', sans-serif; font-size: clamp(2rem,5vw,3.5rem); font-weight: 900; letter-spacing: -1px; margin-bottom: 1rem; position: relative; }
        .cta-desc { color: rgba(248,250,252,0.55); font-size: 1.05rem; max-width: 500px; margin: 0 auto 2.5rem; line-height: 1.7; position: relative; }

        .landing-footer { padding: 2rem 3rem; border-top: 1px solid rgba(255,255,255,0.07); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
        .footer-copy { color: rgba(255,255,255,0.28); font-size: 0.8rem; }

        .landing-particle { position: absolute; border-radius: 50%; background: rgba(167,139,250,0.35); animation: lp-float linear infinite; pointer-events: none; }

        @keyframes lp-fadeDown { from { opacity:0; transform:translateY(-24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes lp-fadeUp { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
        @keyframes lp-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.85); } }
        @keyframes lp-gradient { 0% { background-position:0% 50%; } 50% { background-position:100% 50%; } 100% { background-position:0% 50%; } }
        @keyframes lp-float { 0% { transform:translateY(0) rotate(0deg); opacity:0; } 10% { opacity:1; } 90% { opacity:1; } 100% { transform:translateY(-100vh) rotate(720deg); opacity:0; } }
        @keyframes lp-barGrow { from { transform:scaleY(0); } to { transform:scaleY(1); } }

        @media (max-width: 768px) {
          .landing-nav { padding: 1rem 1.5rem; }
          .nav-links { display: none; }
          .mockup-stats { grid-template-columns: repeat(2,1fr); }
          .mockup-chart-area { height: 60px; }
        }
      `}</style>

      <div className="landing-root">
        {/* NAV */}
        <nav className="landing-nav">
          <div className="landing-logo-container" onClick={() => navigate('/')}>
            <LogoIcon className="w-8 h-8 flex-shrink-0" />
            <span className="landing-logo-text">ExamNova</span>
          </div>
          <ul className="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#how">How it works</a></li>
            <li><a href="#roles">Portals</a></li>
          </ul>
          <div className="nav-cta-group">
            <button className="btn-ghost" onClick={() => navigate('/login')}>Sign in</button>
            <button className="btn-glow" onClick={() => navigate('/login')}>Get Started →</button>
          </div>
        </nav>

        {/* HERO */}
        <section className="hero-section">
          <div className="hero-glow-orb orb-1" style={{ transform: `translate(${glowX * 0.5}px, ${glowY * 0.5}px)`, transition: 'transform 0.2s ease' }} />
          <div className="hero-glow-orb orb-2" style={{ transform: `translate(${-glowX * 0.3}px, ${-glowY * 0.3}px)`, transition: 'transform 0.2s ease' }} />
          <div className="hero-glow-orb orb-3" style={{ transform: `translate(${glowX * 0.7}px, ${-glowY * 0.7}px)`, transition: 'transform 0.2s ease' }} />
          {particles.map((p, i) => <Particle key={i} style={p} />)}

          <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
            <div className="hero-badge">
              <span className="badge-dot" />
              Next-generation exam platform
            </div>
            <h1 className="hero-title">
              Secure Exams<br />
              <span className="gradient-text">Smarter. Faster. Fairer.</span>
            </h1>
            <p className="hero-subtitle">
              Create, manage, and deliver tamper-proof online exams with smart digital invitations,
              real-time analytics, and instant result reports — all in one beautiful platform.
            </p>
            <div className="hero-actions">
              <button className="btn-hero-primary" onClick={() => navigate('/login')}>
                🚀 Student Portal
              </button>
              <button className="btn-hero-outline" onClick={() => navigate('/teacher/login')}>
                🎓 Teacher Portal →
              </button>
            </div>

            {/* Dashboard Mockup */}
            <div className="hero-visual" style={{ transform: `translateY(${parallaxY * 0.08}px)` }}>
              <div className="mockup-frame">
                <div className="mockup-topbar">
                  <div className="mockup-dot" style={{ background: '#ef4444' }} />
                  <div className="mockup-dot" style={{ background: '#f59e0b' }} />
                  <div className="mockup-dot" style={{ background: '#22c55e' }} />
                  <span style={{ marginLeft: '1rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>ExamNova — Teacher Dashboard</span>
                </div>
                <div className="mockup-stats">
                  {[
                    { label: 'My Exams', value: '12', color: '#a78bfa' },
                    { label: 'Students', value: '240', color: '#06b6d4' },
                    { label: 'Pass Rate', value: '87%', color: '#22c55e' },
                    { label: 'Avg Score', value: '76%', color: '#f59e0b' },
                  ].map((s, i) => (
                    <div className="mockup-stat" key={i}>
                      <div className="mockup-stat-label">{s.label}</div>
                      <div className="mockup-stat-value" style={{ color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                <div className="mockup-chart-area">
                  {[60, 40, 75, 55, 90, 65, 80, 70, 88, 50, 95, 72].map((h, i) => (
                    <div key={i} className="chart-bar" style={{
                      height: `${h}%`,
                      background: `linear-gradient(180deg, ${i % 3 === 0 ? '#a78bfa' : i % 3 === 1 ? '#06b6d4' : '#f59e0b'}, transparent)`,
                      animationDelay: `${i * 0.08 + 0.5}s`,
                    }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="stats-strip" id="stats">
          <div className="stats-inner">
            {[
              { num: 101, suffix: '+', label: 'Students Onboarded' },
              { num: 45, suffix: '+', label: 'Active Teachers' },
              { num: 3, suffix: '', label: 'Live Exams' },
              { num: 99, suffix: '%', label: 'Email Delivery Rate' },
            ].map((s, i) => (
              <div className="stat-item" key={i}>
                <div className="stat-number"><Counter target={s.num} suffix={s.suffix} /></div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section className="features-section" id="features">
          <div className="section-tag">✦ Features</div>
          <h2 className="section-title">Everything you need<br />to run perfect exams</h2>
          <p className="section-desc">From secure token-based access to rich analytics — built for educators who care about quality.</p>
          <div className="features-grid">
            {[
              { icon: '🔐', title: 'Secure Access Control', description: 'One-time secure secure tokens ensure only invited students can access their exam. No passwords, no confusion.', delay: 0 },
              { icon: '📧', title: 'Email Invitations', description: 'Send personalized exam invitations with secure tokens directly to students via your own Gmail account.', delay: 100 },
              { icon: '📊', title: 'Real-time Analytics', description: 'Live dashboards showing attendance, scores, grade distribution, and pass/fail ratios as they happen.', delay: 200 },
              { icon: '🏆', title: 'Instant Results', description: 'Students get results the moment they submit. Detailed report cards with grades, score, and feedback.', delay: 300 },
              { icon: '👩‍🏫', title: 'Multi-Teacher Support', description: 'Each teacher manages their own classes and exams in complete isolation. No data crossover.', delay: 400 },
              { icon: '📄', title: 'PDF & CSV Export', description: 'Export result reports as PDF or CSV for record-keeping, parent meetings, and institution submissions.', delay: 500 },
              { icon: '🛡️', title: 'Anti-Cheating', description: 'Full-screen mode enforcement, activity logging, and tab-switch detection for exam integrity.', delay: 600 },
              { icon: '📱', title: 'Smart Verification', description: 'Verify student secure tokens at exam venues using any device camera for quick and secure entry.', delay: 700 },
              { icon: '🎨', title: 'Beautiful Interface', description: 'Stunning dark/light mode UI with smooth animations — a professional experience for everyone.', delay: 800 },
            ].map((f, i) => <FeatureCard key={i} {...f} />)}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="how-section" id="how">
          <div className="how-inner">
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div className="section-tag">🗺️ Process</div>
              <h2 className="section-title">How it works</h2>
              <p className="section-desc" style={{ margin: '0 auto' }}>Get from zero to a fully managed exam in four simple steps.</p>
            </div>
            <div className="steps-grid">
              {[
                { n: '1', title: 'Create Exam', desc: 'Set title, duration, start & end time. Add questions or bulk upload via CSV.' },
                { n: '2', title: 'Invite Students', desc: 'Select a class and send digital invitations via email in one click.' },
                { n: '3', title: 'Conduct Exam', desc: 'Students access via their unique invite link. The system enforces time limits and integrity rules.' },
                { n: '4', title: 'View Results', desc: 'Auto-graded results with grade distribution, rankings, and downloadable reports.' },
              ].map((s, i) => (
                <div className="step-card" key={i}>
                  <div className="step-number">{s.n}</div>
                  <div className="step-title">{s.title}</div>
                  <p className="step-desc">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ROLE CARDS */}
        <section className="roles-section" id="roles">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="section-tag">👥 Portals</div>
            <h2 className="section-title">Built for every role</h2>
            <p className="section-desc" style={{ margin: '0 auto' }}>Tailored dashboards and tools for each type of user.</p>
          </div>
          <div className="roles-grid">
            {[
              { cls: 'admin', emoji: '👑', name: 'Admin', desc: 'Full control over the entire platform — manage teachers, view all classes, monitor all exams system-wide.', features: ['Manage all teachers & staff', 'View all exams & classrooms', 'System-wide analytics', 'Configure SMTP & settings'], btnCls: 'role-btn-admin', btnText: 'Admin Login →', path: '/admin/login' },
              { cls: 'teacher', emoji: '🎓', name: 'Teacher', desc: 'Create and manage your own classes, conduct exams, send digital invitations, and analyze student performance.', features: ['Create & manage classes', 'Design exams & question banks', 'Send digital invitations via email', 'View detailed performance analytics'], btnCls: 'role-btn-teacher', btnText: 'Teacher Login →', path: '/teacher/login' },
              { cls: 'student', emoji: '📚', name: 'Student', desc: 'Access exams via your personalized secure exam link, complete them securely, and see instant results.', features: ['Access exam with secure link or link', 'Take fully timed secure exams', 'Instant results & grade report', 'Download result certificate PDF'], btnCls: 'role-btn-student', btnText: 'Student Login →', path: '/login' },
            ].map((r, i) => (
              <div className={`role-card role-card-${r.cls}`} key={i}>
                <div className="role-emoji">{r.emoji}</div>
                <div className="role-name">{r.name}</div>
                <p className="role-desc">{r.desc}</p>
                <ul className="role-features">{r.features.map((f, j) => <li key={j}>{f}</li>)}</ul>
                <button className={`role-btn ${r.btnCls}`} onClick={() => navigate(r.path)}>{r.btnText}</button>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section">
          <div className="cta-glow" />
          <h2 className="cta-title">Ready to transform<br />your exams?</h2>
          <p className="cta-desc">Join educators already using ExamNova to deliver secure, beautiful, data-rich exams.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
            <button className="btn-hero-primary" onClick={() => navigate('/teacher/login')}>🎓 Teacher Portal</button>
            <button className="btn-hero-outline" onClick={() => navigate('/login')}>📚 Student Login</button>
            <button className="btn-ghost" onClick={() => navigate('/admin/login')}>🛡️ Admin</button>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="landing-footer">
          <div className="landing-logo-container" onClick={() => navigate('/')}>
            <LogoIcon className="w-7 h-7 flex-shrink-0" />
            <span className="landing-logo-text" style={{ fontSize: '1.25rem' }}>ExamNova</span>
          </div>
          <div className="footer-copy">© 2026 ExamNova · Built with ❤️ for educators</div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {[['Student', '/login'], ['Teacher', '/teacher/login'], ['Admin', '/admin/login']].map(([l, p]) => (
              <button key={l} className="btn-ghost" onClick={() => navigate(p)} style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>{l}</button>
            ))}
          </div>
        </footer>
      </div>
    </>
  )
}
