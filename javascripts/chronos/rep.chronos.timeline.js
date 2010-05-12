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

    var widgets       = {};    // Widgets inside timeline.
    var managerWidget = null;  // Store this so we don't have to keep looping through widgets collection
    var eventList     = null;  // Event listing widget

    // DEFAULTS
    var defaults = {
	startDate:           options['startDate']   || 'Jan 01, 1984 00:00:00',
	orientation:         options['orientation'] || 'vertical',   // What direction should this timeline be (options: vertical or horizontal):
        volumeDimensionVal:  350,
	timelineSize:        null,                            // -NEEDS INITIALIZATION
	tileOffset:          -2,                              // How many tiles back do we pull? (to precache upward)

	// THESE FOR (UI) EVENTS (initiateTileEvents)
	mouseY:              0,
	mouseX:              0,
	wasMouseY:           0,
	wasMouseX:           0
    };


    // PUBLIC

    self.update = function() {
    };

    // See Private Defaults
    self.initialize = function() {

	// We used to start with mainSelector like this, but then when moving it to a jQuery plugin,
	// we have to add this because of all the code that assumes its existence.  CLEAN UP.
	mainSelector = "#" + mainSelector;
	$(mainSelector).addClass('chronos_' + defaults.orientation);

	// DIRECTIONALITY HERE!

	// Should be set vs. pulled from CSS?   Right now, 'timelineContainer' is set to 100%, so moves w/browser (sorta)
	if (defaults.orientation == 'vertical') {
	    $(mainSelector).width(defaults.volumeDimensionVal + 'px');
	    defaults.timelineSize = parseInt($(mainSelector).css('height'));
	} else {
	    $(mainSelector).height(defaults.volumeDimensionVal + 'px');
	    defaults.timelineSize = parseInt($(mainSelector).css('width'));
	}


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
							     volumePercentage:    '20',
							     widgetSelector:      '#timelineMonths',
							     intervalName:        'month',
							     subIntervalName:     'day',
							     isManager:           false,
						             intervalsVisible:    .5,
							     eventViewType:       'icon'
							 }, dataModel);
