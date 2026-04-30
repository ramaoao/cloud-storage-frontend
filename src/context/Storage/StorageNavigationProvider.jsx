import React, {createContext, useContext, useState, useEffect, useRef} from "react";
import {sendGetDirectoryRoot} from "../../services/fetch/auth/storage/SendGetDirectoryRoot.js";
import {sendGetDirectoryContent} from "../../services/fetch/auth/storage/SendGetDirectoryContent.js";
import {useStorageSelection} from "./StorageSelectionProvider.jsx";
import {useAuthContext} from "../Auth/AuthContext.jsx";
import ConflictException from "../../exception/ConflictException.jsx";
import NotFoundException from "../../exception/NotFoundException.jsx";
import BadRequestException from "../../exception/BadRequestException.jsx";
import {useNotification} from "../Notification/NotificationProvider.jsx";
import {useNavigate} from "react-router-dom";
import {isValidUuid} from "../../services/util/UuidValidator.js";

const CloudStorageContext = createContext();

export const useStorageNavigation = () => useContext(CloudStorageContext);

/**
 * ID-based Storage Navigation Provider
 * 
 * Enterprise-grade tree-based navigation with:
 * - UUID validation
 * - Breadcrumb tracking
 * - Error recovery
 * - Type-safe folder operations
 */
