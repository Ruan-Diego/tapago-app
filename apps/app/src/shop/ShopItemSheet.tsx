import { zodResolver } from '@hookform/resolvers/zod';
import {
  reaisInput,
  shopItemFormSchema,
  type ShopItem,
  type ShopItemFormInput,
  type ShopItemValues,
} from '@tapago/core';
import { shopRepository } from '@tapago/data';
import { Button, Sheet } from '@tapago/ui';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { FormField } from '@/auth/FormField';
import { save } from '@/ledger/actions';
import { showToast } from '@/ledger/toast';
import { confirm } from '@/platform/confirm';

interface ShopItemSheetProps {
  uid: string;
  /** Ausente ao criar. */
  item?: ShopItem;
  onClose: () => void;
}

/** Criar, editar e arquivar item da loja (SHOP-01). */
export function ShopItemSheet({ uid, item, onClose }: ShopItemSheetProps) {
  const { control, handleSubmit } = useForm<ShopItemFormInput, unknown, ShopItemValues>({
    resolver: zodResolver(shopItemFormSchema),
    defaultValues: item
      ? { name: item.name, value: reaisInput(item.value), minutes: String(item.minutes) }
      : { name: '', value: '', minutes: '60' },
  });

  const submit = handleSubmit((values) => {
    if (item) {
      save(shopRepository.update(uid, item.id, values));
      showToast(`${values.name} — item salvo.`);
    } else {
      save(shopRepository.create(uid, values));
      showToast(`${values.name} — na loja.`);
    }
    onClose();
  });

  async function archive(target: ShopItem) {
    const proceed = await confirm({
      title: `Arquivar "${target.name}"?`,
      message: 'Ele sai da loja. O histórico continua como está.',
      confirmLabel: 'Arquivar',
    });
    if (!proceed) return;
    save(shopRepository.archive(uid, target.id));
    showToast(`${target.name} — arquivado.`);
    onClose();
  }

  return (
    <Sheet title={item ? 'Editar item' : 'Novo item da loja'} onClose={onClose}>
      <FormField control={control} name="name" label="Nome" placeholder="Ex.: Jogar 45 minutos" />
      <View style={styles.row}>
        <View style={styles.cell}>
          <FormField
            control={control}
            name="value"
            label="Custa (R$)"
            keyboardType="decimal-pad"
            placeholder="20"
          />
        </View>
        <View style={styles.cell}>
          <FormField
            control={control}
            name="minutes"
            label="Dura (min)"
            keyboardType="number-pad"
            placeholder="60"
          />
        </View>
      </View>
      <Button label={item ? 'Salvar item' : 'Colocar na loja'} onPress={() => void submit()} />
      {item ? (
        <Button label="Arquivar" variant="outline" onPress={() => void archive(item)} />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1, minWidth: 0 },
});
