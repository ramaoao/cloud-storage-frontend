import { API_USER_INFO } from "../../../../UrlConstants.jsx";
import UnauthorizedException from "../../../../exception/UnauthorizedException.jsx";
import apiClient from "../../../apiClient.js";

export const checkSession = async () => {
    if (import.meta.env.VITE_MOCK_FETCH_CALLS) {
        console.log("Имитация вызова для проверки сессии");
        return { username: "mocked_user" };
    }

    try {
        const response = await apiClient.get(API_USER_INFO);
        console.log("Проверка сессии прошла успешно");
        return response.data;
    } catch (error) {
        if (error.response) {
            console.log("Ошибка сессии, статус: " + error.response.status);
            // Специально для сессии прокидываем наше кастомное исключение
            throw new UnauthorizedException(error.response.data?.detail || "Unauthorized");
        }
        throw error;
    }
};