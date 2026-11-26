/**
 * Exportar os lançamentos em CSV (PROF-03). Separador `;` e vírgula decimal, como o Excel e o
 * Google Planilhas esperam em português; o arquivo começa com BOM para os acentos abrirem certo.
 */
import { dayKey } from './days';
import type { Entry } from './ledger';

const SEPARATOR = ';';

const TYPE_LABELS: Record<Entry['type'], string> = {
  earn: 'Ganho',
  loss: 'Perda',
  purchase: 'Compra',
  use: 'Uso',
  bonus: 'Bônus',
  reversal: 'Estorno',
};

const HEADER = [
  'Data',
  'Hora',
  'Tipo',
  'Nome',
  'Valor (R$)',
  'Efeito no saldo (R$)',
  'Minutos',
  'Detalhe',
  'Id',
];

/** Centavos em reais com vírgula decimal, sem separador de milhar: "1234,50", "-18,00". */
export function csvMoney(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
}

/**
 * Uma célula. Aspas quando há separador, aspas ou quebra de linha. Texto livre (`text`) que começa
 * com `=`, `+`, `-` ou `@` ganha um apóstrofo, para a planilha não tratar um nome como fórmula.
 */
export function csvCell(value: string, text = false): string {
  const safe = text && /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Colunas de texto livre: nome e detalhe. */
const TEXT_COLUMNS = new Set([3, 7]);

/** Efeito no saldo. O estorno vale o inverso do lançamento desfeito (R8). */
function balanceEffect(entry: Entry): number {
  switch (entry.type) {
    case 'earn':
    case 'bonus':
      return entry.value;
    case 'loss':
    case 'purchase':
      return -entry.value;
    case 'use':
      return 0;
    case 'reversal':
      return entry.reversedType === 'loss' ? entry.value : -entry.value;
  }
}

function detail(entry: Entry): string {
  if (entry.type === 'bonus' && entry.source === 'mission') {
    const names = entry.activities?.map(({ name }) => name).join(' + ');
    return names ? `Missão do dia: ${names}` : 'Missão do dia';
  }
  if (entry.type === 'bonus') {
    return entry.target ? `Hábito completo (${entry.target} no dia)` : 'Hábito completo';
  }
  if (entry.type === 'reversal') {
    return `Desfaz ${TYPE_LABELS[entry.reversedType ?? 'earn'].toLowerCase()}`;
  }
  if (entry.type === 'earn' && entry.level && entry.level > 1) {
    return `Sequência: dia ${entry.level}`;
  }
  if (entry.type === 'loss' && entry.level && entry.level > 1) {
    return `${entry.level}º registro desde o zeramento`;
  }
  return '';
}

function timeOf(date: Date, timeZone: string): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  };
  try {
    return date.toLocaleTimeString('pt-BR', { ...options, timeZone });
  } catch {
    return date.toLocaleTimeString('pt-BR', options);
  }
}

/** O CSV inteiro, do lançamento mais antigo para o mais novo. */
export function entriesToCsv(entries: readonly Entry[], timeZone: string): string {
  const rows = [...entries]
    .sort((a, b) => a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id))
    .map((entry) =>
      [
        dayKey(entry.at, timeZone),
        timeOf(entry.at, timeZone),
        TYPE_LABELS[entry.type],
        entry.name,
        csvMoney(entry.value),
        csvMoney(balanceEffect(entry)),
        String(entry.minutes),
        detail(entry),
        entry.id,
      ]
        .map((value, column) => csvCell(value, TEXT_COLUMNS.has(column)))
        .join(SEPARATOR),
    );
  return `﻿${[HEADER.join(SEPARATOR), ...rows].join('\r\n')}\r\n`;
}

/** Nome do arquivo: `tapago-lancamentos-AAAA-MM-DD.csv`. */
export function csvFileName(today: string): string {
  return `tapago-lancamentos-${today}.csv`;
}
