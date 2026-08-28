"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { useLanguage, type Locale } from "@/components/LanguageProvider";
import { ApiError } from "@/lib/apiClient";
import { requestRegister } from "@/services/authService";

import styles from "./login.module.css";

type AuthMode = "signin" | "signup";

const COPY = {
  en: {
    authSection: "KelanaAI sign in and sign up",
    storyKicker: "Your personal travel companion",
    storyTitle: "Every great journey starts with a plan.",
    storyBody: "Build thoughtful itineraries, keep every journey together, and let AI help with the details.",
    from: "From",
    journeyStarts: "Where your journey begins",
    nextStop: "Next stop",
    bali: "Bali, Indonesia",
    photoCredit: "Bali, Indonesia · Where temple mornings meet ocean sunsets",
    signIn: "Sign in",
    signUp: "Sign up",
    languageLabel: "Choose language",
    authModeLabel: "Choose authentication mode",
    signInKicker: "Secure traveler access",
    signUpKicker: "New traveler registration",
    signInTitle: "Welcome back.",
    signUpTitle: "Start exploring.",
    signInIntro: "Sign in to continue planning and see the trips that belong to you.",
    signUpIntro: "Create your account and turn your next destination into a journey made for you.",
    fullName: "Full name",
    namePlaceholder: "Your name",
    email: "Email address",
    emailPlaceholder: "traveler@example.com",
    password: "Password",
    currentPasswordPlaceholder: "Enter your password",
    newPasswordPlaceholder: "At least 8 characters",
    confirmPassword: "Confirm password",
    confirmPasswordPlaceholder: "Repeat your password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    show: "Show",
    hide: "Hide",
    signingIn: "Checking your passport…",
    signingUp: "Preparing your travel pass…",
    signInAction: "Sign in & continue",
    signUpAction: "Sign up & start planning",
    newTraveler: "New to KelanaAI?",
    existingTraveler: "Already have an account?",
    signInNoteTitle: "Your next journey is waiting.",
    signInNoteBody: "Sign in and continue planning where you left off.",
    signUpNoteTitle: "A new journey begins here.",
    signUpNoteBody: "Sign up once, then keep every itinerary together in your personal travel space.",
    footer: "AI-planned journeys · Human-approved memories",
    nameRequired: "Please enter your name.",
    passwordLength: "Password must contain at least 8 characters.",
    passwordMismatch: "The passwords do not match. Please try again.",
    invalidCredentials: "Email or password is incorrect. Please check and try again.",
    existingAccount: "An account with this email already exists. Please sign in instead.",
    serverError: "KelanaAI could not reach the server. Please try again.",
  },
  id: {
    authSection: "Masuk dan daftar KelanaAI",
    storyKicker: "Teman perjalanan pribadi Anda",
    storyTitle: "Setiap perjalanan hebat dimulai dengan rencana.",
    storyBody: "Susun itinerary yang matang, simpan semua perjalanan, dan biarkan AI membantu detailnya.",
    from: "Dari",
    journeyStarts: "Tempat perjalanan Anda dimulai",
    nextStop: "Tujuan berikutnya",
    bali: "Bali, Indonesia",
    photoCredit: "Bali, Indonesia · Pagi di pura, senja di tepi samudra",
    signIn: "Masuk",
    signUp: "Daftar",
    languageLabel: "Pilih bahasa",
    authModeLabel: "Pilih masuk atau daftar",
    signInKicker: "Akses traveler aman",
    signUpKicker: "Pendaftaran traveler baru",
    signInTitle: "Selamat datang kembali.",
    signUpTitle: "Mulai menjelajah.",
    signInIntro: "Masuk untuk melanjutkan rencana dan melihat trip milik Anda.",
    signUpIntro: "Buat akun dan ubah destinasi berikutnya menjadi perjalanan yang dirancang untuk Anda.",
    fullName: "Nama lengkap",
    namePlaceholder: "Nama Anda",
    email: "Alamat email",
    emailPlaceholder: "traveler@example.com",
    password: "Kata sandi",
    currentPasswordPlaceholder: "Masukkan kata sandi",
    newPasswordPlaceholder: "Minimal 8 karakter",
    confirmPassword: "Konfirmasi kata sandi",
    confirmPasswordPlaceholder: "Ulangi kata sandi",
    showPassword: "Tampilkan kata sandi",
    hidePassword: "Sembunyikan kata sandi",
    show: "Lihat",
    hide: "Tutup",
    signingIn: "Memeriksa pas perjalanan…",
    signingUp: "Menyiapkan pas perjalanan…",
    signInAction: "Masuk & lanjutkan",
    signUpAction: "Daftar & mulai merencanakan",
    newTraveler: "Baru di KelanaAI?",
    existingTraveler: "Sudah memiliki akun?",
    signInNoteTitle: "Perjalanan berikutnya telah menanti.",
    signInNoteBody: "Masuk dan lanjutkan rencana terakhir Anda.",
    signUpNoteTitle: "Perjalanan baru dimulai di sini.",
    signUpNoteBody: "Daftar sekali, lalu simpan setiap itinerary dalam ruang perjalanan pribadi Anda.",
    footer: "Perjalanan dirancang AI · Kenangan disetujui manusia",
    nameRequired: "Silakan masukkan nama Anda.",
    passwordLength: "Kata sandi harus berisi minimal 8 karakter.",
    passwordMismatch: "Kata sandi tidak sama. Silakan periksa kembali.",
    invalidCredentials: "Email atau kata sandi salah. Silakan periksa dan coba lagi.",
    existingAccount: "Akun dengan email ini sudah tersedia. Silakan masuk.",
    serverError: "KelanaAI tidak dapat terhubung ke server. Silakan coba lagi.",
  },
} as const;

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isReady, login } = useAuth();
  const { locale, setLocale } = useLanguage();
  const copy = COPY[locale];
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && isAuthenticated) router.replace("/trips");
  }, [isAuthenticated, isReady, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (mode === "signup") {
      if (!name.trim()) {
        setError(copy.nameRequired);
        return;
      }
      if (password.length < 8) {
        setError(copy.passwordLength);
        return;
      }
      if (password !== confirmPassword) {
        setError(copy.passwordMismatch);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        await requestRegister({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        });
      }
      await login(email, password);
      router.replace(mode === "signup" ? "/" : "/trips");
    } catch (reason) {
      if (reason instanceof ApiError) {
        setError(
          reason.status === 401
            ? copy.invalidCredentials
            : reason.status === 409
              ? copy.existingAccount
              : reason.message,
        );
      } else {
        setError(copy.serverError);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function selectMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }

  function selectLanguage(nextLocale: Locale) {
    setLocale(nextLocale);
    setError(null);
  }

  return (
    <main className={styles.page}>
      <Image src="/bali-coast.jpg" alt="" fill priority sizes="100vw" className={styles.backgroundImage} />
      <div className={styles.backdrop} aria-hidden="true" />

      <section className={styles.shell} aria-label={copy.authSection}>
        <aside className={styles.storyPanel}>
          <div className={styles.brand}>
            <span className={styles.compassMark} aria-hidden="true">✦</span>
            <span>Kelana<span>AI</span></span>
          </div>

          <div className={styles.storyCopy}>
            <p className={styles.kicker}>{copy.storyKicker}</p>
            <h1>{copy.storyTitle}</h1>
            <p>{copy.storyBody}</p>
          </div>

          <div className={styles.routeCard} aria-label="HOM to Bali">
            <div>
              <span>{copy.from}</span>
              <strong>HOM</strong>
              <small>{copy.journeyStarts}</small>
            </div>
            <div className={styles.routeLine} aria-hidden="true" />
            <div className={styles.routeDestination}>
              <span>{copy.nextStop}</span>
              <strong>DPS</strong>
              <small>{copy.bali}</small>
            </div>
          </div>

          <p className={styles.photoCredit}>{copy.photoCredit}</p>
        </aside>

        <div className={styles.formPanel}>
          <div className={`${styles.formInner} ${mode === "signup" ? styles.signupMode : ""}`}>
            <div className={styles.mobileBrand}>
              <span className={styles.compassMark} aria-hidden="true">✦</span>
              Kelana<span>AI</span>
            </div>

            <div className={styles.panelMenus}>
              <div className={styles.authMenu} role="tablist" aria-label={copy.authModeLabel}>
                <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? styles.activeAuthMenu : undefined} onClick={() => selectMode("signin")}>{copy.signIn}</button>
                <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? styles.activeAuthMenu : undefined} onClick={() => selectMode("signup")}>{copy.signUp}</button>
              </div>

              <div className={styles.languageMenu} role="group" aria-label={copy.languageLabel}>
                {(["en", "id"] as const).map((language) => (
                  <button key={language} type="button" aria-pressed={locale === language} className={locale === language ? styles.activeLanguage : undefined} onClick={() => selectLanguage(language)}>
                    {language.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <p className={styles.secureLabel}>
              <span aria-hidden="true" />
              {mode === "signin" ? copy.signInKicker : copy.signUpKicker}
            </p>
            <h2>{mode === "signin" ? copy.signInTitle : copy.signUpTitle}</h2>
            <p className={styles.intro}>{mode === "signin" ? copy.signInIntro : copy.signUpIntro}</p>

            <form onSubmit={handleSubmit} className={styles.form}>
              {mode === "signup" && (
                <>
                  <label htmlFor="name">{copy.fullName}</label>
                  <div className={styles.inputShell}>
                    <span className={`${styles.fieldIcon} ${styles.userIcon}`} aria-hidden="true" />
                    <input id="name" name="name" type="text" autoComplete="name" placeholder={copy.namePlaceholder} value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
                  </div>
                </>
              )}

              <div className={mode === "signup" ? styles.fieldLabel : undefined}>
                <label htmlFor="email">{copy.email}</label>
              </div>
              <div className={styles.inputShell}>
                <span className={`${styles.fieldIcon} ${styles.mailIcon}`} aria-hidden="true" />
                <input id="email" name="email" type="email" autoComplete="email" placeholder={copy.emailPlaceholder} value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus={mode === "signin"} />
              </div>

              <div className={styles.passwordLabel}>
                <label htmlFor="password">{copy.password}</label>
              </div>
              <div className={styles.inputShell}>
                <span className={`${styles.fieldIcon} ${styles.lockIcon}`} aria-hidden="true" />
                <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder={mode === "signin" ? copy.currentPasswordPlaceholder : copy.newPasswordPlaceholder} value={password} onChange={(event) => setPassword(event.target.value)} required />
                <button type="button" className={styles.revealButton} onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? copy.hidePassword : copy.showPassword}>
                  {showPassword ? copy.hide : copy.show}
                </button>
              </div>

              {mode === "signup" && (
                <>
                  <div className={styles.passwordLabel}>
                    <label htmlFor="confirm-password">{copy.confirmPassword}</label>
                  </div>
                  <div className={styles.inputShell}>
                    <span className={`${styles.fieldIcon} ${styles.lockIcon}`} aria-hidden="true" />
                    <input id="confirm-password" name="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder={copy.confirmPasswordPlaceholder} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
                  </div>
                </>
              )}

              {error && (
                <p className={styles.error} role="alert"><span aria-hidden="true">!</span> {error}</p>
              )}

              <button type="submit" className={styles.submitButton} disabled={isSubmitting || !isReady}>
                {isSubmitting ? (
                  <span className={styles.loadingLabel}><span className={styles.spinner} aria-hidden="true" />{mode === "signin" ? copy.signingIn : copy.signingUp}</span>
                ) : (
                  <span>{mode === "signin" ? copy.signInAction : copy.signUpAction}<b aria-hidden="true">→</b></span>
                )}
              </button>
            </form>

            <p className={styles.switchPrompt}>
              {mode === "signin" ? copy.newTraveler : copy.existingTraveler}{" "}
              <button type="button" onClick={() => selectMode(mode === "signin" ? "signup" : "signin")}>
                {mode === "signin" ? copy.signUp : copy.signIn}
              </button>
            </p>

            <div className={styles.securityNote}>
              <span aria-hidden="true">→</span>
              <p>
                <strong>{mode === "signin" ? copy.signInNoteTitle : copy.signUpNoteTitle}</strong>{" "}
                {mode === "signin" ? copy.signInNoteBody : copy.signUpNoteBody}
              </p>
            </div>

            <p className={styles.footerText}>{copy.footer}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
