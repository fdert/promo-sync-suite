import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface EmployeeProtectedRouteProps {
  children: ReactNode;
}

const EmployeeProtectedRoute: React.FC<EmployeeProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const [hasEmployeeAccess, setHasEmployeeAccess] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkEmployeeAccess = async () => {
      if (!user) {
        setHasEmployeeAccess(false);
        setIsChecking(false);
        return;
      }

      try {
        console.log('🔍 فحص صلاحيات الموظف للمستخدم:', user.id);
        
        const { data: userRoles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('❌ خطأ في جلب الأدوار:', error);
          setHasEmployeeAccess(false);
          setIsChecking(false);
          return;
        }

        const roles = userRoles?.map(r => r.role) || [];
        console.log('🎭 أدوار المستخدم:', roles);
        
        // الموظفون، المدراء، والمديرون يمكنهم الوصول لصفحة الموظف
        const canAccess = roles.includes('employee') || roles.includes('admin') || roles.includes('manager');
        console.log('✅ هل يمكن الوصول:', canAccess);
        
        setHasEmployeeAccess(canAccess);
      } catch (error) {
        console.error('Error checking employee access:', error);
        setHasEmployeeAccess(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkEmployeeAccess();
  }, [user?.id]);

  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (hasEmployeeAccess === false) {
    return <Navigate to="/user" replace />;
  }

  return <>{children}</>;
};

export default EmployeeProtectedRoute;