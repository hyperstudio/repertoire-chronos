/*
 * Sub-Widget class for Chronos Timeline
 * 
 */

//= require <jquery>
//= require "rep.widgets/global"
//= require "rep.widgets/widget"
//= require "rep.chronos.global"

repertoire.chronos.widget = function (selector, options, dataModel) {

    var self = repertoire.widget(selector, options);

    // default: no options specified
    options = options || {};


    /*
     * 
     * What does this class "own?"
     * 
     * -Tile size.
     * -Event responder definition/initialization
     * -tiling method/function?
     * -positioning information
     * -(datetime) event model(s)?
     * -current top/center/bottom points, including mapping to datetime information?  Should be through reference to event model?
     * 
     * 
     * 
     * 
     * We have two main uses of date/time information.
     * 
     * - figuring out the 'rough' ratio between main interval and sub-interval (year to month, month to day, etc.)
     * - figuring out the 'more exact' ratio between date/time events and the interval they are placed within (sub-interval of tile)
     * 
     * 
     * 
     * 
     */


    // PRIVATE
    var startDate            = dataModel.getDateObject(options.startDate) || null;      // Must be set

    var volumePercentage     = options.volumePercentage    || null;      // Must be set
    var widgetSelector       = options.widgetSelector      || null;      // Must be set

    var eventViewType        = options.eventViewType       || 'icon';
    var tilesVisible         = options.tilesVisible        || 2;
    var ordering             = options.ordering            || null;      // Must be set

    var intervalName         = options.intervalName        || 'decade';  // Name of unit a single tile represents.
    var subIntervalName      = options.subIntervalName     || 'year';    // Name of sub-unit. For example, if the column tiles are years, the sub-unit is a month.

    var tileOffset           = options.tileOffset          || -2;        // Default amount we want to tile up for 'protection.'
    var widgetOffset         = null;                                     // Needs to be initialized after rendering.  More or less represents height of timeline column...but will change if making horizontal?

    var isManager            = options.isManager           || false;     // Determines whether this widget is the 'boss' of the other widgets in the global timeline.
    var managerStP           = 0;                                        // Set after initialization based on whether or not this is a manager.

    // Holds top positioning and tile height for monitoring and re-calculating
    var widgetTop         = null;      // Must be initialized
    var topChange         = null;      // Must be initialized

    // Passed in by 'holder' class
    var timelineSize      = null;
    var timelineDir       = null;

    // Our global seconds-to-pixels ratio used for both dragging ratio with other columns as well as generating new tiles:
    var secondsToPixels   = 0;

    // We initialize bottomDate by decrementing in *reverse* of 
    // how it is incremented in tile function to assure we have
    // the correct value when we start in that function.
    var topDate              = dataModel.addToDate(intervalName, startDate, 1);
    var bottomDate           = startDate;

    // For saving change when this widget or others are dragged:
    var pixelDragChange      = 0;

    // Decimal remainder saved between updates to top value:
    var topSetValueRemainder = 0;

    // This starts at zero.
    var originalTop          = 0;
    var masterTop            = 0;



    // PUBLIC

    self.getDragChange = function () {
	return pixelDragChange;
    };

    self.setDragChange = function (dragChange) {
	pixelDragChange = dragChange;
	return pixelDragChange;
    };


    self.setTop = function (topChange) {
	var checkTop = parseFloat($(widgetSelector).css('top'));

	var adjustedTopChange = topChange + topSetValueRemainder;
	var adjustedTopChangeNoDecimal = parseInt(adjustedTopChange);
	topSetValueRemainder = adjustedTopChange - adjustedTopChangeNoDecimal;

	var topSetValue = (checkTop - adjustedTopChangeNoDecimal);

	//$("#dataMonitor #thisWidgetTopStuff span.data").html(widgetSelector + ': topSetValueRemainder is ' + topSetValueRemainder);

	// A little hack to let this function handle animation too...
	if (arguments[1] == true) {
	    $(widgetSelector).animate({"top": topSetValue + 'px'}, 500);
	} else {
	    $(widgetSelector).css('top', topSetValue + 'px');  // CSS CHANGE HERE
	}
    };

    self.update = function () {
    };


    self.initialize = function (initTimelineSize, initTimelineDir) {

	// Passed in from 'holder' class
	timelineSize = initTimelineSize;
	timelineDir  = initTimelineDir;

	/*
	 * On loading, we need to establish a seconds -> pixel ratio.
	 * 
	 * In order to do this, we start with
	 * 
	 * -start date
	 * -the interval this widget represents in a single tile (year, decade, etc.)
	 * 
	 *  We pass those to the getSecondsInInterval() function of the dataModel.
	 * 
	 */

	// WHAT DO WE DO WITH REMAINDER?
	if (widgetSelector == '#timelineMonths') {
	    secondsToPixels = dataModel.getSecondsInInterval(startDate, intervalName, widgetSelector) / (timelineSize / tilesVisible);
	} else {
	    secondsToPixels = dataModel.getSecondsInInterval(startDate, intervalName) / (timelineSize / tilesVisible);
	}

	// Create initial widget HTML element and add id/classes:
	var mainWidgetElement = $('<div />').appendTo($(selector));
	mainWidgetElement.attr('id', widgetSelector.replace(/^#/, '')).addClass('tWidget');

	// Set width based on configuration value:
	$(widgetSelector).css('width', volumePercentage + "%");

	// if we don't set this to initialize we just get 'auto' and it throws everything off.
	$(widgetSelector).css('top', '0px');


	// Now, generate our first tile.  We use this to center the widget and then build the rest of the tiles.
	var initialTileSize = self.tile('up');


	/*
	 *  This is where we center the column by figuring out:
	 * 
	 *   - the amount of *half* of the timeline size, so we know where the center is.
	 * 
	 *   - the seconde difference between the start date and starting from 'zero' for the main interval for the column
	 *      (for example, if our start date is March 3, 1984, and we are generating the year column, we want to subtract the difference 
	 *       between starting from January 1, 1984 and March 3, 1984, since we generate the *tile* starting at January 1).
	 * 	 
	 *   After we get this second difference value, we divide it by our arleady-calculated secondsToPixels value to figure
	 *     out how far to move.
	 * 
	 *   Finally, we add this pixel adjustment to half the timeline size and set the top for the widget to that.
	 * 
	 */

	widgetOffset = Math.ceil(timelineSize / 2 + (dataModel.getSubIntervalDiff(startDate, subIntervalName) / secondsToPixels));
	$(widgetSelector).css('top', widgetOffset);     // CSS CHANGE HERE

	self.checkTiles();
	self.loadEvents();
    };


    self.getOrdering = function () {
	return ordering;
    };

    self.getSelector = function () {
	return widgetSelector;
    };

    self.isManager = function () {
	return isManager;
    };

    self.getSecondsToPixels = function () {
	return secondsToPixels;
    };

    self.setManagerStP = function (initManagerStP) {
	managerStP = initManagerStP;
    };


    /*
     ********     ********     ********     ********     ********
     * INCOMPLETE: STILL NEED TO ADD LABELING FUNCTIONALITY!
     ********     ********     ********     ********     ********
     * 
     * TILE FUNCTION:
     * 
     * -clones/generates single tile model (HTML/CSS).
     * -calculates heights for sub-interval elements, and 
     *    saves remainder for next tile in previous tile's class
     * -labels cloned/generated single tile appropriately.
     * -appends or prepends depending on direction.
     * 
     * 
     * RETURNS pixel value of height of last generated tile.
     * 
     */
    self.tile = function (tileDir) {

	/*
	 * - get 'seconds value' for that interval (in a year column, year)
	 * 
	 * - get proportion of total timeline size that this column will be (in *visible* 1000 px timeline, 50% means there will be two years *visible* in a year column)
	 *     HERE IS WHERE FUDGING/INEXACTNESS IS: we get start date (jan 1, 2000, say).
	 *     we pass start date to date functions, and get x number of seconds based on the start date and how many years we want (2 years starting from jan 1 2000 in seconds).
	 * 
	 * - 1000 px / x seconds in two years starting from jan 1, 2000
	 * 
	 *  31536000 seconds in a year
	 * 
	 *  if our timeline visible is 1000, then seconds per pixel is 31536
	 *  
	 *  so, if
	 * 
	 *  2592000 seconds in a month, then our month would be month seconds / seconds per pixel = 82.191780821917808  pixels
	 * 
	 * What we do with the remainder value is to keep adding it to itself, then add anything over 1 to the next sub-interval element and continue.
	 *   At the end, we store this remainder value as a class in the tile's container element.
	 * 
	 */


	var cloneAction = '';  // What to do with cloned HTML.
	var currentDate;       // Date we are currently working with.

	if (tileDir == 'up') {
	    cloneAction = 'prependTo';
	    topDate = dataModel.addToDate(intervalName, topDate, -1);
	    currentDate = topDate;
	} else if (tileDir == 'down') {
	    cloneAction = 'appendTo';
	    bottomDate = dataModel.addToDate(intervalName, bottomDate, 1);
	    currentDate = bottomDate;
	} else {
	    alert('Tile direction not recognized...throw exception...');
	}

	/*
	 * -calculate seconds that need to be represented in the *sub-intervals* of this tile.
	 *   -get sub-intervals (date function)
	 *   -get sub-interval seconds (date function)
	 */

	// (Okay, should this be smarter, as in automatically assume we want the next smallest interval down?
	// Maybe not, we may want to divide years into quarters, not months...etc.?)

	var newSubIntervalSize = dataModel.getSecondsInInterval(currentDate, subIntervalName) / secondsToPixels;

	var subIntervalCount   = dataModel.getIntervalCount(currentDate, subIntervalName);


	/*
	 * -generate/clone tile based on heading plus count of sub-intervals.
	 */

	// Create tile/model HTML and add unique ID class so we can refer to this tile specifically: 
	var uniqueModelClass = intervalName + '_' + currentDate.toString('yyyy_MM_dd-HH_mm_ss');
	var thisModelElement = $('<div />')[cloneAction]($(widgetSelector)).addClass(uniqueModelClass);

	// Add more generic classes for general CSS manipulation:
	thisModelElement.addClass('tModel').addClass(intervalName + 'Model');

	// Now we add the container for sub-interval elements (if interval = year, sub-interval = month, etc.):
	var thisSubIntervalContainerElement = $('<ul />').appendTo(thisModelElement).addClass(uniqueModelClass);

	// Same as above, add generic classes for CSS manipulation, but to sub-interval container:
	thisSubIntervalContainerElement.addClass('one' + intervalName.slice(0, 1).toUpperCase() + intervalName.replace(/^\w{1}/, '')).addClass('oneTile');

	var subIntervalElement         = $();
	var subIntervalHeightRemainder = 0;

	/*
	 * -generate html for, and set height of sub-interval html
	 */

	// Now we add the sub-intervals themselves:
	for (var i = 0; i < subIntervalCount; i++) {

	    subIntervalElement = $('<li><span></span></li>').appendTo(thisSubIntervalContainerElement).addClass(uniqueModelClass + '_inc' + i);

	    // Different element, same (class-adding) routine...
	    subIntervalElement.addClass((i + 1).toString());
	    subIntervalElement.find('span').addClass('marker');

	    // Lets us do labeling differently for first one...may want to add other classes like this one for different criteria?
	    if (i == 0) { subIntervalElement.find('span').addClass('first'); }

	    // Add simple label:
	    subIntervalElement.find('span').html((i + 1).toString());

	    // Now, we have to keep the decimal remainder and add it to the previous value...then add that to the height, and take the decimal remainder
	    var thisDecimal = newSubIntervalSize - parseInt(newSubIntervalSize);                              // Splits off decimal value
	    subIntervalHeightRemainder += thisDecimal;                                                        // We add to previous remainder...
	    var thisSubIntervalHeight = parseInt(newSubIntervalSize) + parseInt(subIntervalHeightRemainder);  // ...then we see if we have a > 1 value, and add that to the integer value of calculated height.
	    subIntervalHeightRemainder = subIntervalHeightRemainder - parseInt(subIntervalHeightRemainder);   // We then make sure to save the remainder *minus* any > 1 value we have (just decimal).

	    // NOW, we can set the height of sub-interval element:
	    subIntervalElement.css(timelineDir, thisSubIntervalHeight);
	}

	// Finally, we want to make sure we are saving the remainder for the next tile below (better way to do this?):
	thisSubIntervalContainerElement.addClass(subIntervalHeightRemainder.toString());


	/* MAKE LABELING BETTER */

	// Want more robust labeling based on config values...

	if (intervalName == 'month') {
	    thisSubIntervalContainerElement.find('.first').html(dataModel.getSubDate(currentDate, intervalName) + ' \'' + currentDate.getYear());
	} else {
	    thisSubIntervalContainerElement.find('.first').html(dataModel.getSubDate(currentDate, intervalName));
	}

	// Bit of a hack for now to get years to show up for decade...need to make this configurable.
	if (intervalName == 'decade') {
	    var startYear = dataModel.getSubDate(currentDate, intervalName);
	    for (var yearInc = 0; yearInc < 10; yearInc++) {
		$('li.' + uniqueModelClass + '_inc' + yearInc + ' span').html(startYear + yearInc);
	    }
	}

	/* END MAKE LABELING BETTER */


	/*
	 * -set top position based on addition of tiles
	 */

	// Adjust top if we are going up ?
	// parseFloat is just used to chop off 'px' ?
	//alert(widgetSelector + ' top = ' + $(widgetSelector).css('top'));
	//alert(thisSubIntervalContainerElement.css('height'));
	//alert( parseFloat($(widgetSelector).css('top')) - parseFloat(thisSubIntervalContainerElement.css('height')) + 'px');
	//alert( parseFloat($(widgetSelector).css('top')) - parseFloat(thisSubIntervalContainerElement.css('height')) + 'px');


	// HERE WE SET THE TOP POSITION OF THIS WIDGET/COLUMN
	if (tileDir == 'up') {
	    $(widgetSelector).css('top', ( parseFloat($(widgetSelector).css('top')) - parseFloat(thisSubIntervalContainerElement.css('height')) + 'px'));
	}

	// OLD CODE FOR THIS

	// Can we do this all at once along with updating positioning at the end of this function?
	// Splitting it up like this right now follows the old tiling method...
	// $(selector).css('top', (-1 * (thisSubIntervalContainerElement.css('height')) + 'px'));  // CSS CHANGE HERE

	// alert(dataModel.getSubDate(currentDate, intervalName) + ': ' + thisSubIntervalContainerElement.css('height'));

	// Return height of the tile generated.  Should return something else?
	return (parseInt(thisSubIntervalContainerElement.css('height')));
    };



    /*
     * 
     * Reviewing now that this is more or less implemented based on 'old model.'  We have a new problem, which is that,
     *  since we have much more possibilities for durations now, we are dealing with really expensive code in order to generate
     *  enough 'surplus' widget for a small interval so that when we scroll a large interval widget the small interval widget
     *  is able to keep up.  And this is even BEFORE we are talking about dealing with events!  It seems like we are going to
     *  have to figure something out so that we do calculations for the small intervals even while we are scrolling...would this work?
     * 
     * 
     * MAYBE TIMELINE 'HOLDER' CLASS SHOULD 'OWN' THIS METHOD...AND ALSO MANAGE WHICH WIDGETS ARE 'MANAGERS' AND WHICH NOT?
     * 
     * checkTiles() has the NON-MANAGER column depending on the MANAGER column
     *  (well actually depending on size of MANAGER tile in relationship to total timeline height).
     * 
     */
    self.checkTiles = function() {

	/* 
	 * Okay, let's start from scratch and think this through.
	 * 
	 * First of all, it's important to note that this is straightforward if we are
	 *  dealing with the "manager" widget.  In that case, we do this:
	 * 
	 * Check to see if our top is equal in pixels to the (negative) height of the timeline, 
	 * and then if we have enough tiles generated underneath to be the size of the timeline * 2.
	 * 
	 * We generate tiles going up or down depending, and then test again each time.
	 * 
	 * However, if we are dealing with a widget that is *not* the "manager" widget, it's a bit more complex:
	 * 
	 * -Here we need to figure out the proportion of pixels scrolled in *this* widget when the *manager* widget
	 *   is pulled one full length of the timeline.  What would this be?
	 * 
	 *   manager widget's secondsToPixels value / this widget's secondsToPixels value  = multiplier to figure out what one pixel in this widget is worth in terms of manager widget (backwards?)
	 * 
	 *   full height of timeline
	 * 
	 *   I don't think we need anything else.  The combination of the full height of the timeline
	 *    and the secondsToPixels ratio tells us how many pixels are possible to be scrolled (timeline height), and then how much 
	 *    this widget could possibly be scrolled if the manager were scrolled a full 'timeline height' (secondsToPixels ratio).
	 * 
	 * So: we basically get the secondsToPixels ratio and multiply that by the timeline height, and that's what we test 
	 *   against in the same manner as the manager widget tests.
	 * 
	 */

	var checkTop    = parseFloat($(widgetSelector).css('top')) * -1;    // top offset of widget, negated
	var checkHeight = parseFloat($(widgetSelector).css('height'));      // height of widget

	/* values
	alert("checkTop = " + checkTop + ", checkHeight = " + checkHeight + ", managerStP = " + managerStP + ", secondsToPixels = " + secondsToPixels);
	alert("managerStP / secondsToPixels = " + (managerStP / secondsToPixels));
	alert("timelineSize = " + timelineSize);
	alert("timelineSize * (managerStP / secondsToPixels) = " + (timelineSize * (managerStP / secondsToPixels)));
	 */

	var tileFactor  = 0;                                      // Only used when tiling 'non-manager' column, represents how many tiles we need in proportion to 'manager' column
	var upTest, downTest;                                     // Hold functions which return boolean values based on positioning/height tests

	if (isManager) {  // If this widget is the 'manager' of other widgets we just tile based on global timeline size.

	    // (up) if this widget size is less than total timeline size
	    upTest     = function () { return (checkTop <= timelineSize); };

	    // (down) if this widget's top offset (a negative value) + timeline size substracted from its height
	    //   is less than the total timeline size
	    downTest   = function () { return ((checkHeight - (checkTop + timelineSize)) <= timelineSize); };

	} else {

	    // OKAY, THIS IS A PROBLEM 'CAUSE WE DON'T HAVE A MANAGER INTERVAL SIZE ANY MORE...
	    // tileFactor = 1 + parseInt(timelineSize / managerIntervalSize);   // how many tiles could be scrolled in one stroke of the 'manager' column?
	    //	    tileFactor = 1 + parseInt(timelineSize / managerStP);   // how many tiles could be scrolled in one stroke of the 'manager' column?

	    // This is how many seconds are moved in proportion to one pixel in the manager column:
	    var managerStPRatio = managerStP / secondsToPixels;

	    // SO THE VALUE WE NEED TO MAKE SURE WE ARE GREATER THAN IS THIS:
	    var pixelsScrolled = (managerStP / secondsToPixels) * timelineSize;

	    // (up) if this widget size is less than the size of (basically) a tile * calculated tilefactor
	    //   (the amount of "manager's" tiles that fit in the timeline, plus one for good measure...)
	    upTest     = function () { return (checkTop <= pixelsScrolled); };

	    // (down) same calculation as for "manager," downTest, but in this case, we are again referencing the "manager's" tile size * tilefactor
	    //   as opposed to global timeline size:
	    downTest   = function () { return ((checkHeight - (checkTop + timelineSize)) < pixelsScrolled); };
	}

	var testInc = 0;
	var testIncTest = 2;

	while (upTest() && testInc < testIncTest) {
	    checkTop += self.tile('up');

	    // These need to be adjusted by the last *tile* size not the sub-interval height value.
	    if (!isManager) {
		widgetOffset -= checkTop;
	    }

	    testInc++;
	}

	// This happens afterwards 'cause we may have changed the non-manager columns?
	if (!isManager) {
	    checkHeight = parseFloat($(widgetSelector).css('height'));   // height of entire column
//	    self.updatePositioning();
	    checkTop = (widgetOffset * -1); // top offset of Timeline
	}

	var testInc = 0;

	while (downTest() && testInc < testIncTest) {
	    //self.tile('down');

	    checkHeight += self.tile('down');

	    if (!isManager) {
		tileFactor -= 1;
	    } else {
		// checkHeight += subIntervalHeight; ??
	    }

	    testInc++;
	}

    };


    self.loadEvents = function () {
	
	/*
	 * Iterate through events.
	 * 
	 * We want to place events by seconds past the smallest sub-interval value of the widget we are building.
	 * 
	 * For example, that means:
	 * 
	 *   If we are generating the 'years' widget, we want to find the 'months' by id,
	 *   find the events that would fall within that month, then calculate the seconds
	 *   past that month that the events would fall--with that, we can use the secondsToPixels
	 *   value of this widget to easily place the event, theoretically.
	 * 
	 */

	// Iterate through each rendered tile and generate events?

	var regexp      = new RegExp(intervalName + "_([0-9]{4})_([0-9]{2})_([0-9]{2})-([0-9]{2})_([0-9]{2})_([0-9]{2})_inc([0-9]{1})");

	// Where does this belong?  This should be part of the "visual event" 
	// (that is, view class that corresponds to individual datetime event model) class, and also be configurable.
	var iconWidth   = 10;
	var switchDir   = false;

	var widgetWidth = $(widgetSelector).width();

	$(widgetSelector).find("." + intervalName + "Model").children().children().each(
	    function (index, element) {
		var wasPosCount    = 0;

		var date_class     = $(element).attr('class').match(regexp);
		var eventStartDate = dataModel.getDateObject(date_class[1] + '-' + date_class[2] + '-' + date_class[3] + ' ' + date_class[4] + ':' + date_class[5] + ':' + date_class[6]);

		var events = dataModel.getEventsInInterval(eventStartDate, subIntervalName, date_class[7]);

		var parentHeight           = $(element).height();
		var previousTopPosition    = 0;  // Little hacky thing for getting topPositioning right
		var previousTopPositionAdd = 0;  // Little hacky thing for getting topPositioning right

		for (var i = 0, j = events.length; i < j; i++) {

		    var topPosition  = dataModel.getIntervalProportion(events[i].start, subIntervalName, intervalName) * parentHeight;

		    if (previousTopPosition == topPosition) {
			previousTopPosition = topPosition;
			previousTopPositionAdd += 2;
			topPosition = previousTopPositionAdd + topPosition;
		    } else {
			previousTopPosition = topPosition;
			previousTopPositionAdd = 0;
		    }

		    if (eventViewType == 'icon') {

			var dotSize      = (Math.floor(Math.random() * 2) * 2) + 10;  // TEMPORARY DOT SIZE RANDOMIZATION - THIS SHOULD BE BASED ON METRICS

			var leftPosition = 0;
			leftPosition = wasPosCount * iconWidth; // how far to indent?  GLOBAL

			// If we're stacking to right
			if (switchDir == false){
			    wasPosCount += 1; // Continue stacking

			    // But check the next stack
			    if ((wasPosCount + 1) * iconWidth >= widgetWidth) {
				switchDir = true; // And switch dirs if it overflows
			    }
			} else if (switchDir == true) {   // If we're stacking to the left
			    wasPosCount -= 1; // Continue stacking

			    // But check the next stack
			    if ((wasPosCount) * iconWidth <= 0) {  // (Order of Operations here??)  GLOBAL
				switchDir = false; // And switch dirs if it overflows
			    }
			}

			$(element).append(
			    "<img src='javascripts/chronos/img/t-50-s-" + dotSize + ".png'"
				+ " class='eDot " + dotSize + "'"
				+ " id='event-" + events[i].id + "'"
				+ " style='position:absolute; z-index:3; left:" + leftPosition + "px;"
				+ " margin-top:-10px; top:" + topPosition + "px;' title=''"
				+ " alt='" + $(element).attr('class') + "'/>"
			);

		    } else if (eventViewType == 'density') {
			$(element).append(
			    "<img src='javascripts/chronos/img/event-density.png'"
				+ " class='eDensity'"
				+ " id='density-" + (events[i].id) + "'"
				+ " style='position:absolute; z-index:3; width:100%; left:0;"
				+ " margin-top:-20px; top:" + topPosition + "'px;' />"
			);
		    }
		
		}
	    }
	);
    };


    // end of model factory function
    return self;
};
