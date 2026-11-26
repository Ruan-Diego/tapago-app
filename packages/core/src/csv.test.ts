import { describe, expect, it } from 'vitest';

import { csvCell, csvFileName, csvMoney, entriesToCsv } from './csv';
import type { Entry } from './ledger';

const at = (iso: string) => new Date(iso);

const entries: Entry[] = [
  {
    id: 'e2',
    type: 'loss',
    refId: 'doce',
    name: 'Doce; "grande"',
    value: 1400,
    minutes: 10,
    at: at('2026-11-25T23:30:00Z'),
    deviceId: 'd',
    base: 700,
    level: 2,
  },
  {
    id: 'e1',
    type: 'earn',
    refId: 'treino',
    name: 'Treino',
    value: 1800,
    minutes: 60,
    at: at('2026-11-25T12:05:00Z'),
    deviceId: 'd',
  },
  {
    id: 'undo_e2',
    type: 'reversal',
    reversedType: 'loss',
    reverses: 'e2',
    refId: 'doce',
    name: 'Doce; "grande"',
    value: 1400,
    minutes: 10,
    at: at('2026-11-25T23:30:05Z'),
    deviceId: 'd',
  },
  {
    id: 'mission_2026-11-26',
    type: 'bonus',
    source: 'mission',
    refId: '2026-11-26',
    name: 'Missão do dia',
    value: 10000,
    minutes: 0,
    activities: [
      { id: 'treino', name: 'Treino' },
      { id: 'ler', name: '=Ler' },
    ],
    at: at('2026-11-26T15:00:00Z'),
    deviceId: 'd',
  },
];

describe('exportar CSV (PROF-03)', () => {
  it('formata centavos com vírgula decimal', () => {
    expect(csvMoney(123450)).toBe('1234,50');
    expect(csvMoney(-1800)).toBe('-18,00');
    expect(csvMoney(5)).toBe('0,05');
  });

  it('protege separador, aspas e fórmulas', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvCell('=SOMA(A1)', true)).toBe("'=SOMA(A1)");
    expect(csvCell('-18,00')).toBe('-18,00');
  });

  it('gera uma linha por lançamento, do mais antigo ao mais novo, no fuso do usuário', () => {
    const csv = entriesToCsv(entries, 'America/Sao_Paulo');
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).trimEnd().split('\r\n');
    expect(lines[0]).toBe('Data;Hora;Tipo;Nome;Valor (R$);Efeito no saldo (R$);Minutos;Detalhe;Id');
    expect(lines.slice(1)).toEqual([
      '2026-11-25;09:05;Ganho;Treino;18,00;18,00;60;;e1',
      '2026-11-25;20:30;Perda;"Doce; ""grande""";14,00;-14,00;10;2º registro desde o zeramento;e2',
      '2026-11-25;20:30;Estorno;"Doce; ""grande""";14,00;14,00;10;Desfaz perda;undo_e2',
      '2026-11-26;12:00;Bônus;Missão do dia;100,00;100,00;0;Missão do dia: Treino + =Ler;mission_2026-11-26',
    ]);
  });

  it('dá nome ao arquivo pela data', () => {
    expect(csvFileName('2026-11-26')).toBe('tapago-lancamentos-2026-11-26.csv');
  });
});
