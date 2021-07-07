const { time } = require("console");
const { create } = require("domain");
const fs = require("fs");
const dataFolderPath = (electron.app || electron.remote.app).getPath('userData');

var app_version;

var playlists;
var recentlyAdded;
var recentlyAddedOffset = 0;
var artists;
var artistsOffset = 0;
var albums;
var albumsOffset = 0;
var songs;
var songsOffset = 0;

async function loadAppData() {
    ipcRenderer.send('app_version');
    ipcRenderer.on('app_version', (event, arg) => {
        ipcRenderer.removeAllListeners('app_version');
        console.log("RLTrader version is " + arg.version);
        document.getElementById('update-app-version').innerText = "Version " + arg.version;
        document.getElementById('settings-app-version').innerText = "Version " + arg.version;
    });
    if(fs.existsSync(dataFolderPath + "/data/")) {
        var userDataPath = dataFolderPath + "/data/userdata.json";
        if(fs.existsSync(userDataPath))  {
            var userDataContent = JSON.parse(fs.readFileSync(userDataPath, 'utf-8').toString());
            document.querySelectorAll('img').forEach(function(img) {
                img.setAttribute('draggable', 'false');
            });
            if(userDataContent.isConnected != 1) { //user is not connected
                navBarSelect(); //no need to add args as we aren't connected
            } else {
                ipcRenderer.send('thumbar', 0);
                var volumeSlider = document.getElementById('volume');
                volumeSlider.value = userDataContent.lastVolume;
                var value = (volumeSlider.value-volumeSlider.min)/(volumeSlider.max-volumeSlider.min)*100;
                volumeSlider.style.background = 'linear-gradient(to right, #a0a0a0 0%, #a0a0a0 ' + value + '%, #e0e0e0 ' + value + '%, #e0e0e0 100%)';
                ipcRenderer.send('MusicJS', 'MusicKit.getInstance().volume = ' + volumeSlider.value + ';');
                navBarSelect(userDataContent.lastOpenedNavbarItem);
                document.getElementById('recently-added-loading-item').style.display = 'block';
                document.getElementById('albums-loading-item').style.display = 'block';
                document.getElementById('artists-loading-item').style.display = 'block';
                document.getElementById('songs-loading-item').style.display = 'block';

                playlists = await savePlaylists();
                var playlistNumber = 0;
                Object.keys(playlists).forEach(function(key) {
                    playlistNumber++;
                    var playlistDiv = document.createElement('div');
                    playlistDiv.innerHTML = '<img src="assets/sidebar_GenericPlaylist.svg" draggable="false" /><span>' + playlists[key]['attributes']['name'] + '</span>';
                    if(playlistNumber == 1) playlistDiv.style.marginTop = '15px';
                    document.getElementById('playlists-wrapper').appendChild(playlistDiv);
                });
                if(playlistNumber == 0) {
                    document.getElementById('playlists-status').innerHTML = 'No playlists';
                } else {
                    document.getElementById('playlists-status').innerHTML = 'Playlists';
                }
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
}

function sendParams() {
    changeRepeatMode('', userDataContent.lastRepeatMode);
    toggleShuffle('', userDataContent.lastShuffleMode);

    var volumeSlider = document.getElementById('volume');
    ipcRenderer.send('MusicJS', 'MusicKit.getInstance().volume = ' + volumeSlider.value + ';');
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

    document.getElementById('artist-name').innerHTML = line.getAttribute('artist_name') + '<div class="separator"></div>';
    document.getElementById('artist-avatar').src = line.getAttribute('artist_avatar');
    if(line.getAttribute('artist_avatar') == '') {
        document.getElementById('artist-avatar').className = 'no-image';
    } else {
        document.getElementById('artist-avatar').className = '';
    }

    Object.keys(artistInfo).forEach(function(key) {
        var artworkWrapper = document.createElement('div');
        artworkWrapper.innerHTML = '<i class="fas fa-play left"></i><i class="fas fa-ellipsis-h right"></i>';

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

document.addEventListener('DOMContentLoaded', function() {
    loadAppData();
});

var lastRecentlyAddedScrollHeight = 0;

async function scrollingRecentlyAdded() {
    var recentlyAddedDiv = document.getElementById('c-recently-added');
    if(recentlyAddedDiv.scrollTop >= recentlyAddedDiv.scrollHeight - recentlyAddedDiv.clientHeight - 150 && recentlyAddedDiv.scrollHeight - recentlyAddedDiv.clientHeight > lastRecentlyAddedScrollHeight) {
        lastRecentlyAddedScrollHeight = recentlyAddedDiv.scrollHeight - recentlyAddedDiv.clientHeight;
        recentlyAdded = await saveRecentlyAdded(recentlyAddedOffset);
        insertRecentlyAdded();
    }
}

function insertRecentlyAdded() {
    Object.keys(recentlyAdded).forEach(function(key) {
        var artworkWrapper = document.createElement('div');
        if(recentlyAdded[key]['attributes']['artwork'] === undefined) return;
        artworkWrapper.innerHTML = '<i class="fas fa-play left" onclick="playAlbum(\'' + recentlyAdded[key]['id'] + '\', \'' + recentlyAdded[key]['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50') + '\')"></i><i class="fas fa-ellipsis-h right" onclick="showContextMenu(\'media\', \'' + recentlyAdded[key]['id'] + '\', this, false)"></i>';
        artworkWrapper.setAttribute('album_id', recentlyAdded[key]['id']);

        var artworkImg = document.createElement('img');
        if(recentlyAdded[key]['attributes']['artwork'] !== undefined) {
            artworkImg.src = recentlyAdded[key]['attributes']['artwork']['url'].replace('{w}', '200').replace('{h}', '200').replace('{f}', 'jpg');
        } else {
            return;
        }
        artworkImg.setAttribute('draggable', 'false');
        artworkImg.setAttribute('onclick', 'presentAlbum("' + recentlyAdded[key]['id'] + '")')
        artworkWrapper.appendChild(artworkImg);

        if(recentlyAdded[key]['attributes']['artistName'] === undefined) return;

        var artworkText = document.createElement('h5');
        artworkText.innerHTML = recentlyAdded[key]['attributes']['name'] + '<span>' + recentlyAdded[key]['attributes']['artistName'] + '</span>';
        artworkWrapper.appendChild(artworkText);

        document.getElementById('c-recently-added').appendChild(artworkWrapper);
    });
}

function saveRecentlyAdded(offset) {
    return new Promise(resolve => {
        var url = "https://amp-api.music.apple.com/v1/me/library/recently-added?l=en-gb&offset=" + offset + "&platform=web&include[library-albums]=artists&include[library-artists]=catalog&fields[artists]=url&fields%5Balbums%5D=artistName%2CartistUrl%2Cartwork%2CcontentRating%2CeditorialArtwork%2Cname%2CplayParams%2CreleaseDate%2Curl&includeOnly=catalog%2Cartists&limit=25";
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);

        xhr.setRequestHeader("authorization", "Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldlYlBsYXlLaWQifQ.eyJpc3MiOiJBTVBXZWJQbGF5IiwiaWF0IjoxNjIyMjUxNTA1LCJleHAiOjE2Mzc4MDM1MDV9.qaZGFoe0pn7-8K0MDbAp2c35nEtrQKz_v4UN2BF4jR7NR2vGKHTzurwsk-rZZUvVjtdqSj5Pli5AKzGn5_OLbQ");
        xhr.setRequestHeader("cache-control", "no-cache");
        xhr.setRequestHeader("media-user-token", "Al9QKe6fCBtHDb5dJIDiyw6dlFd4L+HRIGdOZpc8vuZBR6ZLxO0OxcVbxX84rX6ACmLAlakfdgDjL97iOUI3EHhnN5TUKT3J5VvPdIUAkrmQApKk+N3lE8Ulc910UfaIR9mSrsrMhqcsloewO5nYV2KutfCejBaOaNggo43wUyHffyd1T87LuQD0k8merVJkOGhfXdBv65kHZwiXw+lbE1s/jNXJGvIoemr6kj1rxSAv7juC+A==");
        xhr.setRequestHeader("accept", "*/*");
        xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

        xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            resolve(JSON.parse(xhr.responseText)['data']);
            recentlyAddedOffset = recentlyAddedOffset + 40;
        }};

        xhr.send();
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
        artworkWrapper.innerHTML = '<i class="fas fa-play left" onclick="playAlbum(\'' + albums[key]['id'] + '\', \'' + albums[key]['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50') + '\')"></i><i class="fas fa-ellipsis-h right"></i>';

        var artworkImg = document.createElement('img');
        artworkImg.src = albums[key]['attributes']['artwork']['url'].replace('{w}', '200').replace('{h}', '200').replace('{f}', 'jpg');
        artworkImg.setAttribute('draggable', 'false');
        artworkImg.setAttribute('onclick', 'presentAlbum("' + albums[key]['id'] + '")')
        artworkWrapper.appendChild(artworkImg);

        var artworkText = document.createElement('h5');
        if(albums[key]['relationships']['artists']['data'][0]['relationships']['catalog']['data'][0] !== undefined) {
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
        var url = "https://amp-api.music.apple.com/v1/me/library/albums?l=en-gb&platform=web&limit=100&offset=" + offset + "&include[library-albums]=artists&include[library-artists]=catalog&include[albums]=artists&fields[artists]=name%2Curl&fields%5Balbums%5D=artistName%2CartistUrl%2Cartwork%2CcontentRating%2CeditorialArtwork%2Cname%2CplayParams%2CreleaseDate%2Curl&includeOnly=catalog%2Cartists";

        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);

        xhr.setRequestHeader("authorization", "Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldlYlBsYXlLaWQifQ.eyJpc3MiOiJBTVBXZWJQbGF5IiwiaWF0IjoxNjIyMjUxNTA1LCJleHAiOjE2Mzc4MDM1MDV9.qaZGFoe0pn7-8K0MDbAp2c35nEtrQKz_v4UN2BF4jR7NR2vGKHTzurwsk-rZZUvVjtdqSj5Pli5AKzGn5_OLbQ");
        xhr.setRequestHeader("media-user-token", "As4DmOfm1sM8WjKAD2g4JqSBcJeSoTGl+WlAThicP3M7DVWg7RxaM1t6GrDbpiyeSl2/R75H+ENi7C5l+jtDeXV9+KcBHiTZuRzDYrvMlPIwIkZzbrf7T7aVvYR6OBWKHvzlRSl5cD2WfPJkPDIPNrppd4ASdU0jwJNA/1F1aF9VZjHEYa/z34WHu6QAjwwp26jNoWoZJC8r4n0NPJm0awjjioBGYd+DcPEJ1d7N8FJFWm43Rg==");
        xhr.setRequestHeader("accept", "*/*");
        xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

        xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            resolve(JSON.parse(xhr.responseText)['data']);
            albumsOffset = albumsOffset + 100;
        }};

        xhr.send();
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
        var url = "https://amp-api.music.apple.com/v1/me/library/artists?l=en-gb&platform=web&include=catalog&limit=100&offset=" + offset;

        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);

        xhr.setRequestHeader("authorization", "Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldlYlBsYXlLaWQifQ.eyJpc3MiOiJBTVBXZWJQbGF5IiwiaWF0IjoxNjIyMjUxNTA1LCJleHAiOjE2Mzc4MDM1MDV9.qaZGFoe0pn7-8K0MDbAp2c35nEtrQKz_v4UN2BF4jR7NR2vGKHTzurwsk-rZZUvVjtdqSj5Pli5AKzGn5_OLbQ");
        xhr.setRequestHeader("media-user-token", "As4DmOfm1sM8WjKAD2g4JqSBcJeSoTGl+WlAThicP3M7DVWg7RxaM1t6GrDbpiyeSl2/R75H+ENi7C5l+jtDeXV9+KcBHiTZuRzDYrvMlPIwIkZzbrf7T7aVvYR6OBWKHvzlRSl5cD2WfPJkPDIPNrppd4ASdU0jwJNA/1F1aF9VZjHEYa/z34WHu6QAjwwp26jNoWoZJC8r4n0NPJm0awjjioBGYd+DcPEJ1d7N8FJFWm43Rg==");
        xhr.setRequestHeader("accept", "*/*");
        xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

        xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            resolve(JSON.parse(xhr.responseText)['data']);
            artistsOffset = artistsOffset + 100;
        }};

        xhr.send();
    });
}

