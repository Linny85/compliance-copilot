export function markOverflowOffenders() {
  const vw = document.documentElement.clientWidth;
  const offenders = Array.from(document.querySelectorAll("main, main *")).filter(
    (el) => (el as HTMLElement).offsetWidth > vw
  );
  offenders.forEach((el) => el.setAttribute("data-overflow-offender", "true"));
  // eslint-disable-next-line no-console
  console.warn("[Overflow offenders]", offenders.slice(0, 20));
  return offenders;
}
