import { sendUploadInit } from "./SendUploadInit.js";
import { sendUploadConfirm } from "./SendUploadConfirm.js";
import { throwSpecifyException } from "../../../../exception/ThrowSpecifyException.jsx";
import { logger } from "../../../util/Logger.js";

// ✅ Security: Validate presigned URL domain and protocol
function validatePresignedUrl(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        // Allow HTTP for localhost and minio (internal Docker service)
        const isAllowedForHttp = hostname.includes('localhost') || hostname.includes('minio');
        
        // Check protocol - must be HTTPS except for allowed local services
        if (urlObj.protocol !== 'https:' && !isAllowedForHttp) {
            throw new Error('Presigned URL must use HTTPS');
        }
        
        // Check hostname - should contain known S3/MinIO patterns
        if (!hostname.includes('minio') && 
            !hostname.includes('s3') && 
            !hostname.includes('amazonaws') &&
            !hostname.includes('localhost')) {
            console.warn(`Unknown presigned URL domain: ${hostname}`);
        }
        
        return true;
    } catch (e) {
        throw new Error(`Invalid presigned URL: ${e.message}`);
    }
}

/**
 * Enterprise-grade upload using presigned URLs with progress tracking
 *
 * Flow:
 * 1. Init upload: Get presigned URLs from backend
 * 2. Upload to MinIO: Use presigned URLs for direct S3-compatible upload
 * 3. Confirm upload: Tell backend files are ready for use
 *
 * @param {Array<{file: File}>} files - Files to upload
 * @param {function} updateProgressTask - Callback to update progress
 * @param {function} updateTask - Callback to update task status/message
 * @param {Object} uploadTask - Task metadata
 * @param {string|null} parentId - Parent folder UUID (null for root)
 */
export async function sendUpload(files, updateProgressTask, updateTask, uploadTask, parentId) {
    const verbose = import.meta.env.DEV && import.meta.env.VITE_VERBOSE_NETWORK_LOGS === "true";

    if (import.meta.env.VITE_MOCK_FETCH_CALLS) {
        logger.log("Upload simulation - full flow");
        updateTask(uploadTask, "completed", "Загружено");
        return;
    }

    const totalFiles = files.length;
    if (verbose) {
        logger.log(`Starting upload of ${totalFiles} files to parent folder:`, parentId || "root");
    }

    try {
        updateTask(uploadTask, "progress", "Инициализация загрузки...");

        const fileMetadata = files.map(({ file, relativePath }) => {
            // Use provided relativePath if available, otherwise normalize from file.webkitRelativePath
            let finalRelativePath = relativePath ?? normalizeUploadRelativePath(file);
            
            // For single files without folder structure, send null to indicate it's just a file
            // Only send relativePath if it contains path separators (indicating folder structure)
            if (finalRelativePath && !finalRelativePath.includes("/")) {
                finalRelativePath = null;
            }
            
            return {
                name: file.name,
                relativePath: finalRelativePath,
                size: file.size,
            };
        });

        if (verbose) {
            logger.log("Requesting presigned URLs for:", fileMetadata.map((f) => f.name));
        }

        const presignedResponses = await sendUploadInit(parentId, fileMetadata);

        if (!Array.isArray(presignedResponses) || presignedResponses.length !== totalFiles) {
            throw new Error("Backend returned incorrect number of presigned URLs");
        }

        const successfulObjectKeys = [];
        const failedFiles = [];
        let uploadedBytes = 0;
        const totalBytes = files.reduce((sum, { file }) => sum + file.size, 0);

        if (verbose) {
            logger.log(`Total bytes to upload: ${totalBytes}`);
        }

        for (let i = 0; i < files.length; i++) {
            const { file } = files[i];
            const presignedResponse = presignedResponses[i];
            const { objectKey, presignedUrl } = presignedResponse;

            if (!objectKey || !presignedUrl) {
                failedFiles.push({ name: file.name, reason: "Invalid presigned response from server" });
                logger.warn(`Skipping ${file.name} - invalid presigned response`);
                continue;
            }

            // ✅ Security: Validate presigned URL before uploading
            try {
                validatePresignedUrl(presignedUrl);
            } catch (validationError) {
                failedFiles.push({ name: file.name, reason: validationError.message });
                logger.warn(`Skipping ${file.name} - URL validation failed: ${validationError.message}`);
                continue;
            }

            updateTask(uploadTask, "progress", `Загружаем: ${file.name} (${i + 1}/${totalFiles})`);

            try {
                await uploadFileToPresignedUrl(file, presignedUrl, (loaded) => {
                    const overallLoaded = uploadedBytes + loaded;
                    const overallProgress = Math.min(
                        Math.floor((overallLoaded / totalBytes) * 100),
                        99
                    );
                    updateProgressTask(uploadTask, overallProgress);
                });

                uploadedBytes += file.size;
                successfulObjectKeys.push(objectKey);
                
                if (verbose) {
                    logger.log(`Successfully uploaded: ${file.name}`);
                }
            } catch (uploadError) {
                failedFiles.push({ name: file.name, reason: uploadError.message });
                logger.warn(`Failed to upload ${file.name}:`, uploadError);
                uploadedBytes += file.size; // Still count towards progress for UI consistency
            }
        }

        // If no files uploaded successfully, throw error
        if (successfulObjectKeys.length === 0) {
            const failureReasons = failedFiles.map(f => `${f.name}: ${f.reason}`).join("; ");
            throw new Error(`All files failed to upload: ${failureReasons}`);
        }

        updateTask(uploadTask, "progress", "Завершаем загрузку...");

        if (verbose) {
            logger.log(`Confirming upload of ${successfulObjectKeys.length} files (${failedFiles.length} failed)`);
        }
        
        await sendUploadConfirm(successfulObjectKeys);

        updateProgressTask(uploadTask, 100);
        
        // Show summary of upload results
        const statusMessage = failedFiles.length === 0 
            ? "Загрузка завершена" 
            : `Загружено ${successfulObjectKeys.length}/${totalFiles} файлов (${failedFiles.length} ошибок)`;
        
        updateTask(uploadTask, "completed", statusMessage);

        if (verbose) {
            logger.log("Upload process completed", { 
                successful: successfulObjectKeys.length, 
                failed: failedFiles.length 
            });
        }
    } catch (error) {
        logger.error("Upload error:", error);
        handleUploadError(error, updateTask, uploadTask);
        if (error && typeof error === "object") {
            error.__uiHandled = true;
        }
        throw error;
    }
}

