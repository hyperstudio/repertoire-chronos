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


    // Defaults; can be overridden to handle other JSON formats
    options['data_start'] = options['data_start'] || 'events';
    options['id_name']    = options['id_name']    || 'id';
    options['title_name'] = options['title_name'] || 'title';
    options['date_name']  = options['date_name']  || 'start';


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
    var callback = function (data) {

	var real_data = nextLevel(data, options.data_start);

	$.each(real_data, function (i, event) {
		   self.data.push({
				      id:    nextLevel(event, options.id_name),
				      title: nextLevel(event, options.title_name),
				      start: parseMethod(nextLevel(event, options.date_name))
				  });
	       });

	/*
	 * ORDER ENTIRE SET OF ITEMS ON EACH LOAD:
	 * 
	 * Should this be re-factored to be more efficient?
	 * How frequently is it going to be hit?
	 * Is there a better way to write this, regardless of efficiency?
	 * 
	 */
	self.data.sort(
	    function (a, b) {
		if (a.start.getFullYear() === b.start.getFullYear()) {
		    if (a.start.getMonth() === b.start.getMonth()) {
			if (a.start.getDate() === b.start.getDate()) {
			    return a.start.getHours() > b.start.getHours();
			} else {
			    return a.start.getDate() > b.start.getDate();
			}
		    } else {
			return a.start.getMonth() > b.start.getMonth();
		    }
		} else {
		    return a.start.getFullYear() > b.start.getFullYear();
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
        self.fetch(options['params'], options['url'], 'json', callback, $('#debug'), false);
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

	if (options.params.url.search('^http://spreadsheets.google.com') != -1) {
	    gs_flag = true;
	}

	self.update();

	// Clean ids...sometimes have spaces?
	for (var i = 0; i < self.data.length; i++) {
	    if (typeof(self.data[i].id) == 'string' && self.data[i].id.match(/^\s/)) {
		self.data[i].id = self.data[i].id.replace(/^\s*/, '');
	    }
	}
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
	var plusOneDate = startDate.clone().add(add_vals);

	for (var i = 0, j = self.data.length; i < j; i++) {

	    // THIS IS RESULTING IN THE DATE IMMEDIATELY AFTER strippedStartDate TOO
	    // (so, for January 1984, I get the events in Feb. 1984 if they fall on the 1st)
	    // ...what to do?  Reduce plusOneDate by one subInterval?  Hmm.
	    if (self.data[i].start.between(startDate, plusOneDate)) {
		eventsSelection.push(self.data[i]);
	    }
	}

	return eventsSelection;
    };


    // end of model factory function
    return self;
};
