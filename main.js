const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

let win;

const iconPath = process.platform !== 'darwin'
    ? 'src/assets/icons/icon.ico'
    : 'src/assets/icons/icon.icns';

function createWindow() {
  win = new BrowserWindow({
    width: 1150,
    height: 800,
    minWidth: 700,
    minHeight: 500,
    icon: path.join(iconPath),
    frame: false,
        
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  })

  win.webContents.openDevTools();
  win.setMenuBarVisibility(false);
}

  app.on('ready', () => {
    createWindow();
    win.loadFile('src/loading.html');
    setTimeout(function() {
      win.loadFile('src/music.html');
  }, 2000);  
  })
  
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  })


  ipcMain.on('app_version', (event) => {
    event.sender.send('app_version', { version: app.getVersion() });
  });

  ipcMain.on('close_app', () => {
    app.quit();
  });

  ipcMain.on('minimize_app', () => {
    win.minimize();
  });