import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/contexts/I18nContext";

export const LanguageSwitcher = () => {
  const { language, setLanguage } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="uppercase">{language}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLanguage('en')}>
          English (EN)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage('de')}>
          Deutsch (DE)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage('sv')}>
          Svenska (SV)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
