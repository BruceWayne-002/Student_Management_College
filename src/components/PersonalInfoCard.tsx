import { Student } from '../lib/supabase';
import { User, Calendar, Phone, Mail, MapPin, Home, Heart, Users } from 'lucide-react';

interface Props {
  student: Student;
}

export default function PersonalInfoCard({ student }: Props) {
  const formatText = (v: string | null | undefined) => {
    if (v === null || v === undefined) return 'N/A';
    const s = String(v);
    return s.trim() === '' ? 'N/A' : s;
  };
  const formatDate = (v: string | null | undefined) => {
    if (v === null || v === undefined) return 'N/A';
    const s = String(v).trim();
    return s === '' ? 'N/A' : s;
  };
  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur shadow-lg shadow-slate-200/60 p-6">
      <div className="flex items-center space-x-3 mb-4 border-b border-slate-200 pb-2">
        <User className="w-5 h-5 text-blue-600" />
        <h4 className="text-slate-800 text-lg font-semibold tracking-tight">Personal Information</h4>
      </div>
      <div className="space-y-0 text-sm divide-y divide-slate-200">
        <div className="grid grid-cols-3 gap-2 py-2">
          <span className="text-slate-500 flex items-center space-x-2"><Users className="w-4 h-4" /><span>Father</span></span>
          <span className="col-span-2 font-semibold text-slate-900">{formatText(student.father_name)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 py-2">
          <span className="text-slate-500 flex items-center space-x-2"><Users className="w-4 h-4" /><span>Mother</span></span>
          <span className="col-span-2 font-semibold text-slate-900">{formatText(student.mother_name)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 py-2">
          <span className="text-slate-500 flex items-center space-x-2"><MapPin className="w-4 h-4" /><span>Address</span></span>
          <span className="col-span-2 font-semibold text-slate-900 whitespace-normal break-words">
            {formatText(student.address)}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 py-2">
          <span className="text-slate-500 flex items-center space-x-2"><Mail className="w-4 h-4" /><span>Email</span></span>
          <span className="col-span-2 font-semibold text-slate-900">{formatText(student.email || '')}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 py-2">
          <span className="text-slate-500 flex items-center space-x-2"><Phone className="w-4 h-4" /><span>Student Phone</span></span>
          <span className="col-span-2 font-semibold text-slate-900">{formatText(student.student_number)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 py-2">
          <span className="text-slate-500 flex items-center space-x-2"><Phone className="w-4 h-4" /><span>Phone Number</span></span>
          <span className="col-span-2 font-semibold text-slate-900">{formatText(student.phone_number || '')}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 py-2">
          <span className="text-slate-500 flex items-center space-x-2"><Phone className="w-4 h-4" /><span>Parents Phone</span></span>
          <span className="col-span-2 font-semibold text-slate-900">{formatText(student.parents_number)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 py-2">
          <span className="text-slate-500 flex items-center space-x-2"><Heart className="w-4 h-4" /><span>Blood Group</span></span>
          <span className="col-span-2 font-semibold text-slate-900">{formatText(student.blood_group)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 py-2">
          <span className="text-slate-500 flex items-center space-x-2"><Home className="w-4 h-4" /><span>Hostel</span></span>
          <span className="col-span-2 font-semibold text-slate-900">
            {formatText(student.hostel || '')}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 py-2">
          <span className="text-slate-500 flex items-center space-x-2"><Calendar className="w-4 h-4" /><span>DOB</span></span>
          <span className="col-span-2 font-semibold text-slate-900">
            {formatDate(student.dob)}
          </span>
        </div>
        {/* Institutional fields moved to InstitutionalRecordsCard for cleaner separation */}
      </div>
    </div>
  );
}
