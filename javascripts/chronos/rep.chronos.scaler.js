/*
 * NOTE FOR NEW STRATEGY OF RE-SIZING
 * 
 * KEEP *ORIGINAL* VALUE OF TILE HEIGHTS AND USE WHEN RE-SIZING TO SET NEW HEIGHTS, THEN STORE NEW GENERATED VALUE...AND SO ON...
 * 
 * Algorithm for generating heights "evenly" for sub-interval HTML elements is the same on building tiles and resizing, but we always
 *   keep the calculated values in 'storage' for that element even if we are rounding up or down to generate *actual* pixel height,
 *   so our next calculation is more accurate at every step.
 * 
 */


repertoire.chronos.scaler = function(selector, options, timeline, widgets) {

    var self = repertoire.widget(selector, options);

    // default: no options specified
    options = options || {};


    // PRIVATE

    // See Private Defaults
    var defaults = {
	orientation:          'top',  // Many instances of top in this code should be using this variable, such that it can be changed to "left" later for horizontal use. !!!   // FOR SCALER
	origScalerSize:        0,
	oldSmallUnitSize:      null,  // Set variables for scaling / resizing calculations   NEEDS INIT?
	newSmallUnitSize:      null,  // NEEDS INIT?
	scalerSize:          null,  // Timeline Size / Full Year Tile x Year Block (from decade) / In half = scaler Height   NEEDS INIT
	scalerWidth:           null,  // NEEDS INIT
	newTop:                null,  // New top for scaling   NEEDS INIT
	oldTop:                null,  // Old top (memory) for scaling   NEEDS INIT?
	newScalerTop:          0,
	oldScalerTop:          0,
	oldScalerSize:         null,  // NEEDS INIT?
	newScalerSize:         null,  // NEEDS INIT?
	scaleRatio:            null,  // Will use this in a lot of our scaling calculations   NEEDS INIT
	correlateScaler:       0
    };

    var strippedSelector   = '';
    var scalerElement      = '';
    var innerScalerElement = '';
    var topArrow           = '';
    var botArrow           = '';

    var scalerWidgetTop    = 0; // was bigTileTop

    // This variable represents the timeline widget that we are *representing*, in terms of its proportional size, to the 'manager' widget.
    var scalerViewWidget   = widgets[options.scalerViewWidget] || null;  // Must be set


    // PUBLIC

    self.initialize = function () {

	// selector passed in has '#' in front...better way to do this?
	strippedSelector = selector.replace(/^#/, '');

	scalerElement = $('<div />').appendTo($(timeline.getSelector()));
	scalerElement.attr('id', strippedSelector);

	innerScalerElement = $('<div />').appendTo(scalerElement);
	innerScalerElement.attr('id', 'innerScaler');

	topArrow    = $('<div />').appendTo(innerScalerElement);
	topArrow.attr('id', 'topArrow');

	botArrow = $('<div />').appendTo(innerScalerElement);
	botArrow.attr('id', 'botArrow');

	if (timeline.getProperty('timelineDir') == 'height') {
	    defaults.orientation = 'top';
	} else if (timeline.getProperty('timelineDir') == 'width') {
	    defaults.orientation = 'left';
	}


	// DEFAULTS INITIALIZATION

	defaults.scalerWidth  = $(timeline.getManager().getSelector()).css(timeline.getProperty('perp'));

	// The timeline size divided by the proportion of seconds-to-pixels of the manager to seconds-to-pixels of the 'scaler view widget'
	//  (i.e. the widget we are representing in the scaler's little window):
	defaults.scalerSize = timeline.getProperty('timelineSize') / ( timeline.getManager().getSecondsToPixels() / scalerViewWidget.getSecondsToPixels() );

	defaults.newScalerTop = (parseInt(timeline.getProperty('timelineSize') / 2) - (defaults.scalerSize / 2));   // Half the timeline, minus half the scaler (to center it)
	defaults.oldScalerTop = defaults.newScalerTop;                                                                // Have a memory of old top

	// Scaler Size and Placement
	scalerElement.css(timeline.getProperty('timelineDir'), ( defaults.scalerSize + 'px'));       // Height
	scalerElement.css(timeline.getProperty('perp'), defaults.scalerWidth);                         // Width
	scalerElement.css(defaults.orientation, defaults.newScalerTop);                                // Top
	innerScalerElement.css(timeline.getProperty('timelineDir'), (defaults.scalerSize + 'px'));   // Height of innerScaler (copies scaler's height)

	// Set CorejQuery UI Resizability
	scalerElement.resizable({
				    handles: 'n, s',
				    start: function(event, ui)
				    {
					timeline.setProperty('wasMouseY', timeline.getProperty('mouseY'));
					origScaler = defaults.scalerSize;  // Used??
				    }
				});
    };


    /*
     *  Scaler event handling
     * 
     */
    self.initiateScalerEvents = function () {

	var previousScalerTop = parseFloat(scalerElement.css("top"));
	var currentScalerTop  = 0;
	var scalerPosChange   = 0;
	var resetScalerTop    = 0;

	var scalerDragStop    = function (event, ui) {
	    currentScalerTop = parseFloat(scalerElement.css("top"));

	    scalerPosChange = previousScalerTop - currentScalerTop;

	    // Re-center the Scaler
	    resetScalerTop   = (parseInt(timeline.getProperty('timelineSize') / 2) - (defaults.scalerSize / 2));   // Half the timeline, minus half the scaler (to center it)

	    scalerElement.animate(
		{ "top": (resetScalerTop + 'px') },
		500,
		function() {
		    innerScalerElement.removeClass("on");

		    // CHECK TILES/EVENTS!
		    // ...checkTiles();
		    // ...update();
		}
	    );

	    // Update top position for manager:
	    timeline.getManager().setTop( scalerPosChange * -1, true );

	    previousScalerTop = resetScalerTop;
	};

	scalerElement.draggable(
	    {
		axis: 'y',

		// Use dragstart to capture mouse position
		start: function(event, ui) {
		    innerScalerElement.addClass("on");
		},

		drag:  function(event, ui) {

		    // Update top position for all widgets:
		    var tmpManager = timeline.getManager();

		    tmpManager.setDragChange(timeline.getProperty('wasMouseY') - timeline.getProperty('mouseY'));

		    var secondsMoved = tmpManager.getSecondsToPixels() * tmpManager.getDragChange();
		    var pixelsToMove = 0;

		    for (name in widgets) {
			if (!widgets[name].isManager()) {
			    pixelsToMove = secondsMoved / widgets[name].getSecondsToPixels();
			    widgets[name].setTop(pixelsToMove * -1);
			}
		    }

		    $("#dataMonitor #secondsToPixels span.data").html(tmpManager.getSecondsToPixels());
		    $("#dataMonitor #dragChange span.data").html(tmpManager.getDragChange());
		    $("#dataMonitor #secondsMoved span.data").html(secondsMoved);
		    $("#dataMonitor #pixelsToMove span.data").html(name + ": " + pixelsToMove);

		    timeline.setProperty('wasMouseY', timeline.getProperty('mouseY'));  // Memory for mouse position
		},

		stop: scalerDragStop
	    });

	scalerElement.bind('resize',
			  function(event, ui) {
			      // Store reset scaler size so we can adjust on stop:
			      defaults.newScalerSize = parseFloat(scalerElement.css(timeline.getProperty('timelineDir')));

			      // Adjust 'innerScaler' element size to match, responsible for keeping arrows "synced:"
			      innerScalerElement.css(timeline.getProperty('timelineDir'), defaults.newScalerSize);
			  });

	scalerElement.bind('resizestop',
			  function(event, ui) {
			      // defaults.oldScalerSize = defaults.scalerSize;

			      // Now that we've stopped, reset the scaler size ("length").
			      // This also ensures that the functionality in scalerDragStop() works properly:
			      defaults.scalerSize = defaults.newScalerSize;

			      // Same thing as when we drag; re-center the scaler, and adjust position of manager widget to match:
			      scalerDragStop();
			  });

    };


    // end of model factory function
    return self;
};
