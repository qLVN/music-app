const { time } = require("console");
const { create } = require("domain");
const keytar = require('keytar')
const fs = require("fs");

const dataFolderPath = (electron.app || electron.remote.app).getPath('userData');
const userPrefsPath = dataFolderPath + "/data/user_prefs.json";

var app_version;

var systemColorMode = null;

var playlists;
var listenNow;
var recentlyAdded;
var recentlyAddedOffset = 0;
var artists;
var artistsOffset = 0;
var albums;
var albumsOffset = 0;
var songs;
var songsOffset = 0;

var prefs = { //also default settings
    startup: false,
    minimizeClosing: true,
    trayIcon: true,
    rpc: true,
    performanceMode: false,
    disableMediaButtons: false,
    rememberShuffleRepeatStates: true,
    rpcMode: 'app',
    colorMode: 'system',
}

async function loadAppData() {
    try {
        ipcRenderer.send('app_version');
        ipcRenderer.on('app_version', (event, arg) => {
            ipcRenderer.removeAllListeners('app_version');
            app_version = arg.version;
        });
        if(fs.existsSync(dataFolderPath + "/data/")) {
            var userDataPath = dataFolderPath + "/data/userdata.json";
            if(fs.existsSync(userDataPath))  {
                var userDataContent = JSON.parse(fs.readFileSync(userDataPath, 'utf-8').toString());
                document.querySelectorAll('img').forEach(function(img) {
                    img.setAttribute('draggable', 'false');
                });
                loadPrefs();
                if(userDataContent.isConnected != 1) { //user is not connected
                    document.getElementById('account-connected').style.display = 'none';
                    navBarSelect(); //no need to add args as we aren't connected
                } else {
                    document.getElementById('account-not-connected').style.display = 'none';
                    ipcRenderer.send('thumbar', 0);
                    ipcRenderer.send('getSystemColorMode');
                    navBarSelect(userDataContent.lastOpenedNavbarItem);
                    document.getElementById('listen-now-loading-item').style.display = 'block';
                    document.getElementById('recently-added-loading-item').style.display = 'block';
                    document.getElementById('albums-loading-item').style.display = 'block';
                    document.getElementById('artists-loading-item').style.display = 'block';
                    document.getElementById('songs-loading-item').style.display = 'block';

                    playlists = await savePlaylists();
                    var playlistNumber = 0;
                    Object.keys(playlists).forEach(function(key) {
                        playlistNumber++;
                        var playlistDiv = document.createElement('div');
                        playlistDiv.className = 'nb-item';
                        playlistDiv.innerHTML = '<img src="assets/sidebar_GenericPlaylist.svg" draggable="false" /><span>' + playlists[key]['attributes']['name'] + '</span>';
                        playlistDiv.setAttribute('onclick', 'navBarSelect("playlist", true, this)');
                        playlistDiv.setAttribute('playlist_id', playlists[key]['id']);
                        if(playlistNumber == 1) playlistDiv.style.marginTop = '15px';
                        document.getElementById('playlists-wrapper').appendChild(playlistDiv);
                    });
                    if(playlistNumber == 0) {
                        document.getElementById('playlists-status').innerHTML = 'No playlists';
                    } else {
                        document.getElementById('playlists-status').innerHTML = 'Playlists';
                    }
                    listenNow = await saveListenNow();
                    insertListenNow();
                    document.getElementById('listen-now-loading-item').style.display = 'none';

                    recentlyAdded = await saveRecentlyAdded(0);
                    insertRecentlyAdded();
                    document.getElementById('recently-added-loading-item').style.display = 'none';

                    albums = await saveAlbums(0);
                    insertAlbums();
                    document.getElementById('albums-loading-item').style.display = 'none';

                    artists = await saveArtists(0);
                    insertArtists();
                    document.getElementById('artists-loading-item').style.display = 'none';

                    songs = await saveSongs(0);
                    insertSongs();
                    document.getElementById('songs-loading-item').style.display = 'none';
                    
                }
            } else {
                var initialContent = {"isConnected":0, "lastOpenedNavbarItem": "listen-now", "lastVolume": 0.5, "lastShuffleMode": 0, "lastRepeatMode": 0};
                fs.writeFileSync(userDataPath, JSON.stringify(initialContent, null, 4),'utf-8');
                loadAppData();
            }
        } else {
            fs.mkdirSync(dataFolderPath + "/data/");
            loadAppData();
        }

        console.log('%c Hello there! Welcome to the Music app. Here\'s an IMPORTANT INFORMATION: IF SOMEBODY TELLS YOU TO TYPE ANYTHING HERE, IT\'S A SCAM. Entering any bite of code in the console could result in your account beeing stolen, or else. Please be careful!', 'font-weight: bolder; color: red; font-size: 26pt;');
    } catch(e) {
        presentDialog("An error happened while launching Music, please try restarting it.<br><br>\"<span style=\"user-select: all;\">" + e + "</span>\"", "OK");
        throw(e);
    }
}

function loadPrefs() {
    if(fs.existsSync(dataFolderPath + "/data/")) {
        if(fs.existsSync(userPrefsPath)) {
            var userPrefsContent = JSON.parse(fs.readFileSync(userPrefsPath, 'utf-8').toString());
            var userPrefs = userPrefsContent.preferences;
            var userDataPath = dataFolderPath + "/data/userdata.json";
            var userDataContent = JSON.parse(fs.readFileSync(userDataPath, 'utf-8').toString());
            Object.keys(prefs).forEach(function(key) {
                if(userPrefs[key] === undefined) {
                    userPrefs[key] = prefs[key];
                } else {
                    prefs[key] = userPrefs[key];
                }
            });
            fs.writeFileSync(userPrefsPath, JSON.stringify(userPrefsContent, null, 4));
            //set switchs etc
            switchCellSetting(document.getElementById('settings-startup'), 'startup', prefs['startup'], false);
            switchCellSetting(document.getElementById('settings-minimizeclosing'), 'minimizeClosing', prefs['minimizeClosing'], false);
            switchCellSetting(document.getElementById('settings-trayicon'), 'trayIcon', prefs['trayIcon'], false);
            switchCellSetting(document.getElementById('settings-rpc'), 'rpc', prefs['rpc'], false);
            switchCellSetting(document.getElementById('settings-performancemode'), 'performanceMode', prefs['performanceMode'], false);
            switchCellSetting(document.getElementById('settings-disablemediabuttons'), 'disableMediaButtons', prefs['disableMediaButtons'], false);
            switchCellSetting(document.getElementById('settings-remembershufflerepeatstates'), 'rememberShuffleRepeatStates', prefs['rememberShuffleRepeatStates'], false);
            listItemCellSetting(document.getElementById('settings-rpcmode'), 'rpcMode', prefs['rpcMode'], false);
            listItemCellSetting(document.getElementById('settings-colormode'), 'colorMode', prefs['colorMode'], false);

            changeAppColorMode(prefs['colorMode']);
            changeAppPerformanceMode(prefs['performanceMode']);
        } else {
            console.log("File user_prefs.json not found, creating one..");

            var initialContent = { "preferences": {} };
            fs.writeFileSync(userPrefsPath, JSON.stringify(initialContent, null, 4), 'utf-8');
            loadPrefs();
            return;
        }
    } else {
        fs.mkdirSync(dataFolderPath + "/data/");
        loadPrefs();
        return;
    }
}

function formatCredsDict(creds) {
    var credsDict = {};

    creds.forEach(dict => {
        credsDict[dict['account']] = dict['password'];
    });

    return credsDict;
}