async function uploadFileToPresignedUrl(file, presignedUrl, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
                onProgress(event.loaded);
            }
        });

        xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
            }
        });

        xhr.addEventListener("error", () => {
            reject(new Error("Ошибка сети в время загрузки"));
        });

        xhr.addEventListener("abort", () => {
            reject(new Error("Upload aborted by user"));
        });

        xhr.open("PUT", presignedUrl);

        // // Set correct Content-Type based on file type
        // const contentType = file.type || "application/octet-stream";
        // xhr.setRequestHeader("Content-Type", contentType);

        xhr.send(file);
    });
}

function handleUploadError(error, updateTask, uploadTask) {
    let errorMessage = "Неизвестная ошибка при загрузке";

    const truncate = (text, max = 180) => {
        if (!text) return text;
        const s = String(text);
        return s.length > max ? s.slice(0, max - 1) + "…" : s;
    };

    if (error instanceof Error) {
        if (error.message.includes("Ошибка сети")) {
            errorMessage = "Ошибка сети - проверьте интернет соединение";
        } else if (error.message.includes("Upload failed with status")) {
            errorMessage = "Ошибка при загрузке на сервер хранилища";
        } else if (error.message.includes("Invalid presigned response")) {
            errorMessage = "Ошибка инициализации загрузки";
        } else if (error.message.includes("incorrect number")) {
            errorMessage = "Ошибка синхронизации с сервером";
        } else if (error.message.startsWith("Upload failed for")) {
            errorMessage = "Ошибка при загрузке файла";
        } else {
            errorMessage = truncate(error.message);
        }
    }

    if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        logger.error(`HTTP ${status}:`, data);

        if (status === 409) {
            errorMessage = uploadTask?.meta?.isFolderUpload
                ? "Не удалось загрузить папку (конфликт имён на сервере)"
                : "Файл с таким именем уже существует в папке";
        } else if (status === 413) {
            errorMessage = "Размер файла превышает допустимый лимит";
        } else if (status === 500) {
            errorMessage = "Ошибка сервера - попробуйте позже";
        }

        try {
            throwSpecifyException(status, data);
        } catch (e) {
            logger.error("Exception handled:", e);
        }
    }

    updateTask(uploadTask, "error", errorMessage);
}

function normalizeUploadRelativePath(file) {
    const raw = typeof file?.webkitRelativePath === "string" ? file.webkitRelativePath : "";
    const normalized = raw.replaceAll("\\", "/").trim();

    if (normalized) {
        return normalized;
    }

    return file?.name ? String(file.name).replaceAll("\\", "/").trim() : null;
}
