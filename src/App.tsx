import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import AdminLayout from "./components/layout/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";
import Customers from "./pages/admin/Customers";
import Orders from "./pages/admin/Orders";
import Invoices from "./pages/admin/Invoices";
import Accounts from "./pages/admin/Accounts";
import Reports from "./pages/admin/Reports";
import WhatsApp from "./pages/admin/WhatsApp";
import WebhookSettings from "./pages/admin/WebhookSettings";
import WebsiteContent from "./pages/admin/WebsiteContent";
import Settings from "./pages/admin/Settings";
import ServiceTypes from "./pages/admin/ServiceTypes";
import MessageTemplates from "./pages/admin/MessageTemplates";
import UserDashboard from "./pages/user/UserDashboard";
import InvoicePreview from "./pages/InvoicePreview";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
          <Route path="/invoice/:invoiceId" element={<InvoicePreview />} />
          <Route path="/auth" element={<Auth />} />
            <Route path="/user" element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="customers" element={<Customers />} />
              <Route path="orders" element={<Orders />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="reports" element={<Reports />} />
              <Route path="services" element={<ServiceTypes />} />
            <Route path="message-templates" element={<MessageTemplates />} />
            <Route path="whatsapp" element={<WhatsApp />} />
              <Route path="webhooks" element={<WebhookSettings />} />
              <Route path="website" element={<WebsiteContent />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
