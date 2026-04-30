import { throwSpecifyException } from "../../../../exception/ThrowSpecifyException.jsx";
import apiClient from "../../../apiClient.js";
import { API_FILES } from "../../../../UrlConstants.jsx";

/**
 * Удалить ресурс по ID
 * @param {string} resourceId - UUID ресурса
 * @returns {Promise<void>}
 */
export const sendDeleteResource = async (resourceId) => {
    if (!resourceId) {
        throw new Error("resourceId is required");
    }

    if (import.meta.env.VITE_MOCK_FETCH_CALLS) {
        console.log(`Имитация удаления ресурса: ${resourceId}`);
        return;
    }

    console.log(`Удаление ресурса: ${resourceId}`);

    try {
        await apiClient.delete(`${API_FILES}/${resourceId}`);
        console.log(`Ресурс ${resourceId} успешно удален`);
    } catch (error) {
        if (error.response) {
            throwSpecifyException(error.response.status, error.response.data);
        }
        throw error;
    }
};
