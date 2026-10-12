// src/utils/localDate.ts
// Datas "so dia" (YYYY-MM-DD) sempre no HORARIO LOCAL do aparelho.
//
// Por que: new Date('2026-10-12') e lido como meia-noite em UTC (Londres).
// No Brasil (UTC-3) isso vira 11/10 as 21h: a data aparecia um dia antes e o
// dia da semana saia errado. E date.toISOString() devolve a data em UTC, que
// depois das 21h ja e o dia seguinte.

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

/** Date -> 'YYYY-MM-DD' no horario local. */
export const toLocalDateString = (date: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
};

/**
 * 'YYYY-MM-DD' -> Date no horario local (meia-noite local).
 * Qualquer outro valor cai no comportamento normal de new Date().
 */
export const parseLocalDate = (value: any): Date => {
  if (typeof value === 'string') {
    const m = DATE_ONLY.exec(value.trim());
    if (m) {
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  return new Date(value);
};

/** 'YYYY-MM-DD' -> 'seg, 12/10/2026' */
export const formatLocalDate = (value: any): string => {
  const d = parseLocalDate(value);
  if (isNaN(d.getTime())) {
    return String(value ?? '');
  }
  const p = (n: number) => String(n).padStart(2, '0');
  return `${WEEKDAYS[d.getDay()]}, ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};
