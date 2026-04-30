import { throwSpecifyException } from "../../../../exception/ThrowSpecifyException.jsx";
import apiClient from "../../../apiClient.js";
import { API_FILES } from "../../../../UrlConstants.jsx";

/**
 * Инициировать загрузку файлов и получить presigned URLs
 * @param {string|null} parentId - UUID родительской папки (null для root)
 * @param {Array<{name: string, size: number, relativePath?: string|null}>} files - массив файлов для загрузки
 * @returns {Promise<Array<{name: string, objectKey: string, presignedUrl: string}>>}
 *          массив с presigned URLs для загрузки
 */
export const sendUploadInit = async (parentId, files) => {
    if (!files || files.length === 0) {
        throw new Error("files array is required and cannot be empty");
    }

    if (import.meta.env.VITE_MOCK_FETCH_CALLS) {
        console.log("Имитация инициализации загрузки");
        return files.map((file) => ({
            name: file.name,
            objectKey: "00000000-0000-0000-0000-000000000000",
            presignedUrl: "https://minio.example.com/mock-presigned-url",
        }));
    }

    const verbose = import.meta.env.DEV && import.meta.env.VITE_VERBOSE_NETWORK_LOGS === "true";
    console.log(`Инициализация загрузки ${files.length} файлов в папку ${parentId || "root"}`);

    try {
        const uploadRequests = files.map((file) => ({
            name: file.name,
            relativePath: file.relativePath ?? null,
            size: file.size,
        }));

        const params = {};
        if (parentId) {
            params.parentId = parentId;
        }

        const response = await apiClient.post(`${API_FILES}/upload/init`, uploadRequests, { params });

        const uploadResponsesRaw = response.data;
        // Backend contract tolerance: some backends return `persignedUrl` (typo).
        const uploadResponses = Array.isArray(uploadResponsesRaw)
            ? uploadResponsesRaw.map((r) => ({
                  ...r,
                  presignedUrl: r?.presignedUrl ?? r?.persignedUrl,
              }))
            : uploadResponsesRaw;

        const count = Array.isArray(uploadResponses) ? uploadResponses.length : 0;
        console.log(`Получены presigned URLs: ${count} шт.`);
        if (verbose && Array.isArray(uploadResponses)) {
            console.log("Presigned URLs (verbose):", uploadResponses);
        }

        return uploadResponses;
    } catch (error) {
        if (error.response) {
            throwSpecifyException(error.response.status, error.response.data);
        }
        throw error;
    }
};
