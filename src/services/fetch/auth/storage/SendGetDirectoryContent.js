import { throwSpecifyException } from "../../../../exception/ThrowSpecifyException.jsx";
import { mapToFrontFormat } from "../../../util/FormatMapper.js";
import apiClient from "../../../apiClient.js";
import { API_DIRECTORY } from "../../../../UrlConstants.jsx";

/**
 * Получить содержимое папки по ID
 * @param {string} folderId - UUID папки
 * @param {Object} params - параметры пагинации
 * @param {number} params.page - номер страницы (по умолчанию 0)
 * @param {number} params.size - размер страницы (по умолчанию 20)
 * @returns {Promise<Array>} массив ResourceInfoDto в формате фронтенда
 */
export const sendGetDirectoryContent = async (folderId, params = {}) => {
    if (!folderId) {
        throw new Error("folderId is required");
    }

    const { page = 0, size = 20 } = params;

    if (import.meta.env.VITE_MOCK_FETCH_CALLS) {
        console.log(`Имитация вызова для директории: ${folderId}`);
        const mockedResponse = [
            { 
                id: "00000000-0000-0000-0000-000000000010",
                parentId: folderId,
                name: "mocked_inner_file.txt",
                size: 150,
                type: "FILE",
                updatedAt: new Date().toISOString()
            }
        ];
        return mockedResponse.map(ob => mapToFrontFormat(ob));
    }

    console.log(`Получение содержимого папки: ${folderId}`);

    try {
        const response = await apiClient.get(`${API_DIRECTORY}/${folderId}`, {
            params: { page, size }
        });

        const data = response.data;
        console.log(`Получены данные папки ${folderId}:`, data);

        // Обработка Slice<ResourceInfoDto>
        const items = Array.isArray(data) ? data : (data.content || []);

        const mappedItems = items.map(ob => mapToFrontFormat(ob));
        console.log("Контент смаплен для фронтенда:", mappedItems);

        return mappedItems;
    } catch (error) {
        if (error.response) {
            throwSpecifyException(error.response.status, error.response.data);
        }
        throw error;
    }
};
