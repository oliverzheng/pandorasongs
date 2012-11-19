var SORT_BY = {
	DATE: 1,
	ARTIST: 2
};

var GROUP_BY = {
	STATION: 1,
	SONG: 2
};

var sortBy = ko.observable(SORT_BY.ARTIST);
function sortSongs(songs) {
	var sort = sortBy();
	songs.sort(function(a, b) {
		if (sort === SORT_BY.ARTIST)
			return a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title);
		else if (sort === SORT_BY.DATE)
			return b.dateLiked - a.dateLiked; // Most recent first
	});
}


function Station(id, name) {
	this.id = id;
	this.name = name;
	this.songs = ko.observableArray();
	this.sortedSongs = ko.computed(function() {
		var songs = this.songs();
		sortSongs(songs);
		return songs;
	}, this);
	this.loaded = ko.observable(false);
}

function Song(id, artist, title, dateLiked) {
	this.id = id;
	this.artist = artist;
	this.title = title;
	this.dateLiked = dateLiked;
}


var server = {
	getStations: function(username, cb) {
		$.getJSON('/username/' + username, function(data) {
			if (!data.success)
				return mixpanel.track('Stations error', { username: username });

			cb(data.stations.map(function(station) {
				return new Station(station.stationId, station.stationName);
			}));
		});
	},

	getSongs: function(stationId, cb) {
		$.getJSON('/station/' + stationId, function(data) {
			if (!data.success)
				return mixpanel.track('Songs error', { stationId: stationId });

			cb(data.songs.map(function(song) {
				return new Song(song.link, song.artist, song.title, parseInt(song.date));
			}));
		});
	}
};


function MainVM() {
	// Page
	this.username = ko.observable('');
	this.loading = ko.observable(false);
	this.expand = ko.observable(false);
	this.opened = ko.observable(false);

	// Songs
	this.stations = ko.observableArray();
	this.groupBy = ko.observable(GROUP_BY.STATION);
	this.loadedStations = ko.computed(function() {
		return this.stations().filter(function(station) {
			return station.loaded();
		});
	}, this);

	this.allSongs = ko.computed(function () {
		var songs = [];
		this.stations().forEach(function(station) {
			station.songs().forEach(function(song) {
				// Remove duplicates
				if (!songs.some(function(s) { return s.id === song.id; }))
					songs.push(song);
			});
		});
		sortSongs(songs);
		return songs;
	}, this);

	this.load = function() {
		if (this.loading() || this.username() === '')
			return;

		var startTime = (new Date()).getTime();
		mixpanel.track('Stations loading');

		this.loading(true);

		if (!this.expand())
			this.expand(true);

		var self = this;
		server.getStations(this.username(), function(stations) {

			mixpanel.track('Stations loaded', { count: stations.length });

			stations.sort(function(a, b) {
				return a.name.localeCompare(b.name);
			});
			self.stations(stations);

			if (stations.length === 0)
				self.loading(false);
			else
				async.series(stations.map(function(station) {
					return function(cb) {
						server.getSongs(station.id, function(songs) {

							mixpanel.track('Songs loaded', { count: songs.length });

							station.songs(songs);
							station.loaded(true);
							cb(null);
						});
					};
				}), function(error) {
					if (error)
						mixpanel.track('Error', error);

					var endTime = (new Date()).getTime();
					mixpanel.track('Load time', { duration: endTime - startTime });

					self.loading(false);
				});
		});
	};

	this.groupByStation = function() {
		if (this.groupBy() !== GROUP_BY.STATION)
			this.groupBy(GROUP_BY.STATION);
	};

	this.groupBySong = function() {
		if (this.groupBy() !== GROUP_BY.SONG)
			this.groupBy(GROUP_BY.SONG);
	};

	this.sortByDate = function() {
		if (sortBy() !== SORT_BY.DATE)
			sortBy(SORT_BY.DATE);
	};

	this.sortByArtist = function() {
		if (sortBy() !== SORT_BY.ARTIST)
			sortBy(SORT_BY.ARTIST);
	};
}

ko.bindingHandlers.spin = {
	opts: {
		lines: 10,
		length: 3,
		width: 2,
		radius: 5,
		corners: 1,
		rotate: 0,
		color: '#FFF',
		speed: 1.3,
		trail: 40,
		shadow: false,
		hwaccel: false,
		top: 'auto',
		left: 'auto'
	},
	update: function(el, valueAccessor) {
		var enable = ko.utils.unwrapObservable(valueAccessor());

		if (enable) {
			var spinner = new Spinner(ko.bindingHandlers.spin.opts).spin(el);
			$(el).data('spinner', spinner);
		} else {
			var spinner = $(el).data('spinner');
			if (spinner) {
				spinner.stop();
				$(el).removeData('spinner');
			}
		}
	},
};

ko.bindingHandlers.expand = {
	update: function(el, valueAccessor)
	{
		var val = valueAccessor();
		var enable = ko.utils.unwrapObservable(val.enable);
		var opened = val.opened;

		// Do not queue animation for the 1st time.
		// And yes, the DOM gives '0px' when the style is set to 0 or 0%.
		if (enable || $(el).css('top') !== '0px') {
			if (enable)
				opened(true);

			$(el).animate({
				top: enable ? '100%' : '0'
			}, 600, function () {
				if (!enable)
					opened(false);
			});
		}
	}
};


$(function() {
	mixpanel.track('Home landing');

	ko.applyBindings(new MainVM());
});
