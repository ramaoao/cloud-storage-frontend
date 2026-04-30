import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { sendDeleteResource } from "../../services/fetch/auth/storage/SendDeleteResource.js";
import { useStorageNavigation } from "../Storage/StorageNavigationProvider.jsx";
import { sendMoveResource } from "../../services/fetch/auth/storage/SendMoveResource.js";
import { sendRenameResource } from "../../services/fetch/auth/storage/SendRenameResource.js";
import { sendUpload } from "../../services/fetch/auth/storage/SendUploadFIle.js";
import { sendDownloadFile } from "../../services/fetch/auth/storage/SendDownloadFIle.js";
import { sendFindObjects } from "../../services/fetch/auth/storage/SendFindObjects.js";
import { useStorageSelection } from "../Storage/StorageSelectionProvider.jsx";
import { nanoid } from 'nanoid';
import { useNotification } from "../Notification/NotificationProvider.jsx";
import StorageExceedException from "../../exception/StorageExceedException.jsx";
import RenameModal from "../../modals/FileChange/RenameModal.jsx";
import { normalizeAndValidateUuid } from "../../services/util/UuidValidator.js";
import { extractSimpleName } from "../../services/util/Utils.js";

/** Понятное сообщение при сбоях бэкенда / «технических» исключениях в UI задач */
const FRIENDLY_SERVER_NOTICE =
    "Сервис временно недоступен. Мы уже знаем об ошибке и работаем над исправлением — попробуйте позже.";

function humanizeOperationError(error, kind) {
    const msg = String(error?.message ?? "");
    if (/errorText is not defined|ReferenceError|\bis not defined\b/i.test(msg)) {
        return kind === "download"
            ? "Не удалось скачать: ответ сервера обработан некорректно. Ошибка на нашей стороне — мы её исправим, попробуйте позже."
            : FRIENDLY_SERVER_NOTICE;
    }
    if (/something went wrong|unknown error/i.test(msg) || /\bHTTP 5\d\d\b/i.test(msg)) {
        return FRIENDLY_SERVER_NOTICE;
    }
    if (msg.length > 200) {
        return `${msg.slice(0, 199)}…`;
    }
    return msg || FRIENDLY_SERVER_NOTICE;
}

function uploadDisplayName(fileItems) {
    if (!fileItems?.length) {
        return "Загрузка";
    }
    const first = fileItems[0];
    const file = first.file;
    
    // Try to get relative path first to check for folder uploads (even single file uploads)
    const rel = first?.relativePath || file?.webkitRelativePath;
    if (typeof rel === "string" && rel.length > 0) {
        const root = rel.replaceAll("\\", "/").split("/").filter(Boolean)[0];
        if (root) {
            return root;
        }
    }
    
    // Fallback: if no relative path with folder structure, use file name for single files
    if (fileItems.length === 1) {
        return file?.name || "Файл";
    }
    return file?.name || "Файлы";
}

function uploadCountLabel(count) {
    const n = Number(count) || 0;
    const mod10 = n % 10;
    const mod100 = n % 100;
    let word = "файлов";
    if (mod10 === 1 && mod100 !== 11) {
        word = "файл";
    } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
        word = "файла";
    }
    return `Загрузка (${n} ${word})`;
}

const FileOperationsContext = createContext();

function deleteCountLabel(count) {
    const n = Number(count) || 0;
    const mod10 = n % 10;
    const mod100 = n % 100;
    let word = "объектов";
    if (mod10 === 1 && mod100 !== 11) {
        word = "объект";
    } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
        word = "объекта";
    }
    return `Удаление (${n} ${word})`;
}

export const useStorageOperations = () => {
    const ctx = useContext(FileOperationsContext);
    if (ctx) return ctx;

    if (import.meta.env.DEV) {
        console.error("useStorageOperations используется вне FileOperationsProvider");
    }

    const noop = () => {};
    return {
        tasks: [],
        newTasksAdded: false,
        setNewTasksAdded: noop,
        deleteTask: noop,
        clearTasks: noop,
        allTasksCompleted: () => true,
        deleteObject: noop,
        moveObjects: noop,
        pasteObjects: noop,
        downloadObjects: noop,
        renameObject: noop,
        uploadObjects: noop,
    };
};

