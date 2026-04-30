import {Box, Card, LinearProgress} from "@mui/material";
import {FileFormatIcon} from "../../assets/FileFormatIcon.jsx";
import React from "react";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import {extractSimpleName} from "../../services/util/Utils.js";
import {useStorageOperations} from "../../context/Files/FileOperationsProvider.jsx";

function stripTrailingDisplaySlash(s) {
    if (typeof s !== "string") {
        return s;
    }
    return s.replace(/\/+$/, "");
}

function folderIconName(displayText, rawLabel) {
    if (typeof rawLabel === "string" && /\/$/.test(rawLabel)) {
        return `${displayText}/`;
    }
    return displayText;
}

export const Task = ({task}) => {

    const {deleteTask} = useStorageOperations();

    const operation = task.operation.type;
    const source = task.operation.source;
    const target = task.operation.target;
    const meta = task.meta || {};

    const rawPrimary =
        meta.displayName
            ? meta.displayName
            : operation === "download" && target != null && target !== ""
                ? target
                : extractSimpleName(source);

    const primaryLine = stripTrailingDisplaySlash(rawPrimary);
    const isFolderUpload = operation === "upload" && meta.isFolderUpload === true;
    const isRenameFolder = operation === "rename" && meta.isFolder === true;
    const isMoveFolder = operation === "move" && meta.isFolder === true;
    const isDownloadFolder = operation === "download" && meta.isFolder === true;
    const isDeleteFolder = operation === "delete" && meta.isFolder === true;
    const iconName = (isFolderUpload || isRenameFolder || isMoveFolder || isDownloadFolder || isDeleteFolder) ? `${primaryLine}/` : folderIconName(primaryLine, rawPrimary);

    let secondaryLine = null;
    if (operation === "upload") {
        secondaryLine = null;
    } else if (operation === "delete") {
        secondaryLine = target != null && target !== "" ? target : null;
    } else if (operation === "rename" || operation === "move") {
        secondaryLine = null;
    } else if (operation === "download") {
        secondaryLine = "Скачивание";
    } else {
        secondaryLine = source;
    }

    const status = task.status;
    let message = task.message;
    if (status === "pending") {
        message = "Ожидание";
    }
    if (operation === "rename" && status === "completed") {
        message = `Переименовано: ${stripTrailingDisplaySlash(target)}`;
    }
    const messageTop = secondaryLine ? 36 : 26;

    return (
        <Card

            sx={{
                mb: 1,
                position: 'relative',
                minWidth: 20,
                height: 70,
                backgroundColor: "modal",
                borderRadius: 2,
                border: "1px solid",
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',

            }}
            elevation={0}
        >
            {status !== "error" ?

                <Box
                    sx={{
                        position: 'absolute',
                        display: 'flex',
                        height: 10,
                        width: "78%",
                        top: 3,
                        left: 6
                    }}
                >

                    <Box sx={{position: 'absolute', width: '15px', left: 0, top: iconName.endsWith('/') ? 53 : 14,}}>
                        <FileFormatIcon name={iconName} style="list"/>
                    </Box>
                    <Typography sx={{
                        width: '100%',
                        left: 24,
                        position: 'absolute',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        userSelect: 'none',
                    }}>{primaryLine}</Typography>
                    {secondaryLine != null && secondaryLine !== "" && (
                        <Typography sx={{
                            color: 'text.secondary',
                            fontSize: '12px',
                            fontWeight: 400,
                            width: '100%',
                            top: 20,
                            left: 24,
                            position: 'absolute',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            userSelect: 'none',
                        }}>{secondaryLine}</Typography>
                    )}

                    <Typography sx={{
                        fontSize: '15px',
                        width: '100%',
                        display: 'flex',
                        position: 'absolute',
                        color: status === "completed" ? "success.main" : (status === "pending" ? "warning.main" : "text.primary"),
                        left: 24,
                        top: messageTop,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        userSelect: 'none',
                    }}>
                        {message}
                    </Typography>
                </Box>
                :
                <Box
                    sx={{
                        position: 'absolute',
                        display: 'flex',
                        height: '100%',
                        width: '78%',
                        top: 3,
                        left: 7,
                        alignItems: 'center', // Выравнивание по вертикали по центру
                    }}
                >
                    <Box sx={{position: 'absolute', width: '15px', left: 0, top: iconName.endsWith('/') ? 53 : 14}}>
                        <FileFormatIcon name={iconName} style="list"/>
                    </Box>
                    <Typography
                        sx={{
                            pl: '20px',
                            color: 'error.main',
                            fontSize: '13px',
                            fontWeight: 400,
                            width: '100%',
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {message}
                    </Typography>
                </Box>

            }

            {status === "progress" && operation !== "download" && operation !== "upload" &&
                <LinearProgress sx={{
                    width: '100%', position: 'absolute', height: 5, bottom: 0,
                    backgroundColor: 'transparent', // Убираем стандартный цвет фона
                    '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, rgba(28,50,163,1) 0%, rgba(16,113,195,1) 100%)', // Градиент для прогресса
                    },
                }}/>
            }

            {status === "progress" && (operation === "download" || operation === "upload") &&
                <LinearProgress
                    variant={task.progress === 100 || task.progress === 0 ? "query" : "determinate"}
                    value={task.progress}
                    sx={{
                        width: '100%', position: 'absolute', height: 5, bottom: 0,
                        backgroundColor: 'transparent', // Убираем стандартный цвет фона
                        '& .MuiLinearProgress-bar': {
                            background: 'linear-gradient(90deg, rgba(28,50,163,1) 0%, rgba(16,113,195,1) 100%)', // Градиент для прогресса
                        },
                    }}/>
            }


            {/*//todo add removing pending tasks*/}
            {(status === 'completed' || status === 'error') &&
                <IconButton
                    onClick={() => deleteTask(task)}
                    sx={{
                        position: 'absolute',
                        bottom: 18,
                        right: 8,
                        backgroundColor: status === 'completed' ? 'success.main' : 'error.main',
                        width: '30px',
                        height: '30px',
                        color: 'text.primary',
                        "&:hover": {
                            backgroundColor: status === 'completed' ? 'success.dark' : 'error.dark',

                        }
                    }}
                >
                    <CloseIcon sx={{fontSize: '30px'}}/>
                </IconButton>
            }

        </Card>
    )

}