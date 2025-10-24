import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function NorrlandGuide() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
        onClick={() => setOpen(true)}
        aria-label="Norrland Guide"
      >
        <HelpCircle className="h-6 w-6" />
      </Button>

      {/* Placeholder Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Norrland Guide</SheetTitle>
            <SheetDescription>
              Ihr KI-gestützter Compliance-Assistent
            </SheetDescription>
          </SheetHeader>

          <div className="mt-8 flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <HelpCircle className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Demnächst verfügbar</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Der Norrland Guide ist Ihr persönlicher Compliance-Assistent und wird bald für Sie verfügbar sein.
            </p>
          </div>

          <Button
            variant="outline"
            className="absolute top-4 right-4"
            size="icon"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}