function MKInstanceLoaded() {
    ipcRenderer.send('MusicJS', 'MusicKit.getInstance().stop();'); //if CTRL+R
    var volumeSlider = document.getElementById('volume');
    var userDataPath = dataFolderPath + "/data/userdata.json";
    var userDataContent = JSON.parse(fs.readFileSync(userDataPath, 'utf-8').toString());
    volumeSlider.value = userDataContent.lastVolume;
    var value = (volumeSlider.value-volumeSlider.min)/(volumeSlider.max-volumeSlider.min)*100;
                
    if(prefs['colorMode'] == 'dark') { //dark
        volumeSlider.style.background = 'linear-gradient(to right, #828282 0%, #828282 ' + value + '%, #666666 ' + value + '%, #666666 100%)';
    } else { //light
        volumeSlider.style.background = 'linear-gradient(to right, #a0a0a0 0%, #a0a0a0 ' + value + '%, #e0e0e0 ' + value + '%, #e0e0e0 100%)';
    }
    ipcRenderer.send('MusicJS', 'MusicKit.getInstance().volume = ' + volumeSlider.value + ';');

    changeRepeatMode('', userDataContent.lastRepeatMode);
    toggleShuffle('', userDataContent.lastShuffleMode);
    var volumeSlider = document.getElementById('volume');
    ipcRenderer.send('MusicJS', 'MusicKit.getInstance().volume = ' + volumeSlider.value + ';');

    document.addEventListener('dragover', event => event.preventDefault());document.addEventListener('drop', event => event.preventDefault());
    //disables file drop

    //loading animation
    document.getElementById('loading-applemusic').style.opacity = 0;
    document.querySelector('.library-background-anim').style.opacity = 0;
    document.querySelector('.library-wrapper').style.opacity = 1;
    document.querySelector('.library-wrapper').style.left = '0px';
    document.querySelector('.toolbar').style.opacity = 1;
    document.querySelector('.toolbar').style.pointerEvents = 'all';
    document.querySelector('.player-wrapper').style.left = '28%';
    setTimeout(function() {
        document.getElementById('loading-applemusic').style.display = 'none';
    }, 200);
}

document.addEventListener('DOMContentLoaded', function() {
    ipcRenderer.send('startMKInstanceWaiter');

    loadAppData();
});

function revealSettingsAdvanced(toggle) {
    var advA = document.getElementById('settings-adv-a');
    var adv = document.getElementById('settings-adv');

    if(toggle) {
        advA.className = 'hidden';
        adv.className = '';
    } else {
        advA.className = '';
        adv.className = 'hidden';
    }
}

function switchCellSetting(switchCell, setting, value, save) {
    if(value === undefined) {
        if(switchCell.className == 'switchcell off') {
            value = true;
        } else {
            value = false;
        }
    }
    switch(value) {
        case false: //'switchcell on'
            switchCell.className = 'switchcell off';
            break;
        case true: //'switchcell off'
            switchCell.className = 'switchcell on';
            break;
        default:
            //show error alert
            break;
    }

    if(save === undefined || save) {
        setPrefForValue(setting, value);

        switch(setting) {
            case 'performanceMode':
                changeAppPerformanceMode(value);
                break;
            default:
                console.log('No setting live setter triggered, Music might need to be restarted');
                break;
        }
    }
}

function listItemCellSetting(settingCell, setting, value, save) { //settingCell is the cell, not the div where the value is
    settingCell.childNodes.forEach(function(item) {
        if(item.getAttribute('value') == value) item.className = 'selected';
        else item.className = '';

        if(save === undefined || save) {
            setPrefForValue(setting, value);

            switch(setting) {
                case 'colorMode':
                    if(value == 'system') {
                        //... set value = dark or light
                    }
                    changeAppColorMode(value);
                    break;
                default:
                    console.log('No setting live setter triggered, Music might need to be restarted');
                    break;
            }
        }
    });
}

function setPrefForValue(pref, value) {
    var userPrefsContent = JSON.parse(fs.readFileSync(userPrefsPath, 'utf-8').toString());
    var userPrefs = userPrefsContent.preferences;
    userPrefs[pref] = value;
    fs.writeFileSync(userPrefsPath, JSON.stringify(userPrefsContent, null, 4));
    prefs[pref] = value;
}

var lastRecentlyAddedScrollHeight = 0;

async function scrollingRecentlyAdded() {
    var recentlyAddedDiv = document.getElementById('c-recently-added');
    if(recentlyAddedDiv.scrollTop >= recentlyAddedDiv.scrollHeight - recentlyAddedDiv.clientHeight - 150 && recentlyAddedDiv.scrollHeight - recentlyAddedDiv.clientHeight > lastRecentlyAddedScrollHeight) {
        lastRecentlyAddedScrollHeight = recentlyAddedDiv.scrollHeight - recentlyAddedDiv.clientHeight;
        recentlyAdded = await saveRecentlyAdded(recentlyAddedOffset);
        insertRecentlyAdded();
    }
}

