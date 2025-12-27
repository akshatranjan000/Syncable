const { hostname } = require('os');
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

const rooms = new Map();

/*
Broadcasts a message to all clients in a room, except the specified client.
*/
function broadcast(room, data, except) {
    const msg = JSON.stringify(data);
    let broadcastCount = 0;
    for(const client of room.sockets) {
        if (client !== except && client.readyState === WebSocket.OPEN) {
            client.send(msg);
            broadcastCount++;
        }
    }
    console.log(`📢 Broadcasted ${data.type} to ${broadcastCount} client(s)`);
};

/*
Handles new client connections to the WebSocket server.
*/
wss.on('connection', (socket) => {
    console.log('🔌 New client connected');
    let currentRoomId = null;

    socket.on('message', (raw) => {
        const msg = JSON.parse(raw);
        if (msg.type === 'join') {
            const { roomId } = msg;
            currentRoomId = roomId;

            //Create room if it doesn't exist
            if (!rooms.has(roomId)) {
                rooms.set(roomId, {
                     sockets: new Set(),
                     state: null
                });
                console.log(`🏠 Created new room: ${roomId}`);
            }

            //Add user(socket) to the room
            const room = rooms.get(roomId);
            room.sockets.add(socket);
            console.log(`✅ Client joined room ${roomId} (${room.sockets.size} client(s) in room)`);

            //Send current state to the newly joined client
            if (room.state) {
                socket.send(JSON.stringify({ 
                    type: 'sync-state', 
                    state: room.state 
                }));
                console.log(`🔄 Sent current state to new client in room ${roomId}`);
            }

            return;
        }
        if (!currentRoomId) return;
        
        const room = rooms.get(currentRoomId);
        if (!room) return;

        if (msg.type === 'play' || 
            msg.type === 'pause' || 
            msg.type === 'seek' || 
            msg.type === 'timeupdate'
        ) {
            room.state = {
                url: msg.url,
                time: msg.currentTime,
                isPlaying: msg.type === 'play' ? true : 
                           msg.type === 'pause' ? false : 
                           room.state ? room.state.isPlaying ?? false : false,
                playbackRate: msg.playbackRate ?? room.state ? room.state.playbackRate ?? 1 : 1,
                updatedAt: Date.now()
            }

            console.log(`📺 Room ${currentRoomId}: ${msg.type} at ${msg.currentTime?.toFixed(2)}s`);
            broadcast(room, msg, socket);
        }
    });

    socket.on('close', () => {
        if (!currentRoomId) return;

        const room = rooms.get(currentRoomId);
        if (!room) return;

        room.sockets.delete(socket);
        console.log(`👋 Client left room ${currentRoomId} (${room.sockets.size} client(s) remaining)`);

        //If room is empty, delete it
        if (room.sockets.size === 0) {
            rooms.delete(currentRoomId);
            console.log(`🗑️  Deleted empty room: ${currentRoomId}`);
        }
    })
});

setInterval(() => {
    console.log(`Current active rooms: ${Array.from(rooms.keys()).join(', ')}`);
}, 60000);

console.log(`WebSocket server running on ws://${hostname()}:8080`);