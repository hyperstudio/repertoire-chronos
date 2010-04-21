/*
 * jQuery plugin wrapper for Chronos framework. 
 * 
 */

(function($) {

     $.fn.chronos = function(settings) {
	 var config = {};

	 if (settings) $.extend(config, settings);

	 if (config.url == null)
	     config.url = "http://slebinos.mit.edu/dev/repertoire-chronos/";  // NEVER SET BY SCALER (JUST NEED GETTER)

	 if (config.image_url == null)
	     config.img_url = config.url + "javascripts/chronos/";            // NEVER SET BY SCALER (JUST NEED GETTER)

	 if (config.js_path == null)
	     config.js_path = 'javascripts/';


	 /* LOAD REQUIRED JS */

	 var requiredJS = [
	     'rep.widgets/global.js',
	     'rep.widgets/model.js',
	     'rep.widgets/widget.js',
	     'rep.widgets/events.js',
	     'chronos/rep.chronos.global.js',
	     'chronos/rep.chronos.model.js',
	     'chronos/rep.chronos.timeline.js',
	     'chronos/rep.chronos.widget.js',
	     'chronos/rep.chronos.scaler.js'
	 ];

	 for (var i = 0; i < requiredJS.length; i++) {
	     var full_path = config.url + config.js_path + requiredJS[i];
	     var success_callback = function () {};

	     jQuery.ajax({
			     async:    false,
			     type:     "GET",
			     url:      full_path,
			     data:     null,
			     success:  success_callback,
			     dataType: 'script'
			 });

	     // Doesn't work synchronously so it's kinda not useful for this.
	     // But it's just a wrapper for the above function anyways (albeit without async set to false...).
	     // $.getScript(full_path, function() { alert('loaded ' + full_path); });
	 }

	 /* END LOAD REQUIRED JS */


	 this.each(
	     function() {

		 $this = $(this);

		 // Just for pulling JSON data...temporary until this is thought through completely...
		 var dataStartYear = 1900;
		 var dataEndYear   = 2000;

		 var modelOptions       = {};
		 modelOptions['params'] = {};

		 if (config != null) {
		     if (config.data_url != null) {
			 modelOptions.params['url'] = config.data_url;
		     }

		     if (config.data_start != null) {
		       modelOptions['data_start'] = config.data_start;
		     }

		     if (config.id_name != null) {
		       modelOptions['id_name'] = config.id_name;
		     }

		     if (config.title_name != null) {
		       modelOptions['title_name'] = config.title_name;
		     }

		     if (config.date_name != null) {
		       modelOptions['date_name'] = config.date_name;
		     }

		     if (config.dateFormat != null) {
			 modelOptions['dateFormat'] = config.dateFormat;
		     } else {
			 // modelOptions['dateFormat'] = dateFormat: 'yyyy-MM-ddTHH:mm:ss-04:00', // can't figure out format specifier for '-04:00' ?
		     }
		 } else {
		     // Shouldn't be hard-coded.  Should just throw an error if we don't have these args.
		     modelOptions.params['url'] = "http://slebinos.mit.edu/us-iran/events.js?s=" + dataStartYear + "-01-01&e=" + dataEndYear + '-12-31';
		 }

		 // Brief explanation: the 'url' param to modelOptions is more or less the 'URL prefix' to the
		 // params['url'] param to modelOptions.  This is not a mistake, although it is confusing.
		 modelOptions['url'] = config.url + 'json.php';


		 // BUILD DATA MODEL:
		 var thisModel = repertoire.chronos.model(modelOptions);
		 thisModel.initialize();  // Must be run to load data


		 // BUILD TIMELINE:

 		 var timeline = repertoire.chronos.timeline($this.attr('id'), null, thisModel);  // kinda stupid since we turn this ( $this.attr('id') ) back into a jQuery object...
		 timeline.initialize();   // Must be called first: builds Timeline

		 // Make sure floats get reset, without sloppy markup
		 $this.append('<div style="position:absolute; z-index:2; bottom:2px; right:5px;"><img src="' + config.img_url + 'img/hs-logo.png" alt="Built by HyperStudio" /></div><div class="clear"></div>');


		 // If IE, we need to be capable of delivering different styles
		 if ( $.browser.msie ) {
		     $this.addClass("ie");
		 }

		 // Just testing for now.  Need to build more thorough scaffolding (class?) for this.
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
