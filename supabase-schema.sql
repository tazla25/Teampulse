-- TeamPulse Database Schema for Supabase Postgres
-- Execute this script in your Supabase SQL Editor

-- 1. Profiles / User details (linked to auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  name text,
  role text default 'employee' check (role in ('employee', 'manager')),
  work_hours jsonb default '{"start": "09:00", "end": "17:00"}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Teams (owned by managers)
create table public.teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  manager_id uuid references public.profiles(id) on delete cascade not null,
  invite_code text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Team Members mapping
create table public.team_members (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(team_id, user_id)
);

-- 4. Activity Logs (populated by Chrome Extension sync)
create table public.activity_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  domain text not null,
  category text not null check (category in ('productive', 'neutral', 'distracting')),
  duration_seconds integer not null,
  start_time timestamp with time zone not null,
  work_date date not null
);

-- 5. Focus Sessions (Pomodoro tracking)
create table public.focus_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  planned_duration_minutes integer not null,
  actual_duration_seconds integer not null,
  distraction_count integer default 0,
  completed boolean default false,
  started_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- --- Enable Row Level Security (RLS) ---
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.activity_logs enable row level security;
alter table public.focus_sessions enable row level security;

-- --- RLS Policies ---

-- Profiles policies
create policy "Users can read own profile" on public.profiles 
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles 
  for update using (auth.uid() = id);

-- Teams policies
create policy "Managers can insert teams" on public.teams 
  for insert with check (auth.uid() = manager_id);

create policy "Everyone can view teams" on public.teams 
  for select using (true); -- needed for team invite lookups

-- Team Members policies
create policy "Users can view their team memberships" on public.team_members 
  for select using (auth.uid() = user_id or exists (
    select 1 from public.teams t where t.id = team_id and t.manager_id = auth.uid()
  ));

create policy "Users can join teams via invite" on public.team_members 
  for insert with check (auth.uid() = user_id);

-- Activity Logs policies
create policy "Employees can manage own activity logs" on public.activity_logs 
  for all using (auth.uid() = user_id);

-- Focus Sessions policies
create policy "Employees can manage own focus sessions" on public.focus_sessions 
  for all using (auth.uid() = user_id);

-- --- Database Functions & Triggers ---

-- Automatically create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'employee')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- --- Anonymized Team Health Query for Managers ---
-- This function aggregates metrics so that managers can check the team productivity average and
-- burnout risk without violating employee privacy (no raw browsing URLs or individual details are returned).
create or replace function public.get_team_health_stats(manager_user_id uuid)
returns table (
  team_id uuid,
  team_name text,
  total_members bigint,
  avg_productive_percentage numeric,
  avg_focus_sessions_completed numeric,
  burnout_risk_percentage numeric
) as $$
begin
  return query
  with member_stats as (
    -- Get total time for each member in the last 7 days
    select 
      tm.team_id,
      tm.user_id,
      coalesce(sum(al.duration_seconds) filter (where al.category = 'productive'), 0)::numeric / 
        nullif(coalesce(sum(al.duration_seconds), 0), 0) * 100 as productive_percent,
      coalesce(count(distinct fs.id) filter (where fs.completed = true), 0) as completed_sessions,
      -- Simple burnout factor: active hours > 9 hrs per day on average in last 7 days
      case when (sum(al.duration_seconds) / 3600.0) / 7.0 > 9.0 then 1 else 0 end as high_workload
    from public.team_members tm
    left join public.activity_logs al on al.user_id = tm.user_id and al.start_time >= (now() - interval '7 days')
    left join public.focus_sessions fs on fs.user_id = tm.user_id and fs.started_at >= (now() - interval '7 days')
    group by tm.team_id, tm.user_id
  )
  select 
    t.id as team_id,
    t.name as team_name,
    count(distinct tm.user_id) as total_members,
    round(avg(ms.productive_percent), 2) as avg_productive_percentage,
    round(avg(ms.completed_sessions), 1) as avg_focus_sessions_completed,
    round(avg(ms.high_workload) * 100, 2) as burnout_risk_percentage
  from public.teams t
  join public.team_members tm on tm.team_id = t.id
  left join member_stats ms on ms.team_id = t.id and ms.user_id = tm.user_id
  where t.manager_id = manager_user_id
  group by t.id, t.name;
end;
$$ language plpgsql security definer;
