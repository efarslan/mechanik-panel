"use client";

import { useState, useEffect, useRef } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getDownloadURL, getStorage, ref } from "firebase/storage";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useBusiness } from "@/context/BusinessContext";
import { Eye, EyeOff, ArrowRight, Zap, Shield, BarChart3 } from "lucide-react";
import "./login.css";

type AuthMode = "signin" | "signup";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HERO_STORAGE_PATH = "ui/login-hero.jpg";

function getFirebaseAuthError(err: unknown, mode: AuthMode): string {
  const code =
    typeof err === "object" &&
      err !== null &&
      "code" in err &&
      typeof (err as any).code === "string"
      ? (err as any).code
      : "";

  switch (code) {
    case "auth/invalid-email":
      return "Geçerli bir e-posta adresi girin.";
    case "auth/missing-password":
      return "Şifre alanı zorunludur.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-posta veya şifre hatalı.";
    case "auth/too-many-requests":
      return "Çok fazla deneme yapıldı. Lütfen biraz bekleyip tekrar deneyin.";
    case "auth/email-already-in-use":
      return "Bu e-posta ile zaten bir hesap var.";
    case "auth/weak-password":
      return "Daha güçlü bir şifre girin (en az 8 karakter).";
    case "auth/network-request-failed":
      return "Ağ bağlantısı hatası. İnternetinizi kontrol edin.";
    default:
      return mode === "signin"
        ? "Giriş işlemi başarısız oldu. Lütfen tekrar deneyin."
        : "Kayıt işlemi başarısız oldu. Lütfen tekrar deneyin.";
  }
}

