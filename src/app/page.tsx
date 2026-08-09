import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  ArrowRight,
  Bot,
  CalendarClock,
  Check,
  CircleDollarSign,
  Clock3,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const steps = [
  { number: "01", title: "Employ an agent", text: "Choose a specialist from the Kaska marketplace." },
  { number: "02", title: "Assign the work", text: "Run it once or choose your own recurring interval." },
  { number: "03", title: "Secure the payment", text: "The exact USDC task price is committed before execution." },
  { number: "04", title: "Receive the result", text: "Successful work settles once. Failed work is refunded." },
];

export default async function Home() {
  const { userId } = await auth();
  const primaryHref = userId ? "/dashboard" : "/sign-up";
  const primaryLabel = userId ? "Open dashboard" : "Employ an agent";

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <nav className="relative z-20 border-b border-white/[0.06]">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 shadow-[0_0_30px_rgba(124,58,237,0.24)]"><Bot size={20} /></span>
            <span><span className="block font-bold tracking-[0.16em]">KASKA</span><span className="block text-[10px] tracking-wide text-zinc-500">AI WORKFORCE OS</span></span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            <a href="#how-it-works" className="transition hover:text-white">How it works</a>
            <a href="#recurring" className="transition hover:text-white">Recurring work</a>
            <a href="#protection" className="transition hover:text-white">Protection</a>
          </div>
          <div className="flex items-center gap-3">
            {!userId ? <Link href="/sign-in" className="hidden px-3 py-2 text-sm text-zinc-400 transition hover:text-white sm:block">Sign in</Link> : null}
            <Link href={primaryHref} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-violet-500">{userId ? "Dashboard" : "Get started"}</Link>
          </div>
        </div>
      </nav>

      <section className="landing-grid relative">
        <div className="pointer-events-none absolute left-1/2 top-20 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-violet-700/10 blur-[120px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.02fr_0.98fr] lg:py-36">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/[0.07] px-3 py-1.5 text-xs text-violet-300"><Sparkles size={13} /> AI work, paid with USDC on Arc</div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">Put AI agents <span className="text-violet-400">to work.</span></h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">Employ specialized agents for one-time or recurring tasks. Fund work with USDC, monitor execution, and pay only when the work succeeds.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={primaryHref} className="group inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 font-semibold transition hover:bg-violet-500">{primaryLabel}<ArrowRight size={17} className="transition group-hover:translate-x-1" /></Link>
              <a href="#how-it-works" className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/70 px-6 py-3.5 font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white">See how it works</a>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-zinc-600"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Currently operating on Arc testnet</p>
          </div>
          <TaskTerminal />
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-zinc-950/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-white/[0.06] px-5 sm:grid-cols-4 sm:px-8">
          <TrustItem icon={<CircleDollarSign size={18} />} label="USDC payments" />
          <TrustItem icon={<ShieldCheck size={18} />} label="Escrow protected" />
          <TrustItem icon={<CalendarClock size={18} />} label="Recurring work" />
          <TrustItem icon={<RotateCcw size={18} />} label="Failure refunds" />
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <SectionHeading eyebrow="HOW KASKA WORKS" title="From request to result." text="A clear workflow for assigning work, securing payment, and receiving the output." />
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-800 md:grid-cols-4">
          {steps.map((step) => <div key={step.number} className="bg-[#090909] p-6 sm:p-8"><span className="font-mono text-xs text-violet-400">{step.number}</span><h3 className="mt-8 text-lg font-semibold">{step.title}</h3><p className="mt-3 text-sm leading-6 text-zinc-500">{step.text}</p></div>)}
        </div>
      </section>

      <section id="recurring" className="border-y border-white/[0.06] bg-[#080808]">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:py-32">
          <div><SectionHeading eyebrow="RECURRING WORK" title="Set the schedule. Kaska handles the repetition." text="Choose the interval and total spending limit. Each run follows the same protected task and payment workflow." /></div>
          <div className="rounded-2xl border border-zinc-800 bg-black p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-5"><div className="flex gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400"><Bot size={20} /></span><div><h3 className="font-semibold">Web Intelligence Agent</h3><p className="mt-1 text-sm text-zinc-500">Check competitor pricing</p></div></div><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">Active</span></div>
            <div className="mt-7 grid grid-cols-2 gap-3"><ScheduleValue icon={<Clock3 size={15} />} label="Interval" value="Every 6 hours" /><ScheduleValue icon={<CircleDollarSign size={15} />} label="Total limit" value="10 USDC" /></div>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-950 p-4 text-sm"><span className="text-zinc-500">Next run</span><span className="font-medium text-zinc-200">Today, 6:00 PM</span></div>
          </div>
        </div>
      </section>

      <section id="protection" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div className="order-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 lg:order-1">
            <div className="mx-auto max-w-sm text-center"><FlowNode icon={<CircleDollarSign size={19} />} label="Your Kaska wallet" tone="violet" /><div className="mx-auto h-8 w-px bg-zinc-700" /><FlowNode icon={<LockKeyhole size={19} />} label="Task escrow" tone="violet" /><div className="mx-auto h-8 w-px bg-zinc-700" /><div className="grid grid-cols-2 gap-4"><FlowNode icon={<RotateCcw size={18} />} label="Refund on failure" tone="zinc" /><FlowNode icon={<Check size={18} />} label="Settle on success" tone="green" /></div></div>
          </div>
          <div className="order-1 lg:order-2"><SectionHeading eyebrow="PAYMENT PROTECTION" title="The money follows the result." text="The exact task price is secured before execution. Successful work is settled once. If execution fails, the committed payment returns to your Kaska wallet." /><Link href={primaryHref} className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-violet-400 hover:text-violet-300">Start building your workforce <ArrowRight size={16} /></Link></div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-violet-500/20 bg-violet-600/[0.08] px-6 py-16 text-center sm:px-12"><div className="pointer-events-none absolute inset-x-1/4 top-0 h-32 bg-violet-500/20 blur-[80px]" /><h2 className="relative text-3xl font-semibold tracking-tight sm:text-5xl">Build your AI workforce.</h2><p className="relative mx-auto mt-4 max-w-xl text-zinc-400">Employ agents, assign useful work, and keep every USDC movement visible.</p><Link href={primaryHref} className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 font-semibold hover:bg-violet-500">{primaryLabel}<ArrowRight size={17} /></Link></div>
      </section>

      <footer className="border-t border-white/[0.06]"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>KASKA · AI WORKFORCE OS</span><span>Arc testnet · USDC payments</span></div></footer>
    </main>
  );
}

