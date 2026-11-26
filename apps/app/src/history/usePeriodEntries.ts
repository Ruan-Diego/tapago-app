import { addDays, type Entry } from '@tapago/core';
import { entriesRepository } from '@tapago/data';
import { useEffect, useState } from 'react';

interface Loaded {
  entries: Entry[];
  /** Quantos dias para trás esta leitura cobre. */
  days: number;
}

/**
 * Os lançamentos que alimentam os rankings. `days` deve ser o maior período já escolhido: voltar
 * para um menor não religa o listener nem gasta leituras de novo.
 */
export function usePeriodEntries(uid: string | undefined, today: string, days: number) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  // Em UTC, um dia antes do início cobre qualquer fuso; o cálculo filtra o dia exato.
  const since = `${addDays(today, -days)}T00:00:00Z`;

  useEffect(() => {
    if (!uid) return;
    return entriesRepository.watchSince(
      uid,
      new Date(since),
      (entries) => {
        setFailed(false);
        setLoaded({ entries, days });
      },
      (error) => {
        console.error('Falha ao ler os lançamentos do período.', error);
        setFailed(true);
      },
    );
  }, [uid, since, days]);

  return { loaded, failed };
}
