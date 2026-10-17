/**
 * С какви думи се брои продуктът в менюто. Тортата и баклавата се продават на
 * парчета, но цялото на баклавата е тава, не торта. Всичко друго е „порция".
 *
 * Преди това беше „category === "торта"" на седем места — и баклавата, записана
 * като торта, излизаше „Цяла торта".
 */
export type Units = {
  one: string; // „за парче"
  oneThe: string; // „в парчето"
  many: string; // „12 парчета"
  whole: string; // „Цяла торта"
};

const BY_CATEGORY: Record<string, Units> = {
  торта: { one: "парче", oneThe: "парчето", many: "парчета", whole: "Цяла торта" },
  тава: { one: "парче", oneThe: "парчето", many: "парчета", whole: "Цяла тава" },
};

const PORTION: Units = { one: "порция", oneThe: "порцията", many: "порции", whole: "Цяло" };

export function unitsFor(category: string | null | undefined): Units {
  return BY_CATEGORY[category ?? ""] ?? PORTION;
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
