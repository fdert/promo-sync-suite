import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ExternalLink, Settings } from "lucide-react";

interface GoogleMapsSettings {
  id?: string;
  place_id: string;
  business_name: string;
  google_maps_url: string;
  review_template: string;
  auto_send_enabled: boolean;
  minimum_rating: number;
}

const GoogleMapsIntegration = () => {
  const [settings, setSettings] = useState<GoogleMapsSettings>({
    place_id: "",
    business_name: "",
    google_maps_url: "",
    review_template: "نرجو منك تقييم تجربتك معنا على خرائط جوجل من خلال الرابط التالي:",
    auto_send_enabled: false,
    minimum_rating: 4,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("google_maps_settings")
        .select("*")
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الإعدادات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("google_maps_settings")
        .upsert({
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "تم الحفظ",
        description: "تم حفظ إعدادات خرائط جوجل بنجاح",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ الإعدادات",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const generateReviewLink = () => {
    if (settings.place_id) {
      return `https://search.google.com/local/writereview?placeid=${settings.place_id}`;
    }
    return "";
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
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">ربط خرائط جوجل</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>إعدادات نشاطك التجاري على خرائط جوجل</CardTitle>
          <CardDescription>
            قم بتكوين الربط مع خرائط جوجل لإرسال روابط التقييم للعملاء
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="business_name">اسم النشاط التجاري</Label>
              <Input
                id="business_name"
                value={settings.business_name}
                onChange={(e) =>
                  setSettings({ ...settings, business_name: e.target.value })
                }
                placeholder="اسم شركتك أو نشاطك التجاري"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="place_id">معرف المكان (Place ID)</Label>
              <Input
                id="place_id"
                value={settings.place_id}
                onChange={(e) =>
                  setSettings({ ...settings, place_id: e.target.value })
                }
                placeholder="ChIJxxxxxxxxxxxxxxxxxxxxx"
              />
              <p className="text-sm text-muted-foreground">
                يمكنك الحصول على Place ID من{" "}
                <a
                  href="https://developers.google.com/maps/documentation/places/web-service/place-id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  هنا
                </a>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="google_maps_url">رابط خرائط جوجل</Label>
            <Input
              id="google_maps_url"
              value={settings.google_maps_url}
              onChange={(e) =>
                setSettings({ ...settings, google_maps_url: e.target.value })
              }
              placeholder="https://maps.google.com/..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="review_template">نموذج رسالة طلب التقييم</Label>
            <Textarea
              id="review_template"
              value={settings.review_template}
              onChange={(e) =>
                setSettings({ ...settings, review_template: e.target.value })
              }
              placeholder="النص الذي سيتم إرساله للعملاء مع رابط التقييم"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="minimum_rating">الحد الأدنى للتقييم</Label>
              <Input
                id="minimum_rating"
                type="number"
                min="1"
                max="5"
                value={settings.minimum_rating}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    minimum_rating: parseInt(e.target.value) || 4,
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                سيتم إرسال رابط التقييم فقط للتقييمات أعلى من هذا الرقم
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="auto_send"
                checked={settings.auto_send_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, auto_send_enabled: checked })
                }
              />
              <Label htmlFor="auto_send">إرسال تلقائي</Label>
            </div>
          </div>

          {settings.place_id && (
            <div className="p-4 bg-muted rounded-lg">
              <Label className="text-sm font-medium">رابط التقييم المُولد:</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={generateReviewLink()}
                  readOnly
                  className="bg-background"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(generateReviewLink(), "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              حفظ الإعدادات
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>كيفية الحصول على Place ID</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>اذهب إلى خرائط جوجل وابحث عن نشاطك التجاري</li>
            <li>انقر على نشاطك التجاري لفتح معلوماته</li>
            <li>انسخ الرابط من شريط العنوان</li>
            <li>
              استخدم أداة{" "}
              <a
                href="https://developers.google.com/maps/documentation/places/web-service/place-id"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Place ID Finder
              </a>{" "}
              للحصول على Place ID
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleMapsIntegration;