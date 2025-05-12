import { CalendarDays, HelpCircle, Home } from 'lucide-react';
import { NavItem } from './NavItem';

export default function Sidebar() {
  return (
    <aside className="h-screen w-64 bg-white border-r p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center mb-10">
          <div>
            <h1 className="text-lg font-bold">Simple Task Manager</h1>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          <NavItem icon={<Home size={20} />} label="Tasks Dashboard" active />
          <NavItem icon={<CalendarDays size={20} />} label="Time Optimization GPT" />
        </nav>
      </div>

      <NavItem icon={<HelpCircle size={20} />} label="Help Center" />
    </aside>
  );
}
