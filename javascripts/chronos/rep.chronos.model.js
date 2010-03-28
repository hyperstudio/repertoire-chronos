/*
 * Model class for Chronos Timeline
 * 
 */

//= require <jquery>
//= require "rep.widgets/global"
//= require "rep.widgets/model"
//= require "rep.chronos.global"

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
    var currentYear  = 2010;
    var currentMonth = Date.today().getMonth();


    /*
     *  Kinda dumb wrapper function for Date.parse()...I want to keep all the date stuff in one place though, 
     *   and not have other classes refer to other Date class(es)
     */
    self.getDateObject = function (dateString) {
	return Date.parse(dateString);
    };


    /*
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



    /* 
     * 
     * 
     * 
     * 
     * LOTSA NOISE IN HERE...CLEAN IT UP!
     * 
     * 
     * 
     * 
     */


    /*
     * Hmm.
     * 
     */
    self.getLargerInterval = function (interval1, interval2) {

	var orderedIntervals = {
	    second:   0,
	    minute:   1,
	    hour:     2,
	    day:      3,
	    month:    4,
	    year:     5,
	    decade:   6
	};

	// TEST
	if (orderedIntervals[interval1] == null) {
	    return false;
	}

	if (orderedIntervals[interval1] > orderedIntervals[interval2]) {
	    return interval1;
	} else {
	    return interval2;
	}
    };



    /*
     * 
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


    /*
     * 
     * 
     */
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


    /*
     * 
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


    /*
     * FIX FIX FIX FIX FIX
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

    var getSecondsInCentury = function () {
    };

    var getSecondsInMillenium = function () {
    };


    var parseMethod = function (dateString) {
	if (options.dateFormat) {
	    return Date.parseExact(dateString, options.dateFormat);
	} else {
	    return Date.parse(dateString);
	}
    };


    /*
     * AJAX overridden method
     */
    var callback = function (data) {
	$.each(data.events, function (i, event) {
		   self.data.push({
				      id:    event.id,
				      title: event.title,
				      start: parseMethod(event.start)
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

    self.update = function() {
	// var url = self.default_url(['projects', 'results']);
        self.fetch(options['params'], options['url'], 'json', callback);
    };

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

	self.update();
    };


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

/*
  		if (arguments[2]) {
		    alert((date.getFullYear() + k) + ', ' + getSecondsInYear(date.getFullYear() + k, 'test!'));
		}
*/
	    }

	    //alert("One! " + getSecondsInYear(date.getFullYear()) / 12);
	    //alert("Two! " + secondsTotal / 48);

	    return (getSecondsInYear(date.getFullYear()) / 12);

	    // return (secondsTotal / 48);
        // Otherwise, we need to pass our startDate in as well to get the particular seconds value for this date: 
	} else {
	    // alert('our date index (if month, should numeric, like 0 for January for example)' + self.getDateIndex(date, intervalName));
	    return dateTimeConstants[intervalName](self.getDateIndex(date, intervalName));
	}
    };


    /*
     *  Simple wrapper for JS Array length attribute.
     * 
     */
    self.length = function () {
	return self.data.length;
    };


    /*
     * getItemsInRange()
     *  Expects JS Date objects as arguments.
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


    /*
     * Finds index value for configured start date:
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


    self.getSubIntervalDiff = function (startDate, subIntervalName) {
	return (Date.parse(self.getStrippedDate(startDate, subIntervalName)) - startDate) / 1000;
    };


    /*
     * Needs to be expanded to handle all proportions...?
     * 
     */
    self.getIntervalInSeconds = function (startDate, eventDate) {
	// var eventDistance = new TimePeriod(Date.parse(startDate.toString()), Date.parse(eventDate.toString()));
	if (startDate == null || eventDate == null) {
	    return false;
	}

	var eventDistance = new TimeSpan(startDate - eventDate);
	return eventDistance.getTotalMilliseconds() / 1000;
    };


    self.getEventsInInterval = function (startDate, subIntervalName) {

	var eventsSelection = [];  // sub-set of events to return

	// var strippedStartDate = Date.parse(self.getStrippedDate(startDate, subIntervalName));

	// These two lines are just a bit of wrangling to create the object literal options dynamically...
	var add_vals = {};
	add_vals[subIntervalName + 's'] = 0;

	/*
	if (arguments[2] != null && arguments[2] > 0) {
	    add_vals[subIntervalName + 's'] = new Number(add_vals[subIntervalName + 's'] + arguments[2]);
	    strippedStartDate = strippedStartDate.add(add_vals);
	}
	*/

	add_vals[subIntervalName + 's'] = new Number(add_vals[subIntervalName + 's'] + 1);
	var plusOneDate = startDate.clone().add(add_vals);

	for (var i = 0, j = self.data.length; i < j; i++) {

	    // THIS IS RESULTING IN THE DATE IMMEDIATELY AFTER strippedStartDate TOO
	    // (so, for January 1984, I get the events in Feb. 1984 if they fall on the 1st)
	    // ...what to do?  Reduce plusOneDate by one subInterval?  Hmm.
	    if (self.data[i].start.between(startDate, plusOneDate)) {

		// $("#dataMonitor #dates span.data").append('comparing, date array: ' + self.data[i].id + ': ' + self.data[i].start.toString() + ' startDate: ' + startDate.toString() + ", plusOneDate: " + plusOneDate.toString() + "<br />");

		eventsSelection.push(self.data[i]);
	    }
	}

	return eventsSelection;
    };


    // end of model factory function
    return self;
};
