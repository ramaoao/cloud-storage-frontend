import { API_REGISTRATION } from "../../../UrlConstants.jsx";
import { throwSpecifyException } from "../../../exception/ThrowSpecifyException.jsx";
import apiClient from "../../apiClient.js";

export const sendRegistrationForm = async (registrationData) => {
    if (import.meta.env.VITE_MOCK_FETCH_CALLS) {
        console.log("Имитация вызова для регистрации");
        return { username: "mocked_user" };
    }

    console.log("Запрос на регистрацию нового пользователя");

    try {
        const response = await apiClient.post(API_REGISTRATION, registrationData);
        
        console.log("Регистрация прошла успешно");
        return response.data;
    } catch (error) {
        if (error.response) {
            console.log("Ошибка регистрации, статус: " + error.response.status);
            throwSpecifyException(error.response.status, error.response.data);
        }
        throw error;
    }
};