import { throwSpecifyException } from "../../../../exception/ThrowSpecifyException.jsx";
import apiClient from "../../../apiClient.js";
import { API_FILES } from "../../../../UrlConstants.jsx";

/**
 * Подтвердить загрузку файлов после их загрузки в MinIO
 * @param {Array<string>} objectKeys - массив objectKey (UUID) файлов которые загружены в MinIO
 * @returns {Promise<void>}
 */
export const sendUploadConfirm = async (objectKeys) => {
    if (!objectKeys || objectKeys.length === 0) {
        throw new Error("objectKeys array is required and cannot be empty");
    }

    if (import.meta.env.VITE_MOCK_FETCH_CALLS) {
        console.log("Имитация подтверждения загружки");
        return;
    }

    console.log(`Подтверждение загрузки ${objectKeys.length} файлов...`);

    try {
        const confirmRequests = objectKeys.map(objectKey => ({
            objectKey: objectKey
        }));

        await apiClient.post(
            `${API_FILES}/upload/confirm`,
            confirmRequests
        );

        console.log("Загрузка подтверждена успешно");
    } catch (error) {
        if (error.response) {
            throwSpecifyException(error.response.status, error.response.data);
        }
        throw error;
    }
};
