import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const ForgotPasswordDialog = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (!email) {
      setError("يرجى إدخال البريد الإلكتروني");
      setLoading(false);
      return;
    }

    try {
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (supabaseError) {
        throw supabaseError;
      }

      // إرسال بريد إلكتروني مخصص
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: "إعادة تعيين كلمة المرور",
          type: 'password_reset',
          data: {
            resetLink: `${window.location.origin}/reset-password`
          }
        }
      });

      if (emailError) {
        console.warn("فشل في إرسال البريد المخصص:", emailError);
      }

      setSuccess(true);
      toast({
        title: "تم إرسال رابط إعادة التعيين",
        description: "تحقق من بريدك الإلكتروني لإعادة تعيين كلمة المرور"
      });
    } catch (error: any) {
      setError("فشل في إرسال رابط إعادة التعيين. تأكد من صحة البريد الإلكتروني.");
    }

    setLoading(false);
  };

  const resetForm = () => {
    setEmail("");
    setError("");
    setSuccess(false);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        resetForm();
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="link" className="text-sm text-primary hover:text-primary/80 p-0">
          نسيت كلمة المرور؟
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            إعادة تعيين كلمة المرور
          </DialogTitle>
          <DialogDescription>
            أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة المرور
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800">
                تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. تحقق من صندوق الوارد أو مجلد الرسائل غير المرغوب فيها.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => setOpen(false)} 
              className="w-full"
            >
              حسناً
            </Button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="reset-email">البريد الإلكتروني</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="أدخل بريدك الإلكتروني"
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={loading}
                className="flex-1"
              >
                {loading ? "جاري الإرسال..." : "إرسال رابط الإعادة"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                إلغاء
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};