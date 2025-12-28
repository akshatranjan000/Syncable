let socket = null;
let roomId = null;

chrome.storage.local.onChanged.addListener(
    async (changes) => {
        if (changes.roomId) {
            if (changes.roomId.newValue) {
                roomId = changes.roomId.newValue;
                console.log('Room ID updated to:', roomId);
                initializeSocket();
            } else {
                // Room was removed
                console.log('Room ID removed, closing connection');
                roomId = null;
                if (socket) {
                    socket.close();
                    socket = null;
                }
            }
        }
    }
);

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ windowId: tab.windowId });
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-sidepanel') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.sidePanel.open({ windowId: tabs[0].windowId });
            }
        });
    }
});

function initializeSocket() {
    if (socket) {
        socket.close();
    }

    socket = new WebSocket('wss//sync-server-old-violet-1509.fly.dev');

    socket.onopen = () => {
        console.log('WebSocket connection established');
        if (roomId) {
            socket.send(JSON.stringify({ type: 'join', roomId }));
            console.log('Joined room:', roomId);
        }
    }

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, data);
        });
    };
}

chrome.runtime.onMessage.addListener((message, sender) => {
    // Handle room join/exit messages from popup
    if (message.type === 'joinRoom') {
        roomId = message.roomId;
        console.log('Received joinRoom message for:', roomId);
        initializeSocket();
        return;
    }
    
    if (message.type === 'exitRoom') {
        console.log('Received exitRoom message');
        roomId = null;
        if (socket) {
            socket.close();
            socket = null;
        }
        return;
    }
    
    // Forward video control messages to WebSocket
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    }
});