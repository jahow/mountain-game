const mongoose = require('mongoose');

module.exports = mongoose.connect('mongodb://localhost/mountain-game', {}, function() {
  console.log('connected to db');
});
