import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calculator, Printer, Package, X } from "lucide-react";
import PricingCalculator from "@/components/PricingCalculator";
import PrintCalculator from "@/components/PrintCalculator";

const OrderCreationPanel = () => {
  const [isPrintCalculatorOpen, setIsPrintCalculatorOpen] = useState(false);
  const [isAcrylicCalculatorOpen, setIsAcrylicCalculatorOpen] = useState(false);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          إنشاء طلب جديد
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="print-pricing" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="print-pricing" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              تسعيرة الطباعة
            </TabsTrigger>
            <TabsTrigger value="acrylic-pricing" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              تسعيرة الأكريليك
            </TabsTrigger>
          </TabsList>

          <TabsContent value="print-pricing" className="mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">حساب تكلفة المطبوعات</h3>
              <p className="text-muted-foreground">احسب تكلفة الطباعة للورق والرولات</p>
              
              <Dialog open={isPrintCalculatorOpen} onOpenChange={setIsPrintCalculatorOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" size="lg">
                    <Calculator className="h-4 w-4 mr-2" />
                    فتح حاسبة المطبوعات
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Printer className="h-5 w-5" />
                        حاسبة المطبوعات
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setIsPrintCalculatorOpen(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </DialogTitle>
                  </DialogHeader>
                  <PrintCalculator />
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>

          <TabsContent value="acrylic-pricing" className="mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">حساب تكلفة الألواح الأكريليك</h3>
              <p className="text-muted-foreground">احسب تكلفة المواد المستخدمة من الألواح</p>
              
              <Dialog open={isAcrylicCalculatorOpen} onOpenChange={setIsAcrylicCalculatorOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" size="lg">
                    <Calculator className="h-4 w-4 mr-2" />
                    فتح حاسبة الألواح
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        حاسبة الألواح الأكريليك
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setIsAcrylicCalculatorOpen(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </DialogTitle>
                  </DialogHeader>
                  <PricingCalculator />
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default OrderCreationPanel;