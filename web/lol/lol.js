//# dc.js Getting Started and How-To Guide
'use strict';

/* jshint globalstrict: true */
/* global dc,d3,crossfilter,colorbrewer */

// ### Create Chart Objects
// Create chart objects assocated with the container elements identified by the css selector.
// Note: It is often a good idea to have these objects accessible at the global scope so that they can be modified or filtered by other page controls.
var gainOrLossChart = dc.pieChart("#gain-loss-chart");
var quarterChart = dc.pieChart("#quarter-chart");
var dayOfWeekChart = dc.rowChart("#day-of-week-chart");
var yearlyBubbleChart = dc.bubbleChart("#yearly-bubble-chart");
var moveChart = dc.lineChart("#monthly-move-chart");
var table;
var test;
var sortGgt = "gameid";
var sortSens = true;

// ### Anchor Div for Charts
/*
// A div anchor that can be identified by id
    <div id="your-chart"></div>
// Title or anything you want to add above the chart
    <div id="chart"><span>Days by Gain or Loss</span></div>
// ##### .turnOnControls()
// If a link with css class "reset" is present then the chart
// will automatically turn it on/off based on whether there is filter
// set on this chart (slice selection for pie chart and brush
// selection for bar chart). Enable this with `chart.turnOnControls(true)`
     <div id="chart">
       <a class="reset" href="javascript:myChart.filterAll();dc.redrawAll();" style="display: none;">reset</a>
     </div>
// dc.js will also automatically inject applied current filter value into
// any html element with css class set to "filter"
    <div id="chart">
        <span class="reset" style="display: none;">Current filter: <span class="filter"></span></span>
    </div>
*/

