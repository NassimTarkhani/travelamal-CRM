import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import logo from '@/assets/logo.jpeg';
import { Checkbox } from '@/components/ui/checkbox';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase non configure. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans votre fichier .env');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Aucun utilisateur retourne par Supabase');

      toast.success('Connexion réussie');
      // Let auth store resolve profile and role after session is established.
      navigate('/', { replace: true });

    } catch (error: any) {
      toast.error(error.message || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy bg-gradient-to-br from-navy to-blue/20 p-4">
      <Card className="w-full max-w-md border-none shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 flex justify-center">
            <div className="h-20 w-20 rounded-full overflow-hidden bg-white/5 flex items-center justify-center">
              <img src={logo} alt="Travelamal" className="h-full w-full object-cover" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-navy">Bienvenue</CardTitle>
          <CardDescription>
            Connectez-vous pour accéder à votre espace de gestion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nom@agence.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2">
                <Checkbox checked={remember} onCheckedChange={(v: any) => setRemember(Boolean(v))} />
                <span className="text-sm">Se souvenir de moi</span>
              </label>
            </div>

            <Button type="submit" className="w-full bg-blue hover:bg-blue/90" disabled={loading}>
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </Button>

            <p className="mt-2 text-center text-xs text-muted-foreground">Besoin d'aide ? Contactez votre administrateur.</p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
