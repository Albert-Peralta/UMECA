import api from './axios';

export const forgotPassword = (email) =>
    api.post('/auth/forgot-password', { email });

export const validateResetToken = (token) =>
    api.get(`/auth/validate-reset-token?token=${token}`);

export const resetPassword = (token, password) =>
    api.post('/auth/reset-password', { token, password });
