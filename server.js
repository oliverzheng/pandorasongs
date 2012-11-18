var path = require('path');
var express = require('express');
var pandora = require('./pandora');


var app = express();

app.configure(function() {
	app.use(express.bodyParser());
	app.use(express.static(path.join(__dirname, 'public')));
});

app.get('/station/:stationId', function(req, res) {
	var stationId = req.params.stationId;
	pandora.getSongs(stationId, function(error, songs) {
		if (error)
			res.json({ success: false });
		else
			res.json({ success: true, songs: songs });
	});
});

app.get('/username/:username', function(req, res) {
	var username = req.params.username;
	pandora.getStations(username, function(error, stations) {
		if (error)
			res.json({ success: false });
		else
			res.json({ success: true, stations: stations });
	});
});


var port = process.env.PORT || 8000;
app.listen(port, function() {
	console.log('Listening on port ' + port);
});
