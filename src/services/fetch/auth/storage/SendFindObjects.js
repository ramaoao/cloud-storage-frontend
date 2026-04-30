import { API_FILES_SEARCH } from "../../../../UrlConstants.jsx";
import { throwSpecifyException } from "../../../../exception/ThrowSpecifyException.jsx";
import { mapToFrontFormat } from "../../../util/FormatMapper.js";
import apiClient from "../../../apiClient.js";

export const sendFindObjects = async (folderName = "", objectToFind) => {
    if (import.meta.env.VITE_MOCK_FETCH_CALLS) {
        console.log("Имитация вызова для поиска объектов");
        const mockedResponse = [
            {
                path: "",
                name: "mocked_file.txt",
                size: 100,
                type: "FILE"
            }
        ];
        return mockedResponse.map(ob => mapToFrontFormat(ob));
    }

    console.log("Запрос на поиск: " + objectToFind);

    try {
        const response = await apiClient.get(API_FILES_SEARCH, {
            params: { query: objectToFind }
        });

        const pageData = response.data;
        const searched = pageData.content;

        console.log("Найдено элементов на странице: " + searched.length);
        console.log("Всего в базе: " + pageData.totalElements);

        return searched.map(ob => mapToFrontFormat(ob));
    } catch (error) {
        if (error.response) {
            console.log("Ошибка со статусом: " + error.response.status);
            throwSpecifyException(error.response.status, error.response.data);
        }
        throw error;
    }
}