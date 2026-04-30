import { throwSpecifyException } from "../../../../exception/ThrowSpecifyException.jsx";
import apiClient from "../../../apiClient.js";
import { mapToFrontFormat } from "../../../util/FormatMapper.js";
import { API_FILES } from "../../../../UrlConstants.jsx";

/**
 * Переименовать ресурс
 * @param {string} resourceId - UUID ресурса
 * @param {string} newName - новое имя для ресурса
 * @returns {Promise<Object>} обновленные данные ресурса в формате фронтенда
 */
export const sendRenameResource = async (resourceId, newName) => {
    if (!resourceId) {
        throw new Error("resourceId is required");
    }

    if (!newName || newName.trim().length === 0) {
        throw new Error("newName is required and cannot be empty");
    }

    if (import.meta.env.VITE_MOCK_FETCH_CALLS) {
        console.log(`Имитация переименования ресурса: ${resourceId} на ${newName}`);
        return { id: resourceId, name: newName };
    }

    console.log(`Переименование ресурса ${resourceId} в ${newName}`);

    try {
        // Strip trailing slash from newName for backend
        let cleanName = newName.trim();
        if (cleanName.endsWith('/')) {
            cleanName = cleanName.slice(0, -1);
        }
        
        const request = {
            newName: cleanName
        };

        const response = await apiClient.put(
            `${API_FILES}/${resourceId}/rename`,
            request
        );

        const result = response.data;
        console.log(`Ресурс успешно переименован:`, result);

        return mapToFrontFormat(result);
    } catch (error) {
        if (error.response) {
            throwSpecifyException(error.response.status, error.response.data);
        }
        throw error;
    }
};
