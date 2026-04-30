import {Divider, ListItemIcon, MenuItem} from "@mui/material";
import {GitHub} from "@mui/icons-material";
import {useNavigate} from "react-router-dom";
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import {GITHUB_INFO} from "../../../UrlConstants.jsx";


export const AuthenticationMenuItems = () => {
    const navigate = useNavigate();

    return (
        [
            <MenuItem key="login" onClick={() => {
                navigate("/login");
            }}>
                <ListItemIcon>
                    <LoginIcon fontSize="small"/>
                </ListItemIcon> Вход
            </MenuItem>,
            <MenuItem key="reg" onClick={() => {
                navigate("/registration");
            }}>
                <ListItemIcon>
                    <PersonAddIcon fontSize="small"/>
                </ListItemIcon>
                Регистрация
            </MenuItem>,
            <Divider key="div-auth"/>,
            <MenuItem key="github" component="a"
                      href={GITHUB_INFO}
                      target="_blank" rel="noopener noreferrer"
                      sx={{'&:hover': {textDecoration: 'none', color: 'inherit',}}}
            >
                <ListItemIcon>
                    <GitHub fontSize="small"/>
                </ListItemIcon>
                Исходный код проекта
            </MenuItem>
        ]
    )
}