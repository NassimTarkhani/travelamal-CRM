import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@/types/app.types';

export const usePermissions = () => {
  const { profile } = useAuthStore();
  const role = profile?.role as UserRole | undefined;

  return {
    role,
    isAdmin: role === 'Admin',
    isEmployee: role === 'Employé',
    canCreate: role === 'Admin' || role === 'Employé',
    canEdit: role === 'Admin',
    canDelete: role === 'Admin',
    canAddPayment: role === 'Admin' || role === 'Employé',
    canMarkPaid: role === 'Admin',
    canViewStats: role === 'Admin',
    canManageUsers: role === 'Admin',
    canViewPayments: role === 'Admin' || role === 'Employé',
    canViewActivity: role === 'Admin',
    canViewDocuments: role === 'Admin' || role === 'Employé',
    canViewExpenses: role === 'Admin' || role === 'Employé',
    canAddExpense: role === 'Admin' || role === 'Employé',
  };
};
