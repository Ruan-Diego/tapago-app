import { profileRepository } from '@tapago/data';
import { Button, SIDEBAR_BREAKPOINT, colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useAllDailies } from '@/history/useAllDailies';
import { save } from '@/ledger/actions';
import { showToast } from '@/ledger/toast';
import { Screen } from '@/navigation/Screen';
import { Avatar } from '@/profile/Avatar';
import { BalanceCheck } from '@/profile/BalanceCheck';
import { NotificationPrefs } from '@/profile/NotificationPrefs';
import { PhotoError, usePhotoPicker } from '@/profile/PhotoButton';
import { ProfileForm } from '@/profile/ProfileForm';
import { ProfileStats } from '@/profile/ProfileStats';
import { useDisplayName } from '@/profile/useDisplayName';
import { signOut } from '@/session/signOut';
import { useSession } from '@/session/store';

function sinceLabel(date: Date): string {
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
  return `No Tá pago desde ${month}`;
}

export default function Profile() {
  const wide = useWindowDimensions().width >= SIDEBAR_BREAKPOINT;
  const uid = useSession((state) => state.user?.uid);
  const email = useSession((state) => state.user?.email);
  const profile = useSession((state) => state.profile);
  const name = useDisplayName();
  const dailies = useAllDailies();
  const [leaving, setLeaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const picker = usePhotoPicker((photo) => {
    if (!uid) return;
    save(profileRepository.saveAvatar(uid, photo));
    showToast('Foto atualizada.');
  });

  async function leave() {
    setLeaving(true);
    setFailed(false);
    try {
      await signOut();
    } catch (error) {
      console.error('Falha ao sair.', error);
      setFailed(true);
    } finally {
      setLeaving(false);
    }
  }

  return (
    <Screen title="Perfil">
      <View style={styles.identity}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Trocar foto de perfil"
          accessibilityState={{ busy: picker.busy }}
          onPress={() => void picker.pick()}
          style={styles.photo}
        >
          <Avatar size={112} />
          <View style={styles.photoBand}>
            <Text style={styles.photoText}>{picker.busy ? 'Abrindo…' : 'Trocar foto'}</Text>
          </View>
        </Pressable>
        <PhotoError visible={picker.failed} />
        <View style={styles.texts}>
          <Text numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          {profile?.createdAt ? (
            <Text style={styles.since}>{sinceLabel(profile.createdAt)}</Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.columns, wide && styles.columnsWide]}>
        <View style={[styles.column, wide && styles.columnWide]}>
          {uid && profile ? <ProfileForm key={uid} uid={uid} profile={profile} /> : null}
        </View>
        <View style={[styles.column, wide && styles.columnWide]}>
          <ProfileStats dailies={dailies} />
          {uid && profile ? <NotificationPrefs uid={uid} notif={profile.notif} /> : null}
          {uid ? <BalanceCheck key={uid} uid={uid} /> : null}
          {email ? (
            <Text numberOfLines={1} style={styles.email}>
              Conta: {email}
            </Text>
          ) : null}
          {failed ? (
            <Text accessibilityRole="alert" style={styles.error}>
              Não deu para sair. Tente de novo.
            </Text>
          ) : null}
          <Button label="Sair" variant="outline" loading={leaving} onPress={() => void leave()} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: 'center', gap: spacing.md },
  photo: { width: 112, height: 112, borderRadius: 56, overflow: 'hidden' },
  photoBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,17,17,0.72)',
    borderBottomLeftRadius: radii.pill,
    borderBottomRightRadius: radii.pill,
  },
  photoText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.white },
  texts: { alignItems: 'center', maxWidth: '100%' },
  name: { fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: -0.8, color: colors.ink },
  bio: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.slate,
  },
  since: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    color: colors.graphite,
  },
  columns: { gap: spacing.lg },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { gap: spacing.md },
  columnWide: { flex: 1, minWidth: 0 },
  email: { fontFamily: fonts.body, fontSize: fontSizes.small, color: colors.graphite },
  error: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.label, color: colors.danger },
});
