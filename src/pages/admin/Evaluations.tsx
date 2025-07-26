import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Star,
  Search,
  TrendingUp,
  Users,
  MessageSquare,
  Award,
  ThumbsUp,
  BarChart3,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const Evaluations = () => {
  const [evaluations, setEvaluations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const { toast } = useToast();

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      console.log('Fetching evaluations...');
      
      // جلب التقييمات (جميع التقييمات بما في ذلك غير المرسلة)
      const { data: evaluationsData, error: evaluationsError } = await supabase
        .from('evaluations')
        .select(`
          *,
          orders (order_number, service_name),
          customers (name, phone)
        `)
        .order('created_at', { ascending: false });

      console.log('Evaluations data:', evaluationsData);
      console.log('Evaluations error:', evaluationsError);

      if (evaluationsError) {
        console.error('Error fetching evaluations:', evaluationsError);
        toast({
          title: "خطأ",
          description: "حدث خطأ في جلب التقييمات: " + evaluationsError.message,
          variant: "destructive",
        });
        return;
      }

      // جلب الإحصائيات
      const { data: statsData, error: statsError } = await supabase
        .from('evaluation_stats')
        .select('*')
        .maybeSingle();

      if (statsError) {
        console.error('Error fetching stats:', statsError);
      }

      setEvaluations(evaluationsData || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const filteredEvaluations = evaluations.filter(evaluation =>
    evaluation.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    evaluation.orders?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    evaluation.feedback_text?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return "bg-green-500/10 text-green-600 border-green-200";
    if (rating >= 3.5) return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
    if (rating >= 2.5) return "bg-orange-500/10 text-orange-600 border-orange-200";
    return "bg-red-500/10 text-red-600 border-red-200";
  };

  if (loading) return <div className="text-center p-8">جارٍ التحميل...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">تقييمات العملاء</h1>
          <p className="text-muted-foreground">إدارة وتحليل تقييمات العملاء</p>
        </div>
      </div>

      {/* إحصائيات التقييمات */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي التقييمات</p>
                  <p className="text-2xl font-bold">{stats.total_evaluations}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">متوسط التقييم</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{stats.average_rating}</p>
                    <div className="flex">
                      {renderStars(Math.round(stats.average_rating))}
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
                  <p className="text-2xl font-bold">{stats.recommendation_percentage}%</p>
                </div>
                <ThumbsUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">تقييمات 5 نجوم</p>
                  <p className="text-2xl font-bold">{stats.five_star_count}</p>
                </div>
                <Award className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* تحليل مفصل للتقييمات */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                توزيع التقييمات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { stars: 5, count: stats.five_star_count, color: "bg-green-500" },
                  { stars: 4, count: stats.four_star_count, color: "bg-yellow-500" },
                  { stars: 3, count: stats.three_star_count, color: "bg-orange-500" },
                  { stars: 2, count: stats.two_star_count, color: "bg-red-400" },
                  { stars: 1, count: stats.one_star_count, color: "bg-red-600" },
                ].map(({ stars, count, color }) => (
                  <div key={stars} className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">{stars}</span>
                      <Star className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className={`${color} h-2 rounded-full transition-all duration-300`}
                        style={{
                          width: stats.total_evaluations > 0 
                            ? `${(count / stats.total_evaluations) * 100}%` 
                            : '0%'
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                متوسط التقييمات التفصيلية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">جودة الخدمة</span>
                  <div className="flex items-center gap-2">
                    <div className="flex">{renderStars(Math.round(stats.service_quality_avg || 0))}</div>
                    <span className="text-sm font-medium">{stats.service_quality_avg}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">وقت التسليم</span>
                  <div className="flex items-center gap-2">
                    <div className="flex">{renderStars(Math.round(stats.delivery_time_avg || 0))}</div>
                    <span className="text-sm font-medium">{stats.delivery_time_avg}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">التواصل</span>
                  <div className="flex items-center gap-2">
                    <div className="flex">{renderStars(Math.round(stats.communication_avg || 0))}</div>
                    <span className="text-sm font-medium">{stats.communication_avg}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">قيمة السعر</span>
                  <div className="flex items-center gap-2">
                    <div className="flex">{renderStars(Math.round(stats.price_value_avg || 0))}</div>
                    <span className="text-sm font-medium">{stats.price_value_avg}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* قائمة التقييمات */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              قائمة التقييمات ({filteredEvaluations.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في التقييمات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
               <TableRow>
                <TableHead>العميل</TableHead>
                <TableHead>رقم الطلب</TableHead>
                <TableHead>الخدمة</TableHead>
                <TableHead>التقييم العام</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التوصية</TableHead>
                <TableHead>تاريخ التقييم</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvaluations.map((evaluation) => (
                <TableRow key={evaluation.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{evaluation.customers?.name || 'غير محدد'}</p>
                      <p className="text-sm text-muted-foreground">{evaluation.customers?.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {evaluation.orders?.order_number || 'غير محدد'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{evaluation.orders?.service_name || 'غير محدد'}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex">{renderStars(evaluation.rating)}</div>
                      <Badge className={getRatingColor(evaluation.rating)}>
                        {evaluation.rating}/5
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={evaluation.submitted_at ? "default" : "secondary"}>
                      {evaluation.submitted_at ? "مرسل" : "في الانتظار"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={evaluation.would_recommend ? "default" : "secondary"}>
                      {evaluation.would_recommend ? "ينصح" : "لا ينصح"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {evaluation.submitted_at 
                      ? new Date(evaluation.submitted_at).toLocaleDateString('ar-SA')
                      : 'لم يتم الإرسال'
                    }
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>تفاصيل التقييم</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium mb-2">معلومات العميل</h4>
                              <p><strong>الاسم:</strong> {evaluation.customers?.name}</p>
                              <p><strong>الهاتف:</strong> {evaluation.customers?.phone}</p>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2">معلومات الطلب</h4>
                              <p><strong>رقم الطلب:</strong> {evaluation.orders?.order_number}</p>
                              <p><strong>الخدمة:</strong> {evaluation.orders?.service_name}</p>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-4">التقييمات التفصيلية</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex justify-between">
                                <span>التقييم العام:</span>
                                <div className="flex items-center gap-2">
                                  <div className="flex">{renderStars(evaluation.rating)}</div>
                                  <span>{evaluation.rating}/5</span>
                                </div>
                              </div>
                              {evaluation.service_quality_rating && (
                                <div className="flex justify-between">
                                  <span>جودة الخدمة:</span>
                                  <div className="flex items-center gap-2">
                                    <div className="flex">{renderStars(evaluation.service_quality_rating)}</div>
                                    <span>{evaluation.service_quality_rating}/5</span>
                                  </div>
                                </div>
                              )}
                              {evaluation.delivery_time_rating && (
                                <div className="flex justify-between">
                                  <span>وقت التسليم:</span>
                                  <div className="flex items-center gap-2">
                                    <div className="flex">{renderStars(evaluation.delivery_time_rating)}</div>
                                    <span>{evaluation.delivery_time_rating}/5</span>
                                  </div>
                                </div>
                              )}
                              {evaluation.communication_rating && (
                                <div className="flex justify-between">
                                  <span>التواصل:</span>
                                  <div className="flex items-center gap-2">
                                    <div className="flex">{renderStars(evaluation.communication_rating)}</div>
                                    <span>{evaluation.communication_rating}/5</span>
                                  </div>
                                </div>
                              )}
                              {evaluation.price_value_rating && (
                                <div className="flex justify-between">
                                  <span>قيمة السعر:</span>
                                  <div className="flex items-center gap-2">
                                    <div className="flex">{renderStars(evaluation.price_value_rating)}</div>
                                    <span>{evaluation.price_value_rating}/5</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {evaluation.feedback_text && (
                            <div>
                              <h4 className="font-medium mb-2">ملاحظات العميل</h4>
                              <p className="text-sm bg-muted p-3 rounded-lg">{evaluation.feedback_text}</p>
                            </div>
                          )}

                          {evaluation.suggestions && (
                            <div>
                              <h4 className="font-medium mb-2">اقتراحات التحسين</h4>
                              <p className="text-sm bg-muted p-3 rounded-lg">{evaluation.suggestions}</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-4 border-t">
                            <div>
                              <Badge variant={evaluation.would_recommend ? "default" : "secondary"}>
                                {evaluation.would_recommend ? "ينصح بالخدمة" : "لا ينصح بالخدمة"}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              تاريخ التقييم: {evaluation.submitted_at 
                                ? new Date(evaluation.submitted_at).toLocaleDateString('ar-SA')
                                : 'لم يتم الإرسال'
                              }
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredEvaluations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد تقييمات مطابقة للبحث
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Evaluations;