import { ApplicationData } from './appData';
import { ProjectData } from './projectData';
import { Application } from './app';
import Generics from './generics';
import API from './api';

/************************** AUTHENTICATION *************************/

// Client ID and API key from the Developer Console
const CLIENT_ID = '199844453643-0s921ir25l6rrventemkvr5te5aattej.apps.googleusercontent.com';
const API_KEY = 'AIzaSyDgot_h8p7RzZunGoSDVlKxrpUNN97rPeg';

// Array of API discovery doc URLs for APIs used by the quickstart
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = 'https://www.googleapis.com/auth/drive';

const authorizeButton = document.getElementById('authorizeBtn');
const signoutButton = document.getElementById('signoutBtn');

/**
 *  On load, called to load the auth2 library and API client library.
 */
(function () {
  const script = document.createElement('script');
  script.type = "text/javascript";
  script.defer = true;
  script.onload = () => handleClientLoad();
  script.src = 'https://apis.google.com/js/api.js';
  document.querySelector('body').appendChild(script);
})();

function handleClientLoad() {
  gapi.load('client:auth2', initClient);
}

/**
 *  Initializes the API client library and sets up sign-in state listeners.
 */
function initClient() {
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPES
  }).then(function () {
    // Listen for sign-in state changes.
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

    // Handle the initial sign-in state.
    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    authorizeButton.onclick = handleAuthClick;
    signoutButton.onclick = handleSignoutClick;
  }, function (error) {
    console.log(JSON.stringify(error, null, 2));
  });
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    console.log('Authorized.');
    startApp();
  } else {
    console.log('Not authorized');
    showLoginDialog();
  }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick(event) {
  gapi.auth2.getAuthInstance().signIn();
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick(event) {
  gapi.auth2.getAuthInstance().signOut();
}


/*************** OBJECT WITH THE HTML ELEMENTS REFS ****************/

const App = new Application();


/**************** GLOBAL OBJECTS TO STORE APP DATA *****************/

const AppData = new ApplicationData();

const lastUploadedProject = new ProjectData();

const currentProject = new ProjectData();


/************************ THE PROJECTS LIST ************************/

const projectsListContainer = document.getElementById('projectsListContainer');
const projectsList = document.getElementById('projectsList');
const closeProjectsListBtn = document.getElementById('closeProjectsListBtn');

/**
 * Create an HTML element with the project data provided.
 * @param {Object} projData Object with name, id and optional thumbId entries.
 */
function createProjectItem(projData) {
  const projItem = document.createElement('button');
  // Projects that have been uploaded but not send to the backend have an id of 'temporal'.
  if (projData.id === 'temporal') {
    projItem.classList.add('unsync');
  }
  projItem.dataset.projId = projData.id;
  projItem.dataset.name = projData.name;
  projItem.classList.add('projectItem');
  let projItemContent;
  if (projData.thumbId) {
    projItemContent = `<img src='https://drive.google.com/uc?id=${projData.thumbId}'>`;
  } else {
    projItemContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -50 350 210"><path d="M143,10.44H65.27V7a7,7,0,0,0-7-7H7A7,7,0,0,0,0,7V103a7,7,0,0,0,7,7H65V70.18H85V110h58a7,7,0,0,0,7-7V17.41A7,7,0,0,0,143,10.44ZM125,53.49H105v-20h20Z" style="fill:#e6e6e6"/></svg>`;
  }
  projItem.innerHTML = projItemContent.concat(`<h4>${projData.name}</h4>`);
  return projItem;
}

/**
 * Receives an array of projects data and creates and appends the HTML items.
 * @param {Array} projectsData The project objects with the name, id and optional thumbId entries.
 */
function createHTMLProjectsList(projectsData) {
  projectsData.forEach(proj => {
    const projectItem = createProjectItem(proj);
    projectsList.appendChild(projectItem);
  });
  adjustItems();
}

// Stores the active item in the projects list
let previousActiveItem;

/**
 * Shows the list of projects container and fetches projects if required.
 */
function showProjectsList() {
  console.log('Show the projects list.');
  if (currentProject.id) {
    closeProjectsListBtn.style.display = 'unset';
  }
  projectsListContainer.style.display = 'block';
  // Hide the drawings and tools buttons
  App.drawingsBtns.style.display = 'none';
  App.toolbarsContainer.style.display = 'none';
  // If there is no projectsData in the appData object or if there is only one fetch projects.
  if (AppData.projectsData === undefined || AppData.projectsData.length <= 1) {
    showViewportDialog('loader', 'Loading projects');
    API.listProjectItems(AppData).then(res => {
      createHTMLProjectsList(res);
      // Set the current class in the current project.
      projectsList.childNodes.forEach(proj => {
        if (proj.dataset && proj.dataset.projId === currentProject.id) {
          proj.classList.add('current');
          previousActiveItem = proj;
        }
      });
      hideViewportMessage();
    }, rej => {
      projectsList.innerHTML = '<p class="empty-msg">There are no projects. Upload one!</p>';
      hideViewportMessage();
    });
  }
}

App.projectsListBtn.addEventListener('click', showProjectsList);

closeProjectsListBtn.addEventListener('click', () => {
  projectsListContainer.style.display = 'none';
  App.drawingsBtns.style.display = 'unset';
  App.toolbarsContainer.style.display = 'flex';
});

/**
 * Adjusts the position of project items in the container.
 */
function adjustItems() {
  const itemsH = getComputedStyle(projectsList).getPropertyValue('--items-h');
  const itemsTotal = projectsList.children.length;
  projectsList.style.setProperty('--remaining-items', (Math.ceil(itemsTotal / itemsH) * itemsH) - itemsTotal);
}

window.onresize = adjustItems;

projectsList.addEventListener('click', e => {
  const projectItem = e.target.closest('[data-proj-id]');
  if (projectItem === null) {
    return;
  }
  // If it is the current project close the list window.
  if (projectItem.dataset.projId === currentProject.id) {
    return;
  }
  // TODO: If there have been changes in the project ask to save or discard them before closing it.
  // TODO: If it was an offline project try to sync it before closing it. The id would be 'temporal' and the contents in currentProject
  if (projectItem.dataset.projId === lastUploadedProject.id) {
    if (lastUploadedProject.id === 'temporal') {
      console.log('Show a message indicating that the project can be accessed but in viewer mode because it couldnt be saved.');
    }
    goToProject(lastUploadedProject);
    if (previousActiveItem) {
      previousActiveItem.classList.remove('current');
    }
    projectItem.classList.add('current');
    previousActiveItem = projectItem;
    App.projectsListBtn.style.display = 'unset';
  } else {
    showViewportDialog('loader', `Loading project ${projectItem.dataset.name}`);
    API.fetchProject(projectItem.dataset.projId, AppData)
      .then(res => {
        goToProject(res);
        if (previousActiveItem) {
          previousActiveItem.classList.remove('current');
        }
        projectItem.classList.add('current');
        previousActiveItem = projectItem;
        App.projectsListBtn.style.display = 'unset';
        hideViewportMessage();
      }, err => {
        console.log(err);
      });
  }
});

/**
 * Sets the workspace with the provided project.
 * @param {Object} project Data of the project. Id, name, drawings ids and elementsData files ids.
 */
function goToProject(project) {
  createWorkspace(project);
  projectsListContainer.style.display = 'none';
  history.replaceState({ projectTitle: project.name }, project.name, "?id=" + project.id); // encodeURIComponent ? use pushState() ?
}

/**
 *  Adds a new HTML element item to the list of projects.
 * @param {Object} projData Object with name, id and optional thumbId entries.
 */
function updateProjectsList(projData) {
  const projectItem = createProjectItem(projData);
  // Remove the 'no projects yet' message if it is the first.
  if (AppData.projectsData.length <= 1) {
    projectsList.querySelector('.empty-msg').remove();
  }
  projectsList.prepend(projectItem);
  adjustItems();
}


/************************** LOGIN DIALOG ***************************/

const authorizeDialog = document.getElementById('authorizeDialog');

/**
 * Shows the login dialog and hides and clears anything else.
 */
function showLoginDialog() {
  App.showModalDialog(authorizeDialog);
  // Hide anything else.
  document.querySelector('header').style.display = 'none';
  document.querySelector('main').style.display = 'none';
  projectsListContainer.style.display = 'none';
  // TODO: Delete the contents of the global objects if any.
  // appData.clear();
  // currentProject.clear();
  // lastUploadedProject.clear();
  Generics.emptyNode(projectsList);
  history.replaceState({ page: 'Sign in dialog' }, 'Sign in dialog', location.href.replace(location.search, ''));
}


/********************* UPLOAD FILE FORM DIALOG *********************/

const uploadFileForm = document.getElementById('uploadFileForm');
const fileInput = document.getElementById('fileInput');
const submitFileBtn = uploadFileForm.querySelector('button[type="submit"]');

// Show the upload project form.
document.getElementById('newProjectBtn').addEventListener('click', () => {
  App.showModalDialog(uploadFileForm);
  App.modalDialogContainer.classList.add('grayTranslucent');
});

// Hide the upload project form.
document.getElementById('closeUploadForm').addEventListener('click', () => {
  App.closeModalDialog(uploadFileForm);
  App.modalDialogContainer.classList.remove('grayTranslucent');
});

// Listen to file input changes.
fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    fileInput.nextElementSibling.innerHTML = fileInput.files[0].name;
    submitFileBtn.classList.remove('disabled');
  } else {
    fileInput.nextElementSibling.innerHTML = 'Choose a file';
    submitFileBtn.classList.add('disabled');
  }
});

