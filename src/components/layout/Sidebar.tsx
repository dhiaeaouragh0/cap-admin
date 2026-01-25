import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Tags, MapPin, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils'; // shadcn has this utility

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/wilayas', label: 'Wilayas Shipping', icon: MapPin },
];

export default function Sidebar() {
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/login';
  };

  return (
    <aside className="w-64 border-r bg-card text-card-foreground flex flex-col">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold">DZ Game Zone Admin</h2>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t mt-auto">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50 w-full"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}