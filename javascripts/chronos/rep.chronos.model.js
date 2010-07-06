/*
 * Model class for Chronos Timeline
 * 
 */

//= require <jquery>
//= require "rep.widgets/global"
//= require "rep.widgets/model"
//= require "rep.chronos.global"

/** @namespace */
repertoire.chronos.model = function(options) {

    var self = repertoire.model(options);

    // default: no options specified
    options = options || {};


    // PRIVATE

    /* 
     * dateTime functionality and constants...should these be in a separate class?
     * 
     * Here's the idea for this though...the instantiated model class always knows the current event, 
     * as well as the current year and month.  The month is responsible for resetting the month in seconds
     * value based on the current year...also, should we make sure we have the right year in seconds value
     * as the year may be a leap year (yes)?
     * 
     */
    var dateTimeConstants = {
	second:  1,
	minute:  0,
	hour:    0,
	day:     0,
	month:   0,
	year:    0,
	decade:  0,
	century: 0
    };

    // Set these from options?
    var currentYear  = Date.today().getFullYear();
    var currentMonth = Date.today().getMonth();


    // Little hack to see if we are parsing Google spreadsheets.  Hateful.
    var gs_flag = false;


    /**
     * @function
     * @param {Number|String} [thisMonth]
     * @returns {Number} Seconds in a month, or false on failure.
     * @private
     * 
     */
    var getSecondsInMonth = function (thisMonth) {
	if (thisMonth == null) {
	    thisMonth = currentMonth;
	}

	if (thisMonth != null) {
	    if (thisMonth.isNaN) {
		thisMonth = getMonthNumberFromName(thisMonth);
	    }
	    return dateTimeConstants.day * Date.getDaysInMonth(currentYear, thisMonth);
	} else {
	    return false;
	}
    };


    /**
     * @function
     * @param {Number} [startYear]
     * @param {Number} [monthCount]
     * @param {Number} [startMonth]
     * @returns {Number} Seconds in a year.
     * @private
     * 
     */
    var getSecondsInYear = function (startYear, monthCount, startMonth) {
	if (startYear == null) {
	    startYear = currentYear;
	}

	if (monthCount == null) {
	    monthCount = 11;
	}

	if (startMonth == null) {
	    startMonth = 0;
	}

	var totalYearSeconds = 0;

	// DOESN'T ACCOUNT FOR START MONTH 'CAUSE I REALIZED I WOULD HAVE TO INCREMENT THE YEAR IF I HIT 11 for (startMonth + i) and...etc.
	//for (var i = 0; i <= monthCount; i++) {
	for (var i = 0; i <= 11; i++) {
	    totalYearSeconds += (dateTimeConstants.day * Date.getDaysInMonth(startYear, i));
	}

	return totalYearSeconds;
    };


    /**
     * @function
     * @param {Number} [startYear]
     * @returns {number} Seconds in a decade.
     * @private
     * 
     */
    var getSecondsInDecade = function (startYear) {

	// Should we try to pull this back to the '0' year at start of decade?
	if (startYear == null) {
	    startYear = currentYear;
	}

	var totalDecadeSeconds = 0;

	for (var i = 0; i < 10; i++) {
	    totalDecadeSeconds += getSecondsInYear(startYear + i);
	}

	return totalDecadeSeconds;
    };


    /**
     * @function
     * @ignore
     * @private
     * 
     */
    var getSecondsInCentury = function () {
    };


    /**
     * @function
     * @ignore
     * @private
     * 
     */
    var getSecondsInMillenium = function () {
    };


    /**
     * @function
     * @param {String} dateString
     * @description  Helper function which checks if a date format string has been passed into options.
     * @returns {Date} Date object resulting from parsing String.
     * @private
     * 
     */
    var parseMethod = function (dateString) {
	if (options.dateFormat) {
	    return Date.parseExact(dateString, options.dateFormat);
	} else {
	    return Date.parse(dateString);
	}
    };


    /**
     * @function
     * @param {Object} deepObject
     * @param {String} propertyString
     * @description
     *   This function is for processing JSON.  Within the function 
     *   is a terrible hack to deal with Google's bizarre spreadsheet format, 
     *   which apparently turns spreadsheet rows into strings instead of JS
     *   arrays WHICH MAKES NO $#*%ing SENSE.  Not that I'm bitter.
     * @private
     * 
     */
    var nextLevel = function (deepObject, propertyString) {
	var splitString = propertyString.match(/^([A-Za-z\$0-9-]*)\.(.*)$/);  // What exactly is the full set of acceptable characters within JSON naming conventions/protocol?  Same as JS...

	// I really hate this.  This is the part I really hate.
	if (splitString == null) {
	    if (gs_flag && propertyString != 'entry' && propertyString != '$t') {
		// When did this start needing to be here?!?
                if (typeof(deepObject) == 'object') {
		    return deepObject;
		}
		var splitGSData = deepObject.split(',');
		var splitGSDataFinal = {};
		for (var i = 0; i < splitGSData.length; i++) {
		    var splitGSDataField = splitGSData[i].match(/^([^:]*):(.*)$/);
		    if (splitGSDataField != null && splitGSDataField[1].match(propertyString)) {
			return splitGSDataField[2];
		    }
		}
	    } else {
		return deepObject[propertyString];
	    }
	} else {
	    return nextLevel(deepObject[splitString[1]], splitString[2]);
	}

	return false;  // should never get here.
    };


    /**
     * @function
     * @param {Object} data JSON data.
     * @description
     *   Callback function called by update in loading JSON.  Builds data structure for object.
     * @private
     *
     */
    var chronos_callback = function (data_feed, data) {
	//alert('test!?' + data_feed.feed_name);

	/*
	if (data_feed.feed_name == 'flickr_jbp_hdigital') {
	    alert(data_feed.id_name);
	}

	if (data_feed.feed_name == 'flickr_jbp_hdigital') {
	    alert('where are we failing?');
	}
	*/
	var real_data = nextLevel(data, data_feed.data_start);

	for (name in data_feed) {
	    //alert(name + " = " + data_feed[name]);
	}
	var random_start = Math.floor(Math.random() * 500) + 1000;
	var id_function = function (i, this_event) {
	    //if (data_feed.feed_name == 'flickr_jbp_hdigital') { alert('hello!?'); }

	    if (data_feed.id_name == 'calculate') {
		//alert(i + random_start);
		return i + random_start;
	    } else {
		return nextLevel(this_event, data_feed.id_name);
	    }
	};

	$.each(real_data, function (i, event) {
		self.data.push({
			    id:        id_function(i, event),
			    title:     nextLevel(event, data_feed.title_name),
			    start:     parseMethod(nextLevel(event, data_feed.date_name)),
			    end:       parseMethod(nextLevel(event, data_feed.end_name)),
			    tags:      nextLevel(event, data_feed.tag_name),
			    desc:      nextLevel(event, data_feed.desc_name),
			    img:       nextLevel(event, data_feed.img_name),
			    people:    nextLevel(event, data_feed.people_name),
			    feed_name: data_feed.feed_name
			    });
	    });

	/* This section for stripping out dupes *by ID* */
	var dupe_catcher = {};
	var new_data     = [];

	for (var k = 0; k < self.data.length; k++) {
	    if (isNaN(dupe_catcher[self.data[k].id])) {
		dupe_catcher[self.data[k].id] = 1;
		new_data.push(self.data[k]);
	    }
	}

	// Now reset with dupes pulled out:
	self.data = new_data;
	/* end strip out dupes *by ID* */


	// Make this generic!  This is just a hack 'cause twitter data seems to be on Cali time?
	for (var k = 0; k < self.data.length; k++) {
	    if (self.data[k].feed_name == 'twitter1') self.data[k].start.add({ hours: -2.0 });  // WHAT IS UP WITH THE TIMES HERE!?  I've had it at 1.30, then that was off...!??! 
	}


	/*
	 *  Sort items by date, earliest first.
	 *   This happens here, redundantly, rather than in initialize, as this callback seems to get called after initialization.
	 */
	self.data.sort(
		       function(a, b) {
			   if (a.start.isBefore(b.start)) {
			       return -1;
			   } else {
			       return 1;
			   }
		       }
	);
    };



    // PUBLIC

    self.data = [];


    /**
     * @function
     * @description
     *   Responsible for loading JSON.
     */
    self.update = function() {
	if (options.data_feeds != null) {

	    var callbacks = [];

	    for (var b = 0; b < options.data_feeds.length; b++) {

		var data_url = '';

		if (options.data_feeds[b].use_php_filter != null) {
		    data_url = options.data_feeds[b].params.url;
		} else {
		    data_url = options.data_feeds[b].data_url;
		}

		if (data_url.search('^http://spreadsheets.google.com') != -1) {
		    gs_flag = true;
		}

		//alert("b = " + b + ", " + options.data_feeds[b].feed_name);

		var this_data_feed = options.data_feeds[b];

		callbacks[b] = function (callback_data) {
		    chronos_callback(this_data_feed, callback_data);
		}

		/*
		if (options.data_feeds[b].feed_name == 'flickr_jbp_hdigital') {
		    callbacks[b] = function (callback_data) {
			for (var k = 0; k < callback_data.items.length; k++) {
			    $('#json_errors').append(callback_data.items[k].date_taken + "<br />");
			    $('#json_errors').append(callback_data.items[k].description + "<br />");
			    //for (name in callback_data.items[k]) {
			    //    $('#json_errors').append(name + "<br />");
			    //}
			    //$('#json_errors').append('<br />');
			    
			}
		    }
		}
		*/

                var async     =  false;
		var data_type = 'json';

		if (options.data_feeds[b].jsonp != null && options.data_feeds[b].jsonp != false) {
		    // async     =  true;
		    data_type = 'jsonp';
		}

		self.fetch(options['params'], data_url, data_type, callbacks[b], $('#json_errors'), async, options.data_feeds[b].jsonp);
	    }
	} else {
	    var data_url = '';

	    if (options.use_php_filter != null) {
		data_url = options.url;
	    } else {
		data_url = options.params.url;
	    }

	    if (data_url.search('^http://spreadsheets.google.com') != -1) {
		gs_flag = true;
	    }
	    var callback = function (data) {
		chronos_callback(options, data);
	    };

	    var data_type = 'json';
	    if (options.jsonp != null && options.jsonp != false) {
		data_type = 'jsonp';
	    }

	    self.fetch(options['params'], data_url, data_type, callback, $('#debug'), false, options.jsonp);
	}

    };


    /**
     * @function
     * @description
     *   Initializes DateTime constant values and calls update() to load JSON.
     */
    self.initialize = function() {
	dateTimeConstants.minute      = 60 * dateTimeConstants.second;
	dateTimeConstants.hour        = 60 * dateTimeConstants.minute;
	dateTimeConstants.day         = 24 * dateTimeConstants.hour;
	dateTimeConstants.week        =  7 * dateTimeConstants.day;
	dateTimeConstants.month       =      getSecondsInMonth;
	dateTimeConstants.quarteryear =      getSecondsInYear;      // FIX!
	dateTimeConstants.halfyear    =      getSecondsInYear;      // FIX!
	dateTimeConstants.year        =      getSecondsInYear;
	dateTimeConstants.decade      =      getSecondsInDecade;
	dateTimeConstants.century     =      getSecondsInCentury;
	dateTimeConstants.millenium   =      getSecondsInMillenium;

	/* Option processing */

	// Defaults; can be overridden to handle other naming schemes

	var option_list = {
	    data_start:  'events',
	    id_name:     'id',
	    title_name:  'title',
	    date_name:   'start',
	    end_name:    'end',
	    tag_name:    'tags',
	    desc_name:   'desc',
	    people_name: 'people',
	    img_name:    'img'
	};

	if (options.data_feeds != null) {
	    // Need to validate, but this is just testing for now...
	    for (var b = 0; b < options.data_feeds.length; b++) {
		for (name in option_list) {
		    if (options.data_feeds[b][name] == null) {
			options.data_feeds[b][name] = option_list[name];
		    }
		}
	    }
	} else {
	    for (name in option_list) {
		if (options[name] == null) {
		    options[name] = option_list[name];
		}
	    }
	}

	/* end option processing */

	if (options['date_add']) {
	    alert("options['date_add'] = " + options['date_add']);
	}

	if (!options.jsonp) {
	    options['jsonp'] = false;
	}

	// This loads the data up.
	self.update();

	// Clean ids...sometimes have spaces?
	for (var i = 0; i < self.data.length; i++) {
	    if (typeof(self.data[i].id) == 'string' && self.data[i].id.match(/^\s/)) {
		self.data[i].id = self.data[i].id.replace(/^\s*/, '');
	    }
	}

	//setTimeout(10000);
	//alert(self.data.length);
	//alert(self.data.length);

	//alert("If I don't have this alert, the pics don't show up.  Why?  The difference with this is it's JSONP using jsonp callback...?");
    };


    /**
     * @function
     * @param {String} dateString
     * @description
     *   Simple wrapper function for Date.parse(), purpose is only to ensure other 
     *   classes ask for Date operations through this class exclusively.
     * 
     */
    self.getDateObject = function (dateString) {
	return Date.parse(dateString);
    };


    /**
     * @function
     * @param  {String}  intervalName  Name of interval in English ('second', 'hour', etc.)
     * @param  {Date}    startDate     Start date
     * @param  {Number}  value         Value of interval you want to add
     * @return {Date}    resultDate    Date with interval added, or false on failure          
     * 
     */
    self.addToDate = function (intervalName, startDate, value) {
	var date = startDate.clone();  // Looks like we were re-setting the startDate...bad...

	if (intervalName == 'second' ||
	    intervalName == 'minute' ||
	    intervalName == 'hour'   ||
	    intervalName == 'day'    ||
	    intervalName == 'week'   ||
	    intervalName == 'month'  ||
	    intervalName == 'year') {

	    var addMethod = 'add' + intervalName.slice(0, 1).toUpperCase() + intervalName.replace(/^\w{1}/, '') + 's';
	    return date[addMethod](value);
	} else if (intervalName == 'decade') {
	    return date.addYears(10 * value);
	} else if (intervalName == 'century') {
	    return date.addYears(100 * value);
	} else if (intervalName == 'millenia') {
	    return date.addYears(1000 * value);
	} else {
	    // Implement for half/quarter-year, anything else?
	    return false;
	}
    };


    /**
     * @function
     * @param   {Date}    startDate
     * @param   {String}  intervalName
     * @returns {Number}  dateIndex
     * 
     */
    self.getDateIndex = function (startDate, intervalName) {
	// Should be able to add to this?  Is this a dumb way to do this?
	var intervals = {
	    second:   startDate.getSeconds(),
	    minute:   startDate.getMinutes(),
	    hour:     startDate.getHours(),
	    day:      startDate.getDate() - 1,
	    month:    startDate.getMonth(),
	    year:     startDate.getFullYear() % 10,
	    decade:   startDate.getFullYear() % 100
	};
	return intervals[intervalName];
    };


    /**
     * @function
     * @param   {Date}    startDate
     * @param   {String}  intervalName
     * @returns {Number}  dateIndex
     * 
     */
    // Why is this different from getDateIndex()?
    self.getSubDate = function (startDate, intervalName) {
	// Should be able to add to this?  Is this a dumb way to do this?
	var intervals = {
	    second:   startDate.getSeconds(),
	    minute:   startDate.getMinutes(),
	    hour:     startDate.getHours(),
	    day:      startDate.getDate(),
	    month:    startDate.toString('MMM'),
	    year:     startDate.getFullYear(),
	    decade:   startDate.getFullYear() - (startDate.getFullYear() % 10)
	};

	return intervals[intervalName];
    };


    /**
     * @function
     * @param {Date}   startDate
     * @param {String} subIntervalName
     * @description
     *   Returns the amount of sub-intervals (specified by subIntervalName) in the parent interval.  For example, 12 months in a year, or days in a month.
     * @returns {Number} subIntervalCount
     * 
     */
    self.getIntervalCount = function (startDate, subIntervalName) {
	// Always assume relationship to immediately larger datetime interval.
	var intervalCounts = {
	    second:   60,
	    minute:   60,
	    hour:     24,
	    day:      Date.getDaysInMonth(startDate.getFullYear(), startDate.getMonth()),
	    month:    12,
	    year:     10,
	    decade:   10
	};

	return intervalCounts[subIntervalName];
    };


    /**
     * @function
     * @param {Date}   date
     * @param {String} intervalName
     * @description
     *   Returns the seconds in a particular interval.  
     *   For example, for seconds, the value would be 60.
     *   Generally this is straightforward until we hit months.
     * @returns {Number} seconds
     * 
     */
    self.getSecondsInInterval = function (date, intervalName) {
	// If our interval is smaller than a week, then we have an exact value:
	if (intervalName == 'minute' ||
	    intervalName == 'hour'   ||
	    intervalName == 'day'    ||
	    intervalName == 'week') {
	    return dateTimeConstants[intervalName];
	} else if (intervalName == 'month') {
	    var secondsTotal = 0;
	    for (var k = 0; k < 4; k++) {
		secondsTotal += getSecondsInYear(date.getFullYear() + k);
	    }
	    return (getSecondsInYear(date.getFullYear()) / 12);
        // Otherwise, we need to pass our startDate in as well to get the particular seconds value for this date: 
	} else {
	    // alert('our date index (if month, should numeric, like 0 for January for example)' + self.getDateIndex(date, intervalName));
	    return dateTimeConstants[intervalName](self.getDateIndex(date, intervalName));
	}
    };


    /**
     * @function
     * @description
     *   Simple wrapper for JS Array length attribute.
     * @returns {Number} length
     * 
     */
    self.length = function () {
	return self.data.length;
    };


    /**
     * @function
     * @param {Date} beginDate
     * @param {Date} endDate
     * @description
     *   Returns a set of (DateTime) event items which are between the two dates.
     * @returns {Array} eventItems
     * 
     */
    self.getItemsInRange = function (beginDate, endDate) {

	var beginIndex = -1;
	var endIndex   = -1;

	for (i = 0; i < self.data.length; i++) {
	    if (self.data[i].start > beginDate && beginIndex === -1) {
		beginIndex = i;
	    }

	    if (self.data[i].start > endDate && endIndex === -1) {
		endIndex = i;
	    }
	}

	return self.data.slice(beginIndex, endIndex);
    };


    /**
     * @function
     * @param {Date} startDate
     * @description
     *   Returns the numeric index (arbitrary value based on
     *   whatever was passed in via JSON) for the first event
     *   found greater than the date passed in, or -1 on failure.
     * @return {Number} index
     * 
     */
    self.getIndexAtDate = function (startDate) {
	for (i = 0; i < self.data.length; i++) {
	    if (self.data[i].start > startDate) {
		return i;
	    }
	}
	return -1;
    };


    /**
     * @function
     * @param {Date}   startDate
     * @param {String} subIntervalName
     * @description
     *   Returns a date string which has been stripped of all values
     *  (that is, had them set to zero) for any intervals "beneath"
     *  (for example, for hours, that means minutes and seconds) the
     *  interval passed in.
     * @returns {String}
     * 
     */
    self.getStrippedDate = function (startDate, subIntervalName) {
	var format = {
	    second:   startDate.toString("yyyy-MM-dd HH:mm:00"),
	    minute:   startDate.toString("yyyy-MM-dd HH:00:00"),
	    hour:     startDate.toString("yyyy-MM-dd 00:00:00"),
	    day:      startDate.toString("yyyy-MM-01 00:00:00"),
	    month:    startDate.toString("yyyy-01-01 00:00:00"),
	    year:     (startDate.getFullYear() - startDate.getFullYear() % 10) + "-01-01 00:00:00",
	    decade:   (startDate.getFullYear() - startDate.getFullYear() % 100) + "-01-01 00:00:00"
	};
	return format[subIntervalName];
    };


    /**
     * @function
     * @param {Date}   startDate
     * @param {String} subIntervalName
     * @description
     *   Returns value of "stripped" interval in seconds.  That is,
     *   if the sub-interval passed in is 'hour', then the total 
     *   seconds value of all the intervals beneath that are subtracted
     *   from the initial Date passed in and returned.
     * @returns {Number} seconds
     * 
     */
    self.getSubIntervalDiff = function (startDate, subIntervalName) {
	return (Date.parse(self.getStrippedDate(startDate, subIntervalName)) - startDate) / 1000;
    };


    /**
     * @function
     * @param {Date}  startDate
     * @param {Date}  eventDate
     * @description
     *   Returns value of difference between two dates in seconds.
     * @returns {Number} seconds
     */
    self.getIntervalInSeconds = function (startDate, eventDate) {
	// var eventDistance = new TimePeriod(Date.parse(startDate.toString()), Date.parse(eventDate.toString()));
	if (startDate == null || eventDate == null) {
	    return false;
	}

	var eventDistance = new TimeSpan(eventDate - startDate);
	return eventDistance.getTotalMilliseconds() / 1000;
    };


    /**
     * @function
     * @param {Number} id
     * @description
     *   Returns the Date object with the given id
     * @returns {Date}
     */
    self.getEventWithID = function (id) {

	// Real basic.
	for (var i = 0, j = self.data.length; i < j; i++) {
	    if (self.data[i].id == id)
		return self.data[i];
	}

	return false;
    };


    /**
     * @function
     * @param {Date}   startDate
     * @param {String} subIntervalName
     * @description
     *   Returns a set of events within a specific interval (all the events in a month, for example). 
     * @returns {Array}
     */
    self.getEventsInInterval = function (startDate, subIntervalName) {

	var eventsSelection = [];  // sub-set of events to return

	// These two lines are just a bit of wrangling to create the object literal options dynamically...
	var add_vals = {};
	add_vals[subIntervalName + 's'] = 0;
	add_vals[subIntervalName + 's'] = new Number(add_vals[subIntervalName + 's'] + 1);

	// And we want to subtract one of the next smaller interval to eliminate bug below...
	// not sure about this algorithm though, seems fragile...
	var next_smaller = {
	    century: 'decade',
	    decade:  'year',
	    year:    'month',
	    month:   'day',
	    day:     'hour',
	    hour:    'minute',
	    minute:  'second',
	    second:  'millisecond'
	}

        add_vals[next_smaller[subIntervalName] + 's'] = -1;

	// The end point:
	var plusOneDate = startDate.clone().add(add_vals);

	for (var i = 0, j = self.data.length; i < j; i++) {

	    /* 
	     * If we don't do the adjustment above ("next_smaller" subtraction from 
	     * end point), we get a bug: for example, for January 1984, I get the 
	     * events in Feb. 1984 if they fall on the 1st.
	     */

	    // Condition: 'start' of event is between start and end point of range:
            // (example usage, any events which are not duration events which occur in range,
            //  as well as duration event which start in tile)
	    if (self.data[i].start.between(startDate, plusOneDate)) {
		eventsSelection.push(self.data[i]);

            // If we have an end point and the above test failed, we need to see if the duration
            // fits certain criteria:
	    } else if (self.data[i].end != undefined) {  // If not undefined or null

                // Condition: 'end' of event is between start and end point of range:
                // (example usage, duration starting outside of tile but ending in tile)
		if (self.data[i].end.between(startDate, plusOneDate)) {
		    eventsSelection.push(self.data[i]);

                // Condition: 'start' of event is *before* range, but 'end' of event is *after* range:
                // (example usage, duration starting outside--before--tile and ending outside--after--tile)
		} else if (self.data[i].start.isBefore(startDate) && self.data[i].end.isAfter(plusOneDate)) {
		    eventsSelection.push(self.data[i]);
		}
	    }
	}

	return eventsSelection;
    };


    /**
     * @function
     * @description
     *   If tags exist in the feed, returns a list of unique tags.
     * @returns {Array}
     */
    self.getTags = function () {
	var tags = {};
	for (var i = 0; i < self.data.length; i++) {
	    if (self.data[i].tags != null) {
		for (k = 0; k < self.data[i].tags.length; k++) {
		    if (tags[self.data[i].tags[k]] == null) {
			tags[self.data[i].tags[k]] = 1;
		    } else {
			tags[self.data[i].tags[k]]++;
		    }
		}
	    }
	}

	return tags;
    };

    // end of model factory function
    return self;
};
