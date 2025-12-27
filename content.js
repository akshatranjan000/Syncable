const { url } = require("inspector");

let video;

function findVideo() {
    video = document.querySelector('video');

    if (!video) {
        console.log('No video element found, retrying in 1 second...');
        setTimeout(findVideo, 1000);
    } else {
        console.log('Video element found:', video);
        attachListeners();
    }
}

findVideo();

function attachListeners() {
    video.addEventListener('play', () => {
        console.log('Video played');
        chrome.runtime.sendMessage({ type: 'play' });
    });
    
    video.addEventListener('pause', () => {
        console.log('Video paused');
        chrome.runtime.sendMessage({ type: 'pause' });
    });

    video.addEventListener('seeked', () => {
        console.log('Video seeked to:', video.currentTime);
        chrome.runtime.sendMessage({ type: 'seek', time: video.currentTime });
    });
}

let applyingRemoteAction = false;

function send(type) {
    if (applyingRemoteAction) return;
    chrome.runtime.sendMessage({
        type,
        roomId: null,
        currentTime: video.currentTime,
        playbackRate: video.playbackRate,
        url: window.location.href
    });
    console.log(`Sent message of type: ${type}`);
}

chrome.runtime.onMessage.addListener((msg) => {
    applyingRemoteAction = true;
    if (!video) return;

    if(msg.type === 'sync-state') {
        const { url, time, isPlaying, playbackRate } = msg.state;

        if( window.location.href !== url ) {
            console.log('Syncing video URL to:', url);
            window.location.href = url;
            return;
        }

        video.currentTime = time;
        video.playbackRate = playbackRate;

        isPlaying ? video.play() : video.pause();
    }
    
    if (msg.type === 'play') {
        console.log('Received play command');
        video.play();
    } else if (msg.type === 'pause') {
        console.log('Received pause command');
        video.pause();
    } else if (msg.type === 'seek') {
        console.log('Received seek command to:', msg.time);
        video.currentTime = msg.time;
    }
});


video.addEventListener('play', () => { send('play'); });
video.addEventListener('pause', () => { send('pause'); });
video.addEventListener('seeked', () => { send('seek'); });