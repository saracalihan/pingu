const express = require('express');
const http = require('http');
const Socket = require('./socket.js');
const bodyParser = require('body-parser');
var cors = require('cors');
var ejs = require('ejs');


const app = express();
app.engine('html', ejs.renderFile);
app.set('views',__dirname.replace('src', '')+'public');
app.use(cors());
app.use(express.static(__dirname.replace('src', '')+'public'))
app.use(bodyParser.json())

const server = http.createServer(app);

const port = 3000;

const io = new Socket(server);
io.listen();



// Routes

app.get('', (req, res) => {
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.sendFile(__dirname.replace('src', '') + 'public/login.html');
});

app.post('/login', (req, res) => {
  res.cookie('user', req.body.user);
  return res.redirect('http://localhost:3000/home');
});

app.get('/home', (req, res) => {
  res.render('client.html');
});

server.listen(port, () => {
  console.log('Server running at http://127.0.0.1:3000/');
});
