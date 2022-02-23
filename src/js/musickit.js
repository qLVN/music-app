const DiscordRPC = require('discord-rpc');
var ClientId = '858367187756384287';
DiscordRPC.register(ClientId);
const rpc = new DiscordRPC.Client({
    transport: 'ipc'
});

var activity = {
    details: '⌛ Loading...',
    largeImageKey: 'music',
    largeImageText: 'Music vINFDEV2 from LVN',
    smallImageKey: 'play',
    smallImageText: 'Playing',
    instance: false
};

async function setActivity() {
    if (!rpc) {
        return;
    }
    if(playbackState === 1 || playbackState === 2) {
        rpc.setActivity(activity);
    } else {
        rpc.clearActivity();
    }
}
rpc.on('ready', () => {
    setActivity();
    setInterval(() => {
      setActivity();
    }, 1000);
  });

  setActivity();
  setInterval(() => {
    setActivity();
  }, 1000);
  rpc.login({clientId: ClientId}).catch(console.error);

//https://github.com/discordjs/RPC/issues/14#issuecomment-818805016


var playbackState = 0;
var queueItems;

function playSong(id, name, artwork, artist, album, duration) {
    var playbackSlider = document.getElementById('playback-progress-slider');

    displayHeaderSong(name, artwork, artist, album, "loading");
    ipcRenderer.send('MusicJS', 'MusicKit.getInstance().playMediaItem(new MusicKit.MediaItem({ id: "' + id + '" }));');
    
    playbackSlider.setAttribute('max', duration);
    playbackSlider.value = 0;
}

function playOnlineSong(id, artwork) {
    if(document.getElementById('search-window').style.display == 'block') hideSearchBar();
    displayHeaderSong('Loading...', artwork, '', 'assets', "loading");
    ipcRenderer.send('MusicJS', 'MusicKit.getInstance().setQueue({ song: "' + id + '" }).then(function() { MusicKit.getInstance().play(); });');
}

function playItem(id, artwork, item) {
    displayHeaderSong('Loading...', artwork, '', 'assets', "loading");
    ipcRenderer.send('MusicJS', 'MusicKit.getInstance().setQueue({ ' + item + ': "' + id + '" }).then(function() { MusicKit.getInstance().play(); });');
}

function playSongFromItem(id, artwork, index, item) {
    displayHeaderSong('Loading...', artwork, '', 'assets', "loading");
    ipcRenderer.send('MusicJS', 'MusicKit.getInstance().setQueue({ ' + item + ': "' + id + '" }).then(function() { MusicKit.getInstance().changeToMediaAtIndex(' + index + '); });');
}


function playPauseSong() {
    var playPauseButton = document.getElementById('playpause-button');

    if(playbackState == 3) {
        ipcRenderer.send('MusicJS', 'MusicKit.getInstance().play();');
        playPauseButton.src = 'assets/pause.svg';
        ipcRenderer.send('thumbar', 1);
        document.querySelectorAll('svg').forEach(function(element) {
            if(element.classList.toString().includes('playback-bars__svg')) {
                element.classList.add('playing')
            }
        });
    } else {
        ipcRenderer.send('MusicJS', 'MusicKit.getInstance().pause();');
        playPauseButton.src = 'assets/play.svg';
        ipcRenderer.send('thumbar', 0);
        document.querySelectorAll('svg').forEach(function(element) {
            if(element.classList.toString().includes('playback-bars__svg')) {
                element.classList.remove('playing')
            }
        });
    }
}

function isSongPlaying() {
    var end;
    switch(playbackState) {
        case 0:
            end = false;
            break;
        case 1:
            end = true;
            break;
        case 2:
            end = true;
            break;
        case 3:
            end = true;
            break;
        case 4:
            end = false;
            break;
        case 5:
            end = false;
            break;
        case 6:
            end = false;
            break;
        case 7:
            end = false;
            break;
        case 8:
            end = false;
            break;
        case 9:
            end = false;
            break;
        case 10:
            end = false;
            break;
    }

    return end;
}

