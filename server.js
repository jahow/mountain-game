// SETUP

var express = require('express');
var app = express();

var http = require('http').Server(app);
var path = require('path');

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

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