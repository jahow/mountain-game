
// holds all players data
var game_module = function() {


	// CONSTANTS

	this.DIST_PER_NODE = 100;	// meters between two nodes
	this.ADVANCE_PER_CLICK = 2;	// how much meters per step (base)
	this.BASE_WATER_CONSUMPTION = 0.002;		// how much water per step
	this.MAX_UPGRADES = 4;
	this.DISPLAY_RANGE = 10;	// number of terrain nodes displayed


	// TERRAIN

	// node_index must be an integer
	this.computeNodeHeight = function(node_index) {
		if(node_index <= 0) { return 0; }
		return node_index * 10 + node_index * 5 * Math.cos(node_index * 2);
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

	this.players_array = [];

	// temp
	this.players_array.push({
		x_pos: 35,
		alt: 0,
		// slope: 1,
		momentum: 4,
		id: 88,
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
		id: 2,
		name: 'nico',
		portrait: 'portrait2.jpg',
		color: 'rgb(150, 112, 245)',
		water: 0.3,
		upgrades: [],
		steps_count: 0
	});
	this.players_array.push({
		x_pos: 72,
		alt: 0,
		// slope: 1,
		momentum: 0,
		id: 4,
		name: 'bob',
		portrait: '',
		color: 'rgb(150, 112, 245)',
		water: 0.1,
		upgrades: [],
		steps_count: 0
	});

	// return the data object for a specific player
	this.getPlayerData = function(id) {
		for(var i=0; i<this.players_array.length; i++) {
			if(this.players_array[i].id == id) { return this.players_array[i]; }
		}
		return null;	// error!
	}

	// return restrained data (no upgrades...) for surrounding players
	this.getSurroundingPlayersData = function(x_pos, skip_id) {
		var result = [];
		var range = 2000;
		var data;
		for(var i=0; i<this.players_array.length; i++) {
			// skip active player
			if(this.players_array[i].id == skip_id) { continue; }

			data = this.players_array[i];

			// skip if too far away
			if(Math.abs(data.x_pos - x_pos) > range) { continue; }

			// add info to result
			result.push({
				id: data.id,
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
};


module.exports = new game_module();