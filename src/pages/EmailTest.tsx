import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Send } from "lucide-react";

export default function EmailTest() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const sendTestEmail = async () => {
    if (!email) {
      toast.error("Bitte E-Mail-Adresse eingeben");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-test", {
        body: { to: email },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Test-Mail erfolgreich gesendet an ${email}`);
      } else {
        throw new Error(data?.error || "Unbekannter Fehler");
      }
    } catch (error: any) {
      console.error("Test-Mail Fehler:", error);
      toast.error(`Fehler: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle>E-Mail System Test</CardTitle>
          </div>
          <CardDescription>
            Sende eine Test-E-Mail über Postmark
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="test@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendTestEmail()}
            />
            <Button onClick={sendTestEmail} disabled={loading}>
              <Send className="h-4 w-4 mr-2" />
              {loading ? "Sende..." : "Test senden"}
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Template:</strong> dev_test_mail</p>
            <p><strong>Stream:</strong> outbound</p>
            <p><strong>Status:</strong> {loading ? "Wird gesendet..." : "Bereit"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
