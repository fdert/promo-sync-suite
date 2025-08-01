import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['app_role'];

interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  requiredPermissions?: string[];
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  children, 
  allowedRoles, 
  requiredPermissions = [] 
}) => {
  const { user, loading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setHasAccess(false);
        setIsCheckingAccess(false);
        return;
      }

      try {
        // فحص الأدوار
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const userRolesList = userRoles?.map(r => r.role as UserRole) || [];
        const hasRequiredRole = allowedRoles.some(role => userRolesList.includes(role));

        if (!hasRequiredRole) {
          setHasAccess(false);
          setIsCheckingAccess(false);
          return;
        }

        // فحص الصلاحيات إذا كانت مطلوبة
        if (requiredPermissions.length > 0) {
          const { data: userPermissions } = await supabase
            .from('user_permissions')
            .select('permission')
            .eq('user_id', user.id);

          const userPermissionsList = userPermissions?.map(p => p.permission) || [];
          const hasAllPermissions = requiredPermissions.every(permission => 
            userPermissionsList.includes(permission)
          );

          setHasAccess(hasAllPermissions);
        } else {
          setHasAccess(true);
        }
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAccess();
  }, [user, allowedRoles, requiredPermissions]);

  if (loading || isCheckingAccess) {
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

  if (hasAccess === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">غير مصرح لك بالوصول</h1>
          <p className="text-muted-foreground mb-4">
            ليس لديك الصلاحيات اللازمة للوصول لهذه الصفحة
          </p>
          <Navigate to="/admin" replace />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;