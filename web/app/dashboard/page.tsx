'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { ProductivityChart } from '../../components/productivity-chart';
import Link from 'next/link';

interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface ActivityLog {
  id: string;
  domain: string;
  category: string;
  duration_seconds: number;
  start_time: string;
  work_date: string;
}

interface FocusSession {
  id: string;
  planned_duration_minutes: number;
  actual_duration_seconds: number;
  distraction_count: number;
  completed: boolean;
  started_at: string;
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const router = useRouter();

  // Focus timer state
  const [timerActive, setTimerActive] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(1500);

  useEffect(() => {
    let interval: any = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      completeFocusSession();
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const fetchUserData = async (userId: string) => {
    try {
      // 1. Fetch Profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (prof) setProfile(prof);

      // 2. Fetch today's activity logs
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: actLogs } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('work_date', todayStr);

      if (actLogs) setLogs(actLogs);

      // 3. Fetch focus sessions
      const { data: focSess } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(5);

      if (focSess) setSessions(focSess);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        fetchUserData(session.user.id);
      }
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('tp_session_token');
    router.push('/login');
  };

  // Start Focus Timer
  const startFocusTimer = async () => {
    if (!profile) return;
    try {
      setTimerActive(true);
      setTimeLeft(timerMinutes * 60);

      // Log to DB
      await supabase.from('focus_sessions').insert({
        user_id: profile.id,
        planned_duration_minutes: timerMinutes,
        actual_duration_seconds: 0,
        completed: false
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Complete Focus Timer
  const completeFocusSession = async () => {
    if (!profile) return;
    try {
      setTimerActive(false);
      // Get the latest incomplete focus session to update it
      const { data: latest } = await supabase
        .from('focus_sessions')
        .select('id')
        .eq('user_id', profile.id)
        .eq('completed', false)
        .order('started_at', { ascending: false })
        .limit(1);

      if (latest && latest.length > 0) {
        await supabase
          .from('focus_sessions')
          .update({
            actual_duration_seconds: timerMinutes * 60,
            completed: true
          })
          .eq('id', latest[0].id);
      }
      
      alert('Focus session completed! Great job! 🎉');
      fetchUserData(profile.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Give Up Timer
  const stopFocusTimer = () => {
    setTimerActive(false);
    setTimeLeft(timerMinutes * 60);
  };

  // Simulate Extension sync logs (adds dummy tracking data)
  const simulateExtensionSync = async () => {
    if (!profile) return;
    setSimulating(true);
    const todayStr = new Date().toISOString().split('T')[0];
    const nowISO = new Date().toISOString();

    const dummyEvents = [
      { domain: 'github.com', category: 'productive', duration_seconds: 2400, start_time: nowISO, work_date: todayStr },
      { domain: 'stackoverflow.com', category: 'productive', duration_seconds: 1200, start_time: nowISO, work_date: todayStr },
      { domain: 'google.com', category: 'neutral', duration_seconds: 600, start_time: nowISO, work_date: todayStr },
      { domain: 'youtube.com', category: 'distracting', duration_seconds: 900, start_time: nowISO, work_date: todayStr },
      { domain: 'reddit.com', category: 'distracting', duration_seconds: 300, start_time: nowISO, work_date: todayStr }
    ];

    try {
      const token = localStorage.getItem('tp_session_token') || '';
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ events: dummyEvents })
      });

      if (response.ok) {
        await fetchUserData(profile.id);
        alert('Simulation synced! 5 activity records populated in database.');
      } else {
        alert('Simulation failed. Make sure you set your Supabase credentials.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to simulate sync.');
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-bg-primary text-text-primary min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-text-secondary">Analyzing activity patterns...</p>
        </div>
      </div>
    );
  }

  // Calculate Metrics
  const totalSeconds = logs.reduce((acc, log) => acc + log.duration_seconds, 0);
  const productiveSeconds = logs.filter(l => l.category === 'productive').reduce((acc, l) => acc + l.duration_seconds, 0);
  const neutralSeconds = logs.filter(l => l.category === 'neutral').reduce((acc, l) => acc + l.duration_seconds, 0);
  const distractingSeconds = logs.filter(l => l.category === 'distracting').reduce((acc, l) => acc + l.duration_seconds, 0);
  const focusScore = totalSeconds === 0 ? 0 : Math.round(((productiveSeconds + (neutralSeconds * 0.5)) / totalSeconds) * 100);

  // Group domains by duration for display table
  const domainSummaries = logs.reduce((acc: Record<string, { duration: number; category: string }>, log) => {
    if (!acc[log.domain]) {
      acc[log.domain] = { duration: 0, category: log.category };
    }
    acc[log.domain].duration += log.duration_seconds;
    return acc;
  }, {});

  const sortedDomains = Object.entries(domainSummaries)
    .sort((a, b) => b[1].duration - a[1].duration)
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Top Navbar */}
      <nav className="border-b border-border bg-bg-primary/90 sticky top-0 z-40 px-6 py-4 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2 font-bold text-lg">
          <span className="text-accent-blue">⚡</span>
          <span className="font-space">Team<span className="text-accent-blue">Pulse</span></span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="px-3 py-1.5 rounded-lg bg-accent-blue/10 text-accent-blue text-xs font-semibold">
            Employee View
          </Link>
          {profile?.role === 'manager' && (
            <Link href="/team" className="px-3 py-1.5 rounded-lg hover:bg-bg-card text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors">
              Manager View
            </Link>
          )}
          <Link href="/dashboard/settings" className="px-3 py-1.5 rounded-lg hover:bg-bg-card text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors">
            Settings
          </Link>
          <button onClick={handleLogout} className="text-xs text-text-muted hover:text-accent-red font-semibold transition-colors">
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Content Dashboard */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Greetings Panel */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-bg-card border border-border p-6 rounded-2xl">
          <div>
            <h1 className="text-2xl font-bold font-space flex items-center gap-2">
              Welcome back, {profile?.name || 'Developer'}! <span className="animate-wave">👋</span>
            </h1>
            <p className="text-sm text-text-secondary mt-1">Here is your focus snapshot for today.</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={simulateExtensionSync}
              disabled={simulating}
              className="px-4 py-2 bg-accent-purple/20 border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/35 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
            >
              {simulating ? 'Syncing...' : '🔌 Simulate Extension Sync'}
            </button>
          </div>
        </header>

        {/* AI Nudge Banner */}
        <section className="p-5 rounded-2xl bg-gradient-to-r from-accent-blue/10 to-accent-purple/10 border border-accent-blue/30 flex items-start gap-4">
          <span className="text-2xl">🧠</span>
          <div>
            <h4 className="text-sm font-bold text-accent-blue uppercase tracking-wider mb-1">AI Productivity Coach</h4>
            <p className="text-sm text-text-secondary leading-relaxed">
              {focusScore > 85
                ? "🔥 Excellent job! Your focus score is exceptional today. You are minimizing distractions and maintaining peak concentration. Consider taking a 10-minute break to avoid burnout."
                : focusScore > 60
                ? "📈 Decent tracking progress. Context-switching (jumping between websites) accounts for most distraction metrics today. Launch a Pomodoro Focus Session to get in the zone."
                : "⏳ Distractions are dominating your session today. Try blocking non-essential domains and starting a 25-minute Pomodoro block to build momentum."}
            </p>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Score */}
          <div className="p-6 rounded-2xl bg-bg-card border border-border hover:border-accent-green/40 transition-all">
            <div className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Today's Focus Score</div>
            <div className="text-4xl font-extrabold font-space text-accent-green">{focusScore}</div>
            <p className="text-xs text-text-muted mt-2">Target: &gt; 75% focus ratio</p>
          </div>

          {/* Card 2: Active Hours */}
          <div className="p-6 rounded-2xl bg-bg-card border border-border hover:border-accent-blue/40 transition-all">
            <div className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Total Logged Time</div>
            <div className="text-4xl font-extrabold font-space text-accent-blue">
              {Math.round(totalSeconds / 3600 * 10) / 10}h
            </div>
            <p className="text-xs text-text-muted mt-2">Active tracked browser minutes</p>
          </div>

          {/* Card 3: Pomodoro Sessions */}
          <div className="p-6 rounded-2xl bg-bg-card border border-border hover:border-accent-amber/40 transition-all">
            <div className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Focus Blocks Completed</div>
            <div className="text-4xl font-extrabold font-space text-accent-amber">
              {sessions.filter(s => s.completed).length}
            </div>
            <p className="text-xs text-text-muted mt-2">Active Pomodoro intervals today</p>
          </div>

          {/* Card 4: XP Level */}
          <div className="p-6 rounded-2xl bg-bg-card border border-border hover:border-accent-purple/40 transition-all">
            <div className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Productivity XP</div>
            <div className="text-4xl font-extrabold font-space text-accent-purple">
              {sessions.filter(s => s.completed).length * 50 + Math.round(productiveSeconds / 60)} XP
            </div>
            <p className="text-xs text-text-muted mt-2">Earned via focus sessions</p>
          </div>
        </section>

        {/* Charts Section */}
        <ProductivityChart logs={logs} />

        {/* Focus Session & Site Breakdown Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Focus Timer Widget */}
          <div className="bg-bg-card border border-border p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-6 flex items-center gap-2">
                <span>🎯</span> Launch Focus Session
              </h3>

              {!timerActive ? (
                <div className="space-y-6">
                  <div className="flex justify-between gap-3">
                    {[25, 50, 90].map(mins => (
                      <button
                        key={mins}
                        onClick={() => {
                          setTimerMinutes(mins);
                          setTimeLeft(mins * 60);
                        }}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                          timerMinutes === mins
                            ? 'bg-accent-blue/10 border-accent-blue text-accent-blue'
                            : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={startFocusTimer}
                    className="w-full py-3 bg-gradient-to-r from-accent-blue to-accent-purple text-white rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all text-sm"
                  >
                    Start Timer
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-6 py-4">
                  <div className="text-5xl font-mono font-bold tracking-wider">
                    {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:
                    {(timeLeft % 60).toString().padStart(2, '0')}
                  </div>
                  
                  <div className="flex gap-4">
                    <button
                      onClick={completeFocusSession}
                      className="flex-1 py-2.5 bg-accent-green text-white text-xs font-bold rounded-xl hover:scale-105 active:scale-95 transition-all"
                    >
                      Complete Block
                    </button>
                    <button
                      onClick={stopFocusTimer}
                      className="flex-1 py-2.5 border border-border hover:bg-bg-primary/50 text-text-primary text-xs font-bold rounded-xl transition-all"
                    >
                      Give Up
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border mt-6 pt-4 space-y-3">
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Recent Blocks</h4>
              {sessions.length === 0 ? (
                <p className="text-xs text-text-muted">No focus sessions recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {sessions.map((sess) => (
                    <div key={sess.id} className="flex justify-between items-center text-xs p-2 rounded bg-bg-primary/40">
                      <span className="text-text-secondary">
                        {new Date(sess.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({sess.planned_duration_minutes}m)
                      </span>
                      <span className={sess.completed ? 'text-accent-green font-semibold' : 'text-text-muted'}>
                        {sess.completed ? 'Completed' : 'Aborted'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Visited Sites Table (2/3 width) */}
          <div className="lg:col-span-2 bg-bg-card border border-border p-6 rounded-2xl">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-6 flex items-center gap-2">
              <span>🖥️</span> Today's Top Domains
            </h3>

            {sortedDomains.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-text-muted text-sm border border-dashed border-border rounded-xl">
                No activity records logged today. Load extension or click "Simulate Sync" to start.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Website</th>
                      <th className="pb-3 font-semibold">Category</th>
                      <th className="pb-3 font-semibold text-right">Time Tracked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDomains.map(([domain, info], idx) => (
                      <tr key={idx} className="border-b border-border/40 last:border-0 hover:bg-bg-primary/20 transition-colors">
                        <td className="py-3 font-medium text-text-primary">{domain}</td>
                        <td className="py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            info.category === 'productive'
                              ? 'bg-accent-green/10 text-accent-green'
                              : info.category === 'neutral'
                              ? 'bg-accent-amber/10 text-accent-amber'
                              : 'bg-accent-red/10 text-accent-red'
                          }`}>
                            {info.category}
                          </span>
                        </td>
                        <td className="py-3 text-right font-semibold text-text-secondary">
                          {Math.round(info.duration / 60)} min
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
