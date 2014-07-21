;var SetlistService = (function() {
	function SetlistService() {
        return this.init();
    }

    SetlistService.prototype.init = function() {
    	this.mbStub = 'http://www.musicbrainz.org/ws/2/artist/?query=';
		this.setlistStub = 'php/setlist.php?mbid='; //setlist.fm does not support jsonp :<
		this.artistCache = [];
    };

    SetlistService.prototype.getSetlistFromArtist = function(artist, callback, forceReload) {
    	var self = this;
    	this.callback = callback;

    	var cached = this._getFromCache(artist);

    	if (cached && !forceReload) {
    		console.log('fetching list from cache', artist, cached);

    		if (self.callback) {
	        	callback(cached, this);
	        }
    	} else {
    		this.getMBID(artist).done( function(data) {
	    		var mbid;

	    		mbid = $(data).find("artist").first().attr('id');

	            console.log('mbid', mbid, $(data).find("artist").first());

	            if (mbid) {
	                self.getSetlist(mbid).done( function (data) {
	                	var list = self._parsePlaylist(data);

	                	self._setCache(artist, list);

	                    if (self.callback) {
	                    	callback(list, this);
	                    }
	                    list = null;
	                }).fail( function() {
			    		callback(null, this);
			    	});
	            } else {
	            	callback(null, this);
	            }
	    	})
    	}


    };

	SetlistService.prototype.getMBID = function(artist) {
	    var url = this.mbStub + 'artist=' + encodeURIComponent(artist);

	    return $.get(url).fail(function(data) {
	        console.log("getMBID fail", data);
	    });
	};

	SetlistService.prototype.getSetlist = function(mbid) {
	    var url = this.setlistStub + mbid;

	    return $.get(url).fail(function(jqXHR, textStatus, errorThrown) {
	        console.log("getSetlist fail", jqXHR, textStatus, errorThrown);
	    });
	}

	SetlistService.prototype._setCache = function(artist, list) {
		if (Modernizr.localstorage) {
        		localStorage.setItem('ss_' + artist, JSON.stringify(list));
        } else {
        	self.artistCache[artist] = list;
        }
	};

	SetlistService.prototype._getFromCache = function(artist) {
		if (Modernizr.localstorage) {
			var retrievedObject = localStorage.getItem('ss_' + artist);
			if (retrievedObject) {
				return JSON.parse(retrievedObject);
			}
		} else if (this.artistCache[artist]){
			return this.artistCache[artist];
		}

		return null;
	};

    SetlistService.prototype._sortObjectBy = function (obj, key) {
    	var arr = [];
	    for (var prop in obj) {
	        if (obj.hasOwnProperty(prop)) {
	            arr.push({
	                'key': prop,
	                'value': obj[prop]
	            });
	        }
	    }
	    arr.sort(function(a, b) {return b.value[key] - a.value[key]; });
	    return arr; // returns array
    };

    //Calculate median of an array witj numbers
    SetlistService.prototype._median = function(values) {
	    values.sort( function(a,b) {return a - b;} );
	    var half = Math.floor(values.length/2);

	    if(values.length % 2)
	        return values[half];
	    else
	        return (values[half-1] + values[half]) / 2.0;
	};

	SetlistService.prototype._parsePlaylist = function(data) {
	    var self = this,
	    	lists = [],
	    	lengths = [];

	    //loop the data
	    $(data.setlists.setlist).each( function() {
	        $(this.sets.set).each( function(index) {

	        	if (lists[index] === undefined) {
	        		lists[index] = {};
	        		lengths[index] = [];
	        	}

	        	//get length of set
	        	lengths[index].push((this.song.length || 1));

	        	//get parsed song data
	        	lists[index] = self._parseSet(this, lists[index]);
	        });

	    });

	    for (var i = 0; i < lists.length; i++) {
	    	//get average length of set
	    	var avgLength = self._median(lengths[i]);
	    	lists[i] = self._sortObjectBy(lists[i], 'count').splice(0, avgLength);

	    	//calculate position in setlist median for songs
		    $(lists[i]).each( function () {
		    	var med = self._median(this.value.pos);
		 		this.value.median = med;
		    });

		    //sort by position
		    lists[i].sort(function(a, b) {
		    	return a.value.median - b.value.median;
		    });

		    //find duplicates
		    for (var j = 0;j < i;j++) {
		    	this._removeDuplicates(lists[i], lists[j]);
		    }
	    }
	    console.log(lists);

		return lists;
	};

	SetlistService.prototype._removeDuplicates = function(arr1, arr2) {
		var i, j,
			removeInArr1 = [],
			removeInArr2 = [];

		for(i = 0; i < arr1.length; i++) {
		    for(j = 0; j < arr2.length; j++) {
		        if(arr1[i].key == arr2[j].key) {
		           if (arr1[i].value.count > arr2[j].value.count) {
		          		removeInArr2.push(j);
		           } else {
		           		removeInArr1.push(i);
		           }
		        }
		    }
		}

		for (i = 0; i < removeInArr1.length; i++) {
			arr1.splice(removeInArr1[i], 1);
		}

		for (i = 0; i < removeInArr2.length; i++) {
			arr2.splice(removeInArr2[i], 1);
		}
	};

	SetlistService.prototype._parseSet = function(set, list) {
		var self = this,
			song;
		$(set.song).each( function(i) {
            song = this['@name'];
            if (song.length == 0) {
                return true;
            }

            if (list[song] !== undefined) {
                list[song].count++;
                list[song].pos.push(i+1);
            } else {
                list[song] = {count: 1, pos: [(i+1)]};
            }
        });

        return list;
	};


    return SetlistService;
})();