function setPlaybackState(state) {
    // 0: "none"
    // 1: "loading"
    // 2: "playing"
    // 3: "paused"
    // 4: "stopped"
    // 5: "ended"
    // 6: "seeking"
    // 8: "waiting" //when song is not loaded
    // 9: "stalled"
    // 10: "completed"
    playbackState = state;

    var playbackSlider = document.getElementById('playback-progress-slider');
    var playPauseButton = document.getElementById('playpause-button');
    var playbackWrapper = document.getElementById('playback-progress');
    var playerInfo = document.getElementById('player-info');

    if(state == 1) { //loading
        document.getElementById('playback-progress-loading').style.opacity = '1';
    } else {
        document.getElementById('playback-progress-loading').style.opacity = '0';
    }

    switch(state) {
        case 0:
            setControlButtonsEnabled(false);
            playbackSlider.style.opacity = 0;
            document.getElementById('idle-logo').style.top = '7px';
            ipcRenderer.send('thumbar', 0);
            break;
        case 1:
            setControlButtonsEnabled(false);
            playbackSlider.style.opacity = 0;
            playPauseButton.src = 'assets/pause.svg';
            playerInfo.style.opacity = '1';
            playerInfo.style.display = 'block';
            playbackWrapper.style.opacity = 1;
            document.getElementById('idle-logo').style.top = '40px';
            ipcRenderer.send('thumbar', 1);
            break;
        case 2:
            setControlButtonsEnabled(true);
            playbackSlider.style.opacity = 1;
            playPauseButton.src = 'assets/pause.svg';
            playerInfo.style.opacity = '1';
            playerInfo.style.display = 'block';
            playbackWrapper.style.opacity = 1;
            document.getElementById('idle-logo').style.top = '40px';
            ipcRenderer.send('thumbar', 1);
            break;
        case 3:
            setControlButtonsEnabled(true);
            playbackSlider.style.opacity = 1;
            document.getElementById('idle-logo').style.top = '40px';
            ipcRenderer.send('thumbar', 0);
            break;
        case 4:
            setControlButtonsEnabled(false);
            document.getElementById('idle-logo').style.top = '7px';
            playerInfo.style.opacity = '0';
            setTimeout(function() {
                playerInfo.style.display = 'none';
            }, 200);
            playbackSlider.style.opacity = 0;
            playbackWrapper.style.opacity = 0;
            ipcRenderer.send('thumbar', 0);
            break;
        case 5:
            setControlButtonsEnabled(false);
            playbackSlider.style.opacity = 0;
            document.getElementById('idle-logo').style.top = '7px';
            ipcRenderer.send('thumbar', 0);
            break;
        case 6:
            setControlButtonsEnabled(false);
            playbackSlider.style.opacity = 0;
            document.getElementById('idle-logo').style.top = '7px';
            ipcRenderer.send('thumbar', 0);
            break;
        case 7:
            setControlButtonsEnabled(false);
            playbackSlider.style.opacity = 0;
            document.getElementById('idle-logo').style.top = '7px';
            ipcRenderer.send('thumbar', 0);
            break;
        case 8:
            setControlButtonsEnabled(true);
            playbackSlider.style.opacity = 1;
            document.getElementById('idle-logo').style.top = '40px';
            ipcRenderer.send('thumbar', 0);
            break;
        case 9:
            setControlButtonsEnabled(false);
            playbackSlider.style.opacity = 0;
            document.getElementById('idle-logo').style.top = '7px';
            ipcRenderer.send('thumbar', 0);
            break;
        case 10:
            setControlButtonsEnabled(false);
            playbackSlider.style.opacity = 0;
            document.getElementById('idle-logo').style.top = '7px';
            ipcRenderer.send('thumbar', 0);
            break;
    }
}

function setPlaybackTime(time) {
    var playbackSlider = document.getElementById('playback-progress-slider');
    playbackSlider.value = time;
    var value = (playbackSlider.value-playbackSlider.min)/(playbackSlider.max-playbackSlider.min)*100;
    if(prefs['colorMode'] == 'dark') { //dark
        playbackSlider.style.background = 'linear-gradient(to right, #828282 0%, #828282 ' + value + '%, #666666 ' + value + '%, #666666 100%)';
    } else { //light
        playbackSlider.style.background = 'linear-gradient(to right, #797979 0%, #797979 ' + value + '%, #e0e0e0 ' + value + '%, #e0e0e0 100%)';
    }

    if(document.getElementById('player-info').style.display == 'none') document.getElementById('player-info').style.display = 'block';

    var date = new Date(time * 1000);
    var seconds = date.getUTCSeconds().toString();
    if(seconds.length == 1) seconds = '0' + seconds;
    document.getElementById('player-current-time').innerHTML = date.getUTCMinutes() + ":" + seconds;

    date = new Date(playbackSlider.getAttribute('max') * 1000);
    seconds = date.getUTCSeconds().toString();
    if(seconds.length == 1) seconds = '0' + seconds;
    document.getElementById('player-max-time').innerHTML = date.getUTCMinutes() + ":" + seconds;
}

