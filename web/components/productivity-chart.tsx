'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell
} from 'recharts';

interface CurvePoint {
  hour: string;
  minutes: number;
  score: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

export function ProductivityChart({ 
  logs 
}: { 
  logs: Array<{ domain: string; category: string; duration_seconds: number; start_time: string }> 
}) {
  const [mounted, setMounted] = useState(false);
  const [curveData, setCurveData] = useState<CurvePoint[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (logs.length === 0) return;

    // 1. Process logs for Productivity Curve (by hour)
    const hourlyMap: Record<number, { seconds: number; productiveSeconds: number }> = {};
    for (let i = 9; i <= 17; i++) {
      hourlyMap[i] = { seconds: 0, productiveSeconds: 0 };
    }

    logs.forEach(log => {
      const date = new Date(log.start_time);
      const hour = date.getHours();
      
      // Group anything outside typical work hours into 9 or 17
      const groupHour = hour < 9 ? 9 : hour > 17 ? 17 : hour;

      if (!hourlyMap[groupHour]) {
        hourlyMap[groupHour] = { seconds: 0, productiveSeconds: 0 };
      }

      hourlyMap[groupHour].seconds += log.duration_seconds;
      if (log.category === 'productive') {
        hourlyMap[groupHour].productiveSeconds += log.duration_seconds;
      }
    });

    const parsedCurve: CurvePoint[] = Object.entries(hourlyMap).map(([hour, val]) => {
      const totalMin = Math.round(val.seconds / 60);
      const prodScore = val.seconds === 0 ? 0 : Math.round((val.productiveSeconds / val.seconds) * 100);
      return {
        hour: `${hour.padStart(2, '0')}:00`,
        minutes: totalMin,
        score: prodScore
      };
    });
    setCurveData(parsedCurve);

    // 2. Process logs for Categories breakdown
    let prodSec = 0;
    let neutSec = 0;
    let distSec = 0;

    logs.forEach(log => {
      if (log.category === 'productive') prodSec += log.duration_seconds;
      else if (log.category === 'neutral') neutSec += log.duration_seconds;
      else if (log.category === 'distracting') distSec += log.duration_seconds;
    });

    setCategoryData([
      { name: 'Productive', value: Math.round(prodSec / 60), color: '#27ae60' },
      { name: 'Neutral', value: Math.round(neutSec / 60), color: '#f39c12' },
      { name: 'Distracting', value: Math.round(distSec / 60), color: '#e74c3c' }
    ]);
  }, [logs]);

  if (!mounted) return <div className="h-64 flex items-center justify-center text-text-muted">Loading charts...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Hourly curve (2/3 width) */}
      <div className="lg:col-span-2 bg-bg-card border border-border p-6 rounded-2xl">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-6 flex items-center gap-2">
          <span>📈</span> Productivity Curve
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={curveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4a90d9" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#4a90d9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" stroke="#555577" fontSize={11} tickLine={false} />
              <YAxis stroke="#555577" fontSize={11} domain={[0, 100]} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#2a2a4a', color: '#e8e8f0', borderRadius: '8px' }}
                itemStyle={{ color: '#4a90d9' }}
              />
              <Area type="monotone" dataKey="score" stroke="#4a90d9" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" name="Focus Score" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category breakdown (1/3 width) */}
      <div className="bg-bg-card border border-border p-6 rounded-2xl flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-6 flex items-center gap-2">
            <span>📊</span> Time Category Ratio
          </h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                <XAxis type="number" stroke="#555577" fontSize={10} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#555577" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#2a2a4a', color: '#e8e8f0', borderRadius: '8px' }}
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                />
                <Bar dataKey="value" name="Minutes" radius={[0, 4, 4, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex justify-between text-xs text-text-secondary border-t border-border pt-4">
          {categoryData.map((entry, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span>{entry.name}: <strong>{entry.value}m</strong></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
