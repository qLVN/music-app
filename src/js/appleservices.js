const music = MusicKit.configure({
    developerToken: "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldlYlBsYXlLaWQifQ.eyJpc3MiOiJBTVBXZWJQbGF5IiwiaWF0IjoxNjI0MzIxMTQyLCJleHAiOjE2Mzk4NzMxNDJ9.ux5vBRNEzF6dZ05ke56QkhMYcb4P8hK89BABQk1WWwFnjSjwoZbmxH-BwL9DZ2qsrHWoSttJt5vjC3qttog8tg",
    app: {
        name: 'AppleMusicKitExample',
        build: '1978.4.1'
    }
});

function loginToApple() {
    var loadingScreen = document.getElementById('loading-account');
    var loadingWheel = document.getElementById('loading-account-wheel');

    music.authorize().then(function() {
        loadingScreen.style.display = 'none';
        loadingScreen.style.opacity = '0';
        loadingWheel.style.display = 'none';
        loadingWheel.style.opacity = '0';
    });

    loadingWheel.style.opacity = '0';
    loadingScreen.style.opacity = '0';
    loadingScreen.style.display = 'block';
    setTimeout(function() {
        loadingScreen.style.opacity = '1';
        setTimeout(function() {
            loadingWheel.style.opacity = '1';
        }, 400);
    }, 0);
}