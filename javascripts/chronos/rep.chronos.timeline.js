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

    // DEFAULTS
    var defaults = {
	startDate:        'Jan 01, 1984 00:00:00',
	timelineDir:      'height',                        // What direction should this timeline be (options: height or width):
	timelineSize:     null,                            // -NEEDS INITIALIZATION
	tileOffset:       -2,                              // How many tiles back do we pull? (to precache upward)

	// THESE FOR (UI) EVENTS (initiateTileEvents)
	mouseY:           0,
	mouseX:           0,
	wasMouseY:        0,

	// Used by Scaler:
	perp:             'width'                          // What is the perpendicular?
    };


    // PUBLIC

    self.update = function() {
    };

    // See Private Defaults
    self.initialize = function() {

	// We used to start with mainSelector like this, but then when moving it to a jQuery plugin,
	// we have to add this because of all the code that assumes its existence.  CLEAN UP.
	mainSelector = "#" + mainSelector;


	// CHANGED FROM PARSEDFLOAT TO PARSEINT
	defaults.timelineSize    = parseInt($(mainSelector).css(defaults.timelineDir));  // Should be set vs. pulled from CSS?   Right now, 'timelineContainer' is set to 100%, so moves w/browser (sorta)


	// START BUILDING TIMELINE


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

/*  IN PROGRESS.
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
	 * Probably, the manager shouldn't be known at all by the widgets...
	 * but how to implement checkTiles if so?
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
     *  Initialize variables holding mouse position so initial calculations are correct.
     */
    self.mousePrePos = function () {
	$(document).mousemove(
	    function (e) {
		defaults.mouseX = e.pageX;
		defaults.mouseY = e.pageY;
	    });
    };


    /*
     * Helper function for use with tile events:
     */
    self.getWidgetWithSelector = function (widgetSelectorName) {
	for (name in widgets) {
	    if (widgets[name].getSelector() == ("#" + widgetSelectorName)) {
		return widgets[name];
	    }
	}
	return false;
    };


    /*
     * Initiates and sets proper behavior (proper synchronization during and when stopping) for dragging.
     */
    self.initiateTileEvents = function () {
	$(mainSelector).mousedown(
	    function() {
		defaults.wasMouseY = defaults.mouseY;
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
		    // if (pixelsToMove > 50) {
			//widgets[name].checkTiles();
		    //}

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


    /********************************************************************************************
     * SETTERS/GETTERS
     * 
     */

    self.getSize = function () {
	return defaults.timelineSize;
    };

    self.getDir = function () {
	return defaults.timelineDir;
    };

    self.getPerp = function () {
	return defaults.perp;
    };

    self.getMouseDiff = function () {
	return defaults.wasMouseY - defaults.mouseY;
    };

    self.updateMousePos = function () {
	defaults.wasMouseY = defaults.mouseY;
    };

    self.getMousePos = function () {
	return defaults.mouseY;
    };

    /* ADDED WHEN RE-BUILDING SCALER -DD, 03/02/10 */
    /* These two only used in scaler.  Can be replaced/removed at some point? */

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


    // end of model factory function
    return self;
};
