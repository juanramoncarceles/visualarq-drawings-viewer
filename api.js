/****** BASIC GOOGLE API FUNCTIONS ******/

/**
 * Retrieves id and name of the files that match the query object.
 * @param {Object} query Object with optional entries: name (str), parentId (str), trashed (bool), excludeName (str), and onlyFolder (bool)
 */
function listFiles(query) {
  const queryItems = [];
  if (query.name) queryItems.push('name=\'' + query.name + '\'');
  if (query.parentId) queryItems.push('\'' + query.parentId + '\' in parents');
  if (query.trashed === false) queryItems.push('trashed=false');
  if (query.excludeName) queryItems.push('not name contains \'' + query.excludeName + '\'');
  if (query.onlyFolder) queryItems.push('mimeType=\'application/vnd.google-apps.folder\'');
  let request = gapi.client.drive.files.list({
    'pageSize': 10,
    'fields': "nextPageToken, files(id, name)",
    'q': queryItems.join(' and ')
  });
  request.then(res => {
    const files = res.result.files;
    if (files && files.length > 0) {
      console.log(files);
    } else {
      console.log('No files found with this query:', queryItems.join(' and '));
    }
  }, err => {
    console.error(err.body);
  });
  return request;
}


/**
 * Returns a promise with the contents of the file.
 * @param {String} fileId
 */
function getFileContent(fileId) {
  let request = gapi.client.drive.files.get({
    fileId: fileId,
    alt: 'media'
  });
  request.then(res => {
    console.log(res.body);
  }, err => {
    console.error(err.body);
  });
  return request;
}


function getFileData(fileId, fields) {
  let request = gapi.client.drive.files.get({
    fileId: fileId,
    fields: fields
  });
  request.then(res => {
    console.log(JSON.parse(res.body));
  }, err => {
    console.error(err);
  });
  return request;
}


/**
 * Creates a new folder and returns its id
 * @param {String} title Folder name
 * @param {String} parentId Optional id of the parent folder, if none it will be created on the root
 */
function createFolder(title, parentId = 'drive') {
  const body = {
    "name": title,
    "mimeType": "application/vnd.google-apps.folder",
    "parents": parentId !== 'drive' ? [parentId] : [] // [parentId]
  }
  const request = gapi.client.request({
    'path': 'https://www.googleapis.com/drive/v3/files/',
    'method': 'POST',
    'body': body
  });
  return request.then(res => { // for batch request
    console.log(title + ' folder created. Id: ' + JSON.parse(res.body).id);
    return JSON.parse(res.body).id;
  });
}


/**
 * Uploads a file to the specified folder.
 * @param {String} fileContent The content as a string.
 * @param {String} fileMimeType The MIME Type of the file.
 * @param {String} fileName Name for the file.
 * @param {String} folderId Id of the parent folder.
 */
function uploadFile(fileContent, fileMimeType, fileName, folderId) {
  const file = new Blob([fileContent], { type: fileMimeType });
  const metadata = {
    'name': fileName, // Filename at Google Drive
    'mimeType': fileMimeType, // mimeType at Google Drive
    'parents': [folderId] // Folder ID at Google Drive
  };
  const accessToken = gapi.auth.getToken().access_token; // Here gapi is used for retrieving the access token.
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  let request = fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
    body: form,
  });
  request.then(res => {
    console.log(res);
  }, err => {
    console.error(err);
  });
  return request;
}




// Global object that will store all data
const appData = {
  appMainFolderId: undefined,
  projectsData: undefined,
  appSettingsFolderId: undefined,
  thumbsFolderId: undefined
}

/****** APP SPECIFIC FUNCTIONS ******/

