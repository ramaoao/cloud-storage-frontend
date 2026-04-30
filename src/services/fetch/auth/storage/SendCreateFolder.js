import { API_DIRECTORY } from "../../../../UrlConstants.jsx";
import { throwSpecifyException } from "../../../../exception/ThrowSpecifyException.jsx";
import apiClient from "../../../apiClient.js";

/**
 * Создать папку (UUID-based API)
 * Backend: POST /api/directory?parentId=<uuid|null> body: { name: string }
 */
export const sendCreateFolder = async (name, parentId = null) => {
    if (import.meta.env.VITE_MOCK_FETCH_CALLS) {
        console.log("Имитация вызова для создания папки");
        return;
    }

    console.log("Запрос на создание папки: " + name);

    try {
        const params = {};
        if (parentId) params.parentId = parentId;

        const response = await apiClient.post(
            API_DIRECTORY,
            { name },
            { params }
        );

        console.log("Ответ на создание папки: ");
        console.log(response.data);
        
        return response.data;
    } catch (error) {
        if (error.response) {
            console.log("Ошибка со статусом: " + error.response.status);
            console.log(error.response.data);
            throwSpecifyException(error.response.status, error.response.data);
        }
        throw error;
    }
}