const featureCards = [
  {
    icon: Zap,
    title: "Akıllı İş Takibi",
    desc: "Araç bazlı işleri, durumları ve notları tek ekranda yönetin.",
    theme: "amber",
  },
  {
    icon: BarChart3,
    title: "Anlık Dashboard",
    desc: "Aktif işler, ciro ve operasyonel uyarıları anında görün.",
    theme: "emerald",
  },
  {
    icon: Shield,
    title: "Güvenli Erişim",
    desc: "Müşteri ve araç kayıtlarına birkaç tıkla güvenle ulaşın.",
    theme: "indigo",
  },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [featureIndex, setFeatureIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const user = useAuth();
  const { business, loading: businessLoading } = useBusiness();

  useEffect(() => {
    if (!user) return;
    if (businessLoading) return;
    router.replace(business ? "/dashboard" : "/onboarding");
  }, [user, business, businessLoading, router]);

  useEffect(() => {
    const loadHero = async () => {
      try {
        const storage = getStorage();
        const url = await getDownloadURL(ref(storage, HERO_STORAGE_PATH));
        setHeroImageUrl(url);
      } catch {
        setHeroImageUrl(null);
      }
    };
    loadHero();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setFeatureIndex((prev) => (prev + 1) % featureCards.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  // Particle canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = canvas.offsetWidth);
    let h = (canvas.height = canvas.offsetHeight);

    const resize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", resize);

    const particles: {
      x: number; y: number; r: number;
      vx: number; vy: number; alpha: number; color: string;
    }[] = [];

    const colors = ["#f59e0b", "#10b981", "#6366f1", "#f97316"];

    for (let i = 0; i < 55; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.5 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      });
      // Draw connections
      ctx.globalAlpha = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255,255,255,${0.06 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const validateForm = () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) return "E-posta ve şifre zorunludur.";
    if (!emailRegex.test(cleanEmail)) return "Geçerli bir e-posta adresi girin.";
    if (mode === "signup") {
      if (password.length < 8) return "Şifre en az 8 karakter olmalıdır.";
      if (!/[A-Z]/.test(password)) return "Şifre en az bir büyük harf içermelidir.";
      if (!/[0-9]/.test(password)) return "Şifre en az bir rakam içermelidir.";
      if (password !== confirmPassword) return "Şifreler eşleşmiyor.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const formError = validateForm();
    if (formError) { setError(formError); return; }
    const cleanEmail = email.trim().toLowerCase();
    try {
      setLoadingSubmit(true);
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        router.replace("/dashboard");
      } else {
        await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (auth.currentUser) {
          await sendEmailVerification(auth.currentUser);
        }
        setSuccess("Hesap oluşturuldu. E-posta doğrulama e-postası gönderildi. Yönlendiriliyorsunuz...");
        router.replace("/onboarding");
      }
    } catch (err: unknown) {
      setError(getFirebaseAuthError(err, mode));
    } finally {
      setLoadingSubmit(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setError("");
    setSuccess("");
  };

  const ActiveFeature = featureCards[featureIndex];

  return (
    <div className="lp-root">
      <div className="lp-bg-glow" />
      <canvas ref={canvasRef} className="lp-canvas" />

      <div className="lp-card">
        <div className="lp-left">
          <div className="lp-logo-row">
            <div className="lp-logo-icon">🔧</div>
            <div>
              <div className="lp-logo-name">ServisPanel</div>
              <div className="lp-logo-sub">Operasyon yönetim sistemi</div>
            </div>
          </div>

          <div>
            <h1 className="lp-heading">
              {mode === "signin" ? (
                <>
                  Tekrar <span>hoş geldiniz</span>
                </>
              ) : (
                <>
                  Hemen <span>başlayın</span>
                </>
              )}
            </h1>
            <p className="lp-subheading">
              {mode === "signin"
                ? "Hesabınıza giriş yaparak paneli kullanmaya devam edin."
                : "Kayıt olduktan sonra işletme bilgilerinizi ekleyerek başlayın."}
            </p>
          </div>

          <div className="lp-tabs">
            <button type="button" className={`lp-tab ${mode === "signin" ? "active" : ""}`} onClick={() => switchMode("signin")}>
              Giriş Yap
            </button>
            <button type="button" className={`lp-tab ${mode === "signup" ? "active" : ""}`} onClick={() => switchMode("signup")}>
              Kayıt Ol
            </button>
          </div>

          <form className="lp-form" onSubmit={handleSubmit}>
            <div className="lp-form-group">
              <label className="lp-label">E-posta</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="lp-input"
                placeholder="ornek@email.com"
              />
            </div>

            <div className="lp-form-group">
              <label className="lp-label">Şifre</label>
              <div className="lp-input-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="lp-input has-icon"
                  placeholder="••••••••"
                />
                <button type="button" className="lp-eye-btn" onClick={() => setShowPassword((v) => !v)} aria-label="Şifreyi göster/gizle">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {mode === "signup" && (
                <p className="lp-hint">En az 8 karakter, 1 büyük harf ve 1 rakam kullanın.</p>
              )}
            </div>

            <div className={`lp-confirm-wrap ${mode === "signup" ? "open" : ""}`} aria-hidden={mode !== "signup"}>
              <div className="lp-form-group">
                <label className="lp-label">Şifre Tekrar</label>
                <div className="lp-input-wrap">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="lp-input has-icon"
                    placeholder="••••••••"
                  />
                  <button type="button" className="lp-eye-btn" onClick={() => setShowConfirmPassword((v) => !v)} aria-label="Şifreyi göster/gizle">
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            {error && <div className="lp-error">{error}</div>}
            {success && <div className="lp-success">{success}</div>}

            <button type="submit" className="lp-submit" disabled={loadingSubmit}>
              {loadingSubmit ? (
                <>
                  <div className="lp-submit-spinner" />
                  {mode === "signin" ? "Giriş yapılıyor..." : "Kayıt oluşturuluyor..."}
                </>
              ) : (
                <>
                  {mode === "signin" ? "Giriş Yap" : "Hesap Oluştur"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="lp-footer">
            Devam ederek <u>kullanım koşullarını</u> ve <u>gizlilik politikasını</u> kabul etmiş olursunuz.
          </p>
        </div>

        <div className="lp-right">
          {heroImageUrl ? (
            <img src={heroImageUrl} alt="Platform tanıtım görseli" className="lp-hero-img" />
          ) : (
            <div className="lp-hero-fallback" />
          )}
          <div className="lp-right-grid" />
          <div className="lp-right-gradient" />

          <div className="lp-right-content">
            {/* TOP */}
            <div>
              <p className="lp-right-headline">Servis Yönetimi</p>
              <h2 className="lp-right-title">
                İşlerinizi
                <br />
                <em>tek ekranda</em>
                <br />
                yönetin
              </h2>
              <p className="lp-right-desc">
                Araç servis takibi, iş emirleri, müşteri kayıtları ve anlık raporlarla servis süreçlerinizi optimize edin.
              </p>
            </div>

            {/* BOTTOM */}
            <div className={`lp-feature-card theme-${ActiveFeature.theme}`}>
              <div className="lp-feature-card-top">
                <div className="lp-feature-icon">
                  <ActiveFeature.icon size={16} />
                </div>
                <span className="lp-feature-name">{ActiveFeature.title}</span>
              </div>

              <p className="lp-feature-desc">{ActiveFeature.desc}</p>

              <div className="lp-dots">
                {featureCards.map((fc, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`lp-dot ${i === featureIndex ? `active theme-${fc.theme}` : ""}`}
                    onClick={() => setFeatureIndex(i)}
                    aria-label={`Feature ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}