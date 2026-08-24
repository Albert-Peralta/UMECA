/**
 * Utilería para verificar permisos de módulo en el frontend.
 *
 * Cada página comprueba si el usuario puede ver/crear/editar un módulo
 * basándose en:
 *  1. Su rol (acceso base definido por ACCESO_BASE_ROL)
 *  2. Sus módulos extra (almacenados en user.modulosExtra tras el login)
 */

/**
 * Roles con acceso completo a todos los módulos (sin restricciones).
 */
const ROLES_SUPERADMIN = ['SUPERADMIN', 'ADMINISTRADOR'];

/**
 * Acceso base por rol y módulo.
 * 'completo' = puede Ver + Crear + Editar
 * 'lectura'  = solo puede Ver
 *  undefined  = sin acceso por rol (puede tenerlo por módulo extra)
 */
const ACCESO_BASE_ROL = {
    SUPERVISION: {
        ENTREVISTA: 'completo', MEDIDAS: 'completo', SUPERVISION: 'completo',
        EVALUACION: 'lectura',  CONSULTAS: 'lectura',
        CORRESPONDENCIA: 'completo', CONTROL_OFICIOS: 'completo',
        ESTADISTICAS: 'lectura', EXPEDIENTES: 'lectura',
    },
    EVALUADOR_RIESGO: {
        ENTREVISTA: 'completo', MEDIDAS: 'lectura', SUPERVISION: 'completo',
        EVALUACION: 'completo', CONSULTAS: 'completo', SUSPENSION: 'completo',
        CORRESPONDENCIA: 'completo', CONTROL_OFICIOS: 'completo', EXPEDIENTES: 'completo',
    },
    CORRESPONDENCIA: {
        ENTREVISTA: 'completo', CORRESPONDENCIA: 'completo',
        CONTROL_OFICIOS: 'completo', ESTADISTICAS: 'lectura',
    },
};

/**
 * ¿Puede el usuario VER este módulo?
 */
export const puedeVer = (user, modulo) => {
    if (!user) return false;
    if (ROLES_SUPERADMIN.includes(user.rol)) return true;
    const base = ACCESO_BASE_ROL[user.rol]?.[modulo];
    if (base === 'completo' || base === 'lectura') return true;
    // Verificar módulos extra
    const extra = user.modulosExtra?.find(m => m.modulo === modulo);
    return !!(extra?.puedeVer);
};

/**
 * ¿Puede el usuario CREAR en este módulo?
 */
export const puedeCrear = (user, modulo) => {
    if (!user) return false;
    if (ROLES_SUPERADMIN.includes(user.rol)) return true;
    const base = ACCESO_BASE_ROL[user.rol]?.[modulo];
    if (base === 'completo') return true;
    // Verificar módulos extra (permiso explícito de crear)
    const extra = user.modulosExtra?.find(m => m.modulo === modulo);
    return !!(extra?.puedeCrear);
};

/**
 * ¿Puede el usuario EDITAR en este módulo?
 */
export const puedeEditar = (user, modulo) => {
    if (!user) return false;
    if (ROLES_SUPERADMIN.includes(user.rol)) return true;
    const base = ACCESO_BASE_ROL[user.rol]?.[modulo];
    if (base === 'completo') return true;
    // Verificar módulos extra (permiso explícito de editar)
    const extra = user.modulosExtra?.find(m => m.modulo === modulo);
    return !!(extra?.puedeEditar);
};
