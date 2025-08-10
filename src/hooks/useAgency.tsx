import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Agency {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  website?: string;
  is_active: boolean;
  subscription_plan: string;
  max_users: number;
  max_customers: number;
  max_storage_gb: number;
  subscription_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AgencyMember {
  id: string;
  agency_id: string;
  user_id: string;
  role: string;
  permissions: any;
  is_active: boolean;
  joined_at: string;
}

export const useAgency = () => {
  const { user } = useAuth();
  const [currentAgency, setCurrentAgency] = useState<Agency | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCurrentAgency();
    }
  }, [user]);

  const fetchCurrentAgency = async () => {
    try {
      // الحصول على الوكالة الحالية للمستخدم
      const { data: memberData, error: memberError } = await supabase
        .from('agency_members')
        .select(`
          role,
          agency_id,
          agencies:agency_id (*)
        `)
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .single();

      if (memberError) {
        console.error('Error fetching agency:', memberError);
        return;
      }

      if (memberData?.agencies) {
        setCurrentAgency(memberData.agencies as Agency);
        setUserRole(memberData.role);
      }
    } catch (error) {
      console.error('Error in fetchCurrentAgency:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAgency = async (agencyData: Partial<Agency> & { name: string; slug: string }) => {
    try {
      const { data, error } = await supabase
        .from('agencies')
        .insert(agencyData)
        .select()
        .single();

      if (error) throw error;

      // إضافة المستخدم الحالي كمالك للوكالة
      await supabase
        .from('agency_members')
        .insert([{
          agency_id: data.id,
          user_id: user?.id,
          role: 'owner'
        }]);

      setCurrentAgency(data);
      setUserRole('owner');
      return data;
    } catch (error) {
      console.error('Error creating agency:', error);
      throw error;
    }
  };

  const updateAgency = async (id: string, updates: Partial<Agency>) => {
    try {
      const { data, error } = await supabase
        .from('agencies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setCurrentAgency(data);
      return data;
    } catch (error) {
      console.error('Error updating agency:', error);
      throw error;
    }
  };

  const addMember = async (agencyId: string, userEmail: string, role: string) => {
    try {
      // البحث عن المستخدم بالإيميل في جدول العملاء أو المستخدمين المسجلين
      const { data: userData, error: userError } = await supabase
        .from('customers')
        .select('id, name, email')
        .eq('email', userEmail.trim())
        .single();

      if (userError || !userData) {
        throw new Error('المستخدم غير موجود في النظام');
      }

      // التحقق من عدم وجود العضو مسبقاً
      const { data: existingMember } = await supabase
        .from('agency_members')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('user_id', userData.id)
        .eq('is_active', true)
        .maybeSingle();

      if (existingMember) {
        throw new Error('المستخدم عضو في الوكالة بالفعل');
      }

      const { data, error } = await supabase
        .from('agency_members')
        .insert([{
          agency_id: agencyId,
          user_id: userData.id,
          role
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error adding member:', error);
      throw new Error(error.message || 'حدث خطأ أثناء إضافة العضو');
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('agency_members')
        .update({ is_active: false })
        .eq('id', memberId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  };

  const getAgencyMembers = async (agencyId: string) => {
    try {
      const { data, error } = await supabase
        .from('agency_members')
        .select(`
          *,
          customers:user_id (
            name,
            email
          )
        `)
        .eq('agency_id', agencyId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching agency members:', error);
      throw error;
    }
  };

  const hasPermission = (permission: string) => {
    if (!userRole) return false;
    
    // أصحاب الوكالات والمدراء لديهم جميع الصلاحيات
    if (userRole === 'owner' || userRole === 'admin') return true;
    
    // يمكن إضافة منطق إضافي للصلاحيات حسب الحاجة
    return false;
  };

  return {
    currentAgency,
    userRole,
    loading,
    createAgency,
    updateAgency,
    addMember,
    removeMember,
    getAgencyMembers,
    hasPermission,
    refetch: fetchCurrentAgency
  };
};