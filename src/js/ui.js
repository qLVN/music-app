const electron = require('electron');
const { ipcRenderer } = require('electron');
const { shell } = require('electron'); //used in html to open links

var lastTab = null;

function useSearchBar() {
    var idleLogo = document.getElementById('idle-logo');
    var searchInput = document.getElementById('search');
    var playerWrapper = document.getElementById('player-wrapper');
    var cancelButton = document.getElementById('cancel-search');

    document.getElementById('playback-progress').style.opacity = 0;

    if(searchInput.style.display == 'none') {
        var playerInfo = document.getElementById('player-info');

        playerInfo.style.opacity = '0';
        setTimeout(function() {
            playerInfo.style.display = 'block';
        }, 200);

        idleLogo.style.top = '40px';
        searchInput.style.opacity = '0';
        searchInput.style.display = 'block';
        cancelButton.style.opacity = '0';
        cancelButton.style.display = 'block';
        searchInput.focus();
        playerWrapper.style.borderColor = 'rgb(255 106 122)';
        setTimeout(function() {
            searchInput.style.opacity = '0.6';
            cancelButton.style.opacity = '0.6';
        }, 0);
    } else {
        presentSearchResult(searchInput.value);
    }
}

async function searchText(text) {
    var suggestionList = document.getElementById('suggestion-list');

    if(document.getElementById('search-window').style.display == 'none') {
        toggleSearchWindow();
    } else if(text == '') {
        toggleSearchWindow();
        return;
    }

    var searchInfo = await getInfoForSearch(text);
    suggestionList.innerHTML = '';
    Object.keys(searchInfo['suggestions']).forEach(function(suggestion) {
        if(searchInfo['suggestions'][suggestion]['kind'] != 'terms') return;
        var suggestionLi = document.createElement('li');
        suggestionLi.innerHTML = '<img src="assets/search.png" /><span>' + searchInfo['suggestions'][suggestion]['displayTerm'].replace(text, '<span>' + text + '</span>') + '</span>';
        suggestionLi.setAttribute('search_term', searchInfo['suggestions'][suggestion]['searchTerm']);
        suggestionLi.setAttribute('onclick', 'presentSearchResult("' + searchInfo['suggestions'][suggestion]['searchTerm'] + '")');

        suggestionList.appendChild(suggestionLi);
    });
    var i = 0;
    Object.keys(searchInfo['suggestions']).forEach(async function(suggestion) {
        if(searchInfo['suggestions'][suggestion]['kind'] != 'topResults') return;
        i++;

        var suggestionDiv = document.createElement('div');
        if(i == 1) suggestionDiv.style.marginTop = '10px';

        var suggestionImg = document.createElement('img');
        suggestionImg.className = 'artwork';
        suggestionImg.src = searchInfo['suggestions'][suggestion]['content']['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50');
        suggestionImg.setAttribute('draggable', 'false');
        suggestionDiv.appendChild(suggestionImg);

        var suggestionTitle = document.createElement('h4');
        suggestionTitle.innerHTML = searchInfo['suggestions'][suggestion]['content']['attributes']['name'];

        var suggestionSub = document.createElement('span');
        var suggestionAdd = document.createElement('img');
        suggestionAdd.setAttribute('draggable', 'false');

        switch(searchInfo['suggestions'][suggestion]['content']['type']) {
            case 'artists':
                suggestionDiv.className = 'artist';
                suggestionSub.innerHTML = 'Artist';
                suggestionAdd.src = 'assets/arrow_right.svg';
                suggestionAdd.className = 'add go';
                suggestionDiv.setAttribute('onclick', 'presentArtist("' + searchInfo['suggestions'][suggestion]['content']['id'] + '")');
                break;
            case 'albums':
                suggestionSub.innerHTML = 'Album · ' + searchInfo['suggestions'][suggestion]['content']['attributes']['artistName'];
                suggestionAdd.src = 'assets/add.svg';
                suggestionAdd.className = 'add';
                if(await isInLibrary(searchInfo['suggestions'][suggestion]['content']['id'], 'albums')) {
                    suggestionAdd.src = 'assets/arrow_right.svg';
                    suggestionAdd.className = 'add go';
                }
                suggestionDiv.setAttribute('onclick', 'presentOnlineAlbum("' + searchInfo['suggestions'][suggestion]['content']['id'] + '")');

                var playImg = document.createElement('img');
                playImg.src = 'assets/play.svg';
                playImg.className = 'play';
                suggestionDiv.appendChild(playImg);

                suggestionImg.setAttribute('onclick', 'playItem("' + searchInfo['suggestions'][suggestion]['id'] + '", "' + searchInfo['suggestions'][suggestion]['content']['attributes']['artwork']['url'].replace('{w}', '40').replace('{h}', '40') + '", "album")');
                break;
            case 'songs':
                suggestionSub.innerHTML = 'Song · ' + searchInfo['suggestions'][suggestion]['content']['attributes']['artistName'];
                suggestionAdd.src = 'assets/add.svg';
                suggestionAdd.className = 'add';
                if(await isInLibrary(searchInfo['suggestions'][suggestion]['content']['id'], 'songs')) {
                    suggestionAdd.src = 'assets/arrow_right.svg';
                    suggestionAdd.className = 'add go';
                } else {
                    suggestionAdd.setAttribute('onclick', 'queueAddSong("' + searchInfo['suggestions'][suggestion]['content']['id'] + '", this)');
                }

                suggestionDiv.setAttribute('onclick', 'presentOnlineAlbum("' + await getAlbumIdForOnlineSong(searchInfo['suggestions'][suggestion]['content']['id']) + '")');
                
                var playImg = document.createElement('img');
                playImg.src = 'assets/play.svg';
                playImg.className = 'play';
                suggestionDiv.appendChild(playImg);

                suggestionImg.setAttribute('onclick', 'playOnlineSong("' + searchInfo['suggestions'][suggestion]['content']['id'] + '", "' + searchInfo['suggestions'][suggestion]['content']['attributes']['artwork']['url'].replace('{w}', '40').replace('{h}', '40') + '")');
                break;
            default:
                return;
        }
        suggestionDiv.appendChild(suggestionTitle);
        suggestionDiv.appendChild(suggestionSub);
        suggestionDiv.appendChild(suggestionAdd);

        suggestionList.appendChild(suggestionDiv);
    });
}

function hideSearchBar() {
    var idleLogo = document.getElementById('idle-logo');
    var searchInput = document.getElementById('search');
    var playerWrapper = document.getElementById('player-wrapper');
    var cancelButton = document.getElementById('cancel-search');
    var playerInfo = document.getElementById('player-info');

    if(isSongPlaying()) {
        playerInfo.style.opacity = '0';
        playerInfo.style.display = 'block';
        setTimeout(function() {
            playerInfo.style.opacity = '1';
        }, 0);
        document.getElementById('playback-progress').style.opacity = '1';
    }

    if(!isSongPlaying()) idleLogo.style.top = '7px';
    playerWrapper.style.borderColor = 'transparent';
    searchInput.style.opacity = '0';
    cancelButton.style.opacity = '0';
    setTimeout(function() {
        searchInput.style.display = 'none';
        cancelButton.style.display = 'none';
        searchInput.value = '';
    }, 400);

    if(document.getElementById('search-window').style.display == 'block') toggleSearchWindow();
}

//volume slider / playback slider / context menu / focus tracker

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("volume").oninput = function() {
        var value = (this.value-this.min)/(this.max-this.min)*100;
        if(prefs['colorMode'] == 'dark' || prefs['colorMode'] == 'system' && systemColorMode == 'dark') {
            this.style.background = 'linear-gradient(to right, #828282 0%, #828282 ' + value + '%, #666666 ' + value + '%, #666666 100%)';
        } else {
            this.style.background = 'linear-gradient(to right, #a0a0a0 0%, #a0a0a0 ' + value + '%, #e0e0e0 ' + value + '%, #e0e0e0 100%)';
        }
        ipcRenderer.send('MusicJS', 'MusicKit.getInstance().volume = ' + this.value + ';');
        var userDataPath = dataFolderPath + "/data/userdata.json";
        var userDataContent = JSON.parse(fs.readFileSync(userDataPath, 'utf-8').toString());
        userDataContent.lastVolume = this.value;
        fs.writeFileSync(userDataPath, JSON.stringify(userDataContent, null, 4),'utf-8');
    };
    document.getElementById("playback-progress-slider").oninput = function() {
        ipcRenderer.send("MusicJS", "MusicKit.getInstance().seekToTime(" + this.value + ")");
        var value = (this.value-this.min)/(this.max-this.min)*100;
        if(prefs['colorMode'] == 'dark' || prefs['colorMode'] == 'system' && systemColorMode == 'dark') {
            this.style.background = 'linear-gradient(to right, #828282 0%, #828282 ' + value + '%, #666666 ' + value + '%, #666666 100%)';
        } else {
            this.style.background = 'linear-gradient(to right, #797979 0%, #797979 ' + value + '%, #e0e0e0 ' + value + '%, #e0e0e0 100%)';
        }
    };
    document.getElementById('search').onkeydown = function(e) {
        if(e.key === 'Enter') {
            presentSearchResult(document.getElementById('search').value);
        } else if(e.key === 'Escape') {
            hideSearchBar();
        }
    }
    $(document).keydown(function(e) {
        if (e.keyCode == 70 && e.ctrlKey) {
            if(document.getElementById('loading-applemusic').style.display == 'none') {
                useSearchBar();
            }
        }
    });
    $(window).click(function() {
        document.getElementById('context-menu').style.pointerEvents = 'none';
        document.getElementById('context-menu').style.opacity = 0;
        document.getElementById('context-menu').style.zIndex = 11;
    });

    function onBlur() {
        document.body.className = 'is-not-focused';
    };
    function onFocus(){
        document.body.className = 'is-focused';
    };
    
    window.onfocus = onFocus;
    window.onblur = onBlur;
});

