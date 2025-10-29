import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, FileCheck, Brain, Users, CheckCircle2, ArrowRight, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppMode } from "@/state/AppModeProvider";
import { seedDemo } from "@/data/seed";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Landing = () => {
  const navigate = useNavigate();
  const { switchTo } = useAppMode();
  const [demoLoading, setDemoLoading] = useState(false);
  const { t, i18n } = useTranslation("landing");

  const handleViewDemo = async () => {
    try {
      setDemoLoading(true);
      await seedDemo();
      switchTo("demo");
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Demo start failed:", error);
    } finally {
      setDemoLoading(false);
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const currentLanguage = i18n.language?.toUpperCase() || 'DE';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Compliance-Copilot</span>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  <Globe className="h-4 w-4" />
                  {currentLanguage}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => changeLanguage("de")} className={i18n.language === "de" ? "font-semibold" : ""}>
                  Deutsch
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeLanguage("en")} className={i18n.language === "en" ? "font-semibold" : ""}>
                  English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeLanguage("sv")} className={i18n.language === "sv" ? "font-semibold" : ""}>
                  Svenska
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              {t("header.signIn")}
            </Button>
            <Button onClick={() => navigate("/auth")}>
              {t("header.getStarted")}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            {t("hero.headline")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("hero.subtext")}
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="shadow-glow">
              {t("hero.startTrial")} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={handleViewDemo} disabled={demoLoading}>
              {demoLoading ? t("hero.demoLoading") : t("hero.viewDemo")}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{t("hero.noCreditCard")}</p>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow bg-gradient-card">
            <Shield className="h-12 w-12 text-primary" />
            <h3 className="text-xl font-bold">{t("features.nis2.title")}</h3>
            <p className="text-muted-foreground">
              {t("features.nis2.description")}
            </p>
          </Card>
          
          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow bg-gradient-card">
            <Brain className="h-12 w-12 text-primary" />
            <h3 className="text-xl font-bold">{t("features.aiAct.title")}</h3>
            <p className="text-muted-foreground">
              {t("features.aiAct.description")}
            </p>
          </Card>
          
          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow bg-gradient-card">
            <FileCheck className="h-12 w-12 text-primary" />
            <h3 className="text-xl font-bold">{t("features.documents.title")}</h3>
            <p className="text-muted-foreground">
              {t("features.documents.description")}
            </p>
          </Card>
          
          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow bg-gradient-card">
            <Users className="h-12 w-12 text-primary" />
            <h3 className="text-xl font-bold">{t("features.multiUser.title")}</h3>
            <p className="text-muted-foreground">
              {t("features.multiUser.description")}
            </p>
          </Card>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-secondary py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t("benefits.title")}</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {Object.keys(t("benefits.items", { returnObjects: true }) as Record<string, string>).map((key) => (
              <div key={key} className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-accent shrink-0 mt-1" />
                <span className="text-lg">{t(`benefits.items.${key}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-4xl font-bold">{t("cta.title")}</h2>
          <p className="text-xl text-muted-foreground">
            {t("cta.subtitle")}
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="shadow-glow">
            {t("cta.startTrial")}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>{t("footer.copyright")}</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
