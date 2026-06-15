'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('employee');
  const [workHours, setWorkHours] = useState({ start: '09:00', end: '17:00' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (prof) {
        setProfile(prof);
        setName(prof.name || '');
        setRole(prof.role || 'employee');
        if (prof.work_hours) {
          setWorkHours(prof.work_hours);
        }
      }
      setLoading(false);
    };

    fetchSettings();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          role,
          work_hours: workHours,
        })
        .eq('id', profile.id);

      if (error) throw error;
      alert('Settings saved successfully!');
      router.refresh();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // GDPR: Download all data as JSON
  const handleExportData = async () => {
    if (!profile) return;
    try {
      // Fetch activity logs
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', profile.id);

      // Fetch focus sessions
      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', profile.id);

      const payload = {
        profile,
        activity_logs: logs || [],
        focus_sessions: sessions || []
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `teampulse-data-${profile.id}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  // GDPR: Deleting all user logs and profile
  const handleDeleteData = async () => {
    if (!profile) return;
    const confirm1 = confirm('⚠️ WARNING: This will permanently delete all your tracking activity logs, focus sessions, and team memberships. This action is irreversible. Continue?');
    if (!confirm1) return;

    const confirm2 = confirm('Confirm one more time: Are you absolutely sure?');
    if (!confirm2) return;

    setDeleting(true);
    try {
      // 1. Delete activity logs
      await supabase.from('activity_logs').delete().eq('user_id', profile.id);
      
      // 2. Delete focus sessions
      await supabase.from('focus_sessions').delete().eq('user_id', profile.id);
      
      // 3. Delete team memberships
      await supabase.from('team_members').delete().eq('user_id', profile.id);

      alert('All your personal productivity and log records have been deleted from TeamPulse.');
      router.push('/dashboard');
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-bg-primary text-text-primary min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-text-secondary">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Top Navbar */}
      <nav className="border-b border-border bg-bg-primary/90 sticky top-0 z-40 px-6 py-4 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2 font-bold text-lg">
          <span className="text-accent-blue">⚡</span>
          <span className="font-space">Team<span className="text-accent-blue">Pulse</span></span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="px-3 py-1.5 rounded-lg hover:bg-bg-card text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors">
            Employee View
          </Link>
          {profile?.role === 'manager' && (
            <Link href="/team" className="px-3 py-1.5 rounded-lg hover:bg-bg-card text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors">
              Manager View
            </Link>
          )}
          <Link href="/dashboard/settings" className="px-3 py-1.5 rounded-lg bg-accent-blue/10 text-accent-blue text-xs font-semibold">
            Settings
          </Link>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <header>
          <h1 className="text-2xl font-bold font-space">Account & Tracking Settings</h1>
          <p className="text-sm text-text-secondary mt-1">Configure your productivity profile and manage your data.</p>
        </header>

        {/* Profile Card */}
        <section className="bg-bg-card border border-border rounded-2xl p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <h3 className="text-base font-bold font-space border-b border-border pb-3">1. Personal Profile</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-bg-primary border border-border focus:border-accent-blue text-text-primary outline-none text-sm transition-all"
                  placeholder="Your Name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">Account Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-bg-primary border border-border focus:border-accent-blue text-text-primary outline-none text-sm transition-all"
                >
                  <option value="employee">Employee / Developer</option>
                  <option value="manager">Manager / Team Lead</option>
                </select>
              </div>
            </div>

            <div>
              <h4 className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">2. Active Work Hours</h4>
              <div className="flex gap-4 items-center">
                <input
                  type="time"
                  value={workHours.start}
                  onChange={(e) => setWorkHours(prev => ({ ...prev, start: e.target.value }))}
                  className="px-4 py-2 rounded-xl bg-bg-primary border border-border text-sm text-text-primary outline-none"
                />
                <span className="text-text-secondary text-sm">to</span>
                <input
                  type="time"
                  value={workHours.end}
                  onChange={(e) => setWorkHours(prev => ({ ...prev, end: e.target.value }))}
                  className="px-4 py-2 rounded-xl bg-bg-primary border border-border text-sm text-text-primary outline-none"
                />
              </div>
              <p className="text-xs text-text-muted mt-2">Activity tracking outside these hours is ignored by productivity equations.</p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="py-2.5 px-6 bg-accent-blue text-white rounded-xl text-xs font-bold hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        </section>

        {/* GDPR Privacy compliance panel */}
        <section className="bg-bg-card border border-border rounded-2xl p-6 space-y-6">
          <h3 className="text-base font-bold font-space border-b border-border pb-3 text-accent-amber">
            🔒 Data Control & Compliance (GDPR/DPDP)
          </h3>
          
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-bg-primary/40 border border-border">
              <div>
                <h4 className="text-sm font-bold">Export Personal Data</h4>
                <p className="text-xs text-text-secondary mt-1">Download all your synced browser domains logs and focus sessions as a JSON file.</p>
              </div>
              <button
                onClick={handleExportData}
                className="py-2 px-4 border border-accent-blue text-accent-blue hover:bg-accent-blue hover:text-white rounded-lg text-xs font-bold transition-all whitespace-nowrap"
              >
                Export JSON
              </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-accent-red/5 border border-accent-red/20">
              <div>
                <h4 className="text-sm font-bold text-accent-red">Delete My Logs</h4>
                <p className="text-xs text-text-secondary mt-1">Permanently purge all your logs and Pomodoro history. This cannot be undone.</p>
              </div>
              <button
                onClick={handleDeleteData}
                disabled={deleting}
                className="py-2 px-4 bg-accent-red hover:bg-accent-red/90 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 whitespace-nowrap"
              >
                {deleting ? 'Deleting...' : 'Delete Data'}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
