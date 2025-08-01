import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Save,
  Eye,
  Plus,
  Trash2,
  Edit3,
  Globe,
  Users,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Star,
  Palette,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const WebsiteContent = () => {
  const { toast } = useToast();

  // بيانات الصفحة الرئيسية
  const [companyInfo, setCompanyInfo] = useState({
    name: "وكالة الإبداع",
    subtitle: "للدعاية والإعلان",
    tagline: "نبني الأحلام بالإبداع والتميز",
    logo: "", // رابط الشعار
  });

  const [heroSection, setHeroSection] = useState({
    badge: "وكالة متخصصة في الدعاية والإعلان",
    title: "نبني علامتك التجارية\nبإبداع وتميز",
    description: "نقدم حلول إبداعية متكاملة في التصميم والتسويق الرقمي لنساعدك في الوصول لأهدافك التجارية",
    primaryButton: "احجز استشارة مجانية",
    secondaryButton: "تصفح أعمالنا",
  });

  const [stats, setStats] = useState([
    { number: "500+", label: "عميل راضي" },
    { number: "1200+", label: "مشروع مكتمل" },
    { number: "5+", label: "سنوات خبرة" },
    { number: "24/7", label: "دعم فني" },
  ]);

  const [services, setServices] = useState([
    {
      title: "تصميم الشعارات والهوية البصرية",
      description: "تصميم شعارات احترافية وهويات بصرية متكاملة تعكس شخصية علامتك التجارية",
      features: ["تصميم شعار احترافي", "دليل الهوية البصرية", "تطبيقات الهوية", "ملفات قابلة للطباعة"],
    },
    {
      title: "تطوير المواقع الإلكترونية",
      description: "تطوير مواقع إلكترونية حديثة ومتجاوبة مع جميع الأجهزة",
      features: ["تصميم متجاوب", "سهولة الإدارة", "سرعة في التحميل", "محرك بحث محسن"],
    },
    {
      title: "إدارة الحملات الإعلانية",
      description: "إنشاء وإدارة حملات إعلانية فعالة على منصات التواصل الاجتماعي",
      features: ["تحليل الجمهور المستهدف", "إنشاء محتوى إبداعي", "متابعة الأداء", "تقارير تفصيلية"],
    },
    {
      title: "التسويق الرقمي",
      description: "استراتيجيات تسويق رقمي متطورة لزيادة المبيعات والوصول",
      features: ["تحسين محركات البحث", "إدارة وسائل التواصل", "التسويق بالمحتوى", "الإعلانات المدفوعة"],
    },
  ]);

  const [testimonials, setTestimonials] = useState([
    {
      name: "أحمد محمد",
      company: "شركة النجاح التجارية",
      text: "خدمة ممتازة وتصميمات إبداعية فاقت توقعاتي. فريق محترف ومتعاون.",
      rating: 5,
    },
    {
      name: "فاطمة علي",
      company: "مؤسسة الأمل الخيرية",
      text: "تعامل راقي وجودة عالية في التنفيذ. أنصح بالتعامل معهم بكل ثقة.",
      rating: 5,
    },
    {
      name: "محمد عبدالله",
      company: "متجر الإلكترونيات الحديثة",
      text: "ساعدونا في بناء هويتنا البصرية بشكل احترافي ومميز.",
      rating: 5,
    },
  ]);

  const [contactInfo, setContactInfo] = useState({
    phone: "+966 50 123 4567",
    email: "info@creative-agency.com",
    address: "الرياض، المملكة العربية السعودية",
  });

  const [sections, setSections] = useState({
    servicesTitle: "خدماتنا المتميزة",
    servicesDescription: "نقدم مجموعة شاملة من الخدمات الإبداعية والتسويقية لتحقيق أهدافك التجارية",
    testimonialsTitle: "آراء عملائنا",
    testimonialsDescription: "ثقة عملائنا هي أغلى ما نملك",
    contactTitle: "تواصل معنا",
    contactDescription: "نحن هنا لمساعدتك في تحقيق أهدافك",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogoPreview(result);
        setCompanyInfo({ ...companyInfo, logo: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      let logoUrl = companyInfo.logo;

      // رفع الشعار إذا تم اختيار ملف جديد
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, logoFile);

        if (uploadError) {
          console.error('Error uploading logo:', uploadError);
          toast({
            title: "خطأ في رفع الشعار",
            description: "حدث خطأ أثناء رفع الشعار: " + uploadError.message,
            variant: "destructive",
          });
          return;
        }

        // الحصول على رابط الشعار
        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(fileName);

        logoUrl = publicUrl;
        setCompanyInfo({ ...companyInfo, logo: logoUrl });
      }

      const websiteData = {
        companyInfo: { ...companyInfo, logo: logoUrl },
        heroSection,
        stats,
        services,
        testimonials,
        contactInfo,
        sections
      };

      // حفظ البيانات في قاعدة البيانات
      const { error } = await supabase
        .from('website_settings')
        .upsert({
          setting_key: 'website_content',
          setting_value: websiteData,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) {
        console.error('Error saving website settings:', error);
        toast({
          title: "خطأ في الحفظ",
          description: "حدث خطأ أثناء حفظ الإعدادات: " + error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "تم الحفظ بنجاح",
        description: "تم حفظ تغييرات محتوى الموقع في قاعدة البيانات",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    }
  };

  // جلب البيانات المحفوظة عند تحميل الصفحة
  const loadSavedData = async () => {
    try {
      const { data, error } = await supabase
        .from('website_settings')
        .select('setting_value')
        .eq('setting_key', 'website_content')
        .maybeSingle();

      if (error) {
        console.error('Error loading website settings:', error);
        return;
      }

      if (data?.setting_value) {
        const savedData = data.setting_value as any;
        if (savedData.companyInfo) {
          setCompanyInfo(savedData.companyInfo);
          if (savedData.companyInfo.logo) {
            setLogoPreview(savedData.companyInfo.logo);
          }
        }
        if (savedData.heroSection) setHeroSection(savedData.heroSection);
        if (savedData.stats) setStats(savedData.stats);
        if (savedData.services) setServices(savedData.services);
        if (savedData.testimonials) setTestimonials(savedData.testimonials);
        if (savedData.contactInfo) setContactInfo(savedData.contactInfo);
        if (savedData.sections) setSections(savedData.sections);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    loadSavedData();
  }, []);

  const addService = () => {
    setServices([
      ...services,
      {
        title: "خدمة جديدة",
        description: "وصف الخدمة الجديدة",
        features: ["ميزة 1", "ميزة 2"],
      },
    ]);
  };

  const addTestimonial = () => {
    setTestimonials([
      ...testimonials,
      {
        name: "اسم العميل",
        company: "اسم الشركة",
        text: "رأي العميل",
        rating: 5,
      },
    ]);
  };

  const addStat = () => {
    setStats([...stats, { number: "0", label: "إحصائية جديدة" }]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة محتوى الموقع</h1>
          <p className="text-muted-foreground">
            تعديل وإدارة محتوى الصفحة الرئيسية للموقع
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Eye className="h-4 w-4" />
            معاينة
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            حفظ التغييرات
          </Button>
        </div>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="company">معلومات الشركة</TabsTrigger>
          <TabsTrigger value="logo">الشعار</TabsTrigger>
          <TabsTrigger value="hero">القسم الرئيسي</TabsTrigger>
          <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
          <TabsTrigger value="services">الخدمات</TabsTrigger>
          <TabsTrigger value="testimonials">آراء العملاء</TabsTrigger>
          <TabsTrigger value="contact">معلومات التواصل</TabsTrigger>
        </TabsList>

        {/* معلومات الشركة */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                معلومات الشركة الأساسية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">اسم الشركة</Label>
                  <Input
                    id="company-name"
                    value={companyInfo.name}
                    onChange={(e) =>
                      setCompanyInfo({ ...companyInfo, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-subtitle">الوصف الفرعي</Label>
                  <Input
                    id="company-subtitle"
                    value={companyInfo.subtitle}
                    onChange={(e) =>
                      setCompanyInfo({ ...companyInfo, subtitle: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-tagline">الشعار</Label>
                <Input
                  id="company-tagline"
                  value={companyInfo.tagline}
                  onChange={(e) =>
                    setCompanyInfo({ ...companyInfo, tagline: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* إدارة الشعار */}
        <TabsContent value="logo">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                إدارة شعار الشركة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* عرض الشعار الحالي */}
              {logoPreview && (
                <div className="space-y-2">
                  <Label>الشعار الحالي</Label>
                  <div className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
                    <img 
                      src={logoPreview} 
                      alt="شعار الشركة" 
                      className="max-h-32 max-w-32 object-contain"
                    />
                  </div>
                </div>
              )}
              
              {/* رفع شعار جديد */}
              <div className="space-y-2">
                <Label htmlFor="logo-upload">تحديث الشعار</Label>
                <div className="flex items-center gap-4">
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                  >
                    اختيار ملف
                  </Button>
                  {logoFile && (
                    <span className="text-sm text-muted-foreground">
                      {logoFile.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  يُفضل استخدام صور بصيغة PNG أو JPG بحجم لا يزيد عن 2MB
                </p>
              </div>

              {/* معاينة مباشرة */}
              {logoPreview && (
                <div className="space-y-2">
                  <Label>معاينة في الموقع</Label>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <img 
                        src={logoPreview} 
                        alt="معاينة الشعار" 
                        className="h-10 w-10 object-contain"
                      />
                      <div>
                        <h3 className="font-semibold text-lg">{companyInfo.name}</h3>
                        <p className="text-sm text-gray-600">{companyInfo.subtitle}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* القسم الرئيسي */}
        <TabsContent value="hero">
          <Card>
            <CardHeader>
              <CardTitle>القسم الرئيسي (Hero Section)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hero-badge">الشارة</Label>
                <Input
                  id="hero-badge"
                  value={heroSection.badge}
                  onChange={(e) =>
                    setHeroSection({ ...heroSection, badge: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero-title">العنوان الرئيسي</Label>
                <Textarea
                  id="hero-title"
                  value={heroSection.title}
                  onChange={(e) =>
                    setHeroSection({ ...heroSection, title: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero-description">الوصف</Label>
                <Textarea
                  id="hero-description"
                  value={heroSection.description}
                  onChange={(e) =>
                    setHeroSection({ ...heroSection, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hero-primary-btn">الزر الأساسي</Label>
                  <Input
                    id="hero-primary-btn"
                    value={heroSection.primaryButton}
                    onChange={(e) =>
                      setHeroSection({ ...heroSection, primaryButton: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hero-secondary-btn">الزر الثانوي</Label>
                  <Input
                    id="hero-secondary-btn"
                    value={heroSection.secondaryButton}
                    onChange={(e) =>
                      setHeroSection({ ...heroSection, secondaryButton: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* الإحصائيات */}
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>الإحصائيات</span>
                <Button onClick={addStat} variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  إضافة إحصائية
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.map((stat, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">إحصائية {index + 1}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStats(stats.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>الرقم</Label>
                        <Input
                          value={stat.number}
                          onChange={(e) => {
                            const newStats = [...stats];
                            newStats[index].number = e.target.value;
                            setStats(newStats);
                          }}
                        />
                      </div>
                      <div>
                        <Label>التسمية</Label>
                        <Input
                          value={stat.label}
                          onChange={(e) => {
                            const newStats = [...stats];
                            newStats[index].label = e.target.value;
                            setStats(newStats);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* الخدمات */}
        <TabsContent value="services">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>عناوين قسم الخدمات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>عنوان القسم</Label>
                  <Input
                    value={sections.servicesTitle}
                    onChange={(e) =>
                      setSections({ ...sections, servicesTitle: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>وصف القسم</Label>
                  <Textarea
                    value={sections.servicesDescription}
                    onChange={(e) =>
                      setSections({ ...sections, servicesDescription: e.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>الخدمات</span>
                  <Button onClick={addService} variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    إضافة خدمة
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {services.map((service, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">خدمة {index + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setServices(services.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label>عنوان الخدمة</Label>
                        <Input
                          value={service.title}
                          onChange={(e) => {
                            const newServices = [...services];
                            newServices[index].title = e.target.value;
                            setServices(newServices);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>وصف الخدمة</Label>
                        <Textarea
                          value={service.description}
                          onChange={(e) => {
                            const newServices = [...services];
                            newServices[index].description = e.target.value;
                            setServices(newServices);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>المميزات (سطر لكل ميزة)</Label>
                        <Textarea
                          value={service.features.join('\n')}
                          onChange={(e) => {
                            const newServices = [...services];
                            newServices[index].features = e.target.value.split('\n');
                            setServices(newServices);
                          }}
                          rows={4}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* آراء العملاء */}
        <TabsContent value="testimonials">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>عناوين قسم آراء العملاء</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>عنوان القسم</Label>
                  <Input
                    value={sections.testimonialsTitle}
                    onChange={(e) =>
                      setSections({ ...sections, testimonialsTitle: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>وصف القسم</Label>
                  <Input
                    value={sections.testimonialsDescription}
                    onChange={(e) =>
                      setSections({ ...sections, testimonialsDescription: e.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    آراء العملاء
                  </span>
                  <Button onClick={addTestimonial} variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    إضافة رأي
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {testimonials.map((testimonial, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">رأي {index + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTestimonials(testimonials.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>اسم العميل</Label>
                          <Input
                            value={testimonial.name}
                            onChange={(e) => {
                              const newTestimonials = [...testimonials];
                              newTestimonials[index].name = e.target.value;
                              setTestimonials(newTestimonials);
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>اسم الشركة</Label>
                          <Input
                            value={testimonial.company}
                            onChange={(e) => {
                              const newTestimonials = [...testimonials];
                              newTestimonials[index].company = e.target.value;
                              setTestimonials(newTestimonials);
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>نص الرأي</Label>
                        <Textarea
                          value={testimonial.text}
                          onChange={(e) => {
                            const newTestimonials = [...testimonials];
                            newTestimonials[index].text = e.target.value;
                            setTestimonials(newTestimonials);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>التقييم</Label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Button
                              key={star}
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newTestimonials = [...testimonials];
                                newTestimonials[index].rating = star;
                                setTestimonials(newTestimonials);
                              }}
                            >
                              <Star
                                className={`h-4 w-4 ${
                                  star <= testimonial.rating
                                    ? "fill-accent text-accent"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* معلومات التواصل */}
        <TabsContent value="contact">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>عناوين قسم التواصل</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>عنوان القسم</Label>
                  <Input
                    value={sections.contactTitle}
                    onChange={(e) =>
                      setSections({ ...sections, contactTitle: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>وصف القسم</Label>
                  <Input
                    value={sections.contactDescription}
                    onChange={(e) =>
                      setSections({ ...sections, contactDescription: e.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  معلومات التواصل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">رقم الهاتف</Label>
                  <Input
                    id="contact-phone"
                    value={contactInfo.phone}
                    onChange={(e) =>
                      setContactInfo({ ...contactInfo, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">البريد الإلكتروني</Label>
                  <Input
                    id="contact-email"
                    value={contactInfo.email}
                    onChange={(e) =>
                      setContactInfo({ ...contactInfo, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-address">العنوان</Label>
                  <Input
                    id="contact-address"
                    value={contactInfo.address}
                    onChange={(e) =>
                      setContactInfo({ ...contactInfo, address: e.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WebsiteContent;