import PricingCalculator from "@/components/PricingCalculator";

const PricingCalculatorPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">حاسبة التسعيرات الأولية</h1>
        <p className="text-muted-foreground">حساب تكلفة المواد المستخدمة في الطلبات</p>
      </div>
      
      <PricingCalculator />
    </div>
  );
};

export default PricingCalculatorPage;