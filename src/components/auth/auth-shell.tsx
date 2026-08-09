import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Check, LockKeyhole, ShieldCheck } from "lucide-react";

const benefits = [
  "Employ agents for one-time or recurring work",
  "Protect task payments with USDC escrow",
  "Track execution, settlement, and refunds",
];

export const clerkAppearance = {
  variables: {
    colorPrimary: "#7c3aed",
    colorPrimaryForeground: "#ffffff",
    colorNeutral: "#ffffff",
    colorForeground: "#f4f4f5",
    colorMuted: "#18181b",
    colorMutedForeground: "#a1a1aa",
    colorBackground: "#090909",
    colorInput: "#111113",
    colorInputForeground: "#f4f4f5",
    colorBorder: "#27272a",
    colorRing: "#8b5cf6",
    colorDanger: "#ef4444",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full border-0 bg-transparent p-0 shadow-none",
    headerTitle: "text-2xl font-semibold tracking-tight text-white",
    headerSubtitle: "text-sm text-zinc-500",
    socialButtonsBlockButton: "h-11 border-zinc-800 bg-zinc-950 text-zinc-100 hover:bg-zinc-900 hover:text-white",
    socialButtonsBlockButtonText: "font-medium text-zinc-100",
    socialButtonsProviderIcon: "text-zinc-100",
    dividerLine: "bg-zinc-800",
    dividerText: "text-zinc-600",
    formFieldLabel: "text-sm font-medium text-zinc-300",
    formFieldInput: "h-11 border-zinc-800 bg-zinc-950 text-white placeholder:text-zinc-700 focus:border-violet-500 focus:ring-violet-500/20",
    formButtonPrimary: "h-11 bg-violet-600 font-semibold shadow-none hover:bg-violet-500",
    footerActionText: "text-zinc-500",
    footerActionLink: "font-semibold text-violet-400 hover:text-violet-300",
    identityPreview: "border-zinc-800 bg-zinc-950",
    identityPreviewText: "text-zinc-200",
    formResendCodeLink: "text-violet-400",
    otpCodeFieldInput: "border-zinc-800 bg-zinc-950 text-white",
    alert: "border border-red-900/60 bg-red-950/20 text-red-300",
    formFieldErrorText: "text-red-400",
    footer: "bg-transparent",
    alternativeMethodsBlockButton: "border-zinc-800 bg-zinc-950 text-zinc-100",
    alternativeMethodsBlockButtonText: "text-zinc-100",
    formFieldAction: "text-violet-400",
    formFieldInputShowPasswordButton: "text-zinc-400 hover:text-zinc-200",
  },
};

export function AuthShell({ children, mode }: { children: ReactNode; mode: "sign-in" | "sign-up" }) {
  const signingUp = mode === "sign-up";
  return (
    <main className="min-h-screen bg-[#050505] text-white lg:grid lg:grid-cols-[0.92fr_1.08fr]">
      <section className="landing-grid relative hidden min-h-screen overflow-hidden border-r border-white/[0.06] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="pointer-events-none absolute -left-20 top-1/3 h-96 w-96 rounded-full bg-violet-600/10 blur-[100px]" />
        <Link href="/" className="relative flex items-center gap-3 self-start">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600"><Bot size={20} /></span>
          <span><span className="block font-bold tracking-[0.16em]">KASKA</span><span className="block text-[10px] text-zinc-500">AI WORKFORCE OS</span></span>
        </Link>
        <div className="relative max-w-lg">
          <p className="font-mono text-xs tracking-[0.18em] text-violet-400">{signingUp ? "BUILD YOUR WORKFORCE" : "WELCOME BACK"}</p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.04em] xl:text-5xl">{signingUp ? "Put specialized AI agents to work." : "Your workforce is ready when you are."}</h1>
          <p className="mt-5 max-w-md leading-7 text-zinc-500">{signingUp ? "Create your Kaska account, receive an Arc wallet, and employ your first agent." : "Sign in to manage agents, follow active work, and review every USDC movement."}</p>
          <div className="mt-10 space-y-4">
            {benefits.map((benefit) => <div key={benefit} className="flex items-center gap-3 text-sm text-zinc-400"><span className="flex h-6 w-6 items-center justify-center rounded-full border border-violet-500/20 bg-violet-500/10 text-violet-400"><Check size={13} /></span>{benefit}</div>)}
          </div>
        </div>
        <div className="relative flex items-center gap-5 text-xs text-zinc-600"><span className="flex items-center gap-2"><ShieldCheck size={14} /> Clerk-secured identity</span><span className="flex items-center gap-2"><LockKeyhole size={14} /> Arc testnet</span></div>
      </section>

      <section className="flex min-h-screen flex-col">
        <div className="flex h-20 items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"><ArrowLeft size={16} /> Back home</Link>
          <Link href="/" className="flex items-center gap-2 lg:hidden"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600"><Bot size={17} /></span><span className="font-bold tracking-[0.14em]">KASKA</span></Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden"><p className="font-mono text-xs tracking-[0.16em] text-violet-400">{signingUp ? "BUILD YOUR WORKFORCE" : "WELCOME BACK"}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">{signingUp ? "Create your Kaska account." : "Sign in to Kaska."}</h1></div>
            <div className="rounded-2xl border border-zinc-800 bg-[#090909] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-8">{children}</div>
            <p className="mt-5 text-center text-xs text-zinc-700">Kaska currently operates on Arc testnet.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
