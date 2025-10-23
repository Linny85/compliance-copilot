// Format utilities using Intl API

export const fmt = {
  date(d: Date, locale: string, options?: Intl.DateTimeFormatOptions) {
    return new Intl.DateTimeFormat(locale, options || { dateStyle: 'medium' }).format(d);
  },
  
  number(n: number, locale: string, options?: Intl.NumberFormatOptions) {
    return new Intl.NumberFormat(locale, options).format(n);
  },
  
  currency(amount: number, locale: string, currency: string = 'EUR') {
    return new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency 
    }).format(amount);
  },
};