selectedNavbar = null;

function navBarSelect(id, isExtra, playlistButton) {
    if(isExtra != true) isExtra = false;

    lastTab = selectedNavbar;
    selectedNavbar = id;

    var userDataPath = dataFolderPath + "/data/userdata.json";
    var userDataContent = JSON.parse(fs.readFileSync(userDataPath, 'utf-8').toString());
    if(userDataContent.isConnected != 1) { //not connected, can't switch item
        document.getElementById('nb-account').style.backgroundColor = '#e2e2e2';
        document.getElementById('c-account').style.display = 'block';
    } else {
        if(!isExtra) {
            userDataContent.lastOpenedNavbarItem = id;
            fs.writeFileSync(userDataPath, JSON.stringify(userDataContent, null, 4),'utf-8');
        } 
        document.querySelectorAll('.nb-item').forEach(function(item) {
            item.style.backgroundColor = 'transparent';
            item.style.boxShadow = 'none';
        });
        if(!isExtra) {
            if(prefs['colorMode'] == 'dark' || prefs['colorMode'] == 'system' && systemColorMode == 'dark') {
                document.getElementById('nb-' + id).style.backgroundColor = 'rgb(86 86 86)';
                document.getElementById('nb-' + id).style.boxShadow = 'rgb(23 24 25 / 20%) 0px 8px 24px';
            } else {
                document.getElementById('nb-' + id).style.backgroundColor = '#e2e2e2';
                document.getElementById('nb-' + id).style.boxShadow = 'rgba(149, 157, 165, 0.2) 0px 8px 24px';
            }
        } else if(id == 'playlist') {
            if(prefs['colorMode'] == 'dark' || prefs['colorMode'] == 'system' && systemColorMode == 'dark') {
                playlistButton.style.backgroundColor = 'rgb(86 86 86)';
                playlistButton.style.boxShadow = 'rgb(23 24 25 / 20%) 0px 8px 24px';
            } else {
                playlistButton.style.backgroundColor = '#e2e2e2';
                playlistButton.style.boxShadow = 'rgba(149, 157, 165, 0.2) 0px 8px 24px';
            }

            presentPlaylist(playlistButton.getAttribute('playlist_id'));
        }
        $('.c-item').each(function() {
            document.getElementById($(this).attr('id')).style.display = 'none';
        });
        document.getElementById('c-' + id).style.display = 'block';
    }
}

jQuery(window).on('resize', function() {
    var button = document.getElementById('maximize-img');

    ipcRenderer.send('app_maximize_state');
    ipcRenderer.on('app_maximize_state', (event, arg) => {
        ipcRenderer.removeAllListeners('app_maximize_state');
        if(arg.maximized) {
            button.src = 'assets/unmaximize.png';
        } else {
            button.src = 'assets/maximize.png';
        }
    });
});

async function presentPlaylist(id) {
    document.getElementById('playlist-loading-item').style.display = 'block';
    document.getElementById('playlist-show-artwork').src = 'assets/noArtwork.png';
    document.getElementById('playlist-show-curator').innerHTML = '';
    document.getElementById('playlist-show-description').innerHTML = '';
    document.getElementById('playlist-song-list').innerHTML = '';
    document.getElementById('playlist-show-play').removeAttribute('onclick');
    document.getElementById('playlist-header').setAttribute('media_id', id);

    var playlistData = await getOfflinePlaylistData(id);
    
    if(playlistData['attributes']['artwork'] !== undefined) {
        document.getElementById('playlist-show-artwork').src = playlistData['attributes']['artwork']['url'].replace('{w}', '270').replace('{h}', '270').replace('{f}', 'png');
    }
    //else -> create & set custom artwork

    document.getElementById('playlist-show-title').innerHTML = playlistData['attributes']['name'];

    document.getElementById('playlist-show-play').setAttribute('onclick', 'playItem("' + playlistData['id'] + '", "assets/loadingArtwork.png", "playlist")');

    if(checkDictPathExists(playlistData, ['relationships', 'catalog', 'data', 0, 'attributes', 'curatorName'])) {
        document.getElementById('playlist-show-curator').innerHTML = playlistData['relationships']['catalog']['data'][0]['attributes']['curatorName'];
    } 

    if(checkDictPathExists(playlistData, ['attributes', 'description', 'standard'])) {
        document.getElementById('playlist-show-description').innerHTML = playlistData['attributes']['description']['standard'];
    }

    var canEdit = '';
    if(playlistData['attributes']['canEdit'] == true) canEdit = 'canEdit';

    if(checkDictPathExists(playlistData, ['relationships', 'tracks', 'data'])) {
        var timeCounter = 0;
        var songNumber = 0;
        Object.keys(playlistData['relationships']['tracks']['data']).forEach(function(song) {
            songNumber++;
            song = playlistData['relationships']['tracks']['data'][song];

            var songLi = document.createElement('li');
            songLi.setAttribute('parent', 'nodelete'); //remove from playlist overrides nodelete arg
            songLi.setAttribute('playlist', canEdit);
            songLi.setAttribute('media_type', 'songs')
            songLi.setAttribute('media_id', song['id']);
            songLi.setAttribute('onclick', 'selectSongInCustomShow("playlist-show-song-line", this)');
            songLi.setAttribute('ondblclick', 'this.querySelector(\'.artwork\').click()');
            songLi.className = 'playlist-show-song-line';

            var artworkImg = document.createElement('img'); //here is the play onclick
            artworkImg.className = 'artwork';
            if(checkDictPathExists(song, ['attributes', 'artwork', 'url'])) {
               artworkImg.src = song['attributes']['artwork']['url'].replace('{w}', '45').replace('{h}', '45').replace('{f}', 'png');
            } else {
               artworkImg.src = 'assets/noArtwork.png';
            }
            artworkImg.setAttribute('onclick', 'playSongFromItem("' + playlistData['id'] + '", "assets/loadingArtwork.png", ' + (songNumber - 1) + ', "playlist")');
            songLi.appendChild(artworkImg);

            var titleDiv = document.createElement('div');
            titleDiv.className = 'title';
            titleDiv.innerHTML = song['attributes']['name'];
            songLi.appendChild(titleDiv);

            var artistDiv = document.createElement('div');
            artistDiv.className = 'artist';
            artistDiv.innerHTML = song['attributes']['artistName'];
            songLi.appendChild(artistDiv);

            var albumDiv = document.createElement('div');
            albumDiv.className = 'album';
            albumDiv.innerHTML = song['attributes']['albumName'];
            songLi.appendChild(albumDiv);

            var ellipsisI = document.createElement('i');
            ellipsisI.className = 'fas fa-ellipsis-h';
            ellipsisI.setAttribute('onclick', 'modernContextMenu(this)');
            songLi.appendChild(ellipsisI);

            var timeSpan = document.createElement('span');
            timeSpan.className = 'time';
            min = Math.floor((song['attributes']['durationInMillis']/1000/60) << 0),
            sec = Math.floor((song['attributes']['durationInMillis']/1000) % 60);
            if(sec < 10) {
                sec = '0' + sec;
            }
            timeSpan.innerHTML = min + ':' + sec;
            songLi.appendChild(timeSpan);

            var playImg = document.createElement('img');
            playImg.src = 'assets/play.svg';
            playImg.className = 'play';
            songLi.appendChild(playImg);

            document.getElementById('playlist-song-list').appendChild(songLi);

            timeCounter = timeCounter + song['attributes']['durationInMillis'];
        });

        var numberOfTracks = playlistData['relationships']['tracks']['meta']['total'];
        if(numberOfTracks == 1) var tracks = '1 Song';
        else var tracks = numberOfTracks + ' Songs'

        var mins = Math.floor((timeCounter / (1000 * 60)) % 60);
        var hours = Math.floor((timeCounter / (1000 * 60 * 60)) % 24);
        hours = (hours < 10) ? "0" + hours : hours;
        mins = (mins < 10) ? "0" + mins : mins;
        if(mins == 1) mins = '1 Minute';
        else mins = mins + ' Minutes';
        if(hours == 1) hours = '1 Hour';
        else hours = hours + ' Hours';
        document.getElementById('playlist-counter').innerHTML = tracks + ', ' + hours + ', ' + mins;
    } else {
        document.getElementById('playlist-counter').innerHTML = '0 Songs, 0 Minutes'
    }

    document.getElementById('playlist-loading-item').style.display = 'none';
}

