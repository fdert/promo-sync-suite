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

  const StepsEditor = () => {
    const stepsData = getSetting('steps_section');
    const [formData, setFormData] = useState(stepsData);

    const addStep = () => {
      const newSteps = [...(formData.steps || []), {
        number: (formData.steps?.length + 1 || 1).toString(),
        title: "خطوة جديدة",
        description: "وصف الخطوة"
      }];
      setFormData({...formData, steps: newSteps});
    };

    const removeStep = (index: number) => {
      const newSteps = formData.steps.filter((_: any, i: number) => i !== index);
      setFormData({...formData, steps: newSteps});
    };

    const updateStep = (index: number, field: string, value: string) => {
      const newSteps = [...formData.steps];
      newSteps[index] = {...newSteps[index], [field]: value};
      setFormData({...formData, steps: newSteps});
    };

    const handleSave = () => {
      updateSetting('steps_section', formData);
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            خطوات الاشتراك
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingSection(editingSection === 'steps' ? null : 'steps')}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>الخطوات التي توضح للعملاء كيفية الاشتراك</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingSection === 'steps' ? (
            <div className="space-y-4">
              <div>
                <Label>عنوان القسم</Label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="كيفية الاشتراك"
                />
              </div>
              <div>
                <Label>العنوان الفرعي</Label>
                <Input
                  value={formData.subtitle || ''}
                  onChange={(e) => setFormData({...formData, subtitle: e.target.value})}
                  placeholder="خطوات بسيطة للبدء"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>قائمة الخطوات</Label>
                  <Button onClick={addStep} size="sm" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.steps?.map((step: any, index: number) => (
                  <Card key={index} className="p-4 mb-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>الخطوة {index + 1}</Label>
                        <Button 
                          onClick={() => removeStep(index)}
                          size="sm"
                          variant="outline"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        placeholder="رقم الخطوة"
                        value={step.number || ''}
                        onChange={(e) => updateStep(index, 'number', e.target.value)}
                      />
                      <Input
                        placeholder="عنوان الخطوة"
                        value={step.title || ''}
                        onChange={(e) => updateStep(index, 'title', e.target.value)}
                      />
                      <Textarea
                        placeholder="وصف الخطوة"
                        value={step.description || ''}
                        onChange={(e) => updateStep(index, 'description', e.target.value)}
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
              <div><strong>العنوان:</strong> {stepsData.title}</div>
              <div><strong>العنوان الفرعي:</strong> {stepsData.subtitle}</div>
              <div><strong>عدد الخطوات:</strong> {stepsData.steps?.length || 0}</div>
              <div className="flex flex-wrap gap-1">
                {stepsData.steps?.map((step: any, index: number) => (
                  <Badge key={index} variant="secondary">{step.title}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const FaqEditor = () => {
    const faqData = getSetting('faq_section');
    const [formData, setFormData] = useState(faqData);

    const addFaq = () => {
      const newFaqs = [...(formData.faqs || []), {
        question: "سؤال جديد؟",
        answer: "إجابة السؤال"
      }];
      setFormData({...formData, faqs: newFaqs});
    };

    const removeFaq = (index: number) => {
      const newFaqs = formData.faqs.filter((_: any, i: number) => i !== index);
      setFormData({...formData, faqs: newFaqs});
    };

    const updateFaq = (index: number, field: string, value: string) => {
      const newFaqs = [...formData.faqs];
      newFaqs[index] = {...newFaqs[index], [field]: value};
      setFormData({...formData, faqs: newFaqs});
    };

    const handleSave = () => {
      updateSetting('faq_section', formData);
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            الأسئلة الشائعة
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingSection(editingSection === 'faq' ? null : 'faq')}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>الأسئلة والأجوبة التي تظهر للعملاء</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingSection === 'faq' ? (
            <div className="space-y-4">
              <div>
                <Label>عنوان القسم</Label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="الأسئلة الشائعة"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>قائمة الأسئلة</Label>
                  <Button onClick={addFaq} size="sm" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.faqs?.map((faq: any, index: number) => (
                  <Card key={index} className="p-4 mb-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>السؤال {index + 1}</Label>
                        <Button 
                          onClick={() => removeFaq(index)}
                          size="sm"
                          variant="outline"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        placeholder="السؤال"
                        value={faq.question || ''}
                        onChange={(e) => updateFaq(index, 'question', e.target.value)}
                      />
                      <Textarea
                        placeholder="الإجابة"
                        value={faq.answer || ''}
                        onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                        rows={3}
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
              <div><strong>العنوان:</strong> {faqData.title}</div>
              <div><strong>عدد الأسئلة:</strong> {faqData.faqs?.length || 0}</div>
              <div className="flex flex-wrap gap-1">
                {faqData.faqs?.map((faq: any, index: number) => (
                  <Badge key={index} variant="secondary">{faq.question}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const ContactEditor = () => {
    const contactData = getSetting('contact_section');
    const [formData, setFormData] = useState(contactData);

    const handleSave = () => {
      updateSetting('contact_section', formData);
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            معلومات التواصل
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingSection(editingSection === 'contact' ? null : 'contact')}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>بيانات التواصل مع الشركة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingSection === 'contact' ? (
            <div className="space-y-4">
              <div>
                <Label>عنوان القسم</Label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="تواصل معنا"
                />
              </div>
              <div>
                <Label>العنوان الفرعي</Label>
                <Input
                  value={formData.subtitle || ''}
                  onChange={(e) => setFormData({...formData, subtitle: e.target.value})}
                  placeholder="نحن هنا لمساعدتك"
                />
              </div>
              <div>
                <Label>رقم الهاتف</Label>
                <Input
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+966 50 123 4567"
                />
              </div>
              <div>
                <Label>البريد الإلكتروني</Label>
                <Input
                  value={formData.email || ''}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="info@company.com"
                />
              </div>
              <div>
                <Label>العنوان</Label>
                <Textarea
                  value={formData.address || ''}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="العنوان الكامل"
                  rows={2}
                />
              </div>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 ml-2" />
                {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div><strong>العنوان:</strong> {contactData.title}</div>
              <div><strong>العنوان الفرعي:</strong> {contactData.subtitle}</div>
              <div><strong>الهاتف:</strong> {contactData.phone}</div>
              <div><strong>البريد الإلكتروني:</strong> {contactData.email}</div>
              <div><strong>العنوان:</strong> {contactData.address}</div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const CompanyEditor = () => {
    const companyData = getSetting('company_info');
    const [formData, setFormData] = useState(companyData);

    const handleSave = () => {
      updateSetting('company_info', formData);
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            معلومات الشركة
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingSection(editingSection === 'company' ? null : 'company')}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>بيانات الشركة والشعار</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingSection === 'company' ? (
            <div className="space-y-4">
              <div>
                <Label>اسم الشركة</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="نظام إدارة الوكالات"
                />
              </div>
              <div>
                <Label>رابط الشعار</Label>
                <Input
                  value={formData.logo_url || ''}
                  onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
                  placeholder="/logo.png"
                />
              </div>
              <div>
                <Label>وصف الشركة</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="وصف مختصر عن الشركة"
                  rows={3}
                />
              </div>
              <div>
                <Label>روابط التواصل الاجتماعي</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>فيسبوك</Label>
                    <Input
                      value={formData.social_links?.facebook || ''}
                      onChange={(e) => setFormData({
                        ...formData, 
                        social_links: {...formData.social_links, facebook: e.target.value}
                      })}
                      placeholder="https://facebook.com/company"
                    />
                  </div>
                  <div>
                    <Label>تويتر</Label>
                    <Input
                      value={formData.social_links?.twitter || ''}
                      onChange={(e) => setFormData({
                        ...formData, 
                        social_links: {...formData.social_links, twitter: e.target.value}
                      })}
                      placeholder="https://twitter.com/company"
                    />
                  </div>
                  <div>
                    <Label>لينكد إن</Label>
                    <Input
                      value={formData.social_links?.linkedin || ''}
                      onChange={(e) => setFormData({
                        ...formData, 
                        social_links: {...formData.social_links, linkedin: e.target.value}
                      })}
                      placeholder="https://linkedin.com/company"
                    />
                  </div>
                  <div>
                    <Label>إنستغرام</Label>
                    <Input
                      value={formData.social_links?.instagram || ''}
                      onChange={(e) => setFormData({
                        ...formData, 
                        social_links: {...formData.social_links, instagram: e.target.value}
                      })}
                      placeholder="https://instagram.com/company"
                    />
                  </div>
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 ml-2" />
                {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div><strong>اسم الشركة:</strong> {companyData.name}</div>
              <div><strong>الشعار:</strong> {companyData.logo_url}</div>
              <div><strong>الوصف:</strong> {companyData.description}</div>
              <div><strong>روابط التواصل:</strong> {Object.keys(companyData.social_links || {}).length} روابط</div>
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
          <StepsEditor />
        </TabsContent>

        <TabsContent value="faq">
          <FaqEditor />
        </TabsContent>

        <TabsContent value="contact">
          <ContactEditor />
        </TabsContent>

        <TabsContent value="company">
          <CompanyEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}