export function sanitize(text: string): string {
  // Remove emojis and pictographs
  text = text.replace(/\p{Extended_Pictographic}/gu, '');
  
  // Reduce multiple special characters
  text = text
    .replace(/[!]{2,}/g, '!')
    .replace(/[?]{2,}/g, '?')
    .replace(/[~^_*`]+/g, '')
    .replace(/ {2,}/g, ' ');
  
  // Remove markup artifacts
  text = text.replace(/(__|\*\*|~~)/g, '');
  
  return text.trim();
}