function displayHeaderSong(name, artwork, artist, album, onlyTitle) {
    var playerInfo = document.getElementById('player-info');
    document.getElementById('player-name').innerText = name;
    if(!onlyTitle) {
        document.getElementById('player-sub').innerText = artist + ' — ' + album;
    } else {
        document.getElementById('player-sub').innerText = '';
    }
    document.getElementById('player-artwork').src = 'assets/loadingArtwork.png';
    setTimeout(function() {
        document.getElementById('player-artwork').src = artwork;
    }, 0);
    

    document.getElementById('idle-logo').style.top = '40px';
    playerInfo.style.opacity = '0';
    playerInfo.style.display = 'block';
    setTimeout(function() {
        playerInfo.style.opacity = '1';
        document.getElementById('playback-progress').style.opacity = '1';
    }, 0);
}

function setControlButtonsEnabled(bool) {
    if(bool) {
        document.querySelectorAll('.control-button').forEach(function(button) {
            button.style.opacity = '0.7';
        });
    }
}

function toggleQueue() {
    var queueButton = document.getElementById('queue-button');
    var queueWrapper = document.getElementById('queue-wrapper');

    if(queueButton.style.backgroundColor == 'transparent') { //was closed
        queueButton.style.backgroundColor = '#dadada';
        queueButton.style.filter = 'invert(1)';

        queueWrapper.style.display = 'block';
        queueWrapper.style.right = '-15px';
        queueWrapper.style.opacity = '0';
        setTimeout(function() {
            queueWrapper.style.right = '0px';
            queueWrapper.style.opacity = '1';
        }, 10);
    } else {
        queueButton.style.backgroundColor = 'transparent';
        queueButton.style.filter = 'unset';

        queueWrapper.style.right = '-15px';
        queueWrapper.style.opacity = '0';
        setTimeout(function() {
            queueWrapper.style.display = 'none';
        }, 200);
    }
}

async function presentAlbum(id) {
    try {
        document.getElementById('c-album').removeAttribute('media_id');
        document.getElementById('album-show-complete-album').className = 'hidden';
        document.getElementById('album-show-complete-album').removeAttribute('onclick');
        document.getElementById('album-song-list').innerHTML = '';
        navBarSelect('album', true);
        if(document.getElementById('search-window').style.display == 'block') toggleSearchWindow();
        document.getElementById('album-loading-item').style.display = 'block';
        document.getElementById('album-show-artwork').src = 'assets/noArtwork.png';
        document.getElementById('album-show-description').innerHTML = '';
        document.getElementById('album-show-decription-more').style.display = 'none';

        var albumData = await getAlbumData(id);
        document.getElementById('c-album').setAttribute('media_id', albumData['relationships']['catalog']['data'][0]['id']);
        document.getElementById('album-show-artwork').src = albumData['attributes']['artwork']['url'].replace('{w}', '270').replace('{h}', '270');
        document.getElementById('album-show-title').innerHTML = albumData['attributes']['name'];
        document.getElementById('album-show-artist').innerHTML = albumData['attributes']['artistName'];
        if(albumData['relationships']['artists']['data'][0]['relationships']['catalog']['data'][0] !== undefined) {
            var id = albumData['relationships']['artists']['data'][0]['relationships']['catalog']['data'][0]['id'];
        } else {
            var id = 0;
        }
        document.getElementById('album-show-artist').setAttribute('onclick', 'presentArtist("' + id + '")')
        document.getElementById('album-show-genre-date').innerHTML = albumData['attributes']['genreNames'][0] + ' · ' + albumData['attributes']['releaseDate'].substring(0, 4);

        var date = new Date(albumData['attributes']['releaseDate']);
        document.getElementById('album-releasedate').innerHTML = moment(date).format("DD MMMM YYYY");
        document.getElementById('album-counter').innerHTML = albumData['attributes']['trackCount'] + ' Song(s)';
        document.getElementById('album-copyright').innerHTML = albumData['relationships']['catalog']['data'][0]['attributes']['copyright'];

        document.getElementById('album-loading-item').style.display = 'none';

        document.getElementById('album-show-play').setAttribute('onclick', 'playItem("' + albumData['id'] + '", "' + albumData['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50') + '", "album")');

        var songNumber = 0;
        Object.keys(albumData['relationships']['tracks']['data']).forEach(function(song) {
            songNumber++;
            var songLi = document.createElement('li');
            songLi.className = 'album-show-song-line';
            songLi.setAttribute('onclick', 'selectSongInCustomShow("album-show-song-line", this)');
            songLi.setAttribute('ondblclick', 'this.querySelector(\'img[src="assets/play.svg"]\').click()');
            songLi.setAttribute('media_type', 'songs');
            songLi.setAttribute('media_id', albumData['relationships']['tracks']['data'][song]['relationships']['catalog']['data'][0]['id']);
            songLi.setAttribute('parent', '');
            min = Math.floor((albumData['relationships']['tracks']['data'][song]['attributes']['durationInMillis']/1000/60) << 0),
            sec = Math.floor((albumData['relationships']['tracks']['data'][song]['attributes']['durationInMillis']/1000) % 60);
            if (sec < 10) {
                sec = '0' + sec;
            }
            songLi.innerHTML = '<img src="assets/play.svg" draggable="false" onclick="playSongFromItem(\'' + albumData['id'] + '\', \'' + albumData['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50') + '\', ' + (songNumber - 1) + ', \'album\')" /><span class="index">' + songNumber + '</span>' + albumData['relationships']['tracks']['data'][song]['attributes']['name'] + '<i class="fas fa-ellipsis-h" onclick="modernContextMenu(this)"></i><span class="time">' + min + ':' + sec + '</span>';
            songLi.innerHTML = songLi.innerHTML + '<svg class="playback-bars__svg" viewBox="0 0 11 11"><defs> <rect id="bar-ember34" x="0" width="2.1" y="0" height="11" rx=".25"></rect> <mask id="bar-mask-ember34"> <use href="#bar-ember34" fill="white"></use> </mask> </defs> <g mask="url(#bar-mask-ember34)"> <use class="playback-bars__bar playback-bars__bar--1" href="#bar-ember34"></use> </g> <g mask="url(#bar-mask-ember34)" transform="translate(2.9668 0)"> <use class="playback-bars__bar playback-bars__bar--2" href="#bar-ember34"></use> </g> <g mask="url(#bar-mask-ember34)" transform="translate(5.9333 0)"> <use class="playback-bars__bar playback-bars__bar--3" href="#bar-ember34"></use> </g> <g mask="url(#bar-mask-ember34)" transform="translate(8.8999 0)"> <use class="playback-bars__bar playback-bars__bar--4" href="#bar-ember34"></use> </g></svg>';

            document.getElementById('album-song-list').appendChild(songLi);
            if(songNumber == 2) {
                document.getElementById('album-show-shuffle').style.display = 'inline-block';
            } else if(songNumber < 2) {
                document.getElementById('album-show-shuffle').style.display = 'none';
            }
        });

        if(songNumber < albumData['relationships']['catalog']['data'][0]['attributes']['trackCount']) {
            document.getElementById('album-show-complete-album').className = '';
            document.getElementById('album-show-complete-album').setAttribute('onclick', 'presentOnlineAlbum("' + albumData['relationships']['catalog']['data'][0]['id'] + '")');
        }
    } catch (error) {
        presentDialog("An error happened while loading album data, please try again later.", "OK");
        throw error;
    }
}