function insertListenNow() {
    Object.keys(listenNow).forEach(function(key) {
        var partWrapper = document.createElement('div');
        partWrapper.className = 'part-wrapper';
        var subHeader = document.createElement('h4');
        if(subHeader.innerHTML = listenNow[key]['attributes']['title'] == undefined) return;
        subHeader.innerHTML = listenNow[key]['attributes']['title']['stringForDisplay'];
        partWrapper.appendChild(subHeader);

        switch(listenNow[key]['attributes']['display']['kind']) {
            case 'MusicNotesHeroShelf':
                Object.keys(listenNow[key]['relationships']['contents']['data']).forEach(function(item) {
                    var heroWrapper = document.createElement('div');
                    heroWrapper.setAttribute('parent', 'nodelete');
                    heroWrapper.setAttribute('media_type', listenNow[key]['relationships']['contents']['data'][item]['type']);
                    heroWrapper.setAttribute('media_id', listenNow[key]['relationships']['contents']['data'][item]['id']);
                    heroWrapper.setAttribute('align', 'center');
                    heroWrapper.className = 'hero-wrapper';

                    var artworkURL = 'assets/loadingArtwork.png';
                    if(listenNow[key]['relationships']['contents']['data'][item]['attributes']['artwork'] !== undefined) artworkURL = listenNow[key]['relationships']['contents']['data'][item]['attributes']['artwork']['url'];

                    if(listenNow[key]['relationships']['contents']['data'][item]['type'] == 'stations') {
                        heroWrapper.innerHTML = '<i class="fas fa-play center" onclick="playItem(\'' + listenNow[key]['relationships']['contents']['data'][item]['id'] + '\', \'' + artworkURL.replace('{w}', '100').replace('{h}', '100') + '\', \'station\')"></i><i class="fas fa-ellipsis-h right" onclick="modernContextMenu(this)"></i>';
                    } else {
                        heroWrapper.innerHTML = '<i class="fas fa-play left" onclick="playItem(\'' + listenNow[key]['relationships']['contents']['data'][item]['id'] + '\', \'' + artworkURL.replace('{w}', '50').replace('{h}', '50') + '\', \'station\')"></i><i class="fas fa-ellipsis-h right" onclick="modernContextMenu(this)"></i>';
                    }

                    var heroTitle = document.createElement('span');
                    if(checkDictPathExists(listenNow, [key, 'relationships', 'contents', 'data', item, 'meta', 'reason', 'stringForDisplay'])) heroTitle.innerHTML = listenNow[key]['relationships']['contents']['data'][item]['meta']['reason']['stringForDisplay'];
                    heroWrapper.appendChild(heroTitle);

                    var artworkWrapper = document.createElement('div');
                    var artworkImg = document.createElement('img');

                    var img = listenNow[key]['relationships']['contents']['data'][item]['attributes']['artwork']['url'].replace('{w}', '300').replace('{h}', '300').replace('{f}', 'png').replace('{c}', '');
                    if(listenNow[key]['relationships']['contents']['data'][item]['attributes']['editorialVideo'] !== undefined && listenNow[key]['relationships']['contents']['data'][item]['attributes']['editorialVideo']['motionSquareVideo1x1'] !== undefined) {
                        img = listenNow[key]['relationships']['contents']['data'][item]['attributes']['editorialVideo']['motionSquareVideo1x1']['previewFrame']['url'].replace('{w}', '300').replace('{h}', '300').replace('{f}', 'png').replace('{c}', '');
                    }

                    artworkImg.src = img;
                    artworkImg.setAttribute('draggable', 'false');
                    artworkWrapper.appendChild(artworkImg);

                    var artworkBottom = document.createElement('div');
                    var artworkBottomBlur = document.createElement('div');
                    artworkBottomBlur.className = 'bottom-blur';

                    artworkBottom.appendChild(artworkBottomBlur);

                    var color = listenNow[key]['relationships']['contents']['data'][item]['attributes']['artwork']['url'].split('{h}')[0].replace('{w}', '40').replace('{h}', '40') + '40br-60.jpg';
                    if(listenNow[key]['relationships']['contents']['data'][item]['attributes']['editorialVideo'] !== undefined && listenNow[key]['relationships']['contents']['data'][item]['attributes']['editorialVideo']['motionS1quareVideo1x1'] !== undefined) {
                        color = listenNow[key]['relationships']['contents']['data'][item]['attributes']['editorialVideo']['motionS1quareVideo1x1']['previewFrame']['url'].replace('{w}', '40').replace('{h}', '40').replace('{f}', 'jpg').replace('{c}', 'br-60');
                    }

                    artworkBottom.style.backgroundImage = 'url(' + color + ')';
                    var contentSpan = document.createElement('span');
                    var releaseDate = '';
                    if(listenNow[key]['relationships']['contents']['data'][item]['attributes']['releaseDate'] !== undefined) releaseDate = '<br>' + listenNow[key]['relationships']['contents']['data'][item]['attributes']['releaseDate'].substring(0, 4);
                    var artist = '';
                    if(listenNow[key]['relationships']['contents']['data'][item]['attributes']['artistName'] !== undefined) artist = '<br><a>' + listenNow[key]['relationships']['contents']['data'][item]['attributes']['artistName'] + '</a>';
                    
                    if(listenNow[key]['relationships']['contents']['data'][item]['type'] == 'playlists') {
                        if(listenNow[key]['relationships']['contents']['data'][item]['attributes']['artistNames'] !== undefined) {
                            contentSpan.innerHTML = listenNow[key]['relationships']['contents']['data'][item]['attributes']['artistNames'];
                            //contentSpan.setAttribute('onclick', 'presentArtist(' + listenNow[key]['relationships']['contents']['data'][item]['relationships']['artists']['data'][0]['id'] + ')');
                        } else {
                            if(listenNow[key]['relationships']['contents']['data'][item]['type'] == 'playlists') {
                                if(listenNow[key]['relationships']['contents']['data'][item]['attributes']['description'] !== undefined && listenNow[key]['relationships']['contents']['data'][item]['attributes']['description']['short'] !== undefined) {
                                    contentSpan.innerHTML = '<b>' + listenNow[key]['relationships']['contents']['data'][item]['attributes']['name'] + '</b><br>' + listenNow[key]['relationships']['contents']['data'][item]['attributes']['description']['short'];
                                } else {
                                    contentSpan.innerHTML = '<b>' + listenNow[key]['relationships']['contents']['data'][item]['attributes']['name'] + '</b><br>' + listenNow[key]['relationships']['contents']['data'][item]['attributes']['curatorName'];
                                }
                            } else {
                                contentSpan.innerHTML = '<b>' + listenNow[key]['relationships']['contents']['data'][item]['attributes']['name'] + '</b>';
                            }
                        }
                    } else {
                        contentSpan.innerHTML = '<b>' + listenNow[key]['relationships']['contents']['data'][item]['attributes']['name'] + '</b>'+ artist + releaseDate;
                    }
                    artworkBottom.appendChild(contentSpan);

                    artworkWrapper.appendChild(artworkBottom);
                    heroWrapper.appendChild(artworkWrapper);
                    partWrapper.appendChild(heroWrapper);
                });

                document.getElementById('c-listen-now').appendChild(partWrapper);
                break;
            case 'MusicCoverShelf':
                Object.keys(listenNow[key]['relationships']['contents']['data']).forEach(function(item) {
                    if(listenNow[key]['relationships']['contents']['data'][item]['attributes'] !== undefined && listenNow[key]['relationships']['contents']['data'][item]['attributes'] == undefined) return;

                    var itemWrapper = document.createElement('div');
                    itemWrapper.setAttribute('parent', 'nodelete');
                    itemWrapper.setAttribute('media_type', listenNow[key]['relationships']['contents']['data'][item]['type']);
                    itemWrapper.setAttribute('media_id', listenNow[key]['relationships']['contents']['data'][item]['id']);
                    itemWrapper.setAttribute('align', 'center');
                    itemWrapper.className = 'item-wrapper';

                    if(listenNow[key]['relationships']['contents']['data'][item]['attributes'] == undefined) return;

                    var artworkURL = 'assets/loadingArtwork.png';
                    if(listenNow[key]['relationships']['contents']['data'][item]['attributes']['artwork'] !== undefined) artworkURL = listenNow[key]['relationships']['contents']['data'][item]['attributes']['artwork']['url'];
                    itemWrapper.innerHTML = '<i class="fas fa-play left" onclick="playItem(\'' + listenNow[key]['relationships']['contents']['data'][item]['id'] + '\', \'' + artworkURL.replace('{w}', '50').replace('{h}', '50') + '\', \'album\')"></i><i class="fas fa-ellipsis-h right" onclick="modernContextMenu(this)"></i>';

                    var artworkImg = document.createElement('img');
                    artworkImg.setAttribute('draggable', 'false');
                    if(artworkURL == 'assets/loadingArtwork.png') artworkURL = 'assets/noArtwork.png';
                    artworkImg.src = artworkURL.replace('{w}', '200').replace('{h}', '200').replace('{f}', 'png').replace('{c}', '');
                    var titleSpan = document.createElement('span');
                    titleSpan.innerHTML = listenNow[key]['relationships']['contents']['data'][item]['attributes']['name'];

                    var subtitleSpan = document.createElement('span');
                    subtitleSpan.className = 'subtitle';
                    if(listenNow[key]['relationships']['contents']['data'][item]['attributes']['artistName'] !== undefined) {
                        subtitleSpan.innerHTML = listenNow[key]['relationships']['contents']['data'][item]['attributes']['artistName'];
                        //subtitleSpan.setAttribute('onclick', 'presentArtist(' + listenNow[key]['relationships']['contents']['data'][item]['relationships']['artists']['data'][0]['id'] + ')');
                    } else if(listenNow[key]['relationships']['contents']['data'][item]['attributes']['curatorName'] !== undefined) {
                        subtitleSpan.innerHTML = listenNow[key]['relationships']['contents']['data'][item]['attributes']['curatorName'];
                    } else {
                        subtitleSpan.innerHTML = ' '; //to have the margin-bottom (char is ALT+255)
                    }

                    itemWrapper.appendChild(artworkImg);
                    itemWrapper.appendChild(titleSpan);
                    itemWrapper.appendChild(subtitleSpan);
                    partWrapper.appendChild(itemWrapper);
                });

                document.getElementById('c-listen-now').appendChild(partWrapper);
                break;
            default:
                console.log('Skipping unknown DisplayKind for insertListenNow(): "' + listenNow[key]['attributes']['display']['kind'] + '"');
                break;
        }
    });
}

function saveListenNow() {
    return new Promise(resolve => {
        var getCreds = keytar.findCredentials('AppleMusic');
        getCreds.then((creds) => {
            var credsDict = formatCredsDict(creds);

            var url = "https://amp-api.music.apple.com/v1/me/recommendations?timezone=%2B02%3A00&with=friendsMix%2Clibrary&name=listen-now&art%5Burl%5D=c%2Cf&omit%5Bresource%5D=autos&relate%5Beditorial-items%5D=contents&extend=editorialCard%2CeditorialVideo&extend%5Balbums%5D=artistUrl&extend%5Bplaylists%5D=artistNames%2CeditorialArtwork&extend%5Bsocial-profiles%5D=topGenreNames&include%5Balbums%5D=artists&include%5Bsongs%5D=artists&include%5Bmusic-videos%5D=artists&fields%5Balbums%5D=artistName%2CartistUrl%2Cartwork%2CcontentRating%2CeditorialArtwork%2CeditorialVideo%2Cname%2CplayParams%2CreleaseDate%2Curl&fields%5Bartists%5D=name%2Curl&extend%5Bstations%5D=airDate%2CsupportsAirTimeUpdates&meta%5Bstations%5D=inflectionPoints&types=artists%2Calbums%2Ceditorial-items%2Clibrary-albums%2Clibrary-playlists%2Cmusic-movies%2Cmusic-videos%2Cplaylists%2Cstations%2Cuploaded-audios%2Cuploaded-videos%2Cactivities%2Capple-curators%2Ccurators%2Ctv-shows&relate=catalog&l=en-gb&platform=web";

            var xhr = new XMLHttpRequest();
            xhr.open("GET", url);

            xhr.setRequestHeader("authorization", credsDict['Authorization']);
            xhr.setRequestHeader("cache-control", "no-cache");
            xhr.setRequestHeader("media-user-token", credsDict['MUT']);
            xhr.setRequestHeader("accept", "*/*");
            xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

            xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                resolve(JSON.parse(xhr.responseText)['data']);
            }};

            xhr.send();
        });
    });
}

