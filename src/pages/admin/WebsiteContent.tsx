import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Save, Plus, Trash2, Edit3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface WebsiteSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  created_at: string;
  updated_at: string;
}

export default function WebsiteContent() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<WebsiteSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('website_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل إعدادات الموقع",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSetting = async (settingKey: string, newValue: any) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('website_settings')
        .update({
          setting_value: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', settingKey);

      if (error) throw error;

      setSettings(prev => prev.map(setting => 
        setting.setting_key === settingKey 
          ? { ...setting, setting_value: newValue, updated_at: new Date().toISOString() }
          : setting
      ));

      toast({
        title: "تم الحفظ",
        description: "تم تحديث إعدادات الموقع بنجاح",
      });
      setEditingSection(null);
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ التغييرات",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getSetting = (key: string) => {
    return settings.find(s => s.setting_key === key)?.setting_value || {};
  };

  const HeroSectionEditor = () => {
    const heroData = getSetting('hero_section');
    const [formData, setFormData] = useState(heroData);

    const handleSave = () => {
      updateSetting('hero_section', formData);
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            قسم البطل الرئيسي
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingSection(editingSection === 'hero' ? null : 'hero')}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>
            المحتوى الرئيسي الذي يظهر في أعلى صفحة العملاء
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingSection === 'hero' ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">العنوان الرئيسي</Label>
                <Input
                  id="title"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="عنوان الصفحة الرئيسي"
                />
              </div>
              <div>
                <Label htmlFor="subtitle">العنوان الفرعي</Label>
                <Input
                  id="subtitle"
                  value={formData.subtitle || ''}
                  onChange={(e) => setFormData({...formData, subtitle: e.target.value})}
                  placeholder="العنوان الفرعي"
                />
              </div>
              <div>
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="وصف النظام"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="cta_text">نص زر الإجراء</Label>
                <Input
                  id="cta_text"
                  value={formData.cta_text || ''}
                  onChange={(e) => setFormData({...formData, cta_text: e.target.value})}
                  placeholder="ابدأ تجربتك المجانية"
                />
              </div>
              <div>
                <Label htmlFor="video_url">رابط الفيديو التوضيحي</Label>
                <Input
                  id="video_url"
                  value={formData.video_url || ''}
                  onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                  placeholder="https://www.youtube.com/embed/..."
                />
              </div>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 ml-2" />
                {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div><strong>العنوان:</strong> {heroData.title}</div>
              <div><strong>العنوان الفرعي:</strong> {heroData.subtitle}</div>
              <div><strong>الوصف:</strong> {heroData.description}</div>
              <div><strong>زر الإجراء:</strong> {heroData.cta_text}</div>
              <div><strong>رابط الفيديو:</strong> {heroData.video_url}</div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const FeaturesEditor = () => {
    const featuresData = getSetting('features_section');
    const [formData, setFormData] = useState(featuresData);

    const addFeature = () => {
      const newFeatures = [...(formData.features || []), {
        icon: "Star",
        title: "ميزة جديدة",
        description: "وصف الميزة"
      }];
      setFormData({...formData, features: newFeatures});
    };

    const removeFeature = (index: number) => {
      const newFeatures = formData.features.filter((_: any, i: number) => i !== index);
      setFormData({...formData, features: newFeatures});
    };

    const updateFeature = (index: number, field: string, value: string) => {
      const newFeatures = [...formData.features];
      newFeatures[index] = {...newFeatures[index], [field]: value};
      setFormData({...formData, features: newFeatures});
    };

    const handleSave = () => {
      updateSetting('features_section', formData);
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            قسم المميزات
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingSection(editingSection === 'features' ? null : 'features')}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>
            مميزات النظام التي تظهر للعملاء
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingSection === 'features' ? (
            <div className="space-y-4">
              <div>
                <Label>عنوان القسم</Label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="مميزات النظام"
                />
              </div>
              <div>
                <Label>العنوان الفرعي</Label>
                <Input
                  value={formData.subtitle || ''}
                  onChange={(e) => setFormData({...formData, subtitle: e.target.value})}
                  placeholder="وصف المميزات"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>قائمة المميزات</Label>
                  <Button onClick={addFeature} size="sm" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.features?.map((feature: any, index: number) => (
                  <Card key={index} className="p-4 mb-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>الميزة {index + 1}</Label>
                        <Button 
                          onClick={() => removeFeature(index)}
                          size="sm"
                          variant="outline"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        placeholder="اسم الأيقونة"
                        value={feature.icon || ''}
                        onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                      />
                      <Input
                        placeholder="عنوان الميزة"
                        value={feature.title || ''}
                        onChange={(e) => updateFeature(index, 'title', e.target.value)}
                      />
                      <Textarea
                        placeholder="وصف الميزة"
                        value={feature.description || ''}
                        onChange={(e) => updateFeature(index, 'description', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </Card>
                ))}
              </div>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 ml-2" />
                {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div><strong>العنوان:</strong> {featuresData.title}</div>
              <div><strong>العنوان الفرعي:</strong> {featuresData.subtitle}</div>
              <div><strong>عدد المميزات:</strong> {featuresData.features?.length || 0}</div>
              <div className="flex flex-wrap gap-1">
                {featuresData.features?.map((feature: any, index: number) => (
                  <Badge key={index} variant="secondary">{feature.title}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-lg">جاري تحميل إعدادات الموقع...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">إدارة محتوى الموقع</h1>
        <p className="text-muted-foreground">
          تحكم في المحتوى الذي يظهر للعملاء في صفحة الاشتراك
        </p>
      </div>

      <Tabs defaultValue="hero" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="hero">القسم الرئيسي</TabsTrigger>
          <TabsTrigger value="features">المميزات</TabsTrigger>
          <TabsTrigger value="steps">خطوات الاشتراك</TabsTrigger>
          <TabsTrigger value="faq">الأسئلة الشائعة</TabsTrigger>
          <TabsTrigger value="contact">التواصل</TabsTrigger>
          <TabsTrigger value="company">معلومات الشركة</TabsTrigger>
        </TabsList>

        <TabsContent value="hero">
          <HeroSectionEditor />
        </TabsContent>

        <TabsContent value="features">
          <FeaturesEditor />
        </TabsContent>

        <TabsContent value="steps">
          <Card>
            <CardHeader>
              <CardTitle>خطوات الاشتراك</CardTitle>
              <CardDescription>الخطوات التي توضح للعملاء كيفية الاشتراك</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground">
                محرر خطوات الاشتراك - قيد التطوير
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faq">
          <Card>
            <CardHeader>
              <CardTitle>الأسئلة الشائعة</CardTitle>
              <CardDescription>الأسئلة والأجوبة التي تظهر للعملاء</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground">
                محرر الأسئلة الشائعة - قيد التطوير
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>معلومات التواصل</CardTitle>
              <CardDescription>بيانات التواصل مع الشركة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground">
                محرر معلومات التواصل - قيد التطوير
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>معلومات الشركة</CardTitle>
              <CardDescription>بيانات الشركة والشعار</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground">
                محرر معلومات الشركة - قيد التطوير
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}