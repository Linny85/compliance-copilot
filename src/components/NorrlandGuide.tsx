import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NorrlandGuideDrawer } from "./NorrlandGuideDrawer";

export function NorrlandGuide() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background"
        onClick={() => setOpen(true)}
        aria-label="Norrland Guide"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <HelpCircle className="h-6 w-6" />
      </Button>

      {/* RAG Chat Drawer */}
      <NorrlandGuideDrawer open={open} setOpen={setOpen} />
    </>
  );
}
