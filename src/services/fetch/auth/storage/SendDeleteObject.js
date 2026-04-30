import { API_FILES } from "../../../../UrlConstants.jsx";
import { throwSpecifyException } from "../../../../exception/ThrowSpecifyException.jsx";
import apiClient from "../../../apiClient.js";

export const sendDeleteObject = async (objectName) => {
    if (import.meta.env.VITE_MOCK_FETCH_CALLS) {
        console.log("Имитация вызова для удаления объекта");
        return;
    }

    console.log("Удаляем объект: " + objectName);

    try {
        const response = await apiClient.delete(API_FILES, {
            params: { path: objectName }
        });

        console.log("Ответ: ", response.data);
    } catch (error) {
        if (error.response) {
            throwSpecifyException(error.response.status, error.response.data);
        }
        throw error;
    }
}