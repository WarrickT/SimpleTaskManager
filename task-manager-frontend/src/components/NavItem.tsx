interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
}

export function NavItem({ icon, label, active = false }: NavItemProps) {
    return (
        <div
        className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-100 
            ${active ? 'bg-gray-100 text-blue-600 font-semibold' : 'text-gray-700'}`}
        >
        {icon}
        <span>{label}</span>
        </div>
    );
}
