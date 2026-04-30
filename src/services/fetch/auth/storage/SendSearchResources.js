import { throwSpecifyException } from "../../../../exception/ThrowSpecifyException.jsx";
import { mapToFrontFormat } from "../../../util/FormatMapper.js";
import apiClient from "../../../apiClient.js";
import { API_FILES_SEARCH } from "../../../../UrlConstants.jsx";

/**
 * Поиск ресурсов по названию
 * @param {string} query - поисковой запрос
 * @param {Object} params - параметры пагинации
 * @param {number} params.page - номер страницы (по умолчанию 0)
 * @param {number} params.size - размер страницы (по умолчанию 20)
 * @returns {Promise<Array>} массив найденных ресурсов в формате фронтенда
 */
export const sendSearchResources = async (query, params = {}) => {
    if (!query || query.trim().length === 0) {
        throw new Error("query is required and cannot be empty");
    }

    const { page = 0, size = 20 } = params;

    if (import.meta.env.VITE_MOCK_FETCH_CALLS) {
        console.log(`Имитация поиска на: ${query}`);
        return [];
    }

    console.log(`Поиск ресурсов по запросу: ${query}`);

    try {
        const response = await apiClient.get(`${API_FILES_SEARCH}`, {
            params: { 
                query: query.trim(), 
                page, 
                size 
            }
        });

        const data = response.data;
        console.log(`Получены результаты поиска для запроса "${query}":`, data);

        // Обработка Slice<ResourceInfoDto>
        const items = Array.isArray(data) ? data : (data.content || []);

        const mappedItems = items.map(ob => mapToFrontFormat(ob));
        console.log("Результаты смаплены для фронтенда:", mappedItems);

        return mappedItems;
    } catch (error) {
        if (error.response) {
            throwSpecifyException(error.response.status, error.response.data);
        }
        throw error;
    }
};
