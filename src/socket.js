const { Server } = require("socket.io");

class Socket {
  constructor(server) {
    this.io = new Server(server);
    this.users = [];
    this.rooms = [];
  }
  createRoom(roomId, user) {
    const room = {
      id: roomId,
      users: [
        user,
      ],
      messages: []
    };
    this.rooms.push(room)
    console.log({ room });
    return room;
  }
  joinRoom(roomId, user) {
    if (this.rooms.filter(r => r.id == roomId).length === 0) {
      return;
    }
    this.rooms[this.rooms.findIndex(r => r.id == roomId)].users.push(user);
    console.log({ rooms: this.rooms });
  }
  addUser(username, socket) {
    let user = { id: socket.id, username };
    this.users.push(user);
    return user;
  }
  getUser(id) {
    return this.users.filter(u => u.id == id)[0];
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
  listen() {
    let that = this;
    this.io.on('connection', function connection(socket) {
      socket.on('create-room', ({ username, roomId }) => {
        const room = that.createRoom(roomId, that.addUser(username, socket));
        socket.join(roomId);
        console.log(`ROOM: ${room.id} created by ${room.users[0].username}`);
      });

      socket.on('join-room', ({ username, roomId }) => {
        let user = that.addUser(username, socket);
        that.joinRoom(roomId, user);
        socket.join(roomId);
        that.sendAll(roomId, socket, `${username} joined`, true);
        console.log(`ROOM: ${user.username} joined to room ${roomId}`);
      });


      socket.on('message', function message({ roomId, user, message }) {
        if (message == '!q') {
          that.sendAll(roomId, socket, `${user} quit`,true);
          return socket.disconnect();
        }
        that.sendAll(roomId, socket, message);
      });

      socket.on('room-info', (roomId) => {
        let room = that.rooms.find(r => r.id == roomId);
        socket.emit('room-info', room);
      });

      socket.on('disconnect', (...e) => {
        console.log({ ...e });
      });
    });
  }

  sendAll(roomId, socket, message, isSystemMessage = false) {
    const m = this.addMessages(roomId, socket ? this.getUser(socket.id).username : null, message, isSystemMessage)
    socket.broadcast.to(roomId).emit('message', JSON.stringify(m))
  }
}

module.exports = Socket;