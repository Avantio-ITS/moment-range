//-----------------------------------------------------------------------------
// Contstants
//-----------------------------------------------------------------------------

const moment = require('moment');

const INTERVALS = {
    year: true,
    month: true,
    week: true,
    day: true,
    hour: true,
    minute: true,
    second: true
};

//-----------------------------------------------------------------------------
// Date Ranges
//-----------------------------------------------------------------------------

/**
 * DateRange class to store ranges and query dates.
 *
 * @constructor
 * @param {(Moment|Date)} start Start of interval
 * @param {(Moment|Date)} end End of interval
 */
/**
 * DateRange class to store ranges and query dates.
 *
 * @constructor
 * @param {!Array} range Array containing start and end dates.
 */
/**
 * DateRange class to store ranges and query dates.
 *
 * @constructor
 * @param {!String} range String formatted as an IS0 8601 time interval
 */
function DateRange(start, end) {
    var parts;
    var s = start;
    var e = end;

    if (arguments.length === 1 || end === undefined) {
        if (typeof start === 'object' && start.length === 2) {
            s = start[0];
            e = start[1];
        } else if (typeof start === 'string') {
            parts = start.split('/');
            s = parts[0];
            e = parts[1];
        }
    }

    this.start = moment(s);
    this.end = moment(e);

    if (this.end.isBefore(this.start)) {
        var ohDearAux = this.start;
        this.start = this.end;
        this.end = ohDearAux;
    }
}

/**
 * Constructor for prototype.
 *
 * @type {DateRange}
 */
DateRange.prototype.constructor = DateRange;

/**
 * Deep clone range.
 *
 * @return {!DateRange}
 */
DateRange.prototype.clone = function() {
    return moment().range(this.start, this.end);
};

/**
 * Determine if the current interval contains a given moment/date/range.
 *
 * @param {(Moment|Date|DateRange)} other Date to check
 *
 * @return {!boolean}
 */
DateRange.prototype.contains = function(other) {
    var start = this.start;
    var end = this.end;

    if (other instanceof DateRange) {
        return _isBeforeOrEquals(start, other.start) && _isAfterOrEquals(end, other.end);
    } else {
        return _isBeforeOrEquals(start, other) && _isAfterOrEquals(end, other);
    }
};

/**
 * Determine if the current date range overlaps a given date range.
 *
 * @param {!DateRange} range Date range to check
 *
 * @return {!boolean}
 */
DateRange.prototype.overlaps = function(range) {
    return this.intersect(range) !== null;
};

/**
 * Determine the intersecting periods from one or more date ranges.
 *
 * @param {!DateRange} other A date range to intersect with this one
 *
 * @return {DateRange} Returns the intersecting date or `null` if the ranges do
 *                     not intersect
 */
DateRange.prototype.intersect = function(other) {
    var start = this.start;
    var end = this.end;

    /*
                             | exclude = false
         [---range---]       | [---range---]
               {---other---} |             {---other---}
     */
    if (_isBeforeOrEquals(start, other.start) &&
        _isBeforeOrEquals(other.start, end) &&
        end.isBefore(other.end)
    ) {
        return new DateRange(other.start, end);
    }

    /*
                                 | exclude = false
                 [----range----] |             [----range----]
          {---other---}          | {---other---}
     */
    else if (
        other.start.isBefore(start) &&
        _isBeforeOrEquals(start, other.end) &&
        _isBeforeOrEquals(other.end, end)
    ) {
        return new DateRange(start, other.end);
    }

    /*
          [---range---]
        {-----other-----}
     */
    else if (other.start.isBefore(start) &&
        end.isBefore(other.end)) {
        return this;
    }

    /*
        [-----range-----] | [---range---]
          {---other---}   | {---other---}
     */
    else if (_isBeforeOrEquals(start, other.start) &&
        _isBeforeOrEquals(other.end, end)
    ) {
        return other;
    }

    return null;
};

/**
 * Merge date ranges if they intersect.
 *
 * @param {!DateRange} other A date range to add to this one
 *
 * @return {DateRange} Returns the new `DateRange` or `null` if they do not
 *                     overlap
 */
DateRange.prototype.add = function(other) {
    if (this.overlaps(other)) {
        return new DateRange(moment.min(this.start, other.start), moment.max(this.end, other.end));
    }

    return null;
};

/**
 * Subtract one range from another.
 *
 * @param {!DateRange} other A date range to substract from this one
 * @param {!boolean} exclusive True if the to value is exclusive
 *
 * @return {!Array<DateRange>}
 */
