import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1">
        <TopNav />
        <main className="p-6 animate-[slideFadeIn_200ms_ease-out]">{children}</main>
      </div>
    </div>
  );
}