export const StorageNavigationProvider = ({children}) => {
    const {setSelectedIds} = useStorageSelection();
    const {auth} = useAuthContext();
    const {showWarn, showError} = useNotification();
    const navigate = useNavigate();
    const rootLoadStarted = useRef(false);
    const rootLoadInFlight = useRef(false);

    // ID-based навигация по дереву
    const [folderContentLoading, setFolderContentLoading] = useState(false);
    const [currentFolderId, setCurrentFolderId] = useState(null); // null = root folder
    const [folderContent, setFolderContent] = useState([]);
    
    // Breadcrumb path - содержит информацию о пути до текущей папки
    // Каждый элемент: {id, name}
    const [breadcrumbs, setBreadcrumbs] = useState([]);
    const [searchedContent, setSearchedContent] = useState([]);
    const [searchName, setSearchName] = useState("");
    
    const isRootFolder = currentFolderId === null;
    const isSearchMode = searchedContent.length > 0;

    /**
     * Load root folder content
     */
    const loadRootFolder = async () => {
        if (rootLoadInFlight.current) return;
        setSelectedIds([]);
        setFolderContentLoading(true);
        rootLoadInFlight.current = true;
        try {
            const content = await sendGetDirectoryRoot();
            setFolderContent(content);
            setCurrentFolderId(null);
            setBreadcrumbs([]);
            
            const base = import.meta.env.VITE_BASE || "/";
            window.history.replaceState(null, "", base + 'files/');
        } catch (error) {
            handleNavigationError(error);
        } finally {
            setFolderContentLoading(false);
            rootLoadInFlight.current = false;
        }
    };

    /**
     * Load folder content by UUID
     * @param {string} folderId - UUID папки
     * @param {Object} folderInfo - информация о папке {id, name} для breadcrumbs
     */
    const loadFolderById = async (folderId, folderInfo = null) => {
        // Validate folder ID
        if (!folderId) {
            await loadRootFolder();
            return;
        }

        if (!isValidUuid(folderId)) {
            showError("Неверный ID папки");
            await loadRootFolder();
            return;
        }

        setSelectedIds([]);
        setFolderContentLoading(true);
        try {
            const content = await sendGetDirectoryContent(folderId);
            setFolderContent(content);
            setCurrentFolderId(folderId);
            
            // Update breadcrumbs if folder info provided
            if (folderInfo && folderInfo.name) {
                setBreadcrumbs(prev => [...prev, {id: folderId, name: folderInfo.name}]);
            }
            
            const base = import.meta.env.VITE_BASE || "/";
            window.history.replaceState(null, "", base + `files/${folderId}`);
        } catch (error) {
            handleNavigationError(error);
        } finally {
            setFolderContentLoading(false);
        }
    };

    /**
     * Navigate to folder object
     * @param {Object} folderObject - папка с {id, name, type, ...}
     */
    const goToFolder = async (folderObject) => {
        if (!folderObject || !folderObject.id) {
            showError("Объект не содержит ID");
            return;
        }

        // Check that object is a directory
        if (folderObject.type !== "DIRECTORY") {
            showError("Это не папка");
            return;
        }

        // Validate UUID
        if (!isValidUuid(folderObject.id)) {
            showError("Неверный ID папки");
            return;
        }

        await loadFolderById(folderObject.id, {name: folderObject.name});
    };

    /**
     * Navigate to breadcrumb (folder in the path)
     * @param {number} breadcrumbIndex - index in breadcrumbs array
     */
    const goToBreadcrumb = async (breadcrumbIndex) => {
        if (breadcrumbIndex < 0 || breadcrumbIndex >= breadcrumbs.length) {
            await loadRootFolder();
            return;
        }

        const targetBreadcrumb = breadcrumbs[breadcrumbIndex];
        
        // Validate breadcrumb ID
        if (!isValidUuid(targetBreadcrumb.id)) {
            showError("Неверный ID в пути навигации");
            await loadRootFolder();
            return;
        }

        const updatedBreadcrumbs = breadcrumbs.slice(0, breadcrumbIndex + 1);
        
        setSelectedIds([]);
        setFolderContentLoading(true);
        try {
            const content = await sendGetDirectoryContent(targetBreadcrumb.id);
            setFolderContent(content);
            setCurrentFolderId(targetBreadcrumb.id);
            setBreadcrumbs(updatedBreadcrumbs);
            
            const base = import.meta.env.VITE_BASE || "/";
            window.history.replaceState(null, "", base + `files/${targetBreadcrumb.id}`);
        } catch (error) {
            handleNavigationError(error);
        } finally {
            setFolderContentLoading(false);
        }
    };

    /**
     * Navigate to parent folder (back button)
     */
    const goToPrevFolder = async () => {
        if (breadcrumbs.length === 0) {
            // Already in root
            return;
        }
        
        // Navigate to previous breadcrumb
        const prevIndex = breadcrumbs.length - 2;
        if (prevIndex < 0) {
            await loadRootFolder();
        } else {
            await goToBreadcrumb(prevIndex);
        }
    };

    /**
     * Handle navigation errors
     */
    const handleNavigationError = (error) => {
        console.error('Ошибка навигации:', error);
        
        switch (true) {
            case error instanceof ConflictException:
            case error instanceof NotFoundException:
            case error instanceof BadRequestException:
                navigate("/files");
                showWarn(error.message);
                break;
            default:
                console.error("Неожиданная ошибка при загрузке папки:", error);
                showError("Произошла ошибка. Пожалуйста, попробуйте позже.");
        }
    };

    /**
     * Add new object to folder content (e.g., after folder creation)
     */
    const createSpoofObject = (object) => {
        if (!object || !object.id) {
            console.warn("Неверный объект для создания копии", object);
            return;
        }
        setFolderContent([...folderContent, object]);
    };

    /**
     * Load folder by path or ID (universal method)
     * @param {string} folderPath - empty string for root, UUID for specific folder, or encoded path
     */
    const loadFolder = async (folderPath) => {
        // Handle root folder (empty string or similar)
        if (!folderPath || folderPath === "" || folderPath === "/") {
            await loadRootFolder();
            return;
        }

        // Try to treat as UUID
        if (isValidUuid(folderPath)) {
            await loadFolderById(folderPath);
            return;
        }

        // If it's not a valid UUID and not empty, load root and show warning
        console.warn("Предоставлен неверный путь папки:", folderPath);
        await loadRootFolder();
    };

    /**
     * Get object by ID from current folder content or search results
     */
    const getObjectById = (id) => {
        if (!id || !isValidUuid(id)) {
            console.warn("Неверный ID для поиска объекта", id);
            return null;
        }
        
        // In search mode, search in searchedContent first
        if (isSearchMode && searchedContent.length > 0) {
            const foundInSearch = searchedContent.find(obj => obj.id === id);
            if (foundInSearch) {
                return foundInSearch;
            }
        }
        
        // Otherwise search in folderContent
        return folderContent.find(obj => obj.id === id) || null;
    };

    // Initialize - load root on first render only if authenticated
    useEffect(() => {
        // Only load root folder if user is authenticated
        if (!auth.isAuthenticated) {
            rootLoadStarted.current = false;
            return;
        }

        // React.StrictMode dev double-invokes effects; avoid duplicate root loads.
        if (rootLoadStarted.current) return;
        rootLoadStarted.current = true;

        loadRootFolder();
    }, [auth.isAuthenticated]);

    return (
        <CloudStorageContext.Provider
            value={{
                // State
                folderContentLoading,
                folderContent,
                currentFolderId,
                isRootFolder,
                breadcrumbs,
                searchedContent,
                isSearchMode,
                searchName,
                
                // Navigation functions
                loadRootFolder,
                loadFolderById,
                loadFolder,
                goToFolder,
                goToBreadcrumb,
                goToPrevFolder,
                
                // Utilities
                createSpoofObject,
                getObjectById,
                setSearchedContent,
                setSearchName
            }}
        >
            {children}
        </CloudStorageContext.Provider>
    );
};
