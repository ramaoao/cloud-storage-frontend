import {Box} from "@mui/material";
import StorageTileObject from "./StorageObject/StorageTileObject.jsx";
import {useStorageNavigation} from "../../context/Storage/StorageNavigationProvider.jsx";
import {AnimatePresence, motion} from "framer-motion";
import React, {useRef, useState} from "react";
import StorageListObject from "./StorageObject/StorageListObject.jsx";
import './selected.css';
import {FileSelection} from "../Selection/FileSelection.jsx";
import {useStorageView} from "../../context/Storage/StorageViewProvider.jsx";
import {useStorageSelection} from "../../context/Storage/StorageSelectionProvider.jsx";
import {useStorageOperations} from "../../context/Files/FileOperationsProvider.jsx";
import FilePreviewModal from "../../modals/FilePreviewModal/FilePreviewModal.jsx";
import SearchObject from "./StorageObject/SearchObject.jsx";

export const ObjectsContainer = () => {

    const allowToCut = window.APP_CONFIG.isCutPasteAllowed;
    const allowShortcuts = window.APP_CONFIG.isShortcutsAllowed;

    const {folderContent, searchedContent, isSearchMode, getObjectById} = useStorageNavigation();
    const {filesView, sortFolder} = useStorageView();
    const {
        selectedIds, setSelectedIds, setSelectionMode,
        bufferIds,
        startCopying,
        startCutting,
        setBufferWithMetadata,
    } = useStorageSelection();
    const {deleteObject, pasteObjects} = useStorageOperations();

    const animationVariants = {
        hidden: {opacity: 0},
        visible: {opacity: 1},
        exit: {opacity: 0}
    };


    const [objectPreview, setObjectPreview] = useState(null);

    const handleOpenPreview = (object) => {
        setObjectPreview(object);
        setPreviewModal(true);

    }

    const [previewModal, setPreviewModal] = React.useState(false);

    const handleClosePreview = () => {
        setPreviewModal(false);


        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
        // setTimeout(() => setPreviewModal(false), 200)
    }

    const containerRef = useRef(null);
    const moveableRef = useRef(null);
    const selectoRef = useRef(null);

    const handleKeyDown = (event) => {
        event.stopPropagation();
        if(!allowShortcuts){
            return;
        }

        const key = event.key;

        if (key === "Delete" || key === "Del") {
            if (selectedIds.length > 0) {
                deleteObject(selectedIds);
                setSelectionMode(false);
                setSelectedIds([]);
            }
        }

        if ((event.ctrlKey || event.metaKey) && allowToCut && (key === "x" || key === "X" || key === "Ч" || key === "ч")) {
            event.preventDefault();

            if (selectedIds.length > 0) {
                // Collect metadata for each selected item
                const metadata = {};
                selectedIds.forEach(id => {
                    const obj = getObjectById(id);
                    if (obj) {
                        let name = obj.name || id;
                        if (name.endsWith('/')) {
                            name = name.slice(0, -1);
                        }
                        metadata[id] = {
                            displayName: name,
                            isFolder: obj.type === 'DIRECTORY'
                        };
                    } else {
                        metadata[id] = {
                            displayName: id,
                            isFolder: false
                        };
                    }
                });
                setBufferWithMetadata(selectedIds, metadata);
            }
        }

        if ((event.ctrlKey || event.metaKey) && allowToCut &&(key === "v" || key === "V" || key === "м" || key === "М")) {
            event.preventDefault();

            if (bufferIds.length > 0) {
                pasteObjects();
            }
        }
    };


    return (
        <AnimatePresence mode="wait">


            <motion.div
                key={`${folderContent?.map(item => item.id || item.name).join(",")}`}
                initial="hidden"
                animate="visible"
                variants={animationVariants}
                transition={{duration: 0.2}}
            >
                <FilePreviewModal open={previewModal} onClose={handleClosePreview} object={objectPreview}/>


                {
                    (filesView === 'regularTiles' || filesView === 'largeTiles') && !isSearchMode
                        ?
                        <Box

                            ref={containerRef}
                            className={"elements"}
                            onKeyDown={handleKeyDown}
                            tabIndex={0}
                            sx={{
                                width: '100%',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(min(' + (filesView === 'largeTiles' ? '150px' : '100px') + ',100%), 1fr))',
                                gap: 1,
                                pb: 30,
                                '&:focus': {
                                    outline: 'none',
                                },
                            }}

                        >
                            {
                                folderContent && !isSearchMode ?
                                    sortFolder(folderContent).map(
                                        (item) => <StorageTileObject key={item.id || item.name}
                                                                     selectedIds={selectedIds}
                                                                     bufferIds={bufferIds}
                                                                     object={item}
                                                                     style={filesView}
                                                                     handlePreview={handleOpenPreview}
                                        />)
                                    :
                                    sortFolder(searchedContent).map(
                                        (item) => <SearchObject key={item.id || item.path || item.name}
                                                                object={item}
                                                                style={filesView}
                                                                bufferIds={bufferIds}
                                                                handlePreview={handleOpenPreview}
                                                                selectedIds={selectedIds}/>)

                            }

                        </Box>
                        :
                        <Box
                            ref={containerRef}
                            className={"elements"}
                            onKeyDown={handleKeyDown}
                            tabIndex={0}

                            sx={{
                                width: '100%',
                                display: 'grid',
                                gap: 0.8,
                                pb: 30,
                                '&:focus': {
                                    outline: 'none',

                                },
                            }}
                        >
                            {folderContent && !isSearchMode ?

                                sortFolder(folderContent).map(
                                    (item) => <StorageListObject key={item.id || item.name}
                                                                 object={item}
                                                                 style={filesView}
                                                                 bufferIds={bufferIds}
                                                                 handlePreview={handleOpenPreview}
                                                                 selectedIds={selectedIds}/>)
                                :
                                sortFolder(searchedContent).map(
                                    (item) => <SearchObject key={item.id || item.path || item.name}
                                                            object={item}
                                                            style={filesView}
                                                            bufferIds={bufferIds}
                                                            handlePreview={handleOpenPreview}
                                                            selectedIds={selectedIds}/>)
                            }
                        </Box>
                }

                <FileSelection containerRef={containerRef} selectedIds={selectedIds} moveableRef={moveableRef}
                               selectoRef={selectoRef}
                               setSelectedIds={setSelectedIds}/>


            </motion.div>

        </AnimatePresence>
    )


}