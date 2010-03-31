/*
 * jQuery plugin wrapper for Chronos framework. 
 * 
 */


(function($) {

     $.fn.chronos = function(settings) {
	 var config = {};

	 if (settings) $.extend(config, settings);

	 this.each(
	     function() {

		 $this = $(this);

		 // Just for pulling JSON data...temporary until this is thought through completely...
		 var dataStartYear = 1900;
		 var dataEndYear   = 2000;

		 var url           = "http://slebinos.mit.edu/dev/repertoire-chronos/";  // NEVER SET BY SCALER (JUST NEED GETTER)
		 var imgUrl        = url + "javascripts/chronos/";            // NEVER SET BY SCALER (JUST NEED GETTER)

		 var modelOptions       = {};
		 modelOptions['params'] = {};

		 if (settings != null) {
		     if (settings.url != null) {
			 modelOptions.params['url'] = settings.url;
		     }

		     if (settings.data_start != null) {
		       modelOptions['data_start'] = settings.data_start;
		     }

		     if (settings.id_name != null) {
		       modelOptions['id_name'] = settings.id_name;
		     }

		     if (settings.title_name != null) {
		       modelOptions['title_name'] = settings.title_name;
		     }

		     if (settings.date_name != null) {
		       modelOptions['date_name'] = settings.date_name;
		     }

		     if (settings.dateFormat != null) {
			 modelOptions['dateFormat'] = settings.dateFormat;
		     } else {
			 // modelOptions['dateFormat'] = dateFormat: 'yyyy-MM-ddTHH:mm:ss-04:00', // can't figure out format specifier for '-04:00' ?
		     }
		 } else {
		     modelOptions.params['url'] = "http://slebinos.mit.edu/us-iran/events.js?s=" + dataStartYear + "-01-01&e=" + dataEndYear + '-12-31';
		 }

		 modelOptions['url'] = url + 'json.php';


		 // BUILD DATA MODEL:
		 var thisModel = repertoire.chronos.model(modelOptions);
		 thisModel.initialize();  // Must be run to load data


		 // BUILD TIMELINE:

 		 var timeline = repertoire.chronos.timeline($this.attr('id'), null, thisModel);  // slightly retarded since we turn this back into a jQuery object, but whatever...
		 timeline.initialize();   // Must be called first: builds Timeline

		 // Make sure floats get reset, without sloppy markup
		 $this.append('<div style="position:absolute; z-index:2; bottom:2px; right:5px;"><img src="' + imgUrl + 'img/hs-logo.png" alt="Built by HyperStudio" /></div><div class="clear"></div>');


		 // If IE, we need to be capable of delivering different styles
		 if ( $.browser.msie ) {
		     $this.addClass("ie");
		 }

		 $('img.eDot').click(
		     function (index, element) {
			 $('div#eventListing span.data').html('<br /><br />id: ' + $(this).attr('id') + '<br />title: ' + $(this).attr('title') + '<br />date: ' + $(this).attr('date') + '<br />style: ' + $(this).attr('style') + '<br />');
		     }
		 );
	     }
	 );

	 return this;
     };
 })(jQuery);
