// Двойно обозначаване на цените (EUR + BGN) — задължително в преходния период.
// Официален фиксиран курс на БНБ: 1 EUR = 1.95583 BGN.
const EUR_TO_BGN = 1.95583;

export function bgn(eur: number): string {
  return (eur * EUR_TO_BGN).toFixed(2);
}

// „€3.90 / 7.63 лв." — двете цени една до друга.
export function dualPrice(eur: number): string {
  return `€${eur.toFixed(2)} / ${bgn(eur)} лв.`;
}
