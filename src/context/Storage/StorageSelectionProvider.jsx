import React, {createContext, useContext, useState} from "react";


const CloudStorageContext = createContext();

export const useStorageSelection = () => useContext(CloudStorageContext);


export const StorageSelectionProvider = ({children}) => {
    const [isSelectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    const [isCutMode, setCutMode] = useState(false);

    const [bufferIds, setBufferIds] = useState([]);
    const [bufferMetadata, setBufferMetadata] = useState({});



    const startCutting = () => {
        setBufferIds(selectedIds);
        setCutMode(true);

        setSelectedIds([]);
        setSelectionMode(false);
    }

    const endCutting = () => {
        setBufferIds([]);
        setBufferMetadata({});
        setCutMode(false);
    }

    const endCopying = () => {
        setBufferIds([]);
        setCutMode(false);
    }

    const setBufferWithMetadata = (ids, metadata) => {
        setBufferIds(ids);
        setBufferMetadata(metadata);
        setCutMode(true);
    };

    return (<CloudStorageContext.Provider
        value={{
            isSelectionMode,
            setSelectionMode,
            selectedIds,
            setSelectedIds,

            bufferIds,
            bufferMetadata,
            setBufferWithMetadata,

            isCutMode,
            startCutting,
            endCutting,
            endCopying
        }}>
        {children}
    </CloudStorageContext.Provider>);
}