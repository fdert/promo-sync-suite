import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SubscriptionPlan {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  price: number;
  billing_period: string;
  max_agencies: number;
  max_users_per_agency: number;
  max_customers_per_agency: number;
  max_orders_per_month: number;
  max_storage_gb: number;
  features: any;
  features_ar: any;
  is_popular: boolean;
  is_active: boolean;
}

export interface Subscription {
  id: string;
  agency_id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  plan?: SubscriptionPlan;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCurrentSubscription();
    }
    fetchAvailablePlans();
  }, [user]);

  const fetchCurrentSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setCurrentSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const fetchAvailablePlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setAvailablePlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async (planId: string) => {
    try {
      const plan = availablePlans.find(p => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      // هنا سيتم ربط Stripe
      const { data, error } = await supabase
        .from('subscriptions')
        .insert([{
          plan_id: planId,
          status: 'pending',
          starts_at: new Date().toISOString(),
          ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // شهر واحد
        }])
        .select()
        .single();

      if (error) throw error;
      
      await fetchCurrentSubscription();
      return data;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  };

  const cancelSubscription = async () => {
    try {
      if (!currentSubscription) return;

      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', currentSubscription.id);

      if (error) throw error;
      
      await fetchCurrentSubscription();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  };

  const isFeatureAvailable = (feature: string) => {
    if (!currentSubscription?.plan) return false;
    
    const features = currentSubscription.plan.features_ar || [];
    return features.includes(feature);
  };

  const getLimitStatus = (type: 'users' | 'customers' | 'orders' | 'storage') => {
    if (!currentSubscription?.plan) return { limit: 0, unlimited: false };
    
    const plan = currentSubscription.plan;
    
    switch (type) {
      case 'users':
        return { limit: plan.max_users_per_agency, unlimited: plan.max_users_per_agency >= 50 };
      case 'customers':
        return { limit: plan.max_customers_per_agency, unlimited: plan.max_customers_per_agency >= 2000 };
      case 'orders':
        return { limit: plan.max_orders_per_month, unlimited: plan.max_orders_per_month >= 1000 };
      case 'storage':
        return { limit: plan.max_storage_gb, unlimited: plan.max_storage_gb >= 20 };
      default:
        return { limit: 0, unlimited: false };
    }
  };

  return {
    currentSubscription,
    availablePlans,
    loading,
    createSubscription,
    cancelSubscription,
    isFeatureAvailable,
    getLimitStatus,
    refetch: () => {
      fetchCurrentSubscription();
      fetchAvailablePlans();
    }
  };
};