function setQueueItems(items) {
    queueItems = items;

    document.getElementById('queue-song-list').innerHTML = '';

    var i = 0;
    var index = 0;
    if(nowPlayingItem !== undefined) index = nowPlayingItem['index'] + 1;
    Object.keys(items).forEach(function(song) {
        i++;
        var songLi = document.createElement('li');
        if(i <= index) {
            songLi.style.display = 'none';
        }
        songLi.className = 'queue-song-line';
        songLi.setAttribute('itemQueueIndex', i - 1);
        songLi.setAttribute('parent', '');
        songLi.setAttribute('media_type', 'queue-' + items[song]['item']['type']);
        songLi.setAttribute('media_id', items[song]['item']['id']);
        songLi.setAttribute('onclick', 'selectSongInQueue(this)');
        songLi.setAttribute('ondblclick', 'ipcRenderer.send("MusicJS", "MusicKit.getInstance().changeToMediaAtIndex(' + (i - 1) + ');");');

        min = Math.floor((items[song]['item']['attributes']['durationInMillis']/1000/60) << 0),
        sec = Math.floor((items[song]['item']['attributes']['durationInMillis']/1000) % 60);
        if(sec < 10) {
            sec = '0' + sec;
        }
        songLi.innerHTML = '<img src="' + items[song]['item']['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50') + '" /><span class="title">' + items[song]['item']['attributes']['name'] + '</span><span class="artist">' + items[song]['item']['attributes']['artistName'] + '</span><span class="time">' + min + ':' + sec + '</span><i class="fas fa-ellipsis-h" onclick="modernContextMenu(this)"></i';
        document.getElementById('queue-song-list').appendChild(songLi);
    });

    if(!!document.getElementById('queue-clear')) document.getElementById('queue-clear').remove();

    if(i <= 1) {
        document.getElementById('queue-nosongs').style.display = 'block';
        document.getElementById('queue-upnext').style.display = 'none';
    } else {
        document.getElementById('queue-nosongs').style.display = 'none';
        document.getElementById('queue-upnext').style.display = 'block';

        var clearQueue = document.createElement('span');
        clearQueue.innerHTML = 'Clear';
        clearQueue.id = 'queue-clear';
        clearQueue.setAttribute('onclick', 'ipcRenderer.send("MusicJS", "MusicKit.getInstance().clearQueue();");');
        document.getElementById('queue-wrapper').appendChild(clearQueue);
    }
}

var nowPlayingItem;

function setNowPlayingItem(name, artwork, artist, album, duration, index, id) {
    nowPlayingItem = { name: name, artwork: artwork, artist: artist, album: album, index: index };

    if(activity !== undefined) {
        activity.details = '🎵 ' + name;
        activity.state = '💿 ' + album + ' — ' + artist;
    }
    
    var playerInfo = document.getElementById('player-info');
    playerInfo.setAttribute('media_id', id);
    document.getElementById('player-name').innerText = name;
    document.getElementById('player-sub').innerText = artist + ' — ' + album;
    document.getElementById('player-artwork').src = 'assets/loadingArtwork.png';
    setTimeout(function() {
        document.getElementById('player-artwork').src = artwork;
    }, 0);

    index++;
    var i = 1;
    document.querySelectorAll('.queue-song-line').forEach(function(queueSong) {
        if(i <= index) {
            queueSong.style.display = 'none';
        } else {
            queueSong.style.display = 'block';
        }
        i++;
    });

    document.getElementById('playback-progress-slider').setAttribute('max', duration);
    
    playerInfo.style.opacity = '1';

    if(selectedNavbar == 'album') {
        document.querySelectorAll('.album-show-song-line').forEach(function(element) {
           if(element.getAttribute('media_id') == id) {
               element.querySelector('svg').style.opacity = 1;
               element.querySelector('svg').classList.add('playing');
               element.querySelector('.index').style.opacity = 0;
               element.querySelector('img').src = 'assets/pause.svg';
           } else {
            element.querySelector('svg').style.opacity = 0;
            element.querySelector('svg').classList.remove('playing');
            element.querySelector('.index').style.opacity = 1;
            element.querySelector('img').src = 'assets/play.svg';
           }
        });
    }
}

