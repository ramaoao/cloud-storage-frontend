window.APP_CONFIG = {

    //ссылка на ваш гитхаб репозиторий с проектом
    githubLink: "https://gist.github.com/zhukovsd/1052313b231bb1eebd5b910990ee1050",

    //Имя, которое отображается в хедере
    mainName: "CLOUD STORAGE",

    //адрес вашего бэка. если пустой - значит на одном url с таким же портом.
    //если запускаете бэк и фронт через докер compose - тут ставите имя бэка в докер сети
    baseUrl: "",

    //API префикс вашего бэка
    baseApi: "/api",


    /*
    *
    * Конфигурация валидации форм
    *
    * */

    //Если true - форма будет валидироваться,
    //ошибки будут отображаться при вводе. Кнопка будет активна только при валидных данных
    //Если false - форму можно отправить без валидации.
    validateLoginForm: true,
    validateRegistrationForm: true,

    //корректное имя пользователя
    validUsername: {
        minLength: 5,
        maxLength: 20,
        pattern: "^[a-zA-Z0-9]+[a-zA-Z_0-9]*[a-zA-Z0-9]+$",
    },

    //корректный пароль
    validPassword: {
        minLength: 5,
        maxLength: 20,
        pattern: "^[a-zA-Z0-9!@#$%^&*(),.?\":{}|<>[\\]/`~+=-_';]*$",
    },

    //корректное имя для папки
    validFolderName: {
        minLength: 1,
        maxLength: 200,
        pattern: "^[^/\\\\:*?\"<>|]+$",
    },


    /*
    *
    * Утилитные конфигурации
    *
    * */

    //Разрешать ли перемещение выделенных файлов и папок с помощью перетаскивания в соседние папки. (drag n drop)
    isMoveAllowed: true,

    //Разрешить вырезать и вставлять файлы/папки. Для этого используется эндпоинт /move  - если у вас реализован, то всё должно работать
    isCutPasteAllowed: true,

    //Разрешить кастомное контекстное меню для управления файлами (вызывается правой кнопкой мыши - на одном файле, или на выделенных)
    isFileContextMenuAllowed: true,

    //Разрешить шорткаты на странице - Ctrl+X, Ctrl+V, Del - на выделенных элементах
    isShortcutsAllowed: true,

    //набор утилитных функций для взаимодействия с фронтом.
    functions: {

        //функциия для маппинга формата данных бэка в формат фронта.
        //Если бэк с форматом Сергея - можно не менять.
        //Какие особенности формата ФРОНТА есть (если бэк отличается и вы будете реализовывать свой функционал)
        //1) path в фронт данных должен содержать полный путь до объекта от корневой папки.
        //   Если объект - папка, то path в конце должен обязательно содержать слэш
        //2) То же самое касается name - если объект это папка - в конце должен быть слэш
        //   если ваш бэк отдает obj.name для папок без слэша в конце - в этой
        //   функции добавьте слэш для папок в конце

        // Маппер для новой ID-based архитектуры
        // Backend отдает ResourceInfoDto: {id, parentId, name, size, type, updatedAt}
        // Frontend использует ID-based навигацию вместо path-based
        mapObjectToFrontFormat: (obj) => {
            // Нормализуем возможные форматы даты (строка ISO, timestamp в сек/мс)
            const normalizeDate = (val) => {
                if (!val) return null;
                if (typeof val === 'string') {
                    const t = Date.parse(val);
                    return isNaN(t) ? null : new Date(t).toISOString();
                }
                if (typeof val === 'number') {
                    const ms = (val < 1e12) ? val * 1000 : val;
                    return new Date(ms).toISOString();
                }
                return null;
            };

            const isFolder = obj.type === "DIRECTORY";
            const withTrailingSlash = (name) => {
                if (!name) return name;
                return name.endsWith('/') ? name : (name + '/');
            };
            
            return {
                // ID-based навигация (UUID)
                id: obj.id,
                parentId: obj.parentId,
                
                // Данные ресурса
                // The UI relies on trailing '/' for folders (icons, search, etc.)
                name: isFolder ? withTrailingSlash(obj.name) : obj.name,
                size: obj.size,
                folder: isFolder,
                
                // Метаданные
                lastModified: normalizeDate(obj.updatedAt),
                
                // Для совместимости со старым кодом (если нужно)
                type: obj.type,
                path: null  // Больше не используется, но оставляем для safety
            };
        },

    }

};