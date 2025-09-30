import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Star, MessageSquare, Send, CheckCircle, XCircle, Clock, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Evaluation {
  id: string;
  rating: number;
  feedback_text: string;
  google_review_status: string;
  google_review_sent_at: string | null;
  google_review_link: string | null;
  admin_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  customers?: {
    name: string;
    phone: string;
    whatsapp_number: string;
  };
  orders?: {
    order_number: string;
    service_name: string;
  };
}

const ReviewsManagement = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    try {
      console.log('Fetching evaluations for reviews management...');
      
      const { data, error } = await supabase
        .from("evaluations")
        .select(`
          *,
          customers!customer_id (name, phone, whatsapp),
          orders!order_id (order_number),
          service_types (name)
        `)
        .order("created_at", { ascending: false });

      console.log('Evaluations data:', data);
      console.log('Evaluations error:', error);

      if (error) {
        console.error("Error fetching evaluations:", error);
        throw error;
      }
      
      // عرض جميع التقييمات للمراجعة اليدوية
      console.log('Total evaluations found:', data?.length || 0);
      
      // فلترة التقييمات: عرض كل التقييمات لكن التركيز على المناسبة للمراجعة
      const allEvaluations = data || [];
      
      console.log('All evaluations for review:', allEvaluations.length);
      setEvaluations(allEvaluations);
    } catch (error) {
      console.error("Error fetching evaluations:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل التقييمات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const autoApproveEvaluation = async (evaluationId: string) => {
    try {
      const { error } = await supabase
        .from("evaluations")
        .update({
          google_review_status: "approved",
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", evaluationId);

      if (error) throw error;

      // إرسال رسالة جوجل ماب تلقائياً للتقييمات المعتمدة
      await sendGoogleReviewToCustomer(evaluationId);
    } catch (error) {
      console.error("Error auto-approving evaluation:", error);
    }
  };

  const sendGoogleReviewToCustomer = async (evaluationId: string, notes?: string) => {
    setActionLoading(evaluationId);
    try {
      // إرسال رسالة واتساب للعميل
      await sendGoogleReviewRequest(evaluationId);

      // تحديث الحالة إلى "sent_to_customer"
      const { error } = await supabase
        .from("evaluations")
        .update({
          google_review_status: "sent_to_customer",
          admin_notes: notes,
          google_review_sent_at: new Date().toISOString(),
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", evaluationId);

      if (error) throw error;

      await fetchEvaluations();
      toast({
        title: "تم الإرسال",
        description: "تم إرسال رابط التقييم للعميل عبر واتساب",
      });
    } catch (error) {
      console.error("Error sending Google review:", error);
      toast({
        title: "خطأ",
        description: "فشل في إرسال رابط التقييم",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const declineEvaluation = async (evaluationId: string) => {
    setActionLoading(evaluationId);
    try {
      const { error } = await supabase
        .from("evaluations")
        .update({
          google_review_status: "declined",
          updated_at: new Date().toISOString(),
        })
        .eq("id", evaluationId);

      if (error) throw error;

      await fetchEvaluations();
      toast({
        title: "تم الرفض",
        description: "تم رفض إرسال التقييم لخرائط جوجل",
      });
    } catch (error) {
      console.error("Error declining evaluation:", error);
      toast({
        title: "خطأ",
        description: "فشل في رفض التقييم",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const sendGoogleReviewRequest = async (evaluationId: string) => {
    try {
      // استدعاء edge function لإرسال رسالة واتساب
      const { error } = await supabase.functions.invoke("send-google-review-request", {
        body: { evaluationId },
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error sending Google review request:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "قيد المراجعة", variant: "secondary" as const, icon: Clock },
      approved: { label: "جاهز للإرسال", variant: "default" as const, icon: CheckCircle },
      sent_to_customer: { label: "تم الإرسال للعميل", variant: "default" as const, icon: Send },
      published_by_customer: { label: "نشره العميل", variant: "default" as const, icon: ExternalLink },
      declined: { label: "مرفوض", variant: "destructive" as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-6 w-6" />
        <h1 className="text-2xl font-bold">إدارة التقييمات لخرائط جوجل</h1>
        <Badge variant="outline" className="ml-2">
          {evaluations.length} تقييم
        </Badge>
      </div>

      {/* إضافة معلومات حول التقييمات */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">معلومات هامة:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• التقييمات المعروضة هنا هي التي تم إرسالها من العملاء</li>
          <li>• يمكنك مراجعة التقييمات قبل إرسالها لخرائط جوجل</li>
          <li>• التقييمات العالية (4-5 نجوم) مناسبة للنشر على جوجل</li>
        </ul>
      </div>

      <div className="grid gap-4">
        {evaluations.map((evaluation) => (
          <Card key={evaluation.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">
                    {evaluation.customers?.name || "عميل غير محدد"}
                  </CardTitle>
                  <CardDescription>
                    {evaluation.service_types?.name || 'خدمة غير محددة'} - طلب رقم {evaluation.orders?.order_number}
                  </CardDescription>
                </div>
                {getStatusBadge(evaluation.google_review_status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">التقييم:</span>
                {evaluation.rating ? (
                  <>
                    <div className="flex">{renderStars(evaluation.rating)}</div>
                    <span className="text-sm text-muted-foreground">
                      ({evaluation.rating}/5)
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    لم يتم التقييم بعد - في انتظار رد العميل
                  </span>
                )}
              </div>

              {evaluation.feedback_text && (
                <div>
                  <span className="text-sm font-medium">التعليق:</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {evaluation.feedback_text}
                  </p>
                </div>
              )}

              {evaluation.admin_notes && (
                <div>
                  <span className="text-sm font-medium">ملاحظات الإدارة:</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {evaluation.admin_notes}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>تاريخ التقييم: {new Date(evaluation.created_at).toLocaleDateString("ar-SA")}</span>
                {evaluation.google_review_sent_at && (
                  <span>
                    • تم الإرسال: {new Date(evaluation.google_review_sent_at).toLocaleDateString("ar-SA")}
                  </span>
                )}
              </div>

              {/* إظهار أزرار الإجراءات للتقييمات المناسبة */}
              {(evaluation.google_review_status === "pending" || 
                (evaluation.rating && evaluation.rating >= 4)) && (
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        disabled={!evaluation.rating}
                        onClick={() => {
                          setSelectedEvaluation(evaluation);
                          setAdminNotes(evaluation.admin_notes || "");
                        }}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {evaluation.rating ? "إرسال لخرائط جوجل" : "في انتظار التقييم"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>إرسال التقييم لخرائط جوجل</DialogTitle>
                        <DialogDescription>
                          سيتم إرسال رابط خرائط جوجل للعميل عبر واتساب
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="admin_notes">ملاحظات إضافية (اختيارية)</Label>
                          <Textarea
                            id="admin_notes"
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="أضف أي ملاحظات حول هذا التقييم..."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={() => {
                            if (selectedEvaluation) {
                              sendGoogleReviewToCustomer(selectedEvaluation.id, adminNotes);
                            }
                          }}
                          disabled={actionLoading === selectedEvaluation?.id}
                        >
                          {actionLoading === selectedEvaluation?.id && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          إرسال للعميل
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => declineEvaluation(evaluation.id)}
                    disabled={actionLoading === evaluation.id || !evaluation.rating}
                  >
                    {actionLoading === evaluation.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="mr-2 h-4 w-4" />
                    )}
                    {evaluation.rating ? "رفض الإرسال" : "غير متاح"}
                  </Button>
                </div>
              )}

              {evaluation.google_review_link && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">رابط التقييم:</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(evaluation.google_review_link, "_blank")}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    فتح الرابط
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {evaluations.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد تقييمات حتى الآن</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ReviewsManagement;