*/

	//  And here create event list for the side:
	eventList = repertoire.chronos.eventListWidget(mainSelector, {
							   startDate:        defaults.startDate,
							   volumeSize:       '300',
							   widgetSelector:   '#eventList'
						       }, dataModel);


	/*
	 * First we have to figure out the 'manager' secondsToPixels value.
	 * Then we set it for each of the other columns.
	 * Probably, the manager shouldn't be known at all by the widgets...
	 * but how to implement checkTiles if so?
	 */
	var managerStP = 0;

	managerWidget = self.getManager();

	managerWidget.initialize(defaults.timelineSize, defaults.orientation);
	managerStP = widgets[name].getSecondsToPixels();

	// We loop again to set managerStP...better way to do this?
	for (name in widgets) {
	    if (!widgets[name].isManager()) {
		widgets[name].setManagerStP(managerStP);
		widgets[name].initialize(defaults.timelineSize, defaults.orientation);
		widgets[name].initiateEventItemInteraction(event_icon_callback);
	    }
	}

	self.initiateTileEvents();

 	var scaler = repertoire.chronos.scaler('#scaler',{ scalerViewWidget: 'yearsWidget' }, self, widgets);
	scaler.initialize();
	scaler.initiateScalerEvents();

	eventList.initialize(defaults.timelineSize, defaults.orientation);
	eventList.initiateListUIEvents(event_list_callback);

	self.initializeTags();
    };


    var event_icon_callback = function () {
	// Get rid of all the old highlighted ones first:
	$('.highlight_event').removeClass('highlight_event');
	$(this).addClass('highlight_event');

	eventList.scrollToEvent($(this).attr('id').replace(/^event-/, ''));
	return false;  // if I don't have this it is run twice?
    };


    var event_list_callback = function () {
	// Get rid of all the old highlighted ones first:
	$('.highlight_event').removeClass('highlight_event');
	$('.highlight_event_li').removeClass('highlight_event_li');

	$(this).addClass('highlight_event_li');

	var thisDatetimeEvent = dataModel.getEventWithID($(this).attr('id'));
	if (thisDatetimeEvent) {
	    for (name in widgets) {
		// 1) get date for top/left position of widget
		// 2) find second difference (pos/neg) between top/left position of widget and date for event that was clicked on
		var startMove = (dataModel.getIntervalInSeconds(widgets[name].getStartDate(), thisDatetimeEvent.start) / widgets[name].getSecondsToPixels()) - (defaults.timelineSize / 2);

		// 3) update top position of widget with that value (animate)
		widgets[name].setStart(startMove, true);
	    }

	    $('#event-' + thisDatetimeEvent.id).addClass('highlight_event');

	} else {
	    alert('failed?');
	}
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
	$(mainSelector).mousedown( self.updateMousePos );

	// Something in here actually seems to "kick" the tiles into the right position...

	var widgetDragFunctions = {};
	var widgetStopFunctions = {};

	for (name in widgets) {

	    // We have to build functions before calling draggable so that we are referring 
	    // to the proper variables/objects when events are actually triggered:

	    widgetDragFunctions[name] = function (event, ui) {
		var thisEventWidget = self.getWidgetWithSelector(ui.helper.attr('id'));

		thisEventWidget.setDragChange( self.getMouseDiff() );

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

		    widgets[name].setStart(pixelsToMove);

		    // trying to figure out less costly algorithm for generating tiles...this ain't it...
		    // if (pixelsToMove > 50) {
			//widgets[name].checkTiles();
		    //}
		}

		self.updateMousePos(); // Memory for mouse position
	    };

	    widgetStopFunctions[name] = function (event, ui) {

		var thisEventWidget = self.getWidgetWithSelector(ui.helper.attr('id'));

		for (name in widgets) {
		    // Bit of a hack but in here for now to make sure we are doing this at all...
		    // if it is in the above, then it slows things down dramatically.  Need new
		    // methodology.
		    var datesTiled = widgets[name].checkTiles();

		    // Need to do this every time after checking tiles for horizontal orientation:
		    if (defaults.orientation == 'horizontal') {
			widgets[name].setSize();
		    }

		    for (var d = 0; d < datesTiled.length; d++) {
			widgets[name].drawEvents(datesTiled[d]);
		    }

		    // This needs to be reset for all since movement will change ratio:
		    // (and it must happen after checkTiles(), since that will alter
		    //  the top and size of the the widget!)
		    widgets[name].resetStartPositionRatio();
		    widgets[name].resetEndPositionRatio();
		}
	    };

	    var thisWidget = widgets[name];

	    var draggable_config = {
		drag: widgetDragFunctions[name],
		stop: widgetStopFunctions[name]
	    };

	    if (defaults.orientation == 'vertical') {
		draggable_config['axis'] = 'y';
	    } else {
		draggable_config['axis'] = 'x';
	    }

 	    $(thisWidget.getSelector()).draggable( draggable_config );
	}
    };



    /**
     *  First attempt at tag viewing/manipulation
     */
    self.initializeTags = function () {
	var tags = dataModel.getTags();
	var tag_string = '';
	for (name in tags) {
	    tag_string = tag_string + " <a href='#' class='tag' id='" + name.replace(/ /g, '_') + "'>" + name + "</a> | ";
	}
	$('div#chronos_tags').append(tag_string);

	$('a.tag').click(
	    function () {
		$('a.tag').removeClass('highlight_event_tag');
		$(this).addClass('highlight_event_tag');

		$('img.eDot').removeClass('highlight_event');
		$('img.eDot').removeClass('highlight_event_tag');
		$('img.' + $(this).attr('id')).addClass('highlight_event');
		$('img.' + $(this).attr('id')).addClass('highlight_event_tag');

		$('li.eventListEvent').removeClass('highlight_event_tag');
		$('li.' + $(this).attr('id')).addClass('highlight_event_tag');
	    }
	);
    };



    /********************************************************************************************
     * SETTERS/GETTERS
     * 
     */

    self.getSize = function () {
	return defaults.timelineSize;
    };

    self.getOrientation = function () {
	return defaults.orientation;
    };

    self.getMouseDiff   = {};
    self.updateMousePos = {};
    self.getMousePos    = {};

    if (defaults.orientation == 'vertical') {
	self.getMouseDiff   = function () { return defaults.wasMouseY - defaults.mouseY; };
	self.updateMousePos = function () { defaults.wasMouseY = defaults.mouseY; };
	self.getMousePos    = function () { return defaults.mouseY; };
    } else {
	self.getMouseDiff   = function () { return defaults.wasMouseX - defaults.mouseX; };
	self.updateMousePos = function () { defaults.wasMouseX = defaults.mouseX; };
	self.getMousePos    = function () { return defaults.mouseX; };
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
