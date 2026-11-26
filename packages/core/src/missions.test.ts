import { describe, expect, it } from 'vitest';

import { dayKey } from './days';
import { entrySchema, missionBonusEntry, missionSchema, type Mission } from './ledger';
import { MISSION_BONUS } from './limits';
import {
  drawMission,
  isMissionComplete,
  isMissionVisible,
  missionBonusId,
  nextMissionStep,
  replaceArchived,
} from './missions';
import { dailiesFromEntries } from './stats';

const activity = (id: string, archived = false) => ({
  id,
  name: `Atividade ${id}`,
  kind: 'positive' as 'positive' | 'negative',
  archived,
});
const five = ['a', 'b', 'c', 'd', 'e'].map((id) => activity(id));
const ids = (pair: readonly { id: string }[] | null) => pair && pair.map(({ id }) => id).sort();

const today = '2026-11-26';
const yesterday = '2026-11-25';
const mission = (date: string, first: string, second: string, done = false): Mission => ({
  date,
  activities: [
    { id: first, name: `Atividade ${first}` },
    { id: second, name: `Atividade ${second}` },
  ],
  bonus: MISSION_BONUS,
  createdAt: new Date(`${date}T12:00:00Z`),
  ...(done ? { completedAt: new Date(`${date}T20:00:00Z`) } : {}),
});

const days = Array.from({ length: 60 }, (_, index) =>
  new Date(Date.UTC(2026, 10, 1 + index)).toISOString().slice(0, 10),
);

describe('sorteio da missão (R17)', () => {
  it('é o mesmo para a mesma conta e data, em qualquer ordem da lista', () => {
    for (const date of days) {
      expect(drawMission('ana', date, [...five].reverse())).toEqual(drawMission('ana', date, five));
    }
  });

  it('muda com a data e com a conta', () => {
    const draw = (uid: string) => days.map((date) => ids(drawMission(uid, date, five))!.join());
    expect(new Set(draw('ana')).size).toBeGreaterThan(5);
    expect(draw('ana')).not.toEqual(draw('bia'));
  });

  it('sorteia 2 positivas diferentes, nunca arquivadas nem negativas', () => {
    const mixed = [
      activity('a'),
      activity('b'),
      activity('x', true),
      { ...activity('n'), kind: 'negative' as const },
    ];
    for (const date of days) {
      expect(ids(drawMission('ana', date, mixed))).toEqual(['a', 'b']);
    }
  });

  it.each([
    ['nenhuma atividade', []],
    ['uma só', [activity('a')]],
    ['uma ativa e uma arquivada', [activity('a'), activity('b', true)]],
  ])('não há missão com %s', (_label, list) => {
    expect(drawMission('ana', today, list)).toBeNull();
  });

  it('não repete o par do dia anterior quando há outro', () => {
    const three = five.slice(0, 3);
    let previous: Mission | undefined;
    for (const date of days) {
      const drawn = drawMission('ana', date, three, previous)!;
      if (previous) expect(ids(drawn)).not.toEqual(ids(previous.activities));
      previous = { ...mission(date, 'a', 'b'), activities: drawn };
    }
  });

  it('repete o par quando é o único possível', () => {
    const two = five.slice(0, 2);
    expect(ids(drawMission('ana', today, two, mission(yesterday, 'b', 'a')))).toEqual(['a', 'b']);
  });
});

describe('atividade arquivada', () => {
  const archive = (...archived: string[]) =>
    five.map((item) => activity(item.id, archived.includes(item.id)));

  it('é trocada, mantendo a outra no mesmo lugar', () => {
    for (const date of days) {
      const [first, second] = replaceArchived('ana', mission(date, 'a', 'b'), archive('a'))!;
      expect(second.id).toBe('b');
      expect(['c', 'd', 'e']).toContain(first.id);
    }
  });

  it('troca as duas', () => {
    const replaced = replaceArchived('ana', mission(today, 'a', 'b'), archive('a', 'b'))!;
    expect(replaced.every(({ id }) => ['c', 'd', 'e'].includes(id))).toBe(true);
    expect(replaced[0].id).not.toBe(replaced[1].id);
  });

  it('evita montar o par de ontem', () => {
    const previous = mission(yesterday, 'b', 'c');
    for (const date of days) {
      const replaced = replaceArchived('ana', mission(date, 'a', 'b'), archive('a'), previous);
      expect(ids(replaced)).not.toEqual(['b', 'c']);
    }
  });

  it('não troca nada sem arquivada', () => {
    expect(replaceArchived('ana', mission(today, 'a', 'b'), five)).toBeNull();
  });

  it('não troca a que este aparelho ainda não conhece', () => {
    expect(replaceArchived('ana', mission(today, 'a', 'novo'), five)).toBeNull();
  });

  it('esconde a missão sem substituta, e ela volta quando surge uma', () => {
    const pending = mission(today, 'a', 'b');
    const short = [activity('a', true), activity('b')];
    expect(replaceArchived('ana', pending, short)).toBeNull();
    expect(isMissionVisible(pending, short)).toBe(false);
    expect(ids(replaceArchived('ana', pending, [...short, activity('c')]))).toEqual(['b', 'c']);
  });

  it('não esconde a missão já cumprida', () => {
    const done = mission(today, 'a', 'b', true);
    expect(isMissionVisible(done, archive('a'))).toBe(true);
  });
});

