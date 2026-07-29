import api from './axios';

export const getExpedientes = (params) =>
    api.get('/expedientes-anteriores', { params });

export const getExpedienteById = (id) =>
    api.get(`/expedientes-anteriores/${id}`);

export const importarExpedientes = (lista) =>
    api.post('/expedientes-anteriores/importar', lista);

export const getLotes = () =>
    api.get('/expedientes-anteriores/lotes');

export const eliminarLote = (id) =>
    api.delete(`/expedientes-anteriores/lotes/${id}`);

export const importarExpedientesExcel = (archivo, zona) => {
    const form = new FormData();
    form.append('archivo', archivo);
    form.append('zona', zona);
    return api.post('/expedientes-anteriores/importar-excel', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const importarRegistroHistorico = (archivo, zona) => {
    const form = new FormData();
    form.append('archivo', archivo);
    if (zona) form.append('zona', zona);
    return api.post('/expedientes-anteriores/importar-registro-historico', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const importarSustraidos = (archivo) => {
    const form = new FormData();
    form.append('archivo', archivo);
    return api.post('/expedientes-anteriores/importar-sustraidos', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const importarBaseJojutla = (archivo) => {
    const form = new FormData();
    form.append('archivo', archivo);
    return api.post('/expedientes-anteriores/importar-base-jojutla', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const importarBaseCuautla = (archivo) => {
    const form = new FormData();
    form.append('archivo', archivo);
    return api.post('/expedientes-anteriores/importar-base-cuautla', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const importarInactivosXochi = (archivo) => {
    const form = new FormData();
    form.append('archivo', archivo);
    return api.post('/expedientes-anteriores/importar-inactivos-xochi', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};
