// SETUP

var express = require('express');
var app = express();

var http = require('http').Server(app);
var path = require('path');
var formidable = require('formidable');
var fs = require('fs-extra');

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var connection = require('./database');
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
  //console.log('gamestate requested from a spectator pov');

  // build terrain data around beginning
  // center is node number 2...
  var node = 2;
  var height_data = game_module.computeHeightDataArray(node);

  // gather other players info
  var player_list = game_module.getSurroundingPlayersData(node * game_module.DIST_PER_NODE);

  // send back final object!
  res.json({
    height_data: height_data,
    player_list: player_list
  });
});

// fetch gamestate from a particular player point of view
app.get('/gamestate/:player_id', function(req, res) {
  var player_id = req.params.player_id;
  //console.log('gamestate requested from player id='+player_id);

  // fetch player data
  var player_data = game_module.getPlayerData(player_id, true);
  if(!player_data) {
    res.status(404).send('invalid player id');  
    return;
  }

  // build terrain data around player
  var nearest_node = Math.round(player_data.x_pos / game_module.DIST_PER_NODE);
  var height_data = game_module.computeHeightDataArray(nearest_node);

  // gather upgrade list
  //var upgrades = player_data.upgrades;

  // gather other players info
  var player_list = game_module.getSurroundingPlayersData(player_data.x_pos, player_id);

  // send back final object!
  res.json({
    height_data: height_data,
    //upgrades: upgrades,
    player_list: player_list,
    player_data: player_data    // server side player data for confirmation
  });
});

// player actions
app.post('/action', function(req, res) {
  var action_type = req.body.type;
  var player_id = req.body.player_id;
  //console.log('action type "'+action_type+'" made by player id='+player_id);

  switch(action_type) {

    case "walk":
      game_module.makeStep(player_id);
      res.send('success');
    break;

    case "upgrade":
      var index = req.body.upgrade_index;
      game_module.useUpgrade(player_id, index);
      res.send('success');
    break;
  }

});

// new player signing up
app.post('/signup', function(req, res) {
  console.log('new player signing up...');
  //console.dir(req.body);

  var form = new formidable.IncomingForm();
  //var registered_id = -1;
  var portrait_name = '';
  var cancelled = false;
  
  form.parse(req, function(err, fields, files) {
    var name = fields.name;
    var password = fields.password;

    if(!name || !password) {
      res.json( { error: 'missing form fields.' } );
      cancelled = true;
      return;
    }

    // determine the portrait name
    if(files.portrait.size != 0) {
      var ext = files.portrait.name.split('.');
      ext = ext[ext.length-1];
      portrait_name = Math.floor(Math.random()*1000000).toString()+'.'+ext;
    }

    game_module.registerNewPlayer(name, password, portrait_name, function(err, id) {
      if(err) { res.json( { error: err } ); return; }
      res.json( { registered_id: id } );
    });

  });

  form.on('end', function(fields, files) {

    if(cancelled) { return; }

    //console.dir(this.openedFiles);
    if(this.openedFiles[0].size == 0) {
      console.log("no portrait file given.");
      return;
    }

    //file
    var temp_path = this.openedFiles[0].path;
    var new_location = __dirname + '/public/portraits/';

    fs.copy(temp_path, new_location + portrait_name, function(err) {  
      if (err) { console.error(err); return; }
      console.log("portrait file copied to disk!");
    });

  });


});

// player logging in
app.post('/login', function(req, res) {
  console.log('player logging in...');

  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    var name = fields.name;
    var password = fields.password;

    if(!name || !password) {
      res.json( { error: 'missing form fields.' } );
      cancelled = true;
      return;
    }
    
    game_module.tryLogin(name, password, function(err, id) {
      if(err) { res.json( { error: err } ); return; }
      res.json( { registered_id: id } );
    });
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

  game_module.init();
});
