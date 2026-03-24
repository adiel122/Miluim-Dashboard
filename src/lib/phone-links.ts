/** מספר בפורמט 05XXXXXXXX — קישור חיוג */
export function telHref(phoneDigits: string): string {
  const d = phoneDigits.replace(/\D/g, "");
  return `tel:${d}`;
}

/** wa.me עם קידומת 972 ללא אפס מוביל */
export function whatsappHref(phoneDigits: string): string {
  const d = phoneDigits.replace(/\D/g, "");
  const noLeadingZero = d.startsWith("0") ? d.slice(1) : d;
  return `https://wa.me/972${noLeadingZero}`;
}
