export type Lang = 'de' | 'en' | 'sv';

const voices: Record<Lang, { id: string; rate: string; pitch: string }> = {
  de: { id: 'de-DE-Standard-A', rate: '95%', pitch: '0st' },
  en: { id: 'en-US-Standard-C', rate: '95%', pitch: '0st' },
  sv: { id: 'sv-SE-Standard-A', rate: '95%', pitch: '0st' },
};

export function toSSML(text: string, lang: Lang): string {
  const v = voices[lang] ?? voices.de;
  return `
    <speak>
      <prosody rate="${v.rate}" pitch="${v.pitch}" volume="medium">
        ${text}
      </prosody>
    </speak>
  `.trim();
}

export const voiceFor = (lang: Lang): string => voices[lang]?.id ?? voices.de.id;