uploadFileForm.onsubmit = e => {
  e.preventDefault();
  // Set loading state on UI.
  document.getElementById('loadingFile').style.display = 'unset';
  submitFileBtn.classList.add('disabled');
  submitFileBtn.innerHTML = 'Uploading file';
  fileInput.nextElementSibling.style.display = 'none';
  const file = e.target.elements["file"].files[0];
  // TODO: Show some real progress while creating the project.
  API.createProject(file, AppData, lastUploadedProject).then(res => {
    updateProjectsList(res);
    App.closeModalDialog(uploadFileForm);
    showMessage('success', 'Project uploaded successfully.');
    fileInput.value = '';
    // Reset upload form UI.
    document.getElementById('loadingFile').style.display = 'none';
    fileInput.nextElementSibling.innerHTML = 'Choose a file';
    submitFileBtn.innerHTML = 'Upload';
    fileInput.nextElementSibling.style.display = 'unset';
  }, err => {
    App.closeModalDialog(uploadFileForm);
    updateProjectsList(lastUploadedProject);
    console.error(err);
  });
}


/************************ MESSAGE CONTAINER ************************/

// It is a message that works as a feedback and that doesnt interrupt.

const messageContainer = document.getElementById('messageContainer');

/**
 * Disaplays feedback message.
 * @param {String} message 
 * @param {String} type Use keywords 'success', 'warning' or 'error' to specify the type of message.
 */
