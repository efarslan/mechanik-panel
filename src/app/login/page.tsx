"use client";

import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getDownloadURL, getStorage, ref } from "firebase/storage";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import "./login.css";

type AuthMode = "signin" | "owner";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HERO_STORAGE_PATH = "ui/login-hero.jpg";

function getFirebaseAuthCode(err: unknown): string {
  return typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code?: unknown }).code === "string"
    ? ((err as { code: string }).code)
    : "";
}

function getFirebaseAuthError(err: unknown, mode: AuthMode): string {
  const code = getFirebaseAuthCode(err);

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
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  useAuth();

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



  const validateForm = () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) return "E-posta ve şifre zorunludur.";
    if (!emailRegex.test(cleanEmail)) return "Geçerli bir e-posta adresi girin.";
    if (mode === "owner") {
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
      } else if (mode === "owner") {
        await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (auth.currentUser) {
          await sendEmailVerification(auth.currentUser);
        }
        setSuccess("Hesap oluşturuldu. E-posta doğrulama e-postası gönderildi. Yönlendiriliyorsunuz...");
        router.replace("/settings");
      }
    } catch (err: unknown) {
      if (mode === "signin") {
        const code = getFirebaseAuthCode(err);
        if (
          code === "auth/user-not-found" ||
          code === "auth/wrong-password" ||
          code === "auth/invalid-credential"
        ) {
          try {
            const methods = await fetchSignInMethodsForEmail(auth, cleanEmail);
            if (methods.length === 0) {
              setError("Böyle bir kullanıcı bulunamadı.");
            } else {
              setError("E-posta veya şifre hatalı.");
            }
          } catch {
            setError("E-posta veya şifre hatalı.");
          }
        } else {
          setError(getFirebaseAuthError(err, mode));
        }
      } else {
        setError(getFirebaseAuthError(err, mode));
      }
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

  const openForgotPasswordModal = () => {
    setForgotOpen(true);
    setForgotError("");
    setForgotSuccess("");
    setForgotEmail(email.trim());
  };

  const closeForgotPasswordModal = () => {
    setForgotOpen(false);
    setForgotLoading(false);
    setForgotError("");
    setForgotSuccess("");
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    const cleanEmail = forgotEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setForgotError("E-posta adresi zorunludur.");
      return;
    }
    if (!emailRegex.test(cleanEmail)) {
      setForgotError("Geçerli bir e-posta adresi girin.");
      return;
    }

    try {
      setForgotLoading(true);
      await sendPasswordResetEmail(auth, cleanEmail);
      setForgotSuccess("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.");
    } catch (err: unknown) {
      setForgotError(getFirebaseAuthError(err, "signin"));
    } finally {
      setForgotLoading(false);
    }
  };


  return (
    <div
      className="lp-root"
      style={{
        backgroundImage: "url('/background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="lp-bg-glow" />

      <div className="lp-card">
        <div className="lp-left">
          <div className="lp-logo-row">
            <img src="/logo.jpeg" alt="Logo" className="lp-logo-icon" />
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
            <button
              type="button"
              className={`lp-tab ${mode === "signin" ? "active" : ""}`}
              onClick={() => switchMode("signin")}
            >
              Giriş Yap
            </button>

            <button
              type="button"
              className={`lp-tab ${mode === "owner" ? "active" : ""}`}
              onClick={() => switchMode("owner")}
            >
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
              {mode === "signin" && (
                <button
                  type="button"
                  className="lp-forgot-password"
                  onClick={openForgotPasswordModal}
                >
                  Şifremi unuttum
                </button>
              )}
              {mode === "owner" && (
                <p className="lp-hint">En az 8 karakter, 1 büyük harf ve 1 rakam kullanın.</p>
              )}
            </div>

            {mode === "owner" && (
              <div className={`lp-confirm-wrap ${mode === "owner" ? "open" : ""}`} aria-hidden={mode !== "owner"}>
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
            )}

            {error && <div className="lp-error">{error}</div>}
            {success && <div className="lp-success">{success}</div>}

            <button type="submit" className="lp-submit" disabled={loadingSubmit}>
              {loadingSubmit ? (
                <>
                  <div className="lp-submit-spinner" />
                  {mode === "signin"
                    ? "Giriş yapılıyor..."
                    : "Hesap oluşturuluyor..."}
                </>
              ) : (
                <>
                  {mode === "signin"
                    ? "Giriş Yap"
                    : "Hesap Oluştur"}
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
              <h2 className="lp-right-title">
                işletmenizi
                <br />
                <em>tek ekranda</em>
                <br />
                yönetin
              </h2>
              <p className="lp-right-desc">
                Araç servis takibi, iş emirleri, müşteri kayıtları ve anlık raporlarla işletmenizin servis süreçlerini optimize edin.
              </p>
            </div>

          </div>
        </div>
      </div>

      {forgotOpen && (
        <div className="lp-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="forgot-password-title">
          <div className="lp-modal">
            <h3 id="forgot-password-title" className="lp-modal-title">Şifremi Unuttum</h3>
            <p className="lp-modal-subtitle">E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.</p>

            <form onSubmit={handleForgotPasswordSubmit} className="lp-modal-form">
              <input
                type="email"
                autoComplete="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="lp-input"
                placeholder="ornek@email.com"
              />

              {forgotError && <div className="lp-error">{forgotError}</div>}
              {forgotSuccess && <div className="lp-success">{forgotSuccess}</div>}

              <div className="lp-modal-actions">
                <button type="button" className="lp-modal-cancel" onClick={closeForgotPasswordModal}>
                  Vazgeç
                </button>
                <button type="submit" className="lp-submit lp-modal-submit" disabled={forgotLoading}>
                  {forgotLoading ? "Gönderiliyor..." : "Sıfırlama Maili Gönder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}