/*
It is very important to disable the button and show some progress until some feedback form GD is received, otherwise
the user could click several times on the button and at the end several identical projects would be created
*/
async function createProject(file) {
  const fileContentRaw = await readInputFile(file);
  const fileContent = JSON.parse(fileContentRaw);
  console.log(fileContent);
  // TODO: Check if the file is valid... structure? contents?...


  // Check if the id of the appMainFolder is in the global data object
  // If not try to get it and if there is none one should be created
  if (!appData.appMainFolderId) {
    const appMainFolderRes = await listFiles({ name: 'VAviewerData', onlyFolder: true, trashed: false });
    const appMainFolderData = appMainFolderRes.result.files;
    if (appMainFolderData && appMainFolderData.length > 0) {
      appData.appMainFolderId = appMainFolderData[0].id;
    } else {
      appData.appMainFolderId = await createFolder('VAviewerData');
      console.log('No appFolder found, one is going to be created.');
    }
  }

  let projectFolderId;
  // Check if there is already a project with this name
  if (appData.projectsData === undefined) {
    projectFolderId = await createFolder(fileContent.projectInfo.title, appData.appMainFolderId);
    appData.projectsData = [{ id: projectFolderId, name: fileContent.projectInfo.title }];
  } else if (!appData.projectsData.find(proj => proj.name === fileContent.projectInfo.title)) {
    // Create project folder
    projectFolderId = await createFolder(fileContent.projectInfo.title, appData.appMainFolderId);
    appData.projectsData.push({ id: projectFolderId, name: fileContent.projectInfo.title });
  } else {
    // If there is one already something should be done
    console.log('There is already a project with this name.');
  }

  // Create drawings subfolder only if there are drawings and projectFolderId was succesful
  if (projectFolderId && fileContent.drawings) {
    // Create drawgins subfolder
    const drawingsFolderId = await createFolder('drawings', projectFolderId);
    appData.projectsData[appData.projectsData.length - 1].drawingsFolderId = drawingsFolderId;
    // Upload drawings
    const drawingsPromises = [];
    for (const drawing in fileContent.drawings) {
      const drawingPromise = uploadFile(fileContent.drawings[drawing], 'image/svg+xml', drawing.concat('.svg'), drawingsFolderId);
      drawingsPromises.push(drawingPromise);
    }
    drawingsUploadsRes = await Promise.all(drawingsPromises)
      .then(responses => {
        // TODO: Is it necessary to check for each response in drawingsUploadsRes that it was (res.ok === true && res.status === 200) ??
        console.log('Drawings uploaded successfully.');
      }, err => {
        console.error(err);
      });
  }

  // Create elementsData subfolder only if there is data and projectFolderId was succesful
  if (projectFolderId && fileContent.elementsData) {
    // Create elementsData subfolder
    const elementsDataFolderId = await createFolder('elementsData', projectFolderId);
    appData.projectsData[appData.projectsData.length - 1].elementsDataFolderId = elementsDataFolderId;
    // Upload elements data files
    const elementsDataPromises = [];
    for (const elementData in fileContent.elementsData) {
      const elementDataPromise = uploadFile(JSON.stringify(fileContent.elementsData[elementData]), 'application/json', elementData.concat('.json'), elementsDataFolderId);
      elementsDataPromises.push(elementDataPromise);
    }
    elementsDataUploadRes = await Promise.all(elementsDataPromises)
      .then(responses => {
        // TODO: Is it necessary to check for each response in drawingsUploadsRes that it was (res.ok === true && res.status === 200) ??
        console.log('ElementsData files uploaded successfully.');
      }, err => {
        console.error(err);
      });
  }

  // TODO Should return something else indicating if the process has been successful or not
  if (projectFolderId) { // Improve the check
    console.log('Upload successful. Uploaded ' + Object.keys(fileContent.drawings).length + ' drawings.');
  } else {
    console.log('Upload failed.');
  }
  return { id: projectFolderId, name: fileContent.projectInfo.title };
}




async function listProjectItems() {
  // Gets the id of the app folder using its name
  const appMainFolderRes = await listFiles({ name: 'VAviewerData', onlyFolder: true, trashed: false });
  const appMainFolderData = appMainFolderRes.result.files;
  if (appMainFolderData && appMainFolderData.length > 0) {
    appData.appMainFolderId = appMainFolderData[0].id;
  } else {
    console.log('No appFolder found.');
  }
  // Gets the project folders names and ids
  const projectsFoldersRes = await listFiles({ parentId: appData.appMainFolderId, onlyFolder: true, excludeName: 'appSettings', trashed: false });
  appData.projectsData = projectsFoldersRes.result.files;
  console.assert(appData.projectsData.length > 0, 'There are no project folders.');
  // Gets the id of the appSettings folder
  const appSettFolderRes = await listFiles({ parentId: appData.appMainFolderId, name: 'appSettings', onlyFolder: true });
  const appSettFolderData = appSettFolderRes.result.files;
  if (appSettFolderData && appSettFolderData.length > 0) {
    appData.appSettingsFolderId = appSettFolderData[0].id;
  } else {
    console.log('No settings folder found.');
  }
  // Gets the id of the projectsThumbs folder
  const thumbsFolderRes = await listFiles({ parentId: appData.appSettingsFolderId, name: 'projectsThumbs', onlyFolder: true });
  const thumbsFolderData = thumbsFolderRes.result.files;
  if (thumbsFolderData && thumbsFolderData.length > 0) {
    appData.thumbsFolderId = thumbsFolderData[0].id;
  } else {
    console.log('No thumbs folder found.');
  }
  // Gets the data of each thumbnail and assign it to its corresponding project
  const imgRes = await listFiles({ parentId: appData.thumbsFolderId });
  const imgData = imgRes.result.files;
  appData.projectsData.forEach(proj => {
    const projectThumbData = imgData.find(img => proj.id === img.name.replace('.jpg', ''));
    if (projectThumbData) {
      proj.thumbId = projectThumbData.id;
    }
  });
  console.assert(imgData.length > 0, 'There are no thumbnails.');

  // Create the project items
  appData.projectsData.forEach(proj => {
    const projectItem = createProjectItem(proj);
    projectsContainer.appendChild(projectItem);
  });
}

