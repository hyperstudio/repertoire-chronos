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
	     config.url = "http://slebinos.mit.edu/dev/repertoire-chronos/";  // NEVER SET BY SCALER (JUST NEED GETTER)

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

		 var modelOptions       = { use_php_filter:  false };

		 var timelineOptions    = {};

		 if (config != null) {
		     for (config_name in config) {
			 if (config_name.match(/data_feeds|data_url|data_start|id_name|title_name|date_name|dateFormat|tag_name|desc_name|img_name/)) {
			     if (config_name == 'data_url') {
				 // We only want to populate params if we are using the php filter
				 // (for now, may want to be able to use other params later...)
                                 if (config_name.use_php_filter == true) {
				     if (modelOptions['params'] == null) {
					 modelOptions['params'] = {};
				     }
				     modelOptions['params']['url'] = config[config_name];
				 }
			     } else {
				 modelOptions[config_name] = config[config_name];
			     }

			     if (config_name == 'data_feeds') {
				 for (var b = 0; b < config.data_feeds.length; b++) {
				     // We only want to populate params if we are using the php filter
				     // (for now, may want to be able to use other params later...)
                                     if (config.data_feeds[b].use_php_filter == true) {
					 if (config.data_feeds[b]['params'] == null) {
					     config.data_feeds[b]['params'] = {};
					 }
					 config.data_feeds[b]['url'] = config.url + 'json.php';
					 config.data_feeds[b]['params']['url'] = config.data_feeds[b]['data_url'];
				     }
				 }
			     }
			 } else if (config_name.match(/orientation|startDate|startID|mapTags|useDesc/)) {
			     timelineOptions[config_name] = config[config_name];
			 }

			 // If we are using the JSON filter (php script), then we set the params so that
			 // 'url' = <data_url>
			 //  i.e.
			 //  json.php?url=http://example.com/somefeed.json
			 // This means also that the url is not the data feed, but the url for the wrapper script.
			 // 
			 // Whereas, if we are not using the wrapper script, we set params to be empty (for now, see above)
			 //  and set the URL value for modelOptions to be the 'data_url' directly.  Kapeesh?  Wakatta?
			 if (modelOptions.data_feeds != null && modelOptions.use_php_filter == true) {
			     modelOptions['url'] = config.url + 'json.php';
			 } else {
			     modelOptions['url'] = config.data_url;
			 }
		     }
		 } else {
		     alert('Need at least a data URL to build the timeline!');
		     return false;
		 }

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
