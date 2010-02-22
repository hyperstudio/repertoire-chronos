/*
 *  * CHRONOS
 * 
 * Extensible, OO*, JavaScript framework for (date/time) event-based navigation and visualization.
 * 
 * rep.chronos.util: utility functions for date manipulation, etc.
 * 
 * 
 */



/*
 * Parses string formatted as YYYY-MM-DD to a Date object.
 * 
 *    * If the supplied string does not match the format, an 
 *    * invalid Date (value NaN) is returned.
 *    * @param {string} dateStringInRange format YYYY-MM-DD, with year in
 *    * range of 0000-9999, inclusive.
 *    * @return {Date} Date object representing the string.
 * 
 * Adapted from comp.lang.javascript FAQ (http://www.jibbering.com/faq/)
 * 
 *  TODO: NEEDS MORE ROBUSTNESS.
 * 
 */
function parseISO8601(dateStringInRange) {
    var isoExp = /^\s*([\d]{4})-(\d\d)-(\d\d)T(\d{2}):*(\d{2}):*(\d{2})[-(\d{2}):*(\d{2})]*$/;

    var date   = new Date(NaN);
    var month;
    var parts  = isoExp.exec(dateStringInRange);
    

    if (parts) {
	month = +parts[2];
	date.setFullYear(parts[1], month - 1, parts[3]);

	if(month != date.getMonth() + 1) {
            date.setTime(NaN);
	} else {
            date.setHours(parts[4], parts[5], parts[6], 0);
	}
    } else {
	//alert("didn't work!");
    }

    return date;
}
