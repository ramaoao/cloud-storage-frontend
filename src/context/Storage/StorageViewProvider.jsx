import React, {createContext, useContext, useState} from "react";
import {useStorageSelection} from "./StorageSelectionProvider.jsx";


const CloudStorageContext = createContext();

export const useStorageView = () => useContext(CloudStorageContext);


export const StorageViewProvider = ({children}) => {
    const {setSelectedIds, setSelectionMode} = useStorageSelection();

    const [filesView, setFilesView] = useState(() => {
        const view = localStorage.getItem('filesView');
        return view ? view : 'regularTiles';
    });

    const toggleFilesView = (mode) => {
        setSelectionMode(false);
        setSelectedIds([]);

        setFilesView(() => {
            localStorage.setItem('filesView', mode);
            return mode;
        })
    };

    const turnRegularTiles = () => toggleFilesView('regularTiles');
    const turnLargeTiles = () => toggleFilesView('largeTiles');
    const turnList = () => toggleFilesView('list');


    const buildSortFunction = () => {
        // Возвращаем стабильную функцию сравнения для всех элементов (папки и файлы)
        return (a, b) => {
            if (sortParameter === 'name') {
                return sortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            }

            if (sortParameter === 'size') {
                const av = a.size || 0;
                const bv = b.size || 0;
                return sortDirection === 'asc' ? av - bv : bv - av;
            }

            if (sortParameter === 'date') {
                // Безопасно обрабатываем null/undefined даты
                const aTime = a.lastModified ? new Date(a.lastModified).getTime() : (sortDirection === 'asc' ? Infinity : -Infinity);
                const bTime = b.lastModified ? new Date(b.lastModified).getTime() : (sortDirection === 'asc' ? Infinity : -Infinity);
                return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
            }

            return 0;
        };
    }

    const [sortDirection, setSortDirection] = useState(
        () => {
            const dir = localStorage.getItem('sortDirection');
            return dir ? dir : 'asc';
        });

    const [sortParameter, setSortParameter] = useState(
        () => {
            const par = localStorage.getItem('sorting');
            return par ? par : 'name';
        });

    const sortFolder = (content) => {
        const comparator = buildSortFunction();
        let folders = content.filter(item => item.folder);
        let files = content.filter(item => !item.folder);

        // Сортируем и папки, и файлы единой функцией (не только файлы)
        folders = folders.slice().sort(comparator);
        files = files.slice().sort(comparator);

        return [...folders, ...files];
    }

    const setNameSort = () => {
        setSortParameter('name');
        localStorage.setItem("sorting", "name");
    }

    const setSizeSort = () => {
        setSortParameter('size');
        localStorage.setItem("sorting", "size");
    }

    const setDateSort = () => {
        setSortParameter('date');
        localStorage.setItem("sorting", "date");
    }

    const setDesc = () => {
        setSortDirection("desc")
        localStorage.setItem("sortDirection", "desc");
    }

    const setAsc = () => {
        setSortDirection("asc")
        localStorage.setItem("sortDirection", "asc");
    }

    return (<CloudStorageContext.Provider
        value={{
            filesView,
            turnLargeTiles,
            turnRegularTiles,
            turnList,

            sortFolder,
            setNameSort,
            setSizeSort,
            setDateSort,
            setDesc,
            setAsc,
            sortParameter,
            sortDirection
        }}>
        {children}
    </CloudStorageContext.Provider>);
}