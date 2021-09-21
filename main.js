const { app, ipcMain, globalShortcut } = require('electron')
const { BrowserWindow } = require('electron-acrylic-window');
const { nativeTheme } = require('electron/main');
const fs = require("fs");
const path = require('path')

let win;

let enabledThumbar = [
  {
    tooltip: 'Previous',
    icon: path.join(__dirname, './src/assets/previous.png'),
    click: () => {
      win2.webContents.executeJavaScript('MusicKit.getInstance().skipToPreviousItem();');
    }
  },
  {
    tooltip: 'Play',
    icon: path.join(__dirname, './src/assets/play.png'),
    click: () => {
      win.webContents.executeJavaScript('playPauseSong();');
    }
  },
  {
    tooltip: 'Next',
    icon: path.join(__dirname, './src/assets/next.png'),
    click: () => {
      win2.webContents.executeJavaScript('MusicKit.getInstance().skipToNextItem();');
    }
  }
]

let enabledPauseThumbar = [
  {
    tooltip: 'Previous',
    icon: path.join(__dirname, './src/assets/previous.png'),
    click: () => {
      win2.webContents.executeJavaScript('MusicKit.getInstance().skipToPreviousItem();');
    }
  },
  {
    tooltip: 'Pause',
    icon: path.join(__dirname, './src/assets/pause.png'),
    click: () => {
      win.webContents.executeJavaScript('playPauseSong();');
    }
  },
  {
    tooltip: 'Next',
    icon: path.join(__dirname, './src/assets/next.png'),
    click: () => {
      win2.webContents.executeJavaScript('MusicKit.getInstance().skipToNextItem();');
    }
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
    win2.webContents.insertCSS('.web-navigation__header { -webkit-user-select: none; -webkit-app-region: drag; } .loading-inner { display: none !important; } .dt-footer { display: none !important; } .menuicon { display: none !important; } .page-container { background-color: #dadada !important; height: 100%; } .locale-switcher-banner { display: none !important; } .cwc-upsell-personal { display: none !important; } .cwc-upsell-banner { display: none !important; }');
    const js = fs.readFileSync(path.join(__dirname, './appleMusicListeners.js')).toString();
    setTimeout(function() {
      win2.webContents.executeJavaScript(js);
    }, 2000);
  })

  win2.onbeforeunload = (e) => {
    app.quit();
  }
}

  var ready = false;
  var widevine_ready = false;

  app.on('ready', () => {
    createWindow();
    win.loadFile('src/loading.html');
    if(widevine_ready) {
      finishLoading();
    } else {
      ready = true;
    }
  });

  app.on('widevine-ready', () => {
    if(ready) {
      finishLoading();
    }
    widevine_ready = true;
  })

  function finishLoading() {
    linux_waittimeout = 0;
    if(process.platform == 'linux') linux_waittimeout = 1000;

    setTimeout(function() {
      invisibleWindow();
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

      win.on('closed', (event) => {
        app.quit();
      });
      win2.on('closed', (event) => {
        app.quit();
      });
    }, linux_waittimeout);
  }
  
  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  })

  ipcMain.on('getSystemColorMode', (event) => {
    if(nativeTheme.shouldUseDarkColors) win.webContents.executeJavaScript('systemColorMode = "dark"; if(prefs["colorMode"] == "system") changeAppColorMode("dark");');
    else win.webContents.executeJavaScript('systemColorMode = "light";');
  });

  nativeTheme.on('updated', () => {
    if(nativeTheme.shouldUseDarkColors) win.webContents.executeJavaScript('systemColorMode = "dark";');
    else win.webContents.executeJavaScript('systemColorMode = "light";');
    win.webContents.executeJavaScript('if(prefs["colorMode"] == "system") changeAppColorMode("system");');
  });

  ipcMain.on('MusicJS', (event, data) => {
    win2.webContents.executeJavaScript(data);
  });

  ipcMain.on('showAppleLoginWindow', (event, data) => {
      win2.webContents.executeJavaScript('var signInMusic = document.createElement("a"); signInMusic.href = "/login"; signInMusic.id = "signin-music"; document.body.appendChild(signInMusic); document.getElementById("signin-music").click();');
      win2.webContents.insertCSS('.loading-inner { display: block !important } #web-main { margin-top: 0 !important; } .web-navigation__auth-button--sign-in { display: none !important } .branding-container { overflow-y: hidden !important } .idms-login__create-link[data-v-62b83b1e], .idms-login__forgot-link[data-v-62b83b1e] { display: none !important; }');
      win2.show();
      // const js = fs.readFileSync(path.join(__dirname, './appleMusicListeners.js')).toString();
      // setTimeout(function() {
      //   win2.webContents.executeJavaScript(js);
      // }, 2000);
  });

  ipcMain.on('thumbar', (event, data) => {
    if(data == '0') {
      win.setThumbarButtons(enabledThumbar);
    } else {
      win.setThumbarButtons(enabledPauseThumbar);
    }
  });

  ipcMain.on('startUI', (event) => {
    win.webContents.executeJavaScript('MKInstanceLoaded();');
  });

  ipcMain.on('startMKInstanceWaiter', (event) => {
    win2.webContents.executeJavaScript('function startMKInstanceWaiter() { var interval = setInterval(function() { if(MusicKit.getInstance() !== undefined) { window.ipcRenderer.send(\'startUI\'); clearInterval(interval); }}, 1000); } startMKInstanceWaiter();');
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

  ipcMain.on('updateNowPlayingItem', (event, name, artworkUrl, artist, album, duration, index, id) => {
    win.webContents.executeJavaScript('setNowPlayingItem("' + name + '", "' + artworkUrl + '", "' + artist + '", "' + album + '", "' + duration + '", ' + index + ', "' + id + '");');
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