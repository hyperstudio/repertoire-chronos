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

/*
 * Model class for Chronos Timeline
 * 
 */

//= require <jquery>
//= require "rep.widgets/global"
//= require "rep.widgets/widget"
//= require "rep.chronos.global"

repertoire.chronos.timelineScaler = function(selector, options, timelineWidget) {

    var self = repertoire.widget(selector, options);

    // default: no options specified
    options = options || {};


    // PRIVATE
    var thisTimelineWidget = timelineWidget;

    // See Private Defaults
    var defaults = {
	timelineOrientation:  'top',  // Many instances of top in this code should be using this variable, such that it can be changed to "left" later for horizontal use. !!!   // FOR SCALER
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


    // PUBLIC

    self.update = function() {
    };

    /**
     *  Globals used:
     *   newScalerTop
     *   oldScalerTop
     *   timelineSize
     *   timelineDir
     *   scalerLength
     *   perp
     *   timelineOrientation
     *   wasMouseY
     *   mouseY
     *   origScaler (variable not used?)
     * 
     */
    self.initialize = function () {
	defaults.oldSmallUnitSize = thisTimelineWidget.getProperty('smallUnitSize');                                  // Set variables for scaling / resizing calculations   NEEDS INIT?
	defaults.newSmallUnitSize = defaults.oldSmallUnitSize;                               // NEEDS INIT?

        // Timeline Size / Full Year Tile x Year Block (from decade) / In half = scaler Height   NEEDS INIT
	defaults.scalerWidth      = $("#timelineDecades").css(thisTimelineWidget.getProperty('perp'));
	defaults.scalerLength     = (thisTimelineWidget.getProperty('timelineSize') / thisTimelineWidget.getProperty('smallTileSize') * thisTimelineWidget.getProperty('bigUnitSize'));
	defaults.newTop           = thisTimelineWidget.getProperty('tileOffset') * thisTimelineWidget.getProperty('smallTileSize') - (thisTimelineWidget.getProperty('smallTileSize') / 2); // New top for scaling
	defaults.oldTop           = defaults.newTop;                                         // Old top (memory) for scaling   NEEDS INIT?
	defaults.oldScalerSize    = defaults.scalerLength;                                   // NEEDS INIT?
	defaults.newScalerSize    = defaults.oldScalerSize;                                  // NEEDS INIT?
	defaults.scaleRatio       = defaults.oldScalerSize/defaults.newScalerSize;                    // Will use this in a lot of our scaling calculations   NEEDS INIT


	// SCALER INITIAL SETTINGS

	// Calculate and store original "top" positionings (and center of timeline)
	//halfTimeline = parseInt(thisTimelineWidget.getProperty('timelineSize') / 2); // parseInt is necessary for consistent rounding
	defaults.newScalerTop = (parseInt(thisTimelineWidget.getProperty('timelineSize') / 2) - (defaults.scalerLength/2));   // Half the timeline, minus half the scaler (to center it)
	defaults.oldScalerTop = defaults.newScalerTop;                                    // Have a memory of old top

	// Scaler Size and Placement
	$("#scaler").css(thisTimelineWidget.getProperty('timelineDir'), (defaults.scalerLength + 'px'));       // Height
	$("#scaler").css(thisTimelineWidget.getProperty('perp'), defaults.scalerWidth);                        // Width
	$("#scaler").css(defaults.timelineOrientation, defaults.newScalerTop);        // Top
	$('#innerScaler').css(thisTimelineWidget.getProperty('timelineDir'), (defaults.scalerLength + 'px'));  // Height of innerScaler (copy scaler's height)
	
	// Set CorejQuery UI Resizability
	$('#scaler').resizable({
				   handles: 'n, s',
				   start: function(event, ui)
				   {
				       thisTimelineWidget.setProperty('wasMouseY', thisTimelineWidget.getProperty('mouseY'));
				       origScaler = defaults.scalerLength;  // Used??
				   }
			       });
    };


    /*
     *  Scaler event handling
     * 
     */
    self.initiateScalerEvents = function () {

	/* FORMERLY SCALER (except for first event...) */

	/*  snap:'.oneDecade li', */
	$("#scaler").draggable(
	    { 
		axis: 'y',

		// Use dragstart to capture mouse position
		start: function(event, ui) {
		    $("#innerScaler").addClass("on");
		},

		drag: function(event, ui) {
		    thisTimelineWidget.setProperty('correlateDecades', thisTimelineWidget.getProperty('correlateDecades') - (thisTimelineWidget.getProperty('wasMouseY') - thisTimelineWidget.getProperty('mouseY')));
		    
		    $('#timelineYears').css(
			{
			    "top": (thisTimelineWidget.getProperty('smallTileOffset') - (thisTimelineWidget.getProperty('correlateDecades') * thisTimelineWidget.getProperty('smallUnitBase')) / thisTimelineWidget.getProperty('sizeRatio')) + 'px'
			});
		    
		    thisTimelineWidget.setProperty('wasMouseY', thisTimelineWidget.getProperty('mouseY'));                                          // Set up a memory for mouse position
		    thisTimelineWidget.setProperty('correlateYears', (thisTimelineWidget.getProperty('correlateDecades') / thisTimelineWidget.getProperty('bigUnitSize')) * thisTimelineWidget.getProperty('smallTileSize'));  // Pass correlation data to correlateYears
		},

		stop: function(event, ui) {
		    // Recenter the Scaler and Decades
		    resetScalerTop   = (thisTimelineWidget.getProperty('timelineSize') - defaults.scalerLength) / 2;        // This should be the top for the scaler
		    currentScalerTop = parseFloat($("#scaler").css("top"));
		    
		    // Ongoing decade top value
		    thisTimelineWidget.setProperty('bigTileTop', thisTimelineWidget.getProperty('bigTileTop') + (resetScalerTop - currentScalerTop));
		    
		    $("#scaler").animate(
			{ "top": (resetScalerTop + 'px') },
			500,
			function() {
			    $("#innerScaler").removeClass("on");
			    thisTimelineWidget.checkTiles(); // Should we load more tiles / events?
			    thisTimelineWidget.update(); // Should we load more tiles / events?
			}
		    );
		    $("#timelineDecades").animate({"top": thisTimelineWidget.getProperty('bigTileTop')}, 500);
		}
	    });


	///////////// SCALER CALCULATIONS / BINDINGS
	// Bind functionality to the Top Scaler's Resizability
	$('#scaler').bind('resize',
			  function(event, ui) {

			      // Class it / highlight
			      $("#innerScaler").addClass("on");

			      // Reset the width because IE is buggy and trims off 1px each time.
			      $("#scaler").css(thisTimelineWidget.getProperty('perp'), defaults.scalerWidth);

			      // Detect mouse difference on scaler drag
			      defaults.correlateScaler += (thisTimelineWidget.getProperty('wasMouseY') - thisTimelineWidget.getProperty('mouseY'));

			      // Store the old small unit and scaler sizes before updating the new ones
			      defaults.oldScalerSize    = defaults.newScalerSize;
			      defaults.oldScalerTop     = defaults.newScalerTop;
			      defaults.oldSmallUnitSize = defaults.newSmallUnitSize;
			      
  			      // Get and set a fraction of the new scaler size to the old
			      defaults.newScalerSize = parseFloat($('#scaler').css(thisTimelineWidget.getProperty('timelineDir')));
			      defaults.scaleRatio    = defaults.oldScalerSize / defaults.newScalerSize;
			      
			      // Give innerScaler the same size as outer
			      $('#innerScaler').css(thisTimelineWidget.getProperty('timelineDir'), defaults.newScalerSize);
			      
			      // Get the new scaler top
			      defaults.newScalerTop = parseFloat($("#scaler").css("top"));
			      
			      /*
			       * CAN THIS TWEAKING BE ELIMINATED AS PART OF THE REFACTORING?
			       * extra pixel gets generated...needs to be reset?
			       * Brett sez: if you didn't use float math, it would be less smooth...much "fatter" numbers.
			       * Better to do float math and deal with consequences than try to not do float math, seems.
			       */

			      // The following section of code is to carry over decimal point rounding for Safari. Firefox wouldn't have needed it. IE Untested

			      // The following would have worked for Firefox, but Safari doesn't store px decimals, and thus does poor rounding
			      // $(".oneYear li").css("height", defaults.newSmallUnitSize);

			      defaults.newSmallUnitSize *= defaults.scaleRatio;   // Resize / Adjust the Small Units according to this fraction

			      $(".oneYear li").each(
				  function(i) {
				      var fixNewSmallUnitSize = parseInt(defaults.newSmallUnitSize); // set fix size to an integer
				      $(this).css("height", fixNewSmallUnitSize);          // assign height to the fix size
				      fixNewSmallUnitSize = defaults.newSmallUnitSize + (fixNewSmallUnitSize % 1);     // add the decimal remainder to the unit size for next time
				  });

			      thisTimelineWidget.setProperty('smallTileSize', thisTimelineWidget.getProperty('smallUnitBase') * defaults.newSmallUnitSize);

			      $(".oneYear").each(
				  function(i){
				      var fixSmallTileSize = parseInt(thisTimelineWidget.getProperty('smallTileSize')); // set fix size to an integer
				      $(this).css("height", fixSmallTileSize); // assign height to the fix size
				      fixSmallTileSize = thisTimelineWidget.getProperty('smallTileSize') + (fixSmallTileSize % 1); // add the decimal remainder to the unit size for next time	
				  });

			      // Re-center the Small Timeline now that it has grown or shrunk
			      defaults.oldTop  = parseFloat($("#timelineYears").css("top"));  // WE MUST FIND A WAY TO STORE / RECALL THIS VALUE ... LEAKING TOP POSITIONING
			      defaults.oldTop -= (thisTimelineWidget.getProperty('timelineSize') / 2);                            // remove centering before we do fraction calculation
			      defaults.newTop  = (defaults.oldTop * defaults.scaleRatio) + (thisTimelineWidget.getProperty('timelineSize') / 2);    // the Old Offset x Scale Ratio + half the timeline screen (for centering)

			      // If top slider moved, offset the centering one way
			      if (defaults.oldScalerTop != defaults.newScalerTop) {
				  var scalerTopDiff  = (defaults.oldScalerTop - defaults.newScalerTop)/2; // (divide by two because we're only sliding one direction)
				  var scalerFraction = scalerTopDiff / thisTimelineWidget.getProperty('bigUnitSize');
			      }
			      // Else, if bottom slider moved, offset the centering the other way
			      else {
				  var scalerSizeDiff = (defaults.oldScalerSize - defaults.newScalerSize)/2; // (divide by two because we're only sliding one direction)
				  var scalerFraction = scalerSizeDiff / thisTimelineWidget.getProperty('bigUnitSize');
			      }

			      defaults.newTop += (scalerFraction * thisTimelineWidget.getProperty('smallTileSize')); // Timeline scaler offset
  			      $("#timelineYears").css("top", defaults.newTop);
			      
			      // Adjust the dot position for each event, now that the LI has resized
			      $(".eDot").each(
				  function (i) {
				      var adjusted  = parseFloat($(this).css("top"));
				      adjusted     *= defaults.scaleRatio;
				      $(this).css("top", adjusted);
				  });

			      // reset the mouseY each move
			      thisTimelineWidget.setProperty('wasMouseY', thisTimelineWidget.getProperty('mouseY'));
			  });

	// After resizing ends, center and report variables
	$('#scaler').bind('resizestop',
			  function(event, ui) {
			      // Reset correlation data to zero
			      thisTimelineWidget.setProperty('correlateDecades', 0);

  			      // Recenter the Scaler and Decades
			      defaults.scalerLength    = defaults.newScalerSize;
			      var resetScalerTop  = (thisTimelineWidget.getProperty('timelineSize') - defaults.scalerLength) / 2;            // This should be the top for the scaler
			      var scalerTopDiff   = defaults.newScalerTop - resetScalerTop;                // This is the difference from it's previous top
			      var decadesTop      = parseFloat($("#timelineDecades").css("top"));
			      decadesTop         -= scalerTopDiff;
			      decadesTop          = decadesTop + "px";                            // Need this line to make it a string?
			      defaults.newScalerTop        = resetScalerTop;

			      $("#scaler").animate(
				  { "top": (resetScalerTop + 'px') },
				  500,
				  function() {
				      $("#innerScaler").removeClass("on");
				      thisTimelineWidget.checkTiles(); // Should we load more tiles / events? Check after animation is done (loading reasons)
				      thisTimelineWidget.update(); // Should we load more tiles / events?
				  });

			      $("#timelineDecades").animate({"top": decadesTop}, 500);

			      // Report final variables
			      thisTimelineWidget.setProperty('smallTileOffset', defaults.newTop);
			      thisTimelineWidget.setProperty('smallUnitSize', parseFloat($(".oneYear li").css(thisTimelineWidget.getProperty('timelineDir'))));
			      thisTimelineWidget.setProperty('bigUnitSize', parseFloat($(".oneDecade li").css(thisTimelineWidget.getProperty('timelineDir'))));
			      thisTimelineWidget.setProperty('sizeRatio', thisTimelineWidget.getProperty('bigUnitSize') / thisTimelineWidget.getProperty('smallUnitSize'));

			      // Don't get the below via css, as animation may not be done
			      thisTimelineWidget.setProperty('bigTileOffset', parseFloat(decadesTop));
			      thisTimelineWidget.setProperty('bigTileTop', thisTimelineWidget.getProperty('bigTileOffset'));
			      thisTimelineWidget.setProperty('smallTileOffset', defaults.newTop);

			      // Adjust correlated values so that the timeline doesn't jump
			      defaults.scaleRatio        = defaults.origScalerSize / defaults.scalerLength;
			      thisTimelineWidget.setProperty('correlateYears', thisTimelineWidget.getProperty('correlateYears') * defaults.scaleRatio);
			      thisTimelineWidget.setProperty('correlateDecades', thisTimelineWidget.getProperty('correlateDecades') * defaults.scaleRatio);
			  });
    };


    // end of model factory function
    return self;
};


/*  NOTES

    thisTimelineWidget.getUrl()
    thisTimelineWidget.getImgUrl()
    thisTimelineWidget.getPerp()
    thisTimelineWidget.getTileOffset()
    thisTimelineWidget.getTimelineDir()
    thisTimelineWidget.getTimelineSize()
    thisTimelineWidget.getSmallUnitBase()
    thisTimelineWidget.getMouseY()

    thisTimelineWidget.getSmallUnitSize()
    thisTimelineWidget.getBigUnitSize()
    thisTimelineWidget.getSmallTileSize()
    thisTimelineWidget.getSmallTileOffset()
    thisTimelineWidget.getBigTileOffset()
    thisTimelineWidget.getBigTileTop()
    thisTimelineWidget.getSizeRatio()
    thisTimelineWidget.getCorrelateYears()
    thisTimelineWidget.getCorrelateDecades()
    thisTimelineWidget.getWasMouseY()

    // Need setters too
    thisTimelineWidget.setSmallUnitSize()
    thisTimelineWidget.setBigUnitSize()
    thisTimelineWidget.setSmallTileSize()
    thisTimelineWidget.setSmallTileOffset()
    thisTimelineWidget.setBigTileOffset()
    thisTimelineWidget.setBigTileTop()
    thisTimelineWidget.setSizeRatio()
    thisTimelineWidget.setCorrelateYears()
    thisTimelineWidget.setCorrelateDecades()
    thisTimelineWidget.setWasMouseY()
*/