DateRange.prototype.subtract = function(other) {
    var start = this.start;
    var end = this.end;

    /*
        [---range---]                |                [---range---]
                       {---other---} | {---other---}
     */
    if (this.intersect(other) === null) {
        return [this];
    }
    /*  exclude = false
        [---range---] |    [---range---]
        {---other---} | {------other------}
     */
    else if (_isBeforeOrEquals(other.start, start) &&
        _isBeforeOrEquals(end, other.end)) {
        return [];
    }
    /*                        exclude = false
              [---range---] |             [---range---] (exclusive=false)
         {---other---}      | {---other---}
     */
    else if (_isBeforeOrEquals(other.start, start) &&
        other.end.isBefore(end) && // <- Here is the magic
        _isBeforeOrEquals(start, other.end)) {
        return [new DateRange(other.end, end)];
    }
    /*  exclude = false                     exclude = false
        [---range---] | [---range---]     | [---range---]
          {--other--} |     {---other---} |             {---other---} (exclusive=false)
     */
    else if (_isBeforeOrEquals(other.start, end) &&
        start.isBefore(other.start) && // <- Here is the magic
        _isBeforeOrEquals(end, other.end)) {
        return [new DateRange(start, other.start)];
    }
    /*                             exclude = true               exclude = true
       start [----range----] end | start [----range----] end  | start [----range----] end
         start {--other--} end   | start {--other--} end      |     start {--other--} end
     */
    else if (_isBeforeOrEquals(start, other.start) &&
        _isBeforeOrEquals(other.end, end)) {
        return [new DateRange(start, other.start), new DateRange(other.end, end)];
    }

    return [this]; // Same as intersect === null. There is no intersection.
};

/**
 * Iterate over the date range by a given date range, executing a function
 * for each sub-range.
 *
 * @param {(!DateRange|String)} range Date range to be used for iteration or
 *                                    shorthand string (shorthands:
 *                                    http://momentjs.com/docs/#/manipulating/add/)
 * @param {!DateRange~by} hollaback Callback
 * @param {!boolean} excludeBorders Indicate that the end of the range should not
 *                             be included in the iter.
 *
 * @return {DateRange} `this`
 */
DateRange.prototype.by = function(range, hollaback) {
    if (typeof range === 'string') {
        _byString.call(this, range, hollaback);
    } else {
        _byRange.call(this, range, hollaback);
    }
    return this;
};


/**
 * Callback executed for each sub-range.
 *
 * @callback DateRange~by
 *
 * @param {!Moment} current Current moment object for iteration
 * @param {!boolean} excludeBorders True if the to value is exclusive
 */

/**
 * @private
 */
function _byString(interval, hollaback) {
    var current = moment(this.start);

    while (this.contains(current)) {
        hollaback.call(this, current.clone());
        current.add(1, interval);
    }
}

/**
 * @private
 */
function _byRange(interval, hollaback) {
    var div = this / interval;
    var l = Math.floor(div);

    if (l === Infinity) {
        return;
    }

    for (var i = 0; i <= l; i++) {
        hollaback.call(this, moment(this.start.valueOf() + interval.valueOf() * i));
    }
}

/**
 * @private Compares if current moment is before or equals to a giving date
 * @param  {Date|Moment} date
 * @return {Boolean}
 */
function _isBeforeOrEquals(a, b) {
    return a.isBefore(b) || a.isSame(b);
}

/**
 * @private Compares if current moment is before or equals to a giving date
 * @param  {Date|Moment} date
 * @return {Boolean}
 */
function _isAfterOrEquals(a, b) {
    return a.isAfter(b) || a.isSame(b);
}

/**
 * Date range formatted as an [ISO8601 Time
 * Interval](http://en.wikipedia.org/wiki/ISO_8601#Time_intervals).
 *
 * @return {!String}
 */
DateRange.prototype.toString = function() {
    return this.start.format() + '/' + this.end.format();
};

/**
 * Date range in milliseconds. Allows basic coercion math of date ranges.
 *
 * @return {!number}
 */
DateRange.prototype.valueOf = function() {
    return this.end - this.start;
};

/**
 * Center date of the range.
 *
 * @return {!Moment}
 */
DateRange.prototype.center = function() {
    var center = this.start + this.diff() / 2;
    return moment(center);
};

/**
 * Date range toDate
 *
 * @return {!Array<Date>}
 */
DateRange.prototype.toDate = function() {
    return [this.start.toDate(), this.end.toDate()];
};

/**
 * Determine if this date range is the same as another.
 *
 * @param {!DateRange} other Another date range to compare to
 *
 * @return {!boolean}
 */
DateRange.prototype.isSame = function(other) {
    return this.start.isSame(other.start) && this.end.isSame(other.end);
};

/**
 * The difference of the end vs start.
 *
 * @param {number} unit Unit of difference, if no unit is passed in
 *                      milliseconds are returned. E.g.: `"days"`, `"months"`,
 *                      etc...
 *
 * @return {!number}
 */
DateRange.prototype.diff = function(unit) {
    return this.end.diff(this.start, unit);
};


//-----------------------------------------------------------------------------
// Moment Extensions
//-----------------------------------------------------------------------------

/**
 * Build a date range.
 *
 * @param {(Moment|Date)} start Start of range
 * @param {(Moment|Date)} end End of range
 *
 * @this {Moment}
 *
 * @return {!DateRange}
 */
moment.range = function(start, end) {
    if (start in INTERVALS) {
        return new DateRange(moment(this).startOf(start), moment(this).endOf(start));
    } else {
        return new DateRange(start, end);
    }
};

/**
 * Expose constructor
 *
 * @const
 */
moment.range.constructor = DateRange;

/**
 * @deprecated
 */
moment.fn.range = moment.range;

/**
 * Check if the current moment is within a given date range.
 *
 * @param {!DateRange} range Date range to check
 *
 * @this {Moment}
 *
 * @return {!boolean}
 */
moment.fn.within = function(range) {
    return range.contains(this._d);
};


//-----------------------------------------------------------------------------
// Export
//-----------------------------------------------------------------------------

module.exports = DateRange;
