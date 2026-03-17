import { firebaseAuth, sendPasswordResetEmail } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppStackParamList } from '../../types/types';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../constants/colors';
const backgroundImage = require('../../assets/images/fundo.png');

type ForgotPasswordScreenNavigationProp = StackNavigationProp<AppStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC = () => {
    const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleResetPassword = async () => {
        if (!email) {
            Alert.alert('Erro', 'Por favor, digite seu e-mail.');
            return;
        }

        setIsLoading(true);
        try {
            const actionCodeSettings = {
                // URL para onde o usuário será redirecionado após clicar no link
                url: 'https://agendmy-b7ed5.web.app/auth/reset-password',
                handleCodeInApp: false, // O link será aberto no navegador web
                iOS: {
                    bundleId: 'com.appdev', // Bundle ID do projeto
                },
                android: {
                    packageName: 'com.appdev', // Package name do projeto
                    installApp: false,
                    minimumVersion: '1',
                },
            };

            // Enviar email de reset personalizado
            await sendPasswordResetEmail(firebaseAuth, email, actionCodeSettings);

            Alert.alert(
                'E-mail Enviado',
                'Um e-mail da AGENDMY com instruções para redefinir sua senha foi enviado. Verifique sua caixa de entrada e spam. O link é válido por 1 hora.',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack(),
                    },
                ],
            );
        } catch (error: unknown) {
            let errorMessage = 'Ocorreu um erro ao enviar o e-mail de recuperação.';

            if (error && typeof error === 'object' && 'code' in error) {
                const firebaseError = error as { code: string };
                if (firebaseError.code === 'auth/user-not-found') {
                    errorMessage = 'Usuário não encontrado. Verifique seu e-mail.';
                } else if (firebaseError.code === 'auth/invalid-email') {
                    errorMessage = 'E-mail inválido. Verifique o formato.';
                } else if (firebaseError.code === 'auth/too-many-requests') {
                    errorMessage = 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
                } else if (firebaseError.code === 'auth/operation-not-allowed') {
                    errorMessage = 'Operação não permitida. Entre em contato com o suporte.';
                }
            }

            Alert.alert('Erro', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ImageBackground source={backgroundImage} style={styles.backgroundContainer} resizeMode="cover">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.headerContainer}>
                        <Text style={styles.titleText}>RECUPERAR SENHA</Text>
                        <Text style={styles.subtitleText}>
                            Digite seu e-mail para receber as instruções de recuperação de senha.
                        </Text>
                    </View>

                    <View style={styles.formContainer}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>E-MAIL</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Digite seu e-mail"
                                placeholderTextColor={colors.placeholderText}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={handleResetPassword}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={colors.white} />
                            ) : (
                                <Text style={styles.resetButtonText}>ENVIAR E-MAIL</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.backButtonText}>Voltar ao Login</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>AGENDMY</Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        padding: 20,
        justifyContent: 'space-between',
    },
    headerContainer: {
        alignItems: 'center',
        marginTop: 80,
    }, titleText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.offWhite,
        marginBottom: 20,
    }, subtitleText: {
        fontSize: 14,
        color: colors.offWhite,
        textAlign: 'center',
        lineHeight: 20,
    },
    formContainer: {
        width: '100%',
        marginTop: 40,
    },
    inputContainer: {
        marginBottom: 20,
    }, inputLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.offWhite,
        marginBottom: 5,
    },
    input: {
        backgroundColor: colors.white,
        borderRadius: 8,
        height: 50,
        paddingHorizontal: 15,
        color: colors.text,
        fontSize: 16,
        borderWidth: 1,
        borderColor: colors.lightGray,
    },
    resetButton: {
        backgroundColor: colors.error,
        borderRadius: 5,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    }, resetButtonText: {
        color: colors.offWhite,
        fontSize: 16,
        fontWeight: 'bold',
    },
    backButton: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    }, backButtonText: {
        color: colors.offWhite,
        fontSize: 16,
        textDecorationLine: 'underline',
    },
    footer: {
        alignItems: 'center',
        marginBottom: 20,
    }, footerText: {
        color: colors.offWhite,
        fontSize: 14,
        fontWeight: 'bold',
    },
    backgroundContainer: {
        flex: 1,
    },
});

export default ForgotPasswordScreen;
