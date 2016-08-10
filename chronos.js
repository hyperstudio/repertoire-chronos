// initial visualization basis from http://bl.ocks.org/bunkat/2338034

var chronos;

$(document).ready(function() {
  chronos = {
    items: [],
    countMax: [],
    lanes: [],
    facetNames: [],
    facetContexts: [],
    miniLaneGroups: [],
    mainLaneGroups: [],
    colors: [],
    x: null,
    x1: null,
    y1: null,
    y2: null,
    miniAxis: null,
    mainAxis: null,
    tip: null,
    circleRadius: 0,

    initialize: function(options) {

      if (!options) options = {};

      var timeBegin = options.start || new Date("1800-01-01");
      var timeEnd = options.start || new Date("1999-12-31");

      $(".timeline-facet").each(function(index) {
        chronos.lanes.push($(this).attr("id"));
      });
      var laneLength = chronos.lanes.length;

      var m = [20, 15, 15, 160], //top right bottom left
      w = 960 - m[1] - m[3],
      h = 500 - m[0] - m[2],
      miniHeight = laneLength * 12 + 50,
      mainHeight = h - miniHeight - 50;

      var color = d3.schemePaired;
      chronos.circleRadius = 5.0;

      //scales
      chronos.x = d3.scaleTime()
          .domain([timeBegin, timeEnd])
          .range([0, w]);
      chronos.x1 = d3.scaleTime()
          .range([0, w]);
      chronos.y1 = d3.scaleLinear()
          .domain([0, laneLength])
          .range([0, mainHeight]);
      chronos.y2 = d3.scaleLinear()
          .domain([0, laneLength])
          .range([0, miniHeight]);

      var chart = d3.select("#chronos")
            .append("svg")
            .attr("width", w + m[1] + m[3])
            .attr("height", h + m[0] + m[2])
            .attr("class", "chart");

      var defs = chart.append("defs");
      defs.append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", w)
        .attr("height", mainHeight);

      var main = chart.append("g")
            .attr("transform", "translate(" + m[3] + "," + m[0] + ")")
            .attr("width", w)
            .attr("height", mainHeight)
            .attr("class", "main");

      var mini = chart.append("g")
            .attr("transform", "translate(" + m[3] + "," + (mainHeight + m[0]) + ")")
            .attr("width", w)
            .attr("height", miniHeight)
            .attr("class", "mini");

      main.append("g").selectAll(".laneLines")
        .data(chronos.lanes)
        .enter().append("line")
        .attr("x1", m[1])
        .attr("y1", function(d, i) {return chronos.y1(i);})
        .attr("x2", w)
        .attr("y2", function(d, i) {return chronos.y1(i);})
        .attr("stroke", "lightgray")

      main.append("g").selectAll(".laneText")
        .data(chronos.lanes)
        .enter().append("text")
        .text(function(d) {return d;})
        .attr("x", -m[1])
        .attr("y", function(d, i) {return chronos.y1(i + .5);})
        .attr("dy", ".5ex")
        .attr("text-anchor", "end")
        .attr("class", "laneText");

      var itemShapes = main.append("g")
                .attr("clip-path", "url(#clip)");


      chronos.mainAxis = d3.axisTop(chronos.x1)
        //.tickArguments([d3.timeYear.every(1)]);
        .tickArguments([10]);

      main.append("g")
        .attr("class", "main-axis")
        .attr("transform", "translate(0, 0)")
        .call(chronos.mainAxis);

      mini.append("g").selectAll(".laneLines")
        .data(chronos.lanes)
        .enter().append("line")
        .attr("x1", m[1])
        .attr("y1", function(d, i) {return chronos.y2(i);})
        .attr("x2", w)
        .attr("y2", function(d, i) {return chronos.y2(i);})
        .attr("stroke", "lightgray");

      mini.append("g").selectAll(".laneText")
        .data(chronos.lanes)
        .enter().append("text")
        .text(function(d) {return d;})
        .attr("x", -m[1])
        .attr("y", function(d, i) {return chronos.y2(i + .5);})
        .attr("dy", ".5ex")
        .attr("text-anchor", "end")
        .attr("class", "laneText");

      chronos.lanes.forEach(function(lane, index) {
        var laneGroup = mini.append("g")
          .attr("class", "mini-lane-group-" + index);
        chronos.miniLaneGroups.push(laneGroup);
        var laneGroup = itemShapes.append("g")
          .attr("class", "main-lane-group-" + index);
        chronos.mainLaneGroups.push(laneGroup);
        chronos.colors[index] = d3.scaleLinear()
          .domain([0.0, 1.0])
          .range([color[index * 2], color[index * 2 + 1]]);
        var gradient = defs.append("linearGradient")
          .attr("id", "gradient-" + index);
        gradient.append("stop")
          .attr("offset", "0%")
          .attr("stop-color", color[index * 2])
          .attr("stop-opacity", "0%");
        gradient.append("stop")
          .attr("offset", "50%")
          .attr("stop-color", color[index * 2 + 1])
          .attr("stop-opacity", "7%");
        gradient.append("stop")
          .attr("offset", "100%")
          .attr("stop-color", color[index * 2])
          .attr("stop-opacity", "0%");

        return chronos;
      });

      chronos.miniAxis = d3.axisBottom(chronos.x)
        .tickArguments([d3.timeYear.every(10)]);

      mini.append("g")
        .attr("transform", "translate(0, " + miniHeight + ")")
        .call(chronos.miniAxis);


      //brush
      var brush = d3.brushX()
                .extent([[0, 0], [w, miniHeight]])
                .on("brush", chronos.display);

      mini.append("g")
        .attr("class", "x brush")
        .call(brush)
        .selectAll("rect")
        .attr("y", 1)
        .attr("height", miniHeight - 1);

      var brushPortion = 0.1
      brush.move(mini.select(".x.brush"), [w / 2.0 - w * brushPortion / 2.0, w / 2.0 + w * brushPortion / 2.0])

      chronos.tip = d3.tip()
        .attr("class", "d3-tip")
        .offset([-chronos.circleRadius * 2.0, 0])
        .html(function(d) { return d.count + " — " + moment(d.start).format("MMM D, YYYY"); });
      main.call(chronos.tip);
    },


    display: function() {
      var selection = d3.brushSelection(d3.select(".x.brush").node()) || [0, 0],
        minExtent = chronos.x.invert(selection[0]),
        maxExtent = chronos.x.invert(selection[1]);

      chronos.x1.domain([minExtent, maxExtent]);
      d3.select("g.main-axis")
        .call(chronos.mainAxis);

      chronos.lanes.forEach(function(lane, index) {
        if (chronos.items[index]) chronos.displayLane(index);
      });
    },

    displayLane: function(laneNumber) {
      var circles, rects, labels,
        visItems = chronos.items[laneNumber].filter(function(d) {return d.start <= chronos.x1.domain()[1] && d.start >= chronos.x1.domain()[0];});

      visItems.sort(function(a, b) {
        return a.start - b.start;
      });

      var periodMin = 30,
        periodMax = 400,
        amplitude = chronos.y1(1);

      var leastDist = periodMax;
      for (var i = 0; i < visItems.length - 1; i++) {
        var dist = chronos.x1(visItems[i + 1].start) - chronos.x1(visItems[i].start);
        if (dist < leastDist) leastDist = dist;
      }

      var period = leastDist * 32.0;
      if (period < periodMin) period = periodMin;

      circles = chronos.mainLaneGroups[laneNumber].selectAll("circle")
              .data(visItems, function(d) { return d.id; })
        .attr("cx", function(d) {return chronos.x1(d.start);})
        .attr("cy", function(d) {return chronos.y1(d.lane + .5) + (Math.abs((chronos.x1(d.start) % period) - period / 2) / period * amplitude - amplitude / 4);})
        .attr("r", chronos.circleRadius)
        .attr("fill", function(d) {return chronos.colors[d.lane](d.count / chronos.countMax[d.lane]);});

      circles.enter().append("circle")
        .attr("class", function(d) {return "miniItem" + d.lane;})
        .attr("cx", function(d) {return chronos.x1(d.start);})
        .attr("cy", function(d) {return chronos.y1(d.lane + .5) + (Math.abs((chronos.x1(d.start) % period) - period / 2) / period * amplitude - amplitude / 4);})
        .attr("r", chronos.circleRadius)
        .attr("fill", function(d) {return chronos.colors[d.lane](d.count / chronos.countMax[d.lane]);})
        .on("mouseover", chronos.tip.show)
        .on("mouseout", chronos.tip.hide)
        .on("click", chronos.chronosRefine)
      circles.exit().remove();

    },

    chronosRefine: function(d) {
      var context = chronos.facetContexts[d.lane];
      if (context) {
        context.toggle(chronos.facetNames[d.lane], d.id);
        context.trigger("changed");
      }
    }
  };



  repertoire.timeline_facet = function($facet, options) {
    var self = repertoire.facet($facet, options);

    var $template_fn = self.render;
    self.render = function(data) {

      var laneNumber = $(".timeline-facet").index($facet);
      chronos.facetNames[laneNumber] = self.facet_name();
      chronos.facetContexts[laneNumber] = self.context();

      console.log(data);

      //if (data.length > 0 && (!data[0][0] || data[0][0].length < 1)) data.pop(); // remove the item for no date
      chronos.countMax[laneNumber] = 0;
      chronos.items[laneNumber] = [];
      data.forEach(function(d) {
        if (d[1] > chronos.countMax[laneNumber]) chronos.countMax[laneNumber] = d[1];
        if (d[0] && d[0].length > 0) {
          chronos.items[laneNumber].push({
            start: new Date(d[0]),
            count: d[1],
            id: d[0],
            lane: laneNumber
          });
        }
      });

      var barW = 30;

      var miniBars = chronos.miniLaneGroups[laneNumber].selectAll("rect")
        .data(chronos.items[laneNumber])
        .attr("x", function(d) {return chronos.x(d.start) - barW / 2.0;})
        .attr("width", barW);

      miniBars.enter().append("rect")
        .attr("class", function(d) {return "miniItem" + d.lane;})
        .attr("x", function(d) {return chronos.x(d.start) - barW / 2.0;})
        .attr("y", function(d) {return chronos.y2(d.lane + .5) - 5;})
        .attr("width", barW)
        .attr("height", 10)
        .attr("fill", function(d) {return "url(#gradient-" + d.lane + ")"});

      miniBars.exit().remove();

      chronos.displayLane(laneNumber);

    };

    return self;
  };

  // Chronos plugin
  $.fn.chronos = chronos.initialize;

  // Timeline facet plugin
  $.fn.timeline_facet = repertoire.plugin(repertoire.timeline_facet);
  $.fn.timeline_facet.defaults = {
  };

});
