import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SuperAdminProtectedRouteProps {
  children: React.ReactNode;
}

const SuperAdminProtectedRoute: React.FC<SuperAdminProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      try {
        // التحقق من وجود دور super_admin
        const { data: userRoles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'super_admin')
          .single();

        if (error) {
          console.error('Error checking super admin role:', error);
          setHasAccess(false);
        } else {
          setHasAccess(!!userRoles);
        }
      } catch (error) {
        console.error('Error in access check:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkAccess();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
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
    return <Navigate to="/system/auth" replace />;
  }

  if (hasAccess === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">غير مصرح</h2>
          <p className="text-muted-foreground mb-4">
            ليس لديك صلاحية للوصول إلى هذه الصفحة. تحتاج إلى صلاحيات مدير النظام.
          </p>
          <button
            onClick={() => window.history.back()}
            className="text-primary hover:underline"
          >
            العودة للصفحة السابقة
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default SuperAdminProtectedRoute;