function playNextOrLater(nextLater, type, id) { //nextLater is 'Next' || 'Later'
    ipcRenderer.send("MusicJS", "MusicKit.getInstance().play" + nextLater + "({ " + type + ": '" + id + "' });");

    var index = 0;
    if(nowPlayingItem !== undefined && nowPlayingItem !== null) index = nowPlayingItem['index'] + 1;
    var i = 1;

    document.querySelectorAll('.queue-song-line').forEach(function(queueSong) {
        if(i <= index) {
            queueSong.style.display = 'none';
        } else {
            queueSong.style.display = 'block';
        }
        i++;
    });
}

function toggleShuffle(customValue) {
    if(customValue !== undefined) {
        var button = document.getElementById('shuffle-button');
        switch(customValue) {
            case 0:
                button.className = 'side';
                ipcRenderer.send("MusicJS", "MusicKit.getInstance().shuffleMode = 0;");
                break;
            case 1:
                button.className = 'side selected';
                ipcRenderer.send("MusicJS", "MusicKit.getInstance().shuffleMode = 1;");
                break;
        }
        return;
    }

    var userDataPath = dataFolderPath + "/data/userdata.json";
    var userDataContent = JSON.parse(fs.readFileSync(userDataPath, 'utf-8').toString());

    if(button.className.includes('selected')) {
        button.className = 'side';
        ipcRenderer.send("MusicJS", "MusicKit.getInstance().shuffleMode = 0;");
        userDataContent.lastShuffleMode = 0;
    } else {
        button.className = 'side selected';
        ipcRenderer.send("MusicJS", "MusicKit.getInstance().shuffleMode = 1;");
        userDataContent.lastShuffleMode = 1;
    }

    fs.writeFileSync(userDataPath, JSON.stringify(userDataContent, null, 4),'utf-8');
}

function changeRepeatMode(button, customValue) {
    var actualRepeatMode = document.getElementById('repeat-button').getAttribute('repeat_mode');

    if(customValue !== undefined) {
        var button = document.getElementById('repeat-button');
        switch (customValue) {
            case 0:
                button.setAttribute('repeat_mode', '0');
                button.className = 'side';
                button.src = 'assets/repeat.svg';
                ipcRenderer.send("MusicJS", "MusicKit.getInstance().repeatMode  = 0;");
                break;
            case 1:
                button.setAttribute('repeat_mode', '1');
                button.className = 'side selected';
                button.src = 'assets/repeatOne.svg';
                ipcRenderer.send("MusicJS", "MusicKit.getInstance().repeatMode  = 1;");
                break;
            case 2:
                button.setAttribute('repeat_mode', '2');
                button.className = 'side selected';
                button.src = 'assets/repeat.svg';
                ipcRenderer.send("MusicJS", "MusicKit.getInstance().repeatMode  = 2;");
                break;
                    
        }

        return;
    }

    //0: no repeat
    //2: repeat
    //1: repeat one-time

    var userDataPath = dataFolderPath + "/data/userdata.json";
    var userDataContent = JSON.parse(fs.readFileSync(userDataPath, 'utf-8').toString());

    switch(actualRepeatMode) {
        case '0': // -> 2
            button.setAttribute('repeat_mode', '2');
            button.className = 'side selected';
            button.src = 'assets/repeat.svg';
            ipcRenderer.send("MusicJS", "MusicKit.getInstance().repeatMode  = 2;");
            userDataContent.lastRepeatMode = 2;
            break;
        case '2': // -> 1
            button.setAttribute('repeat_mode', '1');
            button.className = 'side selected';
            button.src = 'assets/repeatOne.svg';
            ipcRenderer.send("MusicJS", "MusicKit.getInstance().repeatMode  = 1;");
            userDataContent.lastRepeatMode = 1;
            break;
        case '1': // -> 0
            button.setAttribute('repeat_mode', '0');
            button.className = 'side';
            button.src = 'assets/repeat.svg';
            ipcRenderer.send("MusicJS", "MusicKit.getInstance().repeatMode  = 0;");
            userDataContent.lastRepeatMode = 0;
            break;
        default: //if undefined -> 2
            button.setAttribute('repeat_mode', '2');
            button.className = 'side selected';
            button.src = 'assets/repeat.svg';
            ipcRenderer.send("MusicJS", "MusicKit.getInstance().repeatMode  = 2;");
            userDataContent.lastRepeatMode = 2;
            break;
    }

    fs.writeFileSync(userDataPath, JSON.stringify(userDataContent, null, 4),'utf-8');
}