function showMessage(type, message) {
  messageContainer.style.display = 'flex';
  messageContainer.querySelector('p').innerText = message;
  switch (type) {
    case 'success':
      messageContainer.classList.add('success');
      break;
    case 'warning':
      messageContainer.classList.add('warning');
      break;
    case 'error':
      messageContainer.classList.add('error');
      break;
  }
}

messageContainer.querySelector('button').addEventListener('click', () => {
  messageContainer.style.display = 'none';
});


/************************ VIEWPORT MESSAGE ************************/

// Message on the middle of the viewport that interrupts.

const viewportMessage = document.getElementById('viewportMessage');

/**
 * Manages the creation of a message on the viewport.
 * @param {String} type Values 'loader' or 'action'. If action an object with a function reference and a name should be provided.
 * @param {String} message 
 * @param {Array} actions Array of objects with name and function entries.
 */
function showViewportDialog(type, message, actions) {
  if (viewportMessage.querySelector('.btns-container')) {
    viewportMessage.querySelectorAll('.btns-container > button').forEach(btn => btn.onclick = null);
  }
  Generics.emptyNode(viewportMessage);
  // Create the new content.
  const innerContainer = document.createElement('div');
  if (type === 'loader') {
    innerContainer.innerHTML = `<p>${message}</p><svg class="svg-loader"><use href="#vaLoader"/></svg>`;
  } else if (type === 'action') {
    innerContainer.innerHTML = `<p>${message}</p>`;
    const btnsContainer = document.createElement('div');
    btnsContainer.classList.add('btns-container');
    actions.forEach(action => {
      const button = document.createElement('button');
      button.innerHTML = action.name;
      button.classList.add('buttonBase', 'light');
      button.onclick = action.function;
      btnsContainer.appendChild(button);
    });
    innerContainer.appendChild(btnsContainer);
  } else if (type === 'message') { // Is this one useful? Maybe with a setTimeout?
    innerContainer.innerHTML = '<p>' + message + '</p>';
  }
  viewportMessage.appendChild(innerContainer);
  viewportMessage.classList.add('active');
}

