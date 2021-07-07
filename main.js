const { app, ipcMain, globalShortcut } = require('electron')
const { BrowserWindow } = require("electron-acrylic-window");
const fs = require("fs");
const path = require('path')

let win;

let enabledThumbar = [
  {
    tooltip: 'Previous',
    icon: path.join(__dirname, './src/assets/previous.png')
  },
  {
    tooltip: 'Play',
    icon: path.join(__dirname, './src/assets/play.png')
  },
  {
    tooltip: 'Next',
    icon: path.join(__dirname, './src/assets/next.png')
  }
]

let enabledPauseThumbar = [
  {
    tooltip: 'Previous',
    icon: path.join(__dirname, './src/assets/previous.png')
    //click: function() { win2.webContents.executeJavaScript('MusicKit.getInstance().skipToPreviousItem();'); }
  },
  {
    tooltip: 'Pause',
    icon: path.join(__dirname, './src/assets/pause.png')
    //click: function() { win.webContents.executeJavaScript('playPauseSong();'); }
  },
  {
    tooltip: 'Next',
    icon: path.join(__dirname, './src/assets/next.png')
    //click: function() { win2.webContents.executeJavaScript('MusicKit.getInstance().skipToNextItem();'); }
  }
]

const iconPath = process.platform !== 'darwin'
    ? 'src/assets/icon.ico'
    : 'src/assets/icon.icns';

    
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
      globalShortcut.register('MediaPlayPause', () => {
        win.webContents.executeJavaScript('playPauseSong();');
      });
      globalShortcut.register('MediaStop', () => {
        win2.webContents.executeJavaScript('MusicKit.getInstance().stop();');
      });
      globalShortcut.register('MediaPreviousTrack', () => {
        win2.webContents.executeJavaScript('MusicKit.getInstance().skipToPreviousItem();');
      });
      globalShortcut.register('MediaNextTrack', () => {
        win2.webContents.executeJavaScript('MusicKit.getInstance().skipToNextItem();');
      });
    }, 2000);

    win.on('closed', (event) => {
      app.quit();
    });
    win2.on('closed', (event) => {
      app.quit();
    });
  })
  
  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
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
    if(data == '0') {
      win.setThumbarButtons(enabledThumbar);
    } else {
      win.setThumbarButtons(enabledPauseThumbar);
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
    win.webContents.executeJavaScript('client.destroy();');
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