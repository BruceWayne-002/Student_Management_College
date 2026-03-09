import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [todayPct, setTodayPct] = useState(0);
  const [monthPct, setMonthPct] = useState(0);
  const [todayAbsent, setTodayAbsent] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = new Date();
      monthStart.setDate(1);
      const start = monthStart.toISOString().slice(0, 10);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      const end = monthEnd.toISOString().slice(0, 10);

      // Total students (database source of truth)
      const stuCount = await supabase.from('students').select('register_no', { count: 'exact', head: true });
      const total = stuCount.count || 0;
      setTotalStudents(total);

      // Today's absentees
      const absToday = await supabase
        .from('attendance_daily')
        .select('register_no', { count: 'exact', head: true })
        .eq('date', today)
        .eq('status', 'absent');
      const absCount = absToday.count || 0;
      setTodayAbsent(absCount);

      // Today's % = (total - abs) / total
      const tPct = total > 0 ? ((total - absCount) / total) * 100 : 0;
      setTodayPct(Math.round(tPct * 100) / 100);

      // Monthly % = PresentDays / (TotalStudents * WorkingDays)
      const workDaysRes = await supabase
        .from('attendance_daily')
        .select('date')
        .gte('date', start)
        .lte('date', end);
      const distinctDates = Array.from(new Set((workDaysRes.data || []).map((r: { date: string }) => r.date)));
      const workingDays = distinctDates.length;

      const absMonth = await supabase
        .from('attendance_daily')
        .select('register_no', { count: 'exact', head: true })
        .gte('date', start)
        .lte('date', end)
        .eq('status', 'absent');
      const absM = absMonth.count || 0;

      const denominator = total * workingDays;
      const month = denominator > 0 ? ((denominator - absM) / denominator) * 100 : 0;
      setMonthPct(Math.round(month * 100) / 100);

      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatCard title="Total Students" value={totalStudents} accent="bg-blue-600" icon={<Users className="w-6 h-6" />} />
      <StatCard title="Today's Attendance %" value={`${todayPct.toFixed(2)}%`} accent="bg-green-600" />
      <StatCard title="Monthly Attendance %" value={`${monthPct.toFixed(2)}%`} accent="bg-indigo-600" />
      <StatCard title="Total Absentees (Today)" value={todayAbsent} accent="bg-red-600" />
    </div>
  );
}

function StatCard({ title, value, accent, icon }: { title: string; value: number | string; accent: string; icon?: React.ReactNode }) {
  return (
    <div className={`rounded-xl ${accent} text-white p-6 shadow transition-all hover:shadow-lg`}>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm opacity-80">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        {icon ? <div className="opacity-80">{icon}</div> : <div />}
      </div>
    </div>
  );
}
