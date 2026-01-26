/**
 * Centralized role constants to avoid magic strings across the app
 */
export const ROLES = {
  ADMIN: 'ADMIN',
  PASTOR: 'PASTOR',
  LIDER_DOCE: 'LIDER_DOCE',
  LIDER_CELULA: 'LIDER_CELULA',
  DISCIPULO: 'DISCIPULO',
  SUPER_ADMIN: 'SUPER_ADMIN', // For legacy/compatibility if needed
};

/**
 * Helper arrays for role groups
 */
export const ROLE_GROUPS = {
  ALL_LEADERS: [ROLES.ADMIN, ROLES.PASTOR, ROLES.LIDER_DOCE, ROLES.LIDER_CELULA],
  CAN_MANAGE_USERS: [ROLES.ADMIN, ROLES.PASTOR, ROLES.LIDER_DOCE],
  CAN_VIEW_STATS: [ROLES.ADMIN, ROLES.PASTOR, ROLES.LIDER_DOCE],
  CAN_MANAGE_CELLS: [ROLES.ADMIN, ROLES.PASTOR, ROLES.LIDER_DOCE],
  CAN_MANAGE_GOALS: [ROLES.ADMIN, ROLES.PASTOR, ROLES.LIDER_DOCE],
};

/**
 * Role display names for UI
 */
export const ROLE_DISPLAY_NAMES = {
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.PASTOR]: 'Pastor',
  [ROLES.LIDER_DOCE]: 'Líder de 12',
  [ROLES.LIDER_CELULA]: 'Líder de Célula',
  [ROLES.DISCIPULO]: 'Discípulo',
  [ROLES.SUPER_ADMIN]: 'Super Administrador',
};
