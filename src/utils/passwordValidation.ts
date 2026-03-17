export interface PasswordValidation {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong';
}

export const validatePassword = (password: string): PasswordValidation => {
    const errors: string[] = [];
    let strength: 'weak' | 'medium' | 'strong' = 'weak';

    // Verificar comprimento mínimo
    if (password.length < 8) {
        errors.push('A senha deve ter pelo menos 8 caracteres');
    }

    // Verificar se contém pelo menos uma letra minúscula
    if (!/[a-z]/.test(password)) {
        errors.push('A senha deve conter pelo menos uma letra minúscula');
    }

    // Verificar se contém pelo menos uma letra maiúscula
    if (!/[A-Z]/.test(password)) {
        errors.push('A senha deve conter pelo menos uma letra maiúscula');
    }

    // Verificar se contém pelo menos um número
    if (!/\d/.test(password)) {
        errors.push('A senha deve conter pelo menos um número');
    }

    // Verificar se contém pelo menos um caractere especial
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
        errors.push('A senha deve conter pelo menos um caractere especial');
    }

    // Determinar força da senha
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
    const isLongEnough = password.length >= 8;

    const criteriaCount = [hasLower, hasUpper, hasNumber, hasSpecial, isLongEnough].filter(Boolean).length;

    if (criteriaCount >= 5) {
        strength = 'strong';
    } else if (criteriaCount >= 3) {
        strength = 'medium';
    } else {
        strength = 'weak';
    }

    return {
        isValid: errors.length === 0,
        errors,
        strength,
    };
};

export const getPasswordStrengthColor = (strength: 'weak' | 'medium' | 'strong'): string => {
    switch (strength) {
        case 'weak':
            return '#ff4444';
        case 'medium':
            return '#ffaa00';
        case 'strong':
            return '#00aa00';
        default:
            return '#cccccc';
    }
};

export const getPasswordStrengthText = (strength: 'weak' | 'medium' | 'strong'): string => {
    switch (strength) {
        case 'weak':
            return 'Fraca';
        case 'medium':
            return 'Média';
        case 'strong':
            return 'Forte';
        default:
            return '';
    }
};
