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
  designHeight: number;
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
    designHeight: 0,
    quantity: 0,
  });

  const updateField = (field: keyof PricingCalculation, value: number) => {
    setCalculation(prev => ({ ...prev, [field]: value }));
  };

  // المعادلات
  const boardArea = calculation.boardLength * calculation.boardWidth;
  const pricePerCm2 = boardArea > 0 ? calculation.boardPrice / boardArea : 0;
  const designVolume = calculation.designLength * calculation.designWidth * calculation.designHeight;
  const designArea = calculation.designLength * calculation.designWidth;
  const usedFromBoard = calculation.designHeight; // المستخدم من اللوح = الارتفاع (السماكة المطلوبة)
  // السعر النهائي - إذا كان الارتفاع 0، احسب على المساحة فقط، وإلا احسب على الحجم
  const finalPrice = calculation.designHeight === 0 
    ? pricePerCm2 * designArea * calculation.quantity
    : pricePerCm2 * designArea * calculation.designHeight * calculation.quantity;

  const copyResult = () => {
    const result = `السعر النهائي: ${finalPrice.toFixed(2)} ر.س\nالكمية: ${calculation.quantity}\nحجم التصميم: ${designVolume} سم³\nمساحة التصميم: ${designArea} سم²\nالمستخدم من اللوح: ${usedFromBoard} سم\nسعر السم²: ${pricePerCm2.toFixed(4)} ر.س`;
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
      designHeight: 0,
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
                type="text"
                value={calculation.boardPrice}
                onChange={(e) => updateField('boardPrice', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="boardLength">طول اللوح (سم)</Label>
              <Input
                id="boardLength"
                type="text"
                value={calculation.boardLength}
                onChange={(e) => updateField('boardLength', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="boardWidth">عرض اللوح (سم)</Label>
              <Input
                id="boardWidth"
                type="text"
                value={calculation.boardWidth}
                onChange={(e) => updateField('boardWidth', parseFloat(e.target.value) || 0)}
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
              <Label htmlFor="designHeight">ارتفاع التصميم (سم)</Label>
              <Input
                id="designHeight"
                type="text"
                value={calculation.designHeight}
                onChange={(e) => updateField('designHeight', parseFloat(e.target.value) || 0)}
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
              <Label className="text-sm text-muted-foreground">حجم التصميم (سم³)</Label>
              <div className="text-lg font-medium">{designVolume.toLocaleString()} سم³</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">المستخدم من اللوح (سم)</Label>
              <div className="text-lg font-medium">{usedFromBoard} سم</div>
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
          <p>• حجم التصميم = طول التصميم × عرض التصميم × ارتفاع التصميم</p>
          <p>• المستخدم من اللوح = ارتفاع التصميم (السماكة المطلوبة)</p>
          <p>• السعر النهائي = إذا الارتفاع = 0: السعر لكل سم² × مساحة التصميم × الكمية</p>
          <p>• السعر النهائي = إذا الارتفاع أكبر من 0: السعر لكل سم² × مساحة التصميم × الارتفاع × الكمية</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PricingCalculator;