/**
 * Hides the viewport message if visible.
 */
function hideViewportMessage() {
  viewportMessage.classList.remove('active');
}


/********************** WORKSPACES MANAGEMENT **********************/

/**
 * Prepares the workspace by cleaning the previous one and setting the currentProject variable.
 * @param {Object} projectData Object with id, name, drawings and elementsData of the project.
 */
function createWorkspace(projectData) {
  cleanWorkspace();
  // Reset the value of the currentProject variable, deletes the contents of the previous project.
  currentProject.name = projectData.name;
  currentProject.id = projectData.id;
  currentProject.index = AppData.projectsData.findIndex(obj => obj.name === projectData.name);
  if (projectData.id === lastUploadedProject.id) {
    currentProject.drawings = lastUploadedProject.drawings;
    currentProject.elementsData = lastUploadedProject.elementsData;
  } else {
    currentProject.drawings = {};
    currentProject.elementsData = {};
  }
  // Set title of the project in the button to list the projects.
  App.projectsListBtn.innerHTML = '<span>' + projectData.name + '</span>';
  createDrawignsBtns(projectData.drawings);
  // Show drawings and tools buttons
  App.drawingsBtns.children[0].innerText = 'Pick a drawing';
  App.drawingsBtns.style.display = 'unset';
  App.toolbarsContainer.style.display = 'flex';
}


/**
 * Cleans the workspace by emptying the drawing container and the list of drawings.
 * TODO: Remove possible event listeners before emptying containers ?
 */
function cleanWorkspace() {
  Generics.emptyNode(App.drawingsBtns.querySelector('.dropdown-content'));
  // TODO: If in future version there are elements in the svg with event listeners those should be deleted
  App.drawingsContainer.innerHTML = '';
}

/**
 * Creates the buttons for the drawings to be displayed.
 * @param {Object} drawings Object with the drawings, each entry has the name as key.
 */
function createDrawignsBtns(drawings) {
  let drawingsItems = [];
  for (const drawingName in drawings) {
    // Could be that there is no id if the project was uploaded and it is only local.
    drawingsItems.push(`<li ${drawings[drawingName].id ? 'data-id=\"' + drawings[drawingName].id + '\"' : ''}>${drawingName}</li>`);
  }
  App.drawingsBtns.querySelector('.dropdown-content').innerHTML = drawingsItems.join('');
}

// TODO: These should be properties of the currentProject object
const appendedDrawingsName = [];
let selectedElementId;
let currentDrawing; // Reference to the div container with the drawing

/**
 * Places the content of the svg drawing in the container.
 * @param {String} drawingName 
 */
