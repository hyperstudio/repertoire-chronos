/*
 * Model class for Chronos Timeline
 * 
 */

//= require <jquery>
//= require "rep.widgets/global"
//= require "rep.widgets/widget"
//= require "rep.chronos.global"

repertoire.chronos.timeline = function(mainSelector, options, dataModel) {

    var self = repertoire.widget(mainSelector, options);

    // default: no options specified
    options = options || {};


    // PRIVATE

    // TEMPORARY WHILE I FIGURE OUT HOW TO ABSTRACT THESE OUT
    var widgets = {};


    /* CARRIED OVER VARS */

    var defaults = {
	startDate:        'Jan 01, 1984 00:00:00',

//	startYear:        1984,                            // We can accept date differently sometime down the line, and include months then.
//	remainderYear:    null,                            // Get year offset for decades  -NEEDS INITIALIZATION
//	remainderMonth:   2,

//	thisYear:         '',
//	thisDecade:       '',
//	downYear:         '',
//	downDecade:       '',

	timelineDir:      'height',                        // What direction should this timeline be (options: height or width):
	timelineSize:     null,                            // -NEEDS INITIALIZATION
	tileOffset:       -2,                              // How many tiles back do we pull? (to precache upward)

	// Applies to DECADES ('controller') column
	bigUnitSize:      200,                             // How many pixels in a Y? (ie, Year)
	bigTileSize:      null,                            // Calculate big tile size  -NEEDS INITIALIZATION
	bigTileOffset:    null,                            // -NEEDS INITIALIZATION
	bigUnitBase:      10,                              // How many bigUnitSize's are in a tile? (ie. 10 years in a decade)  // DATE CLASS RESPONSIBILITY

	// Applies to YEARS column
	smallUnitSize:    100,                             // How many pixels in a X? (ie, Month)
	smallTileSize:    null,                            // Calculate small tile size  -NEEDS INITIALIZATION
	smallTileOffset:  null,                            // -NEEDS INITIALIZATION
	smallUnitBase:    12,                              // How many smallUnitSize's are in a tile? (ie. 12 months in a year) // DATE CLASS RESPONSIBILITY

	// THESE FOR (UI) EVENTS (initiateTileEvents)
	sizeRatio:        null,                            // What is the size ratio (needed for calculating corresponding movement)  -NEEDS INITIALIZATION
	correlateYears:   0,
	correlateDecades: 0,
	mouseY:           0,
	mouseX:           0,
	wasMouseY:        0,
	wasMouseY2:       0,

	// SCALER
	bigTileTop:       null,                            // a variable used for scaler manipulation, more or less same as above  -NEEDS INITIALIZATION

	// FOR placeEvents():
	url:              "http://slebinos.mit.edu/dev/js-play/",
	imgUrl:           null,                            // -NEEDS INITIALIZATION
	perp:             'width',                         // What is the perpendicular?             // FOR SCALER/EVENTS
	iconWidth:        20,                              // FOR EVENTS ONLY
	yearWidth:        null                             // FOR EVENTS ONLY -NEEDS INITIALIZATION
    };

    /* END CARRIED OVER VARS */


    // TO PLACE EVENTS, MUST RECORD WHICH YEARS/TILES HAVE BEEN PLACED:
    var recordTiles = {
	decadeTiles: [],
	yearTiles:   []
    };


    // PUBLIC

    // What is the right way to do these getters/setters?
    //  'cause this isn't it...DD
    self.getProperty = function (propertyName) {
	validProperties = [ 'url', 'imgUrl', 'perp', 'tileOffset', 'timelineDir',  'timelineSize', 'smallUnitBase', 'mouseY', 'smallUnitSize', 'bigUnitSize', 'smallTileSize', 'smallTileOffset', 'bigTileOffset', 'bigTileTop', 'sizeRatio', 'correlateYears', 'correlateDecades', 'wasMouseY' ];

	if (validProperties.indexOf(propertyName)) {
	    return defaults[propertyName];
	} else {
	    return false;
	}
    };

    self.setProperty = function (propertyName, propertyValue) {
	validProperties = [ 'smallUnitSize', 'bigUnitSize', 'smallTileSize', 'smallTileOffset', 'bigTileOffset', 'bigTileTop', 'sizeRatio', 'correlateYears', 'correlateDecades', 'wasMouseY' ];

	if (validProperties.indexOf(propertyName)) {
	    defaults[propertyName] = propertyValue;
	    return true;
	} else {
	    return false;
	}
    };


    /* ADDED WHEN RE-BUILDING SCALER -DD, 03/02/10 */

    self.getSelector = function () {
	return mainSelector;
    };

    /* END ADDED WHEN RE-BUILDING SCALER */



    self.update = function() {
/*
	// Place events for new years
	for (var i = 0; i < recordTiles.yearTiles.length; i++) {
	    if (recordTiles.yearTiles[i].isNew) {
		recordTiles.yearTiles[i].isNew = false;
		self.placeEvents(recordTiles.yearTiles[i].val);
	    }
	}
*/
    };

    // See Private Defaults
    self.initialize = function() {

	/*****************************************************************************
	 * INITIALIZE NECESSARY VARIABLES
	 */

	// CHANGED FROM PARSEDFLOAT TO PARSEINT
	defaults.timelineSize    = parseInt($(mainSelector).css(defaults.timelineDir));  // Should be set vs. pulled from CSS?   Right now, 'timelineContainer' is set to 100%, so moves w/browser (sorta)
	//alert('JQUERY .css FUNCTION GIVES US:' + $(mainSelector).css(defaults.timelineDir));

	// defaults.sizeRatio       = defaults.bigUnitSize/defaults.smallUnitSize;
	// defaults.yearWidth       = parseInt($("#timelineYears").css(defaults.perp));

	// Just for SCALER
	defaults.bigTileTop      = defaults.bigTileOffset;

	// ...for pulling icons in and whatnot:
        defaults.imgUrl          = defaults.url + "javascripts/chronos/",


	/*****************************************************************************
	 * START BUILDING TIMELINE
	 */

	// FIX TEXT SELECTION BUG IN IE
	document.getElementById(
	    mainSelector.replace(/^#(.*)$/, "$1")       // Strip hash from beginning of selector
	).onselectstart = function() { return false; };

	// Associates mouse events with global variables...needed?
	self.mousePrePos();

	widgets.decadesWidget = repertoire.chronos.widget(mainSelector, {
							  startDate:           defaults.startDate,
							  volumePercentage:    '20',
							  widgetSelector:      '#timelineDecades',
							  intervalName:        'decade',
							  subIntervalName:     'year',
							  isManager:           true,
						          tilesVisible:        1
						      }, dataModel);

/*
	widgets.years2Widget = repertoire.chronos.widget(mainSelector, {
							  startDate:           defaults.startDate,
							  volumePercentage:    '10',
							  widgetSelector:      '#timelineYears2',
							  intervalName:        'year',
							  subIntervalName:     'month',
							  isManager:           false,
						          tilesVisible:        2
						      }, dataModel);
*/

	widgets.yearsWidget = repertoire.chronos.widget(mainSelector, {
							  startDate:           defaults.startDate,
							  volumePercentage:    '50',
							  widgetSelector:      '#timelineYears',
							  intervalName:        'year',
							  subIntervalName:     'month',
							  isManager:           false,
						          tilesVisible:        1
						      }, dataModel);

	widgets.monthsWidget = repertoire.chronos.widget(mainSelector, {
							  startDate:           defaults.startDate,
							  volumePercentage:    '30',
							  widgetSelector:      '#timelineMonths',
							  intervalName:        'month',
							  subIntervalName:     'day',
							  isManager:           false,
						          tilesVisible:        .5
						      }, dataModel);


	/*
	 * First we have to figure out the 'manager' secondsToPixels value.
	 * Then we set it for each of the other columns.
	 * 
	 * The way this works is officially retarded.  Fix.
	 * Probably, the manager idea shouldn't be known at all by the sub-columns...but how to
	 * implement checkTiles if so?
	 * 
	 */

	var managerStP = 0;

	for (name in widgets) {
	    if (widgets[name].isManager()) {
		widgets[name].initialize(defaults.timelineSize, defaults.timelineDir);
		managerStP = widgets[name].getSecondsToPixels();
	    }
	}

	// We loop again to set managerStP...better way to do this?
	for (name in widgets) {
	    if (!widgets[name].isManager()) {
		widgets[name].setManagerStP(managerStP);
		widgets[name].initialize(defaults.timelineSize, defaults.timelineDir);
	    }
	}


/*

if size ratio is big tile *sub interval* size divided by  small tile *sub interval* size

   size of a year in decade column / size of a month in year column

and if our calculation for moving the YEAR column when we move the DECADE column is

//  "top": (defaults.smallTileOffset - ((defaults.correlateDecades * defaults.smallUnitBase)/defaults.sizeRatio)) + 'px'   // CSS CHANGE HERE, UNIQUE

year column top -  ( change in position of decade column * 10 [count of months in a year -- sub-intervals in smaller interval column] / ratio [above] )

and if our calculation for moving the DECADE column when we move the YEAR column is

//  "top": (defaults.bigTileOffset - (defaults.correlateYears/defaults.smallUnitBase) * defaults.sizeRatio) + 'px'    // CSS CHANGE HERE, UNIQUE

decade column top -  ( change in position of year column / 10 [count of months in a year -- sub-intervals in smaller interval column] * ratio [above] )


So--how do we talk about this abstractly?

We are always basing this on the small interval of the smaller sized column...

hmm...so, we *ALWAYS* want to relate the column with the smaller intervals ( if year and month, then month, if decade and month, then month, etc.) to the larger interval column in the same way...



so, first thing we do is figure out, out of two columns, which one is dealing with the smaller intervals...rely on model class for this ?

then, we determine the size ratio value for those two columns:

smaller interval column sub-interval size / smaller interval column sub-interval size

after that, we need to determine the equation for the two columns in relationship with each other so that they can be pulled out every time there is a change in the column

(smaller column drag)
-bigger column top - ((change in position of smaller column / count of sub-intervals of smaller column (ADDED VALUE HERE: * the amount of INTERVALS SMALLER COLUMN REPRESENTS ARE IN ONE INTERVAL THAT THE BIGGER COLUMN REPRESENTS...RIGHT? ) * this particular size ratio )

(bigger column drag)
-smaller column top - ((change in position of bigger column * count of sub-intervals of smaller column) / this particular size ratio )


The ratio may be wrong here, though, if the values of the columns we are relating isn't directly sequential--so, if we have decades going to months, and we use days (uggh, haven't thought about that yet...hmm...)



*/

	self.initiateTileEvents();

 	var scaler = repertoire.chronos.scaler('#scaler',{ scalerViewWidget: 'yearsWidget' }, self, widgets);
	scaler.initialize();
	scaler.initiateScalerEvents();
    };



    /*
     *
     */
    self.initiateTileEvents = function () {
	$(mainSelector).mousedown(
	    function() {
		defaults.wasMouseY = defaults.mouseY;
		defaults.wasMouseY2 = defaults.mouseY;
	    });

	/*
	 * OKAY.  Here's the challenges:
	 * 
	 * The main functioning of attaching to the drag event is to make sure the *other* columns move when each column moves.
	 * When there were just two, that was determined primarily by the sizeRatio.
	 * However, now that there are an arbitrary number of columns, there needs to be a smarter algorithm.
	 * It seems dumb to calculate the sizeRatio between every other column but...is it?
	 * Then we also have to make sure we move *every* other column when the one that is dragged is moved?
	 * 
	 * What happens now when you drag a column?
	 * 
	 * 1) You get the difference between last position and current position.  Note that this is happening *constantly* so that we have
	 *     natural interaction with the timeline.
	 * 
	 * 2) You determine the change in position of the other column based on sizeRatio (tile to tile) and the change in position.
	 * 
	 * 3) You reset the stored change-in-pixels for the *other* column so it doesn't screw everything up by starting from a weird place
	 *     next time you start draggin *that* column.
	 * 
	 * So, what would we need if we were to expand this to all the columns?
	 * 
	 * -on initialization, calculate the sizeRatio for every column to every other (insane? only if there are like 20? which will not really happen...?)
	 * 
	 * There is one thing I've left out until now--the 'bigTileTop' value, which is for the scaler.  This will have to be calculated for every
	 *   non-manager column, if I'm reading the code below correctly.
	 * 
	 */


	// Something in here actually seems to "kick" the tiles into the right position...

	var widgetDragFunctions = {};
	var widgetStopFunctions = {};

	//for (var w = 0; w < widgets.length; w++) {
	for (name in widgets) {

	    // We have to build functions before calling draggable so that we are referring 
	    // to the proper variables/objects when events are actually triggered:

	    widgetDragFunctions[name] = function (event, ui) {
		var thisEventWidget = self.getWidgetWithSelector(ui.helper.attr('id'));

		thisEventWidget.setDragChange(defaults.wasMouseY - defaults.mouseY);

		/*
		 * secondsToPixels = seconds/pixels for each widget
		 * 
		 * so, if we want to figure out how many pixels move in other columns from this one,
		 * all we do is take the amount of pixels moved in this one, figure out how many seconds that represents:
		 * 
		 * thisEventWidget.secondsToPixels * getDragChange() = secondsMoved
		 * 
		 * ...and then we do the reverse to figure out the amount other columns should move: 
		 * 
		 * otherEventWidget.secondsToPixels / secondsMoved = pixelsToMove
		 * 
		 * and then change it:
		 * 
		 * otherEventWidget.setTop(pixelsToMove)
		 * 
		 * 
		 */

		var secondsMoved = thisEventWidget.getSecondsToPixels() * thisEventWidget.getDragChange();
		var pixelsToMove = 0;

		$("#dataMonitor #secondsToPixels span.data").html(thisEventWidget.getSecondsToPixels());
		$("#dataMonitor #dragChange span.data").html(thisEventWidget.getDragChange());
		$("#dataMonitor #secondsMoved span.data").html(secondsMoved);

		for (name in widgets) {

		    if (thisEventWidget.getSelector() == widgets[name].getSelector()) {
			continue;
		    }

		    pixelsToMove = secondsMoved / widgets[name].getSecondsToPixels();
		    $("#dataMonitor #pixelsToMove span.data").html(name + ": " + pixelsToMove);

		    widgets[name].setTop(pixelsToMove);

		    // trying to figure out less costly algorithm for generating tiles...this ain't it...
//		    if (pixelsToMove > 50) {
			//widgets[name].checkTiles();
//		    }

		}

		defaults.wasMouseY = defaults.mouseY;  // Memory for mouse position
	    };

	    widgetStopFunctions[name] = function (event, ui) {

		var thisEventWidget = self.getWidgetWithSelector(ui.helper.attr('id'));

		for (name in widgets) {
		    widgets[name].checkTiles();
		}
	    };

	    var thisWidget = widgets[name];

 	    $(thisWidget.getSelector()).draggable({
						      axis: 'y',
						      drag: widgetDragFunctions[name],
						      stop: widgetStopFunctions[name]
						  });
	}

	for (blah in widgetDragFunctions) {
	    //alert(widgetDragFunctions[blah]);
	    //widgetDragFunctions[blah]();
	}

    };



    /*
     * 
     * Initiates (UI) events on individual (DateTime) events.
     * 
     * 
     */
    self.initiateEventEvents = function () {
	/* FORMERLY INTERACT */
	// global to timelineYears items:
	var eventID = '';

	var listCenterTop = 0;  // Is there any reason for this to be global?

	// Hovers on timeline years
	$("#timelineYears img").live("mouseover",
				     function() {
					 eventID = $(this).attr("id").replace('chart-','');
					 $(this).addClass("active");
					 
					 if ($(this).hasClass("nonResult")) {
					     $("#list-" + eventID).slideDown().addClass("tempDisplay");
					     return false;
					 }

					 $("#list-" + eventID).addClass("active");
				     });
	
	$("#timelineYears img").live("mouseout",
				     function() {
					 $(this).removeClass("active");

					 if ($(this).hasClass("nonResult")){
					     $("#list-" + eventID).slideUp().addClass("removeClass");
					     return false;
					 }

					 $("#list-" + eventID).removeClass("active");
				     });
    };


    self.mousePrePos = function () {
	$().mousemove(
	    function (e) {
		defaults.mouseX = e.pageX;
		defaults.mouseY = e.pageY;
	    });
    };



    /* placeEvents() SHOULD BE PUT IN ITS OWN CLASS? */

    /**
     *  placeEvents()
     *    accepts year value for year that needs to be tiled, and eventData containing...event data.
     * 
     */
    self.placeEvents = function (year) {

	// JSON - work in progress:
	// Temporary variables, turn over to options later
	var startDate = new Date('Jan 01, ' + year);
	var endDate   = new Date('Dec 31, ' + year);

	var thisTileEventData = dataModel.getItemsInRange(startDate, endDate);

	// Need to know where to place in dom? Then later, what height is dom?
	var listSelector = "#list-" + year;

	/* Globals referenced:
	 * 
	 * smallUnitSize
	 * bigUnitSize
	 * iconWidth
	 * yearWidth
	 * startYear
	 * imgUrl
	 * 
	 */

	// THESE WERE IN GLOBAL VARS FILE, BUT NOT NEEDED THERE
	// Initialize and set defaults for vars that exist outside of each() loop:
	var wasMonth    = 0;
	var wasDotCount = 0;
	var wasPosCount = 0;
	var switchDir   = false;

	var stop_flag = 0;

	$.each(thisTileEventData, 
	       function (i, item) {

		   // DATA STUFF --easy date functions w/one date object for all of these?
		   // well...this will be structured differently, the events will be pulled via JSON,
		   // and then this will be handled separately from tiling.
		   var yearDigit      = item.start.getFullYear().toString().substring(3);
		   var findDecade     = item.start.getFullYear().toString().substring(0, 3);
		   var thisMonth      = item.start.getMonth();
		   var thisDay        = item.start.getDate();
		   var monthLength    = 32 - new Date(thisDay, thisMonth, 32).getDate();

		   // MODEL STUFF
		   var topPosition    = (thisDay / monthLength) * defaults.smallUnitSize;  // GLOBAL
		   var leftPosition   = 0;

		   // Get placement for decade icons

		   // Amount to offset decade icon based on month
		   var monthOffset    = (thisMonth / 12) * defaults.bigUnitSize; // GLOBAL

		   // Additional amount to offset decade icon in addition to month
		   var dayOffset      = (thisDay / monthLength) * (defaults.bigUnitSize / 12);  // GLOBAL
		   var bigIconOffset  = monthOffset + dayOffset;

		   var selector       = "#year-" + year + " li." + thisMonth;
		   var decadeSelector = "#decade-" + findDecade + " li." + yearDigit;

		   // Store in DOM memory the dot count for each month -SHOULD BE STORED IN OBJECT?
		   if (thisMonth == wasMonth) {
		       wasDotCount += 1;
		   } else {
		       wasDotCount = 1; // Otherwise, reset to one
		   }

		   leftPosition = wasPosCount * defaults.iconWidth; // how far to indent?  GLOBAL

		   // If we're stacking to right
		   if (switchDir == false){
		       wasPosCount += 1; // Continue stacking

		       // But check the next stack
		       if ((wasPosCount + 1) * defaults.iconWidth >= defaults.yearWidth) {  // GLOBAL (*2)
			   switchDir = true; // And switch dirs if it overflows
		       }
		   } else if (switchDir == true) {   // If we're stacking to the left
		       wasPosCount -= 1; // Continue stacking

		       // But check the next stack
		       if ((wasPosCount) * defaults.iconWidth <= 0) {  // (Order of Operations here??)  GLOBAL
			   switchDir = false; // And switch dirs if it overflows
		       }
		   }

		   // STORAGE IN DOM...REPLACE!
		   $(selector).attr("alt", (wasDotCount)); // And store this value as the title

		   wasMonth = thisMonth; // And save / remember what this month is

		   // TEMPORARY DOT SIZE RANDOMIZATION - THIS SHOULD BE BASED ON METRICS
		   var dotSize = (Math.floor(Math.random() * 5) * 2) + 10;

		   // Place on the small Timeline
		   // Margin-Top centers the dot half way upward of its image height
		   $(selector).append(
		       "<img src='" + defaults.imgUrl + "img/t-50-s-" + dotSize + ".png'"
			   + " class='eDot " + dotSize + "'"
			   + " id='chart-" + (item.id) + "'"
			   + " style='position:absolute; z-index:3; left:" + leftPosition + "px;"
			   + " margin-top:-10px; top:" + topPosition + "px;' title=''"
			   + " alt='" + selector + "'/>"
		   );

		   // Place on the large timeline
		   // Margin-Top centers the dot half way upward of its image height
		   $(decadeSelector).append(
		       "<img src='" + defaults.imgUrl + "img/event-density.png'"
			   + " class='eDensity'"
			   + " id='density-" + (item.id) + "'"
			   + " style='position:absolute; z-index:3; width:100%; left:0;"
			   + " margin-top:-20px; top:" + bigIconOffset + "'px;' />"
		   );

		   // THE MARGIN TOP BEING -20PX IS QUESTIONABLE. IS THIS VALUE COMPENSATING FOR AN UNIDENTIFIED INDENTATION?
	       });
    };


    /*
     * Helper function for use with events:
     */
    self.getWidgetWithSelector = function (widgetSelectorName) {
	for (name in widgets) {
	    if (widgets[name].getSelector() == ("#" + widgetSelectorName)) {
		return widgets[name];
	    }
	}
	return false;
    };

    // end of model factory function
    return self;
};
