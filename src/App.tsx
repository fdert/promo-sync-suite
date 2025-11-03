import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
import FinancialIntegration from "./pages/admin/FinancialIntegration";
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
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import PrintManagement from "./pages/admin/PrintManagement";
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
import EvaluationAnalytics from "./pages/admin/EvaluationAnalytics";
import FinancialMovements from "./pages/admin/FinancialMovements";
import EmployeeFinancialMovements from "./pages/employee/FinancialMovements";
import PricingCalculatorPage from "./pages/employee/PricingCalculator";
import BulkWhatsApp from "./pages/admin/BulkWhatsApp";
import CustomerGroups from "./pages/admin/CustomerGroups";
import EmployeeBulkWhatsApp from "./pages/employee/BulkWhatsApp";
import EmployeeInvoices from "./pages/employee/Invoices";

import OrderPayments from "./pages/admin/OrderPayments";
import EmployeeOrderPayments from "./pages/employee/OrderPayments";
import EmployeeOrderPaymentsList from "./pages/employee/OrderPaymentsList";
import InvoiceVerification from "./pages/InvoiceVerification";
import ElectronicInvoiceSettings from "./pages/admin/ElectronicInvoiceSettings";
import BackupManagement from "./pages/admin/BackupManagement";
import LoyaltyManagement from "./pages/employee/LoyaltyManagement";
import LoyaltySettings from "./pages/admin/LoyaltySettings";
import EmployeeTasks from "./pages/employee/Tasks";
import DailyTasks from "./pages/employee/DailyTasks";
import TasksMonitor from "./pages/admin/TasksMonitor";
import UserActivityLogs from "./pages/admin/UserActivityLogs";

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
          <Route path="/verify/:verificationId" element={<InvoiceVerification />} />
          <Route path="/auth" element={<Auth />} />
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
              <Route path="tasks" element={<EmployeeTasks />} />
              <Route path="daily-tasks" element={<DailyTasks />} />
              <Route path="service-types" element={<EmployeeServiceTypes />} />
              <Route path="invoices" element={<EmployeeInvoices />} />
              <Route path="print-orders" element={<EmployeePrintOrders />} />
              <Route path="evaluations" element={<Evaluations />} />
              <Route path="print-archive" element={<PrintArchive />} />
              <Route path="accounts-overview" element={<AccountsOverview />} />
              <Route path="financial-reports" element={<FinancialReports />} />
              <Route path="financial-movements" element={<EmployeeFinancialMovements />} />
              <Route path="pricing-calculator" element={<PricingCalculatorPage />} />
              <Route path="reports" element={<EmployeeReports />} />
              <Route path="bulk-whatsapp" element={<EmployeeBulkWhatsApp />} />
              <Route path="order-payments" element={<EmployeeOrderPaymentsList />} />
              <Route path="order-payments/:orderId" element={<EmployeeOrderPayments />} />
              <Route path="loyalty" element={<LoyaltyManagement />} />
            </Route>
            <Route path="/admin" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['admin', 'manager'] as any}>
                  <AdminLayout />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="user-activity-logs" element={<UserActivityLogs />} />
              <Route path="customers" element={<Customers />} />
              <Route path="orders" element={<Orders />} />
              <Route path="tasks-monitor" element={<TasksMonitor />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="financial-integration" element={<FinancialIntegration />} />
              <Route path="accounts-review" element={<AccountsReview />} />
              <Route path="accounts-receivable" element={<AccountsReceivableReview />} />
              <Route path="payments-by-type" element={<PaymentsByType />} />
              <Route path="financial-movements" element={<FinancialMovements />} />
              <Route path="order-payments/:orderId" element={<OrderPayments />} />
              
              <Route path="reports" element={<Reports />} />
              <Route path="services" element={<ServiceTypes />} />
            <Route path="message-templates" element={
                <RoleProtectedRoute allowedRoles={['admin', 'manager'] as any}>
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
              <Route path="settings" element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <Settings />
                </RoleProtectedRoute>
               } />
               <Route path="barcode-settings" element={
                 <RoleProtectedRoute allowedRoles={['admin', 'manager'] as any}>
                   <BarcodeSettings />
                 </RoleProtectedRoute>
               } />
               <Route path="follow-up-settings" element={
                 <RoleProtectedRoute allowedRoles={['admin', 'manager'] as any}>
                   <FollowUpSettings />
                 </RoleProtectedRoute>
               } />
               <Route path="evaluations" element={<Evaluations />} />
               <Route path="evaluation-analytics" element={<EvaluationAnalytics />} />
               <Route path="reviews-management" element={
                  <RoleProtectedRoute allowedRoles={['admin', 'manager'] as any}>
                   <ReviewsManagement />
                 </RoleProtectedRoute>
               } />
               <Route path="google-maps-integration" element={
                   <RoleProtectedRoute allowedRoles={['admin', 'manager'] as any}>
                    <GoogleMapsIntegration />
                  </RoleProtectedRoute>
                } />
                <Route path="bulk-whatsapp" element={
                   <RoleProtectedRoute allowedRoles={['admin', 'manager'] as any}>
                    <BulkWhatsApp />
                  </RoleProtectedRoute>
                } />
                 <Route path="customer-groups" element={
                    <RoleProtectedRoute allowedRoles={['admin', 'manager'] as any}>
                     <CustomerGroups />
                   </RoleProtectedRoute>
                 } />
                 <Route path="electronic-invoice-settings" element={
                   <RoleProtectedRoute allowedRoles={['admin', 'manager'] as any}>
                     <ElectronicInvoiceSettings />
                   </RoleProtectedRoute>
                 } />
                 <Route path="backup-management" element={
                   <RoleProtectedRoute allowedRoles={['admin']}>
                     <BackupManagement />
                   </RoleProtectedRoute>
                 } />
                 <Route path="loyalty-settings" element={
                   <RoleProtectedRoute allowedRoles={['admin', 'manager'] as any}>
                     <LoyaltySettings />
                   </RoleProtectedRoute>
                 } />
            </Route>
            <Route path="/evaluation/:token" element={<Evaluation />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
