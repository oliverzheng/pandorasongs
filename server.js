var path = require('path');
var express = require('express');
var pandora = require('./pandora');


var app = express();

app.configure(function() {
	app.use(express.bodyParser());
	app.use(express.static(path.join(__dirname, 'public')));
});

app.get('/station/:stationId/:startIndex', function(req, res) {
	var stationId = req.params.stationId;
	var startIndex = req.params.startIndex;
	pandora.getSongs(stationId, startIndex, function(error, result) {
		if (error)
			res.json({ success: false });
		else
			res.json({ success: true, songs: result.songs, hasMore: result.hasMore });
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