async function presentOnlineAlbum(id) {
    try {
        document.getElementById('c-album').removeAttribute('media_id');
        document.getElementById('album-song-list').innerHTML = '';
        document.getElementById('album-show-complete-album').className = 'hidden';
        document.getElementById('album-show-complete-album').removeAttribute('onclick');
        navBarSelect('album', true);
        if(document.getElementById('search-window').style.display == 'block') hideSearchBar();
        document.getElementById('album-loading-item').style.display = 'block';
        document.getElementById('album-show-artwork').src = 'assets/noArtwork.png';
        document.getElementById('album-show-description').innerHTML = '';
        document.getElementById('album-show-decription-more').style.display = 'none';

        var albumData = await getOnlineAlbumData(id);
        document.getElementById('c-album').setAttribute('media_id', albumData['id']);
        document.getElementById('album-show-artwork').src = albumData['attributes']['artwork']['url'].replace('{w}', '270').replace('{h}', '270').replace('{f}', 'png');
        document.getElementById('album-show-title').innerHTML = albumData['attributes']['name'];
        document.getElementById('album-show-artist').innerHTML = albumData['attributes']['artistName'];
        var id = albumData['relationships']['artists']['data'][0]['id'];
        document.getElementById('album-show-artist').setAttribute('onclick', 'presentArtist("' + id + '")')
        document.getElementById('album-show-genre-date').innerHTML = albumData['attributes']['genreNames'][0] + ' · ' + albumData['attributes']['releaseDate'].substring(0, 4);

        var date = new Date(albumData['attributes']['releaseDate']);
        document.getElementById('album-releasedate').innerHTML = moment(date).format("DD MMMM YYYY");
        document.getElementById('album-counter').innerHTML = albumData['attributes']['trackCount'] + ' Song(s)';
        document.getElementById('album-copyright').innerHTML = albumData['attributes']['copyright'];

        document.getElementById('album-loading-item').style.display = 'none';
        if(checkDictPathExists(albumData, ['attributes', 'editorialNotes', 'standard'])) {
            document.getElementById('album-show-description').innerHTML = albumData['attributes']['editorialNotes']['standard'];
            if(document.getElementById('album-show-description').offsetHeight < document.getElementById('album-show-description').scrollHeight) {
                document.getElementById('album-show-decription-more').style.display = 'inline-block';
            }
        }
        

        document.getElementById('album-show-play').setAttribute('onclick', 'playItem("' + albumData['id'] + '", "' + albumData['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50').replace('{f}', 'png') + '", "album")');

        var songNumber = 0;
        Object.keys(albumData['relationships']['tracks']['data']).forEach(function(song) {
            songNumber++;
            var songLi = document.createElement('li');
            songLi.className = 'album-show-song-line';
            songLi.setAttribute('onclick', 'selectSongInCustomShow("album-show-song-line", this)');
            songLi.setAttribute('ondblclick', 'this.querySelector(\'img[src="assets/play.svg"]\').click()');
            songLi.setAttribute('media_type', 'songs');
            songLi.setAttribute('media_id', albumData['relationships']['tracks']['data'][song]['id']);
            songLi.setAttribute('parent', 'nodelete');
            min = Math.floor((albumData['relationships']['tracks']['data'][song]['attributes']['durationInMillis']/1000/60) << 0),
            sec = Math.floor((albumData['relationships']['tracks']['data'][song]['attributes']['durationInMillis']/1000) % 60);
            if (sec < 10) {
                sec = '0' + sec;
            }

            songLi.innerHTML = '<img src="assets/play.svg" draggable="false" onclick="playSongFromItem(\'' + albumData['id'] + '\', \'' + albumData['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50').replace('{f}', 'png') + '\', ' + (songNumber - 1) + ', \'album\')" /><span class="index">' + songNumber + '</span>' + albumData['relationships']['tracks']['data'][song]['attributes']['name'] + '<i class="fas fa-ellipsis-h" onclick="modernContextMenu(this)"></i><span class="time">' + min + ':' + sec + '</span>';
            songLi.innerHTML = songLi.innerHTML + '<svg class="playback-bars__svg" viewBox="0 0 11 11"><defs> <rect id="bar-ember34" x="0" width="2.1" y="0" height="11" rx=".25"></rect> <mask id="bar-mask-ember34"> <use href="#bar-ember34" fill="white"></use> </mask> </defs> <g mask="url(#bar-mask-ember34)"> <use class="playback-bars__bar playback-bars__bar--1" href="#bar-ember34"></use> </g> <g mask="url(#bar-mask-ember34)" transform="translate(2.9668 0)"> <use class="playback-bars__bar playback-bars__bar--2" href="#bar-ember34"></use> </g> <g mask="url(#bar-mask-ember34)" transform="translate(5.9333 0)"> <use class="playback-bars__bar playback-bars__bar--3" href="#bar-ember34"></use> </g> <g mask="url(#bar-mask-ember34)" transform="translate(8.8999 0)"> <use class="playback-bars__bar playback-bars__bar--4" href="#bar-ember34"></use> </g></svg>';
            if(albumData['relationships']['tracks']['data'][song]['attributes']['popularity'] >= 0.7) {
                songLi.innerHTML = songLi.innerHTML + '<img src="assets/popular.png" class="popular" />';
            }
            document.getElementById('album-song-list').appendChild(songLi);
            if(songNumber == 2) {
                document.getElementById('album-show-shuffle').style.display = 'inline-block';
            } else if(songNumber < 2) {
                document.getElementById('album-show-shuffle').style.display = 'none';
            }

            if(checkDictPathExists(albumData, ['relationships', 'tracks', 'data', song, 'attributes', 'offers', 0, 'expectedReleaseDate'])) {
                songLi.style.pointerEvents = 'none';
                songLi.style.opacity = 0.5;
                songLi.setAttribute('disabled', '');
            }
        });
    } catch (error) {
        presentDialog("An error happened while loading album data, please try again later.", "OK");
        throw error;
    }
}

function toggleFullDescription(state, element) {
    switch(state) {
        case 'show':
            var fullDescriptionElement = element.parentNode.parentNode.parentNode.querySelector('div[class="full-description"]');
            var descriptionElement = element.parentNode.parentNode.parentNode.querySelector('p[class="description"]');

            fullDescriptionElement.innerHTML = '<div class="back" onclick="toggleFullDescription(\'hide\', this)"><img src="assets/arrow_right.svg" />BACK</div><br />' + descriptionElement.innerHTML;
            element.parentNode.parentNode.parentNode.classList.add('toggled-description');
            break;
        case 'hide':
            element.parentNode.parentNode.classList.remove('toggled-description');
            break;
    }
}

