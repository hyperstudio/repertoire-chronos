/*
 * Sub-Widget class for Chronos Timeline
 * 
 *  TODO: CLEANUP COMMENTS
 *        ...and more...
 * 
 */

//= require <jquery>
//= require "rep.widgets/global"
//= require "rep.widgets/widget"
//= require "rep.chronos.global"

repertoire.chronos.eventListWidget = function (selector, options, dataModel) {

    var self = repertoire.widget(selector, options);

    // default: no options specified
    options = options || {};


    // PRIVATE
    var startDate            = dataModel.getDateObject(options.startDate) || null;      // Must be set

    var volumeSize           = options.volumeSize          || null;      // Must be set
    var widgetSelector       = options.widgetSelector      || null;      // Must be set

    // Passed in by 'holder' class
    var timelineSize      = null;
    var orientation       = null;

    // These two are holders for 'top' vs. 'left,' and 'width' vs. 'height':
    var startEdgeName          = null;
    var volumeDimensionName    = null;
    var volumeDimensionInvName = null;  // The inverse of volumeDimensionName ( height <-> width )


    // PUBLIC

    self.update = function () {
    };


    self.initialize = function (initTimelineSize, initOrientation) {

	// Set instance properties:
	timelineSize = initTimelineSize;
	orientation = initOrientation;

	if (orientation == 'vertical') {
	    startEdgeName = 'top';
	    volumeDimensionName = 'width';
	    volumeDimensionInvName = 'height';
	} else {
	    startEdgeName = 'left';
	    volumeDimensionName = 'height';
	    volumeDimensionInvName = 'width';
	}

	// Create initial widget HTML element and add id/classes:
	$(selector).after("<div id='" + widgetSelector.replace(/^#/, '') + "'/>");  // We put this one AFTER the other divs.

	// Set height (if vertical orientation) or width (if horizontal orientation) based on configuration value:
	$(widgetSelector).css(volumeDimensionName, volumeSize + 'px');

	// if we don't set this to initialize we just get 'auto' and it throws everything off.
	$(widgetSelector).css(startEdgeName, '0px');

	$(widgetSelector).css(volumeDimensionInvName, '100%');

	self.buildEventList();

	// Totally arbitrary garbage in here now so we start somewhere that I can guarantee we've generated tiles for on the other timelines...
	$(widgetSelector).css(startEdgeName, '-8000px');
    };


    self.buildEventList = function () {
	// var divHolder = $('<div class="tModel">').appendTo($(widgetSelector));
	//var eventList = $('<ul></ul>').appendTo(divHolder);

	var eventList = $('<ul></ul>').appendTo($(widgetSelector));
	eventList.addClass('eventList');

	var lastYear = 0;

	for (var i = 0; i < dataModel.length(); i++) {
	    if (lastYear != dataModel.data[i].start.getFullYear()) {
		$('<li class="date_heading">' + dataModel.data[i].start.getFullYear() + '</li>').appendTo($(widgetSelector + ' ul.eventList'));
	    }

	    var thisLI = $('<li></li>').appendTo($(widgetSelector + ' ul.eventList'));
	    thisLI.attr('id', dataModel.data[i].id);

	    var tag_string = '';
	    for (k = 0; k < dataModel.data[i].tags.length; k++) {
		thisLI.addClass(dataModel.data[i].tags[k].replace(/ /g, '_'));
		tag_string = tag_string + ' | ' + dataModel.data[i].tags[k];
	    }

            var title = '';
            if (dataModel.data[i].title.match(/\\u[a-zA-Z0-9]{4}/)) {
		// Figuring out exactly how to do this made me want to punch the internet in 
		// general, and Mozilla's JS Dev site in particular.
                var unicode_regexp = /\\u([a-zA-Z0-9]{4})/g;
                title = dataModel.data[i].title.replace(unicode_regexp, '&#x$1;');  // meh.
	    } else {
                title = dataModel.data[i].title;
	    }

	    thisLI.append(dataModel.data[i].start.toString('MM/dd/yyyy') + ':<br />&nbsp;&nbsp;<strong>' + title + '</strong><br /><span id="tags">' + tag_string + '</span>');
	    thisLI.addClass('eventListEvent');

	    lastYear = dataModel.data[i].start.getFullYear();
	}
    };


    self.initiateListUIEvents = function (event_list_callback) {

	var draggable_config = {};

	if (orientation == 'vertical') {
	    draggable_config['axis'] = 'y';
	} else {
	    draggable_config['axis'] = 'x';
	}

 	$(widgetSelector).draggable(draggable_config);
	$('.eventListEvent').live('click', event_list_callback);

	$('.eventListEvent').live('mouseover',
				  function () {
				      $(this).addClass('highlight_event_li_over');
				      $('#event-' + $(this).attr('id')).addClass('highlight_event_over');
				  });

	$('.eventListEvent').live('mouseout',
				  function () {
				      $(this).removeClass('highlight_event_li_over')
				      $('#event-' + $(this).attr('id')).removeClass('highlight_event_over');
				  });
    };


    /**
     * 
     * @function
     * @param {Number} [newStart]
     * @description
     *   Sets start (top or left, depending on orientation) using newStart value.
     * 
     */
    self.setStart = function (newStart) {
	$(widgetSelector)[startEdgeName](newStart);
    };


    /**
     * 
     * @function
     * @param {Number} [eventID]
     * @description
     *   Scrolls to event identified by eventID.
     * 
     */
    self.scrollToEvent = function (eventID) {
	// De-highlight any event list events that have been previously chosen:
	$('.highlight_event_li').removeClass('highlight_event_li');

	// Find the event li and highlight it:
	var eventElement = $(widgetSelector).find('li#' + eventID);
	eventElement.addClass('highlight_event_li');

	// ...and animate the position to that event (positioned halfway down the timeline):
	var animate_options = {};
	animate_options[startEdgeName] = ( parseFloat($(widgetSelector).css(startEdgeName)) - parseFloat(eventElement.offset()[startEdgeName]) + (timelineSize / 2) );
	$(widgetSelector).animate(animate_options);
    };


    // end of model factory function
    return self;
};
