import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supportedLocales, localeLabels, rtlLanguages } from "@/i18n/languages";

// Only show languages that are fully supported
const activeLocales = ['de', 'en', 'sv'] as const;

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  // Update HTML lang and dir attributes when language changes
  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = rtlLanguages.includes(i18n.language) ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const setLocale = async (lng: string) => {
    await i18n.changeLanguage(lng);
    
    // Persist to localStorage first (instant fallback)
    localStorage.setItem('i18nextLng', lng);
    
    // Persist to user profile (best effort)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await supabase
          .from('profiles')
          .update({ language: lng })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="uppercase">{i18n.language}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-50 max-h-[400px] overflow-y-auto bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border shadow-md">
        {activeLocales.map((locale) => (
          <DropdownMenuItem key={locale} onClick={() => setLocale(locale)}>
            {localeLabels[locale] || locale.toUpperCase()}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