/**
 * Провайдер файловых операций - управляет всеми файловыми операциями в структуре дерева на основе ID
 * 
 * Реализация уровня Enterprise с:
 * - Валидацией и нормализацией UUID
 * - Правильной обработкой ошибок
 * - Отслеживанием прогресса
 * - Обнаружением конфликтов
 * 
 * Поддерживаемые операции:
 * - Загрузка (поток с предписанными URL)
 * - Скачивание (один файл или директория как ZIP)
 * - Удаление
 * - Перемещение
 * - Переименование
 */
export const FileOperationsProvider = ({ children }) => {
    const { loadFolderById, currentFolderId, getObjectById, folderContent, loadRootFolder, isSearchMode, searchName, setSearchedContent } = useStorageNavigation();
    const { isCutMode, bufferIds, bufferMetadata, endCopying, endCutting } = useStorageSelection();
    const { showError } = useNotification();

    const [tasks, setTasks] = useState([]);
    const [newTasksAdded, setNewTasksAdded] = useState(false);
    const [nameConflict, setNameConflict] = useState(false);
    const [conflictedIds, setConflictedIds] = useState([]);
    const [taskRunning, setTaskRunning] = useState(false);
    const lastReloadSignatureRef = useRef("");
    const prevTaskRunningRef = useRef(false);

    /**
     * Проверить, существует ли имя файла в текущей папке
     */
    const nameAlreadyExists = (name) => {
        return folderContent.some(obj => obj.name === name);
    };

    /**
     * Проверить конфликты имён с предоставленными ID
     */
    const checkConflicts = (ids, metadataMap) => {
        if (ids.length === 1) {
            let resourceName;
            
            // Try to get name from object first
            const resource = getObjectById(ids[0]);
            if (resource) {
                resourceName = resource.name;
            } else if (metadataMap && metadataMap[ids[0]]) {
                // If object not found, try to get from metadata (e.g., from search buffer)
                resourceName = metadataMap[ids[0]].displayName + (metadataMap[ids[0]].isFolder ? '/' : '');
            }
            
            if (resourceName && nameAlreadyExists(resourceName)) {
                setConflictedIds(ids);
                setNameConflict(true);
                return true;
            }
        }
        return false;
    };

    /**
     * Создать объект задачи со стандартизированной структурой
     */
    const createTask = (resourceId, target, type, message, meta = {}) => {
        return {
            id: nanoid(),
            operation: { type, source: resourceId, target },
            status: "pending",
            message,
            progress: 0,
            meta
        };
    };

    /**
     * Проверить, существует ли идентичная задача
     */
    const identicalTasks = (task) => {
        const pendingTasks = tasks.filter(
            (t) => t.status === "pending" || t.status === "progress"
        );
        if (task.operation.type === "upload") {
            return pendingTasks.some((t) => t.operation.type === "upload");
        }
        return pendingTasks.some(
            (t) => t.operation.source === task.operation.source && 
                   t.operation.type === task.operation.type
        );
    };

    const deleteTask = (task) => {
        setTasks(prevTasks => prevTasks.filter((t) => t.id !== task.id));
    };

    const clearTasks = () => {
        setTasks([]);
    };

    const allTasksCompleted = () => {
        const activeTasks = tasks.filter(
            (task) => task.status === "pending" || task.status === "progress"
        );
        return activeTasks.length === 0;
    };

    /**
     * Обновить статус и сообщение задачи
     */
    const updateTask = (task, newStatus = null, newMessage = null) => {
        setTasks(prevTasks =>
            prevTasks.map(inTask =>
                inTask.id === task.id
                    ? {
                        ...inTask,
                        status: newStatus ? newStatus : inTask.status,
                        message: newMessage ? newMessage : inTask.message
                    }
                    : inTask
            )
        );
    };

    /**
     * Обновить прогресс задачи
     */
    const updateDownloadTask = (task, progress) => {
        setTasks(prevTasks =>
            prevTasks.map(inTask =>
                inTask.id === task.id
                    ? { ...inTask, progress }
                    : inTask
            )
        );
    };

    /**
     * Загрузить файлы в текущую папку, используя предписанные URL
     * Группирует папки в отдельные задачи, сохраняет отдельные файлы отдельно
     * @param {File[]|{file:File}[]} fileList - Файлы для загрузки
     */
    const uploadObjects = (fileList) => {
        const files = Array.isArray(fileList)
            ? fileList.map(f => f instanceof File ? { file: f } : f)
            : [];

        if (files.length === 0) {
            showError("Нет файлов для загрузки");
            return;
        }

        // Check for conflicts with existing file names
        // Only check files that are being uploaded to the current folder (not in subfolders)
        const conflictingNames = files
            .filter(({ relativePath }) => {
                // Files with no relativePath OR with only filename (no folder structure) are at current level
                return !relativePath || !relativePath.includes("/");
            })
            .map(({ file }) => file.name)
            .filter(name => nameAlreadyExists(name));

        if (conflictingNames.length > 0) {
            showError(`Файлы уже существуют: ${conflictingNames.join(", ")}`);
            return;
        }

        // Group files into folders and single files
        const folderMap = new Map(); // Map<folderName, fileItems[]>
        const singleFiles = []; // Files without folder structure

        files.forEach((fileItem) => {
            const { file, relativePath } = fileItem;
            const isFolderUpload = Boolean(file?.webkitRelativePath) || 
                                 (typeof relativePath === "string" && relativePath.includes("/"));
            
            if (isFolderUpload && typeof relativePath === "string" && relativePath.includes("/")) {
                // This is a file in a folder - extract root folder name
                const parts = relativePath.replaceAll("\\", "/").split("/").filter(Boolean);
                const folderName = parts[0];
                
                if (!folderMap.has(folderName)) {
                    folderMap.set(folderName, []);
                }
                folderMap.get(folderName).push(fileItem);
            } else {
                // This is a single file (no folder structure)
                singleFiles.push(fileItem);
            }
        });

        // Create tasks - one task per folder, one task per single file
        const uploadTasks = [];
        
        // Add one task per folder with all its files
        folderMap.forEach((fileItems, folderName) => {
            uploadTasks.push(createTask(
                folderName, // Unique identifier
                null,
                "upload",
                "В очереди на загрузку",
                { 
                    isFolderUpload: true,
                    fileItems, // All files in this folder
                    isFolder: true,
                    folderName
                }
            ));
        });
        
        // Add one task per individual file
        singleFiles.forEach((fileItem) => {
            uploadTasks.push(createTask(
                fileItem.file.name, // Unique identifier
                null,
                "upload",
                "В очереди на загрузку",
                { 
                    isFolderUpload: false,
                    fileItems: [fileItem], // Single file wrapped in array
                    isFolder: false
                }
            ));
        });

        // Check if any identical tasks already exist
        const uniqueTasks = uploadTasks.filter((task) => !identicalTasks(task));

        if (uniqueTasks.length === 0) {
            showError("Загрузка уже выполняется");
            return;
        }

        setTasks(tasks => [...tasks, ...uniqueTasks]);
        setNewTasksAdded(true);

        // Execute all upload tasks sequentially
        executeUploadTasks(uniqueTasks);
    };

    /**
     * Выполнить задачи загрузки последовательно, отправляя все файлы папки одновременно
     */
    const executeUploadTasks = async (tasks) => {
        setTaskRunning(true);

        try {
            for (let i = 0; i < tasks.length; i++) {
                const task = tasks[i];
                const fileItems = task.meta?.fileItems;
                
                if (!fileItems || fileItems.length === 0) continue;

                updateTask(task, "progress", "Подготовка к загрузке...");

                // Send all files of a folder/item together
                await sendUpload(
                    fileItems,
                    (_task, progress) => updateDownloadTask(task, progress),
                    (_task, status, message) => updateTask(task, status, message),
                    task,
                    currentFolderId
                );
            }
        } catch (error) {
            console.error("Ошибка загрузки:", error);
            if (!error?.__uiHandled) {
                // Show error on the current task
                const currentTask = tasks[tasks.length - 1];
                if (currentTask) {
                    updateTask(currentTask, "error", humanizeOperationError(error, "upload"));
                }
            }
        } finally {
            setTaskRunning(false);
        }
    };

    /**
     * Удалить объекты по UUID
     */
    const deleteObject = (objectIds) => {
        if (!Array.isArray(objectIds) || objectIds.length === 0) {
            showError("Не выбраны объекты для удаления");
            return;
        }

        // Create individual tasks for each object
        const deleteTasks = objectIds.map(id => {
            const resource = getObjectById(id);
            let resourceName = resource?.name || extractSimpleName(String(id));
            const isFolder = resource?.type === 'DIRECTORY';
            
            // Strip trailing slash for display
            if (resourceName.endsWith('/')) {
                resourceName = resourceName.slice(0, -1);
            }
            
            return createTask(
                id,
                null,
                "delete",
                "В очереди на удаление",
                { displayName: resourceName, isFolder }
            );
        });

        // Check if any identical tasks already exist
        const uniqueTasks = deleteTasks.filter((task) => !identicalTasks(task));

        if (uniqueTasks.length === 0) {
            showError("Удаление уже выполняется");
            return;
        }

        setTasks((tasks) => [...tasks, ...uniqueTasks]);
        setNewTasksAdded(true);
        executeTasks(uniqueTasks);
    };

    /**
     * Переместить объекты в целевую папку
     * @param {string[]} sourceIds - ID элементов для перемещения
     * @param {string} targetFolderId - ID целевой папки
     * @param {Object} [metadataMap] - Дополнительная карта id -> {displayName, isFolder} для элементов из буфера
     */
    const moveObjects = (sourceIds, targetFolderId, metadataMap) => {
        if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
            showError("Не выбраны объекты для перемещения");
            return;
        }

        // Validate target folder ID if provided
        if (targetFolderId !== null && targetFolderId !== undefined) {
            const validatedId = normalizeAndValidateUuid(targetFolderId);
            if (!validatedId && targetFolderId !== null) {
                showError("Неверный ID целевой папки");
                return;
            }
            targetFolderId = validatedId;
        }

        const moveTasks = sourceIds.map(id => {
            // Use metadata from buffer if available, otherwise lookup from current folder
            let resourceName, isFolder;
            
            if (metadataMap && metadataMap[id]) {
                resourceName = metadataMap[id].displayName;
                isFolder = metadataMap[id].isFolder;
            } else {
                const resource = getObjectById(id);
                resourceName = resource?.name || "Файл";
                isFolder = resource?.type === 'DIRECTORY';
                // Strip trailing slash for display purposes
                if (resourceName.endsWith('/')) {
                    resourceName = resourceName.slice(0, -1);
                }
            }
            
            return createTask(id, targetFolderId, "move", "В очереди для перемещения", { displayName: resourceName, isFolder });
        });

        const uniqueTasks = moveTasks.filter((task) => !identicalTasks(task));

        if (uniqueTasks.length === 0) {
            showError("Перемещение уже выполняется");
            return;
        }

        setTasks(tasks => [...tasks, ...uniqueTasks]);
        setNewTasksAdded(true);
        executeTasks(uniqueTasks);
    };

    /**
     * Переименовать объект
     */
    const renameObject = (resourceId, newName) => {
        if (!resourceId || !newName || newName.trim().length === 0) {
            showError("Неверные параметры переименования");
            return;
        }

        const resource = getObjectById(resourceId);
        let oldName = resource?.name || "Файл";
        const isFolder = resource?.type === 'DIRECTORY';
        // Strip trailing slash for display purposes
        if (oldName.endsWith('/')) {
            oldName = oldName.slice(0, -1);
        }
        const task = createTask(resourceId, newName.trim(), "rename", "В очереди для переименования", { displayName: oldName, isFolder });

        if (identicalTasks(task)) {
            showError("Переименование уже выполняется");
            return;
        }

        setTasks(tasks => [...tasks, task]);
        setNewTasksAdded(true);

        executeRename(task);
    };

    /**
     * Скачать объект по UUID
     */
    const downloadObjects = (resourceId) => {
        if (!resourceId) {
            showError("ID ресурса не указан");
            return;
        }

        const resource = getObjectById(resourceId);
        if (!resource) {
            showError("Ресурс не найден");
            return;
        }

        let resourceName = resource.name;
        const isFolder = resource.type === 'DIRECTORY';
        // Strip trailing slash for display purposes
        if (resourceName.endsWith('/')) {
            resourceName = resourceName.slice(0, -1);
        }

        const task = createTask(resourceId, resourceName, "download", "В очереди на скачивание", { displayName: resourceName, isFolder });

        if (identicalTasks(task)) {
            showError("Скачивание уже выполняется");
            return;
        }

        setTasks(tasks => [...tasks, task]);
        setNewTasksAdded(true);

        executeDownloadTask(task, resource);
    };

    /**
     * Выполнить задачу удаления
     */
    const executeDeleteTask = async (task) => {
        try {
            updateTask(task, "progress", "Удаляем...");
            await sendDeleteResource(task.operation.source);
            updateTask(task, "completed", "Удаление успешно выполнено");
            
            // If in search mode, refresh search results
            if (isSearchMode && searchName) {
                try {
                    const updatedResults = await sendFindObjects("", searchName.trim());
                    setSearchedContent(updatedResults);
                } catch (error) {
                    console.error("Ошибка при обновлении результатов поиска:", error);
                }
            }
        } catch (error) {
            updateTask(task, "error", humanizeOperationError(error, "delete"));
        }
    };

    /**
     * Выполнить задачу перемещения
     */
    const executeMoveTask = async (task) => {
        try {
            updateTask(task, "progress", "Перемещаем...");
            await sendMoveResource(task.operation.source, task.operation.target);
            // Use displayName from meta if available for cleaner message
            const displayName = task.meta?.displayName || "Элемент";
            updateTask(task, "completed", `Перемещено: ${displayName}`);
        } catch (error) {
            updateTask(task, "error", error.message || "Ошибка при перемещении");
        }
    };

    /**
     * Выполнить задачу переименования
     */
    const executeRename = async (task) => {
        try {
            setTaskRunning(true);
            updateTask(task, "progress", "Переименовываем...");
            await sendRenameResource(task.operation.source, task.operation.target);
            // Strip trailing slash for display purposes
            const displayName = task.operation.target.endsWith('/') ? task.operation.target.slice(0, -1) : task.operation.target;
            updateTask(task, "completed", `Переименовано: ${displayName}`);
            
            // If in search mode, refresh search results
            if (isSearchMode && searchName) {
                try {
                    const updatedResults = await sendFindObjects("", searchName.trim());
                    setSearchedContent(updatedResults);
                } catch (error) {
                    console.error("Ошибка при обновлении результатов поиска:", error);
                }
            }
        } catch (error) {
            updateTask(task, "error", error.message || "Ошибка при переименовании");
        } finally {
            setTaskRunning(false);
        }
    };

    /**
     * Выполнить задачу скачивания
     */
    const executeDownloadTask = async (task, resource) => {
        try {
            updateTask(task, "progress", "Скачиваем...");
            
            // Strip trailing slash for filename
            let cleanName = resource.name;
            if (cleanName.endsWith('/')) {
                cleanName = cleanName.slice(0, -1);
            }
            
            await sendDownloadFile(
                resource.id,
                cleanName,
                (progress) => updateDownloadTask(task, progress)
            );

            updateTask(task, "completed", "Скачивание завершено");
        } catch (error) {
            console.error("Ошибка скачивания:", error);
            updateTask(task, "error", humanizeOperationError(error, "download"));
        }
    };

    /**
     * Выполнить пакет задач удаления/перемещения
     */
    const executeTasks = async (pendingTasks) => {
        setTaskRunning(true);

        try {
            for (const task of pendingTasks) {
                if (task.operation.type === "delete") {
                    await executeDeleteTask(task);
                } else if (task.operation.type === "move") {
                    await executeMoveTask(task);
                }
            }
        } catch (error) {
            console.error("Ошибка выполнения задачи:", error);
            if (error instanceof StorageExceedException) {
                showError(error.message);
            }
            clearTasks();
        } finally {
            setTaskRunning(false);
        }
    };

    /**
     * Обработать операцию вставки (вырезать/переместить)
     * Если элементы уже в текущей папке, пропустить операцию
     * В противном случае переместить их в текущую папку
     */
    const pasteObjects = () => {
        if (bufferIds.length === 0) {
            showError("Нет объектов в буфере обмена");
            return;
        }

        if (isCutMode) {
            // Check if all buffered items are already in the current folder
            const currentFolderIds = folderContent.map(obj => obj.id);
            const allItemsInCurrentFolder = bufferIds.every(id => currentFolderIds.includes(id));
            
            if (allItemsInCurrentFolder) {
                // Items are already in this folder, just clear the buffer
                showError("Файлы уже находятся в этой папке");
                endCutting();
                return;
            }

            if (checkConflicts(bufferIds, bufferMetadata)) {
                return;
            }

            moveObjects(bufferIds, currentFolderId, bufferMetadata);
            endCutting();
        }
    };

    /**
     * Очистить выбор и состояние буфера обмена
     */
    const clearSelectionMode = () => {
        endCutting();
        endCopying();
        setConflictedIds([]);
    };

    /**
     * Обработать закрытие модального окна конфликта имён
     */
    const handleModalConflictClose = () => {
        setNameConflict(false);
        clearSelectionMode();
    };

    /**
     * Оразуметь конфликт имён через перемещение/переименование
     */
    const resolveConflict = (newName) => {
        if (isCutMode) {
            // For cut mode (paste operation), don't try to rename - backend will handle conflict or error
            // Just proceed with move using the metadata from buffer
            moveObjects(bufferIds, currentFolderId, bufferMetadata);
            endCutting();
        } else {
            const resourceId = conflictedIds[0];
            renameObject(resourceId, newName);
        }

        handleModalConflictClose();
    };

    /**
     * Reload folder only after an operation batch finishes (taskRunning true → false).
     * Dismissing completed tasks from the list must not refetch the folder.
     */
    useEffect(() => {
        const wasRunning = prevTaskRunningRef.current;
        prevTaskRunningRef.current = taskRunning;

        if (!wasRunning || taskRunning) {
            return;
        }

        if (!allTasksCompleted() || tasks.length === 0) {
            return;
        }

        const hasSuccess = tasks.some((t) => t.status === "completed");
        if (!hasSuccess) {
            return;
        }

        const signature = tasks.map((t) => `${t.id}:${t.status}`).join("|");
        if (signature === lastReloadSignatureRef.current) {
            return;
        }
        lastReloadSignatureRef.current = signature;

        const t = setTimeout(() => {
            if (currentFolderId) {
                loadFolderById(currentFolderId);
            } else {
                loadRootFolder();
            }
        }, 300);

        return () => clearTimeout(t);
    }, [taskRunning, tasks, currentFolderId, loadFolderById, loadRootFolder]);

    /**
     * Prevent navigation if tasks are running
     */
    useEffect(() => {
        const activeTasks = tasks.filter(
            (task) => task.status === "pending" || task.status === "progress"
        );

        const handleBeforeUnload = (event) => {
            if (activeTasks.length > 0) {
                event.preventDefault();
                event.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [tasks]);

    return (
        <FileOperationsContext.Provider
            value={{
                tasks,
                newTasksAdded,
                setNewTasksAdded,
                deleteTask,
                clearTasks,
                allTasksCompleted,
                deleteObject,
                moveObjects,
                pasteObjects,
                downloadObjects,
                renameObject,
                uploadObjects
            }}
        >
            {children}
            <RenameModal
                selectedIds={conflictedIds}
                open={nameConflict}
                onClose={handleModalConflictClose}
                clearSelectionMode={clearSelectionMode}
                isConflict={true}
                resolveConflict={resolveConflict}
            />
        </FileOperationsContext.Provider>
    );
}
