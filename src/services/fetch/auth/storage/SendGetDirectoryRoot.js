import { throwSpecifyException } from "../../../../exception/ThrowSpecifyException.jsx";
import { mapToFrontFormat } from "../../../util/FormatMapper.js";
import apiClient from "../../../apiClient.js";
import { API_DIRECTORY } from "../../../../UrlConstants.jsx";

/**
 * Получить содержимое корневой папки
 * @param {Object} params - параметры пагинации
 * @param {number} params.page - номер страницы (по умолчанию 0)
 * @param {number} params.size - размер страницы (по умолчанию 20)
 * @returns {Promise<Array>} массив ResourceInfoDto в формате фронтенда
 */
export const sendGetDirectoryRoot = async (params = {}) => {
    const { page = 0, size = 20 } = params;

    // Deduplicate concurrent calls (StrictMode/HMR/multiple subscribers)
    const key = `${page}:${size}`;
    if (!sendGetDirectoryRoot._inflight) {
        sendGetDirectoryRoot._inflight = new Map();
    }
    const inflight = sendGetDirectoryRoot._inflight;
    if (inflight.has(key)) {
        return inflight.get(key);
    }
    
    if (import.meta.env.VITE_MOCK_FETCH_CALLS) {
        console.log("Имитация вызова для получения корневой директории");
        const mockedResponse = [
            { 
                id: "00000000-0000-0000-0000-000000000001",
                parentId: null,
                name: "mocked_file.txt",
                size: 100,
                type: "FILE",
                updatedAt: new Date().toISOString()
            },
            { 
                id: "00000000-0000-0000-0000-000000000002",
                parentId: null,
                name: "mocked_folder",
                size: null,
                type: "DIRECTORY",
                updatedAt: new Date().toISOString()
            }
        ];
        return mockedResponse.map(ob => mapToFrontFormat(ob));
    }

    const verbose = import.meta.env.DEV && import.meta.env.VITE_VERBOSE_NETWORK_LOGS === "true";
    const now = Date.now();
    if (!sendGetDirectoryRoot._logState) {
        sendGetDirectoryRoot._logState = { key: null, at: 0 };
    }
    const logState = sendGetDirectoryRoot._logState;
    const shouldLogFetch = verbose || logState.key !== key || now - logState.at > 750;

    if (shouldLogFetch) {
        logState.key = key;
        logState.at = now;
        console.log("Получение содержимого корневой папки...");
    }

    const requestPromise = (async () => {
        try {
            const response = await apiClient.get(`${API_DIRECTORY}/root`, {
                params: { page, size }
            });

            const data = response.data;
            if (verbose) {
                console.log("Получены данные корневой папки:", data);
            } else if (shouldLogFetch) {
                const count = Array.isArray(data)
                    ? data.length
                    : Array.isArray(data?.content)
                      ? data.content.length
                      : 0;
                console.log(`Получены данные корневой папки: ${count} элементов`);
            }

            // Обработка Slice<ResourceInfoDto> - Spring Data возвращает объект с content, number, size, etc
            const items = Array.isArray(data) ? data : (data.content || []);

            const mappedItems = items.map(ob => mapToFrontFormat(ob));
            if (verbose) {
                console.log("Контент смаплен для фронтенда:", mappedItems);
            }

            return mappedItems;
        } catch (error) {
            if (error.response) {
                throwSpecifyException(error.response.status, error.response.data);
            }
            throw error;
        } finally {
            inflight.delete(key);
        }
    })();

    inflight.set(key, requestPromise);
    return requestPromise;
};