async function presentArtist(id) {
    try {
        navBarSelect('artist', true);
        if(document.getElementById('search-window').style.display == 'block') hideSearchBar();
        document.getElementById('c-artist-loading-item').style.display = 'block';

        document.getElementById('artist-show-avatar').removeAttribute('src'); //reset avatar/heroart
        document.getElementById('artist-show-parralax').style.display = 'none';
        document.getElementById('artist-show-avatar').style.display = 'block';
        document.getElementById('artist-content').className = 'content-avatarmode';
        document.getElementById('artist-show-name').removeAttribute('style');
        document.getElementById('top-songs').className = '';
        document.getElementById('songs-container').innerHTML = '';
        document.getElementById('latest-featured').style.display = 'none';
        if(document.getElementById('lf-img-overlay') !== null) document.getElementById('lf-img-overlay').remove();
        document.getElementById('top-songs').style.display = 'none';
        document.getElementById('artist-content').setAttribute('media_id', id);
        document.getElementById('featured-albums').style.display = 'none';
        document.getElementById('falbums-container').innerHTML = '';
        document.getElementById('full-albums').style.display = 'none';
        document.getElementById('fullalbums-container').innerHTML = '';

        var artistData = await getArtistData(id);

        if(artistData['attributes']['editorialArtwork']['centeredFullscreenBackground'] !== undefined) {
            var parralaxAvatar = artistData['attributes']['editorialArtwork']['centeredFullscreenBackground']['url'];
            var width = artistData['attributes']['editorialArtwork']['centeredFullscreenBackground']['width'];
            var height = artistData['attributes']['editorialArtwork']['centeredFullscreenBackground']['height'];
            document.getElementById('artist-show-parralax').src = parralaxAvatar.replace('{w}', width).replace('{h}', height).replace('{f}', 'png');
            document.getElementById('artist-show-parralax').style.display = 'block';
            document.getElementById('artist-show-avatar').style.display = 'none';
            document.getElementById('artist-content').className = 'content-heromode';
            document.getElementById('artist-show-name').style.color = 'white';
        } else if(artistData['attributes']['artwork'] !== undefined) {
            document.getElementById('artist-show-avatar').src = artistData['attributes']['artwork']['url'].replace('{w}', '190').replace('{h}', '190').replace('{f}', 'png');
            document.getElementById('artist-show-parralax').style.display = 'none';
            document.getElementById('artist-show-avatar').style.display = 'block';
            document.getElementById('artist-content').className = 'content-avatarmode';
            document.getElementById('artist-show-name').removeAttribute('style');
        } else { // no avatar
            document.getElementById('artist-show-avatar').removeAttribute('src');
            document.getElementById('artist-show-parralax').style.display = 'none';
            document.getElementById('artist-show-avatar').style.display = 'block';
            document.getElementById('artist-content').className = 'content-avatarmode';
            document.getElementById('artist-show-name').removeAttribute('style');
        }

        Object.keys(artistData['meta']['views']['order']).forEach(function(category) {
            category = artistData['meta']['views']['order'][category];
            if(Object.keys(artistData['views'][category]['data']).length > 0) {
                switch(category) {
                    case 'featured-release':
                        document.getElementById('top-songs').className = 'divided';
                        var latestFeatured = document.getElementById('latest-featured');
                        latestFeatured.setAttribute('parent', 'nodelete');
                        latestFeatured.setAttribute('media_type', artistData['views'][category]['data'][0]['type']);
                        latestFeatured.setAttribute('media_id', artistData['views'][category]['data'][0]['id']);

                        document.getElementById('lf-title').innerHTML = 'Featured Release';
                        if(checkDictPathExists(artistData, ['views', category, 'data', 0, 'attributes', 'artwork', 'url'])) {
                            var src = artistData['views'][category]['data'][0]['attributes']['artwork']['url'].replace('{w}', '180').replace('{h}', '180').replace('{f}', 'jpg');
                        } else {
                            var src = 'assets/noArtwork.png';
                        }
                        document.getElementById('lf-artwork').src = src;

                        var date = new Date(artistData['views'][category]['data'][0]['attributes']['releaseDate']);
                        document.getElementById('lf-releasedate').innerHTML = moment(date).format("DD MMMM YYYY");
                        document.getElementById('lf-songtitle').innerHTML = artistData['views'][category]['data'][0]['attributes']['name'];
                        if(artistData['views'][category]['data'][0]['attributes']['trackCount'] == 1) {
                            document.getElementById('lf-counter').innerHTML = '1 Song'
                        } else {
                            document.getElementById('lf-counter').innerHTML = artistData['views'][category]['data'][0]['attributes']['trackCount'] + ' Songs';
                        }

                        latestFeatured.innerHTML = latestFeatured.innerHTML + '<div id="lf-img-overlay" onclick="presentOnlineAlbum(' + artistData['views'][category]['data'][0]['id'] + ')"><i class="fas fa-play left" onmouseover="this.parentElement.removeAttribute(\'onclick\')" onmouseout="this.parentElement.setAttribute(\'onclick\', \'presentOnlineAlbum(' + artistData['views'][category]['data'][0]['id'] +  ')\')" onclick="playItem(\'' + artistData['views'][category]['data'][0]['id'] + '\', \'' + src + '\', \'album\')"></i><i class="fas fa-ellipsis-h right" onmouseover="this.parentElement.removeAttribute(\'onclick\')" onmouseout="this.parentElement.setAttribute(\'onclick\', \'presentOnlineAlbum(' + artistData['views'][category]['data'][0]['id'] +  ')\')" onclick="modernContextMenu(this)"></i></div>';
                        latestFeatured.style.display = 'inline-block';
                        break;
                    case 'latest-release':
                        document.getElementById('top-songs').className = 'divided';
                        var latestFeatured = document.getElementById('latest-featured');
                        latestFeatured.setAttribute('parent', 'nodelete');
                        latestFeatured.setAttribute('media_type', artistData['views'][category]['data'][0]['type']);
                        latestFeatured.setAttribute('media_id', artistData['views'][category]['data'][0]['id']);

                        document.getElementById('lf-title').innerHTML = 'Featured Release';
                        if(checkDictPathExists(artistData, ['views', category, 'data', 0, 'attributes', 'artwork', 'url'])) {
                            var src = artistData['views'][category]['data'][0]['attributes']['artwork']['url'].replace('{w}', '180').replace('{h}', '180').replace('{f}', 'jpg');
                        } else {
                            var src = 'assets/noArtwork.png';
                        }
                        document.getElementById('lf-artwork').src = src;

                        var date = new Date(artistData['views'][category]['data'][0]['attributes']['releaseDate']);
                        document.getElementById('lf-releasedate').innerHTML = moment(date).format("DD MMMM YYYY");
                        document.getElementById('lf-songtitle').innerHTML = artistData['views'][category]['data'][0]['attributes']['name'];
                        if(artistData['views'][category]['data'][0]['attributes']['trackCount'] == 1) {
                            document.getElementById('lf-counter').innerHTML = '1 Song'
                        } else {
                            document.getElementById('lf-counter').innerHTML = artistData['views'][category]['data'][0]['attributes']['trackCount'] + ' Songs';
                        }

                        latestFeatured.innerHTML = latestFeatured.innerHTML + '<div id="lf-img-overlay" onclick="presentOnlineAlbum(' + artistData['views'][category]['data'][0]['id'] + ')"><i class="fas fa-play left" onmouseover="this.parentElement.removeAttribute(\'onclick\')" onmouseout="this.parentElement.setAttribute(\'onclick\', \'presentOnlineAlbum(' + artistData['views'][category]['data'][0]['id'] +  ')\')" onclick="playItem(\'' + artistData['views'][category]['data'][0]['id'] + '\', \'' + src + '\', \'album\')"></i><i class="fas fa-ellipsis-h right" onmouseover="this.parentElement.removeAttribute(\'onclick\')" onmouseout="this.parentElement.setAttribute(\'onclick\', \'presentOnlineAlbum(' + artistData['views'][category]['data'][0]['id'] +  ')\')" onclick="modernContextMenu(this)"></i></div>';
                        latestFeatured.style.display = 'inline-block';
                        break;
                    case 'top-songs':
                        var topSongs = document.getElementById('top-songs');

                        document.getElementById('song-results').style.display = 'block';

                        var i = 0;
                        Object.keys(artistData['views'][category]['data']).forEach(async function(song) {
                            i++;
                            if(i > 12) return;

                            var songLi = document.createElement('li');
                            songLi.setAttribute('parent', 'nodelete');
                            songLi.setAttribute('media_type', 'songs');
                            songLi.setAttribute('media_id', artistData['views'][category]['data'][song]['id']);
                            var artworkImg = document.createElement('img');
                            artworkImg.setAttribute('draggable', 'false');
                            artworkImg.className = 'artwork';
                            artworkImg.src = artistData['views'][category]['data'][song]['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50').replace('{f}', 'png').replace('{c}', '');
                            artworkImg.setAttribute('onclick', 'playSong("' + artistData['views'][category]['data'][song]['id'] + '", "' + artistData['views'][category]['data'][song]['attributes']['name'] + '", "' + artworkImg.src + '", "' + artistData['views'][category]['data'][song]['attributes']['artistName'] + '", "' + artistData['views'][category]['data'][song]['attributes']['artistName'] + '", ' + Math.round(artistData['views'][category]['data'][song]['attributes']['durationInMillis']/1000) + ')');
                            songLi.appendChild(artworkImg);

                            var playImg = document.createElement('img');
                            playImg.className = 'play';
                            playImg.setAttribute('draggable', 'false');
                            playImg.src = 'assets/play.svg';
                            songLi.appendChild(playImg);

                            var ellipsisI = document.createElement('i');
                            ellipsisI.className = 'fas fa-ellipsis-h';
                            ellipsisI.setAttribute('onclick', 'modernContextMenu(this)');
                            songLi.appendChild(ellipsisI);

                            var addImg = document.createElement('img');
                            addImg.className = 'add';
                            addImg.src = 'assets/add.svg';
                            addImg.setAttribute('draggable', 'false');
                            addImg.setAttribute('onclick', 'queueAddSong("' + artistData['views'][category]['data'][song]['id'] + '", this)');
                            if(await isInLibrary(artistData['views'][category]['data'][song]['id'], 'songs')) addImg.style.display = 'none';
                            songLi.appendChild(addImg);

                            var titleText = document.createElement('h4');
                            titleText.innerHTML = artistData['views'][category]['data'][song]['attributes']['name'];
                            songLi.appendChild(titleText);

                            var artistText = document.createElement('h5');
                            artistText.innerHTML = artistData['views'][category]['data'][song]['attributes']['artistName'];
                            artistText.setAttribute('onclick', 'presentArtist("' + id + '")');
                            songLi.appendChild(artistText);

                            document.getElementById('songs-container').appendChild(songLi);
                        });
                        topSongs.style.display = 'inline-block';
                        break;
                    case 'featured-albums':
                        var featuredAlbums = document.getElementById('featured-albums');                        

                        Object.keys(artistData['views'][category]['data']).forEach(function(album) {
                            var avatarWrapper = document.createElement('div');
                            avatarWrapper.setAttribute('align', 'center');
                            avatarWrapper.setAttribute('parent', 'nodelete');
                            avatarWrapper.setAttribute('media_type', 'albums');
                            avatarWrapper.setAttribute('media_id', artistData['views'][category]['data'][album]['id']);
                            avatarWrapper.innerHTML = '<i class="fas fa-play left" onclick="playItem(\'' + artistData['views'][category]['data'][album]['id'] + '\', \'' + artistData['views'][category]['data'][album]['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50').replace('{f}', 'png') + '\', "album")"></i><i class="fas fa-ellipsis-h right" onclick="modernContextMenu(this)"></i>';

                            var artworkImg = document.createElement('img');
                            artworkImg.src = artistData['views'][category]['data'][album]['attributes']['artwork']['url'].replace('{w}', '250').replace('{h}', '250').replace('{f}', 'png');
                            artworkImg.setAttribute('draggable', 'false');
                            artworkImg.setAttribute('onclick', 'presentOnlineAlbum("' + artistData['views'][category]['data'][album]['id'] + '")');

                            var nameSpan = document.createElement('span');
                            nameSpan.innerHTML = artistData['views'][category]['data'][album]['attributes']['name'];
                            nameSpan.className = 'link';
                            nameSpan.setAttribute('onclick', 'presentOnlineAlbum("' + artistData['views'][category]['data'][album]['id'] + '")');

                            var yearSpan = document.createElement('span');
                            yearSpan.className = 'lighter';
                            yearSpan.innerHTML = artistData['views'][category]['data'][album]['attributes']['releaseDate'].substr(0, 4);

                            avatarWrapper.appendChild(artworkImg);
                            avatarWrapper.appendChild(nameSpan);
                            avatarWrapper.appendChild(yearSpan);

                            document.getElementById('falbums-container').appendChild(avatarWrapper);
                        });

                        featuredAlbums.style.display = 'inline-block';
                        break;
                    case 'full-albums':
                        var fullAlbums = document.getElementById('full-albums');                        

                        Object.keys(artistData['views'][category]['data']).forEach(function(album) {
                            var avatarWrapper = document.createElement('div');
                            avatarWrapper.setAttribute('align', 'center');
                            avatarWrapper.setAttribute('parent', 'nodelete');
                            avatarWrapper.setAttribute('media_type', 'albums');
                            avatarWrapper.setAttribute('media_id', artistData['views'][category]['data'][album]['id']);
                            avatarWrapper.innerHTML = '<i class="fas fa-play left" onclick="playItem(\'' + artistData['views'][category]['data'][album]['id'] + '\', \'' + artistData['views'][category]['data'][album]['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50').replace('{f}', 'png') + '\', "album")"></i><i class="fas fa-ellipsis-h right" onclick="modernContextMenu(this)"></i>';

                            var artworkImg = document.createElement('img');
                            artworkImg.src = artistData['views'][category]['data'][album]['attributes']['artwork']['url'].replace('{w}', '250').replace('{h}', '250').replace('{f}', 'png');
                            artworkImg.setAttribute('draggable', 'false');
                            artworkImg.setAttribute('onclick', 'presentOnlineAlbum("' + artistData['views'][category]['data'][album]['id'] + '")');

                            var nameSpan = document.createElement('span');
                            nameSpan.innerHTML = artistData['views'][category]['data'][album]['attributes']['name'];
                            nameSpan.className = 'link';
                            nameSpan.setAttribute('onclick', 'presentOnlineAlbum("' + artistData['views'][category]['data'][album]['id'] + '")');

                            var yearSpan = document.createElement('span');
                            yearSpan.className = 'lighter';
                            yearSpan.innerHTML = artistData['views'][category]['data'][album]['attributes']['releaseDate'].substr(0, 4);

                            avatarWrapper.appendChild(artworkImg);
                            avatarWrapper.appendChild(nameSpan);
                            avatarWrapper.appendChild(yearSpan);

                            document.getElementById('fullalbums-container').appendChild(avatarWrapper);
                        });

                        fullAlbums.style.display = 'inline-block';
                        break;
                }
            }
        });

        document.getElementById('artist-show-name').innerHTML = artistData['attributes']['name'];
        document.getElementById('c-artist-loading-item').style.display = 'none';
    } catch (error) {
        presentDialog("An error happened while loading artist data, please try again later.", "OK");
        throw error;
    }
}

