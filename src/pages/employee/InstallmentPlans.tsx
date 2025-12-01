import InstallmentPlansPage from "@/pages/admin/InstallmentPlans";

// صفحة الموظفين - بدون صلاحيات الحذف والتعديل
const EmployeeInstallmentPlans = () => {
  return <InstallmentPlansPage showActions={false} />;
};

export default EmployeeInstallmentPlans;