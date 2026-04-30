import { API_DIRECTORY } from "../../../../UrlConstants.jsx";
import { throwSpecifyException } from "../../../../exception/ThrowSpecifyException.jsx";
import { mapToFrontFormat } from "../../../util/FormatMapper.js";
import apiClient from "../../../apiClient.js";

export const sendGetFolderContent = async (folderName = "") => {
    if (import.meta.env.VITE_MOCK_FETCH_CALLS) {
        console.log("Имитация вызова для получения содержимого папки");

        let mockedResponse = [];
        if (folderName === "") {
            mockedResponse = [
                { path: "", name: "mocked_file.txt", size: 100, type: "FILE" },
                { path: "", name: "mocked_folder1/", type: "DIRECTORY" }
            ];
        } else {
            mockedResponse = [
                { path: "", name: "mocked_inner_file.txt", size: 100, type: "FILE" }
            ];
        }

        return mockedResponse.map(ob => mapToFrontFormat(ob));
    }

    console.log("Запрос на содержимое папки: " + folderName);

    try {
        const response = await apiClient.get(API_DIRECTORY, {
            params: { path: folderName }
        });

        const directory = response.data;
        console.log("Получен контент из папки: " + folderName, directory);

        // Ответ может быть либо массивом объектов, либо страницей Spring (object с полем content)
        const items = Array.isArray(directory) ? directory : (directory.content || []);

        const oldDir = items.map(ob => mapToFrontFormat(ob));
        console.log("Контент смаплен для формата фронтенда: ", oldDir);

        return oldDir;
    } catch (error) {
        if (error.response) {
            throwSpecifyException(error.response.status, error.response.data);
        }
        throw error; // Проброс ошибки, если проблема с сетью
    }
}