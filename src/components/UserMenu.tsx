import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Props {
  user: { email?: string | null } | null;
  role?: string | null;
}

export default function UserMenu({ user, role }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setOpen(false);
    navigate('/login', { replace: true });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(o => !o);
    }
  }

  const letter = user?.email?.[0]?.toUpperCase() || 'U';
  const roleLabel = role || 'Staff';

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => o ? false : true)}
        onKeyDown={onKeyDown}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        {letter}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-lg border border-gray-200 z-50"
        >
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-medium">{user?.email || 'User'}</p>
            <p className="text-xs text-gray-500">{roleLabel}</p>
          </div>
          <button
            onClick={logout}
            className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 text-sm"
            role="menuitem"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