function setDrawing(drawingName) {

  // If there is a visible drawing hide it.
  if (currentDrawing && currentDrawing.dataset.name !== drawingName) {
    if (selectedElementId && currentDrawing.querySelector('[data-id="' + selectedElementId + '"]')) {
      currentDrawing.querySelector('[data-id="' + selectedElementId + '"]').classList.remove('selected');
    }
    currentDrawing.style.display = 'none';
  } else if (currentDrawing && currentDrawing.dataset.name === drawingName) {
    return;
  }

  // If it is not in the container already append it. It will be visible.
  if (!appendedDrawingsName.includes(drawingName)) {
    appendedDrawingsName.push(drawingName);
    const container = document.createElement('div');
    container.dataset.name = drawingName;
    container.innerHTML = currentProject.drawings[drawingName];
    App.drawingsContainer.append(container);
    currentDrawing = container;
  } else {
    currentDrawing = App.drawingsContainer.querySelector('div[data-name="' + drawingName + '"]');
    currentDrawing.style.display = 'unset';
  }

  if (selectedElementId && currentDrawing.querySelector('[data-id="' + selectedElementId + '"]')) {
    currentDrawing.querySelector('[data-id="' + selectedElementId + '"]').classList.add('selected');
  }

}


/********************** DRAWINGS BUTTONS LIST **********************/

// One event listener in the container of the drawings buttons manages the clicked drawing.

let currentDrawingBtn;

App.drawingsBtns.querySelector('.dropdown-content').addEventListener('click', e => {
  if (currentDrawingBtn) {
    currentDrawingBtn.classList.remove('active');
  }
  currentDrawingBtn = e.target;
  const drawingName = currentDrawingBtn.innerText;
  App.drawingsBtns.children[0].innerText = drawingName;
  currentDrawingBtn.classList.add('active');
  if (currentProject.drawings[drawingName]) {
    setDrawing(drawingName);
  } else {
    showViewportDialog('loader', 'Loading drawing');
    API.getFileContent(e.target.dataset.id).then(res => {
      currentProject.drawings[drawingName] = res.body;
      hideViewportMessage();
      setDrawing(drawingName);
      console.log('Drawing fetched.');
    }, err => {
      console.log(err);
    });
  }
});


/************************* SELECT ELEMENTS *************************/

App.drawingsContainer.addEventListener('click', e => {
  const clickedElement = e.target.closest('[selectable]');
  if (clickedElement) {
    if (!selectedElementId) {
      clickedElement.classList.add('selected');
      showElementData(clickedElement.dataset.category, clickedElement.dataset.id);
      selectedElementId = clickedElement.dataset.id;
    } else if (clickedElement.dataset.id !== selectedElementId) {
      if (currentDrawing.querySelector('[data-id="' + selectedElementId + '"]')) {
        currentDrawing.querySelector('[data-id="' + selectedElementId + '"]').classList.remove('selected');
      }
      clickedElement.classList.add('selected');
      showElementData(clickedElement.dataset.category, clickedElement.dataset.id);
      selectedElementId = clickedElement.dataset.id;
    }
  } else if (selectedElementId) {
    if (currentDrawing.querySelector('[data-id="' + selectedElementId + '"]')) {
      currentDrawing.querySelector('[data-id="' + selectedElementId + '"]').classList.remove('selected');
    }
    selectedElementId = undefined;
  }
});


function showElementData(category, id) {
  if (currentProject.elementsData[category]) {
    console.log(currentProject.elementsData[category].instances[id]);
  } else {
    categoryData = AppData.projectsData[currentProject.index].elementsData.find(obj => obj.name.replace('.json', '') === category);
    if (categoryData !== undefined) {
      // show a loader in the table ?
      API.getFileContent(categoryData.id).then(res => {
        currentProject.elementsData[category] = JSON.parse(res.body);
        // hide the possible loader ?
        console.log(currentProject.elementsData[category].instances[id]);
      }, err => {
        // hide the possible loader ?
        console.log(err);
      });
    } else {
      console.log('There is no data for that element.');
    }
  }
}


/********************* DROPDOWNS FUNCTIONALITY *********************/

const dropdowns = document.getElementsByClassName('dropdown-container');

for (let i = 0; i < dropdowns.length; i++) {
  dropdowns[i].children[0].addEventListener('click', () => {
    dropdowns[i].classList.toggle('open');
  });
  dropdowns[i].addEventListener('mouseleave', e => {
    e.currentTarget.classList.remove('open');
  });
}


/************************ SIDE NAVE MENU ***************************/

const sideNavToggle = document.getElementById('sideNavToggle');

