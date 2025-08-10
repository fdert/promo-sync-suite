import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AgencyProvider } from "@/contexts/AgencyContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";
import EmployeeProtectedRoute from "@/components/EmployeeProtectedRoute";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import AdminLayout from "./components/layout/AdminLayout";
import EmployeeLayout from "./components/layout/EmployeeLayout";
import Dashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";
import Customers from "./pages/admin/Customers";
import Orders from "./pages/admin/Orders";
import Invoices from "./pages/admin/Invoices";
import Accounts from "./pages/admin/Accounts";
import AccountsReview from "./pages/admin/AccountsReview";
import AccountsReceivableReview from "./pages/admin/AccountsReceivableReview";
import PaymentsByType from "./pages/admin/PaymentsByType";
import Reports from "./pages/admin/Reports";
import EmployeeReports from "./pages/employee/Reports";
import EmployeeCustomers from "./pages/employee/Customers";
import EmployeePrintOrders from "./pages/employee/PrintOrders";
import EmployeeOrders from "./pages/employee/Orders";
import PrintArchive from "./pages/employee/PrintArchive";
import WhatsApp from "./pages/admin/WhatsApp";
import WhatsAppMonitor from "./pages/admin/WhatsAppMonitor";
import WebhookSettings from "./pages/admin/WebhookSettings";
import WebsiteContent from "./pages/admin/WebsiteContent";
import Settings from "./pages/admin/Settings";
import ServiceTypes from "./pages/admin/ServiceTypes";
import EmployeeServiceTypes from "./pages/employee/ServiceTypes";
import MessageTemplates from "./pages/admin/MessageTemplates";
import UserDashboard from "./pages/user/UserDashboard";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import PrintManagement from "./pages/admin/PrintManagement";
import PrintOrders from "./pages/user/PrintOrders";
import InvoicePreview from "./pages/InvoicePreview";
import NotFound from "./pages/NotFound";
import Evaluations from "./pages/admin/Evaluations";
import CustomerPrintOrders from "./pages/admin/CustomerPrintOrders";
import Evaluation from "./pages/Evaluation";
import AccountsOverview from "./pages/employee/AccountsOverview";
import FinancialReports from "./pages/employee/FinancialReports";
import ReviewsManagement from "./pages/admin/ReviewsManagement";
import GoogleMapsIntegration from "./pages/admin/GoogleMapsIntegration";
import BarcodeSettings from "./pages/admin/BarcodeSettings";
import FollowUpSettings from "./pages/admin/FollowUpSettings";
import FinancialMovements from "./pages/admin/FinancialMovements";
import EmployeeFinancialMovements from "./pages/employee/FinancialMovements";
import PricingCalculatorPage from "./pages/employee/PricingCalculator";
import BulkWhatsApp from "./pages/admin/BulkWhatsApp";
import CustomerGroups from "./pages/admin/CustomerGroups";
import EmployeeBulkWhatsApp from "./pages/employee/BulkWhatsApp";
import EmployeeWebhookSettings from "./pages/employee/WebhookSettings";
import AgencyManagement from "./pages/admin/AgencyManagement";

import OrderPayments from "./pages/admin/OrderPayments";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AgencyProvider>
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
            <Route path="/user/print-orders" element={
              <ProtectedRoute>
                <PrintOrders />
              </ProtectedRoute>
            } />
            <Route path="/employee" element={
              <ProtectedRoute>
                <EmployeeProtectedRoute>
                  <EmployeeLayout />
                </EmployeeProtectedRoute>
              </ProtectedRoute>
            }>
              <Route index element={<EmployeeDashboard />} />
              <Route path="customers" element={<EmployeeCustomers />} />
              <Route path="orders" element={<EmployeeOrders />} />
              <Route path="service-types" element={<EmployeeServiceTypes />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="print-orders" element={<EmployeePrintOrders />} />
              <Route path="evaluations" element={<Evaluations />} />
              <Route path="print-archive" element={<PrintArchive />} />
              <Route path="accounts-overview" element={<AccountsOverview />} />
              <Route path="financial-reports" element={<FinancialReports />} />
              <Route path="financial-movements" element={<EmployeeFinancialMovements />} />
              <Route path="pricing-calculator" element={<PricingCalculatorPage />} />
              <Route path="reports" element={<EmployeeReports />} />
              <Route path="bulk-whatsapp" element={<EmployeeBulkWhatsApp />} />
              <Route path="webhook-settings" element={<EmployeeWebhookSettings />} />
            </Route>
            <Route path="/admin" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                  <AdminLayout />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="customers" element={<Customers />} />
              <Route path="orders" element={<Orders />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="accounts-review" element={<AccountsReview />} />
              <Route path="accounts-receivable" element={<AccountsReceivableReview />} />
              <Route path="payments-by-type" element={<PaymentsByType />} />
              <Route path="financial-movements" element={<FinancialMovements />} />
              <Route path="order-payments/:orderId" element={<OrderPayments />} />
              
              <Route path="reports" element={<Reports />} />
              <Route path="services" element={<ServiceTypes />} />
            <Route path="message-templates" element={
                <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                  <MessageTemplates />
                </RoleProtectedRoute>
              } />
            <Route path="whatsapp" element={<WhatsApp />} />
            <Route path="whatsapp-monitor" element={<WhatsAppMonitor />} />
              <Route path="print-management" element={<PrintManagement />} />
              <Route path="customer-print-orders" element={<CustomerPrintOrders />} />
              <Route path="webhooks" element={<WebhookSettings />} />
              <Route path="website" element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <WebsiteContent />
                </RoleProtectedRoute>
              } />
              <Route path="agency" element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <AgencyManagement />
                </RoleProtectedRoute>
              } />
              <Route path="settings" element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <Settings />
                </RoleProtectedRoute>
               } />
               <Route path="barcode-settings" element={
                 <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                   <BarcodeSettings />
                 </RoleProtectedRoute>
               } />
               <Route path="follow-up-settings" element={
                 <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                   <FollowUpSettings />
                 </RoleProtectedRoute>
               } />
               <Route path="evaluations" element={<Evaluations />} />
               <Route path="reviews-management" element={
                 <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                   <ReviewsManagement />
                 </RoleProtectedRoute>
               } />
               <Route path="google-maps-integration" element={
                  <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                    <GoogleMapsIntegration />
                  </RoleProtectedRoute>
                } />
                <Route path="bulk-whatsapp" element={
                  <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                    <BulkWhatsApp />
                  </RoleProtectedRoute>
                } />
                <Route path="customer-groups" element={
                  <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                    <CustomerGroups />
                  </RoleProtectedRoute>
                } />
            </Route>
            <Route path="/evaluation/:token" element={<Evaluation />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </AgencyProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
