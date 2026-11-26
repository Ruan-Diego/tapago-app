import { activeInOrder, formatMoney, type ShopItem } from '@tapago/core';
import { Appear, PillButton, SIDEBAR_BREAKPOINT, colors, fonts, fontSizes } from '@tapago/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { buyItem } from '@/ledger/actions';
import { useLedger } from '@/ledger/store';
import { Screen } from '@/navigation/Screen';
import { PageHeading } from '@/navigation/PageHeading';
import { useSession } from '@/session/store';
import { PurchaseSheet } from '@/shop/PurchaseSheet';
import { ReceiptModal } from '@/shop/ReceiptModal';
import type { Receipt } from '@/shop/receipt';
import { ShopCard } from '@/shop/ShopCard';
import { ShopItemSheet } from '@/shop/ShopItemSheet';

export default function Shop() {
  const wide = useWindowDimensions().width >= SIDEBAR_BREAKPOINT;
  const uid = useSession((state) => state.user?.uid);
  const balance = useSession((state) => state.profile?.balance);
  const shopItems = useLedger((state) => state.shopItems);
  /** `'new'` ao criar; o item ao editar. */
  const [editing, setEditing] = useState<ShopItem | 'new' | null>(null);
  const items = activeInOrder(shopItems ?? []);
  const [buying, setBuying] = useState<ShopItem | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  return (
    <Screen>
      <PageHeading eyebrow="Loja" title={'Gaste o que\nvocê ganhou.'}>
        {balance === undefined
          ? 'Compre o seu lazer com o saldo.'
          : `Você tem ${formatMoney(balance)}. Ao comprar, escolha usar agora ou guardar.`}
      </PageHeading>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Lazer à venda
        </Text>
        <PillButton label="+ Novo" onPress={() => setEditing('new')} />
      </View>
      {shopItems === null ? (
        <Text style={styles.hint}>Carregando…</Text>
      ) : items.length === 0 ? (
        <Text style={styles.hint}>
          A loja está vazia. Em “+ Novo”, coloque o seu lazer com preço e duração.
        </Text>
      ) : (
        <View style={styles.grid}>
          {items.map((item) => (
            <Appear key={item.id} style={wide ? styles.cellWide : styles.cell}>
              <ShopCard
                item={item}
                balance={balance}
                onBuy={setBuying}
                onEdit={setEditing}
                style={styles.fill}
              />
            </Appear>
          ))}
        </View>
      )}
      {editing && uid ? (
        <ShopItemSheet
          uid={uid}
          item={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {buying ? (
        <PurchaseSheet
          item={buying}
          onClose={() => setBuying(null)}
          onChoose={(useNow) => {
            setReceipt(buyItem(buying, useNow));
            setBuying(null);
          }}
        />
      ) : null}
      {receipt ? (
        <ReceiptModal
          receipt={receipt}
          onClose={() => setReceipt(null)}
          onSeeTimer={() => {
            setReceipt(null);
            router.navigate('/inventory');
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.display, fontSize: fontSizes.title, color: colors.ink },
  hint: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.graphite },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  // Dois por linha no celular: a base abaixo de 50% deixa espaço para o intervalo.
  cell: { flexBasis: '47%', flexGrow: 1, maxWidth: '49%' },
  cellWide: { width: 240 },
  fill: { flexGrow: 1 },
});
