import { throwSpecifyException } from "../../../../exception/ThrowSpecifyException.jsx";
import apiClient from "../../../apiClient.js";
import { isValidUuid } from "../../../util/UuidValidator.js";
import { API_FILES } from "../../../../UrlConstants.jsx";
import { logger } from "../../../util/Logger.js";

/**
 * Download file or directory as ZIP
 * 
 * Enterprise-grade download with:
 * - UUID validation
 * - Progress tracking
 * - Proper error handling for blob responses
 * - Support for both files and directories
 * 
 * @param {string} resourceId - UUID of resource (file or directory)
 * @param {string} resourceName - Name of resource (for downloaded filename)
 * @param {function} updateDownloadTask - Callback to update download progress (0-100)
 * @returns {Promise<void>}
 */
export const sendDownloadFile = async (resourceId, resourceName, updateDownloadTask) => {
    if (import.meta.env.VITE_MOCK_FETCH_CALLS) {
        logger.log(`Simulating download for resource: ${resourceId}`);
        return;
    }

    // Validate UUID
    if (!isValidUuid(resourceId)) {
        throw new Error(`Invalid resource ID format: ${resourceId}`);
    }

    if (!resourceName || resourceName.trim().length === 0) {
        throw new Error("Resource name is required");
    }

    logger.log(`Starting download for resource: ${resourceId} (${resourceName})`);

    let totalSize = 0;
    let loadedSize = 0;
    let speedCheckInterval;

    try {
        // Make request to download endpoint with resource ID
        const response = await apiClient.get(
            `${API_FILES}/${resourceId}/download`,
            {
                responseType: 'blob',
                onDownloadProgress: (progressEvent) => {
                    loadedSize = progressEvent.loaded;
                    totalSize = progressEvent.total || loadedSize;

                    if (totalSize > 0) {
                        const progress = Math.floor((loadedSize / totalSize) * 100);
                        updateDownloadTask(progress);
                    }
                }
            }
        );

        clearInterval(speedCheckInterval);

        // Get the blob and filename from response
        const blob = response.data;
        const contentDisposition = response.headers['content-disposition'] || '';
        
        // Extract filename from Content-Disposition header if available
        let filename = extractFilenameFromContentDisposition(contentDisposition);
        
        // Fallback to provided resource name
        if (!filename) {
            filename = resourceName;
            // Strip trailing slash from folder names before adding extension
            if (filename.endsWith('/')) {
                filename = filename.slice(0, -1);
            }
            // Add .zip extension for directories
            if (!filename.includes('.')) {
                filename += '.zip';
            }
        }

        logger.log(`Download completed. File size: ${blob.size} bytes`);

        // Trigger browser download
        downloadBlob(blob, filename);

        logger.log(`File successfully downloaded: ${filename}`);

    } catch (error) {
        clearInterval(speedCheckInterval);

        logger.error("Download error:", error);

        if (error.response) {
            const status = error.response.status;
            const errorData = error.response.data;

            logger.error(`HTTP ${status}:`, errorData);

            // Blob error bodies: parse first, then throw once — inner catch must not wrap
            // `throwSpecifyException` (it throws) or `errorText` will be out of scope / wrong.
            if (errorData instanceof Blob) {
                const errorText = await errorData.text();
                let detail = { message: errorText || "Скачивание не удалось" };
                try {
                    detail = JSON.parse(errorText);
                } catch {
                    /* keep text as message */
                }
                throwSpecifyException(status, detail);
            } else {
                throwSpecifyException(status, errorData);
            }
        } else if (error.code === 'ERR_CANCELED') {
            console.warn("Скачивание исканно пользователем");
            throw new Error("Download canceled");
        } else {
            throw new Error(`Ошибка сети: ${error.message}`);
        }
    }
};

/**
 * Extract filename from Content-Disposition header
 * Handles RFC 2183 and RFC 5987 encoding
 */
function extractFilenameFromContentDisposition(contentDisposition) {
    if (!contentDisposition) return null;

    // Try RFC 5987 format first (filename*=UTF-8''...)
    const utf8Match = contentDisposition.match(/filename\*=(?:UTF-8'')?([^;,\n]+)/i);
    if (utf8Match) {
        try {
            return decodeURIComponent(utf8Match[1]);
        } catch (e) {
            // Continue to next format
        }
    }

    // Try RFC 2183 format (filename=...)
    const basicMatch = contentDisposition.match(/filename=([^;,\n]+)/i);
    if (basicMatch) {
        let filename = basicMatch[1].replace(/^["']|["']$/g, ''); // Remove quotes
        return filename.trim();
    }

    return null;
}

/**
 * Trigger browser download for blob
 */
function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    try {
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);

        link.click();

        console.log(`Скачивание запущено: ${filename}`);
    } finally {
        // Clean up
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
}