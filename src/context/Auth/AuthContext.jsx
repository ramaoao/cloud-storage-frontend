import React, {createContext, useContext, useEffect, useRef, useState} from "react";
import {checkSession} from "../../services/fetch/auth/user/CheckSession.js";
import {useLocation, useNavigate} from "react-router-dom";
import {useNotification} from "../Notification/NotificationProvider.jsx";
import {logger} from "../../services/util/Logger.js";

const AuthContext = createContext();

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider = ({children}) => {

    const [auth, setAuth] = useState({isAuthenticated: false, user: null});

    const login = (userInfo) => {
        // ✅ Security: Store only in memory state
        // Session is maintained via HttpOnly cookie from backend
        setAuth({isAuthenticated: true, user: userInfo});
    }

    const logout = () => {
        // ✅ Security: Clear from memory only
        // Cookie will be cleared by backend on logout endpoint
        setAuth({isAuthenticated: false, user: null});
    }


    const urlLocation = useLocation();
    const navigate = useNavigate();

    const {showError} = useNotification();
    const didInit = useRef(false);
    const inFlight = useRef(false);
    const lastValidateAtMs = useRef(0);

    const validateSession = async () => {
        if (auth.isAuthenticated) {
            try {
                if (inFlight.current) return;
                inFlight.current = true;
                const user = await checkSession();
                logger.log("Session validated successfully");
                if (user !== auth.user) {
                    login(user);
                }
            } catch (error) {
                logout();
                setTimeout(() => {
                    navigate("/login");
                    showError("Сессия истекла! Пожалуйста, войдите снова", 4000)
                }, 300)
            } finally {
                inFlight.current = false;
            }
        }
    };

    const validateCookieIsAlive = async () => {
        if (!auth.isAuthenticated) {
            try {
                if (inFlight.current) return;
                inFlight.current = true;
                const user = await checkSession();
                if (user) {
                    login(user);
                }
            } catch (error) {
                logger.log('Session not found - user not authenticated')
            } finally {
                inFlight.current = false;
            }
        }
    };

    useEffect(() => {
        if (!auth.isAuthenticated) return;
        const now = Date.now();
        if (now - lastValidateAtMs.current < 3000) return;
        lastValidateAtMs.current = now;
        validateSession();
    }, [urlLocation.pathname, auth.isAuthenticated]);


    useEffect(() => {
        // React.StrictMode dev double-invokes mount effects.
        if (didInit.current) return;
        didInit.current = true;

        // ✅ Security: On cold start, validate session from backend cookie
        // Don't rely on localStorage for authentication
        validateCookieIsAlive();
    }, []);


    return (
        <AuthContext.Provider value={{auth, login, logout}}>
            {children}
        </AuthContext.Provider>
    );
};