import UnauthorizedException from "./UnauthorizedException.jsx";
import ConflictException from "./ConflictException.jsx";
import ForbiddenException from "./ForbiddenException.jsx";
import NotFoundException from "./NotFoundException.jsx";
import StorageExceedException from "./StorageExceedException.jsx";
import BadRequestException from "./BadRequestException.jsx";


export const throwSpecifyException = (status, detail) => {

    const rawMessage = detail?.message || "Что-то пошло не так с нашей стороны. Мы уже занимаемся ее устранением.";

    const summarizeAlreadyExists = (msg) => {
        const prefix = "File already exist:";
        if (!msg || typeof msg !== "string" || !msg.startsWith(prefix)) return msg;

        const listPart = msg.slice(prefix.length).trim();
        if (!listPart) return "Файлы уже существуют";

        const names = listPart.split(",").map(s => s.trim()).filter(Boolean);
        const count = names.length;
        const preview = names.slice(0, 3).join(", ");
        return count > 3
            ? `Файлы уже существуют (${count}): ${preview}…`
            : `Файлы уже существуют (${count}): ${preview}`;
    };

    switch (status) {
        case 400:
            throw new BadRequestException(rawMessage);
        case 401:
            throw new UnauthorizedException(rawMessage);
        case 409:
            throw new ConflictException(summarizeAlreadyExists(rawMessage));
        case 403:
            throw new ForbiddenException(rawMessage);

        case 404:
            throw new NotFoundException(rawMessage);

        case 413:
            throw new StorageExceedException(rawMessage);

        case 500:
        case 502:
        case 503:
        case 504:
            throw new Error(rawMessage);

        default:
            throw new Error(
                typeof status === "number" ? `${rawMessage} (HTTP ${status})` : rawMessage
            );
    }

}