//### Load your data
//Data can be loaded through regular means with your
//favorite javascript library
//
//```javascript
//d3.csv("data.csv", function(data) {...};
//d3.json("data.json", function(data) {...};
//jQuery.getJson("data.json", function(data){...});
//```
d3.csv("//static.katagena.com/lol/data.csv", function (data) {
    /* since its a csv file we need to format the data a bit */
    var dateFormat = d3.time.format("%Y-%m-%d");
    var numberFormat = d3.format(".2f");

    if (data === null) {
        return;
    }
    data.forEach(function (d) {
        d.dd = dateFormat.parse(d.date);
        d.month = d3.time.month(d.dd); // pre-calculate month for better performance
    });

    //### Create Crossfilter Dimensions and Groups
    //See the [crossfilter API](https://github.com/square/crossfilter/wiki/API-Reference) for reference.
    var ndx = crossfilter(data);
    var all = ndx.groupAll();

    // dimension by year
    var yearlyDimension = ndx.dimension(function (d) {
        return d.champion;
    });
    // maintain running tallies by year as filters are applied or removed
    var yearlyPerformanceGroup = yearlyDimension.group().reduce(
        /* callback for when data is added to the current filter results */
        function (p, v) {
            ++p.count;
            p.sumIndex += parseInt(v.kda);
            if(v.win == "Win"){
                p.avgIndex += 1;
            }
            if(p.count > 0){
            	p.absGain = (p.sumIndex/p.count) + p.count/10000;
                p.percentageGain = p.avgIndex/p.count;
                p.fluctuationPercentage = p.count;
            }else{
                p.absGain = 0;
                p.percentageGain = 0;
                p.fluctuationPercentage = 0;

            }
            return p;
        },
        /* callback for when data is removed from the current filter results */
        function (p, v) {
            --p.count;
            p.sumIndex -= parseInt(v.kda);
            if(v.win == "Win"){
                p.avgIndex -= 1;
            }
            if(p.count > 0){
            	p.absGain = (p.sumIndex/p.count) + p.count/10000;
                p.percentageGain = p.avgIndex/p.count;
                p.fluctuationPercentage = p.count;
            }else{
                p.absGain = 0;
                p.percentageGain = 0;
                p.fluctuationPercentage = 0;

            }
            return p;
        },
        /* initialize p */
        function () {
            return {count: 0, absGain: 0, fluctuation: 0, fluctuationPercentage: 0, sumIndex: 0, avgIndex: 0, percentageGain: 0};
        }
    );

    // dimension by full date
    var dateDimension = ndx.dimension(function (d) {
        return d.dd;
    });
    var kdaDimension = ndx.dimension(function (d) {
        return parseInt(d.kda);
    });

    // dimension by month
    var moveMonths = ndx.dimension(function (d) {
    	var format = d3.format("02d");
    	var ggt = dateFormat.parse(d.dd.getFullYear() + "-" + format((d.dd.getMonth() + 1)) + "-01");
    	return ggt;
        return d.dd.getFullYear() + "/" + format((d.dd.getMonth() + 1));
    });

    // group by total movement within month
    var winGgroup2 = moveMonths.group().reduceSum(function (d) {
        return d.kills;
    });
    var winGgroup = moveMonths.group().reduce(
            function (p, v) {
                ++p.days;
                if(v.win == "Win"){
                    p.total += 1;
                }
                if(p.days > 0){
                	p.avg = (p.total/p.days) + p.days/10000;
                	p.avg = 0;
                }else{
                    p.avg = 0;
                }
                return p;
            },
            function (p, v) {
                --p.days;
                if(v.win == "Win"){
                    p.total -= 1;
                }
                if(p.days > 0){
                	p.avg = (p.total/p.days) + p.days/10000;
                	p.avg = 0;
                }else{
                    p.avg = 0;
                }
                return p;
            },
            function () {
                return {days: 0, total: 0, avg: 0};
            }
        );
    // group by total volume within move, and scale down result
    /*var volumeByMonthGroup = moveMonths.group().reduceSum(function (d) {
        return d.kills;
    });*/
    var indexAvgByMonthGroup = moveMonths.group().reduce(
        function (p, v) {
            ++p.days;
            p.total += parseInt(v.kda);
            if(p.days > 0){
            	p.avg = (p.total/p.days) + p.days/10000;
            }else{
                p.avg = 0;
            }
            return p;
        },
        function (p, v) {
            --p.days;
            p.total -= parseInt(v.kda);
            if(p.days > 0){
            	p.avg = (p.total/p.days) + p.days/10000;
            }else{
                p.avg = 0;
            }
            return p;
        },
        function () {
            return {days: 0, total: 0, avg: 0};
        }
    );

    // create categorical dimension
    var gainOrLoss = ndx.dimension(function (d) {
        return (d.win == "Win") ? "Win" : "Loose";
    });
    // produce counts records in the dimension
    var gainOrLossGroup = gainOrLoss.group();

    // determine a histogram of percent changes
    var fluctuation = ndx.dimension(function (d) {
        return Math.round((d.close - d.open) / d.open * 100);
    });
    var fluctuationGroup = fluctuation.group();

    // summerize volume by quarter
    var quarter = ndx.dimension(function (d) {
    	return d.type;
    });
    var quarterGroup = quarter.group().reduceSum(function (d) {
        return "1";
    });

    // counts per weekday
    var dayOfWeek = ndx.dimension(function (d) {
        return d.summoner;
     });
    var dayOfWeekGroup = dayOfWeek.group();

    //### Define Chart Attributes
    //Define chart attributes using fluent methods. See the [dc API Reference](https://github.com/dc-js/dc.js/blob/master/web/docs/api-1.7.0.md) for more information
    //

    //#### Bubble Chart
    //Create a bubble chart and use the given css selector as anchor. You can also specify
    //an optional chart group for this chart to be scoped within. When a chart belongs
    //to a specific group then any interaction with such chart will only trigger redraw
    //on other charts within the same chart group.
    /* dc.bubbleChart("#yearly-bubble-chart", "chartGroup") */
    yearlyBubbleChart
        .width(990) // (optional) define chart width, :default = 200
        .height(250)  // (optional) define chart height, :default = 200
        .transitionDuration(1500) // (optional) define chart transition duration, :default = 750
        .margins({top: 10, right: 50, bottom: 30, left: 40})
        .dimension(yearlyDimension)
        //Bubble chart expect the groups are reduced to multiple values which would then be used
        //to generate x, y, and radius for each key (bubble) in the group
        .group(yearlyPerformanceGroup)
        .colors(colorbrewer.RdYlGn[9]) // (optional) define color function or array for bubbles
        .colorDomain([0, 30]) //(optional) define color domain to match your data domain if you want to bind data or color
        //##### Accessors
        //Accessor functions are applied to each value returned by the grouping
        //
        //* `.colorAccessor` The returned value will be mapped to an internal scale to determine a fill color
        //* `.keyAccessor` Identifies the `X` value that will be applied against the `.x()` to identify pixel location
        //* `.valueAccessor` Identifies the `Y` value that will be applied agains the `.y()` to identify pixel location
        //* `.radiusValueAccessor` Identifies the value that will be applied agains the `.r()` determine radius size, by default this maps linearly to [0,100]
        .colorAccessor(function (d) {
            return d.value.absGain;
        })
        .keyAccessor(function (p) {
            return p.value.absGain;
        })
        .valueAccessor(function (p) {
            return p.value.percentageGain;
        })
        .radiusValueAccessor(function (p) {
            return p.value.fluctuationPercentage;
        })
        .maxBubbleRelativeSize(0.3)
        .x(d3.scale.linear().domain([0, 50]))
        .y(d3.scale.linear().domain([0, 1]))
        .r(d3.scale.linear().domain([0, 100]))
        //##### Elastic Scaling
        //`.elasticX` and `.elasticX` determine whether the chart should rescale each axis to fit data.
        //The `.yAxisPadding` and `.xAxisPadding` add padding to data above and below their max values in the same unit domains as the Accessors.
        .elasticY(true)
        .elasticX(true)
        .yAxisPadding(1)
        .xAxisPadding(5)
        .renderHorizontalGridLines(true) // (optional) render horizontal grid lines, :default=false
        .renderVerticalGridLines(true) // (optional) render vertical grid lines, :default=false
        .xAxisLabel('KDA') // (optional) render an axis label below the x axis
        .yAxisLabel('Win rate') // (optional) render a vertical axis lable left of the y axis
        //#### Labels and  Titles
        //Labels are displaed on the chart for each bubble. Titles displayed on mouseover.
        .renderLabel(true) // (optional) whether chart should render labels, :default = true
        .label(function (p) {
            return p.key;
        })
        .renderTitle(true) // (optional) whether chart should render titles, :default = false
        .title(function (p) {
            return [p.key,
                   "KDA: " + numberFormat(p.value.absGain),
                   "Win: " + numberFormat(p.value.percentageGain),
                   "Plays: " + numberFormat(p.value.fluctuationPercentage)]
                   .join("\n");
        })
        //#### Customize Axis
        //Set a custom tick format. Note `.yAxis()` returns an axis object, so any additional method chaining applies to the axis, not the chart.
        .yAxis().tickFormat(function (v) {
            return v;
        });

    // #### Pie/Donut Chart
    // Create a pie chart and use the given css selector as anchor. You can also specify
    // an optional chart group for this chart to be scoped within. When a chart belongs
    // to a specific group then any interaction with such chart will only trigger redraw
    // on other charts within the same chart group.

    gainOrLossChart
        .width(180) // (optional) define chart width, :default = 200
        .height(180) // (optional) define chart height, :default = 200
        .radius(80) // define pie radius
        .dimension(gainOrLoss) // set dimension
        .group(gainOrLossGroup) // set group
        /* (optional) by default pie chart will use group.key as it's label
         * but you can overwrite it with a closure */
        .label(function (d) {
            if (gainOrLossChart.hasFilter() && !gainOrLossChart.hasFilter(d.key))
                return d.key + "(0%)";
            return d.key + "(" + Math.floor(d.value / all.value() * 100) + "%)";
        }) /*
        // (optional) whether chart should render labels, :default = true
        .renderLabel(true)
        // (optional) if inner radius is used then a donut chart will be generated instead of pie chart
        .innerRadius(40)
        // (optional) define chart transition duration, :default = 350
        .transitionDuration(500)
        // (optional) define color array for slices
        .colors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
        // (optional) define color domain to match your data domain if you want to bind data or color
        .colorDomain([-1750, 1644])
        // (optional) define color value accessor
        .colorAccessor(function(d, i){return d.value;})
        */;

    quarterChart.width(180)
        .height(180)
        .radius(80)
        .innerRadius(30)
        .dimension(quarter)
        .group(quarterGroup);

    //#### Row Chart
    dayOfWeekChart.width(180)
        .height(180)
        .margins({top: 20, left: 10, right: 10, bottom: 20})
        .group(dayOfWeekGroup)
        .dimension(dayOfWeek)
        // assign colors to each value in the x scale domain
        .ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
        .label(function (d) {
            return d.key;
        })
        // title sets the row text
        .title(function (d) {
            return d.value;
        })
        .elasticX(true)
        .xAxis().ticks(4);

    //#### Bar Chart
    // Create a bar chart and use the given css selector as anchor. You can also specify
    // an optional chart group for this chart to be scoped within. When a chart belongs
    // to a specific group then any interaction with such chart will only trigger redraw
    // on other charts within the same chart group.
    /* dc.barChart("#volume-month-chart") *//*
    fluctuationChart.width(420)
        .height(180)
        .margins({top: 10, right: 50, bottom: 30, left: 40})
        .dimension(fluctuation)
        .group(fluctuationGroup)
        .elasticY(true)
        // (optional) whether bar should be center to its x value. Not needed for ordinal chart, :default=false
        .centerBar(true)
        // (optional) set gap between bars manually in px, :default=2
        .gap(1)
        // (optional) set filter brush rounding
        .round(dc.round.floor)
        .alwaysUseRounding(true)
        .x(d3.scale.linear().domain([-25, 25]))
        .renderHorizontalGridLines(true)
        // customize the filter displayed in the control span
        .filterPrinter(function (filters) {
            var filter = filters[0], s = "";
            s += numberFormat(filter[0]) + "% -> " + numberFormat(filter[1]) + "%";
            return s;
        });

    // Customize axis
    
    fluctuationChart.xAxis().tickFormat(
        function (v) { return v + "%"; });
    fluctuationChart.yAxis().ticks(5);*/

    //#### Stacked Area Chart
    //Specify an area chart, by using a line chart with `.renderArea(true)`
    moveChart
        .renderArea(true)
        .width(420)
        .height(180)
        .transitionDuration(1000)
        .margins({top: 30, right: 50, bottom: 25, left: 40})
        .dimension(moveMonths)
        //.mouseZoomable(true)
        // Specify a range chart to link the brush extent of the range with the zoom focue of the current chart.
        //.rangeChart(volumeChart)
        .x(d3.time.scale().domain([new Date(2013, 9, 1), new Date()]))
        .round(d3.time.month.round)
        .xUnits(d3.time.months)
        .elasticY(true)
        .renderHorizontalGridLines(true)
        .legend(dc.legend().x(300).y(10).itemHeight(13).gap(5))
        .brushOn(false)
        // Add the base layer of the stack with group. The second parameter specifies a series name for use in the legend
        // The `.valueAccessor` will be used for the base layer
        .group(indexAvgByMonthGroup, "KDA")
        .valueAccessor(function (d) {
            return d.value.avg;
        })
        // stack additional layers with `.stack`. The first paramenter is a new group.
        // The second parameter is the series name. The third is a value accessor.
        /*.stack(winGgroup, "% Win", function (d) {
            return d.value.avg;
        })*/
        // title can be called by any stack layer.
        .title(function (d) {
            var value = d.value.avg ? d.value.avg : d.value;
            if (isNaN(value)) value = 0;
            return dateFormat(d.key) + "\n" + numberFormat(value);
        });
    
/*
    volumeChart.width(990)
        .height(40)
        .margins({top: 0, right: 50, bottom: 20, left: 40})
        .dimension(moveMonths)
        .group(volumeByMonthGroup)
        .centerBar(true)
        .gap(1)
        .x(d3.time.scale().domain([new Date(1985, 0, 1), new Date(2012, 11, 31)]))
        .round(d3.time.month.round)
        .alwaysUseRounding(true)
        .xUnits(d3.time.months);

    /*
    //#### Data Count
    // Create a data count widget and use the given css selector as anchor. You can also specify
    // an optional chart group for this chart to be scoped within. When a chart belongs
    // to a specific group then any interaction with such chart will only trigger redraw
    // on other charts within the same chart group.
    <div id="data-count">
        <span class="filter-count"></span> selected out of <span class="total-count"></span> records
    </div>
    */
    dc.dataCount(".dc-data-count")
        .dimension(ndx)
        .group(all);

    /*
    //#### Data Table
    // Create a data table widget and use the given css selector as anchor. You can also specify
    // an optional chart group for this chart to be scoped within. When a chart belongs
    // to a specific group then any interaction with such chart will only trigger redraw
    // on other charts within the same chart group.
    <!-- anchor div for data table -->
    <div id="data-table">
        <!-- create a custom header -->
        <div class="header">
            <span>Date</span>
            <span>Open</span>
            <span>Close</span>
            <span>Change</span>
            <span>Volume</span>
        </div>
        <!-- data rows will filled in here -->
    </div>
    */
    table = dc.dataTable(".dc-data-table")
        .dimension(dateDimension)
        // data table does not use crossfilter group but rather a closure
        // as a grouping function
        .group(function (d) {
            var format = d3.format("02d");
            return d.type;
        })
        .size(50) // (optional) max number of records to be shown, :default = 25
        // dynamic columns creation using an array of closures
        .columns([
            function (d) {
                return d.date;
            },
            function (d) {
                return d.summoner;
            },
            function (d) {
                return d.champion;
            },
            function (d) {
                return d.type;
            },
            function (d) {
                return d.time;
            },
            function (d) {
                return d.win;
            },
            function (d) {
                return d.kda;
            },
            function (d) {
                return d.kills;
            },
            function (d) {
                return d.deaths;
            },
            function (d) {
                return d.assists;
            },
            function (d) {
                return d.mpm;
            },
            function (d) {
                return d.gpm;
            }
        ])
        // (optional) sort using the given field, :default = function(d){return d;}
        .sortBy(function (d) {
        	if(sortGgt == "win"){
        		if(d.win == "Win"){
        			var win = 2;
        		}else{
        			var win = 1;
        		}
            	return (sortSens) ? win : -win;
        	}else if(sortGgt == "kill"){
            	return (sortSens) ? parseInt(d.kills) : -parseInt(d.kills);
        	}else if(sortGgt == "assist"){
            	return (sortSens) ? parseInt(d.assists) : -parseInt(d.assists);
        	}else if(sortGgt == "death"){
            	return (sortSens) ? parseInt(d.deaths) : -parseInt(d.deaths);
        	}else if(sortGgt == "kda"){
            	return (sortSens) ? parseFloat(d.kda) : -parseFloat(d.kda);
        	}else if(sortGgt == "mpm"){
            	return (sortSens) ? parseFloat(d.mpm) : -parseFloat(d.mpm);
        	}else if(sortGgt == "gpm"){
            	return (sortSens) ? parseFloat(d.gpm) : -parseFloat(d.gpm);
        	}else if(sortGgt == "time"){
        		return (sortSens) ? parseInt(d.time) : -parseInt(d.time);
        	}else if(sortGgt == "gameid"){
        		var result;
        		if(d.gameid > 0){
        			result = d.gameid*10000000;
        		}else{
        			result = new Date(d.dd).getTime()/100000
        		}
        		return (sortSens) ? result : -result;
            }else if(d.gameid > 0){
                return d.gameid;
            }else{
            	return new Date(d.dd).getTime()/100000;
            }
        })
        // (optional) sort order, :default ascending
        .order(d3.descending)
        // (optional) custom renderlet to post-process chart using D3
        .renderlet(function (table) {
            var htop = Math.round(parseInt(jQuery('.filter-count').html())/10);
            var top = 2*htop;
            jQuery("span.red").html(htop);
            jQuery("span.orange").html(top);
            jQuery("td.red").removeClass('red');
            jQuery("td.orange").removeClass('orange');
            var mpm = topMpm.top(top);
            for (var int = 0; int < mpm.length; int++) {
            	var text = mpm[int].mpm;
            	var $td = jQuery('td._10').filter(function() {
            	    return $(this).text() === text;
            	});
            	if(int < htop){
            		$td.addClass('red');
            	}else{
            		$td.addClass('orange');
            	}
			}
            var kill = topKill.top(top);
            for (var int = 0; int < kill.length; int++) {
            	var text = kill[int].kills;
            	var $td = jQuery('td._7').filter(function() {
            	    return $(this).text() === text;
            	});
            	if(int < htop){
            		$td.addClass('red');
            	}else{
            		$td.addClass('orange');
            	}
			}
            var assists = topAssist.top(top);
            for (var int = 0; int < assists.length; int++) {
            	var text = assists[int].assists;
            	var $td = jQuery('td._9').filter(function() {
            	    return $(this).text() === text;
            	});
            	if(int < htop){
            		$td.addClass('red');
            	}else{
            		$td.addClass('orange');
            	}
			}
            var gpm = topGpm.top(top);
            for (var int = 0; int < gpm.length; int++) {
            	var text = gpm[int].gpm;
            	var $td = jQuery('td._11').filter(function() {
            	    return $(this).text() === text;
            	});
            	if(int < htop){
            		$td.addClass('red');
            	}else{
            		$td.addClass('orange');
            	}
			}
            var kda = topKda.top(top);
            for (var int = 0; int < kda.length; int++) {
            	var text = kda[int].kda;
            	var $td = jQuery('td._6').filter(function() {
            	    return $(this).text() === text;
            	});
            	if(int < htop){
            		$td.addClass('red');
            	}else{
            		$td.addClass('orange');
            	}
			}
            table.selectAll(".dc-table-group").classed("info", true);
        });

    var topMpm = ndx.dimension(function (d) {
    	return parseFloat(d.mpm);
    });
    var topKill = ndx.dimension(function (d) {
    	return parseInt(d.kills);
    });
    var topAssist = ndx.dimension(function (d) {
    	return parseInt(d.assists);
    });
    var topGpm = ndx.dimension(function (d) {
    	return parseFloat(d.gpm);
    });
    var topKda = ndx.dimension(function (d) {
    	return parseFloat(d.kda);
    });
    
    //#### Rendering
    //simply call renderAll() to render all charts on the page
    dc.renderAll();
    /*
    // or you can render charts belong to a specific chart group
    dc.renderAll("group");
    // once rendered you can call redrawAll to update charts incrementally when data
    // change without re-rendering everything
    dc.redrawAll();
    // or you can choose to redraw only those charts associated with a specific chart group
    dc.redrawAll("group");
    */
    test = function (){
    	table.dimension(ndx.dimension(function (d) {
    		if(sortGgt == "win"){
        		if(d.win == "Win"){
        			var win = 2;
        		}else{
        			var win = 1;
        		}
            	return (sortSens) ? win : -win;
        	}else if(sortGgt == "kill"){
            	return (sortSens) ? parseInt(d.kills) : -parseInt(d.kills);
        	}else if(sortGgt == "assist"){
            	return (sortSens) ? parseInt(d.assists) : -parseInt(d.assists);
        	}else if(sortGgt == "death"){
            	return (sortSens) ? parseInt(d.deaths) : -parseInt(d.deaths);
        	}else if(sortGgt == "kda"){
            	return (sortSens) ? parseFloat(d.kda) : -parseFloat(d.kda);
        	}else if(sortGgt == "mpm"){
            	return (sortSens) ? parseFloat(d.mpm) : -parseFloat(d.mpm);
        	}else if(sortGgt == "gpm"){
            	return (sortSens) ? parseFloat(d.gpm) : -parseFloat(d.gpm);
        	}else if(sortGgt == "time"){
        		return (sortSens) ? parseInt(d.time) : -parseInt(d.time);
        	}else if(sortGgt == "gameid"){
        		var result;
        		if(d.gameid > 0){
        			result = d.gameid*10000000;
        		}else{
        			result = new Date(d.dd).getTime()/100000
        		}
        		return (sortSens) ? result : -result;
            }else if(d.gameid > 0){
                return d.gameid;
            }else{
            	return new Date(d.dd).getTime()/100000;
            }
    	}));
    	if(sortSens){
    		table.order(d3.descending);
    	}else{
    		//table.order(d3.ascending);
    	}
    	table.redraw();
    }
});

//#### Version
//Determine the current version of dc with `dc.version`
d3.selectAll("#version").text(dc.version);
function ggt(sort){
	if(sortGgt != sort){
		sortGgt = sort;
		sortSens = true;
	}else{
		sortSens = !sortSens;
	}
	test();
}

//change order