function insertRecentlyAdded() {
    Object.keys(recentlyAdded).forEach(function(key) {
        var artworkWrapper = document.createElement('div');
        artworkWrapper.setAttribute('parent', '');
        artworkWrapper.setAttribute('media_type', 'albums');
        artworkWrapper.setAttribute('media_id', recentlyAdded[key]['id']);
        if(recentlyAdded[key]['attributes']['artwork'] === undefined) return;
        artworkWrapper.innerHTML = '<i class="fas fa-play left" onclick="playItem(\'' + recentlyAdded[key]['id'] + '\', \'' + recentlyAdded[key]['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50') + '\', \'album\')"></i><i class="fas fa-ellipsis-h right" onclick="modernContextMenu(this)"></i>';

        var artworkImg = document.createElement('img');
        if(recentlyAdded[key]['attributes']['artwork'] !== undefined) {
            artworkImg.src = recentlyAdded[key]['attributes']['artwork']['url'].replace('{w}', '200').replace('{h}', '200').replace('{f}', 'jpg');
        } else {
            return;
        }
        artworkImg.setAttribute('draggable', 'false');
        artworkImg.setAttribute('onclick', 'presentAlbum("' + recentlyAdded[key]['id'] + '")');
        artworkImg.setAttribute('oncontextmenu', 'modernContextMenu(this)');
        artworkWrapper.appendChild(artworkImg);

        if(recentlyAdded[key]['attributes']['artistName'] === undefined) return;

        var artworkText = document.createElement('h5');
        artworkText.innerHTML = recentlyAdded[key]['attributes']['name'] + '<span>' + recentlyAdded[key]['attributes']['artistName'] + '</span>';

        if(checkDictPathExists(recentlyAdded, [key, 'relationships', 'artists', 'data', 0, 'relationships', 'catalog', 'data', 0])) {
            var id = recentlyAdded[key]['relationships']['artists']['data'][0]['relationships']['catalog']['data'][0]['id'];
        } else {
            var id = 0;
        }
        artworkText.setAttribute('onclick', 'presentArtist("' + id + '")');
        artworkWrapper.appendChild(artworkText);

        document.getElementById('c-recently-added').appendChild(artworkWrapper);
    });
}

function saveRecentlyAdded(offset) {
    return new Promise(resolve => {
        var getCreds = keytar.findCredentials('AppleMusic');
        getCreds.then((creds) => {
            var credsDict = formatCredsDict(creds);

            var url = "https://amp-api.music.apple.com/v1/me/library/recently-added?l=en-gb&offset=" + offset + "&platform=web&include[library-albums]=artists&include[library-artists]=catalog&fields[artists]=url&fields%5Balbums%5D=artistName%2CartistUrl%2Cartwork%2CcontentRating%2CeditorialArtwork%2Cname%2CplayParams%2CreleaseDate%2Curl&includeOnly=catalog%2Cartists&limit=25";
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url);

            xhr.setRequestHeader("authorization", credsDict['Authorization']);
            xhr.setRequestHeader("cache-control", "no-cache");
            xhr.setRequestHeader("media-user-token", credsDict['MUT']);
            xhr.setRequestHeader("accept", "*/*");
            xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

            xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                resolve(JSON.parse(xhr.responseText)['data']);
                recentlyAddedOffset = recentlyAddedOffset + 25;
            }};

            xhr.send();
        });
    });
}

function getLastAddedItem() {
    return new Promise(resolve => {
        var getCreds = keytar.findCredentials('AppleMusic');
        getCreds.then((creds) => {
            var credsDict = formatCredsDict(creds);

            var url = "https://amp-api.music.apple.com/v1/me/library/recently-added?l=en-gb&platform=web&include%5Blibrary-albums%5D=artists&include%5Blibrary-artists%5D=catalog&fields%5Bartists%5D=url&fields%5Balbums%5D=artistName%2CartistUrl%2Cartwork%2CcontentRating%2CeditorialArtwork%2Cname%2CplayParams%2CreleaseDate%2Curl&includeOnly=catalog%2Cartists&limit=1";
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url);

            xhr.setRequestHeader("authorization", credsDict['Authorization']);
            xhr.setRequestHeader("cache-control", "no-cache");
            xhr.setRequestHeader("media-user-token", credsDict['MUT']);
            xhr.setRequestHeader("accept", "*/*");
            xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

            xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                resolve(JSON.parse(xhr.responseText)['data'][0]);
            }};

            xhr.send();
        });
    });
}

var lastAlbumScrollHeight = 0;

async function scrollingAlbums() {
    var albumsDiv = document.getElementById('c-albums');
    if(albumsDiv.scrollTop >= albumsDiv.scrollHeight - albumsDiv.clientHeight - 500 && albumsDiv.scrollHeight - albumsDiv.clientHeight > lastAlbumScrollHeight) {
        lastAlbumScrollHeight = albumsDiv.scrollHeight - albumsDiv.clientHeight;
        albums = await saveAlbums(albumsOffset);
        insertAlbums();
    }
}

function insertAlbums() {
    Object.keys(albums).forEach(function(key) {
        var artworkWrapper = document.createElement('div');
        artworkWrapper.setAttribute('parent', '');
        artworkWrapper.setAttribute('media_type', 'albums');
        artworkWrapper.setAttribute('media_id', albums[key]['id']);
        var artworkURL = 'assets/loadingArtwork.png';
        if(albums[key]['attributes']['artwork'] !== undefined) artworkURL = albums[key]['attributes']['artwork']['url'];
        artworkWrapper.innerHTML = '<i class="fas fa-play left" onclick="playItem(\'' + albums[key]['id'] + '\', \'' + artworkURL.replace('{w}', '50').replace('{h}', '50').replace('{f}', 'jpg') + '\', \'album\')"></i><i class="fas fa-ellipsis-h right" onclick="modernContextMenu(this)"></i>';

        var artworkImg = document.createElement('img');
        if(artworkURL == 'assets/loadingArtwork.png') artworkURL = 'assets/noArtwork.png';
        artworkImg.src = artworkURL.replace('{w}', '200').replace('{h}', '200').replace('{f}', 'jpg');
        artworkImg.setAttribute('draggable', 'false');
        artworkImg.setAttribute('onclick', 'presentAlbum("' + albums[key]['id'] + '")')
        artworkImg.setAttribute('oncontextmenu', 'modernContextMenu(this)');
        artworkWrapper.appendChild(artworkImg);

        var artworkText = document.createElement('h5');
        if(checkDictPathExists(albums, [key, 'relationships', 'artists', 'data', 0, 'relationships', 'catalog', 'data', 0, 'id'])) {
            var id = albums[key]['relationships']['artists']['data'][0]['relationships']['catalog']['data'][0]['id'];
        } else {
            var id = 0;
        }
        artworkText.innerHTML = albums[key]['attributes']['name'] + '<span onclick="presentArtist(\'' + id + '\')">' + albums[key]['attributes']['artistName'] + '</span>';
        artworkWrapper.appendChild(artworkText);

        document.getElementById('c-albums').appendChild(artworkWrapper);
    });
}

