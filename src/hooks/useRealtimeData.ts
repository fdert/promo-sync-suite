import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];

export const useRealtimeData = <T = any>(
  tableName: TableName,
  initialData: T[] = [],
  orderBy?: { column: string; ascending?: boolean }
) => {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      let query = supabase.from(tableName).select('*');
      
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
      }
      
      const { data: fetchedData, error } = await query;
      
      if (error) throw error;
      setData((fetchedData as T[]) || []);
    } catch (error) {
      console.error(`Error fetching ${tableName}:`, error);
      toast({
        title: "خطأ في جلب البيانات",
        description: `حدث خطأ في جلب بيانات ${tableName}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // إعداد مراقبة البيانات في الوقت الفعلي
    const channel = supabase
      .channel(`${tableName}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName
        },
        (payload) => {
          console.log(`${tableName} changed:`, payload);
          
          if (payload.eventType === 'INSERT') {
            setData(current => [payload.new as T, ...current]);
            toast({
              title: "تم إضافة عنصر جديد",
              description: `تم إضافة عنصر جديد في ${tableName}`,
            });
          } else if (payload.eventType === 'UPDATE') {
            setData(current => 
              current.map(item => 
                (item as any).id === (payload.new as any).id ? payload.new as T : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setData(current => 
              current.filter(item => (item as any).id !== (payload.old as any).id)
            );
            toast({
              title: "تم حذف عنصر",
              description: `تم حذف عنصر من ${tableName}`,
              variant: "destructive",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName]);

  return {
    data,
    loading,
    refetch: fetchData
  };
};