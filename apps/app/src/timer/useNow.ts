import { useEffect, useState } from 'react';

import { useAppReturn } from './useAppReturn';

/** Meio segundo: com um segundo cheio, a contagem às vezes pula um número. */
const TICK_MS = 500;

/** O relógio das contagens na tela; parado quando `ticking` é falso. */
export function useNow(ticking: boolean): Date {
  const [now, setNow] = useState(() => new Date());
  const returns = useAppReturn();

  useEffect(() => {
    const refresh = () => setNow(new Date());
    // Atualiza já, para uma sessão que acabou de chegar não usar um horário antigo.
    const first = setTimeout(refresh, 0);
    const timer = ticking ? setInterval(refresh, TICK_MS) : undefined;
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [ticking, returns]);

  return now;
}
