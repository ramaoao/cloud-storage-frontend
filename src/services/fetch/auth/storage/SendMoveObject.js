import { API_MOVE_FILES } from "../../../../UrlConstants.jsx";
import { throwSpecifyException } from "../../../../exception/ThrowSpecifyException.jsx";
import apiClient from "../../../apiClient.js";

export const sendMoveObject = async (source, target) => {
    if (import.meta.env.VITE_MOCK_FETCH_CALLS) {
        console.log("Имитация вызова для перемещения объекта");
        return;
    }

    console.log(`Инициация перемещения: ${source} --> ${target}`);

    try {
        const response = await apiClient.post(API_MOVE_FILES, null, {
            params: { 
                from: source, 
                to: target 
            }
        });

        console.log("Объект успешно перемещен:", response.data);
        return response.data;
    } catch (error) {
        if (error.response) {
            console.error(`Ошибка перемещения [${error.response.status}]:`, error.response.data);
            throwSpecifyException(error.response.status, error.response.data);
        } else {
            console.error("Сетевая ошибка при перемещении объекта:", error.message);
        }
        throw error;
    }
}