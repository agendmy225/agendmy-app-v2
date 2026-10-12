// src/components/ProfessionalAppAccess.tsx
// Na tela Gerenciar Profissionais (dono): convidar, ver o convite e remover acesso.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { collection, doc, getDoc, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { firebaseDb } from '../config/firebase';
import { colors } from '../constants/colors';
import { useAuth } from '../features/auth/context/AuthContext';
import {
  PlanLimitError,
  buildInviteMessage,
  createInvite,
  removeAppAccess,
  revokeInvite,
} from '../services/professionalAccess';

interface Props {
  businessId: string;
  professionalId: string;
  professionalName: string;
}

const ProfessionalAppAccess: React.FC<Props> = ({ businessId, professionalId, professionalName }) => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsubProf = onSnapshot(
      doc(firebaseDb, 'professionals', professionalId),
      (snap: { data: () => Record<string, any> | undefined }) => {
        setHasAccess(snap.data()?.appAccess === true);
      },
      () => undefined,
    );
    const unsubInvite = onSnapshot(
      query(collection(firebaseDb, 'professionalInvites'),
        where('professionalId', '==', professionalId), where('status', '==', 'pending')),
      (snap: { docs: { id: string }[] }) => {
        setPendingCode(snap.docs.length > 0 ? snap.docs[0].id : null);
      },
      () => undefined,
    );
    getDoc(doc(firebaseDb, 'businesses', businessId))
      .then((s: { data: () => Record<string, any> | undefined }) => setBusinessName(s.data()?.name || 'estabelecimento'))
      .catch(() => undefined);
    return () => {
      unsubProf();
      unsubInvite();
    };
  }, [businessId, professionalId]);

  const share = (code: string) => {
    Share.share({ message: buildInviteMessage(professionalName, businessName || 'estabelecimento', code) })
      .catch(() => undefined);
  };

  const handleInvite = async () => {
    if (!user?.uid) {
      return;
    }
    try {
      setBusy(true);
      const code = await createInvite({
        businessId,
        businessName: businessName || 'estabelecimento',
        professionalId,
        professionalName,
        ownerId: user.uid,
      });
      share(code);
    } catch (err) {
      if (err instanceof PlanLimitError) {
        Alert.alert(
          'Limite do plano',
          err.limit >= 10
            ? 'Voce ja tem 10 profissionais com acesso ao app, que e o maximo permitido.'
            : `Seu plano permite ate ${err.limit} profissionais com acesso ao app. Para convidar mais, e preciso o plano Plus (ate 10 profissionais).`,
        );
      } else {
        Alert.alert('Erro', 'Nao foi possivel criar o convite. Tente novamente.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = () => {
    if (!pendingCode) {
      return;
    }
    Alert.alert('Cancelar convite', 'O codigo deixa de funcionar. Deseja cancelar?', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Cancelar convite',
        style: 'destructive',
        onPress: () => revokeInvite(pendingCode).catch(() => Alert.alert('Erro', 'Nao foi possivel cancelar.')),
      },
    ]);
  };

  const handleRemove = () => {
    Alert.alert(
      'Remover acesso',
      `${professionalName} nao vai mais conseguir entrar no app. Os agendamentos dele continuam normais. Deseja remover?`,
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => removeAppAccess(professionalId).catch(() => Alert.alert('Erro', 'Nao foi possivel remover.')),
        },
      ],
    );
  };

  return (
    <View style={styles.box}>
      <Icon name="smartphone" size={18} color={colors.primary} />
      {busy ? (
        <ActivityIndicator size="small" color={colors.primary} style={styles.spacer} />
      ) : hasAccess ? (
        <>
          <Text style={styles.text}>Tem acesso ao app</Text>
          <TouchableOpacity onPress={handleRemove}>
            <Text style={[styles.link, { color: colors.error }]}>Remover acesso</Text>
          </TouchableOpacity>
        </>
      ) : pendingCode ? (
        <>
          <Text style={styles.text}>Convite: <Text style={styles.code}>{pendingCode}</Text></Text>
          <TouchableOpacity onPress={() => share(pendingCode)}>
            <Text style={styles.link}>Enviar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRevoke}>
            <Text style={[styles.link, { color: colors.error }]}>Cancelar</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.text}>Sem acesso ao app</Text>
          <TouchableOpacity onPress={handleInvite}>
            <Text style={styles.link}>Convidar para o app</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  text: { flex: 1, fontSize: 13, color: colors.text, marginLeft: 6 },
  code: { fontWeight: 'bold', letterSpacing: 2 },
  link: { fontSize: 13, color: colors.primary, fontWeight: 'bold', marginLeft: 12 },
  spacer: { marginLeft: 8 },
});

export default ProfessionalAppAccess;
