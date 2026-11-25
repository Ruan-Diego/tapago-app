import { MINUTE_MS, formatDuration, formatMoney, type ShopItem } from '@tapago/core';

export interface Receipt {
  number: string;
  when: string;
  rows: [label: string, value: string][];
  /** Com o timer rodando, o recibo leva até ele. */
  running: boolean;
}

interface ReceiptInput {
  entryId: string;
  item: ShopItem;
  /** Saldo antes da compra, em centavos. */
  balance: number;
  at: Date;
  timeZone: string;
  useNow: boolean;
}

/** O recibo "Tá pago." (SHOP-04). */
export function buildReceipt({
  entryId,
  item,
  balance,
  at,
  timeZone,
  useNow,
}: ReceiptInput): Receipt {
  const time = (date: Date) =>
    date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone });
  const day = at.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone });
  const endsAt = new Date(at.getTime() + item.minutes * MINUTE_MS);

  return {
    // Sem contador no banco: o número vem do id do lançamento.
    number: entryId.slice(-4).toUpperCase(),
    when: `${day} ${time(at)}`,
    rows: [
      ['Item', item.name],
      ['Duração', formatDuration(item.minutes)],
      ['Valor pago', formatMoney(item.value)],
      ['Saldo restante', formatMoney(balance - item.value)],
      ['Status', useNow ? `Rodando até ${time(endsAt)}` : 'Guardado no inventário'],
    ],
    running: useNow,
  };
}
