import { useEffect, useMemo, useState } from 'react';
import Layout from './Layout';
import { supabase } from '../lib/supabase';
import { CalendarDays, Download, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

type MonthlyRow = {
  register_no: string;
  month: string;
  working_days: number;
  absent_days: number;
  present_days: number;
  attendance_percentage: number;
};

type NameMap = Record<string, string>;

export default function MonthlyAttendancePage() {
  const [month, setMonth] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [year, setYear] = useState<number | undefined>(undefined);
  const [rows, setRows] = useState<MonthlyRow[]>([]);
  const [nameMap, setNameMap] = useState<NameMap>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortDesc, setSortDesc] = useState(true);
  const [error, setError] = useState<string>('');

  const canLoad = Boolean(month);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const withNames = rows.map(r => ({
      ...r,
      name: nameMap[r.register_no] || '',
    }));
    const filteredRows = q
      ? withNames.filter(r =>
          r.register_no.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q)
        )
      : withNames;
    const sorted = [...filteredRows].sort((a, b) =>
      sortDesc
        ? b.attendance_percentage - a.attendance_percentage
        : a.attendance_percentage - b.attendance_percentage
    );
    return sorted;
  }, [rows, nameMap, search, sortDesc]);

  const summary = useMemo(() => {
    const totalStudents = rows.length;
    const workingDays = rows[0]?.working_days ?? 0;
    const totalAbsents = rows.reduce((acc, r) => acc + r.absent_days, 0);
    const avgPct =
      totalStudents > 0
        ? Number(
            (rows.reduce((acc, r) => acc + Number(r.attendance_percentage || 0), 0) /
              totalStudents).toFixed(2)
          )
        : 0;
    return { totalStudents, workingDays, totalAbsents, avgPct };
  }, [rows]);

  useEffect(() => {
    if (rows.length === 0) {
      setNameMap({});
      return;
    }
    const regs = rows.map(r => r.register_no);
    const loadNames = async () => {
      const { data } = await supabase
        .from('students')
        .select('register_no,name')
        .in('register_no', regs);
      const nmap: NameMap = {};
      const list = (data || []) as Array<{ register_no: string; name: string | null }>;
      for (const s of list) {
        nmap[s.register_no] = s.name || '';
      }
      setNameMap(nmap);
    };
    loadNames();
  }, [rows]);

  const load = async () => {
    setError('');
    if (!month) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('compute_monthly_attendance', {
      p_month: month,
      p_department: department || null,
      p_year: typeof year === 'number' ? year : null,
    });
    if (error) {
      setRows([]);
      setLoading(false);
      setError(error.message || 'Failed to load attendance');
      return;
    }
    setRows((data || []) as MonthlyRow[]);
    setLoading(false);
  };

  const exportCSV = () => {
    const sheetData = filtered.map(r => ({
      'Register No': r.register_no,
      Name: nameMap[r.register_no] || '',
      'Working Days': r.working_days,
      Present: r.present_days,
      Absent: r.absent_days,
      '%': r.attendance_percentage,
    }));
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly');
    XLSX.writeFile(wb, `attendance_${month || 'month'}.xlsx`);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Monthly Attendance</h1>
              <p className="text-gray-600 text-sm">Derived from daily logs</p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl bg-white/95 backdrop-blur shadow-lg border border-slate-100">
          <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm text-slate-600">Month</label>
              <input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Department</label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All</option>
                <option value="BCA">BCA</option>
                <option value="BSc">BSc</option>
                <option value="B.Com">B.Com</option>
                <option value="MCA">MCA</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-600">Year</label>
              <select
                value={year === undefined ? '' : String(year)}
                onChange={e => setYear(e.target.value ? Number(e.target.value) : undefined)}
                className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All</option>
                <option value="1">I</option>
                <option value="2">II</option>
                <option value="3">III</option>
                <option value="4">IV</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={load}
                disabled={!canLoad || loading}
                className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                Load Attendance
              </button>
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-2 w-full px-3 py-2 border border-slate-300 rounded-lg">
                <Search className="w-4 h-4 text-slate-600" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or register no"
                  className="flex-1 outline-none"
                />
              </div>
            </div>
          </div>
          {(!department || !year) && (
            <div className="px-6 pb-4">
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-block">
                Select department and year for cohort-specific results
              </p>
            </div>
          )}
        </section>

        <section>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card title="Total Students" value={summary.totalStudents} />
            <Card title="Working Days" value={summary.workingDays} />
            <Card title="Average Attendance %" value={`${summary.avgPct.toFixed(2)}%`} accent />
            <Card title="Total Absents" value={summary.totalAbsents} />
          </div>
        </section>

        <section className="rounded-2xl bg-white/95 backdrop-blur shadow-lg border border-slate-100">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortDesc(!sortDesc)}
                className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Sort by % {sortDesc ? '↓' : '↑'}
              </button>
            </div>
            <button
              onClick={exportCSV}
              disabled={rows.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              <Download className="w-4 h-4 text-gray-700" />
              Export CSV
            </button>
          </div>
          <div className="px-4 pb-4">
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600 border-b">
                    <th className="py-2 px-2">Register No</th>
                    <th className="py-2 px-2">Name</th>
                    <th className="py-2 px-2">Working Days</th>
                    <th className="py-2 px-2">Present</th>
                    <th className="py-2 px-2">Absent</th>
                    <th className="py-2 px-2">% </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-2 px-2">
                          <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                        </td>
                        <td className="py-2 px-2">
                          <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                        </td>
                        <td className="py-2 px-2">
                          <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
                        </td>
                        <td className="py-2 px-2">
                          <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
                        </td>
                        <td className="py-2 px-2">
                          <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
                        </td>
                        <td className="py-2 px-2">
                          <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-600">
                        {rows.length === 0
                          ? 'No attendance recorded'
                          : 'No results match the search'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map(r => {
                      const low = Number(r.attendance_percentage || 0) < 75;
                      return (
                        <tr key={r.register_no} className="border-b hover:bg-slate-50">
                          <td className="py-2 px-2 font-mono">{r.register_no}</td>
                          <td className="py-2 px-2">{nameMap[r.register_no] || ''}</td>
                          <td className="py-2 px-2">{r.working_days}</td>
                          <td className="py-2 px-2">{r.present_days}</td>
                          <td className="py-2 px-2">{r.absent_days}</td>
                          <td className={`py-2 px-2 font-semibold ${low ? 'text-red-600' : 'text-green-600'}`}>
                            {Number(r.attendance_percentage).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {error && (
              <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}

function Card({ title, value, accent = false }: { title: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl ${accent ? 'bg-green-600 text-white' : 'bg-white'} shadow-lg border border-slate-100 p-6`}>
      <p className={`text-sm ${accent ? 'text-green-50' : 'text-slate-600'}`}>{title}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? 'text-white' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