function getAlbumsForArtist(id) {
    return new Promise(resolve => {
        var url = "https://amp-api.music.apple.com/v1/me/library/artists/" + id + "/albums?l=en-gb&platform=web&include[library-albums]=artists%2Ctracks&include[library-artists]=catalog&fields[artists]=url&includeOnly=catalog%2Cartists";

        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);

        xhr.setRequestHeader("authorization", "Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldlYlBsYXlLaWQifQ.eyJpc3MiOiJBTVBXZWJQbGF5IiwiaWF0IjoxNjIyMjUxNTA1LCJleHAiOjE2Mzc4MDM1MDV9.qaZGFoe0pn7-8K0MDbAp2c35nEtrQKz_v4UN2BF4jR7NR2vGKHTzurwsk-rZZUvVjtdqSj5Pli5AKzGn5_OLbQ");
        xhr.setRequestHeader("media-user-token", "As4DmOfm1sM8WjKAD2g4JqSBcJeSoTGl+WlAThicP3M7DVWg7RxaM1t6GrDbpiyeSl2/R75H+ENi7C5l+jtDeXV9+KcBHiTZuRzDYrvMlPIwIkZzbrf7T7aVvYR6OBWKHvzlRSl5cD2WfPJkPDIPNrppd4ASdU0jwJNA/1F1aF9VZjHEYa/z34WHu6QAjwwp26jNoWoZJC8r4n0NPJm0awjjioBGYd+DcPEJ1d7N8FJFWm43Rg==");
        xhr.setRequestHeader("accept", "*/*");
        xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

        xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            resolve(JSON.parse(xhr.responseText)['data']);
        }};

        xhr.send();

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
        tableTr.setAttribute('song_id', songs[key]['id']);
        tableTr.setAttribute('song_duration', Math.round(songs[key]['attributes']['durationInMillis'] / 1000));
        tableTr.setAttribute('onclick', 'selectSong(this)');

        var nameTh = document.createElement('th');
        nameTh.className = 'name';
        nameTh.innerHTML = '<i class="fas fa-ellipsis-h"></i><i class="fas fa-play"></i><img src="' + songs[key]['attributes']['artwork']['url'].replace('{w}', '36').replace('{h}', '36').replace('{f}', 'jpg') + '" onclick="playSong(\'' + songs[key]['id'] + '\', \'' + songs[key]['attributes']['name'].replaceAll("'", "\\'") + '\', \'' + songs[key]['attributes']['artwork']['url'].replace('{w}', '46').replace('{h}', '46') + '\', \'' + songs[key]['attributes']['artistName'].replaceAll("'", "\\'") + '\', \'' + songs[key]['attributes']['albumName'].replaceAll("'", "\\'") + '\', \'' + Math.round(songs[key]['attributes']['durationInMillis'] / 1000) + '\')" /><span>' + songs[key]['attributes']['name'] + '</span>';
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
        var url = "https://amp-api.music.apple.com/v1/me/library/songs?limit=100&offset=" + offset + "&l=en-gb&platform=web";
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);

        xhr.setRequestHeader("authorization", "Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldlYlBsYXlLaWQifQ.eyJpc3MiOiJBTVBXZWJQbGF5IiwiaWF0IjoxNjIyMjUxNTA1LCJleHAiOjE2Mzc4MDM1MDV9.qaZGFoe0pn7-8K0MDbAp2c35nEtrQKz_v4UN2BF4jR7NR2vGKHTzurwsk-rZZUvVjtdqSj5Pli5AKzGn5_OLbQ");
        xhr.setRequestHeader("media-user-token", "Al9QKe6fCBtHDb5dJIDiyw6dlFd4L+HRIGdOZpc8vuZBR6ZLxO0OxcVbxX84rX6ACmLAlakfdgDjL97iOUI3EHhnN5TUKT3J5VvPdIUAkrmQApKk+N3lE8Ulc910UfaIR9mSrsrMhqcsloewO5nYV2KutfCejBaOaNggo43wUyHffyd1T87LuQD0k8merVJkOGhfXdBv65kHZwiXw+lbE1s/jNXJGvIoemr6kj1rxSAv7juC+A==");
        xhr.setRequestHeader("accept", "*/*");
        xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

        xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            resolve(JSON.parse(xhr.responseText)['data']);
            songsOffset = songsOffset + 100;
        }};

        xhr.send();
    });
}

