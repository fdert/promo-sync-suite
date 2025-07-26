import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import EmployeeSidebar from "./EmployeeSidebar";

const EmployeeLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <EmployeeSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <div className="flex-1 flex flex-col min-h-screen">
          <Header
            onMenuClick={toggleSidebar}
            title="لوحة الموظف"
          />
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLayout;