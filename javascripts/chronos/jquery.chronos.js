/*
 * jQuery plugin wrapper for Chronos framework. 
 * 
 */

(function($) {

     $.fn.chronos = function(settings) {
	 var config = {};

	 if (settings) $.extend(config, settings);

         // What's the "right way to fail here?"  Probably should not set it to our URL, not that it's that bad...
	 if (config.url == null)
	     config.url = "";  // NEVER SET BY SCALER (JUST NEED GETTER)

	 if (config.image_url == null)
	     config.img_url = config.url + "javascripts/chronos/";            // NEVER SET BY SCALER (JUST NEED GETTER)

	 if (config.js_path == null)
	     config.js_path = 'javascripts/';


	 /* LOAD REQUIRED JS */

	 var requiredJS = [
	     'datejs/build/date.js',
	     'datejs/build/time.js',
	     'rep.widgets/global.js',
	     'rep.widgets/model.js',
	     'rep.widgets/widget.js',
	     'rep.widgets/events.js',
	     'chronos/rep.chronos.global.js',
	     'chronos/rep.chronos.model.js',
	     'chronos/rep.chronos.timeline.js',
	     'chronos/rep.chronos.widget.js',
	     'chronos/rep.chronos.eventListWidget.js',
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
			     dataType: 'script',
			     cache:    true              // Evidently passing in option 'script' for dataType disables caching: 
                                                         // http://api.jquery.com/jQuery.ajax/
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

		 var timelineOptions    = {};

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

                     if (config.orientation != null) {
                         timelineOptions['orientation'] = config.orientation;
		     }

                     if (config.startDate != null) {
                         timelineOptions['startDate'] = config.startDate;
		     }

                     if (config.tag_name != null) {
                         timelineOptions['tag_name'] = config.tag_name;
		     }

                     if (config.startID != null) {
                         timelineOptions['startID'] = config.startID;
		     }

                     if (config.mapTags != null) {
                         timelineOptions['mapTags'] = config.mapTags;
		     }

		 } else {
		     // Shouldn't be hard-coded.  Should just throw an error if we don't have these args.
		     modelOptions.params['url'] = "http://hs-dev.mit.edu/us-iran/events.js?s=" + dataStartYear + "-01-01&e=" + dataEndYear + '-12-31';
		 }

		 // Brief explanation: the 'url' param to modelOptions is more or less the 'URL prefix' to the
		 // params['url'] param to modelOptions.  This is not a mistake, although it is confusing.
		 modelOptions['url'] = config.url + 'json.php';


		 // BUILD DATA MODEL:
		 var thisModel = repertoire.chronos.model(modelOptions);
		 thisModel.initialize();  // Must be run to load data


		 // BUILD TIMELINE:

 		 var timeline = repertoire.chronos.timeline($this.attr('id'), timelineOptions, thisModel);  // kinda stupid since we turn this ( $this.attr('id') ) back into a jQuery object...
		 timeline.initialize();   // Must be called first: builds Timeline

		 // Make sure floats get reset, without sloppy markup
		 $this.append('<div style="position:absolute; z-index:2; bottom:2px; right:5px;"><img src="' + config.img_url + 'img/hs-logo.png" alt="Built by HyperStudio" /></div><div class="clear"></div>');


		 // If IE, we need to be capable of delivering different styles
		 if ( $.browser.msie ) {
		     $this.addClass("ie");
		 }

/*
		 // Just testing for now.  Need to build more thorough scaffolding (class?) for this.
		 $('img.eDot').live('click',
		     function (index, element) {
                         var title = '';
                         if ($(this).attr('title').match(/\\u[a-zA-Z0-9]{4}/)) {
			     // Figuring out exactly how to do this made me want to punch the internet in 
			     // general, and Mozilla's JS Dev site in particular.
                             var unicode_regexp = /\\u([a-zA-Z0-9]{4})/g;
                             title = $(this).attr('title').replace(unicode_regexp, '&#x$1;');  // meh.
			 } else {
                             title = $(this).attr('title');
			 }

                         $('div#eventListing span.data').html('<br /><br />id: <span class="id">' + $(this).attr('id') + '</span><br />title: <span class="title">' + title + '</span><br />date: <span class="date">' + $(this).attr('date') + '</span><br />style: ' + $(this).attr('style') + '<br />');
		     }
		 );
*/

	     }
	 );

	 return this;
     };
 })(jQuery);
