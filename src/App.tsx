import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AdminLayout from "./components/layout/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Customers from "./pages/admin/Customers";
import Orders from "./pages/admin/Orders";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="orders" element={<Orders />} />
            <Route path="invoices" element={<div className="p-6">صفحة الفواتير قيد التطوير</div>} />
            <Route path="accounts" element={<div className="p-6">صفحة الحسابات قيد التطوير</div>} />
            <Route path="reports" element={<div className="p-6">صفحة التقارير قيد التطوير</div>} />
            <Route path="whatsapp" element={<div className="p-6">صفحة WhatsApp قيد التطوير</div>} />
            <Route path="website" element={<div className="p-6">صفحة إدارة الموقع قيد التطوير</div>} />
            <Route path="settings" element={<div className="p-6">صفحة الإعدادات قيد التطوير</div>} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
