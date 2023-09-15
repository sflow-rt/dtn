$(function() {
  var trendURL = '../scripts/metrics.js/trend/json';

  var db = {};
  var selectedTime = 0;

  function chartClick(e,pt) {
    var times = db.trend.times;
    var tmin = times[0];
    var tmax = times[times.length - 1];
    var t = ((tmax - tmin) * pt.x) + tmin;
    if (t < tmin || t > tmax)
      selectedTime = 0;
    else {
      var mindiff = tmax - tmin;
      var mint = tmin;
      for (var i = 0; i < times.length; i++) {
        var diff = Math.abs(t - times[i]);
        if (diff < mindiff) {
          mindiff = diff;
          mint = times[i];
        }
      }
      selectedTime = mint;
    }
    drawCharts();
  }

  var bps_chart = $('#bps-trend').stripchart({clickable:true,stack:true});
  bps_chart.bind('stripchartclick', chartClick);
  var rtt_chart = $('#rtt-trend').stripchart({clickable:true,includeMillis:true});
  rtt_chart.bind('stripchartclick', chartClick);
  var size_chart = $('#size-trend').stripchart({clickable:true});
  size_chart.bind('stripchartclick', chartClick);
  var unacked_chart = $('#unacked-trend').stripchart({clickable:true}); 
  unacked_chart.bind('stripchartclick', chartClick);

  function chartData(trend,sort,metric,units,stack) {
    var val, cdata, idx, topn, lines, labels, legend, sortedKeys, k, keyToIdx, seriesOptions, key, line, i, cvals, entry, colors;

    cdata = {times:db.trend.times,units:units};

    if (selectedTime >= db.trend.times[0]) {
      for (idx = 0; idx < db.trend.times.length; idx++) {
        if (db.trend.times[idx] >= selectedTime)
          break;
      }
    } else {
      selectedTime = 0;
      idx = db.trend.times.length - 1;
    }
    cdata.selectedIdx = idx;

    topn = db.trend.trends[trend];
    lines = [];
    labels = [];
    if (selectedTime >= db.trend.times[0]) {
      for (idx = 0; idx < db.trend.times.length; idx++) {
        if (db.trend.times[idx] >= selectedTime)
          break;
      }
    } else {
      selectedTime = 0;
      idx = db.trend.times.length - 1;
    }

    legend = topn[idx];
    sortedKeys = [];
    for (var k in legend) {
      sortedKeys.push(k);
    }
    sortedKeys.sort(function (a, b) {
      return legend[b][sort] - legend[a][sort];
    });
    sortedKeys.push("hidden");

    keyToIdx = {};
    seriesOptions = [];
    for (k in sortedKeys) {
      key = sortedKeys[k];
      line = new Array(db.trend.times.length);
      for (i = 0; i < line.length; i++)
        line[i] = 0;
        lines[k] = line;
        keyToIdx[sortedKeys[k]] = k;
        if ("hidden" !== key)
          labels[k] = $.map(key.split(','), function(key) { return key; });
    }
    for (i = 0; i < db.trend.times.length; i++) {
      entry = topn[i];
      for (key in entry) {
        val = (entry[key][metric] || 0);
        if (key in keyToIdx)
          lines[keyToIdx[key]][i] = val;
        else {
          if(stack)
            lines[sortedKeys.length - 1][i] += val;
          else
            lines[sortedKeys.length - 1][i] = Math.max(lines[sortedKeys.length - 1][i], val);
        }
      }
    }
    cdata.values = lines;
    cdata.legend = {labels:labels,headings:['Source','Destination','SciTag']};
    return cdata; 
  }

  function drawCharts() {
    if(!db.trend) return;
    bps_chart.stripchart('draw', chartData('dtn-pair','bps','bps','Bits per Second',true));
    rtt_chart.stripchart('draw', chartData('dtn-pair','bps','rtt','Seconds',false)); 
    size_chart.stripchart('draw', chartData('dtn-pair','bps','size','Bytes',false));
    unacked_chart.stripchart('draw', chartData('dtn-pair','bps','unacked','Packets',false));
  }

  function updateData(data) {
    if(!data 
      || !data.trend 
      || !data.trend.times 
      || data.trend.times.length == 0) return;
    
    if(db.trend) {
      // merge in new data
      var maxPoints = db.trend.maxPoints;
      db.trend.times = db.trend.times.concat(data.trend.times);
      var remove = db.trend.times.length > maxPoints ? db.trend.times.length - maxPoints : 0;
      if(remove) db.trend.times = db.trend.times.slice(remove);
      for(var name in db.trend.trends) {
        db.trend.trends[name] = db.trend.trends[name].concat(data.trend.trends[name]);
        if(remove) db.trend.trends[name] = db.trend.trends[name].slice(remove);
      }
    } else db.trend = data.trend;
    
    db.trend.start = new Date(db.trend.times[0]);
    db.trend.end = new Date(db.trend.times[db.trend.times.length - 1]);

    drawCharts();
  }

  (function pollTrends() {
    $.ajax({
      url: trendURL,
      dataType: 'json',
      data: db.trend && db.trend.end ? {after:db.trend.end.getTime()} : null,
      success: function(data) {
        if(data) {
          updateData(data);
        } 
      },
      complete: function(result,status,errorThrown) {
        setTimeout(pollTrends,1000);
      },
      timeout: 60000
    });
  })();

  $(window).resize(function() {
    drawCharts();
  });
});
