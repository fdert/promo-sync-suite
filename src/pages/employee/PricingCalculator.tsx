import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PricingCalculator from "@/components/PricingCalculator";
import PrintCalculator from "@/components/PrintCalculator";

const PricingCalculatorPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">حاسبة التسعيرات الأولية</h1>
        <p className="text-muted-foreground">حساب تكلفة المواد المستخدمة في الطلبات</p>
      </div>
      
      <Tabs defaultValue="materials" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="materials">حاسبة الألواح</TabsTrigger>
          <TabsTrigger value="printing">حاسبة المطبوعات</TabsTrigger>
        </TabsList>
        
        <TabsContent value="materials" className="mt-6">
          <PricingCalculator />
        </TabsContent>
        
        <TabsContent value="printing" className="mt-6">
          <PrintCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PricingCalculatorPage;