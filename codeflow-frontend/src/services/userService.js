import api from './api';

// FIX: Added a timestamp so the browser never caches your old XP score!
export const getDashboardStats = () => {
    return api.get(`/users/dashboard/stats?t=${new Date().getTime()}`);
};