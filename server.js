// SETUP

var express = require('express');
var app = express();

var http = require('http').Server(app);
var path = require('path');

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var game_module = require('./game_module');

/*
var db_connection = require('./database');
db_connection.connect( function(err){
	if(err) {
		console.error('mysql: error connecting: ' + err.stack);
		return;
	}
	console.log('mysql: connected as id ' + db_connection.threadId);
} );
*/

// ROUTES

//app.get('/', function(req, res) {
    //res.sendFile('index.html');
//});

app.use(express.static(__dirname + '/public'));

// fetch gamestate from a spectator point of view
app.get('/gamestate', function(req, res) {
  console.log('gamestate requested from a spectator pov');
  res.json({

  });
});

// fetch gamestate from a particular player point of view
app.get('/gamestate/:player_id', function(req, res) {
  var player_id = req.params.player_id;
  console.log('gamestate requested from a player pov');

  var player_data = game_module.getPlayerData();

  res.json({


  });
});

app.use(function(req, res, next) {
  res.setHeader('Content-Type', 'text/plain');
  res.status(404).send('Page introuvable !');
});



// SERVER LAUNCH

var server = http.listen(8080, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('listening on %s', port);
});