function createProjectItem(projData) {
  const projItem = document.createElement('button');
  projItem.dataset.projId = projData.id;
  projItem.classList.add('projectItem');
  let projItemContent;
  if (projData.thumbId) {
    projItemContent = `<img src='https://drive.google.com/uc?id=${projData.thumbId}'>`;
  } else {
    projItemContent = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><circle r="50" cx="100" cy="100"></circle></svg>`;
  }
  projItem.innerHTML = projItemContent.concat(`<h4>${projData.name}</h4>`);
  return projItem;
}

function updateProjectsList(projData) {
  const projectItem = createProjectItem(projData);
  projectsContainer.appendChild(projectItem);
}

const projListContainer = document.getElementById('projectsList');
const projectsContainer = document.getElementById('projects');

projectsContainer.addEventListener('click', e => {
  const projectItem = e.target.closest('[data-proj-id]');
  // TODO si se esta trabajando en un proyecto preguntar si se quiere guardar
  fetchProject(projectItem.dataset.projId)
    .then(res => {
      createWorkspace(res);
      projListContainer.style.display = 'none';
      history.replaceState({ projectTitle: res.name }, res.name, "?id=" + projectItem.dataset.projId); // encodeURIComponent(proj.id) ?
    });
});



async function fetchProject(projectId) {
  let projectIndex;
  if (appData.projectsData === undefined) {
    const projectNameRes = await getFileData(projectId, 'name');
    appData.projectsData = [{ id: projectId, name: JSON.parse(projectNameRes.body).name }];
    projectIndex = 0;
  } else {
    projectIndex = appData.projectsData.findIndex(proj => proj.id === projectId);
  }

  // TODO Hay que comprovar que realmente exista un proyecto con ese id...
  console.log('Loading project: ' + projectId);

  // Get the content of the projectSettings.json file:
  if (!appData.projectsData[projectIndex].projSettings) {
    const projSettingsRes = await listFiles({ parentId: projectId, name: 'projectSettings.json' });
    const projSettingsData = projSettingsRes.result.files;
    if (projSettingsData && projSettingsData.length > 0) {
      // Get the content projectSettings.json file:
      const projSettingsContentRes = await getFileContent(projSettingsData[0].id);
      appData.projectsData[projectIndex].projSettings = projSettingsContentRes.body;
    } else {
      console.log('No projectSettings.json found.');
    }
  }

  // Get the id of the drawings folder and then the data of the drawings
  if (!appData.projectsData[projectIndex].drawings) {
    const drawingsFolderRes = await listFiles({ parentId: projectId, onlyFolder: true, name: 'drawings' });
    const drawingsFolderData = drawingsFolderRes.result.files;
    if (drawingsFolderData && drawingsFolderData.length > 0) {
      const drawingsRes = await listFiles({ parentId: drawingsFolderData[0].id });
      appData.projectsData[projectIndex].drawings = drawingsRes.result.files;
    } else {
      console.log('No drawings folder found.');
    }
  }

  // Get the id of the elementsData folder and then the data of the files
  if (!appData.projectsData[projectIndex].elementData) {
    const elementsDataFolderRes = await listFiles({ parentId: projectId, onlyFolder: true, name: 'elementsData' });
    const elementsDataFolderData = elementsDataFolderRes.result.files;
    if (elementsDataFolderData && elementsDataFolderData.length > 0) {
      const elementsDataRes = await listFiles({ parentId: elementsDataFolderData[0].id });
      appData.projectsData[projectIndex].elementsData = elementsDataRes.result.files;
    } else {
      console.log('No elementsData folder found.');
    }
  }

  // Get the id of the images folder and then the data of the images
  if (!appData.projectsData[projectIndex].images) {
    const imagesFolderRes = await listFiles({ parentId: projectId, onlyFolder: true, name: 'images' });
    const imagesFolderData = imagesFolderRes.result.files;
    if (imagesFolderData && imagesFolderData.length > 0) {
      const imagesRes = await listFiles({ parentId: imagesFolderData[0].id });
      appData.projectsData[projectIndex].images = imagesRes.result.files;
    } else {
      console.log('No images folder found.');
    }
  }

  console.log('Project fetched succesfully.');
  // TODO Should return something else indicating if the process has been successful or not
  return appData.projectsData[projectIndex];
}