async function presentSearchResult(text) {
    navBarSelect('search', true);
    if(document.getElementById('search-window').style.display == 'block') hideSearchBar();
    document.getElementById('artist-loading-item').style.display = 'block';

    document.getElementById('top-results').style.display = 'none';
    document.getElementById('top-results-container').innerHTML = '';
    document.getElementById('artist-results').style.display = 'none';
    document.getElementById('artist-results-container').innerHTML = '';
    document.getElementById('album-results').style.display = 'none';
    document.getElementById('album-results-container').innerHTML = '';
    document.getElementById('song-results').style.display = 'none';
    document.getElementById('song-results-container').innerHTML = '';

    document.getElementById('search-results-title').innerHTML = 'Loading search results...';

    var searchData = await getSearchData(text);

    document.getElementById('search-results-title').innerHTML = 'Search results for "' + text + '"';

    if(searchData['top'] !== undefined) {
        document.getElementById('top-results').style.display = 'block';

        var topCounter = 0;
        Object.keys(searchData['top']['data']).forEach(async function(top) {
            topCounter++;
            if(topCounter >= 4) return;

            var topDiv = document.createElement('div');
            topDiv.setAttribute('align', 'left');
            topDiv.setAttribute('media_type', searchData['top']['data'][top]['type']);
            topDiv.setAttribute('media_id', searchData['top']['data'][top]['id']);
            topDiv.setAttribute('parent', 'nodelete');

            var topClickWrapper = document.createElement('div');
            topClickWrapper.className = 'click-wrapper';

            var topArtwork = document.createElement('img');
            topArtwork.src = searchData['top']['data'][top]['attributes']['artwork']['url'].replace('{w}', '200').replace('{h}', '200').replace('{f}', 'png');
            topArtwork.className = 'artwork';
            topArtwork.setAttribute('draggable', 'false');

            var topTitle = document.createElement('h4');
            topTitle.innerHTML = searchData['top']['data'][top]['attributes']['name'];

            var topMore = document.createElement('i');
            topMore.className = 'fas fa-ellipsis-h';
            topMore.setAttribute('onclick', 'modernContextMenu(this)')

            var topSub = document.createElement('span');

            topDiv.appendChild(topArtwork);

            switch(searchData['top']['data'][top]['type']) {
                case 'artists':
                    topArtwork.className = 'artwork artist';
                    topSub.innerHTML = 'Artist';
                    topClickWrapper.setAttribute('onclick', 'presentArtist("' + searchData['top']['data'][top]['id'] + '")');
                    break;
                case 'albums':
                    var playImg = document.createElement('img');
                    playImg.className = 'play';
                    playImg.setAttribute('draggable', 'false');
                    playImg.src = 'assets/play.svg';
                    topArtwork.setAttribute('onclick', 'playItem("' + searchData['top']['data'][top]['id'] + '", "' + searchData['top']['data'][top]['attributes']['artwork']['url'].replace('{w}', '200').replace('{h}', '200').replace('{f}', 'png') + '", "album")')
                    topDiv.appendChild(playImg);

                    var addImg = document.createElement('img');
                    addImg.className = 'add';
                    addImg.setAttribute('draggable', 'false');
                    addImg.src = 'assets/add.svg';
                    if(await isInLibrary(searchData['top']['data'][top]['id'], 'albums')) {
                        addImg.style.display = 'none';
                        //add 'from your library'
                    }
                    topDiv.appendChild(addImg);
                    topSub.innerHTML = 'Album · ' + searchData['top']['data'][top]['attributes']['artistName'];
                    topClickWrapper.setAttribute('onclick', 'presentOnlineAlbum("' + searchData['top']['data'][top]['id'] + '")');
                    break;
                case 'songs':
                    var playImg = document.createElement('img');
                    playImg.className = 'play';
                    playImg.setAttribute('draggable', 'false');
                    playImg.src = 'assets/play.svg';
                    playImg.style.pointerEvents = 'none';
                    topArtwork.setAttribute('onclick', 'playSong("' + searchData['top']['data'][top]['id'] + '", "' + searchData['top']['data'][top]['attributes']['name'] + '", "' + topArtwork.src + '", "' + searchData['top']['data'][top]['attributes']['artistName'] + '", "' + searchData['top']['data'][top]['attributes']['artistName'] + '", ' + Math.round(searchData['top']['data'][top]['attributes']['durationInMillis']/1000) + ')')
                    topDiv.appendChild(playImg);
                    var addImg = document.createElement('img');
                    addImg.className = 'add';
                    addImg.setAttribute('draggable', 'false');
                    addImg.src = 'assets/add.svg';
                    addImg.setAttribute('onclick', 'queueAddSong("' + searchData['top']['data'][top]['id'] + '", this)');
                    if(await isInLibrary(searchData['top']['data'][top]['id'], 'songs')) {
                        addImg.style.display = 'none';
                        //add 'from your library'
                    }
                    topDiv.appendChild(addImg);
                    topSub.innerHTML = 'Song · ' + searchData['top']['data'][top]['attributes']['artistName'];
                    var albumId = searchData['top']['data'][top]['attributes']['url'];
                    albumId = albumId.split('/album/').pop();
                    albumId = albumId.split('/').pop();
                    if(albumId.includes('?')) albumId = albumId.split('?')[0];
                    topClickWrapper.setAttribute('onclick', 'presentOnlineAlbum("' + albumId + '")');
                    break;
                case 'apple-curators':
                    topArtwork.className = 'artwork artist';
                    topSub.innerHTML = 'Curator';
                    break
                default:
                    return;
            }

            topDiv.appendChild(topClickWrapper);
            topDiv.appendChild(topTitle);
            topDiv.appendChild(topSub);
            topDiv.appendChild(topMore);

            document.getElementById('top-results-container').appendChild(topDiv);
        });
    }
    if(searchData['artist'] !== undefined) {
        document.getElementById('artist-results').style.display = 'block';

        var artistCounter = 0;
        Object.keys(searchData['artist']['data']).forEach(function(artist) {
            artistCounter++;
            if(artistCounter >= 11) return;

            var avatarWrapper = document.createElement('div');

            var artworkImg = document.createElement('img');
            if(checkDictPathExists(searchData, ['artist', 'data', artist, 'attributes', 'artwork', 'url'])) { 
                artworkImg.src = searchData['artist']['data'][artist]['attributes']['artwork']['url'].replace('{w}', '140').replace('{h}', '140').replace('{f}', 'png');
            } else {
                artworkImg.src = 'assets/noArtwork.png';
            }
            artworkImg.setAttribute('onclick', 'presentArtist("' + searchData['artist']['data'][artist]['id'] + '")');
            artworkImg.setAttribute('draggable', 'false');

            var artistSpan = document.createElement('span');
            artistSpan.innerHTML = searchData['artist']['data'][artist]['attributes']['name'];

            avatarWrapper.appendChild(artworkImg);
            avatarWrapper.appendChild(artistSpan);

            document.getElementById('artist-results-container').appendChild(avatarWrapper);
        });
    }
    if(searchData['album'] !== undefined) {
        document.getElementById('album-results').style.display = 'block';

        var albumCounter = 0;
        Object.keys(searchData['album']['data']).forEach(function(album) {
            albumCounter++;
            if(albumCounter >= 11) return;

            var avatarWrapper = document.createElement('div');
            avatarWrapper.setAttribute('parent', 'nodelete');
            avatarWrapper.setAttribute('media_type', 'albums');
            avatarWrapper.setAttribute('media_id', searchData['album']['data'][album]['id']);
            avatarWrapper.innerHTML = '<i class="fas fa-play left" onclick="playItem(\'' + searchData['album']['data'][album]['id'] + '\', \'' + searchData['album']['data'][album]['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50').replace('{f}', 'png') + '\', "album")"></i><i class="fas fa-ellipsis-h right" onclick="modernContextMenu(this)"></i>';

            var artworkImg = document.createElement('img');
            artworkImg.src = searchData['album']['data'][album]['attributes']['artwork']['url'].replace('{w}', '200').replace('{h}', '200').replace('{f}', 'png');
            artworkImg.setAttribute('draggable', 'false');
            artworkImg.setAttribute('onclick', 'presentOnlineAlbum("' + searchData['album']['data'][album]['id'] + '")');

            var nameSpan = document.createElement('span');
            nameSpan.innerHTML = searchData['album']['data'][album]['attributes']['name'];
            nameSpan.setAttribute('onclick', 'presentOnlineAlbum("' + searchData['album']['data'][album]['id'] + '")');

            var artistSpan = document.createElement('span');
            artistSpan.className = 'lighter';
            artistSpan.innerHTML = searchData['album']['data'][album]['attributes']['artistName'];
            artistSpan.setAttribute('onclick', 'presentArtist("' + searchData['album']['data'][album]['relationships']['artists']['data'][0]['id'] + '")');

            avatarWrapper.appendChild(artworkImg);
            avatarWrapper.appendChild(nameSpan);
            avatarWrapper.appendChild(artistSpan);

            document.getElementById('album-results-container').appendChild(avatarWrapper);
        });
    }
    if(searchData['song'] !== undefined) {
        document.getElementById('song-results').style.display = 'block';

        Object.keys(searchData['song']['data']).forEach(async function(song) {
            var songLi = document.createElement('li');
            songLi.setAttribute('parent', 'nodelete');
            songLi.setAttribute('media_type', 'songs');
            songLi.setAttribute('media_id', searchData['song']['data'][song]['id']);
            var artworkImg = document.createElement('img');
            artworkImg.setAttribute('draggable', 'false');
            artworkImg.className = 'artwork';
            artworkImg.src = searchData['song']['data'][song]['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50').replace('{f}', 'png').replace('{c}', '');
            artworkImg.setAttribute('onclick', 'playSong("' + searchData['song']['data'][song]['id'] + '", "' + searchData['song']['data'][song]['attributes']['name'] + '", "' + artworkImg.src + '", "' + searchData['song']['data'][song]['attributes']['artistName'] + '", "' + searchData['song']['data'][song]['attributes']['artistName'] + '", ' + Math.round(searchData['song']['data'][song]['attributes']['durationInMillis']/1000) + ')');
            songLi.appendChild(artworkImg);

            var playImg = document.createElement('img');
            playImg.className = 'play';
            playImg.setAttribute('draggable', 'false');
            playImg.src = 'assets/play.svg';
            songLi.appendChild(playImg);

            var ellipsisI = document.createElement('i');
            ellipsisI.className = 'fas fa-ellipsis-h';
            ellipsisI.setAttribute('onclick', 'modernContextMenu(this)');
            songLi.appendChild(ellipsisI);

            var addImg = document.createElement('img');
            addImg.className = 'add';
            addImg.src = 'assets/add.svg';
            addImg.setAttribute('draggable', 'false');
            addImg.setAttribute('onclick', 'queueAddSong("' + searchData['song']['data'][song]['id'] + '", this)');
            if(await isInLibrary(searchData['song']['data'][song]['id'], 'songs')) addImg.style.display = 'none';
            songLi.appendChild(addImg);

            var titleText = document.createElement('h4');
            titleText.innerHTML = searchData['song']['data'][song]['attributes']['name'];
            songLi.appendChild(titleText);

            var artistText = document.createElement('h5');
            artistText.innerHTML = searchData['song']['data'][song]['attributes']['artistName'];
            artistText.setAttribute('onclick', 'presentArtist("' + searchData['song']['data'][song]['relationships']['artists']['data'][0]['id'] + '")');
            songLi.appendChild(artistText);

            document.getElementById('song-results-container').appendChild(songLi);
        });
    }
}

