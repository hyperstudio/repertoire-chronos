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
	var currentScalerTop  = previousScalerTop;
	var scalerPosChange   = 0;
	var resetScalerTop    = 0;
	var dragDirection     = null;

	// Initialize for all widgets as generating tiles may have changed this from widget initialization:
	for (name in widgets) {
	    widgets[name].resetTopPositionRatio();
	    widgets[name].getBottomPositionRatio();
	    widgets[name].resize();
	}

	// Callback for stop event:
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

		    // CHECK TILES/EVENTS!?
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

	    // For moving all the *other* widgets other than Manager and SVW:
	    if (event_type == 'resize') {
		var secondsMoved = timeline.getManager().getSecondsToPixels() * scalerPosChange;
		var pixelsToMove = 0;
	    }

	    /*
	     * Something here is not quite right; the *other* widget is 
	     * moving a bit too much and doesn't sync up after a resize.
	     * 
	     * However, it's better than it was before; clearly the other
	     * widgets need to be moved after a resize (vs. SVW).
	     * 
	     */
	    for (name in widgets) {

		if (event_type == 'resize') {
		    // We have to adjust the *other* widgets since they don't
		    // move nicely within scaler/scalerViewWidget proportions:
		    if ( !widgets[name].isManager() && (scalerViewWidget.getSelector() != widgets[name].getSelector()) ) {
			pixelsToMove = secondsMoved / widgets[name].getSecondsToPixels();
			widgets[name].setTop(pixelsToMove * -1, true);
		    }
		}

		// This needs to be reset for all since movement will change ratio: 
		widgets[name].resetTopPositionRatio();
		widgets[name].resetBottomPositionRatio();
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

		    // $("#dataMonitor #secondsToPixels span.data").html(tmpManager.getSecondsToPixels());
		    // $("#dataMonitor #dragChange span.data").html(tmpManager.getDragChange());
		    // $("#dataMonitor #secondsMoved span.data").html(secondsMoved);
		    // $("#dataMonitor #pixelsToMove span.data").html(name + ": " + pixelsToMove);

		    timeline.setProperty('wasMouseY', timeline.getProperty('mouseY'));  // Memory for mouse position
		},

		stop: function () { scalerStop( 'drag' ); }
	    });

	var topScalerDrag    = false;
	var bottomScalerDrag = false;

	$(".ui-resizable-s").mousedown(
	    function () {
		bottomScalerDrag = true;
		// $("#dataMonitor #scalerPosDebug span.data").html('');
		// $("#dataMonitor #scalerPosDebug span.data").append('<br />timeline size: ' + timeline.getProperty('timelineSize') + '<br />scalerViewWidget.getSize() = ' + scalerViewWidget.getSize() + '<br />scalerViewWidget.getTop() = ' + scalerViewWidget.getTop() + '<br />scalerViewWidget.getBottomPositionRatio() = ' + scalerViewWidget.getTopPositionRatio());
	    }
	);

	$(".ui-resizable-n").mousedown(
	    function () {
		topScalerDrag = true;
		// $("#dataMonitor #scalerPosDebug span.data").html('');
		// $("#dataMonitor #scalerPosDebug span.data").append('<br />timeline size: ' + timeline.getProperty('timelineSize') + '<br />scalerViewWidget.getSize() = ' + scalerViewWidget.getSize() + '<br />scalerViewWidget.getTop() = ' + scalerViewWidget.getTop() + '<br />scalerViewWidget.getBottomPositionRatio() = ' + scalerViewWidget.getBottomPositionRatio());
	    }
	);

	$(".ui-resizable-s").mouseup(
	    function () {
		bottomScalerDrag = false;
	    }
	);

	$(".ui-resizable-n").mouseup(
	    function () {
		topScalerDrag = false;
	    }
	);

	scalerElement.bind('resizestart',
			  function(event, ui) {
			       /*
			      $("#dataMonitor #initial span.data").html(
				  "<br />initial top: " + scalerViewWidget.getTop()
				      + ",<br /> initial size: " + scalerViewWidget.getSize()
				      + ", initial topPositionRatio: <br />" + scalerViewWidget.getTopPositionRatio()
				      + ",<br /> initial bottomPositionRatio: " + scalerViewWidget.getBottomPositionRatio());
			       */

			      timeline.setProperty('wasMouseY', timeline.getProperty('mouseY'));

			      defaults.newScalerTop  = parseFloat($("#scaler").css("top"));

			      // // $("#dataMonitor #scalerPosDebug span.data").html('defaults.newScalerTop = ' + defaults.newScalerTop + ', defaults.oldScalerTop = ' + defaults.oldScalerTop);

			      // if (parseInt(defaults.oldScalerTop) != parseInt(defaults.newScalerTop)) {
			      if (topScalerDrag) {
				  dragDirection = 'top';
			      } else if (bottomScalerDrag) {
				  dragDirection = 'bottom';
			      }

			  });

	scalerElement.bind('resize',
			  function(event, ui) {

			      // previousScalerTop seems to be recorded between different *stop* events rather than during resize?
			      // scalerPosChange = previousScalerTop - currentScalerTop;
			      scalerPosChange = timeline.getProperty('wasMouseY') - timeline.getProperty('mouseY');

			      // Store reset scaler size so we can adjust on stop:
			      defaults.newScalerSize = parseFloat(scalerElement.css(timeline.getProperty('timelineDir')));

			      // Adjust 'innerScaler' element size to match, responsible for keeping arrows "synced:"
			      innerScalerElement.css(timeline.getProperty('timelineDir'), defaults.newScalerSize);


			      // $("#dataMonitor #stpOld span.data").html('newScalerSize = ' + defaults.newScalerSize + '<br />oldScalerSize = ' + defaults.oldScalerSize + '<br />old STP: ' + scalerViewWidget.getSecondsToPixels());

			      if ((defaults.newScalerSize - defaults.oldScalerSize) != 0) {
				  // $("#dataMonitor #changingStp span.data").html('true');
				  // First we adjust the scalerViewWidget since we need it for others:
				  scalerViewWidget.setSecondsToPixels(
				      timeline.getManager().getSecondsToPixels() * ( defaults.newScalerSize / timeline.getProperty('timelineSize') )
				  );
			      } else {
				  // $("#dataMonitor #changingStp span.data").html('false');
			      }

			      // $("#dataMonitor #stpNew span.data").html(scalerViewWidget.getSecondsToPixels());

			      /*
				$("#dataMonitor #preResize span.data").html(
				  "<br />current top: " + scalerViewWidget.getTop()
				      + ",<br />current size: " + scalerViewWidget.getSize()
				      + ",<br />topPositionRatio: " + scalerViewWidget.getTopPositionRatio()
				      + ",<br />newTop: " + newTop
				      // + ",<br />newTopChange: " + newTopChange,
				      + ",<br />bottomPositionRatio: " + scalerViewWidget.getBottomPositionRatio());
			      */

			      if ((defaults.newScalerSize - defaults.oldScalerSize) != 0) {
				  scalerViewWidget.resize();
			      }

			      /*
			      $("#dataMonitor #postResize span.data").html(
				  "<br />current top: " + scalerViewWidget.getTop()
				      + ",<br />current size: " + scalerViewWidget.getSize()
				      + ",<br />topPositionRatio: " + scalerViewWidget.getTopPositionRatio()
				      + ",<br />newTop: " + newTop
				      // + ",<br />newTopChange: " + newTopChange,
				      + ",<br />bottomPositionRatio: " + scalerViewWidget.getBottomPositionRatio());
			      */

			      var newTop       = 0;  // for debugging more or less
			      var newTopChange = 0;

			      // Top scaler handle drag:
			      if (dragDirection == 'top') {
				  newTop = (scalerViewWidget.getBottomPositionRatio() * (-1 * scalerViewWidget.getSize())) + timeline.getProperty('timelineSize');
				  // $("#dataMonitor #dragtype span.data").html('scaler top drag!');
			      // Bottom scaler handle drag:
			      } else if (dragDirection == 'bottom') {
				  // $("#dataMonitor #dragtype span.data").html('scaler bottom drag!');
				  newTop = (scalerViewWidget.getTopPositionRatio() * scalerViewWidget.getSize()) * -1;
			      }

			      if (parseInt(newTop) != 0) {
				  // $("#dataMonitor #newtop span.data").html(newTop);
				  $(scalerViewWidget.getSelector()).css('top', newTop + 'px');  // CSS CHANGE HERE
			      }

			      /*
				$("#dataMonitor #svw span.data").html(
				  "<br />current top: " + scalerViewWidget.getTop()
				      + ",<br />current size: " + scalerViewWidget.getSize()
				      + ",<br />topPositionRatio: " + scalerViewWidget.getTopPositionRatio()
				      + ",<br />newTop: " + newTop
				      // + ",<br />newTopChange: " + newTopChange,
				      + ",<br />bottomPositionRatio: " + scalerViewWidget.getBottomPositionRatio());
			      */

			      // Makes things more complicated...
			      // scalerViewWidget.setTop(newTopChange);


			      // Then we process the rest of the widgets:

			      for (name in widgets) {

				  if ( !widgets[name].isManager() && (scalerViewWidget.getSelector() != widgets[name].getSelector()) ) {

				      widgets[name].setSecondsToPixels(
                            		  widgets[name].getSecondsToPixels() * (scalerViewWidget.getSecondsToPixels() / scalerViewWidget.getOldSecondsToPixels())
				      );

				      widgets[name].resize();

				      var newTopChangeW = 0;
				      var newTopW       = 0;

				      // Top scaler handle drag:
				      if (defaults.oldScalerTop != defaults.newScalerTop) {
					  newTopChangeW = ((widgets[name].getBottomPositionRatio() * -1) * widgets[name].getSize()) + widgets[name].getTop();
                                      // Bottom scaler handle drag:
				      } else {
					  newTopW       = (widgets[name].getTopPositionRatio() * widgets[name].getSize());
					  // newTopChangeW = ((widgets[name].getTopPositionRatio() * -1) * widgets[name].getSize()) + widgets[name].getTop();
					  newTopChangeW = ((widgets[name].getTopPositionRatio() * -1) * widgets[name].getSize()) + widgets[name].getTop();
				      }

				      /*
					$("#dataMonitor #ow span.data").html(
					  "<br />current top: " + widgets[name].getTop()
					      + ",<br /> old bottom: " + timeline.getProperty('timelineSize')
					      + ", topPositionRatio: <br />" + widgets[name].getTopPositionRatio()
					      + ",<br /> newTopW: " + newTopW
					      + ",<br /> newTopChangeW: " + newTopChangeW);
				      */

				      // widgets[name].setTop(newTopChangeW);
				  }

			      }

			      defaults.oldScalerTop  = defaults.newScalerTop;
			      defaults.oldScalerSize = defaults.newScalerSize;

			      timeline.setProperty('wasMouseY', timeline.getProperty('mouseY'));
			  });

	scalerElement.bind('resizestop',
			  function(event, ui) {
			      defaults.oldScalerSize = defaults.scalerSize;

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
