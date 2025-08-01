import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Heart, CheckCircle, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";

const Evaluation = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [ratings, setRatings] = useState({
    rating: 5,
    service_quality_rating: 5,
    delivery_time_rating: 5,
    communication_rating: 5,
    price_value_rating: 5,
  });
  const [feedback, setFeedback] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      fetchEvaluation();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchEvaluation = async () => {
    try {
      setLoading(true);
      
      const { data: evaluationData, error: evaluationError } = await supabase
        .from('evaluations')
        .select(`
          *,
          orders (
            order_number,
            service_name,
            description,
            amount,
            due_date
          ),
          customers (name, phone)
        `)
        .eq('evaluation_token', token)
        .single();

      if (evaluationError) {
        console.error('Error fetching evaluation:', evaluationError);
        toast({
          title: "خطأ",
          description: "لم يتم العثور على التقييم المطلوب",
          variant: "destructive",
        });
        return;
      }

      setEvaluation(evaluationData);
      setOrderData(evaluationData.orders);
      
      // إذا كان التقييم مرسل بالفعل، اعرض حالة الإرسال
      if (evaluationData.submitted_at) {
        setSubmitted(true);
        setRatings({
          rating: evaluationData.rating,
          service_quality_rating: evaluationData.service_quality_rating || 5,
          delivery_time_rating: evaluationData.delivery_time_rating || 5,
          communication_rating: evaluationData.communication_rating || 5,
          price_value_rating: evaluationData.price_value_rating || 5,
        });
        setFeedback(evaluationData.feedback_text || "");
        setSuggestions(evaluationData.suggestions || "");
        setWouldRecommend(evaluationData.would_recommend);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;

    try {
      setSubmitting(true);
      console.log('Submitting evaluation with token:', token);
      console.log('Ratings:', ratings);
      console.log('Feedback:', feedback);

      const { error } = await supabase
        .from('evaluations')
        .update({
          ...ratings,
          feedback_text: feedback,
          suggestions: suggestions,
          would_recommend: wouldRecommend,
          submitted_at: new Date().toISOString(),
        })
        .eq('evaluation_token', token);

      if (error) {
        console.error('Error submitting evaluation:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في إرسال التقييم: " + error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('Evaluation submitted successfully');
      setSubmitted(true);
      toast({
        title: "شكراً لك!",
        description: "تم إرسال تقييمك بنجاح",
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating, onRatingChange, disabled = false) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-6 w-6 cursor-pointer transition-colors ${
          i < rating
            ? 'text-yellow-500 fill-yellow-500'
            : 'text-gray-300 hover:text-yellow-400'
        } ${disabled ? 'cursor-not-allowed' : ''}`}
        onClick={() => !disabled && onRatingChange && onRatingChange(i + 1)}
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (!token || !evaluation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">رابط غير صحيح</h2>
            <p className="text-muted-foreground">لم يتم العثور على صفحة التقييم المطلوبة</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4">شكراً لك على تقييمك!</h1>
            <p className="text-lg text-muted-foreground mb-6">
              نقدر وقتك في تقييم خدماتنا وسنعمل على تحسين تجربتك
            </p>
            
            <div className="bg-muted/50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold mb-4">ملخص تقييمك</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span>التقييم العام:</span>
                  <div className="flex">
                    {renderStars(ratings.rating, null, true)}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>جودة الخدمة:</span>
                  <div className="flex">
                    {renderStars(ratings.service_quality_rating, null, true)}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>وقت التسليم:</span>
                  <div className="flex">
                    {renderStars(ratings.delivery_time_rating, null, true)}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>التواصل:</span>
                  <div className="flex">
                    {renderStars(ratings.communication_rating, null, true)}
                  </div>
                </div>
              </div>
            </div>

            <Heart className="h-8 w-8 text-red-500 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl mb-2">قيّم تجربتك معنا</CardTitle>
            <p className="text-muted-foreground">
              نسعى لتقديم أفضل خدمة، ورأيك يهمنا كثيراً
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* معلومات الطلب */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">تفاصيل طلبك</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">رقم الطلب:</span>
                  <p className="font-medium">{orderData?.order_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">الخدمة:</span>
                  <p className="font-medium">{orderData?.service_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">المبلغ:</span>
                  <p className="font-medium">{orderData?.amount} ر.س</p>
                </div>
                <div>
                  <span className="text-muted-foreground">تاريخ التسليم:</span>
                  <p className="font-medium">
                    {orderData?.due_date 
                      ? new Date(orderData.due_date).toLocaleDateString('ar-SA')
                      : 'غير محدد'
                    }
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* التقييمات */}
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-4">كيف تقيم تجربتك الإجمالية؟</h3>
                  <div className="flex justify-center gap-1">
                    {renderStars(ratings.rating, (rating) => 
                      setRatings(prev => ({ ...prev, rating }))
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center">
                    <h4 className="font-medium mb-2">جودة الخدمة</h4>
                    <div className="flex justify-center gap-1">
                      {renderStars(ratings.service_quality_rating, (rating) => 
                        setRatings(prev => ({ ...prev, service_quality_rating: rating }))
                      )}
                    </div>
                  </div>

                  <div className="text-center">
                    <h4 className="font-medium mb-2">وقت التسليم</h4>
                    <div className="flex justify-center gap-1">
                      {renderStars(ratings.delivery_time_rating, (rating) => 
                        setRatings(prev => ({ ...prev, delivery_time_rating: rating }))
                      )}
                    </div>
                  </div>

                  <div className="text-center">
                    <h4 className="font-medium mb-2">التواصل</h4>
                    <div className="flex justify-center gap-1">
                      {renderStars(ratings.communication_rating, (rating) => 
                        setRatings(prev => ({ ...prev, communication_rating: rating }))
                      )}
                    </div>
                  </div>

                  <div className="text-center">
                    <h4 className="font-medium mb-2">قيمة السعر</h4>
                    <div className="flex justify-center gap-1">
                      {renderStars(ratings.price_value_rating, (rating) => 
                        setRatings(prev => ({ ...prev, price_value_rating: rating }))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* التوصية */}
              <div className="text-center">
                <h3 className="font-medium mb-4">هل توصي بخدماتنا للآخرين؟</h3>
                <div className="flex justify-center gap-4">
                  <Button
                    type="button"
                    variant={wouldRecommend ? "default" : "outline"}
                    onClick={() => setWouldRecommend(true)}
                  >
                    نعم، أنصح بها
                  </Button>
                  <Button
                    type="button"
                    variant={!wouldRecommend ? "destructive" : "outline"}
                    onClick={() => setWouldRecommend(false)}
                  >
                    لا أنصح بها
                  </Button>
                </div>
              </div>

              {/* التعليقات */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  ما رأيك في خدماتنا؟ (اختياري)
                </label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="شاركنا تجربتك وملاحظاتك..."
                  rows={4}
                />
              </div>

              {/* الاقتراحات */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  اقتراحات للتحسين (اختياري)
                </label>
                <Textarea
                  value={suggestions}
                  onChange={(e) => setSuggestions(e.target.value)}
                  placeholder="كيف يمكننا تحسين خدماتنا؟"
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full"
                size="lg"
              >
                {submitting ? "جارٍ الإرسال..." : "إرسال التقييم"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Evaluation;