function savePlaylists() {
    return new Promise(resolve => {
        var url = "https://amp-api.music.apple.com/v1/me/library/playlist-folders/p.playlistsroot/children?l=en-gb&platform=web&fields=name%2CcanDelete%2CcanEdit";

        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        
        xhr.setRequestHeader("authorization", "Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldlYlBsYXlLaWQifQ.eyJpc3MiOiJBTVBXZWJQbGF5IiwiaWF0IjoxNjIyMjUxNTA1LCJleHAiOjE2Mzc4MDM1MDV9.qaZGFoe0pn7-8K0MDbAp2c35nEtrQKz_v4UN2BF4jR7NR2vGKHTzurwsk-rZZUvVjtdqSj5Pli5AKzGn5_OLbQ");
        xhr.setRequestHeader("media-user-token", "As4DmOfm1sM8WjKAD2g4JqSBcJeSoTGl+WlAThicP3M7DVWg7RxaM1t6GrDbpiyeSl2/R75H+ENi7C5l+jtDeXV9+KcBHiTZuRzDYrvMlPIwIkZzbrf7T7aVvYR6OBWKHvzlRSl5cD2WfPJkPDIPNrppd4ASdU0jwJNA/1F1aF9VZjHEYa/z34WHu6QAjwwp26jNoWoZJC8r4n0NPJm0awjjioBGYd+DcPEJ1d7N8FJFWm43Rg==");
        xhr.setRequestHeader("accept", "*/*");
        xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");
        
        xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            resolve(JSON.parse(xhr.responseText)['data']);
        }};
        
        xhr.send();
    });
}

