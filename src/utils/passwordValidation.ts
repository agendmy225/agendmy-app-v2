export interface PasswordValidation {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong';
}

export const validatePassword = (password: string): PasswordValidation => {
    const errors: string[] = [];
    let strength: 'weak' | 'medium' | 'strong' = 'weak';

    // Verificar comprimento mÃ­nimo
    if (password.length < 8) {
        errors.push('A senha deve ter pelo menos 8 caracteres');
    }

    // Verificar se contÃ©m pelo menos uma letra minÃºscula
    if (!/[a-z]/.test(password)) {
        errors.push('A senha deve conter pelo menos uma letra minÃºscula');
    }

    // Verificar se contÃ©m pelo menos uma letra maiÃºscula
    if (!/[A-Z]/.test(password)) {
        errors.push('A senha deve conter pelo menos uma letra maiÃºscula');
    }

    // Verificar se contÃ©m pelo menos um nÃºmero
    if (!/\d/.test(password)) {
        errors.push('A senha deve conter pelo menos um nÃºmero');
    }

    // Verificar se contÃ©m pelo menos um caractere especial
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
        errors.push('A senha deve conter pelo menos um caractere especial');
    }

    // Determinar forÃ§a da senha
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
            return 'MÃ©dia';
        case 'strong':
            return 'Forte';
        default:
            return '';
    }
};
