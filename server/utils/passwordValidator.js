/**
 * Utility for validating password strength and security.
 */

const commonPasswords = [
    'password', '12345678', 'contraseña', 'iglesia', 'mci2024', 'mci2025',
    'qwerty', 'admin123', 'godisgood', 'jesus123'
];

/**
 * Validates a password against strict security criteria.
 * @param {string} password - The password to validate.
 * @param {Object} context - Optional context to check for personal information.
 * @param {string} [context.fullName] - User's full name.
 * @param {string} [context.email] - User's email.
 * @returns {Object} result - { isValid: boolean, message: string }
 */
const validatePassword = (password, context = {}) => {
    if (!password) {
        return { isValid: false, message: 'La contraseña es obligatoria' };
    }

    // 1. Minimum 8 characters
    if (password.length < 8) {
        return { isValid: false, message: 'La contraseña debe tener al menos 8 caracteres (recomendado 9+)' };
    }

    // 2. Combination of uppercase, lowercase, numbers, and symbols
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSymbols = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSymbols)) {
        return {
            isValid: false,
            message: 'La contraseña debe incluir mayúsculas, minúsculas, números y símbolos (!@#$%^&*, etc)'
        };
    }

    // 3. Dictionary/Common words
    const lowerPassword = password.toLowerCase();
    if (commonPasswords.some(common => lowerPassword.includes(common))) {
        return { isValid: false, message: 'La contraseña es demasiado común o fácil de adivinar' };
    }

    // 4. Personal Info (Dictionary-like check for user names/emails)
    if (context.email) {
        const emailLocalPart = context.email.split('@')[0].toLowerCase();
        if (emailLocalPart.length > 3 && lowerPassword.includes(emailLocalPart)) {
            return { isValid: false, message: 'La contraseña no debe contener partes de tu correo electrónico' };
        }
    }

    if (context.fullName) {
        const names = context.fullName.toLowerCase().split(' ').filter(n => n.length > 2);
        if (names.some(name => lowerPassword.includes(name))) {
            return { isValid: false, message: 'La contraseña no debe contener tu nombre' };
        }
    }

    return { isValid: true, message: 'Contraseña válida' };
};

module.exports = { validatePassword };