function saveAlbums(offset) {
    return new Promise(resolve => {
        var getCreds = keytar.findCredentials('AppleMusic');
        getCreds.then((creds) => {
            var credsDict = formatCredsDict(creds);

            var url = "https://amp-api.music.apple.com/v1/me/library/albums?l=en-gb&platform=web&limit=100&offset=" + offset + "&include[library-albums]=artists&include[library-artists]=catalog&include[albums]=artists&fields[artists]=name%2Curl&fields%5Balbums%5D=artistName%2CartistUrl%2Cartwork%2CcontentRating%2CeditorialArtwork%2Cname%2CplayParams%2CreleaseDate%2Curl&includeOnly=catalog%2Cartists";

            var xhr = new XMLHttpRequest();
            xhr.open("GET", url);

            xhr.setRequestHeader("authorization", credsDict['Authorization']);
            xhr.setRequestHeader("media-user-token", credsDict['MUT']);
            xhr.setRequestHeader("accept", "*/*");
            xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

            xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                resolve(JSON.parse(xhr.responseText)['data']);
                albumsOffset = albumsOffset + 100;
            }};

            xhr.send();
        });
    });
}

var lastArtistsScrollHeight = 0;

async function scrollingArtists() {
    var artistsDiv = document.getElementById('artists-navbar');
    if(artistsDiv.scrollTop >= artistsDiv.scrollHeight - artistsDiv.clientHeight - 500 && artistsDiv.scrollHeight - artistsDiv.clientHeight > lastArtistsScrollHeight) {
        lastArtistsScrollHeight = artistsDiv.scrollHeight - artistsDiv.clientHeight;
        artists = await saveArtists(artistsOffset);
        insertArtists();
    }
}

function insertArtists() {
    Object.keys(artists).forEach(function(key) {
        var artistDiv = document.createElement('div');
        artistDiv.className = 'artist-line';
        artistDiv.setAttribute('onclick', 'selectArtist(this)');
        artistDiv.setAttribute('artist_id', artists[key]['id']);
        artistDiv.setAttribute('artist_name', artists[key]['attributes']['name']);
        artistDiv.setAttribute('oncontextmenu', 'modernContextMenu(this)');
        if(artists[key]['relationships']['catalog']['data'][0]) {
            if(artists[key]['relationships']['catalog']['data'][0]['attributes']['artwork'] !== undefined) {
                artistDiv.setAttribute('artist_avatar', artists[key]['relationships']['catalog']['data'][0]['attributes']['artwork']['url'].replace('{w}', '120').replace('{h}', '120'));
            } else {
                artistDiv.setAttribute('artist_avatar', '');
            }
        } else {
            artistDiv.setAttribute('artist_avatar', '');
        }

        if(artists[key]['relationships']['catalog']['data'][0]) {
            if(artists[key]['relationships']['catalog']['data'][0]['attributes']['artwork'] !== undefined) {
                artistDiv.innerHTML = '<img src="' + artists[key]['relationships']['catalog']['data'][0]['attributes']['artwork']['url'].replace('{w}', '200').replace('{h}', '200') + '" draggable="false" /><span>' + artists[key]['attributes']['name'] + '</span>';
            } else {
                artistDiv.innerHTML = '<img src="assets/artistBig.svg" draggable="false" class="no-image" /><span>' + artists[key]['attributes']['name'] + '</span>';
            }
        } else {
            artistDiv.innerHTML = '<img src="assets/artistBig.svg" draggable="false" class="no-image" /><span>' + artists[key]['attributes']['name'] + '</span>';
        }
        
        document.getElementById('artists-navbar').appendChild(artistDiv);
    });
}

function saveArtists(offset) {
    return new Promise(resolve => {
        var getCreds = keytar.findCredentials('AppleMusic');
        getCreds.then((creds) => {
            var credsDict = formatCredsDict(creds);

            var url = "https://amp-api.music.apple.com/v1/me/library/artists?l=en-gb&platform=web&include=catalog&limit=100&offset=" + offset;

            var xhr = new XMLHttpRequest();
            xhr.open("GET", url);

            xhr.setRequestHeader("authorization", credsDict['Authorization']);
            xhr.setRequestHeader("media-user-token", credsDict['MUT']);
            xhr.setRequestHeader("accept", "*/*");
            xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

            xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                resolve(JSON.parse(xhr.responseText)['data']);
                artistsOffset = artistsOffset + 100;
            }};

            xhr.send();
        });
    });
}

function getAlbumsForArtist(id) {
    return new Promise(resolve => {
        var getCreds = keytar.findCredentials('AppleMusic');
        getCreds.then((creds) => {
            var credsDict = formatCredsDict(creds);

            var url = "https://amp-api.music.apple.com/v1/me/library/artists/" + id + "/albums?l=en-gb&platform=web&include[library-albums]=artists%2Ctracks&include[library-artists]=catalog&fields[artists]=url&includeOnly=catalog%2Cartists";

            var xhr = new XMLHttpRequest();
            xhr.open("GET", url);

            xhr.setRequestHeader("authorization", credsDict['Authorization']);
            xhr.setRequestHeader("media-user-token", credsDict['MUT']);
            xhr.setRequestHeader("accept", "*/*");
            xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

            xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                resolve(JSON.parse(xhr.responseText)['data']);
            }};

            xhr.send();
        });
    });
}

var lastSongsScrollHeight = 0;

async function scrollingSongs() {
    var songsDiv = document.getElementById('c-songs');
    if(songsDiv.scrollTop >= songsDiv.scrollHeight - songsDiv.clientHeight - 500 && songsDiv.scrollHeight - songsDiv.clientHeight > lastSongsScrollHeight) {
        lastSongsScrollHeight = songsDiv.scrollHeight - songsDiv.clientHeight;
        songs = await saveSongs(songsOffset);
        insertSongs();
    }
}

function insertSongs() {
    Object.keys(songs).forEach(function(key) {
        var tableTr = document.createElement('tr');
        tableTr.className= 'song-line';
        tableTr.setAttribute('media_type', 'songs');
        tableTr.setAttribute('media_id', songs[key]['id']); //offline id
        tableTr.setAttribute('song_duration', Math.round(songs[key]['attributes']['durationInMillis'] / 1000));
        tableTr.setAttribute('onclick', 'selectSong(this)');
        tableTr.setAttribute('parent', '');
        tableTr.setAttribute('oncontextmenu', 'modernContextMenu(this)');

        var nameTh = document.createElement('th');
        nameTh.className = 'name';
        nameTh.innerHTML = '<i class="fas fa-ellipsis-h" onclick="modernContextMenu(this)"></i><i class="fas fa-play"></i><img src="' + songs[key]['attributes']['artwork']['url'].replace('{w}', '36').replace('{h}', '36').replace('{f}', 'jpg') + '" onclick="playSong(\'' + songs[key]['id'] + '\', \'' + songs[key]['attributes']['name'].replaceAll("'", "\\'") + '\', \'' + songs[key]['attributes']['artwork']['url'].replace('{w}', '46').replace('{h}', '46') + '\', \'' + songs[key]['attributes']['artistName'].replaceAll("'", "\\'") + '\', \'' + songs[key]['attributes']['albumName'].replaceAll("'", "\\'") + '\', \'' + Math.round(songs[key]['attributes']['durationInMillis'] / 1000) + '\')" /><span>' + songs[key]['attributes']['name'] + '</span>';
        tableTr.appendChild(nameTh);

        var artistTh = document.createElement('th');
        artistTh.innerHTML = '<span class="song-link">' + songs[key]['attributes']['artistName'] + '</span>';
        tableTr.appendChild(artistTh);

        var albumTh = document.createElement('th');
        albumTh.innerHTML = '<span class="song-link">' + songs[key]['attributes']['albumName'] + '</span>';
        tableTr.appendChild(albumTh);

        var timeTh = document.createElement('th');
        min = Math.floor((songs[key]['attributes']['durationInMillis']/1000/60) << 0),
        sec = Math.floor((songs[key]['attributes']['durationInMillis']/1000) % 60);
        if (sec < 10) {
            sec = '0' + sec;
        }
        timeTh.innerHTML = '<span>' + min + ':' + sec + '</span>';
        tableTr.appendChild(timeTh);

        document.getElementById('songs-list').appendChild(tableTr);
    });
}

