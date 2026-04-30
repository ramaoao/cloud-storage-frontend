import { API_FILES } from "../../../../UrlConstants.jsx";
import { throwSpecifyException } from "../../../../exception/ThrowSpecifyException.jsx";
import apiClient from "../../../apiClient.js";

export const sendGetObjectStats = async (object = "") => {
    if (import.meta.env.VITE_MOCK_FETCH_CALLS) {
        console.log("Имитация вызова для получения статистики объекта");
        return {
            path: "/",
            name: "mocked_file.txt",
            size: 100,
            type: "FILE"
        };
    }

    try {
        const response = await apiClient.get(API_FILES, {
            params: { path: object }
        });

        return response.data;
    } catch (error) {
        if (error.response) {
            throwSpecifyException(error.response.status, error.response.data);
        }
        throw error;
    }
}