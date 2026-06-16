'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { TeamHealthChart } from '../../components/team-health-chart';
import Link from 'next/link';

interface TeamStat {
  team_id: string;
  team_name: string;
  total_members: number;
  avg_productive_percentage: number;
  avg_focus_sessions_completed: number;
  burnout_risk_percentage: number;
}

export default function ManagerDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [teamStats, setTeamStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const router = useRouter();

  const fetchTeamStats = async () => {
    try {
      const token = localStorage.getItem('tp_session_token') || '';
      
      // 1. Fetch aggregated stats from RPC
      const response = await fetch('/api/team-health', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // 2. Fetch raw teams with invite codes
      const { data: rawTeams } = await supabase
        .from('teams')
        .select('id, invite_code');

      if (response.ok) {
        const data = await response.json();
        const stats = data.teams || [];
        
        // Merge invite codes
        const mergedStats = stats.map((stat: any) => {
          const matchingTeam = rawTeams?.find(t => t.id === stat.team_id);
          return {
            ...stat,
            invite_code: matchingTeam?.invite_code || 'TP-XXXXXX'
          };
        });

        setTeamStats(mergedStats);
      }
    } catch (err) {
      console.error('Error loading team stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkManager = async () => {
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

      if (!prof || prof.role !== 'manager') {
        alert('Access denied: Manager account required.');
        router.push('/dashboard');
      } else {
        setProfile(prof);
        fetchTeamStats();
      }
    };

    checkManager();
  }, [router]);

  // Create team & generate invite code
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !profile) return;
    setCreatingTeam(true);

    // Generate random 6 character code
    const inviteCode = 'TP-' + Math.floor(100000 + Math.random() * 900000);

    try {
      const { data: team, error } = await supabase
        .from('teams')
        .insert({
          name: newTeamName,
          manager_id: profile.id,
          invite_code: inviteCode
        })
        .select()
        .single();

      if (error) throw error;

      // Add manager as first member of their own team (for view permissions)
      await supabase.from('team_members').insert({
        team_id: team.id,
        user_id: profile.id
      });

      setNewTeamName('');
      alert(`Team "${team.name}" created! Invite code is: ${inviteCode}`);
      fetchTeamStats();
    } catch (err: any) {
      alert(`Team creation failed: ${err.message}`);
    } finally {
      setCreatingTeam(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-bg-primary text-text-primary min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-text-secondary">Aggregating anonymized team health metrics...</p>
        </div>
      </div>
    );
  }

  // Calculate manager overview statistics
  const totalTeams = teamStats.length;
  const avgFocusScore = totalTeams === 0 
    ? 0 
    : Math.round(teamStats.reduce((acc, t) => acc + Number(t.avg_productive_percentage || 0), 0) / totalTeams);
  const activeAlerts = teamStats.filter(t => t.burnout_risk_percentage > 35).length;

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
          <Link href="/team" className="px-3 py-1.5 rounded-lg bg-accent-purple/15 text-accent-purple text-xs font-semibold">
            Manager View
          </Link>
          <Link href="/dashboard/settings" className="px-3 py-1.5 rounded-lg hover:bg-bg-card text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors">
            Settings
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-bg-card border border-border p-6 rounded-2xl">
          <div>
            <h1 className="text-2xl font-bold font-space flex items-center gap-2">
              👔 Team Health Pulse Dashboard
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Showing anonymized aggregates for the last 7 days. Personal domains are never exposed.
            </p>
          </div>
        </header>

        {/* Manager Stats Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-bg-card border border-border">
            <div className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Teams Managed</div>
            <div className="text-4xl font-extrabold font-space text-accent-blue">{totalTeams}</div>
            <p className="text-xs text-text-muted mt-2">Active groups sync trackers</p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-bg-card border border-border">
            <div className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Team Focus Average</div>
            <div className="text-4xl font-extrabold font-space text-accent-green">{avgFocusScore}%</div>
            <p className="text-xs text-text-muted mt-2">Benchmark target: &gt; 70%</p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-bg-card border border-border">
            <div className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Burnout / Workload Alerts</div>
            <div className="text-4xl font-extrabold font-space text-accent-red">{activeAlerts}</div>
            <p className="text-xs text-text-muted mt-2">Teams working &gt; 9h/day average</p>
          </div>
        </section>

        {/* Charts comparisons */}
        {totalTeams > 0 && <TeamHealthChart teams={teamStats} />}

        {/* Teams List and Create Team */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Team Form */}
          <div className="bg-bg-card border border-border p-6 rounded-2xl">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-6 flex items-center gap-2">
              <span>➕</span> Initialize New Team
            </h3>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary font-bold uppercase tracking-wider mb-2">Team Name</label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-bg-primary border border-border focus:border-accent-blue text-text-primary outline-none text-sm transition-all"
                  placeholder="e.g. Frontend Platform"
                />
              </div>

              <button
                type="submit"
                disabled={creatingTeam}
                className="w-full py-3 bg-gradient-to-r from-accent-blue to-accent-purple text-white rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all text-sm disabled:opacity-50"
              >
                {creatingTeam ? 'Creating...' : 'Create & Generate Code'}
              </button>
            </form>
          </div>

          {/* Teams Table */}
          <div className="lg:col-span-2 bg-bg-card border border-border p-6 rounded-2xl">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-6 flex items-center gap-2">
              <span>📊</span> Team Stats Breakdown
            </h3>

            {teamStats.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-text-muted text-sm border border-dashed border-border rounded-xl">
                No teams created yet. Use the creation tool on the left to start.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Team Name</th>
                      <th className="pb-3 font-semibold">Members</th>
                      <th className="pb-3 font-semibold">Focus Average</th>
                      <th className="pb-3 font-semibold">Workload Status</th>
                      <th className="pb-3 font-semibold text-right">Invite Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamStats.map((team, idx) => (
                      <tr key={idx} className="border-b border-border/40 last:border-0 hover:bg-bg-primary/20 transition-colors">
                        <td className="py-3 font-medium text-text-primary">{team.team_name}</td>
                        <td className="py-3 text-text-secondary font-semibold">{team.total_members}</td>
                        <td className="py-3 text-accent-green font-semibold">
                          {team.avg_productive_percentage ? `${Math.round(team.avg_productive_percentage)}%` : '0%'}
                        </td>
                        <td className="py-3">
                          {team.burnout_risk_percentage > 35 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-red/10 text-accent-red uppercase tracking-wider">
                              ⚠️ Workload Risk ({Math.round(team.burnout_risk_percentage)}%)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-green/10 text-accent-green uppercase tracking-wider">
                              🟢 Healthy
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-accent-purple">
                          {team.invite_code}
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
