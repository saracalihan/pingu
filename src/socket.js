require('colors');
const { randomInt } = require("crypto");
const { Server } = require("socket.io");

const logToServer = (status, message, date = new Date()) => {
  status = status.toUpperCase();
  switch (status) {
    case 'ROOM':
      status = status.bgRed;
      break;
    case 'MESSAGE':
      status = status.bgGreen;
      break;
    default:
      status = status.bgBlue;
  }
  console.log(`${date.toLocaleString().yellow} - ${status}: ${message}`);
};

class Socket {
  constructor(server) {
    this.io = new Server(server);
    this.users = [];
    this.rooms = [];
  }
  createRoom(video, user) {
    const room = {
      id: Date.now() + randomInt(9999),
      video,
      users: [
        user,
      ],
      messages: []
    };
    this.rooms.push(room)
    return room;
  }
  joinRoom(roomId, user) {
    if (!this.getRoom(roomId)) {
      return;
    }
    this.rooms[this.rooms.findIndex(r => r.id == roomId)].users.push(user);
  }
  addUser(username, socket) {
    let user = { id: socket.id, username };
    this.users.push(user);
    return user;
  }
  getUser(id) {
    return this.users.filter(u => u.id == id)[0];
  }
  getRoom(id) {
    return this.rooms[this.rooms.findIndex(r => r.id == id)]
  }
  addMessages(roomId, user, text, isSystemMessage = false) {
    let message = {
      text,
      username: user,
      isSystemMessage,
      date: new Date(),
    };
    this.rooms[this.rooms.findIndex(r => r.id == roomId)].messages.push(message);
    return message;
  }

  broadcastEvent(socket, event, ...args) { // io içindeki bazı clients id'leri çözülemeyen bir nedenle string olmadığı için socket.brodacast.to çalışmıyor. 
    this.io.sockets.sockets.forEach(s => {
      if (s.id === socket.id) {
        return
      }
      s.emit(event, ...args);
    })
  }

  listen() {
    let that = this;
    this.io.on('connection', function connection(socket) {
      socket.on('create-room', ({ username, video }) => {
        const room = that.createRoom(video, that.addUser(username, socket));
        socket.join(room.id);
        logToServer('room', `${room.id} created by ${room.users[0].username}`);
        socket.emit('room-info', room);
      });

      socket.on('join-room', ({ username, roomId }) => {
        if (!that.getRoom(roomId)) {
          return socket.disconnect();
        }

        let user = that.addUser(username, socket);
        that.joinRoom(roomId, user);
        socket.join(roomId);
        that.sendAll(roomId, socket, `${username} joined`, true);
        logToServer('room', `${user.username} joined to room ${roomId}`);
      });

      socket.on('message', function message({ roomId, user, message }) {
        if (message == '!q') {
          that.sendAll(roomId, socket, `${user} quit`, true);
          return socket.disconnect();
        }
        that.sendAll(roomId, socket, message);
      });

      socket.on('room-info', (roomId) => {
        let room = that.rooms.find(r => r.id == roomId);
        socket.emit('room-info', room);
      });

      socket.on('disconnect', () => {
      });

      socket.on('durdu', ({ roomId, username }) => {
        //socket.broadcast.to(roomId).emit('video-durdur');
        that.broadcastEvent(socket, 'video-durdur');
        that.sendAll(roomId, socket, `${username} stoped the video`, true);
      });

      socket.on('oynat', ({ roomId, username }) => {
        that.broadcastEvent(socket, 'video-oynat');
        //socket.broadcast.to(roomId).emit('video-oynat');
        that.sendAll(roomId, socket, `${username} played the video`, true);
      });
    });
  }

  sendAll(roomId, socket, message, isSystemMessage = false) {
    let user = socket ? this.getUser(socket.id).username : null
    const m = this.addMessages(roomId, user, message, isSystemMessage)
    //this.io.sockets.sockets.forEach(s => s.emit('message', JSON.stringify(m)))
    this.broadcastEvent(socket, 'message', JSON.stringify(m))
    //socket.broadcast.to(roomId).emit('message', JSON.stringify(m));
    logToServer('message', `${user} send message to room ${roomId}`);
  }
}

module.exports = Socket;