sideNavToggle.addEventListener('click', () => {
  document.getElementById('sideNavContainer').classList.toggle('active');
  sideNavToggle.classList.toggle('active');
});


/************************* CONTEXT MENU ****************************/

const contextMenu = document.getElementById('contextMenu');
let menuVisible = false;

function toggleMenu(command) {
  contextMenu.style.display = command === "show" ? "block" : "none";
  menuVisible = !menuVisible;
}

function setPosition({ top, left }) {
  contextMenu.style.left = `${left}px`;
  contextMenu.style.top = `${top}px`;
  toggleMenu("show");
}

window.addEventListener("click", () => {
  if (menuVisible) toggleMenu("hide");
});

window.addEventListener("contextmenu", e => {
  e.preventDefault();
  if (e.target.closest('[data-proj-id]')) {
    // Clean previous content of the context menu.
    contextMenu.querySelector('ul').childNodes.forEach(btn => btn.onclick = null);
    Generics.emptyNode(contextMenu.querySelector('ul'));
    // Get the id of the project.
    const projectItem = e.target.closest('[data-proj-id]');
    // Create the context menu buttons.
    const deleteBtn = document.createElement('li');
    deleteBtn.innerText = 'Delete';
    deleteBtn.onclick = () => {
      showViewportDialog('action', `Are you sure you want to delete the ${projectItem.dataset.name} project?`, [
        {
          name: 'Delete',
          function: () => {
            showViewportDialog('loader', `Deleting ${projectItem.dataset.name} project.`);
            API.deleteFile(projectItem.dataset.projId).then(res => {
              projectItem.remove();
              const index = AppData.projectsData.findIndex(proj => proj.id === projectItem.dataset.projId);
              AppData.projectsData.splice(index, 1);
              // TODO check also if it is in the value of currentProject or lastUploadedProject and delete it as well
              hideViewportMessage();
              showMessage('success', 'Project deleted successfully');
            });
          }
        },
        {
          name: 'Cancel',
          function: () => {
            hideViewportMessage();
          }
        }
      ]);
    };
    contextMenu.querySelector('ul').appendChild(deleteBtn);
    const origin = {
      left: e.pageX,
      top: e.pageY
    };
    setPosition(origin);
  } else {
    if (menuVisible) toggleMenu("hide");
  }
});


/************************ START APPLICATION ************************/

/**
 * Function called at start and behaves differently depending if the url contains an id of a project or not.
 */
function startApp() {
  // Hide the login dialog in case it was visible.
  App.closeModalDialog(authorizeDialog);
  // Show the app interface.
  document.querySelector('header').style.display = 'flex';
  document.querySelector('main').style.display = 'block';
  // Get the URL params.
  const resourceId = Generics.getUrlParams(window.location.href).id;
  if (resourceId) {
    showViewportDialog('loader', 'Loading project');
    API.fetchProject(resourceId, AppData)
      .then(res => {
        createWorkspace(res);
        createHTMLProjectsList([res]);
        App.projectsListBtn.style.display = 'unset';
        hideViewportMessage();
      }, rej => {
        console.log(rej);
        const errorMessage = rej.body === undefined ? rej : `Message: ${JSON.parse(rej.body).error.message} Code: ${JSON.parse(rej.body).error.code}`;
        showViewportDialog('action', errorMessage, [
          {
            name: 'View projects list',
            function: () => {
              showProjectsList();
              if (location.search !== "") {
                history.replaceState({ page: 'Projects list' }, 'Projects list', location.href.replace(location.search, ''));
              }
            }
          }
        ]);
      });
  } else {
    // Delete any invalid search parameter if any.
    if (location.search !== "") {
      history.replaceState({ page: 'Projects list' }, 'Projects list', location.href.replace(location.search, ''));
    }
    projectsListContainer.style.display = 'block';
    showViewportDialog('loader', 'Loading projects');
    // TODO: Limit the number of projects to list
    API.listProjectItems(AppData).then(res => {
      createHTMLProjectsList(res);
      hideViewportMessage();
    }, rej => {
      projectsList.innerHTML = '<p class="empty-msg">There are no projects. Upload one!</p>';
      hideViewportMessage();
    });
  }
}