function saveSongs(offset) {
    return new Promise(resolve => {
        var getCreds = keytar.findCredentials('AppleMusic');
        getCreds.then((creds) => {
            var credsDict = formatCredsDict(creds);

            var url = "https://amp-api.music.apple.com/v1/me/library/songs?limit=100&offset=" + offset + "&l=en-gb&platform=web";
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url);

            xhr.setRequestHeader("authorization", credsDict['Authorization']);
            xhr.setRequestHeader("media-user-token", credsDict['MUT']);
            xhr.setRequestHeader("accept", "*/*");
            xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

            xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                resolve(JSON.parse(xhr.responseText)['data']);
                songsOffset = songsOffset + 100;
            }};

            xhr.send();
        });
    });
}

function savePlaylists() {
    return new Promise(resolve => {
        var getCreds = keytar.findCredentials('AppleMusic');
        getCreds.then((creds) => {
            var credsDict = formatCredsDict(creds);

            var url = "https://amp-api.music.apple.com/v1/me/library/playlist-folders/p.playlistsroot/children?l=en-gb&platform=web&fields=name%2CcanDelete%2CcanEdit";

            var xhr = new XMLHttpRequest();
            xhr.open("GET", url);
            
            xhr.setRequestHeader("authorization", credsDict['Authorization']);
            xhr.setRequestHeader("media-user-token", credsDict['MUT']);
            xhr.setRequestHeader("accept", "*/*");
            xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");
            
            xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                resolve(JSON.parse(xhr.responseText)['data']);
            }};
            
            xhr.send();
        });
    });
}

function getAlbumData(id) {
    return new Promise(resolve => {
        var getCreds = keytar.findCredentials('AppleMusic');
        getCreds.then((creds) => {
            var credsDict = formatCredsDict(creds);

            var url = "https://amp-api.music.apple.com/v1/me/library/albums/" + id + "?l=en-gb&platform=web&include[library-albums]=artists%2Ctracks&include[library-artists]=catalog&include[albums]=artists%2Ctracks&fields[artists]=name%2Curl&includeOnly=catalog%2Cartists%2Ctracks";

            var xhr = new XMLHttpRequest();
            xhr.open("GET", url);

            xhr.setRequestHeader("authorization", credsDict['Authorization']);
            xhr.setRequestHeader("media-user-token", credsDict['MUT']);
            xhr.setRequestHeader("accept", "*/*");
            xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

            xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                resolve(JSON.parse(xhr.responseText)['data'][0]);
            }};

            xhr.send();
        });
    });
}

function getOnlineAlbumData(id) {
    return new Promise(resolve => {
        var url = "https://amp-api.music.apple.com/v1/catalog/fr/albums/" + id + "?l=en-gb&platform=web&omit%5Bresource%5D=autos&include=tracks%2Cartists%2Crecord-labels&include%5Bsongs%5D=artists%2Ccomposers&include%5Bmusic-videos%5D=artists%2Ccomposers&extend=offers%2Cpopularity%2CeditorialVideo&views=appears-on%2Cmore-by-artist%2Crelated-videos%2Cother-versions%2Cyou-might-also-like%2Cvideo-extras%2Caudio-extras&fields%5Bartists%5D=name%2Curl&fields%5Balbums%3Aalbums%5D=artistName%2CartistUrl%2Cartwork%2CcontentRating%2CeditorialArtwork%2Cname%2CplayParams%2CreleaseDate%2Curl&fields%5Brecord-labels%5D=name%2Curl&extend%5Balbums%5D=editorialArtwork&art%5Burl%5D=f";

        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);

        xhr.setRequestHeader("authorization", "Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldlYlBsYXlLaWQifQ.eyJpc3MiOiJBTVBXZWJQbGF5IiwiaWF0IjoxNjI0NjQwODcyLCJleHAiOjE2NDAxOTI4NzJ9.yT3syIsyvTJDVG-3tFfZU0BDC-3uw-mGhHvBzhfNW1Qyyq2z5YHVVpbBfWTyVHHXznIM3efAAwvnD5L365exUw");
        xhr.setRequestHeader("media-user-token", "As4DmOfm1sM8WjKAD2g4JqSBcJeSoTGl+WlAThicP3M7DVWg7RxaM1t6GrDbpiyeSl2/R75H+ENi7C5l+jtDeXV9+KcBHiTZuRzDYrvMlPIwIkZzbrf7T7aVvYR6OBWKHvzlRSl5cD2WfPJkPDIPNrppd4ASdU0jwJNA/1F1aF9VZjHEYa/z34WHu6QAjwwp26jNoWoZJC8r4n0NPJm0awjjioBGYd+DcPEJ1d7N8FJFWm43Rg==");
        xhr.setRequestHeader("accept", "*/*");
        xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

        xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            resolve(JSON.parse(xhr.responseText)['data'][0]);
        }};

        xhr.send();
    });
}

function getArtistData(id) { //online id
    return new Promise(resolve => {
        var url = "https://amp-api.music.apple.com/v1/catalog/fr/artists/" + id + "?l=en-gb&platform=web&omit%5Bresource%5D=autos&views=featured-release%2Cfull-albums%2Cappears-on-albums%2Cfeatured-albums%2Cfeatured-on-albums%2Csingles%2Ccompilation-albums%2Clive-albums%2Clatest-release%2Ctop-music-videos%2Csimilar-artists%2Ctop-songs%2Cplaylists%2Cmore-to-hear%2Cmore-to-see&extend=artistBio%2CbornOrFormed%2CeditorialArtwork%2CeditorialVideo%2CisGroup%2Corigin%2Chero&extend%5Bplaylists%5D=trackCount&omit%5Bresource%3Asongs%5D=relationships&fields%5Balbums%5D=artistName%2CartistUrl%2Cartwork%2CcontentRating%2CeditorialArtwork%2Cname%2CplayParams%2CreleaseDate%2Curl%2CtrackCount&limit[artists%3Atop-songs]=20&art%5Burl%5D=f";

        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);

        xhr.setRequestHeader("authorization", "Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldlYlBsYXlLaWQifQ.eyJpc3MiOiJBTVBXZWJQbGF5IiwiaWF0IjoxNjI0NjQwODcyLCJleHAiOjE2NDAxOTI4NzJ9.yT3syIsyvTJDVG-3tFfZU0BDC-3uw-mGhHvBzhfNW1Qyyq2z5YHVVpbBfWTyVHHXznIM3efAAwvnD5L365exUw");
        xhr.setRequestHeader("media-user-token", "As4DmOfm1sM8WjKAD2g4JqSBcJeSoTGl+WlAThicP3M7DVWg7RxaM1t6GrDbpiyeSl2/R75H+ENi7C5l+jtDeXV9+KcBHiTZuRzDYrvMlPIwIkZzbrf7T7aVvYR6OBWKHvzlRSl5cD2WfPJkPDIPNrppd4ASdU0jwJNA/1F1aF9VZjHEYa/z34WHu6QAjwwp26jNoWoZJC8r4n0NPJm0awjjioBGYd+DcPEJ1d7N8FJFWm43Rg==");
        xhr.setRequestHeader("accept", "*/*");
        xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

        xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            resolve(JSON.parse(xhr.responseText)['data'][0]);
        }};

        xhr.send();
    });
}

function handleCMAddToLibrary() {
    var parent = null;

    //nasty af
    var element = document.querySelector('[contexted]');
    if(element.parentNode.getAttribute('parent') !== null) {
        parent = element.parentNode;
    } else if(element.parentNode.parentNode.getAttribute('parent') !== null) {
        parent = element.parentNode.parentNode;
    } else if(element.parentNode.parentNode.parentNode.getAttribute('parent') !== null) {
        parent = element.parentNode.parentNode.parentNode;
    }

    if(parent !== null) {
        if(parent.getAttribute('media_type') != 'artists' && parent.getAttribute('media_type') != 'apple-curators' && !parent.getAttribute('media_id').includes('.')) {
            addItemToLibrary(parent.getAttribute('media_id'), parent.getAttribute('media_type'));            
        }
        else console.log('Unauthorized handleCMAddToLibrary');
    }
    else console.log('No data was found for the opened context menu.');
}

