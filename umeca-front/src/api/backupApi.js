import api from './axios';

export const exportarBackupZip = () =>
    api.get('/backup/exportar', { responseType: 'blob' });
