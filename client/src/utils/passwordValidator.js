/**
 * Frontend utility for validating password strength.
 */

const commonPasswords = [
    'password', '12345678', 'contraseña', 'iglesia', 'mci2024', 'mci2025',
    'qwerty', 'admin123', 'godisgood', 'jesus123'
];

/**
 * Validates a password and provides details for UI feedback.
 * @param {string} password 
 * @param {Object} context 
 * @returns {Object} { isValid, message, requirements }
 */
export const validatePassword = (password, context = {}) => {
    if (!password) {
        return { isValid: false, message: 'La contraseña es obligatoria', requirements: {} };
    }

    const requirements = {
        length: password.length >= 8,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        number: /\d/.test(password),
        symbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const isComplex = requirements.upper && requirements.lower && requirements.number && requirements.symbol;

    if (!requirements.length) {
        return { isValid: false, message: 'Debe tener al menos 8 caracteres', requirements };
    }

    if (!isComplex) {
        return { isValid: false, message: 'Debe incluir mayúsculas, minúsculas, números y símbolos', requirements };
    }

    const lowerPassword = password.toLowerCase();
    if (commonPasswords.some(common => lowerPassword.includes(common))) {
        return { isValid: false, message: 'Contraseña demasiado común', requirements };
    }

    if (context.email) {
        const emailLocalPart = context.email.split('@')[0].toLowerCase();
        if (emailLocalPart.length > 3 && lowerPassword.includes(emailLocalPart)) {
            return { isValid: false, message: 'No puede contener partes de tu email', requirements };
        }
    }

    if (context.fullName) {
        const names = context.fullName.toLowerCase().split(' ').filter(n => n.length > 2);
        if (names.some(name => lowerPassword.includes(name))) {
            return { isValid: false, message: 'No puede contener tu nombre', requirements };
        }
    }

    return { isValid: true, message: 'Contraseña segura', requirements };
};

/**
 * Calculates a strength score from 0 to 4.
 */
export const getPasswordStrength = (password) => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
    return score;
};