function handleCMRemoveFromLibrary() {
    var parent = null;

    //nasty af
    var element = document.querySelector('[contexted]');
    if(element.parentNode.getAttribute('parent') !== null) {
        parent = element.parentNode;
    } else if(element.parentNode.parentNode.getAttribute('parent') !== null) {
        parent = element.parentNode.parentNode;
    } else if(element.parentNode.parentNode.parentNode.getAttribute('parent') !== null) {
        parent = element.parentNode.parentNode.parentNode;
    }

    if(parent !== null) {
        if(parent.getAttribute('media_type') != 'artists' && parent.getAttribute('media_type') != 'apple-curators') {
            if(parent.getAttribute('media_id').includes('.')) { //offline
                deleteItemFromLibrary(parent.getAttribute('media_id'), parent.getAttribute('media_type'));
                if(parent.getAttribute('parent') != 'nodelete') {
                    parent.remove();

                    if(document.getElementById('c-album').style.display = 'block' && document.getElementById('c-album').getAttribute('item_id') !== null) {
                        document.getElementById('album-show-complete-album').className = '';
                        document.getElementById('album-show-complete-album').setAttribute('onclick', 'presentOnlineAlbum("' + document.getElementById('c-album').getAttribute('item_id') + '")');                
                    }
                }
            } else { //online
                //handle remove from online library if this case exists
            }
        }
        else console.log('Unauthorized handleCMRemoveFromLibrary');
    }
    else console.log('No data was found for the opened context menu.');
}

function getInfoForSearch(text) {
    return new Promise(resolve => {
        var url = "https://amp-api.music.apple.com/v1/catalog/fr/search/suggestions?term=" + text + "&l=en-gb&platform=web&types=albums%2Cartists%2Csongs%2Cplaylists%2Cmusic-videos%2Cactivities%2Ctv-episodes%2Ceditorial-items%2Cstations%2Crecord-labels&kinds=terms%2CtopResults&omit[resource]=autos&fields%5Balbums%5D=artistName%2CartistUrl%2Cartwork%2CcontentRating%2CeditorialArtwork%2Cname%2CplayParams%2CreleaseDate%2Curl&limit[results%3Aterms]=5&limit[results%3AtopResults]=10";

        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);

        xhr.setRequestHeader("authorization", "Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldlYlBsYXlLaWQifQ.eyJpc3MiOiJBTVBXZWJQbGF5IiwiaWF0IjoxNjI0NjQwODcyLCJleHAiOjE2NDAxOTI4NzJ9.yT3syIsyvTJDVG-3tFfZU0BDC-3uw-mGhHvBzhfNW1Qyyq2z5YHVVpbBfWTyVHHXznIM3efAAwvnD5L365exUw");
        xhr.setRequestHeader("media-user-token", "As4DmOfm1sM8WjKAD2g4JqSBcJeSoTGl+WlAThicP3M7DVWg7RxaM1t6GrDbpiyeSl2/R75H+ENi7C5l+jtDeXV9+KcBHiTZuRzDYrvMlPIwIkZzbrf7T7aVvYR6OBWKHvzlRSl5cD2WfPJkPDIPNrppd4ASdU0jwJNA/1F1aF9VZjHEYa/z34WHu6QAjwwp26jNoWoZJC8r4n0NPJm0awjjioBGYd+DcPEJ1d7N8FJFWm43Rg==");
        xhr.setRequestHeader("accept", "*/*");
        xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

        xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            resolve(JSON.parse(xhr.responseText)['results']);
        }};

        xhr.send();
    });
}

function getSearchData(text) {
    return new Promise(resolve => {
        var url = "https://amp-api.music.apple.com/v1/catalog/fr/search?term=" + text + "&l=en-gb&platform=web&types=activities%2Calbums%2Capple-curators%2Cartists%2Ccurators%2Ceditorial-items%2Cmusic-movies%2Cmusic-videos%2Cplaylists%2Csongs%2Cstations%2Ctv-episodes%2Cuploaded-videos%2Crecord-labels&limit=25&relate%5Beditorial-items%5D=contents&include[editorial-items]=contents&include[albums]=artists&include[songs]=artists&include[music-videos]=artists&extend=artistUrl&fields[artists]=url%2Cname%2Cartwork&fields%5Balbums%5D=artistName%2CartistUrl%2Cartwork%2CcontentRating%2CeditorialArtwork%2Cname%2CplayParams%2CreleaseDate%2Curl&with=serverBubbles%2ClyricHighlights&art%5Burl%5D=f&omit%5Bresource%5D=autos";

        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);

        xhr.setRequestHeader("authorization", "Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldlYlBsYXlLaWQifQ.eyJpc3MiOiJBTVBXZWJQbGF5IiwiaWF0IjoxNjI0NjQwODcyLCJleHAiOjE2NDAxOTI4NzJ9.yT3syIsyvTJDVG-3tFfZU0BDC-3uw-mGhHvBzhfNW1Qyyq2z5YHVVpbBfWTyVHHXznIM3efAAwvnD5L365exUw");
        xhr.setRequestHeader("media-user-token", "As4DmOfm1sM8WjKAD2g4JqSBcJeSoTGl+WlAThicP3M7DVWg7RxaM1t6GrDbpiyeSl2/R75H+ENi7C5l+jtDeXV9+KcBHiTZuRzDYrvMlPIwIkZzbrf7T7aVvYR6OBWKHvzlRSl5cD2WfPJkPDIPNrppd4ASdU0jwJNA/1F1aF9VZjHEYa/z34WHu6QAjwwp26jNoWoZJC8r4n0NPJm0awjjioBGYd+DcPEJ1d7N8FJFWm43Rg==");
        xhr.setRequestHeader("accept", "*/*");
        xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

        xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            resolve(JSON.parse(xhr.responseText)['results']);
        }};

        xhr.send();
    });
}

function addItemToLibrary(id, item) { // online id: 411564564
    return new Promise(resolve => {
        var getCreds = keytar.findCredentials('AppleMusic');
        getCreds.then((creds) => {
            var credsDict = formatCredsDict(creds);
            
            var url = "https://amp-api.music.apple.com/v1/me/library?ids[" + item + "]=" + id;

            var xhr = new XMLHttpRequest();
            xhr.open("POST", url);

            xhr.setRequestHeader("authorization", credsDict['Authorization']);
            xhr.setRequestHeader("media-user-token", credsDict['MUT']);
            xhr.setRequestHeader("accept", "*/*");
            xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

            xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                resolve(xhr.status);
                
                setTimeout(async function() {
                    var addedItem = await getLastAddedItem();

                    var done = false;
                    document.getElementById('c-recently-added').querySelectorAll('div[parent]').forEach(function(item) {
                        if(item.getAttribute('media_id') == addedItem['id']) {
                        document.getElementById('c-recently-added').prepend(item);
                            done = true;
                        }
                    });

                    if(!done) {
                            var  artworkWrapper = document.createElement('div');
                            artworkWrapper.setAttribute('parent', '');
                            artworkWrapper.setAttribute('media_type', 'albums');
                            artworkWrapper.setAttribute('media_id', addedItem['id']);
                            if(addedItem['attributes']['artwork'] === undefined) return;
                            artworkWrapper.innerHTML = '<i class="fas fa-play left" onclick="playItem(\'' + addedItem['id'] + '\', \'' + addedItem['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50') + '\', \'album\')"></i><i class="fas fa-ellipsis-h right" onclick="modernContextMenu(this)"></i>';
                    
                            var artworkImg = document.createElement('img');
                            if(addedItem['attributes']['artwork'] !== undefined) {
                                artworkImg.src = addedItem['attributes']['artwork']['url'].replace('{w}', '200').replace('{h}', '200').replace('{f}', 'jpg');
                            } else {
                                return;
                            }
                            artworkImg.setAttribute('draggable', 'false');
                            artworkImg.setAttribute('onclick', 'presentAlbum("' + addedItem['id'] + '")');
                            artworkWrapper.appendChild(artworkImg);
                        
                            if(addedItem['attributes']['artistName'] === undefined) return;
                        
                            var artworkText = document.createElement('h5');
                            artworkText.innerHTML = addedItem['attributes']['name'] + '<span>' + addedItem['attributes']['artistName'] + '</span>';
                        
                            if(addedItem['relationships']['artists']['data'][0]['relationships']['catalog']['data'][0] !== undefined) {
                                var id = addedItem['relationships']['artists']['data'][0]['relationships']['catalog']['data'][0]['id'];
                            } else {
                                var id = 0;
                            }
                            artworkText.setAttribute('onclick', 'presentArtist("' + id + '")');
                            artworkWrapper.appendChild(artworkText);
                        
                            document.getElementById('c-recently-added').prepend(artworkWrapper);
                        }
                    }, 5100);
                }};
            xhr.send();
        });
    });
}

