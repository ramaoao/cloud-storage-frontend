import { throwSpecifyException } from "../../../../exception/ThrowSpecifyException.jsx";
import apiClient from "../../../apiClient.js";
import { mapToFrontFormat } from "../../../util/FormatMapper.js";
import { API_FILES } from "../../../../UrlConstants.jsx";

/**
 * Переместить ресурс в другую папку
 * @param {string} resourceId - UUID ресурса который перемещаем
 * @param {string|null} targetFolderId - UUID целевой папки (null для root)
 * @returns {Promise<Object>} обновленные данные ресурса в формате фронтенда
 */
export const sendMoveResource = async (resourceId, targetFolderId) => {
    if (!resourceId) {
        throw new Error("resourceId is required");
    }

    if (import.meta.env.VITE_MOCK_FETCH_CALLS) {
        console.log(`Имитация перемещения ресурса: ${resourceId} в папку: ${targetFolderId || 'root'}`);
        return { id: resourceId, parentId: targetFolderId };
    }

    console.log(`Перемещение ресурса ${resourceId} в папку ${targetFolderId || 'root'}`);

    try {
        const request = {
            targetFolderId: targetFolderId
        };

        const response = await apiClient.put(
            `${API_FILES}/${resourceId}/move`,
            request
        );

        const result = response.data;
        console.log(`Ресурс успешно перемещен:`, result);

        return mapToFrontFormat(result);
    } catch (error) {
        if (error.response) {
            throwSpecifyException(error.response.status, error.response.data);
        }
        throw error;
    }
};
