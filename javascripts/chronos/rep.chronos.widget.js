/*
 * Sub-Widget class for Chronos Timeline
 * 
 *  TODO: CLEANUP COMMENTS
 *        ...and more...
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


    // PRIVATE
    var startDate            = dataModel.getDateObject(options.startDate) || null;      // Must be set

    var volumePercentage     = options.volumePercentage    || null;      // Must be set
    var widgetSelector       = options.widgetSelector      || null;      // Must be set

    var eventViewType        = options.eventViewType       || 'icon';
    var intervalsVisible     = options.intervalsVisible        || 2;

    var intervalName         = options.intervalName        || 'decade';  // Name of unit a single tile represents.
    var subIntervalName      = options.subIntervalName     || 'year';    // Name of sub-unit. For example, if the column tiles are years, the sub-unit is a month.

    var tileOffset           = options.tileOffset          || -2;        // Default amount we want to tile up for 'protection.'
    var widgetOffset         = null;                                     // Needs to be initialized after rendering.  More or less represents height of timeline column...but will change if making horizontal?

    var isManager            = options.isManager           || false;     // Determines whether this widget is the 'boss' of the other widgets in the global timeline.
    var managerStP           = 0;                                        // Set after initialization based on whether or not this is a manager.

    var mapTags              = options.mapTags             || false;     // TEMPORARY: need to revisit the entire tagging system infrastructure, it's a big hack now basically.

    // Holds start edge positioning and tile height for monitoring and re-calculating
    // var startChange       = null;      // Must be initialized

    // Passed in by 'holder' class
    var timelineSize      = null;
    var orientation       = null;

    // These two are holders for 'top' vs. 'left,' and 'width' vs. 'height':
    var startEdgeName          = null;
    var volumeDimensionName    = null;
    var volumeDimensionInvName = null;  // The inverse of volumeDimensionName ( height <-> width )


    // Our global seconds-to-pixels ratio used for both dragging ratio with other columns as well as generating new tiles:
    var secondsToPixels        = 0;
    var oldSecondsToPixels     = 0;  // For scaling purposes

    // We initialize bottomDate by decrementing in *reverse* of 
    // how it is incremented in tile function to assure we have
    // the correct value when we start in that function.
    var topDate                = dataModel.addToDate(intervalName, startDate, 1);
    var bottomDate             = startDate;

    // For saving change when this widget or others are dragged:
    var pixelDragChange        = 0;

    // Decimal remainder saved between updates to top value:
    var startSetValueRemainder = 0;

    var startPositionRatio     = 0;
    var endPositionRatio       = 0;

    /*
     * Utility function to generate consistent naming for model class:
     */
    var generateModelClass = function (date) {
	return intervalName + '_' + date.toString('yyyy_MM_dd-HH_mm_ss');
    };

    // Records IDs for (duration) events which have already been drawn so we don't re-draw them in another tile!
    var alreadyDrawn = [];

    // Values for determining placement of icons within drawEvents()...iconWidth should be configurable:
    var iconWidth   = 20;
    var widgetWidth = 0;   // initialized later

    // Multidimensional array which records durations that are "blocking" the "lanes" so that we don't paint events over events.
    //  See drawEvents() for more implementation details.
    var lanes = [];
    var laneTestCount = 0;  // lets us get out of recursive laneTest() function in case of problem...


    // PUBLIC

    self.update = function () {
    };


    self.initialize = function (initTimelineSize, initOrientation) {

	// Set instance properties:
	timelineSize = initTimelineSize;
	orientation = initOrientation;

	if (orientation == 'vertical') {
	    startEdgeName = 'top';
	    volumeDimensionName = 'width';
	    volumeDimensionInvName = 'height';
	} else {
	    startEdgeName = 'left';
	    volumeDimensionName = 'height';
	    volumeDimensionInvName = 'width';
	}

	// Hmm...bit of a hack to make sure that decades start with the '0' of the decade...
	// otherwise a bunch of stuff gets messed up:
	if (intervalName == 'decade') {
	    $("#dataMonitor #dates span.data").html('getting modulus for: ' + widgetSelector + ' ' + topDate.getFullYear() + ', ' + (topDate.getFullYear() - (topDate.getFullYear() % 10)) + "<br />");
	    topDate.setFullYear(topDate.getFullYear() - (topDate.getFullYear() % 10));
	}

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
	secondsToPixels = dataModel.getSecondsInInterval(startDate, intervalName) / (timelineSize / intervalsVisible);
	oldSecondsToPixels = secondsToPixels;  // just to initialize for first scaler resize.

	// Create initial widget HTML element and add id/classes:
	var mainWidgetElement = '';

	if (orientation == 'horizontal') {
	    mainWidgetElement = $('<div />').appendTo($(selector + ' #chronos_horizontal_wrapper'));
	} else {
	    mainWidgetElement = $('<div />').appendTo($(selector));
	}

	mainWidgetElement.attr('id', widgetSelector.replace(/^#/, '')).addClass('tWidget');

	if (isManager) {
	    mainWidgetElement.addClass('manager');
	}


	// Set height (if vertical orientation) or width (if horizontal orientation) based on configuration value:
	$(widgetSelector).css(volumeDimensionName, volumePercentage + "%");

	// if we don't set this to initialize we just get 'auto' and it throws everything off.
	$(widgetSelector).css(startEdgeName, '0px');

	// Now, generate our first tile.  We use this to center the widget and then build the rest of the tiles.
	self.tile('up');


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

	if (widgetSelector == '#timelineDecades') {
	    $("#dataMonitor #centerSetDump span.data").html('timelineSize = ' + timelineSize
							    + "<br />, dataModel.getSubIntervalDiff(startDate, subIntervalName) = " + dataModel.getSubIntervalDiff(startDate, subIntervalName)
							    + '<br />, secondsToPixels = ' + secondsToPixels);
	}

	widgetOffset = Math.ceil(timelineSize / 2 + (dataModel.getSubIntervalDiff(startDate, subIntervalName) / secondsToPixels));
	//widgetOffset = Math.ceil(timelineSize / 2);
	$(widgetSelector).css(startEdgeName, (widgetOffset + 'px'));     // CSS CHANGE HERE

	// Needed for scaling:
	startPositionRatio  = self.getStart() / self.getSize();
	endPositionRatio    = (self.getStart() + timelineSize) / self.getSize();

	widgetWidth = $(widgetSelector)[volumeDimensionName]();

	//alert("here we've set the position but haven't called checktiles yet");

	self.checkTiles();
	self.drawEvents();

	// Initialize (DateTime) event interaction:
	//self.initiateEventItemInteraction();
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
	var uniqueModelClass = generateModelClass(currentDate);
	var thisModelElement = $('<div />')[cloneAction]($(widgetSelector)).addClass(uniqueModelClass);

	// Add more generic classes for general CSS manipulation:
	thisModelElement.addClass('tModel').addClass(intervalName + 'Model');

	if (orientation == 'horizontal') {
	    thisModelElement.addClass('tModel_float');
	}

	// Now we add the container for sub-interval elements (if interval = year, sub-interval = month, etc.):
	var thisSubIntervalContainerElement = $('<ul />').appendTo(thisModelElement).addClass(uniqueModelClass);

	if (orientation == 'horizontal') {
	    thisSubIntervalContainerElement.addClass('oneTile_float');
	}

	// Same as above, add generic classes for CSS manipulation, but to sub-interval container:
	thisSubIntervalContainerElement.addClass('one' + intervalName.slice(0, 1).toUpperCase() + intervalName.replace(/^\w{1}/, '')).addClass('oneTile');

	var subIntervalElement         = $();
	var subIntervalVolumeDRemainder = 0;

	/*
	 * -generate html for, and set height of sub-interval html
	 */

	// Now we add the sub-intervals themselves:
	for (var i = 0; i < subIntervalCount; i++) {

	    subIntervalElement = $('<li><span></span></li>').appendTo(thisSubIntervalContainerElement).addClass(uniqueModelClass + '_inc' + i);

	    // Different element, same (class-adding) routine...
	    subIntervalElement.addClass((i + 1).toString());
	    subIntervalElement.find('span').addClass('marker');

	    if (orientation == 'vertical') {
		subIntervalElement.find('.marker').width('100%');
	    } else if (orientation == 'horizontal') {
		subIntervalElement.addClass('ot_horizontal');
		// subIntervalElement.find('.marker').width('100%');  // 'cause we are flipping it in style
	    }

	    // Lets us do labeling differently for first one...may want to add other classes like this one for different criteria?
	    if (i == 0) { subIntervalElement.find('span').addClass('first'); }

	    // Add simple label:   HACKY
	    if (intervalName == 'year') {
		subIntervalElement.find('span').html(currentDate.clone().add({ months: i }).toString('MMM'));
	    } else {
		subIntervalElement.find('span').html((i + 1).toString());
	    }

	    // Now, we have to keep the decimal remainder and add it to the previous value...then add that to the <volumeD> (height or width), and take the decimal remainder
	    var thisDecimal = newSubIntervalSize - parseInt(newSubIntervalSize);                              // Splits off decimal value
	    subIntervalVolumeDRemainder += thisDecimal;                                                        // We add to previous remainder...
	    var thisSubIntervalVolumeD = parseInt(newSubIntervalSize) + parseInt(subIntervalVolumeDRemainder);  // ...then we see if we have a > 1 value, and add that to the integer value of calculated <volumeD>.
	    subIntervalVolumeDRemainder = subIntervalVolumeDRemainder - parseInt(subIntervalVolumeDRemainder);   // We then make sure to save the remainder *minus* any > 1 value we have (just decimal).

	    // NOW, we can set the height of sub-interval element:
	    subIntervalElement.css(volumeDimensionInvName, (thisSubIntervalVolumeD + 'px'));
	}

	// Finally, we want to make sure we are saving the remainder for the next tile below (better way to do this?):
	thisSubIntervalContainerElement.addClass(subIntervalVolumeDRemainder.toString());


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


	// HERE WE SET THE TOP POSITION OF THIS WIDGET/COLUMN
	if (tileDir == 'up') {
	    var containerElementSize = thisSubIntervalContainerElement[volumeDimensionInvName]();
	    $(widgetSelector).css(startEdgeName, ( parseFloat($(widgetSelector).css(startEdgeName)) - parseFloat(containerElementSize) + 'px'));
	}

	// Return height of the tile generated.  Should return something else?
	return (parseInt(thisSubIntervalContainerElement[volumeDimensionInvName]()));
    };



    /*
     *  Does the work of resizing the tiles based on new secondsToPixels value.
     */
    self.resize = function () {

	// THIS FUNCTION IS KINDA SLOW.

	// We have to regenerate all the heights properly using same remainder mechanism as before:
	// (can we make this into a function which we use in both places?)

	var subIntervalVolumeDRemainder = 0;

	$(widgetSelector + ' .oneTile').each(
	    function () {

		var dateClassRegExp = new RegExp(intervalName + "_(\\d{4})_(\\d{2})_(\\d{2})-(\\d{2})_(\\d{2})_(\\d{2})");
		var dateClass       = $(this).attr('class').match(dateClassRegExp);
		var thisDate        = dataModel.getDateObject(dateClass[1] + '-' + dateClass[2] + '-' + dateClass[3] + ' ' + dateClass[4] + ':' + dateClass[5] + ':' + dateClass[6]);

		// // $("#dataMonitor #dates span.data").html(widgetSelector + ' ' + thisDate.toString());

		var newSubIntervalSize = dataModel.getSecondsInInterval(thisDate, subIntervalName) / secondsToPixels;

		// Now we add the sub-intervals themselves:
		$(this).find('li').each(
		    function () {

			// Now, we have to keep the decimal remainder and add it to the previous value...then add that to the height, and take the decimal remainder
			var thisDecimal = newSubIntervalSize - parseInt(newSubIntervalSize);                              // Splits off decimal value
			subIntervalVolumeDRemainder += thisDecimal;                                                        // We add to previous remainder...
			var thisSubIntervalHeight = parseInt(newSubIntervalSize) + parseInt(subIntervalVolumeDRemainder);  // ...then we see if we have a > 1 value, and add that to the integer value of calculated height.
			subIntervalVolumeDRemainder = subIntervalVolumeDRemainder - parseInt(subIntervalVolumeDRemainder);   // We then make sure to save the remainder *minus* any > 1 value we have (just decimal).

			// NOW, we can set the height of sub-interval element:

                        $(this).css(volumeDimensionInvName, (thisSubIntervalHeight + 'px'));

			// Within this li, we have to find all the duration events and resize:
			$(this).find('div.eDot.duration').each(
					      function () {
						  $(this).css(volumeDimensionInvName, (parseInt($(this).attr('data-seconds')) / secondsToPixels + 'px'));
					      }
					      );
		    }
		);

		// USING THIS!?
		// Finally, we want to make sure we are saving the remainder for the next tile below (better way to do this?):
		// thisSubIntervalContainerElement.addClass(subIntervalVolumeDRemainder.toString());
	});

	return true;
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

	var checkStart  = parseFloat($(widgetSelector).css(startEdgeName)) * -1;    // top offset of widget, negated
	var checkVolumeInvD = parseFloat($(widgetSelector)[volumeDimensionInvName]());      // height of widget

	var tileFactor  = 0;   // Only used when tiling 'non-manager' column, represents how many tiles we need in proportion to 'manager' column
	var upTest, downTest;  // Hold functions which return boolean values based on positioning/ height/width tests

	if (isManager) {  // If this widget is the 'manager' of other widgets we just tile based on global timeline size.

	    // (up) if this widget size is less than total timeline size
	    upTest     = function () { return (checkStart <= timelineSize); };

	    // (down) if this widget's top offset (a negative value) + timeline size substracted from its height
	    //   is less than the total timeline size
	    downTest   = function () { return ((checkVolumeInvD - (checkStart + timelineSize)) <= timelineSize); };

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
	    upTest     = function () { return (checkStart <= pixelsScrolled); };

	    // (down) same calculation as for "manager," downTest, but in this case, we are again referencing the "manager's" tile size * tilefactor
	    //   as opposed to global timeline size:
	    downTest   = function () { return ((checkVolumeInvD - (checkStart + timelineSize)) < pixelsScrolled); };
	}

	var testInc = 0;
	var testIncTest = 4;

	var datesTiled = new Array();

	while (upTest() && testInc < testIncTest) {

	    //alert("here is right before we tile up");

	    checkStart += self.tile('up');
            datesTiled.push(topDate);

	    //alert("here is right after we tile up");

	    // These need to be adjusted by the last *tile* size not the sub-interval height value.
	    if (!isManager) {
		widgetOffset -= checkStart;
	    }

	    testInc++;
	}

	// This happens afterwards 'cause we may have changed the non-manager columns?
	if (!isManager) {
	    checkVolumeInvD = parseFloat($(widgetSelector)[volumeDimensionInvName]());   // height of entire column
	    checkStart = (widgetOffset * -1); // top offset of Timeline
	}

	var testInc = 0;

	while (downTest() && testInc < testIncTest) {
	    checkVolumeInvD += self.tile('down');
            datesTiled.push(bottomDate);

	    if (!isManager) {
		tileFactor -= 1;
	    } else {
		// checkVolumeD += subIntervalHeight; ??
	    }

	    testInc++;
	}

	// Return array of datesTiled (for drawEvents to process if need be).
	return datesTiled;
    };


    /*
     *  Paints events to tiles.  Expect an argument of a specific date to paint.
     */
    self.drawEvents = function (dateFilter) {

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

	// Iterate through each rendered tile and generate events

	var switchDir   = false;
	var wasPosCount = 0;  // controls 'sine wave meandering' pattern

	if (lanes.length == 0 && eventViewType == 'icon') {
	    for (var l = 0, m = (widgetWidth / iconWidth); l < m; l++) {
		lanes[l] =
		    {
			start: false,
			end:   false
		    };
	    }
	}

	// This regexp is used to match on the class we generate from the date to place in tiles.
	var dateClassRegExp = new RegExp(intervalName + "_(\\d{4})_(\\d{2})_(\\d{2})-(\\d{2})_(\\d{2})_(\\d{2})_inc(\\d{1,2})");

	//$("#dataMonitor #dates span.data").html('');
	// $("#dataMonitor #dates span.data").append("<br />");

	// The matched tiles
	var tileResultSet = {};

	if (dateFilter) {
	    tileResultSet = $(widgetSelector).find("div." + generateModelClass(dateFilter)).children();
	    // $("#dataMonitor #dates span.data").append('size: ' + tileResultSet.size() + '<br />');
	    // $("#dataMonitor #dates span.data").append('div is: div.' + generateModelClass(dateFilter) + '<br />');
	} else {
	    tileResultSet = $(widgetSelector).find("." + intervalName + "Model").children();
	}

	// Find all the 'model' divs, which specify individual tiles (i.e. corresponds to one instance of 'intervalName', whatever it is):
	tileResultSet.each(
	    function (index, element) {

		// Within the tile, find each instance of the sub-interval (subIntervalName).
		$(this).find("li").each(
		    function (index, element) {
			// Extract the date that this subInterval begins with.
			var dateClass     = $(element).attr('class').match(dateClassRegExp);

			var tileStartDate = '';

			if (dateFilter != null) {
			    tileStartDate = dateFilter.clone();  // Clone so we don't inadvertently increment the date, as it is passed by reference vs. value. 
                            // $("#dataMonitor #dates span.data").append("<br /> are we here? " + tileStartDate.toString() + "<br />");
			} else {
			    tileStartDate = dataModel.getDateObject(dateClass[1] + '-' + dateClass[2] + '-' + dateClass[3] + ' ' + dateClass[4] + ':' + dateClass[5] + ':' + dateClass[6]);
			}

			var addIntervalSpec = {};
			addIntervalSpec[subIntervalName + 's'] = dateClass[7];
			tileStartDate.add(addIntervalSpec);

			// $("#dataMonitor #dates span.data").append("Start date for this tile: " + tileStartDate.toString() + ", interval spec: " + addIntervalSpec[subIntervalName + 's'] + "<br />");

			var events = dataModel.getEventsInInterval(tileStartDate, subIntervalName);

			//$("#dataMonitor #dates span.data").append("events result length: " + events.length + "<br />");


			var parentHeight = parseInt($(element)[volumeDimensionInvName]());

			//$("#dataMonitor #dates span.data").append("<ul>");

			eachEvent:for (var i = 0, j = events.length; i < j; i++) {

			    if (events[i].end != undefined) {                         // if not undefined or null
				if ($.inArray(events[i].id, alreadyDrawn) === -1) {   // Using jQuery's inArray() 'cause IE (6/7?) doesn't implement indexOf().
				    alreadyDrawn.push(events[i].id);
				} else {
				    continue eachEvent;
				}
			    }

			    var startPosition    = (dataModel.getIntervalInSeconds(tileStartDate, events[i].start) / secondsToPixels);
			    var topPosPercentage = (startPosition / parentHeight) * 100;


			    // Debugging
/*
			    $("#dataMonitor #dates span.data").append(
				"<li>" + events[i].id + ': ' + events[i].start.toString() + ", "
				    + dataModel.getIntervalInSeconds(tileStartDate, events[i].start) + " ... "
				    + startPosition + "</li>"
			    );
*/

			    if (eventViewType == 'icon') {

				// TEMPORARY DOT SIZE RANDOMIZATION - THIS SHOULD BE BASED ON METRICS
				// var dotSize      = (Math.floor(Math.random() * 5) * 2) + 10;
				// var dotSize      = (Math.floor(Math.random() * 2) * 2) + 10;

				// Temporarily set to map to tag count
				var dotSize = 0;

				if (mapTags) {
				    dotSize = (Math.floor(events[i].tags.length / 2) + ((Math.floor(events[i].tags.length / 2)) % 2)) + 12;
				} else {
				    dotSize = 12;
				}

				/*

				  let's think about this.

				  first we need to test to see if the lane has a conflict.
				  if it does, then we go to the next one.
				  if the next one has no conflict, then we break and use that lane.

				  (what do we do in the rare case where all the lanes conflict?  this could cause an endless loop...)

				  after we've established that the lane we've found is not conflicting, we have to fill it with this event, IF it is a duration event (no? In all cases?).


				  what are the conditions for a conflict?

				  - we have a duration event and there are 'instantaneous' events which have start dates within the datetime bounds of duration event
				      instEvent.start isAfter durationEvent.start && instEvent.start isBefore durationEvent.end
				  - we have an instantaneous event and there is a duration event which ends after and starts before that instantaneous event
				      instEvent.start isAfter durationEvent.start && instEvent.start isBefore durationEvent.end

				      question: does it matter if we only have start and end points for each lane?
				      if an instantaneous event starts between the start and endpoint stored for that lane, then we move to the next.
				      if a duration event starts or ends between the start and endpoint stored for that lane, then we move to the next.
				      if a duration event starts *after* the start point for that lane, but there is no endpoint (i.e. only instantaneous event stored), then we don't have to move.
				      if a duration event ends *before* the start point for that lane, and there is no endpoint (i.e. only instantaneous event stored), then we don't have to move.

				      HOWEVER, there is one situation where we are "wasting" space--if we have stored the *endpoint* for a duration event, then updated the start point based on
				      an instantaneous event, we may have a big chunk of space in there that we could actually fit an event in.  In this case we may lose a lot of space...but I suspect not.

				  that's it.

				*/

				if (wasPosCount == undefined) {
				    alert('title: ' + events[i].title + ", id:  " + events[i].id);
				}

				var position = laneTest({'wasPosCount': wasPosCount, 'switchDir': switchDir}, events[i]);
				switchDir    = position.switchDir;
				wasPosCount  = position.wasPosCount;

				// Reset lane test for next time around:
				laneTestCount = 0;

				var leftPosition = 20;
				leftPosition = (wasPosCount * iconWidth) - iconWidth; // how far to indent?

				// Okay, so, this is just a bit of a hack for now to prevent event icons from pushing into adjacent widget.
				if (leftPosition < 0) {
				    leftPosition = 0;
                                }

				// For "duration events:"
				var eventLength = -1;
				var eventLengthString = '';

				var eventTypeClass = 'instant';
				var data_seconds = 0;

				// IF WE HAVE A "DURATION EVENT," i.e. if we have an event with an endpoint
				if (events[i].end != undefined) {
				    data_seconds   = dataModel.getIntervalInSeconds(events[i].start, events[i].end);
				    eventLength    = Math.abs(data_seconds / secondsToPixels);
				    eventTypeClass = 'duration';
				}

				//$("#dataMonitor #dates span.data").append('id #' + (wasPosCount) + ', ' + events[i].start + " - " + events[i].end + "<br />");

				if (eventLength !== -1) {
				    if (orientation == 'vertical') {
					eventLengthString = "; height:" + eventLength + "px ";
				    } else {
					eventLengthString = "; width:" + eventLength + "px ";
				    }
				}


				var class_regex = / /g;

				var tag_string = '';
				var dirty_tag_string = '';


				if (mapTags) {
				    for (k = 0; k < events[i].tags.length; k++) {
				        tag_string += ' ' + events[i].tags[k].replace(/ /g, '_').replace(/\./g, '');
				        dirty_tag_string += ' <span class=\"tag_separator\">|</span> ' + events[i].tags[k].replace(/'/, "&#39;").replace(/"/, '&#34;');
                                    }
				}

				if (orientation == 'vertical') {

				    $(element).append(
					"<div"
					    + " class='eDot r" + dotSize + " " + eventTypeClass + " " + events[i].feed_name + ' ' + dotSize + " " + events[i].start.toString().replace(class_regex, '_') + ' ' + events[i].title.replace(class_regex, '_')
					    + " " + tag_string + "'"
					    + " id='event-" + events[i].id + "'"
					    + " style='position:absolute; z-index:3; left:" + leftPosition + "px;"
					    + " margin-top:-" + dotSize/2 + "px; top: " + topPosPercentage + "%" + eventLengthString + "' title='" + events[i].title + "'"
					    + " data-date='" + events[i].start.toString() + " '"
					    + " data-lane='" + wasPosCount + "'"
					    + " data-seconds='" + data_seconds + "'"
					    + " alt='" + $(element).attr('class') + "'></div>"
				    );
				} else {
				    var desc = '';
				    if (events[i].desc != null) {
					desc = events[i].desc.replace(/'/g, "&#39;").replace(/"/g, '&#34;').replace(/\\r/g, '');
				    }

				    $(element).append(
					"<div"
					    + " class='eDot r" + dotSize + " " + eventTypeClass + " " + events[i].feed_name + ' ' + dotSize + " " + events[i].start.toString().replace(class_regex, '_') + ' ' + events[i].title.replace(class_regex, '_').replace(/'/g, "&#39;").replace(/"/g, '&#34;')
					    + " " + tag_string + "'"
					    + " id='event-" + events[i].id + "'"
					    + " style='position:absolute; z-index:3; top:" + leftPosition + "px;"
					    + " margin-left:-" + dotSize/2 + "px; left: " + topPosPercentage + "%" + eventLengthString + "' title='"
					// Kinda wacky, a bunch of HTML formatted *inside* the title field.  For tooltip (jQuery tools tooltip)
					    + "<span class\=\"date_title\">" + events[i].start.toString('MM/dd/yyyy') + "</span>"
					    + "<br />" + events[i].title.replace(/'/g, "&#39;").replace(/"/g, '&#34;')
					    + "<br /><div class=\"desc\">" + desc + "</div>"
					    + "<br /><div class=\"tags\">" + dirty_tag_string + "</div>'"
					    + " data-date='" + events[i].start.toString() + " '"
					    + " data-lane='" + wasPosCount + "'"
					    + " data-seconds='" + data_seconds + "'"
					    + " alt='" + $(element).attr('class') + "'" + eventLengthString + "></div>"
				    );
				}
			    } else if (eventViewType == 'density') {
					if (orientation == 'vertical') {
						var orientationStyles = "top:" + topPosPercentage;
					} else {
						var orientationStyles = "left:" + topPosPercentage;
					}
					$(element).append(
					"<div"
						+ " class='eDensity'"
						+ " id='density-" + (events[i].id) + "'"
						+ " style='" + orientationStyles + "%;' />"
					);	
			    }
			}

			//$("#dataMonitor #dates span.data").append("</ul><br /><br />");

			return true;  // ENDS 'li' loop anonymous function
		    }
		);
	    }
	);

	// $("#dataMonitor #dates span.data").append("<br />");
    };


    /********************************************************************************************
     * SETTERS/GETTERS
     * 
     */

    self.getSelector = function () {
	return widgetSelector;
    };

    self.isManager = function () {
	return isManager;
    };

    self.setManagerStP = function (initManagerStP) {
	managerStP = initManagerStP;
    };

    self.getSecondsToPixels = function () {
	return secondsToPixels;
    };

    /* fucks everything up!? */
    self.setSecondsToPixels = function (newSecondsToPixels) {
	// $("#dataMonitor #stpSetting span.data").html( 'newSecondsToPixels = ' + newSecondsToPixels + ', oldSecondsToPixels = ' + oldSecondsToPixels + ', secondsToPixels = ' + secondsToPixels );
	oldSecondsToPixels = secondsToPixels;
	secondsToPixels    = newSecondsToPixels;
    };

    self.getOldSecondsToPixels = function () {
	return oldSecondsToPixels;
    };

    self.getStartPositionRatio = function () {
	return startPositionRatio;
    };

    self.resetStartPositionRatio = function () {
	startPositionRatio = ( self.getStart() / self.getSize() ) * -1;
	return startPositionRatio;
    };

    self.getEndPositionRatio = function () {
	return endPositionRatio;
    };

    self.resetEndPositionRatio = function () {
	endPositionRatio = ( (self.getStart() - timelineSize) / self.getSize() ) * -1;
	return endPositionRatio;
    };

    self.getDragChange = function () {
	return pixelDragChange;
    };

    self.setDragChange = function (dragChange) {
	pixelDragChange = dragChange;
	return pixelDragChange;
    };

    self.getSize = function () {
	//$("#dataMonitor #stpNew span.data").html(parseFloat($(widgetSelector)[volumeDimensionInvName]()));
	$("#dataMonitor #stpNew span.data").html(widgetSelector + ' = ' + parseFloat($(widgetSelector).width()));

	return parseFloat($(widgetSelector)[volumeDimensionInvName]());
    };

    self.setSize = function () {
	var widgetSize = 0;

	$(widgetSelector).find('.tModel').each(
	    function() {
		widgetSize += $(this)[volumeDimensionInvName]();
	    }
	);

	widgetSize *= 2;

	$(widgetSelector)[volumeDimensionInvName](widgetSize);

	return widgetSize;
    };

    self.getStart = function () {
	// $("#dataMonitor #dragtype span.data").html('$(widgetSelector).css(startEdgeName) = ' + $(widgetSelector).css(startEdgeName));
	return parseFloat($(widgetSelector).css(startEdgeName));
    };

    self.setStart = function (startChange) {
        var checkStart = parseFloat($(widgetSelector).css(startEdgeName));

	var adjustedStartChange = startChange + startSetValueRemainder;
	var adjustedStartChangeNoDecimal = adjustedStartChange;
	startSetValueRemainder = adjustedStartChange - adjustedStartChangeNoDecimal;

	var startSetValue = (checkStart - adjustedStartChangeNoDecimal);

	// A little hack to let this function handle animation too...
	if (arguments[1] == true) {
	    var animate_options = {};
	    animate_options[startEdgeName] = startSetValue + 'px';
	    $(widgetSelector).animate(animate_options, 500);
	} else {
	    $(widgetSelector).css(startEdgeName, startSetValue + 'px');  // CSS CHANGE HERE
	}
    };


    /**
     * 
     * @function
     * @description
     *   Gets date at current start (top/left) position of widget:
     * @returns {Date}
     * 
     */
    self.getStartDate = function () {

	// alert($(widgetSelector).find('.tModel').first().attr('class') + ' : ' + $(widgetSelector).find('.tModel').first().offset()[startEdgeName]);

	// 1) Grab a tile div in the widget, any tile div.  Get top/left position.

	var sampleTModel = $(widgetSelector).find('.tModel').first();

	// 2) Find seconds value for #1 (#1's value * secondsToPixels)

	// ( * -1 because if we are in negative land, we actually want to *add* seconds, and vice versa: )
	var differenceInSeconds = ((sampleTModel.offset()[startEdgeName] - $(selector).offset()[startEdgeName]) * secondsToPixels) * -1;

	// 3) Parse date from div that was grabbed.

	// Can we functionalize this?  We use something like it in two other places...I recall there being a problem with getting those two to sync up though?
	var dateClassRegExp = new RegExp(intervalName + "_(\\d{4})_(\\d{2})_(\\d{2})-(\\d{2})_(\\d{2})_(\\d{2})");
	var dateClass       = sampleTModel.attr('class').match(dateClassRegExp);
	var thisDate        = dataModel.getDateObject(dateClass[1] + '-' + dateClass[2] + '-' + dateClass[3] + ' ' + dateClass[4] + ':' + dateClass[5] + ':' + dateClass[6]);

	// 4) Return date with difference in seconds between tile div date and '0' pos added:

	return thisDate.addSeconds(differenceInSeconds);
    };


    /**
     * 
     * @function
     * @description
     *   Initializes (UI) event handling for (DateTime) event interaction.
     * 
     */
    self.initiateEventItemInteraction = function(event_icon_callback) {
	$('.eDot').live('click', event_icon_callback);

	$('.eDot').live('mouseover',
			function () {
			    $(this).addClass('highlight_event_over');
			    $('#' + $(this).attr('id').replace(/^event-/, '')).addClass('highlight_event_li_over');
			});

	$('.eDot').live('mouseout',
			function () {
			    $(this).removeClass('highlight_event_over');
			    $('#' + $(this).attr('id').replace(/^event-/, '')).removeClass('highlight_event_li_over');
			});
    };



    /**
     *	Here we test to see if we have a conflict with what is recorded in the "blocking lanes" array.
     */
    var laneTest = function (position, thisEvent) {

	// "Emergency measure" to handle the case where a base case is never met...
	// will find a better way around later:
	if (laneTestCount > lanes.length) {
	    return false;
	} else {
	    laneTestCount++;
	}

	position = eventLaneIncrementor(position);

	// What's going on here?
	if (lanes[position.wasPosCount] == undefined) {
	    for (var blah in position) {
		alert(blah + " = " + position[blah]);
	    }
	    return false;
	}

	// First, we have not set either start or end values for this lane.
	if (lanes[position.wasPosCount].start === false) {

	    // -increment and set lane values
	    setLaneVals(position, thisEvent);

	} else {

	    if (thisEvent.start.isAfter(lanes[position.wasPosCount].end) || thisEvent.start.isBefore(lanes[position.wasPosCount].start)) {

		// set lane values
		setLaneVals(position, thisEvent);

	    } else {
		// What do we do if we have multiple events with the exact same time, such that they fill up all the lanes (and then some)?
		// If that happens we need to break out of this recursive function somehow so we don't keep going endlessly.

		//alert("overlapping... thisEvent.id = " + thisEvent.id + ", thisEvent.start = " + thisEvent.start + ", thisEvent.end = " + thisEvent.end + " position.wasPosCount (lane) = " + position.wasPosCount + ", this lane's start: " + lanes[position.wasPosCount].start + ", this lane's end: " + lanes[position.wasPosCount].end );

		// test again (move to next lane)
		return laneTest(position, thisEvent);
	    }
	}

	return position;
    };


    /**
     *
     */
    var eventLaneIncrementor = function (position) {
	if (position.switchDir == false) {
	    position.wasPosCount += 1;

	    // But check the next stack
	    if ((position.wasPosCount + 1) * iconWidth >= widgetWidth) {
		position.switchDir = true; // And switch dirs if it overflows
	    }
	} else if (position.switchDir == true) {   // If we're stacking to the left
	    position.wasPosCount -= 1; // Continue stacking

	    // But check the next stack
	    if ( ((position.wasPosCount) * iconWidth) - iconWidth <= 0) {  // (Order of Operations here??)  GLOBAL
		position.switchDir = false; // And switch dirs if it overflows
	    }
	}

	return position;
    };


    /**
     *
     */
    var setLaneVals = function (position, thisEvent) {
	lanes[position.wasPosCount].start = thisEvent.start.clone();

	if (thisEvent.end != undefined) {
	    lanes[position.wasPosCount].end = thisEvent.end.clone();

	// If we are working with an instantaneous event, then we still have to set the end
	// if the end point is not later than the event's start date,
	// so that we don't have duration events painted later than instantaneous events
	// overlapping.

	} else {
	    lanes[position.wasPosCount].end = thisEvent.start.clone();
	}

	return;
    };


    // end of model factory function
    return self;
};
