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
	startEdgeName:           'top',  // Many instances of top in this code should be using this variable, such that it can be changed to "left" later for horizontal use. !!!   // FOR SCALER
	topHandle:               'n',
	bottomHandle:            's',
        volumeDimensionName:     'width',
        volumeDimensionInvName:  'height',

	origScalerSize:          0,
	oldSmallUnitSize:        null,  // Set variables for scaling / resizing calculations   NEEDS INIT?
	newSmallUnitSize:        null,  // NEEDS INIT?
	scalerSize:              null,  // Timeline Size / Full Year Tile x Year Block (from decade) / In half = scaler Height   NEEDS INIT
	scalerWidth:             null,  // NEEDS INIT
	newTop:                  null,  // New top for scaling   NEEDS INIT
	oldTop:                  null,  // Old top (memory) for scaling   NEEDS INIT?
	newScalerTop:            0,
	oldScalerTop:            0,
	oldScalerSize:           null,  // NEEDS INIT?
	newScalerSize:           null,  // NEEDS INIT?
	scaleRatio:              null,  // Will use this in a lot of our scaling calculations   NEEDS INIT
	correlateScaler:         0
    };

    var strippedSelector   = '';
    var scalerElement      = '';
    var innerScalerElement = '';
    var topArrow           = '';
    var botArrow           = '';

    var scalerWidgetStart    = 0;

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

	if (timeline.getOrientation() == 'vertical') {
	    defaults.startEdgeName = 'top';
	    defaults.volumeDimensionName = 'width';
	    defaults.volumeDimensionInvName = 'height';
	} else if (timeline.getOrientation() == 'horizontal') {
	    defaults.startEdgeName = 'left';
	    defaults.volumeDimensionName = 'height';
	    defaults.volumeDimensionInvName = 'width';
	}


	// DEFAULTS INITIALIZATION

	defaults.scalerWidth  = $(timeline.getManager().getSelector()).css(defaults.volumeDimensionName);

	// The timeline size divided by the proportion of seconds-to-pixels of the manager to seconds-to-pixels of the 'scaler view widget'
	//  (i.e. the widget we are representing in the scaler's little window):
	defaults.scalerSize = timeline.getSize() / ( timeline.getManager().getSecondsToPixels() / scalerViewWidget.getSecondsToPixels() );

	defaults.newScalerTop = (parseInt(timeline.getSize() / 2) - (defaults.scalerSize / 2));   // Half the timeline, minus half the scaler (to center it)
	defaults.oldScalerTop = defaults.newScalerTop;                                                                // Have a memory of old top

	// Scaler Size and Placement
	scalerElement.css(defaults.volumeDimensionInvName, ( defaults.scalerSize + 'px'));       // Height
	scalerElement.css(defaults.volumeDimensionName, defaults.scalerWidth);                         // Width
	scalerElement.css(defaults.startEdgeName, ( defaults.newScalerTop + 'px'));                                // Top
	innerScalerElement.css(defaults.volumeDimensionInvName, (defaults.scalerSize + 'px'));   // Height of innerScaler (copies scaler's height)

	if (timeline.getOrientation() == 'vertical') {
	    defaults.topHandle    = 'n';
	    defaults.bottomHandle = 's';
	} else {
	    defaults.topHandle    = 'w';
	    defaults.bottomHandle = 'e';
	}


	// Set CorejQuery UI Resizability
	scalerElement.resizable(
	    {
		handles: defaults.topHandle + ', ' + defaults.bottomHandle,
		start: function(event, ui) {
		    timeline.updateMousePos();
		    origScaler = defaults.scalerSize;  // Used??
		}
	    }
	);

    };


    /*
     * Scaler event handling, includes movement of scaler itself, syncing with other widgets, resizing.
     * 
     *  This function is huge.  Needs to be cleaned up!
     * 
     */
    self.initiateScalerEvents = function () {

	var previousScalerTop = parseFloat(scalerElement.css(defaults.startEdgeName));
	var currentScalerTop  = previousScalerTop;
	var scalerPosChange   = 0;
	var resetScalerTop    = 0;
	var dragDirection     = null;


	// Initialize for all widgets as generating tiles may have changed this from widget initialization:
	for (name in widgets) {
	    widgets[name].resetStartPositionRatio();
	    widgets[name].resetEndPositionRatio();
	    // widgets[name].resize();
	}

	// Callback for stop event:
	var scalerStop    = function (event_type) {
	    currentScalerTop = parseFloat(scalerElement.css(defaults.startEdgeName));

	    scalerPosChange = previousScalerTop - currentScalerTop;

	    // Re-center the Scaler
	    resetScalerTop   = (parseInt(timeline.getSize() / 2) - (defaults.scalerSize / 2));   // Half the timeline, minus half the scaler (to center it)

            var animate_config = {};
	    animate_config[defaults.startEdgeName] = (resetScalerTop + 'px');

	    scalerElement.animate(
		animate_config,
		500,
		function() {
		    innerScalerElement.removeClass("on");
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
	    timeline.getManager().setStart( scalerPosChange * -1, true );

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
			widgets[name].setStart(pixelsToMove * -1, true);
		    }
		}

		// Make sure we have populated the tiles and events outside what's currently viewable:
		var datesTiled = widgets[name].checkTiles();

		for (var d = 0; d < datesTiled.length; d++) {
		    widgets[name].drawEvents(datesTiled[d]);
		}

		// This needs to be reset for all since movement will change ratio: 
		widgets[name].resetStartPositionRatio();
		widgets[name].resetEndPositionRatio();

	    }

	    previousScalerTop = resetScalerTop;
	};

	var axis = '';

	if (timeline.getOrientation() == 'vertical') {
	    axis = 'y';
	} else {
	    axis = 'x';
	}

	scalerElement.draggable(
	    {

		axis: axis,

		// Use dragstart to capture mouse position
		start: function(event, ui) {
		    innerScalerElement.addClass("on");
		},

		drag:  function(event, ui) {

		    // Update top position for all widgets:
		    var tmpManager = timeline.getManager();

		    tmpManager.setDragChange(timeline.getMouseDiff());

		    var secondsMoved = tmpManager.getSecondsToPixels() * tmpManager.getDragChange();
		    var pixelsToMove = 0;

		    for (name in widgets) {
			if (!widgets[name].isManager()) {
			    pixelsToMove = secondsMoved / widgets[name].getSecondsToPixels();
			    widgets[name].setStart(pixelsToMove * -1);
			}
		    }

		    // $("#dataMonitor #secondsToPixels span.data").html(tmpManager.getSecondsToPixels());
		    // $("#dataMonitor #dragChange span.data").html(tmpManager.getDragChange());
		    // $("#dataMonitor #secondsMoved span.data").html(secondsMoved);
		    // $("#dataMonitor #pixelsToMove span.data").html(name + ": " + pixelsToMove);

		    timeline.updateMousePos();
		},

		stop: function () { scalerStop( 'drag' ); }
	    });

	var topScalerDrag    = false;
	var bottomScalerDrag = false;

	$(".ui-resizable-" + defaults.bottomHandle).mousedown(
	    function () {
		bottomScalerDrag = true;
		// $("#dataMonitor #scalerPosDebug span.data").html('');
		// $("#dataMonitor #scalerPosDebug span.data").append('<br />timeline size: ' + timeline.getSize() + '<br />scalerViewWidget.getSize() = ' + scalerViewWidget.getSize() + '<br />scalerViewWidget.getStart() = ' + scalerViewWidget.getStart() + '<br />scalerViewWidget.getEndPositionRatio() = ' + scalerViewWidget.getStartPositionRatio());
	    }
	);

	$(".ui-resizable-" + defaults.topHandle).mousedown(
	    function () {
		topScalerDrag = true;
		// $("#dataMonitor #scalerPosDebug span.data").html('');
		// $("#dataMonitor #scalerPosDebug span.data").append('<br />timeline size: ' + timeline.getSize() + '<br />scalerViewWidget.getSize() = ' + scalerViewWidget.getSize() + '<br />scalerViewWidget.getStart() = ' + scalerViewWidget.getStart() + '<br />scalerViewWidget.getEndPositionRatio() = ' + scalerViewWidget.getEndPositionRatio());
	    }
	);

	$(".ui-resizable-" + defaults.bottomHandle).mouseup(
	    function () {
		bottomScalerDrag = false;
	    }
	);

	$(".ui-resizable-" + defaults.topHandle).mouseup(
	    function () {
		topScalerDrag = false;
	    }
	);

	scalerElement.bind('resizestart',
			  function(event, ui) {

			      $("#dataMonitor #initial span.data").html(
				  "<br />initial top: " + scalerViewWidget.getStart()
				      + ",<br /> initial size: " + scalerViewWidget.getSize()
				      + ", initial startPositionRatio: <br />" + scalerViewWidget.getStartPositionRatio()
				      + ",<br /> initial bottomPositionRatio: " + scalerViewWidget.getEndPositionRatio());


			      timeline.updateMousePos();

			      defaults.newScalerTop  = parseFloat($("#scaler").css(defaults.startEdgeName));

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
			      scalerPosChange = timeline.getMouseDiff();

			      // Store reset scaler size so we can adjust on stop:
			      defaults.newScalerSize = parseFloat(scalerElement.css(defaults.volumeDimensionInvName));

			      // Adjust 'innerScaler' element size to match, responsible for keeping arrows "synced:"
			      innerScalerElement.css(defaults.volumeDimensionInvName, (defaults.newScalerSize + 'px'));

			      $("#dataMonitor #stpOld span.data").html('newScalerSize = ' + defaults.newScalerSize + '<br />oldScalerSize = ' + defaults.oldScalerSize + '<br />old STP: ' + scalerViewWidget.getSecondsToPixels());

			      if ((defaults.newScalerSize - defaults.oldScalerSize) != 0) {
				  // $("#dataMonitor #changingStp span.data").html('true');
				  // First we adjust the scalerViewWidget since we need it for others:
				  scalerViewWidget.setSecondsToPixels(
				      timeline.getManager().getSecondsToPixels() * ( defaults.newScalerSize / timeline.getSize() )
				  );
			      } else {
				  // $("#dataMonitor #changingStp span.data").html('false');
			      }

			      $("#dataMonitor #stpNew span.data").html(scalerViewWidget.getSecondsToPixels());


			      $("#dataMonitor #preResize span.data").html(
				  "<br />current top: " + scalerViewWidget.getStart()
				      + ",<br />current size: " + scalerViewWidget.getSize()
				      + ",<br />startPositionRatio: " + scalerViewWidget.getStartPositionRatio()
				  //    + ",<br />newTop: " + newTop
				  // + ",<br />newTopChange: " + newTopChange,
				      + ",<br />bottomPositionRatio: " + scalerViewWidget.getEndPositionRatio());


			      if ((defaults.newScalerSize - defaults.oldScalerSize) != 0) {
				  scalerViewWidget.resize();
			      }


			      $("#dataMonitor #postResize span.data").html(
				  "<br />current top: " + scalerViewWidget.getStart()
				      + ",<br />current size: " + scalerViewWidget.getSize()
				      + ",<br />startPositionRatio: " + scalerViewWidget.getStartPositionRatio()
				   //   + ",<br />newTop: " + newTop
				      // + ",<br />newTopChange: " + newTopChange,
				      + ",<br />bottomPositionRatio: " + scalerViewWidget.getEndPositionRatio());


			      var newTop       = 0;  // for debugging more or less
			      var newTopChange = 0;

			      // Top scaler handle drag:
			      if (dragDirection == 'top') {
				  newTop = (scalerViewWidget.getEndPositionRatio() * (-1 * scalerViewWidget.getSize())) + timeline.getSize();
				  $("#dataMonitor #dragtype span.data").html('scaler top drag!  top/left pos for scalerViewWidget is now:' + scalerViewWidget.getStart());

			      // Bottom scaler handle drag:
			      } else if (dragDirection == 'bottom') {
				  newTop = (scalerViewWidget.getStartPositionRatio() * scalerViewWidget.getSize()) * -1;
				  $("#dataMonitor #dragtype span.data").html('scaler bottom drag!  top/left pos for scalerViewWidget is now:' + scalerViewWidget.getStart());
			      }

			      if (parseInt(newTop) != 0) {
				  //$("#dataMonitor #newtop span.data").html('gettig here? ' + newTop);
				  $(scalerViewWidget.getSelector()).css(defaults.startEdgeName, newTop + 'px');  // CSS CHANGE HERE
			      }

			      $("#dataMonitor #svw span.data").html(
				  "<br />current top: " + scalerViewWidget.getStart()
				      + ",<br />current size: " + scalerViewWidget.getSize()
				      + ",<br />startPositionRatio: " + scalerViewWidget.getStartPositionRatio()
				      + ",<br />newTop: " + newTop
				  // + ",<br />newTopChange: " + newTopChange,
				      + ",<br />bottomPositionRatio: " + scalerViewWidget.getEndPositionRatio());

			      // Makes things more complicated...
			      // scalerViewWidget.setStart(newTopChange);


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
					  newTopChangeW = ((widgets[name].getEndPositionRatio() * -1) * widgets[name].getSize()) + widgets[name].getStart();
                                      // Bottom scaler handle drag:
				      } else {
					  newTopW       = (widgets[name].getStartPositionRatio() * widgets[name].getSize());
					  // newTopChangeW = ((widgets[name].getStartPositionRatio() * -1) * widgets[name].getSize()) + widgets[name].getStart();
					  newTopChangeW = ((widgets[name].getStartPositionRatio() * -1) * widgets[name].getSize()) + widgets[name].getStart();
				      }

				      /*
					$("#dataMonitor #ow span.data").html(
					  "<br />current top: " + widgets[name].getStart()
					      + ",<br /> old bottom: " + timeline.getSize()
					      + ", startPositionRatio: <br />" + widgets[name].getStartPositionRatio()
					      + ",<br /> newTopW: " + newTopW
					      + ",<br /> newTopChangeW: " + newTopChangeW);
				      */

				      // widgets[name].setStart(newTopChangeW);
				  }

			      }

			      defaults.oldScalerTop  = defaults.newScalerTop;
			      defaults.oldScalerSize = defaults.newScalerSize;

			      timeline.updateMousePos();
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
