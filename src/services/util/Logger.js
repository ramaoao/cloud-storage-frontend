/**
 * ✅ Security: Safe logger that only logs in development mode
 * Prevents sensitive information leakage in production
 */

const isDev = import.meta.env.DEV;

export const logger = {
    /**
     * Log message (development only)
     * @param {string} message - Message to log
     * @param {*} data - Optional data to log
     */
    log: (message, data) => {
        if (isDev) {
            data !== undefined ? console.log(message, data) : console.log(message);
        }
    },

    /**
     * Log error (development only)
     * @param {string} message - Error message
     * @param {*} error - Error object or data
     */
    error: (message, error) => {
        if (isDev) {
            error !== undefined ? console.error(message, error) : console.error(message);
        }
    },

    /**
     * Log warning (development only)
     * @param {string} message - Warning message
     * @param {*} data - Optional data
     */
    warn: (message, data) => {
        if (isDev) {
            data !== undefined ? console.warn(message, data) : console.warn(message);
        }
    },

    /**
     * Log info (development only)
     * @param {string} message - Info message
     * @param {*} data - Optional data
     */
    info: (message, data) => {
        if (isDev) {
            data !== undefined ? console.info(message, data) : console.info(message);
        }
    },

    /**
     * Always log errors for monitoring (use sparingly for production alerts)
     * @param {string} message - Message
     * @param {*} data - Data to log
     */
    errorAlways: (message, data) => {
        // In production, you could send this to an error tracking service
        if (isDev) {
            data !== undefined ? console.error(message, data) : console.error(message);
        } else {
            // Send to error tracking (e.g., Sentry, LogRocket)
            // errorTrackingService.captureException(new Error(message), {data});
        }
    },
};

export default logger;
