import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Copy, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PrintCalculation {
  materialType: string;
  rollLength: number; // بالمتر
  rollPrice: number; // سعر الرول كامل
  inkCost: number; // تكلفة الحبر
  designLength: number; // بالسم
  designWidth: number; // بالسم
  quantity: number;
}

const PrintCalculator = () => {
  const { toast } = useToast();
  const [calculation, setCalculation] = useState<PrintCalculation>({
    materialType: "",
    rollLength: 0,
    rollPrice: 0,
    inkCost: 0,
    designLength: 0,
    designWidth: 0,
    quantity: 0,
  });

  const updateField = (field: keyof PrintCalculation, value: number | string) => {
    setCalculation(prev => ({ ...prev, [field]: value }));
  };

  // المعادلات
  const rollLengthCm = calculation.rollLength * 100; // تحويل المتر إلى سم
  const designArea = calculation.designLength * calculation.designWidth; // مساحة التصميم بالسم²
  const pricePerCm = rollLengthCm > 0 ? calculation.rollPrice / rollLengthCm : 0; // سعر السم الطولي
  const materialCost = pricePerCm * calculation.designLength * calculation.quantity; // تكلفة المادة
  const totalInkCost = calculation.inkCost * calculation.quantity; // تكلفة الحبر الإجمالية
  const finalPrice = materialCost + totalInkCost; // السعر النهائي

  const materialTypes = [
    { value: "banner", label: "البنر" },
    { value: "flex", label: "الفلكس" },
    { value: "white_sticker", label: "الاستيكر الأبيض" },
    { value: "transparent_sticker", label: "الاستيكر الشفاف" },
    { value: "polyester_cloth", label: "قماش البوليستر" },
  ];

  const copyResult = () => {
    const materialName = materialTypes.find(m => m.value === calculation.materialType)?.label || 'غير محدد';
    const result = `حاسبة المطبوعات:
المادة: ${materialName}
مساحة التصميم: ${designArea.toLocaleString()} سم²
سعر السم الطولي: ${pricePerCm.toFixed(4)} ر.س
تكلفة المادة: ${materialCost.toFixed(2)} ر.س
تكلفة الحبر: ${totalInkCost.toFixed(2)} ر.س
السعر النهائي: ${finalPrice.toFixed(2)} ر.س
الكمية: ${calculation.quantity}`;
    
    navigator.clipboard.writeText(result);
    toast({
      title: "تم النسخ",
      description: "تم نسخ النتيجة إلى الحافظة",
    });
  };

  const resetCalculation = () => {
    setCalculation({
      materialType: "",
      rollLength: 0,
      rollPrice: 0,
      inkCost: 0,
      designLength: 0,
      designWidth: 0,
      quantity: 0,
    });
    toast({
      title: "تم إعادة التعيين",
      description: "تم مسح جميع البيانات",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          حاسبة المطبوعات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* نوع المادة */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">نوع المادة</h3>
          <div className="space-y-2">
            <Label htmlFor="materialType">اختر نوع المادة</Label>
            <Select value={calculation.materialType} onValueChange={(value) => updateField('materialType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="اختر نوع المادة..." />
              </SelectTrigger>
              <SelectContent>
                {materialTypes.map((material) => (
                  <SelectItem key={material.value} value={material.value}>
                    {material.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* بيانات الرول */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">بيانات الرول</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rollLength">طول الرول (متر)</Label>
              <Input
                id="rollLength"
                type="text"
                value={calculation.rollLength}
                onChange={(e) => updateField('rollLength', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rollPrice">سعر الرول الكامل (ر.س)</Label>
              <Input
                id="rollPrice"
                type="text"
                value={calculation.rollPrice}
                onChange={(e) => updateField('rollPrice', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* بيانات التصميم */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">بيانات التصميم</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="designLength">طول التصميم (سم)</Label>
              <Input
                id="designLength"
                type="text"
                value={calculation.designLength}
                onChange={(e) => updateField('designLength', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designWidth">عرض التصميم (سم)</Label>
              <Input
                id="designWidth"
                type="text"
                value={calculation.designWidth}
                onChange={(e) => updateField('designWidth', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inkCost">تكلفة الحبر للقطعة (ر.س)</Label>
              <Input
                id="inkCost"
                type="text"
                value={calculation.inkCost}
                onChange={(e) => updateField('inkCost', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">الكمية</Label>
              <Input
                id="quantity"
                type="text"
                value={calculation.quantity}
                onChange={(e) => updateField('quantity', parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* النتائج */}
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
          <h3 className="text-lg font-semibold text-foreground">النتائج</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">طول الرول (سم)</Label>
              <div className="text-lg font-medium">{rollLengthCm.toLocaleString()} سم</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">مساحة التصميم (سم²)</Label>
              <div className="text-lg font-medium">{designArea.toLocaleString()} سم²</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">سعر السم الطولي</Label>
              <div className="text-lg font-medium">{pricePerCm.toFixed(4)} ر.س</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">تكلفة المادة</Label>
              <div className="text-lg font-medium">{materialCost.toFixed(2)} ر.س</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">تكلفة الحبر الإجمالية</Label>
              <div className="text-lg font-medium">{totalInkCost.toFixed(2)} ر.س</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">السعر النهائي</Label>
              <div className="text-2xl font-bold text-primary">{finalPrice.toFixed(2)} ر.س</div>
            </div>
          </div>
        </div>

        {/* أزرار العمليات */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={resetCalculation} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            إعادة تعيين
          </Button>
          <Button onClick={copyResult} className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            نسخ النتيجة
          </Button>
        </div>

        {/* معلومات إضافية */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>المعادلات المستخدمة:</strong></p>
          <p>• طول الرول بالسم = طول الرول بالمتر × 100</p>
          <p>• مساحة التصميم = طول التصميم × عرض التصميم</p>
          <p>• سعر السم الطولي = سعر الرول ÷ طول الرول بالسم</p>
          <p>• تكلفة المادة = سعر السم الطولي × طول التصميم × الكمية</p>
          <p>• تكلفة الحبر الإجمالية = تكلفة الحبر للقطعة × الكمية</p>
          <p>• السعر النهائي = تكلفة المادة + تكلفة الحبر الإجمالية</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrintCalculator;