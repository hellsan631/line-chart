var n3Charts;
(function (n3Charts) {
    'use strict';
    var LineChart = (function () {
        function LineChart($window) {
            var _this = this;
            this.$window = $window;
            this.scope = {
                data: '=',
                options: '=',
                styles: '=',
                onDatumEnter: '=',
                onDatumOver: '=',
                onDatumMove: '=',
                onDatumLeave: '='
            };
            this.restrict = 'E';
            this.replace = true;
            this.template = '<div></div>';
            this.link = function (scope, element, attributes) {
                var eventMgr = new n3Charts.Utils.EventManager();
                var factoryMgr = new n3Charts.Utils.FactoryManager();
                // Initialize global events
                eventMgr.init(n3Charts.Utils.EventManager.EVENTS);
                // Register all factories
                // Note: we can apply additional arguments to each factory
                factoryMgr.registerMany([
                    ['container', n3Charts.Factory.Container, element[0]],
                    ['tooltip', n3Charts.Factory.Tooltip, element[0]],
                    ['legend', n3Charts.Factory.Legend, element[0]],
                    ['transitions', n3Charts.Factory.Transition],
                    ['x-axis', n3Charts.Factory.Axis, n3Charts.Utils.AxisOptions.SIDE.X],
                    ['y-axis', n3Charts.Factory.Axis, n3Charts.Utils.AxisOptions.SIDE.Y],
                    // This order is important, otherwise it can mess up with the tooltip
                    // (and you don't want to mess up with a tooltip, trust me).
                    ['series-area', n3Charts.Factory.Series.Area],
                    ['series-column', n3Charts.Factory.Series.Column],
                    ['series-line', n3Charts.Factory.Series.Line],
                    ['series-dot', n3Charts.Factory.Series.Dot]
                ]);
                // Initialize all factories
                factoryMgr.all().forEach(function (f) { return f.instance.init(f.key, eventMgr, factoryMgr); });
                // Unwrap native options and update the chart
                var update = function () {
                    // Call the update event with a copy of the options
                    // and data to avoid infinite digest loop
                    var options = new n3Charts.Utils.Options(angular.copy(scope.options));
                    var data = new n3Charts.Utils.Data(angular.copy(scope.data));
                    // Trigger the update event
                    eventMgr.trigger('update', data, options);
                };
                // Trigger the create event
                eventMgr.trigger('create');
                eventMgr.trigger('resize', element[0].parentElement);
                // We use $watch because both options and data
                // are objects and not arrays
                scope.$watch('[options, data]', update, true);
                scope.$watch('onDatumEnter', function () {
                    eventMgr.on('enter.directive', scope.onDatumEnter);
                });
                scope.$watch('onDatumOver', function () {
                    eventMgr.on('over.directive', scope.onDatumOver);
                });
                scope.$watch('onDatumMove', function () {
                    eventMgr.on('move.directive', scope.onDatumMove);
                });
                scope.$watch('onDatumLeave', function () {
                    eventMgr.on('leave.directive', scope.onDatumLeave);
                });
                eventMgr.on('legend-click.directive', function (series) {
                    var foundSeries = scope.options.series.filter(function (s) { return s.id === series.id; })[0];
                    foundSeries.visible = series.getToggledVisibility();
                    scope.$apply();
                });
                // Trigger the resize event
                angular.element(_this.$window).on('resize', function (event) {
                    eventMgr.trigger('resize', element[0].parentElement);
                    update();
                });
                // Trigger the destroy event
                scope.$on('$destroy', function () { return eventMgr.trigger('destroy'); });
            };
        }
        return LineChart;
    })();
    n3Charts.LineChart = LineChart;
})(n3Charts || (n3Charts = {}));
var n3Charts;
(function (n3Charts) {
    var Utils;
    (function (Utils) {
        'use strict';
        var EventManager = (function () {
            function EventManager() {
            }
            EventManager.prototype.init = function (events) {
                // Generate a new d3.dispatch event dispatcher
                this._dispatch = d3.dispatch.apply(this, events);
                // Support chaining
                return this;
            };
            EventManager.prototype.on = function (event, callback) {
                // Register an event listener
                // TODO We need to add an $apply() in here
                this._dispatch.on(event, callback);
                // Support chaining
                return this;
            };
            EventManager.prototype.trigger = function (event) {
                var args = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    args[_i - 1] = arguments[_i];
                }
                // Trigger an event, and call the event handler
                this._dispatch[event].apply(this, args);
                // Support chaining
                return this;
            };
            EventManager.prototype.datumEnter = function (series) {
                var _this = this;
                return function (selection) {
                    return selection.on('mouseenter', function (d, i) {
                        _this.trigger('over', d, i, series);
                    });
                };
            };
            EventManager.prototype.datumOver = function (series) {
                var _this = this;
                return function (selection) {
                    return selection.on('mouseover', function (d, i) {
                        _this.trigger('over', d, i, series);
                    });
                };
            };
            EventManager.prototype.datumMove = function (series) {
                var _this = this;
                return function (selection) {
                    return selection.on('mousemove', function (d, i) {
                        _this.trigger('over', d, i, series);
                    });
                };
            };
            EventManager.prototype.datumLeave = function (series) {
                var _this = this;
                return function (selection) {
                    return selection.on('mouseleave', function (d, i) {
                        _this.trigger('leave', d, i, series);
                    });
                };
            };
            EventManager.EVENTS = [
                'create',
                'update',
                'resize',
                'destroy',
                'enter',
                'over',
                'move',
                'leave',
                'click',
                'dblclick',
                'legend-click',
                'legend-over',
                'legend-out',
                'focus',
                'toggle',
            ];
            EventManager.DEFAULT = function () {
                return new EventManager().init(EventManager.EVENTS);
            };
            return EventManager;
        })();
        Utils.EventManager = EventManager;
    })(Utils = n3Charts.Utils || (n3Charts.Utils = {}));
})(n3Charts || (n3Charts = {}));
var n3Charts;
(function (n3Charts) {
    var Utils;
    (function (Utils) {
        'use strict';
        var FactoryManager = (function () {
            function FactoryManager() {
                // A stack of all factories, preserves order
                this._factoryStack = [];
            }
            FactoryManager.prototype.index = function (factoryKey) {
                // Return the index of a factory by the factoryKey
                return this._factoryStack
                    .map(function (d) { return d.key; })
                    .indexOf(factoryKey);
            };
            FactoryManager.prototype.get = function (factoryKey) {
                // Get the index of the factory
                var index = this.index(factoryKey);
                // Return the factory instance
                if (index > -1) {
                    return this._factoryStack[index].instance;
                }
                // Well, no factory found
                return null;
            };
            FactoryManager.prototype.all = function () {
                // Return the complete stack
                return this._factoryStack;
            };
            FactoryManager.prototype.registerMany = function (factories) {
                var _this = this;
                // Loop over the factories
                factories.forEach(function (factoryArgs) {
                    // Register each of them, applying all
                    // values as arguments
                    _this.register.apply(_this, factoryArgs);
                });
                // Support chaining
                return this;
            };
            FactoryManager.prototype.register = function (key, constructor) {
                var args = [];
                for (var _i = 2; _i < arguments.length; _i++) {
                    args[_i - 2] = arguments[_i];
                }
                // This generates a new factory constructor, applying
                // the additional args to the original constructor;
                // it preserves the name of the original constructor
                var factory = constructor.bind.apply(constructor, [null].concat(args));
                // Let's create a new instance of the factory
                var instance = new factory();
                // and push the entry to the factory stack
                this._factoryStack.push({
                    key: key,
                    instance: instance
                });
                // Return the instance
                return instance;
            };
            FactoryManager.prototype.unregister = function (factoryKey) {
                // Get the index of the factory
                var index = this.index(factoryKey);
                // And delete the factory
                if (index > -1) {
                    delete this._factoryStack[index];
                }
                // Support chaining
                return this;
            };
            return FactoryManager;
        })();
        Utils.FactoryManager = FactoryManager;
    })(Utils = n3Charts.Utils || (n3Charts.Utils = {}));
})(n3Charts || (n3Charts = {}));
var n3Charts;
(function (n3Charts) {
    var Utils;
    (function (Utils) {
        'use strict';
        var BaseFactory = (function () {
            function BaseFactory() {
            }
            BaseFactory.prototype.init = function (key, eventMgr, factoryMgr) {
                this.key = key;
                this.eventMgr = eventMgr;
                this.factoryMgr = factoryMgr;
                // Create namespaced event listener
                // and bind a proper this statement
                this.eventMgr.on('create.' + this.key, this.create.bind(this));
                this.eventMgr.on('update.' + this.key, this.update.bind(this));
                this.eventMgr.on('destroy.' + this.key, this.destroy.bind(this));
            };
            BaseFactory.prototype.create = function () {
                // This methods need to be overwritten by factories
            };
            BaseFactory.prototype.update = function (data, options) {
                // This methods need to be overwritten by factories
            };
            BaseFactory.prototype.destroy = function () {
                // This methods need to be overwritten by factories
            };
            return BaseFactory;
        })();
        Utils.BaseFactory = BaseFactory;
    })(Utils = n3Charts.Utils || (n3Charts.Utils = {}));
})(n3Charts || (n3Charts = {}));
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var n3Charts;
(function (n3Charts) {
    var Utils;
    (function (Utils) {
        'use strict';
        var SeriesFactory = (function (_super) {
            __extends(SeriesFactory, _super);
            function SeriesFactory() {
                _super.apply(this, arguments);
            }
            SeriesFactory.prototype.update = function (data, options) {
                this.data = data;
                this.options = options;
                var series = options.getSeriesByType(this.type).filter(function (s) { return s.visible; });
                this.updateSeriesContainer(series);
            };
            SeriesFactory.prototype.create = function () {
                this.createContainer(this.factoryMgr.get('container').data);
            };
            SeriesFactory.prototype.destroy = function () {
                this.svg.remove();
            };
            SeriesFactory.prototype.createContainer = function (parent) {
                this.svg = parent
                    .append('g')
                    .attr('class', this.type + SeriesFactory.containerClassSuffix);
            };
            SeriesFactory.prototype.updateSeriesContainer = function (series) {
                var _this = this;
                // Create a data join
                var groups = this.svg
                    .selectAll('.' + this.type + SeriesFactory.seriesClassSuffix)
                    .data(series, function (d) { return d.id; });
                // Create a new group for every new series
                groups.enter()
                    .append('g')
                    .attr({
                    class: function (d) {
                        return _this.type + SeriesFactory.seriesClassSuffix + ' ' + d.id;
                    }
                });
                // Update all existing series groups
                this.styleSeries(groups);
                this.updateSeries(groups, series);
                // Delete unused series groups
                groups.exit()
                    .remove();
            };
            SeriesFactory.prototype.updateSeries = function (groups, series) {
                // Workaround to retrieve the D3.Selection
                // in the callback function (bound to keyword this)
                var self = this;
                groups.each(function (d, i) {
                    var group = d3.select(this);
                    self.updateData(group, d, i, series.length);
                });
            };
            SeriesFactory.prototype.updateData = function (group, series, index, numSeries) {
                // we need to overwrite this
            };
            SeriesFactory.prototype.styleSeries = function (group) {
                // we need to override this
            };
            SeriesFactory.containerClassSuffix = '-data';
            SeriesFactory.seriesClassSuffix = '-series';
            return SeriesFactory;
        })(Utils.BaseFactory);
        Utils.SeriesFactory = SeriesFactory;
    })(Utils = n3Charts.Utils || (n3Charts.Utils = {}));
})(n3Charts || (n3Charts = {}));
var n3Charts;
(function (n3Charts) {
    var Utils;
    (function (Utils) {
        'use strict';
        var Dataset = (function () {
            function Dataset(values, id) {
                this.fromJS(values, id);
            }
            Dataset.prototype.fromJS = function (values, id) {
                this.id = id;
                this.values = values;
            };
            return Dataset;
        })();
        Utils.Dataset = Dataset;
    })(Utils = n3Charts.Utils || (n3Charts.Utils = {}));
})(n3Charts || (n3Charts = {}));
var n3Charts;
(function (n3Charts) {
    var Utils;
    (function (Utils) {
        'use strict';
        var Data = (function () {
            function Data(js) {
                if (js) {
                    this.fromJS(js);
                }
            }
            Data.prototype.fromJS = function (js) {
                for (var key in js) {
                    if (js.hasOwnProperty(key)) {
                        js[key] = new Utils.Dataset(js[key], key);
                    }
                }
                this.sets = js;
            };
            Data.prototype.getDatasets = function (series, options) {
                var _this = this;
                return series.map(function (d) { return _this.getDatasetValues(d, options); });
            };
            Data.prototype.getDatasetValues = function (series, options) {
                var xKey = options.getAbsKey();
                return this.sets[series.dataset].values.map(function (d) {
                    return { 'x': d[xKey], 'y': d[series.key] };
                });
            };
            Data.getMinDistance = function (data, scale, key, range) {
                if (key === void 0) { key = 'x'; }
                return d3.min(
                // Compute the minimum difference along an axis on all series
                data.map(function (series) {
                    // Compute minimum delta
                    return series
                        .map(function (d) { return scale(d[key]); })
                        .filter(function (d) {
                        return range ? d >= range[0] && d <= range[1] : true;
                    })
                        .reduce(function (prev, d, i, arr) {
                        // Get the difference from the current value
                        // with the previous value in the array
                        var diff = i > 0 ? d - arr[i - 1] : Number.MAX_VALUE;
                        // Return the new difference if it is smaller
                        // than the previous difference
                        return diff < prev ? diff : prev;
                    }, Number.MAX_VALUE);
                }));
            };
            return Data;
        })();
        Utils.Data = Data;
    })(Utils = n3Charts.Utils || (n3Charts.Utils = {}));
})(n3Charts || (n3Charts = {}));
var n3Charts;
(function (n3Charts) {
    var Utils;
    (function (Utils) {
        'use strict';
        var SeriesOptions = (function () {
            function SeriesOptions(js) {
                if (js === void 0) { js = {}; }
                this.axis = 'y';
                this.type = ['line'];
                this.visible = true;
                var options = this.sanitizeOptions(js);
                this.id = options.id || Utils.Options.uuid();
                this.axis = this.sanitizeAxis(options.axis);
                this.dataset = options.dataset;
                this.key = options.key;
                this.color = options.color;
                this.visible = options.visible;
                this.label = options.label || options.id;
                if (options.type.length > 0) {
                    this.type = this.sanitizeType(options.type);
                }
            }
            /**
             * Make sure that the options have proper types,
             * and convert raw js to typed variables
             */
            SeriesOptions.prototype.sanitizeOptions = function (js) {
                var options = {};
                // Extend the default options
                angular.extend(options, this, js);
                options.id = Utils.Options.getString(options.id);
                options.type = Utils.Options.getArray(options.type);
                options.dataset = Utils.Options.getString(options.dataset);
                options.key = Utils.Options.getString(options.key);
                options.color = Utils.Options.getString(options.color);
                options.label = Utils.Options.getString(options.label);
                options.visible = Utils.Options.getBoolean(options.visible);
                return options;
            };
            /**
             * Return the toggeled visibility without modifying
             * the visibility property itself
             */
            SeriesOptions.prototype.getToggledVisibility = function () {
                return !this.visible;
            };
            /**
             * Return an array of valid types
             */
            SeriesOptions.prototype.sanitizeType = function (types) {
                return types.filter(function (type) {
                    return SeriesOptions.isValidType(type);
                });
            };
            /**
             * Return a valid axis key
             */
            SeriesOptions.prototype.sanitizeAxis = function (axis) {
                if (['y'].indexOf(axis) === -1) {
                    throw TypeError(axis + ' is not a valid series option for axis.');
                }
                return axis;
            };
            /**
             * Returns true if the series has a type column.
             * Series of type column need special treatment,
             * because x values are usually offset
             */
            SeriesOptions.prototype.isAColumn = function () {
                return this.hasType(SeriesOptions.TYPE.COLUMN);
            };
            /**
             * Returns true if the series has a type *type*,
             * where type should be a value of SeriesOptions.TYPE
             */
            SeriesOptions.prototype.hasType = function (type) {
                return this.type.indexOf(type) !== -1;
            };
            /**
             * Returns true if the type *type* is a valid type
             */
            SeriesOptions.isValidType = function (type) {
                return d3.values(SeriesOptions.TYPE).indexOf(type) !== -1;
            };
            SeriesOptions.TYPE = {
                DOT: 'dot',
                LINE: 'line',
                AREA: 'area',
                COLUMN: 'column'
            };
            return SeriesOptions;
        })();
        Utils.SeriesOptions = SeriesOptions;
    })(Utils = n3Charts.Utils || (n3Charts.Utils = {}));
})(n3Charts || (n3Charts = {}));
var n3Charts;
(function (n3Charts) {
    var Utils;
    (function (Utils) {
        'use strict';
        var AxisOptions = (function () {
            function AxisOptions(js) {
                if (js === void 0) { js = {}; }
                this.type = 'linear';
                this.key = 'x';
                this.parse(js);
            }
            AxisOptions.prototype.parse = function (js) {
                this.type = js.type;
                this.key = js.key;
            };
            AxisOptions.isValidSide = function (side) {
                return d3.values(AxisOptions.SIDE).indexOf(side) !== -1;
            };
            AxisOptions.SIDE = {
                X: 'x',
                Y: 'y'
            };
            AxisOptions.TYPE = {
                LINEAR: 'linear',
                DATE: 'date'
            };
            return AxisOptions;
        })();
        Utils.AxisOptions = AxisOptions;
    })(Utils = n3Charts.Utils || (n3Charts.Utils = {}));
})(n3Charts || (n3Charts = {}));
var n3Charts;
(function (n3Charts) {
    var Utils;
    (function (Utils) {
        'use strict';
        ;
        var Options = (function () {
            function Options(js) {
                this.series = [];
                this.axes = {
                    x: {},
                    y: {}
                };
                this.margin = {
                    top: 0,
                    left: 40,
                    bottom: 40,
                    right: 0
                };
                var options = this.sanitizeOptions(js);
                this.margin = this.sanitizeMargin(options.margin);
                this.series = this.sanitizeSeries(options.series);
                this.axes = this.sanitizeAxes(options.axes);
            }
            /**
             * Make sure that the options have proper types,
             * and convert raw js to typed variables
             */
            Options.prototype.sanitizeOptions = function (js) {
                var options = {};
                // Extend the default options
                angular.extend(options, this, js);
                options.margin = Options.getObject(options.margin, this.margin);
                options.series = Options.getArray(options.series);
                options.axes = Options.getObject(options.axes, this.axes);
                return options;
            };
            Options.prototype.sanitizeMargin = function (margin) {
                return {
                    top: Options.getNumber(margin.top),
                    left: Options.getNumber(margin.left),
                    bottom: Options.getNumber(margin.bottom),
                    right: Options.getNumber(margin.right)
                };
            };
            Options.prototype.sanitizeSeries = function (series) {
                return (series).map(function (s) { return new Utils.SeriesOptions(s); });
            };
            Options.prototype.sanitizeAxes = function (axes) {
                // Map object keys and return a new object
                return Object.keys(axes).reduce(function (prev, key) {
                    prev[key] = new Utils.AxisOptions(axes[key]);
                    return prev;
                }, {});
            };
            Options.prototype.getAbsKey = function () {
                if (!this.axes[Utils.AxisOptions.SIDE.X]) {
                    throw new TypeError('Cannot find abs key : ' + Utils.AxisOptions.SIDE.X);
                }
                return this.axes[Utils.AxisOptions.SIDE.X].key;
            };
            Options.prototype.getByAxisSide = function (side) {
                if (!Utils.AxisOptions.isValidSide(side)) {
                    throw new TypeError('Cannot get axis side : ' + side);
                }
                return this.axes[side];
            };
            Options.prototype.getSeriesByType = function (type) {
                if (!Utils.SeriesOptions.isValidType(type)) {
                    throw new TypeError('Unknown series type: ' + type);
                }
                return this.series.filter(function (s) { return s.hasType(type); });
            };
            Options.getBoolean = function (value, defaultValue) {
                if (defaultValue === void 0) { defaultValue = true; }
                return !(value === !defaultValue);
            };
            Options.getNumber = function (value, defaultValue) {
                if (defaultValue === void 0) { defaultValue = 0; }
                var n = parseFloat(value);
                return !isNaN(n) ? n : defaultValue;
            };
            Options.getString = function (value) {
                var s = String(value);
                return s;
            };
            Options.getIdentifier = function (value) {
                var s = Options.getString(value);
                return s.replace(/[^a-zA-Z0-9\-_]/ig, '');
            };
            Options.getObject = function (value, defaultValue) {
                if (defaultValue === void 0) { defaultValue = {}; }
                // Type check because *val* is of type any
                if (!angular.isObject(value)) {
                    throw TypeError(value + ' option must be an object.');
                }
                var obj = {};
                // Extend by default parameter
                angular.extend(obj, defaultValue, value);
                return obj;
            };
            Options.getArray = function (value, defaultValue) {
                if (defaultValue === void 0) { defaultValue = []; }
                return defaultValue.concat(value);
            };
            Options.uuid = function () {
                // @src: http://stackoverflow.com/a/2117523
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
                    .replace(/[xy]/g, function (c) {
                    var r = Math.random() * 16 | 0;
                    var v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            };
            return Options;
        })();
        Utils.Options = Options;
    })(Utils = n3Charts.Utils || (n3Charts.Utils = {}));
})(n3Charts || (n3Charts = {}));
var n3Charts;
(function (n3Charts) {
    var Utils;
    (function (Utils) {
        'use strict';
        var Dimensions = (function () {
            function Dimensions() {
                this.width = 600;
                this.height = 200;
                this.innerWidth = 560;
                this.innerHeight = 160;
                this.margin = {
                    left: 30,
                    bottom: 20,
                    right: 20,
                    top: 20
                };
            }
            Dimensions.prototype.getDimensionByProperty = function (element, propertyName) {
                var style = window.getComputedStyle(element, null);
                return +style.getPropertyValue(propertyName).replace(/px$/, '');
            };
            Dimensions.prototype.fromParentElement = function (parent) {
                // Oooooh I hate doing this.
                var hPadding = this.getDimensionByProperty(parent, 'padding-left') + this.getDimensionByProperty(parent, 'padding-right');
                var vPadding = this.getDimensionByProperty(parent, 'padding-top') + this.getDimensionByProperty(parent, 'padding-bottom');
                this.width = parent.clientWidth - hPadding;
                this.height = parent.clientHeight - vPadding;
                this.innerHeight = this.height - this.margin.top - this.margin.bottom;
                this.innerWidth = this.width - this.margin.left - this.margin.right;
            };
            return Dimensions;
        })();
        Utils.Dimensions = Dimensions;
    })(Utils = n3Charts.Utils || (n3Charts.Utils = {}));
})(n3Charts || (n3Charts = {}));
/// <reference path='EventManager.ts' />
/// <reference path='FactoryManager.ts' />
/// <reference path='BaseFactory.ts' />
/// <reference path='SeriesFactory.ts' />
/// <reference path='Dataset.ts' />
/// <reference path='Data.ts' />
/// <reference path='SeriesOptions.ts' />
/// <reference path='AxisOptions.ts' />
/// <reference path='Options.ts' />
/// <reference path='Dimensions.ts' />
var n3Charts;
(function (n3Charts) {
    var Factory;
    (function (Factory) {
        'use strict';
        var Container = (function (_super) {
            __extends(Container, _super);
            function Container(element) {
                _super.call(this);
                this.element = element;
                this.dim = new n3Charts.Utils.Dimensions();
            }
            Container.prototype.create = function () {
                this.createRoot();
                this.createContainer();
                this.eventMgr.on('resize', this.dim.fromParentElement.bind(this.dim));
            };
            Container.prototype.update = function (datasets, options) {
                this.updateRoot();
                this.updateContainer();
            };
            Container.prototype.destroy = function () {
                this.destroyRoot();
            };
            Container.prototype.createRoot = function () {
                // Create the SVG root node
                this.svg = d3.select(this.element)
                    .append('svg')
                    .attr('class', 'chart');
            };
            Container.prototype.updateRoot = function () {
                // Update the dimensions of the root
                this.svg
                    .attr('width', this.dim.width)
                    .attr('height', this.dim.height);
            };
            Container.prototype.destroyRoot = function () {
                // Remove the root node
                this.svg.remove();
            };
            Container.prototype.createContainer = function () {
                // Create a visualization container
                this.vis = this.svg
                    .append('g')
                    .attr('class', 'container');
                this.axes = this.vis
                    .append('g')
                    .attr('class', 'axes');
                this.data = this.vis
                    .append('g')
                    .attr('class', 'data');
            };
            Container.prototype.updateContainer = function () {
                // Update the dimensions of the container
                this.vis
                    .attr('width', this.dim.innerWidth)
                    .attr('height', this.dim.innerHeight)
                    .attr('transform', 'translate(' + this.dim.margin.left + ', ' + this.dim.margin.top + ')');
            };
            Container.prototype.getDimensions = function () {
                return this.dim;
            };
            return Container;
        })(n3Charts.Utils.BaseFactory);
        Factory.Container = Container;
    })(Factory = n3Charts.Factory || (n3Charts.Factory = {}));
})(n3Charts || (n3Charts = {}));
var n3Charts;
(function (n3Charts) {
    var Factory;
    (function (Factory) {
        'use strict';
        var Tooltip = (function (_super) {
            __extends(Tooltip, _super);
            function Tooltip(element) {
                _super.call(this);
                this.element = element;
            }
            Tooltip.prototype.create = function () {
                this.createTooltip();
                this.eventMgr.on('over.tooltip', this.show.bind(this));
                this.eventMgr.on('leave.tooltip', this.hide.bind(this));
            };
            Tooltip.prototype.createTooltip = function () {
                var svg = this.svg = d3.select(this.element)
                    .append('div')
                    .attr('class', 'chart-tooltip')
                    .style('position', 'absolute');
                svg.append('div')
                    .attr('class', 'arrow');
                svg.append('div')
                    .attr('class', 'abscissas')
                    .style('display', 'inline-block');
                svg.append('div')
                    .attr('class', 'value')
                    .style('display', 'inline-block');
            };
            Tooltip.prototype.destroy = function () {
                this.svg.remove();
            };
            Tooltip.prototype.show = function (datum, index, series) {
                this.updateTooltipContent(datum, index, series);
                this.updateTooltipPosition(datum, index, series);
                this.svg
                    .transition()
                    .call(this.factoryMgr.get('transitions').edit)
                    .style('opacity', '1');
                return;
            };
            Tooltip.prototype.updateTooltipContent = function (datum, index, series) {
                this.svg.select('.abscissas').text(datum.x);
                this.svg.select('.value').text(datum.y);
                this.svg.style('background-color', series.color);
                this.svg.select('.arrow').style('border-top-color', series.color);
            };
            Tooltip.prototype.updateTooltipPosition = function (datum, index, series) {
                var xScale = this.factoryMgr.get('x-axis').scale;
                var yScale = this.factoryMgr.get('y-axis').scale;
                var x = xScale(datum.x);
                if (series.isAColumn()) {
                    x += this.factoryMgr.get('series-column').getTooltipPosition(series);
                }
                var margin = this.factoryMgr.get('container').getDimensions().margin;
                var leftOffset = this.element.offsetLeft;
                var topOffset = this.element.offsetTop;
                this.svg
                    .classed('positive', datum.y >= 0)
                    .classed('negative', datum.y < 0)
                    .style({
                    'left': (leftOffset + margin.left + x) + 'px',
                    'top': (topOffset + margin.top + yScale(datum.y)) + 'px'
                });
                return;
            };
            Tooltip.prototype.hide = function () {
                // Next time one of us has to write this, I'll disable this goddamn linter.
                var self = this.svg;
                this.svg
                    .transition()
                    .call(this.factoryMgr.get('transitions').edit)
                    .style('opacity', '0')
                    .each('end', function () { return self.style({ 'left': '0px', 'top': '0px' }); });
                return;
            };
            return Tooltip;
        })(n3Charts.Utils.BaseFactory);
        Factory.Tooltip = Tooltip;
    })(Factory = n3Charts.Factory || (n3Charts.Factory = {}));
})(n3Charts || (n3Charts = {}));
var n3Charts;
(function (n3Charts) {
    var Factory;
    (function (Factory) {
        'use strict';
        var Legend = (function (_super) {
            __extends(Legend, _super);
            function Legend(element) {
                _super.call(this);
                this.element = element;
            }
            Legend.prototype.create = function () {
                this.createLegend();
            };
            Legend.prototype.createLegend = function () {
                this.div = d3.select(this.element)
                    .append('div')
                    .attr('class', 'chart-legend')
                    .style('position', 'absolute');
            };
            Legend.prototype.legendClick = function () {
                var _this = this;
                return function (selection) {
                    return selection.on('click', function (series) {
                        _this.eventMgr.trigger('legend-click', series);
                    });
                };
            };
            Legend.prototype.update = function (data, options) {
                var _this = this;
                // Get the container dimensions
                var container = this.factoryMgr.get('container');
                var dim = container.getDimensions();
                var init = function (series) {
                    var items = series.append('div').attr({ 'class': 'item' })
                        .call(_this.legendClick());
                    items.append('div').attr({ 'class': 'icon' });
                    items.append('div').attr({ 'class': 'label' });
                };
                var update = function (series) {
                    series
                        .attr('class', function (d) { return 'item ' + d.type.join(' '); })
                        .classed('hidden', function (d) { return !d.visible; });
                    series.select('.icon').style('background-color', function (d) { return d.color; });
                    series.select('.label').text(function (d) { return d.label; });
                };
                var legendItems = this.div.selectAll('.item')
                    .data(options.series);
                legendItems.enter().call(init);
                legendItems.call(update);
                legendItems.exit().remove();
            };
            Legend.prototype.destroy = function () {
                this.div.remove();
            };
            return Legend;
        })(n3Charts.Utils.BaseFactory);
        Factory.Legend = Legend;
    })(Factory = n3Charts.Factory || (n3Charts.Factory = {}));
})(n3Charts || (n3Charts = {}));
var n3Charts;
(function (n3Charts) {
    var Factory;
    (function (Factory) {
        'use strict';
        var Axis = (function (_super) {
            __extends(Axis, _super);
            function Axis(side) {
                _super.call(this);
                this.side = side;
                if (!n3Charts.Utils.AxisOptions.isValidSide(side)) {
                    throw new TypeError('Wrong axis side : ' + side);
                }
            }
            Axis.prototype.create = function () {
                // Get the svg container
                var vis = this.factoryMgr.get('container').axes;
                this.createAxis(vis);
            };
            Axis.prototype.update = function (data, options) {
                // Get the container dimensions
                var container = this.factoryMgr.get('container');
                var dim = container.getDimensions();
                // Get the [min, max] extent of the axis
                var extent = this.getExtent(data, options);
                // Get the options for the axis
                var axisOptions = options.getByAxisSide(this.side);
                this.scale = this.getScale(axisOptions);
                this.updateScaleRange(dim);
                this.updateScaleDomain(extent);
                this.axis = this.getAxis(this.scale);
                this.updateAxisOrientation();
                this.updateAxisContainer(dim);
            };
            Axis.prototype.destroy = function () {
                this.destroyAxis();
            };
            Axis.prototype.updateScaleRange = function (dim) {
                if (this.isAbscissas()) {
                    this.scale.range([0, dim.innerWidth]);
                }
                else {
                    this.scale.range([dim.innerHeight, 0]);
                }
            };
            Axis.prototype.updateScaleDomain = function (extent) {
                this.scale.domain(extent);
            };
            Axis.prototype.getExtentForDatasets = function (data, filter, accessor) {
                var min = Number.POSITIVE_INFINITY;
                var max = Number.NEGATIVE_INFINITY;
                for (var key in data.sets) {
                    if (!filter(key)) {
                        continue;
                    }
                    ;
                    data.sets[key].values.forEach(function (datum) {
                        var data = accessor(datum, key);
                        if (data[0] < min) {
                            min = data[0];
                        }
                        if (data[1] > max) {
                            max = data[1];
                        }
                    });
                }
                return [
                    min === Number.POSITIVE_INFINITY ? 0 : min,
                    max === Number.NEGATIVE_INFINITY ? 1 : max
                ];
            };
            Axis.prototype.getExtent = function (datasets, options) {
                var _this = this;
                if (this.isAbscissas()) {
                    var abscissasKey = options.getAbsKey();
                    return this.getExtentForDatasets(datasets, function () { return true; }, function (datum) { return [datum[abscissasKey], datum[abscissasKey]]; });
                }
                var datasetsForSide = [];
                var seriesForDataset = {};
                options.series.forEach(function (series) {
                    if (series.visible && series.axis === _this.side) {
                        datasetsForSide.push(series.dataset);
                        if (!seriesForDataset[series.dataset]) {
                            seriesForDataset[series.dataset] = [];
                        }
                        seriesForDataset[series.dataset].push(series);
                    }
                });
                return this.getExtentForDatasets(datasets, function (key) { return datasetsForSide.indexOf(key) > -1; }, function (datum, datasetKey) {
                    var data = seriesForDataset[datasetKey].map(function (series) { return datum[series.key]; });
                    return [d3.min(data), d3.max(data)];
                });
            };
            Axis.prototype.isAbscissas = function () {
                return this.side === n3Charts.Utils.AxisOptions.SIDE.X;
            };
            Axis.prototype.createAxis = function (vis) {
                // Create the axis container
                this.svg = vis
                    .append('g')
                    .attr('class', 'axis ' + this.side + '-axis');
            };
            Axis.prototype.updateAxisOrientation = function () {
                if (this.isAbscissas()) {
                    this.axis.orient('bottom');
                }
                else {
                    this.axis.orient('left');
                }
            };
            Axis.prototype.updateAxisContainer = function (dim) {
                // Move the axis container to the correct position
                if (this.isAbscissas()) {
                    this.svg
                        .attr('transform', 'translate(0, ' + dim.innerHeight + ')');
                }
                else {
                    this.svg
                        .attr('transform', 'translate(0, 0)');
                }
                // Redraw the Axis
                this.svg
                    .transition()
                    .call(this.factoryMgr.get('transitions').edit)
                    .call(this.axis);
            };
            Axis.prototype.destroyAxis = function () {
                // Remove the axis container
                this.svg.remove();
            };
            Axis.prototype.getScale = function (options) {
                // Create and return a D3 Scale
                var scale;
                if (options.type === n3Charts.Utils.AxisOptions.TYPE.DATE) {
                    return d3.time.scale();
                }
                return d3.scale.linear();
            };
            Axis.prototype.getAxis = function (scale) {
                // Create and return a D3 Axis generator
                return d3.svg.axis()
                    .scale(scale);
            };
            return Axis;
        })(n3Charts.Utils.BaseFactory);
        Factory.Axis = Axis;
    })(Factory = n3Charts.Factory || (n3Charts.Factory = {}));
})(n3Charts || (n3Charts = {}));
var n3Charts;
(function (n3Charts) {
    var Factory;
    (function (Factory) {
        'use strict';
        var Transition = (function (_super) {
            __extends(Transition, _super);
            function Transition() {
                _super.apply(this, arguments);
            }
            Transition.prototype.enter = function (t) {
                var duration = Transition.duration;
                var ease = Transition.ease;
                var n = t[0].length;
                var delay = function (d, i) { return n ? i / n * duration : 0; };
                return t.duration(duration)
                    .delay(delay)
                    .ease(ease);
            };
            Transition.prototype.edit = function (t) {
                var duration = Transition.duration;
                var ease = Transition.ease;
                var delay = 0;
                return t.duration(duration)
                    .delay(delay)
                    .ease(ease);
            };
            Transition.prototype.exit = function (t) {
                var duration = Transition.duration;
                var ease = Transition.ease;
                var delay = 0;
                return t.duration(duration)
                    .delay(delay)
                    .ease(ease);
            };
            Transition.duration = 250;
            Transition.ease = 'cubic';
            return Transition;
        })(n3Charts.Utils.BaseFactory);
        Factory.Transition = Transition;
    })(Factory = n3Charts.Factory || (n3Charts.Factory = {}));
})(n3Charts || (n3Charts = {}));
var n3Charts;
(function (n3Charts) {
    var Factory;
    (function (Factory) {
        var Series;
        (function (Series) {
            'use strict';
            var Dot = (function (_super) {
                __extends(Dot, _super);
                function Dot() {
                    _super.apply(this, arguments);
                    this.type = n3Charts.Utils.SeriesOptions.TYPE.DOT;
                }
                Dot.prototype.updateData = function (group, series, index, numSeries) {
                    var xAxis = this.factoryMgr.get('x-axis');
                    var yAxis = this.factoryMgr.get('y-axis');
                    var dotsData = this.data.getDatasetValues(series, this.options);
                    var dotsRadius = 4;
                    var dots = group.selectAll('.' + this.type)
                        .data(dotsData, function (d) { return d.x; });
                    var initPoint = function (s) {
                        s.attr({
                            r: function (d) { return 4; },
                            cx: function (d) { return xAxis.scale(d.x); },
                            cy: function (d) { return yAxis.scale(0); }
                        });
                    };
                    var updatePoint = function (s) {
                        s.attr({
                            cx: function (d) { return xAxis.scale(d.x); },
                            cy: function (d) { return yAxis.scale(d.y); }
                        })
                            .style('opacity', series.visible ? 1 : 0);
                    };
                    dots.enter()
                        .append('circle')
                        .attr('class', this.type)
                        .call(this.eventMgr.datumEnter(series))
                        .call(this.eventMgr.datumOver(series))
                        .call(this.eventMgr.datumMove(series))
                        .call(this.eventMgr.datumLeave(series))
                        .call(initPoint)
                        .transition()
                        .call(this.factoryMgr.get('transitions').enter)
                        .call(updatePoint);
                    dots
                        .transition()
                        .call(this.factoryMgr.get('transitions').edit)
                        .call(updatePoint);
                    dots.exit()
                        .transition()
                        .call(this.factoryMgr.get('transitions').exit)
                        .call(initPoint)
                        .each('end', function () {
                        d3.select(this).remove();
                    });
                };
                Dot.prototype.styleSeries = function (group) {
                    group.style({
                        'fill': function (d) { return d.color; },
                        'stroke': 'white'
                    });
                };
                return Dot;
            })(n3Charts.Utils.SeriesFactory);
            Series.Dot = Dot;
        })(Series = Factory.Series || (Factory.Series = {}));
    })(Factory = n3Charts.Factory || (n3Charts.Factory = {}));
})(n3Charts || (n3Charts = {}));
var n3Charts;
(function (n3Charts) {
    var Factory;
    (function (Factory) {
        var Series;
        (function (Series) {
            'use strict';
            var Line = (function (_super) {
                __extends(Line, _super);
                function Line() {
                    _super.apply(this, arguments);
                    this.type = n3Charts.Utils.SeriesOptions.TYPE.LINE;
                }
                Line.prototype.updateData = function (group, series, index, numSeries) {
                    var xAxis = this.factoryMgr.get('x-axis');
                    var yAxis = this.factoryMgr.get('y-axis');
                    var lineData = this.data.getDatasetValues(series, this.options);
                    var initLine = d3.svg.line()
                        .x(function (d) { return xAxis.scale(d.x); })
                        .y(yAxis.scale(0));
                    var updateLine = d3.svg.line()
                        .x(function (d) { return xAxis.scale(d.x); })
                        .y(function (d) { return yAxis.scale(d.y); });
                    var line = group.selectAll('.' + this.type)
                        .data([lineData]);
                    line.enter()
                        .append('path')
                        .attr('class', this.type)
                        .attr('d', function (d) { return initLine(d); })
                        .transition()
                        .call(this.factoryMgr.get('transitions').enter)
                        .attr('d', function (d) { return updateLine(d); });
                    line
                        .transition()
                        .call(this.factoryMgr.get('transitions').edit)
                        .attr('d', function (d) { return updateLine(d); })
                        .style('opacity', series.visible ? 1 : 0);
                    line.exit()
                        .transition()
                        .call(this.factoryMgr.get('transitions').exit)
                        .attr('d', function (d) { return initLine(d); })
                        .each('end', function () {
                        d3.select(this).remove();
                    });
                };
                Line.prototype.styleSeries = function (group) {
                    group.style({
                        'fill': 'none',
                        'stroke': function (s) { return s.color; }
                    });
                };
                return Line;
            })(n3Charts.Utils.SeriesFactory);
            Series.Line = Line;
        })(Series = Factory.Series || (Factory.Series = {}));
    })(Factory = n3Charts.Factory || (n3Charts.Factory = {}));
})(n3Charts || (n3Charts = {}));
var n3Charts;
(function (n3Charts) {
    var Factory;
    (function (Factory) {
        var Series;
        (function (Series) {
            'use strict';
            var Area = (function (_super) {
                __extends(Area, _super);
                function Area() {
                    _super.apply(this, arguments);
                    this.type = n3Charts.Utils.SeriesOptions.TYPE.AREA;
                }
                Area.prototype.updateData = function (group, series, index, numSeries) {
                    var xAxis = this.factoryMgr.get('x-axis');
                    var yAxis = this.factoryMgr.get('y-axis');
                    var areaData = this.data.getDatasetValues(series, this.options);
                    var initArea = d3.svg.area()
                        .x(function (d) { return xAxis.scale(d.x); })
                        .y0(yAxis.scale(0))
                        .y1(function (d) { return yAxis.scale(0); });
                    var updateArea = d3.svg.area()
                        .x(function (d) { return xAxis.scale(d.x); })
                        .y0(yAxis.scale(0))
                        .y1(function (d) { return yAxis.scale(d.y); });
                    var area = group.selectAll('.' + this.type)
                        .data([areaData]);
                    area.enter()
                        .append('path')
                        .attr('class', this.type)
                        .attr('d', function (d) { return initArea(d); })
                        .transition()
                        .call(this.factoryMgr.get('transitions').enter)
                        .attr('d', function (d) { return updateArea(d); });
                    area
                        .transition()
                        .call(this.factoryMgr.get('transitions').edit)
                        .attr('d', function (d) { return updateArea(d); })
                        .style('opacity', series.visible ? 1 : 0);
                    area.exit()
                        .transition()
                        .call(this.factoryMgr.get('transitions').exit)
                        .attr('d', function (d) { return initArea(d); })
                        .each('end', function () {
                        d3.select(this).remove();
                    });
                };
                Area.prototype.styleSeries = function (group) {
                    group.style({
                        'fill': function (s) { return s.color; },
                        'stroke': function (s) { return s.color; },
                        'opacity': 0.3
                    });
                };
                return Area;
            })(n3Charts.Utils.SeriesFactory);
            Series.Area = Area;
        })(Series = Factory.Series || (Factory.Series = {}));
    })(Factory = n3Charts.Factory || (n3Charts.Factory = {}));
})(n3Charts || (n3Charts = {}));
var n3Charts;
(function (n3Charts) {
    var Factory;
    (function (Factory) {
        var Series;
        (function (Series) {
            'use strict';
            var Column = (function (_super) {
                __extends(Column, _super);
                function Column() {
                    _super.apply(this, arguments);
                    this.type = n3Charts.Utils.SeriesOptions.TYPE.COLUMN;
                    this.gapFactor = 0.2;
                    this.outerPadding = (this.gapFactor / 2) * 3;
                    this.columnsWidth = 0;
                }
                Column.prototype.update = function (data, options) {
                    this.data = data;
                    this.options = options;
                    var series = options.getSeriesByType(this.type).filter(function (s) { return s.visible; });
                    this.updateColumnsWidth(series, options);
                    this.updateColumnScale(series, options);
                    this.updateSeriesContainer(series);
                };
                Column.prototype.updateColumnsWidth = function (series, options) {
                    var xAxis = this.factoryMgr.get('x-axis');
                    var colsDatasets = this.data.getDatasets(series, options);
                    var delta = n3Charts.Utils.Data.getMinDistance(colsDatasets, xAxis.scale, 'x');
                    this.columnsWidth = delta < Number.MAX_VALUE ? delta / series.length : 10;
                };
                Column.prototype.updateColumnScale = function (series, options) {
                    var halfWidth = this.columnsWidth * series.length / 2;
                    this.innerXScale = d3.scale.ordinal()
                        .domain(series.map(function (s) { return s.id; }))
                        .rangeBands([-halfWidth, halfWidth], 0, 0.1);
                };
                Column.prototype.getTooltipPosition = function (series) {
                    return this.innerXScale(series.id) + this.innerXScale.rangeBand() / 2;
                };
                Column.prototype.updateData = function (group, series, index, numSeries) {
                    var _this = this;
                    var xAxis = this.factoryMgr.get('x-axis');
                    var yAxis = this.factoryMgr.get('y-axis');
                    var colsData = this.data.getDatasetValues(series, this.options);
                    var xFn = function (d) { return xAxis.scale(d.x) + _this.innerXScale(series.id); };
                    var initCol = function (s) {
                        s.attr({
                            x: xFn,
                            y: yAxis.scale(0),
                            width: _this.innerXScale.rangeBand(),
                            height: 0
                        });
                    };
                    var updateCol = function (s) {
                        s.attr({
                            x: xFn,
                            y: function (d) { return d.y > 0 ? yAxis.scale(d.y) : yAxis.scale(0); },
                            width: _this.innerXScale.rangeBand(),
                            height: function (d) { return Math.abs(yAxis.scale(0) - yAxis.scale(d.y)); }
                        })
                            .style('opacity', series.visible ? 1 : 0);
                    };
                    var cols = group.selectAll('.' + this.type)
                        .data(colsData, function (d) { return d.x; });
                    cols.enter()
                        .append('rect')
                        .attr('class', this.type)
                        .call(this.eventMgr.datumEnter(series))
                        .call(this.eventMgr.datumOver(series))
                        .call(this.eventMgr.datumMove(series))
                        .call(this.eventMgr.datumLeave(series))
                        .call(initCol)
                        .transition()
                        .call(this.factoryMgr.get('transitions').enter)
                        .call(updateCol);
                    cols
                        .transition()
                        .call(this.factoryMgr.get('transitions').edit)
                        .call(updateCol);
                    cols.exit()
                        .transition()
                        .call(this.factoryMgr.get('transitions').exit)
                        .call(initCol)
                        .each('end', function () {
                        d3.select(this).remove();
                    });
                };
                Column.prototype.styleSeries = function (group) {
                    group.style({
                        'fill': function (d) { return d.color; },
                        'fill-opacity': 0.5,
                        'stroke': function (d) { return d.color; },
                        'stroke-width': 1
                    });
                };
                return Column;
            })(n3Charts.Utils.SeriesFactory);
            Series.Column = Column;
        })(Series = Factory.Series || (Factory.Series = {}));
    })(Factory = n3Charts.Factory || (n3Charts.Factory = {}));
})(n3Charts || (n3Charts = {}));
/// <reference path='Dot.ts' />
/// <reference path='Line.ts' />
/// <reference path='Area.ts' />
/// <reference path='Column.ts' />
/// <reference path='Container.ts' />
/// <reference path='Tooltip.ts' />
/// <reference path='Legend.ts' />
/// <reference path='Axis.ts' />
/// <reference path='Transition.ts' />
/// <reference path='series/_index.ts' />
/// <reference path='../typings/jquery/jquery.d.ts' />
/// <reference path='../typings/angularjs/angular.d.ts' />
/// <reference path='../typings/d3/d3.d.ts' />
/// <reference path='utils/_index.ts' />
/// <reference path='factories/_index.ts' />
/// <reference path='LineChart.ts' />
var n3Charts;
(function (n3Charts) {
    'use strict';
    // Create the angular module
    angular.module('n3-line-chart', [])
        .directive('linechart', ['$window', function ($window) { return new n3Charts.LineChart($window); }]);
})(n3Charts || (n3Charts = {}));
