import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Palette,
  Monitor,
  Megaphone,
  TrendingUp,
  Users,
  Star,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

const Home = () => {
  const services = [
    {
      icon: Palette,
      title: "تصميم الشعارات والهوية البصرية",
      description: "تصميم شعارات احترافية وهويات بصرية متكاملة تعكس شخصية علامتك التجارية",
      features: ["تصميم شعار احترافي", "دليل الهوية البصرية", "تطبيقات الهوية", "ملفات قابلة للطباعة"],
    },
    {
      icon: Monitor,
      title: "تطوير المواقع الإلكترونية",
      description: "تطوير مواقع إلكترونية حديثة ومتجاوبة مع جميع الأجهزة",
      features: ["تصميم متجاوب", "سهولة الإدارة", "سرعة في التحميل", "محرك بحث محسن"],
    },
    {
      icon: Megaphone,
      title: "إدارة الحملات الإعلانية",
      description: "إنشاء وإدارة حملات إعلانية فعالة على منصات التواصل الاجتماعي",
      features: ["تحليل الجمهور المستهدف", "إنشاء محتوى إبداعي", "متابعة الأداء", "تقارير تفصيلية"],
    },
    {
      icon: TrendingUp,
      title: "التسويق الرقمي",
      description: "استراتيجيات تسويق رقمي متطورة لزيادة المبيعات والوصول",
      features: ["تحسين محركات البحث", "إدارة وسائل التواصل", "التسويق بالمحتوى", "الإعلانات المدفوعة"],
    },
  ];

  const stats = [
    { number: "500+", label: "عميل راضي" },
    { number: "1200+", label: "مشروع مكتمل" },
    { number: "5+", label: "سنوات خبرة" },
    { number: "24/7", label: "دعم فني" },
  ];

  const testimonials = [
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
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-xl flex items-center justify-center">
                <Palette className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">وكالة الإبداع</h1>
                <p className="text-sm text-muted-foreground">للدعاية والإعلان</p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center gap-6">
              <a href="#services" className="text-muted-foreground hover:text-primary transition-colors">
                خدماتنا
              </a>
              <a href="#about" className="text-muted-foreground hover:text-primary transition-colors">
                من نحن
              </a>
              <a href="#testimonials" className="text-muted-foreground hover:text-primary transition-colors">
                آراء العملاء
              </a>
              <a href="#contact" className="text-muted-foreground hover:text-primary transition-colors">
                تواصل معنا
              </a>
              <Link to="/admin">
                <Button variant="outline">لوحة الإدارة</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 via-accent/5 to-background">
        <div className="container mx-auto px-6 text-center">
          <Badge variant="outline" className="mb-4 bg-white/50">
            وكالة متخصصة في الدعاية والإعلان
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            نبني علامتك التجارية
            <br />
            بإبداع وتميز
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            نقدم حلول إبداعية متكاملة في التصميم والتسويق الرقمي لنساعدك في الوصول لأهدافك التجارية
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button variant="hero" size="lg" className="gap-2">
              احجز استشارة مجانية
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg">
              تصفح أعمالنا
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <h3 className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  {stat.number}
                </h3>
                <p className="text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">خدماتنا المتميزة</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              نقدم مجموعة شاملة من الخدمات الإبداعية والتسويقية لتحقيق أهدافك التجارية
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-r from-primary to-accent p-3 rounded-xl">
                      <service.icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                      <p className="text-muted-foreground mb-4">{service.description}</p>
                      <ul className="space-y-2">
                        {service.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-muted/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">آراء عملائنا</h2>
            <p className="text-xl text-muted-foreground">
              ثقة عملائنا هي أغلى ما نملك
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">
                    "{testimonial.text}"
                  </p>
                  <div>
                    <h4 className="font-semibold">{testimonial.name}</h4>
                    <p className="text-sm text-muted-foreground">{testimonial.company}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">تواصل معنا</h2>
            <p className="text-xl text-muted-foreground">
              نحن هنا لمساعدتك في تحقيق أهدافك
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">اتصل بنا</h3>
                <p className="text-muted-foreground">+966 50 123 4567</p>
              </CardContent>
            </Card>
            
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">راسلنا</h3>
                <p className="text-muted-foreground">info@creative-agency.com</p>
              </CardContent>
            </Card>
            
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">موقعنا</h3>
                <p className="text-muted-foreground">الرياض، المملكة العربية السعودية</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center mt-12">
            <Button variant="hero" size="lg" className="gap-2">
              احجز موعدك الآن
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-foreground text-white">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-xl flex items-center justify-center">
                <Palette className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">وكالة الإبداع</h3>
                <p className="text-sm text-white/70">للدعاية والإعلان</p>
              </div>
            </div>
            <p className="text-white/70 mb-6">
              نبني الأحلام بالإبداع والتميز
            </p>
            <p className="text-white/50">
              © 2024 وكالة الإبداع للدعاية والإعلان. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;