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

    var widgets       = {};  // Widgets inside timeline.
    var managerWidget = null;  // Store this so we don't have to keep looping through widgets collection


    /* CARRIED OVER VARS */

    var defaults = {
	startDate:        'Jan 01, 1984 00:00:00',

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

    self.getManager = function () {
	// If we've already looped through and found this, just return this value.
	if (managerWidget != null) {
	    return managerWidget;
	}

	// ...otherwise we need to find the manager widget.
	for (name in widgets) {
	    if (widgets[name].isManager()) {
		managerWidget = widgets[name];
		return widgets[name];
	    }
	};

	return false;
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
							      volumePercentage:    '30',
							      widgetSelector:      '#timelineDecades',
							      intervalName:        'decade',
							      subIntervalName:     'year',
							      isManager:           true,
						              intervalsVisible:    .5,
							      eventViewType:       'density'
							  }, dataModel);

	widgets.yearsWidget = repertoire.chronos.widget(mainSelector, {
							    startDate:           defaults.startDate,
							    volumePercentage:    '70',
							    widgetSelector:      '#timelineYears',
							    intervalName:        'year',
							    subIntervalName:     'month',
							    isManager:           false,
						            intervalsVisible:    1,
							    eventViewType:       'icon'
							}, dataModel);

/*
	widgets.monthsWidget = repertoire.chronos.widget(mainSelector, {
							     startDate:           defaults.startDate,
							     volumePercentage:    '10',
							     widgetSelector:      '#timelineMonths',
							     intervalName:        'month',
							     subIntervalName:     'day',
							     isManager:           false,
						             intervalsVisible:    .5,
							     eventViewType:       'icon'
							 }, dataModel);
*/

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

	managerWidget = self.getManager();

	managerWidget.initialize(defaults.timelineSize, defaults.timelineDir);
	managerStP = widgets[name].getSecondsToPixels();

	// We loop again to set managerStP...better way to do this?
	for (name in widgets) {
	    if (!widgets[name].isManager()) {
		widgets[name].setManagerStP(managerStP);
		widgets[name].initialize(defaults.timelineSize, defaults.timelineDir);
	    }
	}

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

	// Something in here actually seems to "kick" the tiles into the right position...

	var widgetDragFunctions = {};
	var widgetStopFunctions = {};

	for (name in widgets) {

	    // We have to build functions before calling draggable so that we are referring 
	    // to the proper variables/objects when events are actually triggered:

	    widgetDragFunctions[name] = function (event, ui) {
		var thisEventWidget = self.getWidgetWithSelector(ui.helper.attr('id'));

		thisEventWidget.setDragChange(defaults.wasMouseY - defaults.mouseY);

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
		    // Bit of a hack but in here for now to make sure we are doing this at all...
		    // if it is in the above, then it slows things down dramatically.  Need new
		    // methodology.
		    widgets[name].checkTiles();

		    // This needs to be reset for all since movement will change ratio:
		    // (and it must happen after checkTiles(), since that will alter
		    //  the top and size of the the widget!)
		    widgets[name].resetTopPositionRatio();
		    widgets[name].resetBottomPositionRatio();
		}
	    };

	    var thisWidget = widgets[name];

 	    $(thisWidget.getSelector()).draggable({
						      axis: 'y',
						      drag: widgetDragFunctions[name],
						      stop: widgetStopFunctions[name]
						  });
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
