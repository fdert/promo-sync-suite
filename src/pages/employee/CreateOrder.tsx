import OrderCreationPanel from "@/components/OrderCreationPanel";

const CreateOrder = () => {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">إنشاء طلب جديد</h1>
        <p className="text-muted-foreground">قم بحساب التكلفة وإنشاء طلب جديد للعميل</p>
      </div>
      
      <OrderCreationPanel />
    </div>
  );
};

export default CreateOrder;