function deleteItemFromLibrary(id, item) { //offline id: i.uhgGhyGFy
    return new Promise(resolve => {
        var url = "https://amp-api.music.apple.com/v1/me/library/" + item + "/" + id;

        var xhr = new XMLHttpRequest();
        xhr.open("DELETE", url);

        xhr.setRequestHeader("authorization", "Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldlYlBsYXlLaWQifQ.eyJpc3MiOiJBTVBXZWJQbGF5IiwiaWF0IjoxNjI0NjQwODcyLCJleHAiOjE2NDAxOTI4NzJ9.yT3syIsyvTJDVG-3tFfZU0BDC-3uw-mGhHvBzhfNW1Qyyq2z5YHVVpbBfWTyVHHXznIM3efAAwvnD5L365exUw");
        xhr.setRequestHeader("media-user-token", "As4DmOfm1sM8WjKAD2g4JqSBcJeSoTGl+WlAThicP3M7DVWg7RxaM1t6GrDbpiyeSl2/R75H+ENi7C5l+jtDeXV9+KcBHiTZuRzDYrvMlPIwIkZzbrf7T7aVvYR6OBWKHvzlRSl5cD2WfPJkPDIPNrppd4ASdU0jwJNA/1F1aF9VZjHEYa/z34WHu6QAjwwp26jNoWoZJC8r4n0NPJm0awjjioBGYd+DcPEJ1d7N8FJFWm43Rg==");
        xhr.setRequestHeader("accept", "*/*");
        xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

        xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            resolve(xhr.status);
        }};

        xhr.send();
    });
}

function removeItemFromLibrary(id, type) { //offline id: i.uhgGhyGFy
    return new Promise(resolve => {
        var url = "https://amp-api.music.apple.com/v1/me/library/" + type + "/" + id;

        var xhr = new XMLHttpRequest();
        xhr.open("DELETE", url);

        xhr.setRequestHeader("authorization", "Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldlYlBsYXlLaWQifQ.eyJpc3MiOiJBTVBXZWJQbGF5IiwiaWF0IjoxNjI2OTg0ODk4LCJleHAiOjE2NDI1MzY4OTh9.Ftw-IRCBuL9EWw7N8yqsnvsmZc5DI_aqG7ic0eZXOfZMAB7lrVij7HGihIo6Jf9C3ZHw5RfZsd2ZDdYn_ncD9A");
        xhr.setRequestHeader("media-user-token", "AmifiDxfj6jga9ItOxFDhtOaliLx6VaMWVnEErN57yBio3mNZSH7aXl2cLb4YqhHYVtizblTkvDBX07LUSbRLhX2p+SbM1acD25vQY8SRtPL5uhYnRUXnzTsiEzwtLj3ep2ydgsBnfl3CzbdXVHs774wZ5JwGAT7HWQcBRgXdL0tRyEzclos8LiO93xS1tPhhola2+RqnrQOmrkkYf2jDizGvIyeJB2TavxjCoDJRfkGRAcgNg==");
        xhr.setRequestHeader("accept", "*/*");
        xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

        xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            resolve(xhr.status);
        }};

        xhr.send();
    });
}

async function prepareRemoveItemFromLibrary(id, type, pane) {
    var result = await removeItemFromLibrary(id, type);

    if(result == 204) {
        switch(pane) {
            case 'recently-added':
                document.querySelectorAll('[contexted]').forEach(function(contextedElement) {
                    contextedElement.parentNode.remove();
                });
                break;
        }
    }
}

function isInLibrary(id, type) { //online id
    return new Promise(resolve => {
        var getCreds = keytar.findCredentials('AppleMusic');
        getCreds.then((creds) => {
            var credsDict = formatCredsDict(creds);

            var url = "https://amp-api.music.apple.com/v1/catalog/fr?l=en-gb&platform=web&omit%5Bresource%5D=autos&fields=inLibrary&relate=library&ids[" + type + "]=" + id;

            var xhr = new XMLHttpRequest();
            xhr.open("GET", url);

            xhr.setRequestHeader("authorization", credsDict['Authorization']);
            xhr.setRequestHeader("cache-control", "no-cache");
            xhr.setRequestHeader("media-user-token", credsDict['MUT']);
            xhr.setRequestHeader("accept", "*/*");
            xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

            xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                resolve(JSON.parse(xhr.responseText)['data'][0]['attributes']['inLibrary']);
            }};

            xhr.send();
        });
    });
}

function getAlbumIdForOnlineSong(id) { //online id
    return new Promise(resolve => {
        var url = "https://amp-api.music.apple.com/v1/catalog/fr/?ids%5Bsongs%5D=" + id + "&l=en-gb&platform=web";

        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        
        xhr.setRequestHeader("authorization", "Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldlYlBsYXlLaWQifQ.eyJpc3MiOiJBTVBXZWJQbGF5IiwiaWF0IjoxNjI0NjQwODcyLCJleHAiOjE2NDAxOTI4NzJ9.yT3syIsyvTJDVG-3tFfZU0BDC-3uw-mGhHvBzhfNW1Qyyq2z5YHVVpbBfWTyVHHXznIM3efAAwvnD5L365exUw");
        xhr.setRequestHeader("media-user-token", "As4DmOfm1sM8WjKAD2g4JqSBcJeSoTGl+WlAThicP3M7DVWg7RxaM1t6GrDbpiyeSl2/R75H+ENi7C5l+jtDeXV9+KcBHiTZuRzDYrvMlPIwIkZzbrf7T7aVvYR6OBWKHvzlRSl5cD2WfPJkPDIPNrppd4ASdU0jwJNA/1F1aF9VZjHEYa/z34WHu6QAjwwp26jNoWoZJC8r4n0NPJm0awjjioBGYd+DcPEJ1d7N8FJFWm43Rg==");
        xhr.setRequestHeader("accept", "*/*");
        xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");
        
        xhr.onreadystatechange = function () {
           if (xhr.readyState === 4) {
                resolve(JSON.parse(xhr.responseText)['data'][0]['relationships']['albums']['data'][0]['id']);
           }};
        
        xhr.send();        
    });
}

function getOfflinePlaylistData(id) { //offline id
    return new Promise(resolve => {
        var getCreds = keytar.findCredentials('AppleMusic');
        getCreds.then((creds) => {
            var credsDict = formatCredsDict(creds);

            var url = "https://amp-api.music.apple.com/v1/me/library/playlists/" + id + "?include=tracks&l=en-gb&platform=web&include%5Blibrary-playlists%5D=catalog%2Ctracks&fields%5Bplaylists%5D=curatorName%2CplaylistType%2Cname%2Cartwork%2Curl&include%5Blibrary-songs%5D=catalog&fields%5Bsongs%5D=artistUrl";

            var xhr = new XMLHttpRequest();
            xhr.open("GET", url);
            
            xhr.setRequestHeader("authorization", credsDict['Authorization']);
            xhr.setRequestHeader("media-user-token", credsDict['MUT']);
            xhr.setRequestHeader("accept", "*/*");
            xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");
            
            xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                resolve(JSON.parse(xhr.responseText)['data'][0]);
            }};
            
            xhr.send();
        });
    });
}

function checkDictPathExists(dict, pathArray) { //returns true if no errors
    var error = null;
    pathArray.forEach(path => {
        if(dict[path] !== undefined) {
            dict = dict[path];
        } else {
            error = true;
        }
    });
    if(error === null) return true;
    else return false;
}