import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Shield, User, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false);
  const [newUser, setNewUser] = React.useState({ name: '', email: '', role: 'Employé', password: '' });

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // In a real app, this would use admin.inviteUserByEmail for security
      // For local demo, we use signUp
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            name: newUser.name,
            role: newUser.role
          }
        }
      });

      if (signUpError) throw signUpError;

      toast.success('Invitation envoyée à ' + newUser.email);
      setIsAddUserOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-navy">Paramètres Système</h1>
          <p className="text-sm text-gray-500">Gestion de l'équipe et des accès</p>
        </div>
        <Button 
          className="bg-blue hover:bg-blue/90 rounded-xl"
          onClick={() => setIsAddUserOpen(true)}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Nouvel Utilisateur
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50/50">
              <CardTitle className="text-lg font-bold text-navy">Gestion des Utilisateurs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-50">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-20 w-full animate-pulse bg-gray-50/50"></div>
                  ))
                ) : (
                  users?.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-6 transition-colors hover:bg-gray-50/50">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                          <AvatarImage src={user.avatar_url || ''} />
                          <AvatarFallback className="bg-blue text-white font-bold">{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-navy">{user.name}</p>
                          <p className="text-xs text-gray-500 font-medium">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                            user.role === 'Admin' ? "bg-navy text-white shadow-navy/20" :
                              "bg-blue/10 text-blue border-blue/20"
                          )}
                        >
                          {user.role}
                        </Badge>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-navy group">
                          Gérer <Edit className="h-3 w-3 ml-2 opacity-0 group-hover:opacity-100" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50/50">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-gray-400">Règles & Accès</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-start space-x-3 rounded-xl bg-gray-50 p-4 border-l-4 border-navy">
                <Shield className="mt-1 h-5 w-5 text-navy" />
                <div>
                  <p className="text-sm font-bold text-navy">Admin</p>
                  <p className="text-xs text-gray-500 leading-relaxed">Contrôle total des finances, gestion des accès et suppression.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rounded-xl bg-gray-50 p-4 border-l-4 border-blue">
                <User className="mt-1 h-5 w-5 text-blue" />
                <div>
                  <p className="text-sm font-bold text-navy">Employé</p>
                  <p className="text-xs text-gray-500 leading-relaxed">Saisie des dossiers, ajout de documents et historique personnel.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* User Creation Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={() => setIsAddUserOpen(false)}></div>
          <Card className="relative w-full max-w-md border-none shadow-2xl animate-in zoom-in duration-200">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-navy">Ajouter un collaborateur</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Nom complet</label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-xl border-gray-100 bg-gray-50 px-4 py-2.5 text-sm focus:border-blue focus:ring-blue"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Email professionnel</label>
                  <input
                    type="email"
                    required
                    className="w-full rounded-xl border-gray-100 bg-gray-50 px-4 py-2.5 text-sm focus:border-blue focus:ring-blue"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Rôle</label>
                  <select
                    className="w-full rounded-xl border-gray-100 bg-gray-50 px-4 py-2.5 text-sm focus:border-blue focus:ring-blue"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    <option value="Employé">Employé</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Mot de passe provisoire</label>
                  <input
                    type="password"
                    required
                    className="w-full rounded-xl border-gray-100 bg-gray-50 px-4 py-2.5 text-sm focus:border-blue focus:ring-blue"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <Button variant="ghost" type="button" className="flex-1 rounded-xl" onClick={() => setIsAddUserOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" className="flex-1 rounded-xl bg-blue hover:bg-blue/90">
                    Inviter l'utilisateur
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

