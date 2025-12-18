/**
 * Constants for Discipleship School levels as requested by the user.
 */

const SCHOOL_LEVELS = [
    { nivel: '1', seccion: 'A', name: 'Pastoreados en su amor', moduleNumber: 1, code: 'N1A' },
    { nivel: '1', seccion: 'B', name: 'El poder de una Vision', moduleNumber: 2, code: 'N1B' },
    { nivel: '2', seccion: 'A', name: 'La estrategia del Ganar', moduleNumber: 3, code: 'N2A' },
    { nivel: '2', seccion: 'B', name: 'Familias con Proposito', moduleNumber: 4, code: 'N2B' },
    { nivel: '3', seccion: 'A', name: 'Liderazgo Eficaz', moduleNumber: 5, code: 'N3A' },
    { nivel: '3', seccion: 'B', name: 'El Espiritu Santo en Mi', moduleNumber: 6, code: 'N3B' }
];

const getLevelByCode = (code) => SCHOOL_LEVELS.find(l => l.code === code);
const getLevelByModuleNumber = (num) => SCHOOL_LEVELS.find(l => l.moduleNumber === num);

module.exports = {
    SCHOOL_LEVELS,
    getLevelByCode,
    getLevelByModuleNumber
};
