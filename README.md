# TravelAmal CRM

Système de gestion de la relation client (CRM) conçu pour les agences de voyage. Construit avec React, TypeScript, Vite et Supabase.

---

## Table des matières

- [Présentation](#présentation)
- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Prérequis](#prérequis)
- [Installation et lancement](#installation-et-lancement)
- [Structure du projet](#structure-du-projet)
- [Rôles et permissions](#rôles-et-permissions)

---

## Présentation

TravelAmal CRM permet aux agences de voyage de gérer leurs clients, leurs paiements, leurs dépenses et leurs alertes documentaires depuis une interface centralisée. L'application est accessible via navigateur et hébergée sur Vercel avec une base de données Supabase.

---

## Fonctionnalités

### Tableau de bord
- Vue d'ensemble en temps réel : nombre total de clients, dossiers actifs, total mensuel encaissé
- Graphiques interactifs des paiements (évolution mensuelle)
- Répartition des services par graphique en secteurs
- Classement des employés par performance

### Gestion des clients
- Création, modification et consultation des dossiers clients
- Filtres avancés : recherche par nom / téléphone / email, filtrage par service, statut, employé responsable et plage de dates
- Suivi du montant total, montant payé et reste à payer par dossier
- Quatre onglets par dossier : **Aperçu**, **Paiements**, **Documents**, **Activité**

### Paiements
- Enregistrement des paiements par client
- Historique complet de tous les paiements avec enregistreur et date
- Vue par client (montant restant dû) et vue historique globale
- Accessible aux administrateurs et aux employés

### Dépenses
- Ajout et suivi des dépenses de l'agence
- Pièces justificatives (upload d'images)
- Filtrage et export des dépenses
- Suppression réservée aux administrateurs

### Alertes documentaires
- Détection automatique des documents expirant dans les 45 jours : passeports, attestations B3
- Alertes de voyage imminentes (dans les 7 jours)
- Marquage des alertes comme traitées directement depuis la liste

### Statistiques *(Admin uniquement)*
- Indicateurs clés : clients, paiements collectés, chiffre d'affaires total, solde restant
- Filtres temporels : aujourd'hui, hier, 7 jours, 30 jours, mois en cours, année, tout
- Graphiques en barres et en aires pour l'évolution des encaissements
- Export PDF du rapport statistique

### Activité *(Admin uniquement)*
- Journal d'audit complet de toutes les actions effectuées dans le système

### Paramètres *(Admin uniquement)*
- Gestion des utilisateurs : création de comptes avec nom, email, mot de passe et rôle
- Modification des rôles (Admin / Employé)
- Liste des membres de l'équipe avec statut

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Base de données | Supabase (PostgreSQL) |
| Authentification | Supabase Auth |
| Style | Tailwind CSS + shadcn/ui |
| Requêtes | TanStack Query (React Query) |
| Routage | React Router v6 |
| Graphiques | Recharts |
| Notifications | Sonner |
| Hébergement | Vercel |

---

## Prérequis

- **Node.js** v18 ou supérieur
- Un projet **Supabase** avec le schéma appliqué (voir `supabase_schema.sql`)

---

## Installation et lancement

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/NassimTarkhani/travelamal-CRM.git
   cd travelamal-CRM
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer les variables d'environnement**

   Créer un fichier `.env.local` à la racine :
   ```env
   VITE_SUPABASE_URL=https://<votre-projet>.supabase.co
   VITE_SUPABASE_ANON_KEY=<votre-clé-anon>
   ```

4. **Appliquer le schéma Supabase**

   Exécuter le fichier `supabase_schema.sql` dans l'éditeur SQL de votre projet Supabase.

5. **Lancer en développement**
   ```bash
   npm run dev
   ```

6. **Build de production**
   ```bash
   npm run build
   ```

---

## Structure du projet

```
src/
├── app/
│   ├── (auth)/login/          # Page de connexion
│   └── (dashboard)/           # Toutes les pages protégées
│       ├── page.tsx            # Tableau de bord
│       ├── clients/            # Gestion des clients
│       ├── payments/           # Paiements
│       ├── expenses/           # Dépenses
│       ├── alerts/             # Alertes documentaires
│       ├── statistics/         # Statistiques (admin)
│       ├── activity/           # Journal d'activité (admin)
│       └── settings/           # Paramètres et utilisateurs (admin)
├── components/                 # Composants réutilisables
├── hooks/                      # Hooks personnalisés (permissions…)
├── lib/                        # Supabase client, utilitaires, validations
├── stores/                     # État global (auth)
└── types/                      # Types TypeScript
```

---

## Rôles et permissions

| Action | Admin | Employé |
|---|:---:|:---:|
| Créer un dossier client | ✅ | ✅ |
| Modifier un dossier | ✅ | ❌ |
| Supprimer un dossier | ✅ | ❌ |
| Ajouter un paiement | ✅ | ✅ |
| Valider un paiement | ✅ | ❌ |
| Ajouter une dépense | ✅ | ✅ |
| Supprimer une dépense | ✅ | ❌ |
| Voir les statistiques | ✅ | ❌ |
| Voir le journal d'activité | ✅ | ❌ |
| Gérer les utilisateurs | ✅ | ❌ |
