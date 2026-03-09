import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Search, Check, RotateCcw, FileSpreadsheet, RefreshCcw } from 'lucide-react';
import { supabase, Student } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';

type MinimalStudent = Pick<Student, 'register_no' | 'name'> & { profile_image_url?: string | null };

function normalizeYear(year: string | number | null): number | null {
  if (typeof year === 'number') return year;
  const map: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
  const key = (year || '').toString().toUpperCase();
  return map[key] ?? null;
}

function SummaryCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className={`${color} rounded-lg p-4 text-white`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function AttendancePage() {
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState<string>(todayISO);
  const [workingDays, setWorkingDays] = useState<string>('40');
  const [students, setStudents] = useState<MinimalStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [absentees, setAbsentees] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    const d = localStorage.getItem('attendance.department');
    const y = localStorage.getItem('attendance.year');
    const dt = localStorage.getItem('attendance.date');
    if (d) setDepartment(d);
    if (y && /^\d+$/.test(y)) setYear(Number(y));
    if (dt) setDate(dt);
  }, []);

  useEffect(() => {
    if (department) localStorage.setItem('attendance.department', department);
    if (year !== null) localStorage.setItem('attendance.year', String(year));
    if (date) localStorage.setItem('attendance.date', date);
  }, [department, year, date]);

  useEffect(() => {
    let mounted = true;
    const fetchStudents = async () => {
      if (!department || !year) {
        setLoading(false);
        setStudents([]);
        return;
      }
      setLoading(true);
      console.log({
        department,
        year,
        deptLen: department.length,
      });
      const { data, error } = await supabase
        .from('students')
        .select('register_no,name,profile_image_url')
        .eq('department', department.trim())
        .eq('year', normalizeYear(year))
        .order('register_no', { ascending: true });
      if (!mounted) return;
      if (error) {
        setError('Failed to load students');
        setStudents([]);
      } else {
        console.log('Filtered Students:', data);
        setStudents((data || []) as MinimalStudent[]);
      }
      setLoading(false);
    };
    fetchStudents();
    return () => {
      mounted = false;
    };
  }, [department, year]);

  useEffect(() => {
    const loadForDate = async () => {
      if (!date) return;
      const { data: rows } = await supabase
        .from('attendance_daily')
        .select('register_no,status')
        .eq('date', date);
      const absentSet = new Set((rows || []).filter(r => r.status === 'absent').map(r => r.register_no));
      setAbsentees(absentSet);
    };
    loadForDate();
  }, [date]);

  const totalStudents = students.length;
  const absentToday = absentees.size;
  const presentToday = Math.max(totalStudents - absentToday, 0);
  const attendancePercentToday = totalStudents === 0 ? 0 : Math.round((presentToday / totalStudents) * 10000) / 100;

  const workingDaysNum = Number(workingDays);
  const workingDaysInvalid = !Number.isFinite(workingDaysNum) || workingDaysNum <= 0;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return students;
    return students.filter(s =>
      (s.name || '').toLowerCase().includes(term) || (s.register_no || '').toLowerCase().includes(term)
    );
  }, [students, searchTerm]);

  const toggleAbsent = (regNo: string) => {
    setAbsentees(prev => {
      const next = new Set(prev);
      if (next.has(regNo)) next.delete(regNo);
      else next.add(regNo);
      return next;
    });
  };

  const resetDay = async () => {
    setError('');
    setSuccess('');
    if (!date || students.length === 0) {
      setAbsentees(new Set());
      return;
    }
    const ok = window.confirm(`Reset attendance for ${date}? This affects only the loaded cohort.`);
    if (!ok) return;
    try {
      const regs = students.map(s => s.register_no);
      if (regs.length > 0) {
        await supabase
          .from('attendance_daily')
          .delete()
          .eq('date', date)
          .in('register_no', regs);
      }
      setAbsentees(new Set());
      setSuccess('Attendance reset for selected date');
    } catch {
      setError('Failed to reset attendance');
    }
  };
  useEffect(() => {
    setAbsentees(new Set());
    setSuccess('');
    setError('');
  }, [department, year]);

  const saveAttendance = async () => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const attendanceDate = date;
      const payload = students.map(s => ({
        register_no: s.register_no,
        date: attendanceDate,
        status: absentees.has(s.register_no) ? 'absent' : 'present',
      }));
      const { error } = await supabase
        .from('attendance_daily')
        .upsert(payload, { onConflict: 'register_no,date' });
      if (error) throw error;
      setSuccess('Attendance saved');
    } catch {
      setError('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const exportToExcel = () => {
    const rows = Array.from(absentees).map(regNo => {
      const s = students.find(st => st.register_no === regNo);
      return {
        Date: date,
        Register_No: regNo,
        Name: s?.name || '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Absentees');
    XLSX.writeFile(wb, `absentees_${date}.xlsx`);
  };

  const ringColor =
    attendancePercentToday >= 90 ? '#16a34a' :
    attendancePercentToday >= 75 ? '#22c55e' :
    attendancePercentToday >= 60 ? '#f59e0b' : '#ef4444';
  const pct = Math.min(Math.max(attendancePercentToday, 0), 100);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 bg-[#0b2a44] text-white flex flex-col">
        <div className="px-6 py-4 text-lg font-semibold border-b border-white/10">
          Student Management
        </div>
        <nav className="flex-1 px-4 py-4 space-y-2">
          <Link to="/dashboard" className="block text-sm text-white/80 hover:text-white">Dashboard</Link>
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-blue-600 text-white">
            <CalendarDays size={18} />
            Attendance
          </div>
        </nav>
      </aside>

      <main className="flex-1 p-8">
        <div className="sticky top-0 z-10 bg-slate-50 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <Link
              to="/dashboard"
              className="px-3 py-1.5 rounded-lg border text-sm bg-white shadow hover:bg-gray-50 transition-colors"
            >
              ← Back to Dashboard
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Daily Attendance</h1>
              <p className="text-sm text-slate-500">Mark absentees and calculate attendance automatically</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 animate-[slideFadeIn_180ms_ease-out]">
              <div>
                <label className="text-sm text-slate-500">Select Date</label>
                <div className="mt-2 flex items-center gap-2 bg-slate-50 px-4 py-3 rounded-lg">
                  <CalendarDays size={18} />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-transparent outline-none w-full"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-500">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="mt-2 w-full bg-slate-50 px-4 py-3 rounded-lg outline-none"
                >
                  <option value="">Select Department</option>
                  <option value="BCA">BCA</option>
                  <option value="BSc">BSc</option>
                  <option value="B.Com">B.Com</option>
                  <option value="MCA">MCA</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-500">Year</label>
                <select
                  value={year === null ? '' : String(year)}
                  onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
                  className="mt-2 w-full bg-slate-50 px-4 py-3 rounded-lg outline-none"
                >
                  <option value="">Select Year</option>
                  <option value="1">I</option>
                  <option value="2">II</option>
                  <option value="3">III</option>
                  <option value="4">IV</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-500">Total Working Days</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={workingDays}
                  onChange={(e) => setWorkingDays(e.target.value)}
                  className="mt-2 w-full bg-slate-50 px-4 py-3 rounded-lg outline-none"
                />
                {workingDaysInvalid && (
                  <p className="text-red-600 text-sm mt-2">Total Working Days must be a positive number</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm animate-[slideFadeIn_200ms_ease-out]">
              {!department || !year ? (
                <div className="text-center text-slate-600 py-6">
                  Select Department and Year to load students
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-slate-600">
                      {year} {department} — <span className="font-semibold">{totalStudents}</span> students
                    </p>
                    <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-lg">
                      <Search size={18} />
                      <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search student..."
                        className="bg-transparent outline-none w-full"
                      />
                    </div>
                  </div>

              <div className="space-y-3 max-h-[520px] overflow-auto">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
                      <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
                      <div className="w-6 h-6 rounded-full bg-slate-200 animate-pulse" />
                    </div>
                  ))
                ) : (
                  filtered.map(s => {
                    const checked = absentees.has(s.register_no);
                    return (
                      <div key={s.register_no} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 transition-shadow hover:shadow">
                        <div>
                          <p className="font-semibold text-slate-800">{s.name}</p>
                          <p className="text-xs text-slate-500">ID: {s.register_no}</p>
                        </div>
                        <button
                          onClick={() => toggleAbsent(s.register_no)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                            checked ? 'bg-red-500' : 'bg-slate-300'
                          }`}
                          aria-pressed={checked}
                        >
                          <Check size={14} className="text-white" />
                        </button>
                      </div>
                    );
                  })
                )}
                {!loading && filtered.length === 0 && (
                  <div className="text-center text-slate-600 py-6">No students found</div>
                )}
              </div>

              <div className="flex items-center gap-4 mt-6">
                <button
                  onClick={saveAttendance}
                  disabled={saving || !department || !year || totalStudents === 0}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  <Check size={16} /> Save Attendance
                </button>
                <button
                  onClick={resetDay}
                  className="flex items-center gap-2 border px-4 py-2 rounded-lg"
                >
                  <RotateCcw size={16} /> Reset Day
                </button>
                <button
                  onClick={exportToExcel}
                  className="ml-auto flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg"
                >
                  <FileSpreadsheet size={16} /> Excel
                </button>
                <button
                  onClick={saveAttendance}
                  disabled={saving}
                  className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  <RefreshCcw size={16} /> Sync
                </button>
              </div>
              {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
              {success && <p className="text-green-600 text-sm mt-3">✓ {success}</p>}
              </>
              )}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4">Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <SummaryCard label="Total Students" value={totalStudents} color="bg-slate-900" />
              <SummaryCard label="Present" value={presentToday} color="bg-green-500" />
              <SummaryCard label="Absent" value={absentToday} color="bg-red-500" />
              <SummaryCard label="Working Days" value={workingDaysInvalid ? '—' : workingDaysNum} color="bg-yellow-400" />
            </div>
            <div className="mt-8 flex flex-col items-center">
              <div className="relative w-32 h-32">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(${ringColor} ${pct}%, #e5e7eb ${pct}%)`,
                    WebkitMaskImage: 'radial-gradient(circle, transparent 60%, black 61%)',
                    maskImage: 'radial-gradient(circle, transparent 60%, black 61%)',
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
                  {Math.round(pct)}%
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-3">Attendance Percentage (Today)</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
