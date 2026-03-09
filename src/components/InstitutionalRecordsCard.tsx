import { Student } from '../lib/supabase';
import { BadgeCheck } from 'lucide-react';

interface Props {
  student: Student;
}

export default function InstitutionalRecordsCard({ student }: Props) {
  const formatText = (v: string | null | undefined) => {
    if (v === null || v === undefined) return 'N/A';
    const s = String(v);
    return s.trim() === '' ? 'N/A' : s;
  };
  const formatNumber = (v: number | null | undefined) => (v === null || v === undefined ? 'N/A' : String(v));
  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur shadow-lg shadow-slate-200/60 p-6">
      <div className="flex items-center space-x-3 mb-4 border-b border-slate-200 pb-2">
        <BadgeCheck className="w-5 h-5 text-green-600" />
        <h4 className="text-slate-800 text-lg font-semibold tracking-tight">Institutional Records</h4>
      </div>
      <div className="space-y-0 text-sm divide-y divide-slate-200">
        <div className="grid grid-cols-3 gap-2 py-2">
          <span className="text-slate-500">Academic Mentor</span>
          <span className="col-span-2 font-semibold text-slate-900">{formatText(student.mentor)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 py-2">
          <span className="text-slate-500">Disciplinary Action</span>
          <span className="col-span-2 font-semibold text-slate-900">{formatText(student.disciplinary_action)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 py-2">
          <span className="text-slate-500">Expected Graduation</span>
          <span className="col-span-2 font-semibold text-slate-900">{formatNumber(student.year_of_passing)}</span>
        </div>
      </div>
    </div>
  );
}
