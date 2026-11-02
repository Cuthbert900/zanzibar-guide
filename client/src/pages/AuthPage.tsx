import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { AlertCircle, ArrowLeft, Check, Circle, Compass, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ThemeToggle from "@/components/ThemeToggle";
import PhotoCredit from "@/components/PhotoCredit";
import { AuthRequestError, useAuth } from "@/contexts/AuthContext";
import { AERIAL_PHOTO, BEACH_PHOTO } from "@/const";
import { PASSWORD_RULES, unmetPasswordRules } from "@shared/password";
import "./auth-page.css";

type Mode = "login" | "signup";
type Field = "name" | "email" | "password";

const COPY = {
  login: {
    title: "Welcome back",
    intro: "Log in to see your trips, bookings and saved places.",
    headline: ["Karibu tena.", "Pick up where you left off."],
    tagline: "Your island plans are waiting.",
    submit: "Log in",
  },
  signup: {
    title: "Create your account",
    intro: "Free, and it only takes a minute.",
    headline: ["Karibu.", "Your island, your plans."],
    tagline: "Sign up to keep everything you plan in one place.",
    submit: "Create account",
  },
} as const;

const BENEFITS = [
  { title: "Saved trips", body: "Itineraries you build stay with you on any device." },
  { title: "Bookings in one place", body: "Track confirmations and payment status." },
  { title: "A guide that remembers", body: "Favourites and travel style shape every answer." },
];

/** Only same-site paths are allowed as a post-login destination ("//x" and "/\\x" point to other sites). */
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/";
}

function Brand() {
  return (
    <div className="space-y-3">
      <Link href="/" className="flex items-center gap-3" aria-label="Zanzibar Guide home">
        <span className="auth-brand-mark grid h-10 w-10 place-items-center rounded-xl">
          <Compass size={22} strokeWidth={1.8} />
        </span>
        <span className="flex flex-col leading-tight">
          <strong className="travel-brand text-lg tracking-[0.06em] text-white">ZANZIBAR</strong>
          <span className="auth-gold text-[10px] font-bold tracking-[0.22em]">ISLAND GUIDE</span>
        </span>
      </Link>
      <div className="auth-flag-stripe" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-sm text-destructive">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {children}
    </p>
  );
}

export default function AuthPage({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  const isSignup = mode === "signup";
  const { status, login, register } = useAuth();
  const [, navigate] = useLocation();
  const next = safeNext(new URLSearchParams(useSearch()).get("next"));
  const nextQuery = next === "/" ? "" : `?next=${encodeURIComponent(next)}`;

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<Field | "form", string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "signedIn") navigate(next, { replace: true });
  }, [status, next, navigate]);

  const update = (field: Field) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }));
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const [weakness] = isSignup ? unmetPasswordRules(form.password, form.email) : [];
    if (weakness) {
      setErrors({ password: weakness.error });
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      if (isSignup) await register(form.name, form.email, form.password);
      else await login(form.email, form.password);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      const field = err instanceof AuthRequestError ? err.field : undefined;
      setErrors(field ? { [field]: message } : { form: message });
    } finally {
      setSubmitting(false);
    }
  }

  const describedBy = (field: Field) => (errors[field] ? `${field}-error` : undefined);

  return (
    <div className="auth-page grid min-h-screen bg-background text-foreground lg:grid-cols-2">
      <section className="auth-photo hidden flex-col justify-between px-12 pb-7 pt-11 lg:flex" aria-label="Why create an account">
        <Brand />
        <div className="max-w-[460px] space-y-6">
          <div className="space-y-3">
            <h2 className="travel-brand text-[44px] font-medium leading-[1.12] text-white">
              {copy.headline[0]}
              <br />
              {copy.headline[1]}
            </h2>
            <p className="text-lg">{copy.tagline}</p>
          </div>
          <ul className="auth-benefits space-y-4 rounded-2xl p-5">
            {BENEFITS.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="auth-check mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full">
                  <Check size={14} strokeWidth={2.6} />
                </span>
                <span className="flex flex-col">
                  <strong className="text-[15px] text-white">{item.title}</strong>
                  <span className="auth-soft text-sm">{item.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="auth-credit auth-soft text-[11px]">
          <PhotoCredit photo={BEACH_PHOTO} className="dark:hidden" />
          <PhotoCredit photo={AERIAL_PHOTO} className="hidden dark:inline" />
        </p>
      </section>

      <main className="flex flex-col">
        <header className="auth-photo flex flex-col gap-5 px-5 pb-6 pt-4 lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex h-11 items-center gap-2 text-sm font-semibold text-white">
              <ArrowLeft size={16} /> Back to chat
            </Link>
            <ThemeToggle />
          </div>
          <Brand />
        </header>

        <div className="hidden items-center justify-between px-12 pt-8 lg:flex">
          <Link href="/" className="inline-flex h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Back to chat
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-12">
          <form onSubmit={handleSubmit} noValidate aria-labelledby="auth-title" className="w-full max-w-[420px] space-y-5">
            <div className="space-y-2">
              <h1 id="auth-title" className="travel-brand text-3xl font-medium sm:text-4xl">
                {copy.title}
              </h1>
              <p className="text-muted-foreground">{copy.intro}</p>
            </div>

            {errors.form && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {errors.form}
              </div>
            )}

            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  placeholder="What should we call you?"
                  value={form.name}
                  onChange={update("name")}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={describedBy("name")}
                  className="h-12"
                />
                {errors.name && <FieldError id="name-error">{errors.name}</FieldError>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                value={form.email}
                onChange={update("email")}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={describedBy("email")}
                className="h-12"
              />
              {errors.email && <FieldError id="email-error">{errors.email}</FieldError>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  placeholder={isSignup ? "Create a password" : "Your password"}
                  required
                  value={form.password}
                  onChange={update("password")}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={[errors.password && "password-error", isSignup && "password-rules"].filter(Boolean).join(" ") || undefined}
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <FieldError id="password-error">{errors.password}</FieldError>}
              {isSignup && (
                <ul id="password-rules" aria-label="Password requirements" className="grid gap-1 pt-1 text-sm sm:grid-cols-2">
                  {PASSWORD_RULES.map((rule) => {
                    const met = form.password.length > 0 && rule.passes(form.password, form.email);
                    return (
                      <li key={rule.id} className={`flex items-center gap-2 ${met ? "text-foreground" : "text-muted-foreground"}`}>
                        {met ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={3} /> : <Circle className="h-3 w-3 shrink-0" />}
                        {rule.label}
                        <span className="sr-only">{met ? "(done)" : "(not yet)"}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <Button type="submit" disabled={submitting} className="h-12 w-full text-base font-semibold">
              {submitting && <Loader2 className="animate-spin" />}
              {copy.submit}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {isSignup ? "Already have an account? " : "New to Zanzibar Guide? "}
              <Link href={`${isSignup ? "/login" : "/signup"}${nextQuery}`} className="font-semibold text-primary hover:underline">
                {isSignup ? "Log in" : "Create an account"}
              </Link>
            </p>

            <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button asChild variant="outline" className="h-11 w-full">
              <Link href={next}>Continue as a guest</Link>
            </Button>
          </form>
        </div>

        <p className="flex items-center justify-center gap-2 pb-6 text-xs text-muted-foreground">
          Powered by Cassava AI
          <img src="/images/cassava-ai-logo.png" alt="" className="h-4 w-auto dark:hidden" />
          <img src="/images/cassava-ai-logo-dark.png" alt="" className="hidden h-4 w-auto dark:block" />
        </p>
      </main>
    </div>
  );
}
