'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid
} from 'recharts';

interface TeamStat {
  team_id: string;
  team_name: string;
  total_members: number;
  avg_productive_percentage: number;
  avg_focus_sessions_completed: number;
  burnout_risk_percentage: number;
}

export function TeamHealthChart({ teams }: { teams: TeamStat[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-64 flex items-center justify-center text-text-muted">Loading charts...</div>;
  if (teams.length === 0) return <div className="text-center text-text-secondary py-8">No team data to display.</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Productive Ratio Comparisons */}
      <div className="bg-bg-card border border-border p-6 rounded-2xl">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-6 flex items-center gap-2">
          <span>👥</span> Team Focus Score Averages
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teams} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis dataKey="team_name" stroke="#555577" fontSize={11} tickLine={false} />
              <YAxis stroke="#555577" fontSize={11} domain={[0, 100]} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#2a2a4a', color: '#e8e8f0', borderRadius: '8px' }}
                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
              />
              <Bar dataKey="avg_productive_percentage" name="Focus Ratio (%)" fill="#4a90d9" radius={[4, 4, 0, 0]}>
                {teams.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.avg_productive_percentage > 70 ? '#27ae60' : entry.avg_productive_percentage > 50 ? '#f39c12' : '#e74c3c'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Burnout Risk comparisons */}
      <div className="bg-bg-card border border-border p-6 rounded-2xl">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-6 flex items-center gap-2">
          <span>🔥</span> Workload / Burnout Risk Ratio
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teams} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis dataKey="team_name" stroke="#555577" fontSize={11} tickLine={false} />
              <YAxis stroke="#555577" fontSize={11} domain={[0, 100]} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#2a2a4a', color: '#e8e8f0', borderRadius: '8px' }}
                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
              />
              <Bar dataKey="burnout_risk_percentage" name="Burnout Risk (%)" fill="#e74c3c" radius={[4, 4, 0, 0]}>
                {teams.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.burnout_risk_percentage > 40 ? '#e74c3c' : entry.burnout_risk_percentage > 15 ? '#f39c12' : '#27ae60'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