function queueAddSong(id, addElement) {
    //change addElement to loading
    addItemToLibrary(id, 'songs');
    addElement.src = 'assets/tick.png';
    addElement.setAttribute('draggable', 'false');
}

function toggleSearchWindow() {
    var searchWindow = document.getElementById('search-window');

    if(searchWindow.style.display == 'none') {
        searchWindow.style.display = 'block';
    } else {
        searchWindow.style.display = 'none';
    }
}

async function modernContextMenu(element) {
    var contextMenu = document.getElementById('context-menu');
    var parent = null;

    var addToLibrary = document.getElementById('context-menu-addlibrary');
    var removeFromLibrary = document.getElementById('context-menu-removelibrary');
    var contextMedia = document.getElementById('context-menu-media');
    var removeFromPlaylist = document.getElementById('context-menu-removeplaylist');
    var removeFromQueue = document.getElementById('context-menu-removequeue');

    var playNext = document.getElementById('context-menu-playnext');
    var playLater = document.getElementById('context-menu-playlater');

    playNext.setAttribute('onclick', '');
    playLater.setAttribute('onclick', '');

    //nasty af
    if(element.getAttribute('parent') !== null) {
        parent = element;
    } else if(element.parentNode.getAttribute('parent') !== null) {
        parent = element.parentNode;
    } else if(element.parentNode.parentNode.getAttribute('parent') !== null) {
        parent = element.parentNode.parentNode;
    } else if(element.parentNode.parentNode.parentNode.getAttribute('parent') !== null) {
           parent = element.parentNode.parentNode.parentNode;
    }

    if(parent !== null) {
        if(parent.getAttribute('media_type') != 'artists' && parent.getAttribute('media_type') != 'apple-curators' && parent.getAttribute('media_type') != 'stations') {

            removeFromQueue.style.display = 'none';
            switch(parent.getAttribute('media_type')) {
                case 'queue-song':
                    removeFromQueue.style.display = 'block';
                    break;
            }

            if(parent.getAttribute('media_id').includes('.')) { //offline
                addToLibrary.style.display = 'none';
                removeFromLibrary.style.display = 'block';
                contextMedia.style.display = 'block';

                if(parent.getAttribute('playlist') !== null && parent.getAttribute('playlist').includes('canEdit')) { //song is in a playlist
                    removeFromPlaylist.style.display = 'block';
                } else {
                    removeFromPlaylist.style.display = 'none';
                }
            } else { //online
                if(await isInLibrary(parent.getAttribute('media_id'), parent.getAttribute('media_type'))) {
                    addToLibrary.style.display = 'none';
                    removeFromLibrary.style.display = 'block';
                    contextMedia.style.display = 'block';
                } else {
                    addToLibrary.style.display = 'block';
                    removeFromLibrary.style.display = 'none';
                    contextMedia.style.display = 'block';
                }

                removeFromPlaylist.style.display = 'none';

                //.slice(0, -1) --> 'songs' -> 'song' etc.
                playNext.setAttribute('onclick', 'playNextOrLater("Next", "' + parent.getAttribute('media_type').slice(0, -1) + '", "' + parent.getAttribute('media_id') + '")');
                playLater.setAttribute('onclick', 'playNextOrLater("Later", "' + parent.getAttribute('media_type').slice(0, -1) + '", "' + parent.getAttribute('media_id') + '")');
            }
        } else {
            addToLibrary.style.display = 'none';
            removeFromLibrary.style.display = 'none';
            contextMedia.style.display = 'none';
            removeFromPlaylist.style.display = 'none';
        }
    } else {
        addToLibrary.style.display = 'none';
        removeFromLibrary.style.display = 'none';
        contextMedia.style.display = 'none';
        removeFromPlaylist.style.display = 'none';
    }

    document.querySelectorAll('[contexted]').forEach(function(contextedElement) {
        contextedElement.removeAttribute('contexted');
    });

    element.setAttribute('contexted', true);

    //special cases
    if(parent.id == 'player-info') {
        contextMenu.style.zIndex = 999;
    } else {
        contextMenu.style.zIndex = 1;
    }

    if(element.offsetHeight > 100) {
        if(element.getBoundingClientRect().left > $(window).width() / 2) {
            contextMenu.style.left = element.getBoundingClientRect().left - 172 + element.getBoundingClientRect().width;
        } else {
            contextMenu.style.left = element.getBoundingClientRect().left;
        }
    
        if(element.getBoundingClientRect().top > $(window).height() / 2) {
            contextMenu.style.top = element.getBoundingClientRect().top - 130 + element.getBoundingClientRect().height;
        } else {
            contextMenu.style.top = element.getBoundingClientRect().top;
        }
    } else {
        if(element.getBoundingClientRect().left > $(window).width() / 2) {
            contextMenu.style.left = element.getBoundingClientRect().left - 172 + element.getBoundingClientRect().width;
        } else {
            contextMenu.style.left = element.getBoundingClientRect().left;
        }

        if(element.getBoundingClientRect().top > $(window).height() / 2) {
            contextMenu.style.top = element.getBoundingClientRect().top - element.getBoundingClientRect().height;
        } else {
            contextMenu.style.top = element.getBoundingClientRect().top;
        }
    }

    setTimeout(function() {
        contextMenu.style.pointerEvents = 'auto';
        contextMenu.style.opacity = 1;
    }, 10);
}


