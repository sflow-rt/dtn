// author: InMon Corp.
// version: 0.2
// date: 9/18/2023
// description: Data Transfer Node Metrics
// copyright: Copyright (c) 2023 InMon Corp. ALL RIGHTS RESERVED

include(scriptdir() + '/inc/trend.js');

var trend = new Trend(300,1);
var points = {};

setFlow('dtn-pair', {
  keys:'ip6source,ip6destination,null:[map:[bits:ip6flowlabel:261884]:scitag]:unknown',
  value: 'bytes',
  values: ['avg:bytes','avg:tcprtt','avg:tcpunacked','avg:tcprttwait','avg:tcprttsdev'],
  t: 5
});

setIntervalHandler(function(now) {
  points = {};
  var top = activeFlows('ALL','dtn-pair',5);
  topN = {};
  if(top) {
    top.forEach(function(entry) {
      topN[entry.key] = {
        bps:entry.value*8,
        size:entry.values[0],
        rtt:entry.values[1]*0.000001,
        unacked:entry.values[2],
        rttwait:entry.values[3]*0.000001,
        rttsdev:entry.values[4]*0.000001
      };
    });
  }
  points['dtn-pair'] = topN;
  trend.addPoints(now,points);
},1);

setHttpHandler(function(req) {
  var result, path = req.path;
  if(!path || path.length == 0) throw 'not_found';
  switch(path[0]) {
    case 'trend':
      if(path.length > 1) throw 'not_found'; 
      result = {};
      result.trend = req.query.after ? trend.after(parseInt(req.query.after)) : trend;
      break;
    default: throw 'not_found';
  }
  return result;
});
