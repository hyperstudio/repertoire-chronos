# Repertoire Chronos: d3-based timeline widget for [Repertoire Faceting](https://github.com/hyperstudio/repertoire-faceting)

This branch of Repertoire Chronos is an in-progress re-implementation of the original concept and design. Chronos allows developers using the Repertoire faceted browser to include a timeline element displaying temporal data from multiple facets. These data are

### Requirements
Chronos depends on [jQuery](http://jquery.com), [d3.js](https://d3js.org) version 4.x, [d3-scale-chromatic](https://github.com/d3/d3-scale-chromatic), [d3-tip](https://github.com/VACLab/d3-tip) and (moment.js)[http://momentjs.com], as well as on [Repertoire Faceting](https://github.com/hyperstudio/repertoire-faceting).

### Installation
Copy chronos.js and chronos.css to the appropriate asset directories (e.g., in Rails, /vendor/assets/javascripts and /vendor/assets/stylesheets).

Add `//= require chronos` to application.js and `*= require chronos` to application.css

### Usage
An individual page should contain no more than one Chronos container, but that container may display up to 6 different timeline tracks. To initialize a Chronos container, call the jQuery plugin method `$(<selector>).chronos({<options>});` on the container element.

To add a facet to Chronos as a track in the timeline, call `$(<selector>).timeline_facet();`. The tracks will be arranged in the order that their corresponding elements appear in the document.

Example:

    <script language="javascript">
      $().ready(function() {
        $('#chronos').chronos({start: "1800-01-01", end: "1999-12-31"});
        $('#doctors').facet_context();
        $('.timeline-facet').timeline_facet();
      });
    </script>

    <div id='doctors'>
      <div id='chronos'></div>
      <div class='timeline-facets'>
        <div id='birth_date' class='timeline-facet'></div>
        <div id='med_degree_date' class='timeline-facet'></div>
        <div id='death_date' class='timeline-facet'></div>
      </div>
    </div>
