import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const TopBar = () => {
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Tableau de Bord';
    if (path.startsWith('/clients')) return 'Gestion des Clients';
    if (path === '/payments') return 'Suivi des Paiements';
    if (path === '/activity') return 'Journal d\'Activité';
    if (path === '/documents') return 'Gestion Documentaire';
    if (path === '/statistics') return 'Analyses & Statistiques';
    if (path === '/settings') return 'Paramètres Système';
    return 'TRAVELAMAL';
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white/80 px-8 backdrop-blur-md">
      <h2 className="font-serif text-2xl font-bold text-navy">{getPageTitle()}</h2>

      <div className="flex items-center space-x-4">



      </div>
    </header>
  );
};