function getAlbumData(id) {
    return new Promise(resolve => {
        var url = "https://amp-api.music.apple.com/v1/me/library/albums/" + id + "?l=en-gb&platform=web&include[library-albums]=artists%2Ctracks&include[library-artists]=catalog&include[albums]=artists%2Ctracks&fields[artists]=name%2Curl&includeOnly=catalog%2Cartists%2Ctracks";

        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);

        xhr.setRequestHeader("authorization", "Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldlYlBsYXlLaWQifQ.eyJpc3MiOiJBTVBXZWJQbGF5IiwiaWF0IjoxNjI0NTY5MDQ4LCJleHAiOjE2NDAxMjEwNDh9.S-Qabc63jNHpbWdXg5qNeU-JLaT8PT3_xu916TKOLdHv80r8ZdMtVpf0py8esOH1U6d46f_xPo7hbgbkcmHP1A");
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

function getArtistData(id) {
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

function selectSongInAlbumShow(line) {
    document.querySelectorAll('.album-show-song-line').forEach(function(element) {
        element.removeAttribute('style');
        element.querySelector('.fa-ellipsis-h').removeAttribute('style');
        element.querySelector('img').removeAttribute('style');
        element.querySelector('.index').removeAttribute('style');
    })
    line.style.backgroundColor = 'rgb(250, 35, 59)';
    line.style.color = 'white';

    line.querySelector('.fa-ellipsis-h').style.color = 'white';
    line.querySelector('.index').style.opacity = '1';
    line.querySelector('img').style.filter = 'invert(1)';
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

function addSongToLibrary(id) { // online id: 411564564
    return new Promise(resolve => {
        var url = "https://amp-api.music.apple.com/v1/me/library?ids[songs]=" + id;

        var xhr = new XMLHttpRequest();
        xhr.open("POST", url);

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

function deleteSongFromLibrary(id) { //offline id: i.uhgGhyGFy
    return new Promise(resolve => {
        var url = "https://amp-api.music.apple.com/v1/me/library/songs/" + id;

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

function isInLibrary(id, type) { //online id
    return new Promise(resolve => {
        var url = "https://amp-api.music.apple.com/v1/catalog/fr?l=en-gb&platform=web&omit%5Bresource%5D=autos&fields=inLibrary&relate=library&ids%5B" + type + "%5D=" + id;

        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);

        xhr.setRequestHeader("authorization", "Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldlYlBsYXlLaWQifQ.eyJpc3MiOiJBTVBXZWJQbGF5IiwiaWF0IjoxNjI0NjQwODcyLCJleHAiOjE2NDAxOTI4NzJ9.yT3syIsyvTJDVG-3tFfZU0BDC-3uw-mGhHvBzhfNW1Qyyq2z5YHVVpbBfWTyVHHXznIM3efAAwvnD5L365exUw");
        xhr.setRequestHeader("cache-control", "no-cache");
        xhr.setRequestHeader("media-user-token", "As4DmOfm1sM8WjKAD2g4JqSBcJeSoTGl+WlAThicP3M7DVWg7RxaM1t6GrDbpiyeSl2/R75H+ENi7C5l+jtDeXV9+KcBHiTZuRzDYrvMlPIwIkZzbrf7T7aVvYR6OBWKHvzlRSl5cD2WfPJkPDIPNrppd4ASdU0jwJNA/1F1aF9VZjHEYa/z34WHu6QAjwwp26jNoWoZJC8r4n0NPJm0awjjioBGYd+DcPEJ1d7N8FJFWm43Rg==");
        xhr.setRequestHeader("accept", "*/*");
        xhr.setRequestHeader("accept-language", "en-US,en;q=0.9,fr;q=0.8,fr-FR;q=0.7,en-GB;q=0.6");

        xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            resolve(JSON.parse(xhr.responseText)['data'][0]['attributes']['inLibrary']);
        }};

        xhr.send();

    });
}