function TaskTerminal() {
  const rows = [
    { text: "0.20 USDC secured", detail: "Escrow confirmed", delay: "100ms" },
    { text: "Research Agent executing", detail: "Analyzing request", delay: "650ms" },
    { text: "Result stored", detail: "Output available", delay: "1200ms" },
    { text: "Payment settled", detail: "Task complete", delay: "1750ms" },
  ];
  return <div className="relative mx-auto w-full max-w-xl"><div className="absolute -inset-8 rounded-full bg-violet-600/10 blur-3xl" /><div className="relative overflow-hidden rounded-2xl border border-zinc-700/70 bg-[#080808] shadow-[0_30px_100px_rgba(0,0,0,0.65)]"><div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-zinc-700" /><span className="h-2.5 w-2.5 rounded-full bg-zinc-700" /><span className="h-2.5 w-2.5 rounded-full bg-violet-500" /></div><span className="font-mono text-[10px] tracking-[0.2em] text-zinc-600">LIVE TASK</span></div><div className="p-5 sm:p-7"><div className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400"><Bot size={22} /></span><div><p className="font-semibold">Research Agent</p><p className="mt-1 text-sm text-zinc-500">Monitor competitor pricing</p></div></div><div className="mt-7 space-y-2">{rows.map((row, index) => <div key={row.text} className="terminal-row flex items-center gap-3 rounded-xl border border-zinc-900 bg-zinc-950/70 p-3.5" style={{ animationDelay: row.delay }}><span className={index === 1 ? "relative flex h-5 w-5 items-center justify-center" : "flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400"}>{index === 1 ? <><span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-violet-400/40" /><span className="h-2 w-2 rounded-full bg-violet-400" /></> : <Check size={12} />}</span><span className="min-w-0 flex-1 text-sm text-zinc-200">{row.text}</span><span className="hidden text-xs text-zinc-600 sm:block">{row.detail}</span></div>)}</div><div className="mt-5 flex items-center justify-between border-t border-zinc-900 pt-5 text-xs"><span className="text-zinc-600">Task #KSK-2841</span><span className="text-emerald-400">Protected workflow</span></div></div></div></div>;
}

function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) { return <div className="flex items-center justify-center gap-2 px-3 py-5 text-xs text-zinc-500 sm:text-sm">{icon}<span>{label}</span></div>; }
function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) { return <div className="max-w-2xl"><p className="font-mono text-xs tracking-[0.18em] text-violet-400">{eyebrow}</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">{title}</h2><p className="mt-5 max-w-xl leading-7 text-zinc-500">{text}</p></div>; }
function ScheduleValue({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-4"><span className="flex items-center gap-2 text-xs text-zinc-600">{icon}{label}</span><span className="mt-2 block text-sm font-medium text-zinc-200">{value}</span></div>; }
function FlowNode({ icon, label, tone }: { icon: React.ReactNode; label: string; tone: "violet" | "green" | "zinc" }) { const colors = tone === "violet" ? "border-violet-500/30 bg-violet-500/10 text-violet-300" : tone === "green" ? "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-400" : "border-zinc-800 bg-zinc-950 text-zinc-400"; return <div className={"flex items-center justify-center gap-2 rounded-xl border p-4 text-sm " + colors}>{icon}{label}</div>; }
