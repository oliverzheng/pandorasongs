var request = require('request');
var libxml = require('libxmljs');

// Authentication token to use to get the list of stations. The cookie set by
// Pandora expires at 30 days. Let's see how long this lasts us. This token was
// retrieved on 11/13/12.
//
// And no, a random string won't do. Attempts to reverse engineer how this gets
// generated has yielded nothing. It's one of the Flash objects that makes some
// request or sets the cookie; rendering the page with PhantomJS (and faking
// Flash support) does not get us a token.
//
// Pandora, I'm not trying to steal your music. Just let me look at my stations.
var at = 'wnb300BmFVHfJjjFZo/ISxvXK+OFmuiaA';

function getSomeSongs(stationId, songs, cb) {
	songs = songs || [];

	var stationUrl = 'http://www.pandora.com/content/station_track_thumbs?stationId=' + stationId + '&posFeedbackStartIndex=' + songs.length + '&posSortAsc=false&posSortBy=date';

	request(stationUrl, function(error, response, body) {
		if (error || response.statusCode !== 200)
			return cb({reason: 'pandora'});

		if (!/\S/.test(body)) {
			// Stations without any liked songs return empty responses,
			// which confuses the html parser...
			return cb(null, []);
		}

		var html = libxml.parseHtmlString(body);
		var children = html.get('//body').childNodes();

		var newSongs = children.filter(function(child) {
			return child.name() === 'li';
		}).map(function(li) {
			var a = li.get('div/div/h3/a');
			return {
				artist: li.attr('data-artist').value(),
				date: li.attr('data-date').value(),
				title: a.text(),
				link: a.attr('href').value()
			};
		});
		songs.push.apply(songs, newSongs);

		if (!html.get('//div[@class="no_more"]'))
			return getSomeSongs(stationId, songs, cb);
		else
			cb(null, songs);
	});
};

getSomeStations = function(username, stations, cb) {
	stations = stations || [];

	var stationsUrl = 'http://www.pandora.com/content/stations?startIndex=' + stations.length + '&webname=' + username;

	var jar = request.jar();
	jar.add(request.cookie('at=' + at));

	request({url: stationsUrl, jar: jar}, function(error, response, body) {
		if (error || response.statusCode !== 200)
			return cb({reason: 'pandora'});

		var html = libxml.parseHtmlString(body);
		var children = html.get('//div[@id="stations_container"]').childNodes();

		var newStations = children.filter(function(child) {
			return child.name() !== 'text' && child.attr('class').value() === 'section clearfix';
		}).map(function(div) {
			var a = div.get('div/div/div/h3/span/a');
			var href = a.attr('href').value();
			var match = href.match(/station\/(\d+)/);
			var stationId = match[1];
			return {
				stationId: stationId,
				stationName: a.text()
			};
		});

		stations.push.apply(stations, newStations);

		if (!html.get('//div[@class="no_more"]'))
			return getSomeStations(username, stations, cb);
		else
			cb(null, stations);
	});
};


exports.getSongs = function(stationId, cb) {
	return getSomeSongs(stationId, null, cb);
};

exports.getStations = function(username, cb) {
	return getSomeStations(username, null, cb);
};
