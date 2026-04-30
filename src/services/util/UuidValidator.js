/**
 * UUID v4 validation utility
 * Enterprise-grade UUID validation for security
 */

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate UUID format
 * @param {string} uuid - UUID to validate
 * @param {boolean} requireV4 - If true, only accept UUID v4 (default: false)
 * @returns {boolean}
 */
export const isValidUuid = (uuid, requireV4 = false) => {
    if (!uuid || typeof uuid !== 'string') {
        return false;
    }

    const trimmedUuid = uuid.trim().toLowerCase();

    if (requireV4) {
        return UUID_V4_REGEX.test(trimmedUuid);
    }

    return UUID_REGEX.test(trimmedUuid);
};

/**
 * Validate and normalize UUID (trim and lowercase)
 * @param {string} uuid - UUID to validate and normalize
 * @returns {string|null} - Normalized UUID or null if invalid
 */
export const normalizeAndValidateUuid = (uuid) => {
    if (!uuid) return null;

    const trimmedUuid = String(uuid).trim().toLowerCase();

    if (!isValidUuid(trimmedUuid)) {
        return null;
    }

    return trimmedUuid;
};

/**
 * Validate array of UUIDs
 * @param {Array<string>} uuids - Array of UUIDs to validate
 * @returns {boolean}
 */
export const areValidUuids = (uuids) => {
    if (!Array.isArray(uuids)) {
        return false;
    }

    return uuids.every(uuid => isValidUuid(uuid));
};

/**
 * Filter and validate UUIDs from array
 * @param {Array<string>} uuids - Array of potential UUIDs
 * @returns {Array<string>} - Array of valid UUIDs
 */
export const filterValidUuids = (uuids) => {
    if (!Array.isArray(uuids)) {
        return [];
    }

    return uuids
        .map(normalizeAndValidateUuid)
        .filter(uuid => uuid !== null);
};
