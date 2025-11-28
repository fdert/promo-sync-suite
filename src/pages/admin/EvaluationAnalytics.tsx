// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  BarChart3,
  PieChart,
  Star,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface AnalysisResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  trends: string[];
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

const EvaluationAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchEvaluationsData();
  }, []);

  const fetchEvaluationsData = async () => {
    try {
      setLoading(true);
      
      // جلب التقييمات المكتملة فقط (التي تم إرسالها من العملاء)
      const { data: evaluationsData, error } = await supabase
        .from('evaluations')
        .select(`
          *,
          orders!order_id (order_number, total_amount, service_types(name)),
          customers!customer_id (name)
        `)
        .not('submitted_at', 'is', null)
        .not('rating', 'is', null)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      const submitted = evaluationsData || [];
      
      // حساب الإحصائيات
      if (submitted.length > 0) {
        const avgRating = submitted.reduce((sum: number, e: any) => sum + (e.rating || 0), 0) / submitted.length;
        const recommendCount = submitted.filter((e: any) => e.would_recommend).length;
        
        setStats({
          total: submitted.length,
          avgRating: Math.round(avgRating * 100) / 100,
          recommendPercentage: Math.round((recommendCount / submitted.length) * 100),
          avgServiceQuality: Math.round((submitted.reduce((sum: number, e: any) => sum + (e.service_quality_rating || 0), 0) / submitted.length) * 10) / 10,
          avgDeliveryTime: Math.round((submitted.reduce((sum: number, e: any) => sum + (e.delivery_time_rating || 0), 0) / submitted.length) * 10) / 10,
          avgCommunication: Math.round((submitted.reduce((sum: number, e: any) => sum + (e.communication_rating || 0), 0) / submitted.length) * 10) / 10,
          avgPriceValue: Math.round((submitted.reduce((sum: number, e: any) => sum + (e.price_value_rating || 0), 0) / submitted.length) * 10) / 10,
        });
      }
      
      setEvaluations(submitted);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في جلب البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeWithAI = async () => {
    try {
      setAnalyzing(true);
      
      // إعداد البيانات للتحليل
      const analysisData = evaluations.map((e: any) => ({
        rating: e.rating,
        service_quality: e.service_quality_rating,
        delivery_time: e.delivery_time_rating,
        communication: e.communication_rating,
        price_value: e.price_value_rating,
        would_recommend: e.would_recommend,
        feedback: e.feedback_text,
        suggestions: e.suggestions,
      }));

      const { data, error } = await supabase.functions.invoke('analyze-evaluations', {
        body: { evaluations: analysisData }
      });

      if (error) throw error;

      setAnalysis(data.analysis);
      
      toast({
        title: "تم التحليل بنجاح",
        description: "تم تحليل التقييمات وإنشاء التقرير",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "خطأ في التحليل",
        description: "حدث خطأ أثناء تحليل التقييمات",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">التحليل الذكي للتقييمات</h1>
          <p className="text-muted-foreground">تحليل متقدم بالذكاء الاصطناعي لتقييمات العملاء</p>
        </div>
        <Button 
          onClick={analyzeWithAI} 
          disabled={analyzing || evaluations.length === 0}
          size="lg"
        >
          {analyzing ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              جارٍ التحليل...
            </>
          ) : (
            <>
              <Brain className="ml-2 h-4 w-4" />
              تحليل بالذكاء الاصطناعي
            </>
          )}
        </Button>
      </div>

      {/* الإحصائيات السريعة */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">عدد التقييمات</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">متوسط التقييم</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold">{stats.avgRating}</p>
                    <div className="flex">
                      {renderStars(Math.round(stats.avgRating))}
                    </div>
                  </div>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">نسبة التوصية</p>
                  <p className="text-3xl font-bold">{stats.recommendPercentage}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">جودة الخدمة</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold">{stats.avgServiceQuality}</p>
                    <span className="text-sm text-muted-foreground">/5</span>
                  </div>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* التحليل التفصيلي */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="detailed">تحليل تفصيلي</TabsTrigger>
          <TabsTrigger value="ai-insights" disabled={!analysis}>
            رؤى AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* التقييمات التفصيلية */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  التقييمات التفصيلية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats && [
                  { label: 'جودة الخدمة', value: stats.avgServiceQuality },
                  { label: 'وقت التسليم', value: stats.avgDeliveryTime },
                  { label: 'التواصل', value: stats.avgCommunication },
                  { label: 'قيمة السعر', value: stats.avgPriceValue },
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="text-sm text-muted-foreground">{item.value}/5</span>
                    </div>
                    <Progress value={(item.value / 5) * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* أحدث التعليقات */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  أحدث التعليقات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {evaluations.slice(0, 5).map((evaluation: any, idx) => (
                  <div key={idx} className="border-b pb-3 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={evaluation.rating >= 4 ? "default" : "secondary"}>
                          {evaluation.rating}/5
                        </Badge>
                        <span className="text-sm font-medium">{evaluation.customers?.name}</span>
                      </div>
                      <div className="flex">
                        {renderStars(evaluation.rating)}
                      </div>
                    </div>
                    {evaluation.feedback_text && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {evaluation.feedback_text}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>التحليل التفصيلي للتقييمات</CardTitle>
              <CardDescription>
                تحليل شامل لجميع جوانب تقييمات العملاء
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* توزيع التقييمات */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">توزيع التقييمات</h3>
                  <div className="grid grid-cols-5 gap-4">
                    {[5, 4, 3, 2, 1].map(ratingValue => {
                      const count = evaluations.filter((e: any) => e.rating === ratingValue).length;
                      const percentage = evaluations.length > 0 ? (count / evaluations.length) * 100 : 0;
                      return (
                        <div key={ratingValue} className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-2">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-medium">{ratingValue}</span>
                          </div>
                          <div className="text-2xl font-bold mb-1">{count}</div>
                          <Progress value={percentage} className="h-2 mb-1" />
                          <div className="text-xs text-muted-foreground">{Math.round(percentage)}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* التعليقات الإيجابية والسلبية */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      التعليقات الإيجابية
                    </h3>
                    <div className="space-y-3">
                      {evaluations
                        .filter((e: any) => e.rating >= 4 && e.feedback_text)
                        .slice(0, 3)
                        .map((evaluation: any, idx) => (
                          <Card key={idx}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="default">{evaluation.rating}/5</Badge>
                                <span className="text-sm font-medium">{evaluation.customers?.name}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {evaluation.feedback_text}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      التعليقات السلبية
                    </h3>
                    <div className="space-y-3">
                      {evaluations
                        .filter((e: any) => e.rating <= 3 && e.feedback_text)
                        .slice(0, 3)
                        .map((evaluation: any, idx) => (
                          <Card key={idx}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="destructive">{evaluation.rating}/5</Badge>
                                <span className="text-sm font-medium">{evaluation.customers?.name}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {evaluation.feedback_text}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-4">
          {analysis && (
            <>
              {/* ملخص التحليل */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    ملخص التحليل الذكي
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{analysis.summary}</p>
                </CardContent>
              </Card>

              {/* نقاط القوة والضعف */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <TrendingUp className="h-5 w-5" />
                      نقاط القوة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {analysis.strengths.map((strength, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <TrendingDown className="h-5 w-5" />
                      نقاط الضعف
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {analysis.weaknesses.map((weakness, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* التحسينات المقترحة */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    التحسينات المقترحة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {analysis.improvements.map((improvement, idx) => (
                      <li key={idx} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                        <Badge variant="outline" className="flex-shrink-0">{idx + 1}</Badge>
                        <span className="text-sm">{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* الاتجاهات */}
              {analysis.trends.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      الاتجاهات والأنماط
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.trends.map((trend, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          • {trend}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EvaluationAnalytics;