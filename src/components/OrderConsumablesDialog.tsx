// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Package } from "lucide-react";

interface Consumable {
  id?: string;
  material_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes?: string;
}

interface OrderConsumablesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
}

export const OrderConsumablesDialog: React.FC<OrderConsumablesDialogProps> = ({
  isOpen,
  onClose,
  orderId,
  orderNumber,
}) => {
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // جلب المستهلكات الحالية
  const fetchConsumables = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_consumables')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setConsumables(data.map(item => ({
          id: item.id,
          material_name: item.material_name,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          total: Number(item.total),
          notes: item.notes || '',
        })));
      } else {
        setConsumables([{
          material_name: '',
          quantity: 1,
          unit_price: 0,
          total: 0,
          notes: '',
        }]);
      }
    } catch (error) {
      console.error('Error fetching consumables:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب المستهلكات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && orderId) {
      fetchConsumables();
    }
  }, [isOpen, orderId]);

  // إضافة مستهلك جديد
  const addConsumable = () => {
    setConsumables([...consumables, {
      material_name: '',
      quantity: 1,
      unit_price: 0,
      total: 0,
      notes: '',
    }]);
  };

  // حذف مستهلك
  const removeConsumable = async (index: number) => {
    const consumable = consumables[index];
    
    // إذا كان له id، نحذفه من قاعدة البيانات
    if (consumable.id) {
      try {
        const { error } = await supabase
          .from('order_consumables')
          .delete()
          .eq('id', consumable.id);
        
        if (error) throw error;
      } catch (error) {
        console.error('Error deleting consumable:', error);
        toast({
          title: "خطأ",
          description: "فشل في حذف المستهلك",
          variant: "destructive",
        });
        return;
      }
    }
    
    const updated = consumables.filter((_, i) => i !== index);
    setConsumables(updated.length > 0 ? updated : [{
      material_name: '',
      quantity: 1,
      unit_price: 0,
      total: 0,
      notes: '',
    }]);
  };

  // تحديث قيمة مستهلك
  const updateConsumable = (index: number, field: keyof Consumable, value: any) => {
    const updated = [...consumables];
    updated[index] = { ...updated[index], [field]: value };
    
    // حساب الإجمالي تلقائياً
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total = updated[index].quantity * updated[index].unit_price;
    }
    
    setConsumables(updated);
  };

  // حفظ المستهلكات
  const saveConsumables = async () => {
    setSaving(true);
    try {
      // فلترة المستهلكات الفارغة
      const validConsumables = consumables.filter(c => c.material_name.trim() !== '');
      
      if (validConsumables.length === 0) {
        toast({
          title: "تنبيه",
          description: "يرجى إضافة مستهلك واحد على الأقل",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // حذف المستهلكات القديمة غير الموجودة
      const existingIds = validConsumables.filter(c => c.id).map(c => c.id);
      const { error: deleteError } = await supabase
        .from('order_consumables')
        .delete()
        .eq('order_id', orderId)
        .not('id', 'in', existingIds.length > 0 ? `(${existingIds.join(',')})` : '()');

      // تحديث/إضافة المستهلكات
      for (const consumable of validConsumables) {
        if (consumable.id) {
          // تحديث
          const { error } = await supabase
            .from('order_consumables')
            .update({
              material_name: consumable.material_name,
              quantity: consumable.quantity,
              unit_price: consumable.unit_price,
              total: consumable.total,
              notes: consumable.notes,
            })
            .eq('id', consumable.id);
          
          if (error) throw error;
        } else {
          // إضافة جديد
          const { error } = await supabase
            .from('order_consumables')
            .insert({
              order_id: orderId,
              material_name: consumable.material_name,
              quantity: consumable.quantity,
              unit_price: consumable.unit_price,
              total: consumable.total,
              notes: consumable.notes,
              created_by: user?.id,
            });
          
          if (error) throw error;
        }
      }

      toast({
        title: "تم الحفظ",
        description: "تم حفظ المستهلكات بنجاح",
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving consumables:', error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ المستهلكات",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // حساب الإجمالي الكلي
  const grandTotal = consumables.reduce((sum, c) => sum + (c.total || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            تسجيل المستهلكات - الطلب {orderNumber}
          </DialogTitle>
          <DialogDescription>
            سجّل المواد والمستهلكات المستخدمة في تنفيذ هذا الطلب (لا تُضاف للمدفوعات أو المصروفات)
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : (
          <div className="space-y-4">
            {consumables.map((consumable, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="md:col-span-2 space-y-2">
                    <Label>اسم المادة *</Label>
                    <Input
                      value={consumable.material_name}
                      onChange={(e) => updateConsumable(index, 'material_name', e.target.value)}
                      placeholder="مثال: ورق طباعة A4"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>الكمية</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={consumable.quantity}
                      onChange={(e) => updateConsumable(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>سعر الوحدة</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={consumable.unit_price}
                      onChange={(e) => updateConsumable(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>الإجمالي</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={consumable.total.toFixed(2)}
                        disabled
                        className="bg-muted"
                      />
                      {consumables.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => removeConsumable(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>ملاحظات</Label>
                  <Textarea
                    value={consumable.notes || ''}
                    onChange={(e) => updateConsumable(index, 'notes', e.target.value)}
                    placeholder="ملاحظات إضافية..."
                    rows={2}
                  />
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addConsumable} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              إضافة مستهلك آخر
            </Button>

            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-lg font-semibold text-center">
                إجمالي المستهلكات: {grandTotal.toFixed(2)} ر.س
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                إلغاء
              </Button>
              <Button onClick={saveConsumables} disabled={saving}>
                {saving ? 'جاري الحفظ...' : 'حفظ المستهلكات'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
