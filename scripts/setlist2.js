require([
	'$api/models',
	'$api/search#Search',
	'$views/list#List',
	'$views/buttons',
	'$views/image#Image'
], function (models, Search, List, buttons, Image) {
	'use strict';

	var artist, mbid,
        output = $('#output'),
        stub = 'http://ws.audioscrobbler.com/2.0/',
        apiKey = '0ddf18d8b481115f08241ed829e2333e',
        festivalsData,
        input = $('#txtSearchFestival'),
        artistsSearchInput = $('<div class="searchArtists"><input type="text" id="txtSearchArtists" class="input" placeholder="XXX" /></div>');

       var opts = {lines: 11,
	      length: 8, // The length of each line
	      width: 4, // The line thickness
	      radius: 12, // The radius of the inner circle
	      corners: 1, // Corner roundness (0..1)
	      rotate: 0, // The rotation offset
	      direction: 1, // 1: clockwise, -1: counterclockwise
	      color: '#000', // #rgb or #rrggbb
	      speed: 1, // Rounds per second
	      trail: 60, // Afterglow percentage
	      shadow: true, // Whether to render a shadow
	      hwaccel: true, // Whether to use hardware acceleration
	      className: 'spinner', // The CSS class to assign to the spinner
	      zIndex: 2e9, // The z-index (defaults to 2000000000)
	      top: 'auto', // Top position relative to parent in px
	      left: 'auto' // Left position relative to parent in px
    };

    var loader = $('<div class="loader">');
    $('.byline').hide().removeClass("hidden").after(loader);
    var spinner = new Spinner(opts).spin(loader[0]);

     var getFestivals = function () {
        $.ajax(stub + '?method=geo.getevents&location=sweden&api_key=' + apiKey + '&format=json&festivalsonly=1', {
            dataType: 'json',
            success: function (data) {
                festivalsData = data;
                var festivalsName = getFestivalNames(festivalsData.events.event);
                console.log(festivalsData);
                spinner.stop();
                $('.byline').fadeIn();
                loader.remove();
                input.typeahead({
                    name: 'festival',
                    local: festivalsName
                });

                input.on('keydown',  function(e) {
                    if (e.which == 13) {
                        var val = $(this).val(),
                            index = $.inArray(val, festivalsName);
                        if ( index > -1)
                            getArtistData(index);
                        return false;
                    }

                });

                artistsSearchInput.find('input').on('keyup', function(e) {
                    var val = $(this).val().trim().toLowerCase();

                    if (val.length > 0) {
                        output.find('li').hide()
                        output.find("li[data-title*='" + val + "']").show();
                    } else {
                        output.find('li').show();
                    }

                });
                //getArtistData(1);
            }
        });
    };

    function getFestivalNames(festivals) {
        var arr = [];
        for (var i = 0; i < festivals.length; i++) {
            arr.push(festivals[i].title);
        }

        return arr;
    }
    /*$('#searchArtist').submit( function() {
        console.log(running);
        if (running) {
            return false;
        }

        running = true;
        artist = $('#txtArtistSearch').val();
        reloadCache = $('#cbForceReload:checked').length > 0;
        console.log('force relaod', reloadCache);

        output.html('');
        slService.getSetlistFromArtist(artist, function(list) {
            console.log(list);
            for (var i = 0; i < list.length; i++) {
                var out = '<ol>';
                $(list[i]).each( function () {
                    out += '<li>' + this['key'] + '</li>';
                });
                out += '</ol>';

                output.append(out);

            }
            running = false;
        }, reloadCache);

        return false;
    });*/
    function getArtistData(festival) {
        var artistdata;

        output.html('');
        //$.getJSON('http://nadazipp.se/svt/wowhack2/setlist.php?wow=1').done( function(data) {
        console.log(festival);
        artistdata = festivalsData.events.event[festival].artists.artist;
        console.log(festivalsData.events.event);
        var artistsList = '<ul>';
        $(artistdata).each( function(i) {
            artistsList += '<li data-title="' + this.toLowerCase() + '"><a href="#" data-index="' + i +'">' + this + '</a></li>';
        });


        artistsList += '</ul>';
        artistsSearchInput.find('input').val('');
        output.append(artistsSearchInput);
        output.append(artistsList);

        output.on('click', 'a', function (e) {
            var $this = $(this),
                index = $this.data('index'),
                container = $this.parent().find('.artist'),
                l = $('<div class="loader">');

            if (container.length == 0) {
                $('html, body').animate({
                     scrollTop: $this.parent().offset().top
                 }, 300);
                container = $('<div class="artist">');
                $this.after(container);
                container.append(l).hide().slideDown( function()  {
                    var s = new Spinner(opts).spin(l[0]);
                    (new SetlistService()).getSetlistFromArtist(artistdata[index].toLowerCase(), function(list) {
                        console.log(list, artistdata[index]);

                        var songs = [];
			            for (var i = 0; i < list.length; i++) {
			            	songs = $.merge(songs, list[i]);
			            }
			            console.log('songs', songs);
			            var uris = new Array();
			            var songsLoaded = 0;

			            for (var n = 0; n < songs.length; n++) {

			            	var search = Search.search('artist:' + artistdata[index] + ' AND track:' + songs[n]['key']);
                            console.log(search);
			            	search.tracks.snapshot(0, 1).done(function (snapshot) {
			            		console.log('snapshot', snapshot);
			            		snapshot.loadAll('name').done(function (tracks) {
			            			console.log('snapshot.loadAll', tracks);
			            			songsLoaded++;

			            			//getSongByName(songs, )
			            			tracks.forEach(function (track) {
			            				var index = getSongByName(songs, track.name);
			            				if (index > -1) {
			            					songs[index].track = models.Track.fromURI(track.uri);
			            				}
			            				//uris.push(models.Track.fromURI(track.uri));
			            			});



			            			if (songsLoaded == songs.length) {
			            				//container.append('<h3>' + artistdata[index] + '</h3>');
			            				loadPlaylist(artistdata[index], songs, container);
			            				s.stop();
                        				l.remove();
			            			}

			            		});

			            	});
			            }


                    });
                });


            } else {
                if (!container.is(':visible')) {
                    $('html, body').animate({
                         scrollTop: $this.parent().offset().top
                     }, 300);
                }
                container.slideToggle();
                return false;
            }



            return false;
        });
    }

    var getSongByName = function(arr, key) {
    	for (var i = 0; i < arr.length; ++i) {
    		if (arr[i].key.trim().toLowerCase() == key.trim().toLowerCase()) {
    			return i;
    		}
    	}

        var keyArr = key.toLowerCase().split(' ');

        for (var i = 0; i < arr.length; ++i) {
            var trackArr = arr[i].key.toLowerCase().split(' '),
                diff = ArrayDiff(keyArr, trackArr);

            if (diff.length/keyArr.length > .5) {
                return i;
            }
            //console.log('arraDiff',trackArr, keyArr);
        }


    	return -1;
    };

    var ArrayDiff =  function(arr, arr2) {
        var ret = [];
        for(var i in arr) {
            if(arr2.indexOf( arr[i] ) > -1){
                ret.push( arr[i] );
            }
        }
        return ret;
    };

    var loadPlaylist = function (artistName, songs, container) {
		var tmp = models.Playlist.createTemporary('tmp_' + Date.now()).done(function (playlist) {
			playlist.load(['tracks']).done(function (loadedPlaylist) {
				var artist,
                    tracks = [];
				for (var i = 0; i < songs.length; i++) {
					if (songs[i].track) {
                        tracks.push(songs[i].track);
                        console.log('tracks', tracks[i])
						loadedPlaylist.tracks.add(songs[i].track);
						artist = songs[i].track.artists;
					}
				}

                console.log(tracks, songs);

				var image = Image.forArtist(artist[0], { style: 'plain', width:200, height:133, placeholder: 'none' });
				container.prepend(image.node);
                container.find('.sp-image').width('100%');

				var list = List.forPlaylist(loadedPlaylist);
				container[0].appendChild(list.node);
				list.init();

                //debug
                var out = '<ul>';
                $(tracks).each( function(i) {
                    out += '<li>' + this.name + '</li>';
                });
                out += '</ul>';
                //container.append(out);

                var subscribe = buttons.Button.withLabel('Add as playlist');
                subscribe.setAccentuated(true);
                var subscribeButton = $(subscribe.node);
                container.prepend(subscribeButton);

                subscribeButton.on('click', function (e) {
                    e.preventDefault();
                    models.Playlist.create('Setlist: ' + artistName).done(function (realPlaylist) {
                        realPlaylist.load(['tracks']).done(function () {
                            for (var i = 0; i < songs.length; i++) {
                                if (songs[i].track) {
                                    realPlaylist.tracks.add(songs[i].track);
                                }
                            }
                        });
                    });
                    $(this).remove();
                });

                //list.refresh();
				console.log(artistName, songs, list, loadedPlaylist);
			});
		});
	};

    exports.getFestivals = getFestivals;
});