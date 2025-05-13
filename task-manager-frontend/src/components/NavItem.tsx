interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
  }
  
  export function NavItem({ icon, label, active = false }: NavItemProps) {
    return (
      <div
        className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer 
          hover:bg-soft hover:bg-opacity-50 transition-colors
          ${active ? 'bg-background text-primary font-semibold' : 'text-mutedText'}`}
      >
        {icon}
        <span>{label}</span>
      </div>
    );
  }
  