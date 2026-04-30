import React, {useState, useEffect} from "react";
import {Box, Modal, Typography, CircularProgress} from "@mui/material";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import {extractSimpleName, formatDate, isMediaFile} from "../../services/util/Utils.js";
import bytes from "bytes";
import apiClient from "../../services/apiClient.js";
import {API_FILES} from "../../UrlConstants.jsx";
import {FileFormatIcon} from "../../assets/FileFormatIcon.jsx";

export default function FilePreviewModal({
                                             open,
                                             onClose,
                                             object
                                         }) {
    if (!object || !object.id) return null;
    
    const [mediaUrl, setMediaUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Используем поле name вместо path (оно содержит полный путь)
    const fileName = object.name || object.path || '';
    const dotIndex = fileName.lastIndexOf(".");
    const format = dotIndex > 0 ? fileName.substring(dotIndex + 1).toLowerCase() : '';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'tif', 'ico', 'heic', 'heif'].includes(format);
    const isVideo = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'ogv', 'm4v', '3gp', 'f4v', 'mpg', 'mpeg', 'mts', 'm2ts'].includes(format);

    // Загружаем медиа файл при открытии модала
    useEffect(() => {
        if (open && object && object.id && (isImage || isVideo)) {
            setLoading(true);
            setError(null);
            
            apiClient.get(`${API_FILES}/${object.id}/download`, {
                responseType: 'blob'
            })
            .then((response) => {
                const blob = response.data;
                const url = URL.createObjectURL(blob);
                setMediaUrl(url);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Ошибка загрузки медиа:', err);
                setError('Не удалось загрузить файл');
                setLoading(false);
            });
        }
        
        // Очищаем URL при закрытии модала
        return () => {
            if (mediaUrl) {
                URL.revokeObjectURL(mediaUrl);
            }
        };
    }, [open, object, isImage, isVideo]);

    const getContentViewer = () => {
        if (!object) return null;
        
        if (loading) {
            return (
                <Box
                    sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <CircularProgress />
                </Box>
            );
        }
        
        if (error) {
            return (
                <Box
                    sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: 'error.main',
                    }}
                >
                    <Typography>{error}</Typography>
                </Box>
            );
        }
        
        if (isImage && mediaUrl) {
            return (
                <Box
                    sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <img 
                        src={mediaUrl} 
                        alt={fileName}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                        }}
                    />
                </Box>
            );
        }
        
        if (isVideo && mediaUrl) {
            return (
                <Box
                    sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <video 
                        src={mediaUrl} 
                        controls
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                        }}
                    />
                </Box>
            );
        }
        
        // Для остальных файлов показываем иконку
        return (
            <Box>
                <FileFormatIcon name={fileName} style={"list"}/>
            </Box>
        );
    }

    return (
        <Modal  open={open} onClose={onClose} sx={{position: 'fixed', top: 0}}>

                <Card variant="outlined"
                      sx={{
                          display: 'flex',

                          flexDirection: 'column',
                          width: '100%',
                          maxWidth: {lg: '1400px', md: '1000px', sm: '95%', xs: '95%'},
                          pl: {lg: 2, md: 2, sm: 1.5, xs: 1},
                          pr: {lg: 2, md: 2, sm: 1.5, xs: 1},
                          position: 'fixed',
                          transform: 'translate(-50%, -50%)',
                          left: '50%',
                          top: '50%',
                          height: {lg: '85vh', md: '80vh', sm: '75vh', xs: '70vh'},
                          maxHeight: {lg: '1200px', md: '900px', sm: '700px', xs: '600px'},
                          margin: 'auto',
                          backgroundColor: "modal",
                          backdropFilter: 'blur(16px)',
                          WebkitBackdropFilter: 'blur(16px)',
                          boxShadow: 5,
                          borderRadius: 2,
                          // position: "relative",
                          zIndex: 200
                      }}
                >

                    <IconButton
                        aria-label="close"
                        size="small"
                        onClick={onClose}
                        sx={{
                            position: 'absolute',
                            top: 5,
                            right: 5,
                            width: '25px',
                            height: '25px',
                            zIndex: 200

                        }}
                    >
                        <CloseIcon sx={{fontSize: '25px'}}/>
                    </IconButton>

                    {object &&
                    <>

                    <Box sx={{
                        m: 1,
                        pr: {lg: 2, md: 2, sm: 1, xs: 1},
                        ml: {lg: 1, md: 1, sm: 0.5, xs: 0.5},

                        // width: '100%',


                    }}>
                        <Typography
                            sx={{
                                width: '100%',
                                whiteSpace: 'nowrap',
                                userSelect: 'none',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >{extractSimpleName(fileName)}</Typography>
                    </Box>

                    <Box sx={{
                        width: '100%',
                        height: '100%',
                        maxHeight: {lg: '1100px', md: '800px', sm: '600px', xs: '500px'},
                        // backgroundColor: 'white',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        overflow: 'hidden',
                    }}>
                        {open && object && getContentViewer()}

                    </Box>

                    <Box sx={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        mt: 1,
                        mb: 1,
                        height: {lg: '40px', md: '35px', sm: '30px', xs: '30px'},
                    }}>
                        <Typography
                            sx={{
                                color: 'text.secondary',
                            }}
                        >Размер: {bytes(object.size)}</Typography>
                        <Typography
                            sx={{
                                color: 'text.secondary',
                            }}
                        >{object.lastModified && "Изменен: " && formatDate(object.lastModified)}</Typography>

                    </Box>
                    </>
                    }
                </Card>

        </Modal>
    );

};