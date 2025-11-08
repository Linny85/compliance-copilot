import 'react-i18next';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    returnNull: false;
  }
}

declare module 'i18next' {
  interface CustomTypeOptions {
    returnNull: false;
    returnEmptyString: false;
  }
}
