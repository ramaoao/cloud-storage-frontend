import { API_LOGOUT } from "../../../../UrlConstants.jsx";
import { throwSpecifyException } from "../../../../exception/ThrowSpecifyException.jsx";
import apiClient from "../../../apiClient.js";

export const sendLogout = async () => {
    if (import.meta.env.VITE_MOCK_FETCH_CALLS) {
        console.log("Имитация выхода из системы");
        return;
    }

    try {
        const response = await apiClient.post(API_LOGOUT);
        console.log("Выход выполнен успешно");
        return response.data;
    } catch (error) {
        if (error.response) {
            throwSpecifyException(error.response.status, error.response.data);
        }
        throw error;
    }
};