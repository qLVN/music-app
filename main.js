const { app, ipcMain } = require('electron')
const { BrowserWindow } = require("electron-acrylic-window");
const client = require('discord-rich-presence')('858367187756384287');
const discord = require('discord-rpc');
const fs = require("fs");
const path = require('path')

let win;

const iconPath = process.platform !== 'darwin'
    ? 'src/assets/icon.ico'
    : 'src/assets/icon.icns';

client.updatePresence({
  state: '',
  details: 'Idle',
  startTimestamp: Date.now(),
  endTimestamp: Date.now() + 1337,
  largeImageKey: 'music_main',
  instance: true,
});

let enabledThumbar = [
  {
    tooltip: 'Previous',
    icon: path.join('src/assets/previous.png')
  },
  {
    tooltip: 'Play',
    icon: path.join('src/assets/play.png')
  },
  {
    tooltip: 'Next',
    icon: path.join('src/assets/next.png')
  }
]

let disabledThumbar = [
  {
    tooltip: 'Previous',
    icon: path.join(__dirname, './src/assets/previousBlurred.png')
  },
  {
    tooltip: 'Play',
    icon: path.join(__dirname, './src/assets/playBlurred.png')
  },
  {
    tooltip: 'Next',
    icon: path.join(__dirname, './src/assets/nextBlurred.png')
  }
]
    
function createWindow() {
  win = new BrowserWindow({
    width: 1150,
    height: 800,
    minWidth: 900,
    minHeight: 500,
    transparent: false,
    icon: path.join(iconPath),
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  })

  //win.webContents.openDevTools();
  win.setMenuBarVisibility(false);
}

let win2;

function invisibleWindow() {
  win2 = new BrowserWindow({ 
    width: 450, 
    height: 600, 
    show: false,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    vibrancy: null,
    webPreferences: {
      preload: path.join(__dirname, './preload.js'),
      nodeIntegration: false,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false,
    }
  });

  win2.loadURL("https://music.apple.com/library/recently-added");

  win2.once('ready-to-show', () => {
      win2.hide();
      win2.webContents.insertCSS('.web-navigation__header { -webkit-user-select: none; -webkit-app-region: drag; } .loading-inner { display: none !important; } .dt-footer { display: none !important; } .menuicon { display: none !important; } .page-container { background-color: #dadada !important; height: 100%; }');
      const js = fs.readFileSync(path.join(__dirname, './appleMusicListeners.js')).toString();
      setTimeout(function() {
        win2.webContents.executeJavaScript(js);
      }, 2000);
     
  })

  win2.onbeforeunload = (e) => {
    app.quit();
  }
}

  app.on('widevine-ready', () => {
    createWindow();
    win.loadFile('src/loading.html');
    invisibleWindow();
    setTimeout(function() {
      win.loadFile('src/music.html');
    }, 2000);

    win.on('closed', (event) => {
      app.quit();
    });
    win2.on('closed', (event) => {
      app.quit();
    });
  })
  
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  })

  ipcMain.on('MusicJS', (event, data) => {
    win2.webContents.executeJavaScript(data);
  });

  ipcMain.on('thumbar', (event, data) => {
    if(data == 0) {
      win.setThumbarButtons(disabledThumbar);
    } else {
      win.setThumbarButtons(enabledThumbar);
    }
  });

  ipcMain.on('getParams', (event) => {
    win.webContents.executeJavaScript('sendParams();');
  });

  ipcMain.on('updatePlaybackState', (event, data) => {
    win.webContents.executeJavaScript('setPlaybackState(' + data + ');');
  });

  ipcMain.on('updatePlaybackTime', (event, data) => {
    win.webContents.executeJavaScript('setPlaybackTime(' + data + ');');
  });

  ipcMain.on('updateQueueItems', (event, data) => {
    win.webContents.executeJavaScript('setQueueItems(' + data + ');');
  });

  ipcMain.on('updateNowPlayingItem', (event, name, artworkUrl, artist, album, duration, index) => {
    win.webContents.executeJavaScript('setNowPlayingItem("' + name + '", "' + artworkUrl + '", "' + artist + '", "' + album + '", "' + duration + '", ' + index + ');');
  });

  ipcMain.on('show_applemusic', (event) => {
    win2.show();
  });

  ipcMain.on('hide_applemusic', (event) => {
    win2.hide();
  });

  ipcMain.on('app_version', (event) => {
    event.sender.send('app_version', { version: app.getVersion() });
  });

  ipcMain.on('app_maximize_state', (event) => {
    event.sender.send('app_maximize_state', { maximized: win.isMaximized() });
  });

  ipcMain.on('close_app', () => {
    win2.destroy();
    app.quit();
  });

  ipcMain.on('minimize_app', () => {
    win.minimize();
  });

  ipcMain.on('maximize_app', () => {
    if(!win.isMaximized()) {
      win.maximize();
    } else {
      win.unmaximize();
    }
  });