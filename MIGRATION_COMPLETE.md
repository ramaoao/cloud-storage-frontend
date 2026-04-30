## Frontend ID-Based Migration - Completion Guide

### ✅ WHAT'S BEEN COMPLETED

The frontend has been successfully migrated from path-based to ID-based architecture:

1. **DTO Mapper** (`config.js`)
   - Maps `ResourceInfoDto` structure: `{id, parentId, name, size, type, updatedAt}`
   - Returns: `{id, parentId, name, size, folder, lastModified, type}`

2. **Navigation System** (`StorageNavigationProvider.jsx`)
   - State changed: `folderPath[]` → `currentFolderId` (UUID)
   - New: `breadcrumbs[]` for navigation history
   - Functions: `loadRootFolder()`, `loadFolderById(id)`, `goToFolder(object)`, `goToBreadcrumb(index)`

3. **API Functions** (all in `src/services/fetch/auth/storage/`)
   - `SendGetDirectoryRoot.js` - fetch root
   - `SendGetDirectoryContent.js` - fetch folder by ID
   - `SendDeleteResource.js` - delete by ID
   - `SendMoveResource.js` - move to folder
   - `SendRenameResource.js` - rename
   - `SendSearchResources.js` - search
   - `SendUploadInit.js` - 2-step upload init
   - `SendUploadConfirm.js` - confirm upload

4. **Components**
   - `StorageTileObject.jsx` - uses `object.id` instead of `object.path`
   - `StorageListObject.jsx` - same as tile
   - `RenameModal.jsx` - works with UUID and new names
   - `FileSelection.jsx` - drag-n-drop uses IDs

5. **Operations** (`FileOperationsProvider.jsx`)
   - `deleteObject(ids)` - takes UUID array
   - `moveObjects(ids, targetFolderId)` - uses UUIDs
   - `renameObject(resourceId, newName)` - ID + new name
   - All execute functions updated to use new API

### ⚠️ STILL TODO (Not Critical for MVP)

1. **Upload UI** 
   - Need to implement actual file upload to presigned URLs
   - Progress tracking with 2-step flow
   - Files: component using `SendUploadInit` + `SendUploadConfirm`

2. **Search Integration**
   - Update `HeaderSearchField.jsx` to use `SendSearchResources`
   - Map search results properly

3. **Breadcrumb Display**
   - Create breadcrumb component from `breadcrumbs[]`
   - Update URL bar to show folder ID instead of path

4. **Download & Other Operations**
   - Download should already work (uses ID-based API)
   - Verify error messages match new API responses

### 🔧 HOW TO TEST

1. **Navigation**
   ```
   - Click on folder → should call loadFolderById(id)
   - Should update breadcrumbs array
   - Clicking breadcrumb should navigate correctly
   ```

2. **Delete**
   ```
   - Select file and delete
   - Should call sendDeleteResource(id)
   - Folder should refresh
   ```

3. **Rename**
   ```
   - Select file and rename
   - Modal should appear
   - Should call sendRenameResource(id, newName)
   ```

4. **Move** (Drag-n-Drop)
   ```
   - Drag file into folder
   - Should call moveObjects([id], targetFolderId)
   ```

5. **Search**
   ```
   - Type in search box
   - Should search by name
   - Results should work with ID structure
   ```

### 📋 KEY API ENDPOINTS

All now use UUIDs and hierarchical structure:

```
GET  /directory/root                    - root contents
GET  /directory/{folderId}              - folder contents  
POST /directory                         - create folder (params: ?parentId=UUID)

GET  /resource/{id}                     - resource info
DELETE /resource/{id}                   - delete resource
PUT  /resource/{id}/move                - move (body: {targetFolderId})
PUT  /resource/{id}/rename              - rename (body: {newName})
GET  /resource/search?query={q}         - search

POST /resource/upload/init              - get presigned URLs
POST /resource/upload/confirm           - confirm upload
GET  /resource/{id}/download            - download stream
```

### 🎯 ARCHITECTURE BENEFITS

✅ **Security**
- No path manipulation possible
- All IDs are UUIDs
- Backend validates userId on every request
- Prevents path traversal attacks

✅ **Performance**
- Single ID lookup vs path parsing
- Fewer string operations
- Better indexing on database

✅ **Reliability**
- No ambiguous path concatenation
- Clear parent-child relationships
- Supports moving entire subtrees

✅ **Scalability**
- Works with deep nesting
- Tree structure is native to DB
- Easy to add permissions per folder

### 📝 NOTES FOR DEVELOPERS

1. When dealing with IDs, remember:
   - They are UUIDs (36 characters with dashes)
   - Never null for existing resources, can be null for root parent
   - Always validate on backend

2. Frontend always receives:
   - `currentFolderId` - current folder UUID or null for root
   - `breadcrumbs` - array of {id, name} objects
   - `folderContent` - array of ResourceInfoDto objects

3. When displaying names:
   - Use `object.name` (no slash at end anymore)
   - Use `object.folder` boolean to check type
   - No need for string manipulation of paths

4. Error handling:
   - All exceptions are REST-based (HTTP status codes)
   - Backend returns consistent error format: `{message: string}`
   - Use existing exception handling from `ThrowSpecifyException`
