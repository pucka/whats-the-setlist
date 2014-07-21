require([
	'$api/models',
	'$api/search#Search',
	'$views/list#List',
	'$views/buttons',
	'$views/image#Image'
], function (models, Search, List, buttons, Image) {
	'use strict';
	console.log(Image.forArtist);
	var stub = 'http://ws.audioscrobbler.com/2.0/';
	var apiKey = '0ddf18d8b481115f08241ed829e2333e';
	var festivals = undefined;
	var artists = undefined;
	var festivalsHtml = $('#festivalsContent');
	var festivalHtml = $('#festivalContent');

	var getFestivals = function () {
		$.ajax(stub + '?method=geo.getevents&location=sweden&api_key=' + apiKey + '&format=json&festivalsonly=1', {
			dataType: 'json',
			success: function (data) {
				renderFestivals(data);
			}
		});
	};

	var renderFestivals = function(data) {
		if (!data.hasOwnProperty('events') && !data.events.hasOwnProperty('event')) {
			return false;
		}

		showFestivals();

		festivals = data.events.event;

		$(festivals).each(function () {
			$('#festivalsContent').append('<li><a class="festival" href="#" data-festival="' + this.id + '">' + this.title + '</a></li>');
		});

		registerFestivalListEvents();
	};

	var getArtists = function(festivalId) {
		$.map(festivals, function(data) {
			if(data.id == festivalId)
				renderArtists(data);
				return true;
		});

		return false;
	};

	var renderArtists = function (data) {
		if (!data.hasOwnProperty('artists') && !data.events.hasOwnProperty('artist')) {
			return false;
		}

		showFestival();

		var festivalContent = $('#festivalContent');
		festivalContent.html('');

		artists = data.artists.artist;
		$(artists).each(function () {
			festivalContent.append('<li><a class="artist" href="#">' + this + '</a></li>');
		});
		registerArtistEvents();
	};

	var registerFestivalListEvents = function () {
		$('.festival').on('click', function (e) {
			e.preventDefault();
			getArtists($(this).data('festival'));
		});
	};

	var registerArtistEvents = function () {
		$('.artist').on('click', function (e) {
			e.preventDefault();
			var artist = $(this).text();
			(new SetlistService()).getSetlistFromArtist(artist, function(list) {
	            var songs = [];
	            for (var i = 0; i < list.length; i++) {
	            	songs = $.merge(songs, list[i]);
	            }
	            var uris = new Array();
	            var songsLoaded = 0;
	            for (var n = 0; n < songs.length; n++) {

	            	var search = Search.search('artist:"' + artist + '" AND track:"' + songs[n]['key'] + '"');

	            	search.tracks.snapshot(0, 1).done(function (snapshot) {

	            		snapshot.loadAll('name').done(function (tracks) {
	            			songsLoaded++;
	            			tracks.forEach(function (track) {
	            				uris.push(models.Track.fromURI(track.uri));
	            			});

	            			if (songsLoaded == songs.length - 1) {
	            				loadPlaylist(artist, uris);
	            			}

	            		});
	            	});
	            }
	        });
		});
	};

	var loadPlaylist = function (artistName, tracks) {
		var tmp = models.Playlist.createTemporary('tmp_' + Date.now()).done(function (playlist) {
			playlist.load(['tracks']).done(function () {
				for (var i = 0; i < tracks.length; i++) {
					playlist.tracks.add(tracks[i]);
				}

				var list = List.forPlaylist(playlist);
				var artist = $('#artist');
				artist.html('');
				artist.append(list.node);
				list.init();
				showArtist();

				var subscribe = buttons.Button.withLabel('Add as playlist');
				var subscribeButton = $(subscribe.node);
				artist.prepend(subscribeButton);

				var image = Image.forArtist(tracks[0].artists[0], { style: 'plain', width: 666, height: 111, placeholder: 'none', overlay: [artistName] });
				artist.prepend(image.node);

				subscribeButton.on('click', function (e) {
					e.preventDefault();
					models.Playlist.create('Setlist: ' + artistName).done(function (realPlaylist) {
						realPlaylist.load(['tracks']).done(function () {
							for (var i = 0; i < tracks.length; i++) {
								realPlaylist.tracks.add(tracks[i]);
							}
						});
					});
					$(this).remove();
				});
			});
		});
	};

	var showFestivals = function () {
		$('#festivalHtml').hide();
		$('#artist').hide();
		$('#festivalsHtml').show();
	};

	var showFestival = function () {
		$('#festivals').hide();
		$('#artist').hide();
		$('#festival').show();
	};

	var showArtist = function () {
		$('#festivals').hide();
		$('#festival').hide();
		$('#artist').show();
	}

	exports.getFestivals = getFestivals;
});