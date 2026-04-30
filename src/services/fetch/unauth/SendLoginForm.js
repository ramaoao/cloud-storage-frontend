import { API_LOGIN } from "../../../UrlConstants.jsx";
import { throwSpecifyException } from "../../../exception/ThrowSpecifyException.jsx";
import apiClient from "../../apiClient.js";
import { logger } from "../../util/Logger.js";

export const sendLoginForm = async (loginData) => {
    if (import.meta.env.VITE_MOCK_FETCH_CALLS) {
        logger.log("Mocked fetch call for login");
        return { username: "mocked_user" };
    }

    logger.log("Login request for user");

    try {
        // Axios сам сделает JSON.stringify(loginData) и поставит Header: application/json
        const response = await apiClient.post(API_LOGIN, loginData);
        
        logger.log("Login response received");
        return response.data;
    } catch (error) {
        logger.error("Login request error:", error);
        if (error.response) {
            logger.error("Login error (Code: " + error.response.status + "):", error.response.data);
            throwSpecifyException(error.response.status, error.response.data);
        } else if (error.request) {
            logger.error("No response from server:", error.request);
        } else {
            logger.error("Request structure error:", error.message);
        }
        throw error;
    }
};