describe('cumprimento (R18)', () => {
  const pending = mission(today, 'a', 'b');

  it.each([
    [{}, false],
    [{ a: 3 }, false],
    [{ a: 1, c: 1 }, false],
    [{ a: 1, b: 0 }, false],
    [{ a: 1, b: 1 }, true],
    [{ a: 2, b: 5 }, true],
  ])('com os registros %o', (counts, complete) => {
    expect(isMissionComplete(pending, counts as Record<string, number>)).toBe(complete);
  });
});

describe('próximo passo', () => {
  const state = { uid: 'ana', today, activities: five, counts: {} };

  it('cria a de hoje, sem repetir a de ontem', () => {
    const previous = mission(
      yesterday,
      ...(ids(drawMission('ana', today, five))! as [string, string]),
    );
    const step = nextMissionStep({ ...state, missions: [previous] });
    expect(step?.type).toBe('create');
    expect(ids((step as { activities: Mission['activities'] }).activities)).not.toEqual(
      ids(previous.activities),
    );
  });

  it('virou o dia: a pendente de ontem expira e não é paga', () => {
    const step = nextMissionStep({
      ...state,
      missions: [mission(yesterday, 'a', 'b')],
      counts: { a: 1, b: 1 },
    });
    expect(step?.type).toBe('create');
  });

  it('paga a cumprida, inclusive com registros anteriores à criação', () => {
    const pending = mission(today, 'a', 'b');
    expect(nextMissionStep({ ...state, missions: [pending], counts: { a: 1, b: 1 } })).toEqual({
      type: 'pay',
      mission: pending,
    });
  });

  it('paga em vez de trocar quando já estava cumprida', () => {
    const step = nextMissionStep({
      ...state,
      activities: [activity('a', true), ...five.slice(1)],
      missions: [mission(today, 'a', 'b')],
      counts: { a: 1, b: 1 },
    });
    expect(step?.type).toBe('pay');
  });

  it('troca a arquivada', () => {
    const step = nextMissionStep({
      ...state,
      activities: [activity('a', true), ...five.slice(1)],
      missions: [mission(today, 'a', 'b')],
    });
    expect(step?.type).toBe('replace');
  });

  it.each([
    ['pendente', mission(today, 'a', 'b')],
    ['paga', mission(today, 'a', 'b', true)],
  ])('não faz nada com a missão %s e nada novo', (_label, current) => {
    const counts: Record<string, number> = current.completedAt ? { a: 1, b: 1 } : { a: 1 };
    expect(nextMissionStep({ ...state, missions: [current], counts })).toBeNull();
  });

  it('não faz nada com menos de 2 positivas', () => {
    expect(nextMissionStep({ ...state, activities: [activity('a')], missions: [] })).toBeNull();
  });

  it('o dia é o do fuso do usuário', () => {
    const at = new Date('2026-11-27T02:00:00Z');
    expect(dayKey(at, 'America/Sao_Paulo')).toBe(today);
  });
});

describe('lançamento do bônus', () => {
  const at = new Date('2026-11-26T20:00:00Z');
  const entry = missionBonusEntry(mission(today, 'a', 'b'), at, 'web-1');

  it('tem R$ 100, sem tempo, com as duas atividades', () => {
    expect(entrySchema.parse(entry)).toMatchObject({
      type: 'bonus',
      source: 'mission',
      refId: today,
      value: 10_000,
      minutes: 0,
      activities: mission(today, 'a', 'b').activities,
    });
    expect(missionBonusId(today)).toBe('mission_2026-11-26');
  });

  it('soma nos ganhos sem contar registro, tempo nem bônus de hábito', () => {
    const [daily] = dailiesFromEntries(
      [{ ...entry, id: missionBonusId(today) }],
      'America/Sao_Paulo',
    );
    expect(daily).toMatchObject({ earned: 10_000, posCount: 0, posMin: 0, bonuses: {} });
  });

  it('o documento precisa de 2 atividades', () => {
    const doc = mission(today, 'a', 'b');
    expect(missionSchema.safeParse(doc).success).toBe(true);
    expect(missionSchema.safeParse({ ...doc, activities: [doc.activities[0]] }).success).toBe(
      false,
    );
  });
});
