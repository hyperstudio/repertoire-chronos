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
	scalerLength:          null,  // Timeline Size / Full Year Tile x Year Block (from decade) / In half = scaler Height   NEEDS INIT
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

	defaults.scalerWidth      = $(timeline.getManager().getSelector()).css(timeline.getProperty('perp'));
	defaults.scalerLength     = timeline.getProperty('timelineSize') / 5;  // Rough approximation for now...

	// defaults.scalerLength     = (timeline.getProperty('timelineSize') / ***timeline.getProperty('smallTileSize')*** * ***timeline.getProperty('bigUnitSize'));

	defaults.newScalerTop = (parseInt(timeline.getProperty('timelineSize') / 2) - (defaults.scalerLength / 2));   // Half the timeline, minus half the scaler (to center it)
	defaults.oldScalerTop = defaults.newScalerTop;                                                                // Have a memory of old top

	// Scaler Size and Placement
	scalerElement.css(timeline.getProperty('timelineDir'), ( defaults.scalerLength + 'px'));       // Height
	scalerElement.css(timeline.getProperty('perp'), defaults.scalerWidth);                         // Width
	scalerElement.css(defaults.orientation, defaults.newScalerTop);                                // Top
	innerScalerElement.css(timeline.getProperty('timelineDir'), (defaults.scalerLength + 'px'));   // Height of innerScaler (copies scaler's height)

	// Set CorejQuery UI Resizability
	scalerElement.resizable({
				    handles: 'n, s',
				    start: function(event, ui)
				    {
					timeline.setProperty('wasMouseY', timeline.getProperty('mouseY'));
					origScaler = defaults.scalerLength;  // Used??
				    }
				});
    };


    /*
     *  Scaler event handling
     * 
     */
    self.initiateScalerEvents = function () {

	scalerElement.draggable(
	    {
		axis: 'y',

		start: function(event, ui) {
		},

		drag:  function(event, ui) {

/*
		    // thisEventWidget.setDragChange();

		    timeline.setProperty('correlateDecades', timeline.getProperty('correlateDecades') - (timeline.getProperty('wasMouseY') - timeline.getProperty('mouseY')));


		    $('#timelineYears').css(
			{
			    "top": (timeline.getProperty('smallTileOffset') - (timeline.getProperty('correlateDecades') * timeline.getProperty('smallUnitBase')) / timeline.getProperty('sizeRatio')) + 'px'
			});

		    // Set up a memory for mouse position
		    timeline.setProperty('wasMouseY', timeline.getProperty('mouseY'));

		    // Pass correlation data to correlateYears
		    timeline.setProperty('correlateYears', (timeline.getProperty('correlateDecades') / timeline.getProperty('bigUnitSize')) * timeline.getProperty('smallTileSize'));
*/
		},

		stop:  function(event, ui) {

		    // Recenter the Scaler and Decades
		    resetScalerTop   = (timeline.getProperty('timelineSize') - defaults.scalerLength) / 2;        // This should be the top for the scaler
		    currentScalerTop = parseFloat(scalerElement.css("top"));

		    // Ongoing decade top value

		    // ********
		    scalerWidgetTop = scalerWidgetTop + (resetScalerTop - currentScalerTop);

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

		    // Should be animating all of them?
		    $(timeline.getManager().getSelector()).animate({"top": scalerWidgetTop}, 500);
		}
	    });
    };


    // end of model factory function
    return self;
};
