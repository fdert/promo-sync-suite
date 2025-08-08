import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, Copy, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PricingCalculation {
  boardPrice: number;
  boardLength: number;
  boardWidth: number;
  designLength: number;
  designWidth: number;
  quantity: number;
}

const PricingCalculator = () => {
  const { toast } = useToast();
  const [calculation, setCalculation] = useState<PricingCalculation>({
    boardPrice: 0,
    boardLength: 0,
    boardWidth: 0,
    designLength: 0,
    designWidth: 0,
    quantity: 1,
  });

  const updateField = (field: keyof PricingCalculation, value: number) => {
    setCalculation(prev => ({ ...prev, [field]: value }));
  };

  // المعادلات
  const boardArea = calculation.boardLength * calculation.boardWidth;
  const pricePerCm2 = boardArea > 0 ? calculation.boardPrice / boardArea : 0;
  const designArea = calculation.designLength * calculation.designWidth;
  const finalPrice = pricePerCm2 * designArea * calculation.quantity;

  const copyResult = () => {
    const result = `السعر النهائي: ${finalPrice.toFixed(2)} ر.س\nالكمية: ${calculation.quantity}\nمساحة التصميم: ${designArea} سم²\nسعر السم²: ${pricePerCm2.toFixed(4)} ر.س`;
    navigator.clipboard.writeText(result);
    toast({
      title: "تم النسخ",
      description: "تم نسخ النتيجة إلى الحافظة",
    });
  };

  const resetCalculation = () => {
    setCalculation({
      boardPrice: 0,
      boardLength: 0,
      boardWidth: 0,
      designLength: 0,
      designWidth: 0,
      quantity: 1,
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
          حاسبة التسعيرات الأولية - الألواح
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* بيانات اللوح */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">بيانات اللوح</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="boardPrice">سعر اللوح الكامل (ر.س)</Label>
              <Input
                id="boardPrice"
                type="number"
                min="0"
                step="0.01"
                value={calculation.boardPrice || ''}
                onChange={(e) => updateField('boardPrice', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="boardLength">طول اللوح (سم)</Label>
              <Input
                id="boardLength"
                type="number"
                min="0"
                step="0.1"
                value={calculation.boardLength || ''}
                onChange={(e) => updateField('boardLength', parseFloat(e.target.value) || 0)}
                placeholder="0.0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="boardWidth">عرض اللوح (سم)</Label>
              <Input
                id="boardWidth"
                type="number"
                min="0"
                step="0.1"
                value={calculation.boardWidth || ''}
                onChange={(e) => updateField('boardWidth', parseFloat(e.target.value) || 0)}
                placeholder="0.0"
              />
            </div>
          </div>
        </div>

        {/* بيانات التصميم */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">بيانات التصميم</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="designLength">طول التصميم (سم)</Label>
              <Input
                id="designLength"
                type="number"
                min="0"
                step="0.1"
                value={calculation.designLength || ''}
                onChange={(e) => updateField('designLength', parseFloat(e.target.value) || 0)}
                placeholder="0.0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designWidth">عرض التصميم (سم)</Label>
              <Input
                id="designWidth"
                type="number"
                min="0"
                step="0.1"
                value={calculation.designWidth || ''}
                onChange={(e) => updateField('designWidth', parseFloat(e.target.value) || 0)}
                placeholder="0.0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">الكمية</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                step="1"
                value={calculation.quantity || ''}
                onChange={(e) => updateField('quantity', parseInt(e.target.value) || 1)}
                placeholder="1"
              />
            </div>
          </div>
        </div>

        {/* النتائج */}
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
          <h3 className="text-lg font-semibold text-foreground">النتائج</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">مساحة اللوح (سم²)</Label>
              <div className="text-lg font-medium">{boardArea.toLocaleString()} سم²</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">سعر لكل سم²</Label>
              <div className="text-lg font-medium">{pricePerCm2.toFixed(4)} ر.س</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">مساحة التصميم (سم²)</Label>
              <div className="text-lg font-medium">{designArea.toLocaleString()} سم²</div>
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
          <p>• مساحة اللوح = طول اللوح × عرض اللوح</p>
          <p>• سعر لكل سم² = سعر اللوح ÷ مساحة اللوح</p>
          <p>• مساحة التصميم = طول التصميم × عرض التصميم</p>
          <p>• السعر النهائي = السعر لكل سم² × مساحة التصميم × الكمية</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PricingCalculator;