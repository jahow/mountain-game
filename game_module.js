// NOISE
var noisejs = require('noisejs');
var noise = new noisejs.Noise(Math.random());

// DATABASE
var mongoose = require('./database');
var playerSchema = new mongoose.Schema({
	// id: Number,
	name: String,
	password: String,
	x_pos: {type: Number, default: 0},
	alt: {type: Number, default: 0},
	momentum: {type: Number, default: 0},
	portrait: {type: String, default: ''},
	color: String,
	water: {type: Number, default: 1},
	upgrades: { type : Array },
	steps_count: {type: Number, default: 0}
});
var playerModel = mongoose.model('players', playerSchema);


// holds all players data
var game_module = function() {


	// CONSTANTS

	this.DIST_PER_NODE = 100;	// meters between two nodes
	this.ADVANCE_PER_CLICK = 2;	// how much meters per step (base)
	this.BASE_WATER_CONSUMPTION = 0.002;		// how much water per step
	this.MAX_UPGRADES = 4;
	this.DISPLAY_RANGE = 10;	// number of terrain nodes displayed
	this.MAX_FILE_SIZE = 60000;	// portrait size
	this.FILE_EXT = ['png', 'gif', 'jpg', 'jpeg'];


	// EVENTS

	// fetches all players object from DB
	this.init = function() {

		// TODO: fetch player model

		console.log('game initialized.');
	}

	// saves player objects on DB
	this.save = function() {
		// TODO: save player model
	}



	// TERRAIN

	// node_index must be an integer
	this.computeNodeHeight = function(node_index) {
		if(node_index <= 0) { return 0; }
		//return node_index * 10 + node_index * 5 * Math.cos(node_index * 2);
		return node_index * 10 + 50 * noise.perlin2(node_index*0.72, 100);
	}

	// interpolates between 2 nodes
	// pos_x is expressed in dist coordinates
	this.computeHeight = function(pos_x) {
		var node_low = Math.floor(pos_x/this.DIST_PER_NODE);
		var node_high = Math.ceil(pos_x/this.DIST_PER_NODE);
		var ratio = pos_x/this.DIST_PER_NODE - node_low;	// between 0 and 1
		return (1-ratio) * this.computeNodeHeight(node_low) + ratio * this.computeNodeHeight(node_high);
	}

	// build an array of height data for a range of nodes
	this.computeHeightDataArray = function(node_center) {
		var min_node = node_center - this.DISPLAY_RANGE;
		var max_node = node_center + this.DISPLAY_RANGE;

		var result = [];
		for(var i=min_node; i<max_node; i++) {
			result.push({
				node: i,
				start: this.computeNodeHeight(i),
				end: this.computeNodeHeight(i+1)
			});
		}
		return result;
	}

	// gives a factor between -1 and 1, 0 being a flat terrain
	// the slope factor is actually the rate at which the altitude rise compared to distance
	this.computeSlopeFactor = function(pos_x) {
		var height_diff = this.computeNodeHeight(Math.ceil(pos_x/this.DIST_PER_NODE))
			- this.computeNodeHeight(Math.floor(pos_x/this.DIST_PER_NODE));
		var angle = Math.atan2(height_diff, this.DIST_PER_NODE);
		var slope_factor = Math.cos(angle);
		if(angle < 0) { slope_factor = 1; }
		return slope_factor;
	}


	// PLAYERS

	// this is an array of MongoDB objects!
	this.players_array = [];

	// temp
	this.players_array.push({
		x_pos: 35,
		alt: 0,
		// slope: 1,
		momentum: 4,
		_id: 10,
		name: 'oliv',
		portrait: 'portrait1.jpg',
		color: 'rgb(177, 97, 105)',
		water: 0.7,
		upgrades: [],
		steps_count: 0
	});
	this.players_array.push({
		x_pos: 172,
		alt: 0,
		// slope: 1,
		momentum: 8,
		_id: 20,
		name: 'nico',
		portrait: 'portrait2.jpg',
		color: 'rgb(150, 112, 245)',
		water: 0.3,
		upgrades: [],
		steps_count: 0
	});

	// return the data object for a specific player
	// if new_object is set, the original MongoDB object is not returned
	this.getPlayerData = function(id, new_object) {
		var data = null;
		for(var i=0; i<this.players_array.length; i++) {
			if(this.players_array[i]._id == id) { data = this.players_array[i]; }
		}
		if(!data) { return null; }

		if(!new_object) { return data; }

		return {
			id: data._id,
			x_pos: data.x_pos,
			alt: data.alt,
			momentum: data.momentum,
			name: data.name,
			portrait: data.portrait,
			color: data.color,
			water: data.water,
			upgrades: data.upgrades,
			steps_count: data.steps_count
		};
	}

	// return restrained data (no upgrades & steps count) for surrounding players
	this.getSurroundingPlayersData = function(x_pos, skip_id) {
		var result = [];
		var range = 2000;
		var data;
		for(var i=0; i<this.players_array.length; i++) {
			data = this.players_array[i];

			// skip active player
			if(data._id == skip_id) { continue; }

			// skip if too far away
			if(Math.abs(data.x_pos - x_pos) > range) { continue; }

			// add info to result
			result.push({
				id: data._id,
				x_pos: data.x_pos,
				alt: data.alt,
				momentum: data.momentum,
				name: data.name,
				portrait: data.portrait,
				color: data.color,
				water: data.water
			});
		}

		return result;
	}


	// PLAYER ACTIONS

	// happens when a player clicks on his portrait
	this.makeStep = function(player_id) {
		var player_data = this.getPlayerData(player_id);

		// compute how much to advance
		var advance = this.ADVANCE_PER_CLICK * (player_data.momentum+1);
		var slope = this.computeSlopeFactor(player_data.x_pos);
		player_data.x_pos += advance * slope;

		// update alt & slope
		player_data.alt = this.computeHeight(player_data.x_pos);
		//player_data.slope = slope;

		// add footstep count
		player_data.steps_count++;

		// remove some water
		player_data.water -= this.BASE_WATER_CONSUMPTION;

		// kill player if water too low
		if(player_data.water <= 0) {
			// todo: add grave
			// todo: display 'you're dead' screen
			this.resetPlayerData(player_id);
		}

		// add upgrade?
		if(Math.random() > 0.95) {
			this.addNewUpgrade(player_id);
		}
	}

	// reset player's data, effectively killing him/her
	this.resetPlayerData = function(player_id) {
		var player_data = this.getPlayerData(player_id);
		player_data.x_pos = 0;
		player_data.water = 1;
		player_data.upgrades = [];
	}


	// UPGRADES

	// depending on player state, add new upgrade
	this.addNewUpgrade = function(player_id) {
		var player_data = this.getPlayerData(player_id);		
		if(player_data.upgrades.length >= this.MAX_UPGRADES) { return; }

		var type = Math.floor(Math.random()*3);
		var cost = 0;
		switch(type) {
			// bond en avant
			case 0: cost = 20 + Math.floor(Math.random() * 40); break;
			// élan
			case 1: cost = (20 + Math.floor(Math.random() * 20)) * (player_data.momentum+1); break;
			// micropur
			case 2: cost = 100 + Math.floor(Math.random() * 200); break;
		}
		player_data.upgrades.push({type: type, cost: cost});
	}

	// consume an upgrade at slot X
	this.useUpgrade = function(player_id, upgrade_index) {
		var player_data = this.getPlayerData(player_id);

		var cost = player_data.upgrades[upgrade_index].cost;
		var type = player_data.upgrades[upgrade_index].type;

		if(player_data.steps_count < cost) { return false; }

		// use currency & delete me
		player_data.steps_count -= cost;

		// do what needs to be done
		switch(type) {
			// bond en avant
			case 0:
				player_data.x_pos += 10 + Math.floor(Math.random()*290);
				player_data.alt = this.computeHeight(player_data.x_pos);
				//player_data.slope = this.computeSlopeFactor(player_data.x_pos);
			break;
			// élan
			case 1: player_data.momentum++; break;
			// micropur
			case 2: player_data.water = 1; break;
		}

		// remove from array
		player_data.upgrades.splice(upgrade_index, 1);

		return true;
	}


	// AUTHENTICATION

	// Returns the id of the registered player
	this.registerNewPlayer = function(name, password, portrait, callback) {

		var name_safe = sanitizeName(name);
		var color = getRandomCSSColor();

		var player = new playerModel({
			// id: 1,
			name: name_safe,
			password: password,
			color: color,
			x_pos: 0,
			momentum: 0,
			portrait: portrait,
			water: 1,
			upgrades: [],
			steps_count: 0,
			/*
			x_pos: Number,
			momentum: Number,
			portrait: String,
			color: String,
			water: Number,
			upgrades: String,
			steps_count: Number
			*/
	    });

    	player.save(function(err, player) {
    		if(err) {
    			console.log('mongoose: error when saving new player: '+err);
    			callback(err, null);
    			return;
    		}
    		callback(null, player._id);
    		console.log('new player "'+player.name+'" registered under id='+player._id);

    		/*
			instance.players_array.push({
				x_pos: 0,
				alt: 0,
				momentum: 0,
				id: player._id,
				name: player.name,
				portrait: '',		// waiting for file...
				color: player.color,
				water: 1,
				upgrades: [],
				steps_count: 0
			});
			*/
			instance.players_array.push(player);
    	});

    	/*
		var id = this.getUniqueId();
		var name_safe = sanitizeName(name);
		var color = getRandomCSSColor();

		this.players_array.push({
			x_pos: 0,
			alt: 0,
			momentum: 0,
			id: id,
			name: name_safe,
			portrait: '',		// waiting for file...
			color: color,
			water: 1,
			upgrades: [],
			steps_count: 0
		});

		console.log('new player "'+name_safe+'" registered under id='+id);
		return id;
		*/
	}

	// self expl : handled by the database
	/*
	this.getUniqueId = function() {
		var higher_id = 0;
		for(var i=0; i<this.players_array.length; i++) {
			if(this.players_array[i].id >= higher_id) {
				higher_id = this.players_array[i].id + 1;
			}
		}
		return higher_id
	}
	*/

	this.tryLogin = function(name, password, callback) {
		var id = this.getUniqueId();
		var name_safe = sanitizeName(name);
		var color = getRandomCSSColor();

		this.players_array.push({
			x_pos: 0,
			alt: 0,
			momentum: 0,
			id: id,
			name: name_safe,
			portrait: '',		// waiting for file...
			color: color,
			water: 1,
			upgrades: [],
			steps_count: 0
		});

		console.log('new player "'+name_safe+'" registered under id='+id);
		return id;
	}
};


module.exports = new game_module();
var instance = module.exports;


// utils

function sanitizeName(s) {
	return s.toLowerCase().replace(/[^a-zA-Z0-9\-_éèïüöç!?.]+/g, "");
}

function getRandomCSSColor() {
	var h = Math.random();
	var v = 0.7;
	var s = 0.72;

	// HSV to RGB conversion, as seen here: http://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
    var r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    function toHex(c) { return Math.floor(c*255).toString(16); }

    return "#"+toHex(r)+toHex(g)+toHex(b);
}