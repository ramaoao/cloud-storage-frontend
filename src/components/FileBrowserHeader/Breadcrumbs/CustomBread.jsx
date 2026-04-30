import {Box, Breadcrumbs, Chip} from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import {useStorageNavigation} from "../../../context/Storage/StorageNavigationProvider.jsx";
import HomeIcon from "@mui/icons-material/Home";


export const CustomBread = () => {

    const {
        breadcrumbs,
        goToBreadcrumb,
        loadRootFolder,
        isRootFolder
    } = useStorageNavigation();

    return (
        <Box sx={{display: 'flex',mt: '10px', maxHeight: '28px',  height: '28px', alignContent: 'center', alignItems: 'center'}}>
            <Chip
                icon={<HomeIcon/>}
                onClick={loadRootFolder}
                sx={{
                    cursor: 'pointer',
                    pl: '10px',
                    transition: 'text-shadow 0.3s ease',
                    '&:hover': {boxShadow: '0 0 10px rgba(25, 118, 210,1)',},
                }}
            />
            {breadcrumbs.length > 0 &&
                <NavigateNextIcon sx={{color: 'text.secondary', height: '32px'}} fontSize="small"/>}

            <Breadcrumbs sx={{ ml: 1, minWidth: "max-content"}}
                         separator={<NavigateNextIcon fontSize="small"/>}>
                {breadcrumbs.map((item, index) => {
                        let lastElement = index === breadcrumbs.length - 1;

                        return (
                            <Chip
                                key={item.id}
                                label={item.name}
                                sx={{
                                    maxWidth: '120px',
                                    cursor: !lastElement ? 'pointer' : 'default',
                                    height: '25px',
                                    backgroundColor: lastElement ? 'info.main' : '',
                                    transition: 'text-shadow 0.3s ease',
                                    '&:hover': {
                                        boxShadow: !lastElement ? '0 0 10px rgba(25, 118, 210,1)' : '',
                                        backgroundColor: lastElement ? 'info.main' : '',
                                    },
                                }}
                                onClick={() => !lastElement && goToBreadcrumb(index)}
                            />
                        )
                    }
                )
                }
            </Breadcrumbs>
        </Box>
    )

}