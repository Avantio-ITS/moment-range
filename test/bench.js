var moment    = require('moment');
require('../lib/moment-range');

var date1 = new Date(2016, 7, 21);
var date2 = new Date(2016, 8, 25);
// moment(date1)
console.time('t');
moment.range(moment.utc(date1), moment.utc(date1));
console.timeEnd('t');
console.time('t1');
moment.range(moment.utc(date1), moment.utc(date1));
console.timeEnd('t1');
console.time('t2');
moment.range(moment.utc(date1), moment.utc(date1));
console.timeEnd('t2');
console.time('t3');
var a = moment.range(moment.utc(date1), moment.utc(date1));
console.timeEnd('t3');
console.time('t4');
a.start = moment.utc(date1)
a.end = moment.utc(date1);
console.timeEnd('t4');
console.time('t5');
console.timeEnd('t5');