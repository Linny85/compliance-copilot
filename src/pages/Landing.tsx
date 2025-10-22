import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, FileCheck, Brain, Users, CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Compliance-Copilot</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button onClick={() => navigate("/auth")}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            EU Compliance Made Simple
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Navigate NIS2 Directive and AI Act requirements with confidence. 
            Manage risks, document systems, and ensure regulatory compliance.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="shadow-glow">
              Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline">
              View Demo
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">14-day free trial • No credit card required</p>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow bg-gradient-card">
            <Shield className="h-12 w-12 text-primary" />
            <h3 className="text-xl font-bold">NIS2 Compliance</h3>
            <p className="text-muted-foreground">
              Track and manage cybersecurity risks with comprehensive risk assessment tools.
            </p>
          </Card>
          
          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow bg-gradient-card">
            <Brain className="h-12 w-12 text-primary" />
            <h3 className="text-xl font-bold">AI Act Registry</h3>
            <p className="text-muted-foreground">
              Document and classify AI systems according to EU AI Act requirements.
            </p>
          </Card>
          
          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow bg-gradient-card">
            <FileCheck className="h-12 w-12 text-primary" />
            <h3 className="text-xl font-bold">Document Generation</h3>
            <p className="text-muted-foreground">
              Auto-generate compliance policies, reports, and audit documentation.
            </p>
          </Card>
          
          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow bg-gradient-card">
            <Users className="h-12 w-12 text-primary" />
            <h3 className="text-xl font-bold">Multi-User Access</h3>
            <p className="text-muted-foreground">
              Collaborate with your team under secure, company-level isolation.
            </p>
          </Card>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-secondary py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Compliance-Copilot?</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              "Complete multi-tenant isolation for data security",
              "14-day free trial with full feature access",
              "Automated risk scoring and compliance tracking",
              "Master code-based admin control",
              "EU data storage and GDPR compliance",
              "Incident management and audit logging"
            ].map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-accent shrink-0 mt-1" />
                <span className="text-lg">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-4xl font-bold">Ready to Get Compliant?</h2>
          <p className="text-xl text-muted-foreground">
            Join organizations already using Compliance-Copilot to meet EU regulatory requirements.
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="shadow-glow">
            Start Your Free Trial
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 Compliance-Copilot. Built for EU NIS2 & AI Act compliance.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
