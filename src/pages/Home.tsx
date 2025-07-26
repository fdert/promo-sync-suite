import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Phone, Mail, MapPin, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-bold text-foreground">وكالة الإبداع</h1>
                <p className="text-sm text-muted-foreground">للدعاية والإعلان</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" asChild>
                <Link to="/auth">تسجيل الدخول</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            نبني علامتك التجارية بإبداع وتميز
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            نقدم حلول إبداعية متكاملة في التصميم والتسويق الرقمي لنساعدك في الوصول لأهدافك التجارية
          </p>
          <Button size="lg" className="text-lg px-8">
            احجز استشارة مجانية
            <ArrowRight className="mr-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12 px-4">
        <div className="container mx-auto text-center">
          <h4 className="font-bold">وكالة الإبداع للدعاية والإعلان</h4>
          <p className="text-xs opacity-60 mt-2">© 2024 جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;