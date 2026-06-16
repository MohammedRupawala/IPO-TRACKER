import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, BarChart3, Shield, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "IPO Tracker — Track Your Allotment Status",
  description:
    "The cleanest way to track IPO allotment status for your entire family. Real-time updates, multi-PAN support, and beautiful analytics.",
};

const features = [
  {
    icon: BarChart3,
    title: "Multi-Member Tracking",
    description: "Track allotment status for all family members from a single dashboard.",
  },
  {
    icon: Zap,
    title: "Real-Time Sync",
    description: "Automated background workers check registrar sites and update status instantly.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your PAN data is encrypted and never shared. HTTPOnly cookies for session safety.",
  },
];

const stats = [
  { label: "IPOs Tracked", value: "200+" },
  { label: "Allotment Checks", value: "50K+" },
  { label: "Families Using", value: "1,000+" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-900">IPO Tracker</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-24 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Live allotment tracking available
        </div>

        <h1 className="mx-auto mb-6 max-w-3xl text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
          Track every IPO allotment{" "}
          <span className="text-slate-400">for your family</span>
        </h1>

        <p className="mx-auto mb-10 max-w-xl text-lg text-slate-500">
          One dashboard. All your PANs. Instant allotment status updates from
          BSE registrar sites — no manual checking ever again.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/signup">
            <Button size="lg" className="h-11 px-8 text-base">
              Start tracking free
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="h-11 px-8 text-base">
              Sign in to dashboard
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
      <section className="border-y border-slate-200/60 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-slate-100 px-6 py-8">
          {stats.map((stat) => (
            <div key={stat.label} className="px-8 text-center first:pl-0 last:pr-0">
              <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
              <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Everything you need to track IPOs
          </h2>
          <p className="mt-3 text-slate-500">
            Built for Indian retail investors who apply across multiple family PANs.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <feature.icon className="h-5 w-5 text-slate-700" />
              </div>
              <h3 className="mb-2 font-semibold text-slate-900">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-2xl bg-slate-900 px-10 py-14 text-center">
          <h2 className="mb-3 text-3xl font-bold text-white">
            Ready to simplify IPO tracking?
          </h2>
          <p className="mb-8 text-slate-400">
            Free to start. No credit card required.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {["Multi-PAN support", "Real-time sync", "Secure data"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                {item}
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/signup">
              <Button size="lg" className="h-11 bg-white px-8 text-slate-900 hover:bg-slate-100">
                Create free account
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200/60 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900">
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-xs font-medium text-slate-600">IPO Tracker</span>
          </div>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} IPO Tracker. For personal use only.
          </p>
        </div>
      </footer>
    </div>
  );
}
