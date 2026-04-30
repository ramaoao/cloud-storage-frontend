import React, {useState} from "react";
import {Box, Button, Modal, Slide, Typography} from "@mui/material";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import ValidatedFileName from "../../components/InputElements/TextField/ValidatedFileName.jsx";
import {useStorageNavigation} from "../../context/Storage/StorageNavigationProvider.jsx";
import {sendCreateFolder} from "../../services/fetch/auth/storage/SendCreateFolder.js";
import ConflictException from "../../exception/ConflictException.jsx";
import {useNotification} from "../../context/Notification/NotificationProvider.jsx";
import NotFoundException from "../../exception/NotFoundException.jsx";
import BadRequestException from "../../exception/BadRequestException.jsx";
import { mapToFrontFormat } from "../../services/util/FormatMapper.js";

export default function FolderNameModal({
                                            open,
                                            onClose
                                        }) {

    const {currentFolderId, createSpoofObject} = useStorageNavigation();
    const {showError, showSuccess, showWarn} = useNotification();

    const [filename, setfilename] = useState('');
    const [filenameError, setFilenameError] = useState('');


    const handleSave = async () => {

        try {
            // Use UUID-based API with parentId (currentFolderId can be null for root)
            const folderName = filename.trim();
            const created = await sendCreateFolder(folderName, currentFolderId);
            showSuccess("Папка " + folderName + " успешно создана", 5000);

            // Optimistic UI: insert created folder using canonical mapper
            if (created?.id) {
                createSpoofObject(mapToFrontFormat(created));
            }
        } catch (error) {
            switch (true) {
                case error instanceof ConflictException:
                case error instanceof NotFoundException:
                case error instanceof BadRequestException:
                    showWarn(error.message);
                    break;
                default:
                    showError("Не удалось создать папку. Попробуйте позже");
                    console.log('Неизвестная ошибка возникла! ');
            }
        }
        setfilename("");
        onClose();
    };

    const closeCorrect = () => {
        setfilename("");
        onClose()
    };


    return (
        <Modal open={open} onClose={closeCorrect}>
            <Slide in={open} direction={'down'} style={{transform: "translate(-50%, 0%)", marginTop: "70px"}}>
                <Card variant="outlined"
                      sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          width: {sm: '400px', xs: '100%'},
                          maxWidth: {sm: '400px', xs: '90%'},
                          padding: 2,
                          gap: 2,
                          margin: 'auto',
                          backgroundColor: "modal",
                          backdropFilter: 'blur(6px)',
                          WebkitBackdropFilter: 'blur(6px)',
                          boxShadow: 5,
                          borderRadius: 2,
                          position: "relative",
                      }}
                >
                    <IconButton
                        aria-label="close"
                        size="small"
                        onClick={closeCorrect}
                        sx={{
                            position: 'absolute',
                            top: 5,
                            right: 5,
                            width: '25px',
                            height: '25px',
                        }}
                    >
                        <CloseIcon sx={{fontSize: '25px'}}/>
                    </IconButton>

                    <Typography variant="h5" textAlign="center" sx={{width: '100%', mb: -1}}>
                        Новая папка
                    </Typography>

                    <Box sx={{display: 'flex', flexDirection: 'column', gap: 1,}}>


                        <ValidatedFileName
                            filename={filename}
                            filenameError={filenameError}
                            setFilename={setfilename}
                            setFilenameError={setFilenameError}
                            label={"Название папки"}
                        />

                        <Box display="flex" justifyContent="flex-end" gap={2}>
                            <Button size="small" variant="outlined" onClick={closeCorrect}>
                                Cancel
                            </Button>
                            <Button
                                size="small"
                                variant="contained"
                                onClick={handleSave}
                                disabled={filenameError || filename.trim().length === 0}
                            >
                                Save
                            </Button>
                        </Box>

                    </Box>
                </Card>
            </Slide>
        </Modal>
    );

};