import { useState, useEffect, useRef } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { supabase, Student } from '../lib/supabase';
// removed inline profile rendering in favor of preview + route
import { useNavigate } from 'react-router-dom';

export default function StudentSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [department, setDepartment] = useState<string>('');
  const [year, setYear] = useState<string>('');

  const [suggestions, setSuggestions] = useState<Student[]>([]);
  const [results, setResults] = useState<Student[]>([]);
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const DEBOUNCE_MS = 300;
  const departments = ['BCA', 'BBA', 'BSc', 'BA', 'BCom', 'BTech'];
  const yearOptions = [
    { label: 'I', value: '1' },
    { label: 'II', value: '2' },
    { label: 'III', value: '3' },
  ];

  useEffect(() => {
    const handler = setTimeout(() => {
      const hasFilters = !!department || !!year;
      if (searchTerm.trim().length >= 1 || hasFilters) {
        fetchStudents({ forSuggestions: false });
        fetchStudents({ forSuggestions: true });
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        setResults([]);
        setNotFound(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(handler);
  }, [searchTerm, department, year]);

  const fetchStudents = async ({ forSuggestions }: { forSuggestions: boolean }) => {
    const q = searchTerm.trim();
    const limit = forSuggestions ? 6 : 50;

    let query = supabase.from('students').select('*').limit(limit);

    if (q) {
      query = query.or(`name.ilike.%${q}%,register_no.ilike.%${q}%`);
    }
    if (department) {
      query = query.eq('department', department);
    }
    if (year) {
      query = query.eq('year', parseInt(year));
    }

    if (!forSuggestions) setLoading(true);
    console.log('Search:', q);
    console.log('Department:', department);
    console.log('Year:', year);
    const { data, error } = await query;
    if (error) {
      console.error('Search error:', error);
    }
    if (forSuggestions) {
      setSuggestions(data || []);
      setShowSuggestions((data || []).length > 0);
    } else {
      setResults(data || []);
      setNotFound(!data || data.length === 0);
      console.log('Results:', data);
      setLoading(false);
    }
  };

  const handleSearch = async (registerNo?: string) => {
    const searchValue = registerNo || searchTerm;
    setSearchTerm(searchValue);
    setShowSuggestions(false);
    await fetchStudents({ forSuggestions: false });
  };

  const handleSuggestionClick = (student: Student) => {
    setSearchTerm(student.register_no);
    setShowSuggestions(false);
    handleSearch(student.register_no);
  };

  const StudentPreviewCard = ({ s }: { s: Student }) => {
    const formatText = (v: string | null | undefined) => {
      if (v === null || v === undefined) return 'N/A';
      const str = String(v);
      return str.trim() === '' ? 'N/A' : str;
    };
    return (
      <div className="rounded-2xl bg-white/90 backdrop-blur shadow-lg shadow-slate-200/60 border border-slate-100 p-6 transition hover:shadow-xl hover:translate-y-[1px] animate-[slideFadeIn_0.35s_ease-out]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">{formatText(s.name)}</h3>
            <p className="text-sm text-slate-500 font-mono">{s.register_no}</p>
          </div>
          <button
            onClick={() => navigate(`/students/${s.register_no}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            View Full Profile
          </button>
        </div>
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <span className="text-slate-500">Father</span>
            <span className="col-span-2 font-medium text-slate-900">{formatText(s.father_name)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="text-slate-500">Mother</span>
            <span className="col-span-2 font-medium text-slate-900">{formatText(s.mother_name)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="text-slate-500">Address</span>
            <span className="col-span-2 font-medium text-slate-900">{formatText(s.address)}</span>
          </div>
        </div>
      </div>
    );
  };

  const resetFilters = () => {
    setSearchTerm('');
    setDepartment('');
    setYear('');
    setResults([]);
    setSuggestions([]);
    setShowSuggestions(false);
    setNotFound(false);
    inputRef.current?.focus();
    fetchStudents({ forSuggestions: false });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      if (activeSuggestion >= 0) {
        handleSuggestionClick(suggestions[activeSuggestion]);
      } else {
        handleSearch();
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Search Student Information</h2>
        <p className="text-gray-600">Search by Name or Register Number. Combine with Department and Year of Study.</p>
      </div>

      {/* Filter Bar */}
      <div className="relative">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setActiveSuggestion(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search by Name or Register Number..."
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg transition"
            />
          </div>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full md:w-40 px-3 py-3 border-2 border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          >
            <option value="">Department</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full md:w-36 px-3 py-3 border-2 border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          >
            <option value="">Year of Study</option>
            {yearOptions.map((y) => (
              <option key={y.value} value={y.value}>
                {y.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="w-full md:w-36 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button
            onClick={resetFilters}
            className="w-full md:w-28 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 transition"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {suggestions.map((student, idx) => (
              <button
                key={`${student.register_no}-${idx}`}
                onClick={() => handleSuggestionClick(student)}
                className={`w-full px-4 py-3 text-left transition border-b border-gray-100 last:border-0 ${
                  activeSuggestion === idx ? 'bg-blue-50' : 'hover:bg-blue-50'
                }`}
              >
                <p className="font-semibold text-gray-800">
                  {(student.name || '—')} – {(student.department || '—')} {(student.year || '')}
                </p>
                <p className="text-sm text-gray-600">{student.register_no || '—'}</p>
              </button>
            ))}
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-xl bg-gray-100 animate-pulse border border-gray-200 shadow-sm"
              />
            ))}
          </div>
        )}
      </div>

      {notFound && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-800 font-semibold">No students found.</p>
          <p className="text-yellow-700 text-sm">Try searching by register number or student name.</p>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((s) => (
            <div
              key={s.register_no}
              className="rounded-xl bg-white shadow border border-slate-100 p-4 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{s.name || '—'}</p>
                  <p className="text-sm text-gray-600">
                    {s.department || '—'} {s.year || ''}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">{s.register_no}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewStudent(s)}
                    className="px-3 py-2 bg-slate-100 text-slate-800 rounded-lg hover:bg-slate-200 transition"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => navigate(`/students/${s.register_no}`)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Open
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Preview Modal */}
      {previewStudent && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-20">
          <div className="max-w-2xl w-full">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setPreviewStudent(null)}
                className="px-3 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 transition"
              >
                Close
              </button>
            </div>
            <StudentPreviewCard s={previewStudent} />
          </div>
        </div>
      )}
    </div>
  );
}
