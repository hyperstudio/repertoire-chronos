/*
 * 
 * 
 * Brett would like for some additional data to be collected/stored if possible:
 * 
 *    -top of the viewport
 *    -middle of the viewport
 *    -bottom of the viewport
 *
 *    -date values that are at the specific positions of the viewport...will have to be recalculated every time
 * 
 *  For example, it would be good if you could click on a link *OUTSIDE* the timeline that triggered the movement of the timeline back to the event or year/decade tile.
 * 
 */

// $(document).ready(
$(window).load(
    function () {

	// Just for pulling JSON data...temporary until this is thought through completely...
	var dataStartYear = 1900;
	var dataEndYear   = 2000;

	var url           = "http://slebinos.mit.edu/dev/repertoire-chronos/";  // NEVER SET BY SCALER (JUST NEED GETTER)
	var imgUrl        = url + "javascripts/chronos/";            // NEVER SET BY SCALER (JUST NEED GETTER)


	// BUILD DATA MODEL:
	var thisModel = repertoire.chronos.model(
	    { url:    url + 'json.php',
	      params: {
		  url: "http://slebinos.mit.edu/us-iran/events.js?s=" + dataStartYear + "-01-01&e=" + dataEndYear + '-12-31'
		  // url: "http%3A%2F%2Fslebinos.mit.edu%2Fus-iran%2Fevents.js%3Fs%3D" + dataStartYear + "-01-01%26e%3D" + dataEndYear + '-12-31'
	      }
	    }
	);

	thisModel.initialize();  // Must be run to load data

	// BUILD TIMELINE:
	var mainSelector = "#timelineContainer";

 	var timeline = repertoire.chronos.timeline(mainSelector, null, thisModel);
	timeline.initialize();   // Must be called first: builds Timeline

/*
	alert(thisModel.getDateTimeConstant('year'));
	alert(thisModel.getDateTimeConstant('decade'));

 	var timelineScaler = repertoire.chronos.timelineScaler('#scaler', null, timeline);
	timelineScaler.initialize();
	timelineScaler.initiateScalerEvents();
*/

	// Make sure floats get reset, without sloppy markup
	// $('#timelineContainer').append('<div style="position:absolute; z-index:2; bottom:2px; right:5px;"><img src="' + imgUrl + 'img/hs-logo.png" alt="Built by HyperStudio" /></div><div class="clear"></div>');


	$("#timelineMonths").click(function(){
				       alert($(this).height());
				   });

    }
);
