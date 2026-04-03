import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  CreditCard,
  ClipboardList,
  Folder,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Wallet
} from 'lucide-react';
import logo from '@/assets/logo.jpeg';
import { useAuthStore } from '@/stores/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const Sidebar = () => {
  const { profile, signOut } = useAuthStore();
  const { isAdmin, canViewStats, canManageUsers } = usePermissions();
  const navigate = useNavigate();

  const navItems = isAdmin
    ? [
      { name: 'Accueil', path: '/', icon: Home },
      { name: 'Clients', path: '/clients', icon: Users },
      { name: 'Alertes', path: '/alerts', icon: Bell },
      { name: 'Paiements', path: '/payments', icon: CreditCard },
      { name: 'Dépenses', path: '/expenses', icon: Wallet },
      { name: 'Activité', path: '/activity', icon: ClipboardList },
      { name: 'Documents', path: '/documents', icon: Folder },
    ]
    : [
      { name: 'Clients', path: '/clients', icon: Users },
      { name: 'Alertes', path: '/alerts', icon: Bell },
      { name: 'Dépenses', path: '/expenses', icon: Wallet },
    ];

  if (canViewStats) {
    navItems.push({ name: 'Statistiques', path: '/statistics', icon: BarChart3 });
  }

  if (canManageUsers) {
    navItems.push({ name: 'Paramètres', path: '/settings', icon: Settings });
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-navy text-white shadow-xl transition-transform">
      <div className="flex h-full flex-col px-3 py-4">
        <div className="mb-10 px-4 py-2 flex items-center">
          <div className="h-20 w-20 rounded-full overflow-hidden bg-white/5 flex items-center justify-center">
            <img src={logo} alt="Amal Hassan Travel" className="h-full w-full object-cover" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-semibold">&nbsp;</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "group flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:bg-white/10",
                  isActive ? "bg-white/10 text-gold border-l-4 border-gold pl-3" : "text-white/70"
                )
              }
            >
              <item.icon className={cn("mr-3 h-5 w-5 transition-colors", "group-hover:text-gold")} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-4">
          <div className="flex items-center px-4 py-3">
            <Avatar className="h-10 w-10 border-2 border-gold/20">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-blue text-white">{profile?.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="ml-3 overflow-hidden">
              <p className="truncate text-sm font-semibold">{profile?.name}</p>
              <Badge variant="outline" className="mt-1 border-gold/30 bg-gold/10 text-[10px] text-gold">
                {profile?.role}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            className="mt-2 w-full justify-start rounded-xl text-white/60 hover:bg-red/10 hover:text-red"
            onClick={() => {
              signOut();
              navigate('/login', { replace: true });
            }}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Se déconnecter
          </Button>
        </div>
      </div>
    </aside>
  );
};
