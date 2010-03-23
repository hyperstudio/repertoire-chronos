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

/*

 when resizing the scaler
 we change the relationship of the scaler to the 'scaler view widget' in terms of how much space
 should be represented in the 'scaler view widget' which corresponds to the space shown in the scaler
 fundamentally, we are just re-calculating the secondsToPixels value for the other widgets and regenerating/resizing those widgets

 -new values:

 each widget's secondsToPixels val
 also, intervalsVisible will change to fit new secondsToPixels...although may not need to tweak this...?

can we just save old secondsToPixels, multiply by new secondsToPixels, and then multiply the height of all the elements by that?
let's try and see!

the calculation to change secondsToPixels is:

the scaler is always using the same amount of seconds to pixels as manager widget.

so, the proportion of scaler seconds to pixels to widget seconds to pixels is same as manager seconds to pixels to widget seconds to pixels.

when we first generate the scaler, the size corresponds to what you can see in the 'scaler view widget'

so, when we change the scaler size, we use this same equation, but change which values we substitute:


	defaults.scalerSize = timeline.getProperty('timelineSize') / ( timeline.getManager().getSecondsToPixels() / scalerViewWidget.getSecondsToPixels() );

the variable instead is "scalerViewWidget.getSecondsToPixels()," so:

scalerViewWidget's newSecondsToPixels = ( timeline.getProperty('timelineSize') / timeline.getManager().getSecondsToPixels() ) * ( 1 / defaults.scalerSize );

and then the amount to change the currently rendered widget stuff by is:

oldSecondsToPixels / newSecondsToPixels

that's it?

No!

The problem is that this works for the scalerViewWidget, but not for any others.

So, we need a new equation for the other widgets.

the relative change in secondsToPixels value for the scalerViewWidget should be the same for the other widgets.

so, we can use this:


otherWidget.secondsToPixels ( scalerViewWidget.secondsToPixels / scalerViewWidget.oldSecondsToPixels ) = otherWidget.newSecondsToPixels

right?
   

*/

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
	var oldsVWTop         = scalerViewWidget.getTop();
	var oldsVWSize        = scalerViewWidget.getSize();
	var topPositionRatio  = (oldsVWTop * -1) / oldsVWSize;

	for (name in widgets) {
	    widgets[name].resetTopPositionRatio();
	}

	var scalerStop    = function (event_type) {
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

	    if (event_type == 'resize') {
		if (scalerPosChange < 1 && scalerPosChange > -1) {
		    scalerPosChange = ( defaults.oldScalerSize - defaults.scalerSize ) / 2;
		} else {
		    scalerPosChange = ( scalerPosChange / 2 );
		}
	    }

	    // Update top position for manager:
	    timeline.getManager().setTop( scalerPosChange * -1, true );

	    // We move the other widgets here if we are resizing, whereas for dragging scaler they move along with drag:
	    if (event_type == 'resize') {
		var secondsMoved = timeline.getManager().getSecondsToPixels() * scalerPosChange;
		var pixelsToMove = 0;

		for (name in widgets) {
		    if (!widgets[name].isManager()) {
			pixelsToMove = secondsMoved / widgets[name].getSecondsToPixels();
			widgets[name].setTop(pixelsToMove, true);
		    }
		}
	    }

	    // This needs to be reset since movement will change ratio: 
	    for (name in widgets) {
		widgets[name].resetTopPositionRatio();
	    }

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

		stop: function () { scalerStop( 'drag' ); }
	    });


	scalerElement.bind('resize',
			  function(event, ui) {

			      // previousScalerTop seems to be recorded between different *stop* events rather than during resize?
			      scalerPosChange = previousScalerTop - currentScalerTop;

			      // Store reset scaler size so we can adjust on stop:
			      defaults.newScalerSize = parseFloat(scalerElement.css(timeline.getProperty('timelineDir')));
			      defaults.newScalerTop  = parseFloat($("#scaler").css("top"));

			      // Adjust 'innerScaler' element size to match, responsible for keeping arrows "synced:"
			      innerScalerElement.css(timeline.getProperty('timelineDir'), defaults.newScalerSize);


			      // First we adjust the scalerViewWidget since we need it for others:
			      scalerViewWidget.setSecondsToPixels(
				  timeline.getManager().getSecondsToPixels() * ( defaults.newScalerSize / timeline.getProperty('timelineSize') )
			      );

			      scalerViewWidget.resize();

			      var newTop       = 0;  // for debugging more or less
			      var newTopChange = 0;

			      // Top scaler handle drag:
			      if (defaults.oldScalerTop != defaults.newScalerTop) {
				  newTopChange = (scalerViewWidget.getTopPositionRatio() * scalerViewWidget.getSize()) + (scalerViewWidget.getTop() + timeline.getProperty('timelineSize'));
			      // Bottom scaler handle drag:
			      } else {
				  newTop       = (scalerViewWidget.getTopPositionRatio() * scalerViewWidget.getSize());
				  newTopChange = ((scalerViewWidget.getTopPositionRatio() * -1) * scalerViewWidget.getSize()) + scalerViewWidget.getTop();
			      }

			      scalerViewWidget.setTop(newTopChange);

			      $("#dataMonitor #oldTop span.data").html(
				  "<br />current top: " + scalerViewWidget.getTop()
				      + ",<br /> old bottom: " + timeline.getProperty('timelineSize')
				      + ", topPositionRatio: <br />" + scalerViewWidget.getTopPositionRatio()
				      + ",<br /> newTop: " + newTop
				      + ",<br /> newTopChange: " + newTopChange);


			      // Then we process the rest of the widgets:

			      for (name in widgets) {

				  if ( !widgets[name].isManager() && (scalerViewWidget.getSelector() != widgets[name].getSelector()) ) {

				      widgets[name].setSecondsToPixels(
                            		  widgets[name].getSecondsToPixels() * (scalerViewWidget.getSecondsToPixels() / scalerViewWidget.getOldSecondsToPixels())
				      );

				      widgets[name].resize();

				      // Reset and re-use for other widgets
				      newTopChange = 0;

				      // Top scaler handle drag:
				      if (defaults.oldScalerTop != defaults.newScalerTop) {
					  // newTopChange = (scalerViewWidget.getTopPositionRatio() * scalerViewWidget.getSize()) + (scalerViewWidget.getTop() + timeline.getProperty('timelineSize'));
					  // Bottom scaler handle drag:
				      } else {
					  newTopChange = ((widgets[name].getTopPositionRatio() * -1) * widgets[name].getSize()) + widgets[name].getTop();
				      }

				      widgets[name].setTop(newTopChange);
				  }

			      }

			      defaults.oldScalerTop  = defaults.newScalerTop;
			      defaults.oldScalerSize = defaults.newScalerSize;

			  });

	scalerElement.bind('resizestop',
			  function(event, ui) {
			      defaults.oldScalerSize = defaults.scalerSize;

			      for (name in widgets) {
				  widgets[name].resetTopPositionRatio();
			      }

			      // Now that we've stopped, reset the scaler size ("length").
			      // This also ensures that the functionality in scalerDragStop() works properly:
			      defaults.scalerSize = defaults.newScalerSize;

			      // Same thing as when we drag; re-center the scaler, and adjust position of manager widget to match:
			      scalerStop( 'resize' );
			  });

    };


    // end of model factory function
    return self;
};
