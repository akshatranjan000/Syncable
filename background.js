let socket = null;
let roomId = null;
let sidePanelOpen = false;
let socketPingInterval = null;

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
    sidePanelOpen = true;
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-sidepanel') {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            if (tabs[0]) {
                if(sidePanelOpen) {
                    await chrome.sidePanel.close({ windowId: tabs[0].windowId });
                    sidePanelOpen = false;
                }
                else {
                    await chrome.sidePanel.open({ windowId: tabs[0].windowId });
                    sidePanelOpen = true;
                }
            }
        });
    }
});

function initializeSocket() {
    if (socket) {
        socket.close();
    }
    
    // Clear any existing ping interval
    if (socketPingInterval) {
        clearInterval(socketPingInterval);
    }

    socket = new WebSocket('wss://sync-server-old-violet-1509.fly.dev');

    socket.onopen = () => {
        console.log('WebSocket connection established');
        if (roomId) {
            socket.send(JSON.stringify({ type: 'join', roomId }));
            console.log('Joined room:', roomId);
        }
        
        // Start ping interval to prevent disconnection
        socketPingInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'ping' }));
            }
        }, 25000); // Ping every 25 seconds (before 30 second timeout)
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    socket.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        if (socketPingInterval) {
            clearInterval(socketPingInterval);
        }
    };

    socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'pong') {
            console.log('Received pong from server');
            return;
        }

        console.log('Forwarding message to extension:', data);
        
        // Handle URL navigation from background script
        if (data.type === 'sync-state' && data.state?.url) {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0] && tabs[0].url !== data.state.url) {
                console.log('Navigating tab to:', data.state.url);
                await chrome.tabs.update(tabs[0].id, { url: data.state.url });
                return; // Don't forward sync-state until after navigation completes
            }
        }
        
        // Send to popup (with fromServer flag)
        chrome.runtime.sendMessage({ ...data, fromServer: true }).catch(() => {
            // Popup might not be open, that's okay
        });
        
        // Send to content scripts only in active tab to avoid loops
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, data).catch(() => {
                // Tab might not have content script, that's okay
            });
        }
    };
}

chrome.runtime.onMessage.addListener((message) => {
    // Handle room join/exit messages from popup
    if (message.type === 'joinRoom') {
        // Store roomId - storage.onChanged listener will handle socket initialization
        chrome.storage.local.set({ roomId: message.roomId });
        console.log('Received joinRoom message for:', message.roomId);
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

    if (message.type === 'chatMessage') {
        // Forward chat messages to WebSocket
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
        }
        return;
    }

    // Forward video control messages to WebSocket
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    }
});