function selectSong(line) {
    document.querySelectorAll('.song-line').forEach(function(element) {
        element.removeAttribute('style');
        element.querySelector('.fa-ellipsis-h').removeAttribute('style');
    })
    line.style.backgroundColor = '#fa233b';
    line.style.color = 'white';

    line.querySelector('.fa-ellipsis-h').style.color = 'white';
}


function selectSongInCustomShow(customClass, line) {
    document.querySelectorAll('.' + customClass).forEach(function(element) {
        element.removeAttribute('style');
        element.querySelector('.fa-ellipsis-h').removeAttribute('style');
        element.querySelector('img').removeAttribute('style');

        if(element.getAttribute('disabled') !== null) {
            element.style.pointerEvents = 'none';
            element.style.opacity = 0.5;
        }
        
        if(element.querySelector('svg') !== null && element.querySelector('svg').style.opacity == 1) {
            element.querySelectorAll('.playback-bars__bar').forEach(function(bar) {
                bar.style.fill = 'var(--mainAccent)';
            });
        } else {
            element.querySelector('.index').removeAttribute('style');
        }
    });
    line.style.backgroundColor = 'rgb(250, 35, 59)';
    line.style.color = 'white';

    line.querySelector('.fa-ellipsis-h').style.color = 'white';
    if(line.querySelector('svg').style.opacity == 1) {
        line.querySelector('.index').style.opacity = 0;
    } else {
        line.querySelector('.index').style.opacity = 1;
    }
    
    line.querySelector('img').style.filter = 'invert(1)';
    line.querySelectorAll('.playback-bars__bar').forEach(function(element) {
        element.style.fill = 'white';
    });
}

function selectSongInQueue(line) {
    document.querySelectorAll('.queue-song-line').forEach(function(element) {
        var setHidden = false;
        if(element.style.display == 'none') setHidden = true;
        element.removeAttribute('style');
        if(setHidden) element.style.display = 'none';
        element.querySelector('.fa-ellipsis-h').removeAttribute('style');
    })
    line.style.backgroundColor = 'rgb(250, 35, 59)';
    line.style.color = 'white';

    line.querySelector('.fa-ellipsis-h').style.color = 'white';
}


async function selectArtist(line) {
    if(line.style.color == 'white') return; //already selected

    document.querySelectorAll('.artist-line').forEach(function(element) {
        element.removeAttribute('style');
    })
    line.style.backgroundColor = '#fa233b';
    line.style.color = 'white';

    document.getElementById('artist-albums').innerHTML = '';
    document.getElementById('artist-loading-item').style.display = 'block';
    artistInfo = await getAlbumsForArtist(line.getAttribute('artist_id'));
    document.getElementById('artist-albums').innerHTML = '';

    document.getElementById('artist-name').innerHTML = line.getAttribute('artist_name') + '<div class="separator"></div>';
    document.getElementById('artist-avatar').src = line.getAttribute('artist_avatar');
    if(line.getAttribute('artist_avatar') == '') {
        document.getElementById('artist-avatar').className = 'no-image';
    } else {
        document.getElementById('artist-avatar').className = '';
    }

    Object.keys(artistInfo).forEach(function(key) {
        var artworkWrapper = document.createElement('div');
        artworkWrapper.innerHTML = '<i class="fas fa-play left" onclick="playItem(\'' + artistInfo[key]['id'] + '\', \'' + artistInfo[key]['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50') + '\', \'album\')"></i><i class="fas fa-ellipsis-h right"></i>';

        var artworkImg = document.createElement('img');
        artworkImg.src = artistInfo[key]['attributes']['artwork']['url'].replace('{w}', '220').replace('{h}', '220').replace('{f}', 'jpg');
        artworkImg.setAttribute('draggable', 'false');
        artworkImg.setAttribute('onclick', 'presentAlbum("' + artistInfo[key]['id'] + '")')
        artworkWrapper.appendChild(artworkImg);

        var artworkText = document.createElement('h5');
        artworkText.innerHTML = artistInfo[key]['attributes']['name'] + '<span>' + artistInfo[key]['attributes']['releaseDate'].substring(0,4) + '</span>';
        artworkWrapper.appendChild(artworkText);

        document.getElementById('artist-albums').appendChild(artworkWrapper);
    });

    document.getElementById('artist-loading-item').style.display = 'none';
}

async function showContextMenu(type, id, element, online, id_type, pane) {
    //
    // online is if the item is in the library or in Apple Music
    // pane is eg. recently-added
    //
    var contextMenu = document.getElementById('context-menu');

    var addToLibrary = document.getElementById('context-menu-addlibrary');
    var removeFromLibrary = document.getElementById('context-menu-removelibrary');
    var contextMedia = document.getElementById('context-menu-media');

    addToLibrary.style.display = 'none';
    removeFromLibrary.style.display = 'none';
    contextMedia.style.display = 'none';

    document.querySelectorAll('[contexted]').forEach(function(contextedElement) {
        contextedElement.removeAttribute('contexted');
    });

    element.setAttribute('contexted', true);

    switch(type) {
        case 'media':
            contextMedia.style.display = 'block';
            if(online) {
                if(await isInLibrary(id, id_type)) {
                    removeFromLibrary.style.display = 'block';
                    //removeFromLibrary.setAttribute('onclick', 'prepareRemoveItemFromLibrary("' + id + '", "' + id_type + '", "' + pane + '")'); //remove from library
                } else {
                    addToLibrary.style.display = 'block';
                }
            } else {
                removeFromLibrary.style.display = 'block';
            }
            break;
        default:
            break;
    }

    if(element.getBoundingClientRect().left > $(window).width() / 2) {
        contextMenu.style.left = element.getBoundingClientRect().left - 172 + element.getBoundingClientRect().width;
    } else {
        contextMenu.style.left = element.getBoundingClientRect().left;
    }

    if(element.getBoundingClientRect().top > $(window).height() / 2) {
        contextMenu.style.top = element.getBoundingClientRect().top - 130 + element.getBoundingClientRect().height;
    } else {
        contextMenu.style.top = element.getBoundingClientRect().top;
    }

    setTimeout(function() {
        contextMenu.style.pointerEvents = 'auto';
        contextMenu.style.opacity = 1;
    }, 10);
}

function presentDialog(text, button1text, button1action, button2text, button2action) { //button2text == '' -> one button dialog
    var dialog = document.getElementById('dialog-popup');
    var button1 = document.getElementById('ap-btn1');
    var button2 = document.getElementById('ap-btn2');
    var dialogText = document.getElementById('ap-body');

    dialogText.innerHTML = text;
    button1.innerHTML  = button1text;
    if(button1action == '' || button1action === undefined) button1action = 'closeDialog();';
    button1.setAttribute('onclick', button1action);
    if(button2text != '' && button2text !== undefined) {
        button2.innerHTML = button2text;
        if(button2action == '' || button2action === undefined) button2action = 'closeDialog();';
        button2.setAttribute('onclick', button2action);
        dialog.className = 'shown';
    } else {
        dialog.className = 'solo shown';
    }
}

function closeDialog() {
    document.getElementById('dialog-popup').className = '';
}

function changeAppColorMode(color) {
    if(color == 'system') {
        color = systemColorMode;
        if(systemColorMode === null) return;
    }

    var value = (document.getElementById("volume").value-document.getElementById("volume").min)/(document.getElementById("volume").max-document.getElementById("volume").min)*100;

    switch(color) {
        case 'light':
            document.querySelectorAll('.nb-item').forEach(function(item) {
                if(item.style.backgroundColor == 'rgb(86, 86, 86)') {
                    item.style.backgroundColor = 'rgb(226, 226, 226)';
                    item.style.boxShadow = 'rgba(149, 157, 165, 0.2) 0px 8px 24px';
                }
            });
            $('link[href="css/darkmode.css"]').remove();
            document.getElementById("volume").style.background = 'linear-gradient(to right, #a0a0a0 0%, #a0a0a0 ' + value + '%, #e0e0e0 ' + value + '%, #e0e0e0 100%)';
            break;
        case 'dark':
            document.querySelectorAll('.nb-item').forEach(function(item) {
                if(item.style.backgroundColor == 'rgb(226, 226, 226)') {
                    item.style.backgroundColor = 'rgb(86, 86, 86)';
                    item.style.boxShadow = 'rgba(23, 24, 25, 0.2) 0px 8px 24px';
                }
            });
            $('link[href="css/darkmode.css"]').remove();
            $('head').append('<link rel="stylesheet" href="css/darkmode.css" type="text/css" />');
            document.getElementById("volume").style.background = 'linear-gradient(to right, #828282 0%, #828282 ' + value + '%, #666666 ' + value + '%, #666666 100%)';
            break;
    }
}

function changeAppPerformanceMode(bool) {
    if(bool) { //enable
        $('style[id="performance-mode-css"]').remove();
        $('head').append('<style id="performance-mode-css">* { transition: none !important; animation: none !important; }</style>');
    } else {
        $('style[id="performance-mode-css"]').remove();
    }
}