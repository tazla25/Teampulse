import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="bg-bg-primary text-text-primary min-h-screen selection:bg-accent-blue selection:text-white">
      {/* Navigation */}
      <nav className="border-b border-border bg-bg-primary/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2 font-bold text-xl">
          <span className="text-accent-blue text-2xl">⚡</span>
          <span className="font-space">Team<span className="text-accent-blue">Pulse</span></span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="#features" className="text-text-secondary hover:text-text-primary transition-colors text-sm font-medium">Features</Link>
          <Link href="#pricing" className="text-text-secondary hover:text-text-primary transition-colors text-sm font-medium">Pricing</Link>
          <Link href="/login" className="px-4 py-2 rounded-lg bg-bg-card border border-border text-sm font-semibold hover:border-accent-blue transition-all">
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative max-w-5xl mx-auto px-6 pt-20 pb-32 text-center flex flex-col items-center">
        {/* Glow effect */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-accent-blue/10 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-accent-purple/10 blur-[100px] pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-blue/30 bg-accent-blue/5 text-accent-blue text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse">
          🚀 Privacy-First Productivity Coach
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight font-space leading-[1.1] mb-6">
          Your Productivity Partner.<br />
          <span className="bg-gradient-to-r from-accent-blue via-accent-purple to-accent-pink bg-clip-text text-transparent">
            Not a Corporate Spy.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-text-secondary max-w-2xl leading-relaxed mb-10">
          Employees track their own focus and app patterns to improve. Managers see aggregated, anonymous team health trends. <strong className="text-text-primary">"We don't monitor. We understand."</strong>
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md">
          <Link href="/login" className="flex-1 py-4 px-6 rounded-xl font-bold bg-gradient-to-r from-accent-blue to-accent-purple text-white shadow-lg hover:shadow-accent-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-center">
            Get Started Free
          </Link>
          <a href="#features" className="flex-1 py-4 px-6 rounded-xl font-bold bg-bg-card border border-border text-text-primary hover:border-text-secondary hover:bg-bg-card/75 transition-all text-center">
            Learn More
          </a>
        </div>
      </header>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 border-t border-border">
        <h2 className="text-3xl md:text-4xl font-bold font-space text-center mb-16">
          Designed for Autonomy, Built for Performance
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="p-8 rounded-2xl bg-bg-card border border-border hover:border-accent-blue/50 transition-all group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform w-fit">🔌</div>
            <h3 className="text-xl font-bold mb-3 font-space">Chrome Extension Tracker</h3>
            <p className="text-text-secondary leading-relaxed">
              Passive tracking that measures active tabs and idle intervals locally. No keystroke logging, no screenshotting. You own your raw logs.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-8 rounded-2xl bg-bg-card border border-border hover:border-accent-purple/50 transition-all group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform w-fit">🎯</div>
            <h3 className="text-xl font-bold mb-3 font-space">Pomodoro & Focus Blocker</h3>
            <p className="text-text-secondary leading-relaxed">
              Configure customizable focus sessions. If you wander onto distracting domains, our screen overlay gently blocks the tab and guides you back.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-8 rounded-2xl bg-bg-card border border-border hover:border-accent-pink/50 transition-all group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform w-fit">📊</div>
            <h3 className="text-xl font-bold mb-3 font-space">Anonymized Team Pulse</h3>
            <p className="text-text-secondary leading-relaxed">
              Managers only receive aggregated dashboards (burnout indicators, average productive ratio). Employee browsing URLs remain 100% private.
            </p>
          </div>
        </div>
      </section>

      {/* Philosophy Callout */}
      <section className="max-w-5xl mx-auto px-6 py-16 bg-gradient-to-br from-bg-card to-bg-primary border border-border rounded-3xl text-center mb-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-accent-green/5 blur-3xl rounded-full" />
        <h2 className="text-2xl md:text-3xl font-bold font-space mb-4 text-accent-green">The Autonomy Advantage</h2>
        <p className="text-text-secondary max-w-3xl mx-auto leading-relaxed text-sm md:text-base">
          Behavioral science shows that surveillance tools increase stress and invite system-gaming. TeamPulse is built on autonomy: when developers control their tracker, they analyze their habits honestly and optimize productivity from within.
        </p>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 py-16 border-t border-border">
        <h2 className="text-3xl md:text-4xl font-bold font-space text-center mb-4">Simple, Transparent Pricing</h2>
        <p className="text-text-secondary text-center mb-16">Start free, upgrade when your team scales.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* B2C Plan */}
          <div className="p-8 rounded-2xl bg-bg-card border border-border hover:border-accent-blue/30 transition-all flex flex-col justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wider text-accent-blue mb-2">Individual (B2C)</div>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl font-bold font-space">₹199</span>
                <span className="text-text-secondary text-sm">/month</span>
              </div>
              <ul className="space-y-3 text-text-secondary text-sm mb-8">
                <li className="flex items-center gap-2">✓ Unlimited local tracking</li>
                <li className="flex items-center gap-2">✓ Advanced personal charts</li>
                <li className="flex items-center gap-2">✓ Unlimited focus blocker sessions</li>
                <li className="flex items-center gap-2">✓ Weekly AI habit summaries</li>
              </ul>
            </div>
            <Link href="/login" className="w-full py-3 rounded-xl font-bold border border-accent-blue text-accent-blue hover:bg-accent-blue hover:text-white transition-all text-center">
              Try Free
            </Link>
          </div>

          {/* B2B Plan */}
          <div className="p-8 rounded-2xl bg-bg-card border-2 border-accent-purple/50 relative hover:border-accent-purple transition-all flex flex-col justify-between">
            <span className="absolute top-0 right-6 -translate-y-1/2 px-3 py-1 rounded-full text-xs font-bold bg-accent-purple text-white uppercase tracking-wider">
              Popular
            </span>
            <div>
              <div className="text-sm font-semibold uppercase tracking-wider text-accent-purple mb-2">Team Plan (B2B)</div>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl font-bold font-space">₹999</span>
                <span className="text-text-secondary text-sm">/month</span>
              </div>
              <ul className="space-y-3 text-text-secondary text-sm mb-8">
                <li className="flex items-center gap-2 text-text-primary">✓ All Individual Features included</li>
                <li className="flex items-center gap-2">✓ Up to 15 team members</li>
                <li className="flex items-center gap-2">✓ Manager team-health aggregates</li>
                <li className="flex items-center gap-2">✓ Anonymous workload alerts</li>
                <li className="flex items-center gap-2">✓ Weekly team digest emails</li>
              </ul>
            </div>
            <Link href="/login" className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-accent-purple to-accent-pink text-white hover:scale-[1.02] active:scale-[0.98] transition-all text-center">
              Get TeamPulse
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-bg-primary py-12 px-6 max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center text-sm text-text-muted">
        <div>© 2026 TeamPulse. India-first SaaS. All rights reserved.</div>
        <div className="flex gap-6 mt-4 sm:mt-0">
          <Link href="/privacy" className="hover:text-text-secondary">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-text-secondary">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}
