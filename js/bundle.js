/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	console.clear();

	var statCanvasHeight = 100;

	var params = {
		searchSpeed: 1000,
		annealSpeed: 100,
		coolingFactor: 300,
		randomPoints: 0
	};

	var OverlayRenderer = __webpack_require__(1);
	var SimulatedAnnealingSolver = __webpack_require__(2);
	var PathFinder = __webpack_require__(3);
	var StatGraph = __webpack_require__(5);
	var MapRenderer = __webpack_require__(6);
	var utils = __webpack_require__(7);
	var processNodes = __webpack_require__(8);
	var mapData = __webpack_require__(9);

	var mapCanvas = document.getElementById('mapCanvas');
	var overlayCanvas = document.getElementById('mainCanvas');
	var statCanvas = document.getElementById('statCanvas');

	var nodes = processNodes(mapData);

	var IDLE = 0,
	    STARTING = 1,
	    PATHFINDING = 2,
	    SOLVING = 3;
	var state = IDLE,
	    selected = []; //[nodes[19086]];

	var mapRenderer = new MapRenderer(mapCanvas, { roads: mapData.roads, selected: selected });
	var overlayRenderer = new OverlayRenderer(overlayCanvas);
	var stats = new StatGraph(statCanvas);
	var annealingGraph = stats.addGraph({ color: 'red' });
	var temperatureGraph = stats.addGraph({ color: 'green' });

	var pathFinder = new PathFinder({
		onPathFound: function onPathFound() {
			return mapRenderer.draw();
		}
	});

	var solver = new SimulatedAnnealingSolver({
		generateNeighbor: utils.reverseRandomSlice,
		getCost: function getCost(path) {
			var sum = path[path.length - 1].paths[path[0].id].cost;
			for (var i = 0; i < path.length - 1; i++) {
				sum += path[i].paths[path[i + 1].id].cost;
			}
			if (isNaN(sum)) {
				console.error('NaN!', path);
				state = IDLE;
			}
			return sum;
		}
	});

	var resize = window.onresize = function () {
		var width = window.innerWidth;

		nodes.forEach(function (node) {
			node.screenX = node.x * width;
			node.screenY = node.y * width;
		});

		var scaledMapHeight = Math.floor(mapData.height / mapData.width * width);

		mapRenderer.resize(width, scaledMapHeight);
		overlayRenderer.resize(width, scaledMapHeight);
		stats.resize(width, statCanvasHeight);
	};

	var loop = function loop() {
		requestAnimationFrame(loop);
		if (state == IDLE) return;

		if (state == STARTING) {
			pathFinder.init(nodes, selected);
			stats.reset();
			mapRenderer.draw();
			overlayRenderer.bind({ nodes: nodes, solveState: false });
			state = PATHFINDING;
		}

		for (var i = 0; state == PATHFINDING && i < params.searchSpeed; i++) {
			if (!pathFinder.iterate()) {
				if (selected.length > 2) {
					solver.init(selected, selected.length, 1 - 1 / params.coolingFactor / selected.length);
					state = SOLVING;
				} else state = IDLE;
			}
		}

		if (state == SOLVING) {
			for (var _i = 0; state == SOLVING && _i < params.annealSpeed; _i++) {
				if (!solver.iterate()) state = IDLE;
			}
			annealingGraph(solver.currentCost);
			temperatureGraph(solver.temperature);
			overlayRenderer.bind({ solveState: solver.currentState });
		}

		overlayRenderer.draw();
		stats.draw();
	};

	overlayCanvas.onclick = function (e) {
		var x = e.offsetX / overlayCanvas.width;
		var y = e.offsetY / overlayCanvas.width;
		var closest = utils.closestNode(nodes, x, y);
		var index = selected.indexOf(closest);
		if (index == -1) {
			selected.unshift(closest);
		} else {
			selected.splice(index, 1);
		}
		state = STARTING;
	};

	overlayCanvas.onmousemove = function (e) {
		var x = e.offsetX / overlayCanvas.width;
		var y = e.offsetY / overlayCanvas.width;
		overlayRenderer.bind({
			nodeAtCursor: utils.closestNode(nodes, x, y)
		});
		overlayRenderer.draw();
	};

	var setRandom = function setRandom() {
		selected.length = 0;
		for (var i = 0; i < params.randomPoints; i++) {
			var n = nodes[Math.floor(Math.random() * nodes.length)];
			if (!selected.includes(n)) selected.push(n);
		}
		state = STARTING;
	};

	var gui = new window.dat.GUI();
	gui.add(params, 'searchSpeed', 1, 10000);
	gui.add(params, 'annealSpeed', 1, 1000);
	gui.add(params, 'coolingFactor', 10, 1000);
	gui.add(params, 'randomPoints', 0, 100).step(1).onChange(setRandom);
	gui.add({
		'Clear All Points': function ClearAllPoints() {
			selected.length = 0;
			state = STARTING;
		}
	}, 'Clear All Points');

	window.onerror = function () {
		return state = IDLE;
	};
	window.onresize = resize;
	window.top.selected = selected;

	resize();
	setRandom();
	loop();

/***/ },
/* 1 */
/***/ function(module, exports) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var MapRenderer = function () {
		function MapRenderer(canvas) {
			_classCallCheck(this, MapRenderer);

			this.canvas = canvas;
			this.context = canvas.getContext('2d');
			this.opts = {};
			window.map = this;
		}

		_createClass(MapRenderer, [{
			key: 'resize',
			value: function resize(width, height) {
				this.canvas.width = width;
				this.canvas.height = height;
				this.draw();
			}
		}, {
			key: 'bind',
			value: function bind(opts) {
				var _this = this;

				Object.keys(opts).forEach(function (key) {
					return _this.opts[key] = opts[key];
				});
			}
		}, {
			key: 'draw',
			value: function draw() {
				var T = this.context;
				var nodes = this.opts.nodes;
				var solveState = this.opts.solveState;
				var cursor = this.opts.nodeAtCursor;

				T.clearRect(0, 0, this.canvas.width, this.canvas.height);

				if (nodes) {
					T.lineWidth = 0.5;
					T.strokeStyle = '#0F0';
					T.beginPath();
					for (var i = 0; i < nodes.length; i++) {
						var n = nodes[i];
						if (n.prev) {
							T.moveTo(n.screenX, n.screenY);
							T.lineTo(n.prev.screenX, n.prev.screenY);
						}
					}
					T.stroke();
				}

				if (solveState) {
					T.lineWidth = 2;
					T.strokeStyle = 'red';
					T.beginPath();
					for (var _i = 0; _i < solveState.length; _i++) {
						var next = solveState[_i].paths[solveState[(_i + 1) % solveState.length].id];
						if (next) {
							var path = next.path;
							T.moveTo(path[0].screenX, path[0].screenY);
							for (var j = 1; j < path.length; j++) {
								T.lineTo(path[j].screenX, path[j].screenY);
							}
						}
					}
					T.stroke();
				}

				if (cursor) {
					T.fillStyle = 'white';
					T.fillRect(cursor.screenX - 2, cursor.screenY - 2, 4, 4);
					T.fillText(cursor.label, cursor.screenX, cursor.screenY - 10);
				}
			}
		}]);

		return MapRenderer;
	}();

	module.exports = MapRenderer;

/***/ },
/* 2 */
/***/ function(module, exports) {

	"use strict";

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var SimulatedAnnealingSolver = function () {
		function SimulatedAnnealingSolver(opts) {
			_classCallCheck(this, SimulatedAnnealingSolver);

			this.getCost = opts.getCost; // a function that takes a state and returns a number
			this.generateNeighbor = opts.generateNeighbor; // a function that takes a state and returns a new state
		}

		_createClass(SimulatedAnnealingSolver, [{
			key: "init",
			value: function init(initialState, initialTemperature, coolingFactor) {
				this.temperature = initialTemperature;
				this.coolingFactor = coolingFactor;
				this.currentState = this.bestState = initialState;
				this.minCost = this.maxCost = this.currentCost = this.getCost(this.currentState);
			}
		}, {
			key: "iterate",
			value: function iterate() {
				var neighbor = this.generateNeighbor(this.currentState);
				var neighborCost = this.getCost(neighbor);
				var costDelta = neighborCost - this.currentCost;
				if (costDelta <= 0 || Math.random() < Math.exp(-costDelta / this.temperature)) {
					this.currentState = neighbor;
					this.currentCost = neighborCost;
					if (this.currentCost < this.minCost) {
						this.bestState = this.currentState;
						this.minCost = this.currentCost;
					}
					this.maxCost = Math.max(this.maxCost, this.currentCost);
				}
				this.temperature *= this.coolingFactor;
				return this.temperature > 1 - this.coolingFactor;
			}
		}]);

		return SimulatedAnnealingSolver;
	}();

	module.exports = SimulatedAnnealingSolver;

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var IterativeAStarSearch = __webpack_require__(4);

	var IterativePathFinder = function () {
		function IterativePathFinder(opts) {
			var _this = this;

			_classCallCheck(this, IterativePathFinder);

			Object.keys(opts).forEach(function (key) {
				return _this[key] = opts[key];
			});
		}

		_createClass(IterativePathFinder, [{
			key: 'init',
			value: function init(nodes, destinations) {
				this.nodes = nodes;
				this.destinations = destinations;
				this.currentIndex = 0;
				this.aStar = false;
			}
		}, {
			key: 'iterate',
			value: function iterate() {

				var currentNode = this.destinations[this.currentIndex];

				if (!currentNode) {
					for (var i = 0; i < this.nodes.length; i++) {
						delete this.nodes[i].totalCost;
						delete this.nodes[i].fScore;
						delete this.nodes[i].visited;
						delete this.nodes[i].prev;
					}
					return false;
				}

				if (!this.aStar) {
					this.aStar = new IterativeAStarSearch(this.nodes, this.destinations[this.currentIndex], this.destinations);
				}

				if (!this.aStar.iterate()) {
					currentNode.paths = {};
					this.destinations.forEach(function (destination) {
						if (destination != currentNode) {
							var path = [];
							var current = destination;
							while (current) {
								path.push(current);
								current = current.prev;
							}
							if (destination.totalCost == Infinity) {
								console.log('Infinity!', currentNode);
							}
							currentNode.paths[destination.id] = { path: path, cost: destination.totalCost };
						}
					});

					this.currentIndex++;
					this.aStar = false;
					this.onPathFound();
				}

				return true;
			}
		}]);

		return IterativePathFinder;
	}();

	module.exports = IterativePathFinder;

/***/ },
/* 4 */
/***/ function(module, exports) {

	"use strict";

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var IterativeAStarSearch = function () {
		function IterativeAStarSearch(nodes, start, destinations) {
			_classCallCheck(this, IterativeAStarSearch);

			this.destinations = destinations;
			this.remainingDestinations = this.destinations.length;

			for (var i = 0; i < nodes.length; i++) {
				nodes[i].totalCost = Infinity;
				nodes[i].fScore = Infinity;
				nodes[i].visited = false;
				nodes[i].prev = false;
			}

			start.totalCost = 0;
			this.updateFScore(start);
			this.queue = [start];
		}

		_createClass(IterativeAStarSearch, [{
			key: "updateFScore",
			value: function updateFScore(node) {
				var minCostSquared = Infinity;
				for (var i = 0; i < this.destinations.length; i++) {
					var d = this.destinations[i];
					if (!d.visited) {
						var dx = node.x - d.x;
						var dy = node.y - d.y;
						minCostSquared = Math.min(minCostSquared, dx * dx + dy * dy);
					}
				}
				node.fScore = node.totalCost + Math.sqrt(minCostSquared);
			}
		}, {
			key: "iterate",
			value: function iterate() {
				if (!this.remainingDestinations || !this.queue.length) return false;

				var currentIndex = 0;
				for (var i = 1; i < this.queue.length; i++) {
					if (this.queue[i].fScore < this.queue[currentIndex].fScore) {
						currentIndex = i;
					}
				}

				var current = this.queue[currentIndex];
				current.visited = true;
				this.queue.splice(currentIndex, 1);

				if (this.destinations.includes(current)) {
					this.remainingDestinations--;
					if (!this.remainingDestinations) return false;
					for (var j = 0; j < this.queue.length; j++) {
						this.updateFScore(this.queue[j]);
					}
				}

				for (var _i = 0; _i < current.neighbors.length; _i++) {
					var cost = current.neighbors[_i].cost;
					var neighbor = current.neighbors[_i].node;
					if (neighbor.visited) continue;

					var tentativeCost = current.totalCost + cost;

					if (!this.queue.includes(neighbor)) {
						this.queue.push(neighbor);
					} else if (tentativeCost >= neighbor.totalCost) {
						continue;
					}

					neighbor.prev = current;
					neighbor.totalCost = tentativeCost;
					this.updateFScore(neighbor);
				}

				return true;
			}
		}]);

		return IterativeAStarSearch;
	}();

	;

	module.exports = IterativeAStarSearch;

/***/ },
/* 5 */
/***/ function(module, exports) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var StatGraph = function () {
		function StatGraph(canvas) {
			_classCallCheck(this, StatGraph);

			this.canvas = canvas;
			this.context = this.canvas.getContext('2d');
			this.graphs = [];
		}

		_createClass(StatGraph, [{
			key: 'addGraph',
			value: function addGraph(opts) {
				this.graphs.push(opts);
				this.reset();
				return function (val) {
					opts.max = Math.max(opts.max, val);
					opts.data.push(val);
				};
			}
		}, {
			key: 'reset',
			value: function reset() {
				this.graphs.forEach(function (type) {
					type.max = -Infinity;
					type.data = [];
				});
				this.draw();
			}
		}, {
			key: 'resize',
			value: function resize(width, height) {
				this.canvas.width = width;
				this.canvas.height = height;
				this.draw();
			}
		}, {
			key: 'draw',
			value: function draw() {
				var T = this.context;
				var W = this.canvas.width;
				var H = this.canvas.height;

				T.clearRect(0, 0, W, H);
				T.font = 'monospace';

				this.graphs.filter(function (type) {
					return type.data.length;
				}).forEach(function (type, i) {
					T.fillStyle = T.strokeStyle = type.color;
					T.beginPath();
					for (var _i = 0; _i < type.data.length; _i++) {
						T.lineTo(_i / type.data.length * W, H - type.data[_i] / type.max * H);
					}
					T.stroke();

					T.fillText(type.data[type.data.length - 1], 0, H - 12 - 10 * i);
				});

				T.fillStyle = 'white';
				T.fillText(this.graphs[0].data.length, 0, H - 2);
			}
		}]);

		return StatGraph;
	}();

	module.exports = StatGraph;

/***/ },
/* 6 */
/***/ function(module, exports) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var colors = {
		primary_link: '#F00', // red
		motorway_link: '#FF0', // yellow
		residential: 'green', // lime
		tertiary: '#0FF', // cyan
		primary: '#00F', // blue
		secondary: '#F0F', // magenta
		motorway: 'black', // white
		road: 'white' };

	var MapRenderer = function () {
		function MapRenderer(canvas, opts) {
			_classCallCheck(this, MapRenderer);

			this.canvas = canvas;
			this.context = this.canvas.getContext('2d');
			this.opts = opts;
		}

		_createClass(MapRenderer, [{
			key: 'resize',
			value: function resize(width, height) {
				this.canvas.width = width;
				this.canvas.height = height;
				this.draw();
			}
		}, {
			key: 'draw',
			value: function draw() {

				var T = this.context;
				var roads = this.opts.roads;
				var selected = this.opts.selected;

				var drawLine = function drawLine(nodes) {
					T.moveTo(nodes[0].screenX, nodes[0].screenY);
					for (var i = 1; i < nodes.length; i++) {
						T.lineTo(nodes[i].screenX, nodes[i].screenY);
					}
				};

				T.clearRect(0, 0, this.canvas.width, this.canvas.height);

				if (roads) {
					if (roads[0].type) {
						for (var i = 0; i < roads.length; i++) {
							T.beginPath();
							T.strokeStyle = colors[roads[i].type];
							drawLine(roads[i].nodes);
							T.stroke();
						}
					} else {
						T.lineWidth = 0.25;
						T.strokeStyle = 'white';
						T.beginPath();
						for (var _i = 0; _i < roads.length; _i++) {
							drawLine(roads[_i].nodes);
						}
						T.stroke();

						// const onewayRoads = roads.filter(r => r.oneway);
						// const goingNorth = [], goingSouth = [];
						// for (let i = 0; i < onewayRoads.length; i++){
						// 	let n = onewayRoads[i].nodes;
						// 	for (let j = 0; j < n.length - 1; j++){
						// 		let a = n[j], b = n[j + 1];
						// 		if (a.y < b.y){
						// 			goingSouth.push([a, b]);
						// 		} else {
						// 			goingNorth.push([a, b]);
						// 		}
						// 	}
						// }
						//
						// T.strokeStyle = '#F00';
						// T.beginPath();
						// goingNorth.forEach(([a, b]) => {
						// 	T.moveTo(a.screenX, a.screenY);
						// 	T.lineTo(b.screenX, b.screenY);
						// });
						// T.stroke();
						//
						// T.strokeStyle = '#00F';
						// T.beginPath();
						// goingSouth.forEach(([a, b]) => {
						// 	T.moveTo(a.screenX, a.screenY);
						// 	T.lineTo(b.screenX, b.screenY);
						// });
						// T.stroke();


						// T.fillStyle = '#888';
						// T.beginPath();
						// for (let i = 0; i < roads.length; i++){
						// 	let n = roads[i].nodes;
						// 	for (let j = 0; j < n.length; j++){
						// 		T.rect(n[j].screenX - 1, n[j].screenY - 1, 2, 2);
						// 	}
						// }
						// T.fill();
					}
				}

				if (selected) {
					T.lineWidth = 0.5;
					T.strokeStyle = 'blue';
					T.beginPath();
					for (var _i2 = 1; _i2 < selected.length; _i2++) {
						for (var j = 0; j < _i2; j++) {
							var path = selected[_i2].paths && selected[_i2].paths[selected[j].id] && selected[_i2].paths[selected[j].id].path;
							if (path) drawLine(path);
						}
					}
					T.stroke();

					T.fillStyle = 'red';
					T.beginPath();
					for (var _i3 = 0; _i3 < selected.length; _i3++) {
						T.rect(selected[_i3].screenX - 3, selected[_i3].screenY - 3, 6, 6);
					}
					T.fill();
				}
			}
		}]);

		return MapRenderer;
	}();

	module.exports = MapRenderer;

/***/ },
/* 7 */
/***/ function(module, exports) {

	"use strict";

	Array.prototype.unique = function () {
		return Array.from(new Set(this));
	};

	module.exports = {
		distance: function distance(a, b) {
			var dx = a.x - b.x;
			var dy = a.y - b.y;
			return Math.sqrt(dx * dx + dy * dy);
		},
		boundingBox: function boundingBox(coords) {
			var min = { x: Infinity, y: Infinity };
			var max = { x: -Infinity, y: -Infinity };
			coords.forEach(function (coord) {
				min.x = Math.min(min.x, coord.x);
				min.y = Math.min(min.y, coord.y);
				max.x = Math.max(max.x, coord.x);
				max.y = Math.max(max.y, coord.y);
			});
			return { min: min, max: max };
		},
		closestNode: function closestNode(nodes, x, y) {
			var closestNode = void 0;
			var minDist = Infinity;
			nodes.forEach(function (node) {
				var dx = node.x - x;
				var dy = node.y - y;
				var sqDist = dx * dx + dy * dy;
				if (sqDist < minDist) {
					minDist = sqDist;
					closestNode = node;
				}
			});
			return closestNode;
		},
		reverseRandomSlice: function reverseRandomSlice(arr) {
			var newArr = arr.slice(0);
			var n = Math.floor(Math.random() * arr.length);
			var m = Math.floor(Math.random() * arr.length);
			var start = Math.min(n, m);
			var end = Math.max(n, m);
			while (start < end) {
				newArr[start] = arr[end];
				newArr[end] = arr[start];
				start++;
				end--;
			}
			return newArr;
		}
	};

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

	var utils = __webpack_require__(7);

	module.exports = function (mapData) {

		var nodes = mapData.nodes.split(';').map(function (node, i) {
			var _node$split = node.split(',');

			var _node$split2 = _slicedToArray(_node$split, 2);

			var x = _node$split2[0];
			var y = _node$split2[1];

			return {
				id: i,
				x: x / mapData.width,
				y: y / mapData.width,
				neighbors: [],
				roads: []
			};
		});

		mapData.roads.forEach(function (road) {
			road.nodes = road.nodes.map(function (id) {
				return nodes[id];
			});
			road.nodes.forEach(function (n) {
				n.roads.push(road);
			});
		});

		nodes.forEach(function (n) {
			n.label = n.roads.map(function (r) {
				return r.name + ' (' + r.speed + ')';
			}).unique().join(', ');
			delete n.roads;
		});

		mapData.roads.forEach(function (road) {
			for (var i = 0; i < road.nodes.length - 1; i++) {
				var a = road.nodes[i];
				var b = road.nodes[i + 1];
				var cost = utils.distance(a, b) / road.speed * 60;
				a.neighbors.push({ cost: cost, node: b });
				if (!road.oneway) b.neighbors.push({ cost: cost, node: a });
			}
		});

		return nodes;
	};

/***/ },
/* 9 */
/***/ function(module, exports) {

	module.exports = {
		"width": 10000,
		"height": 4103,
		"nodes": "9313,4092;9294,4061;1194,3531;1173,3515;1153,3498;1069,3409;1029,3365;981,3312;952,3273;924,3233;872,3144;813,3040;772,2967;718,2876;697,2852;643,2799;612,2776;8597,3684;8739,3690;8902,3713;8169,3702;8177,3702;8207,3700;8333,3689;8430,3682;3747,3595;3757,3588;3767,3581;3776,3579;3785,3576;3794,3572;3800,3567;3802,3554;3671,3252;3703,3266;3732,3282;3748,3295;3823,3367;3834,3381;3843,3399;3846,3413;3847,3428;3834,3460;3794,3563;3787,3563;3782,3560;3781,3556;3782,3548;7890,3669;7928,3673;7956,3674;7978,3677;8002,3682;8037,3689;8065,3695;8096,3699;7011,3513;7030,3513;7031,3500;7010,3500;7005,3502;7005,3509;7008,3511;6102,753;6118,735;4971,2803;4973,2813;4983,2818;4989,2821;4991,2826;4991,2828;5151,4034;5525,624;5524,627;5523,629;5516,639;5505,650;2570,3208;2510,3228;2348,3277;2337,3279;2333,3280;2329,3279;2323,3278;2312,3272;2301,3263;7479,3697;7478,3672;6454,3570;6512,3580;6551,3587;6686,3613;6715,3617;2029,3465;2118,3433;2160,3415;2359,3349;2486,3269;2650,3184;3836,3470;3852,3451;3867,3434;3885,3419;3908,3405;4029,3346;4052,3339;4073,3335;4097,3335;4136,3335;9051,3683;9005,3679;8980,3677;8960,3675;8939,3672;8919,3668;4105,3312;4079,3306;4068,3301;4059,3296;4051,3289;3985,3223;3979,3216;3975,3208;3973,3200;3974,3187;3977,3180;3983,3170;3991,3162;3998,3153;4912,3528;4912,3542;4914,3557;4917,3571;4929,3597;4983,3649;4964,3620;4957,3603;4953,3585;4951,3568;4951,3553;4954,3537;3846,3478;3930,3525;8517,94;8518,54;8518,30;8518,25;8517,21;5972,3499;5895,3499;5786,3491;5752,3531;5766,3523;5786,3515;3802,1778;3817,1785;4835,3413;4901,3429;4929,3436;4952,3444;4968,3449;4988,3454;5001,3456;5034,3459;5075,3460;5114,3461;5154,3463;5211,3466;5213,3466;5239,3467;5253,3467;5329,3468;5385,3469;5430,3470;5534,3475;8343,225;8344,215;8345,207;8344,197;8344,189;8345,185;8349,181;8351,178;8402,177;8394,180;8390,183;8387,186;8385,189;8386,192;8388,195;8393,197;8397,200;8400,203;8403,206;8407,213;8419,238;9956,3299;9989,3318;9974,3452;5571,3470;5491,3457;5465,3451;5449,3447;5413,3437;8594,3658;8468,3675;6484,3567;6349,3540;6308,3532;5988,3523;6014,3528;6041,3531;6061,3536;6173,3563;6211,3572;8657,95;8649,84;8645,80;8641,75;8637,72;8635,68;8635,64;8636,53;8636,38;8635,20;8613,19;8587,19;8564,19;8538,18;8526,18;8521,20;8514,18;8512,17;8508,15;8487,6;7348,3818;7349,3841;7875,738;7905,728;7932,721;7970,714;8010,707;823,3793;815,3812;815,3817;818,3818;822,3817;826,3812;834,3795;8405,3674;8293,3659;8259,3652;8252,3649;3535,3617;3581,3623;8712,109;8712,96;8712,80;8712,75;8714,71;8717,67;8722,65;8732,61;8735,56;8735,48;8735,37;8734,33;8729,30;8724,28;8724,25;8723,20;8724,13;8725,6;7255,1972;7256,1940;9212,3007;9269,3007;8899,203;8904,196;8912,189;8921,181;8926,177;8930,176;8934,175;8938,175;8948,177;8952,177;8956,177;8960,176;8964,173;8966,166;8967,164;8970,158;8976,144;8980,134;8982,130;8985,127;8988,123;8993,119;8997,115;9000,111;9002,107;9004,101;9005,95;9004,91;9002,87;8997,84;8993,81;8989,75;4690,1960;4681,1955;4664,1945;4753,1894;4747,1891;4736,1885;4726,1883;6917,3612;6835,3590;6804,3582;8006,3647;7887,3657;7799,3661;9157,2834;9161,2841;9162,2846;9159,2848;9155,2849;9147,2838;4720,1930;4713,1926;4706,1922;4700,1918;4698,1912;5362,1622;5420,1565;2314,3291;2288,3304;2149,3390;2120,3405;2048,3437;2026,3451;6248,1199;6242,1186;6182,1151;6107,1108;6074,1095;6028,1068;5992,1047;9103,820;9127,830;6110,1870;6128,1871;6203,1872;4747,859;4749,858;4750,856;4750,855;4749,853;4748,852;4746,851;4744,851;4742,852;4740,853;4740,854;4740,856;4740,858;4742,859;4743,859;4745,859;8254,228;8264,222;8275,215;8289,206;8303,198;8317,189;8329,182;8335,180;8342,178;8346,178;8363,178;8377,178;8390,177;8413,178;8427,179;8440,181;8452,182;8463,182;8474,182;8501,181;8513,180;8526,179;8534,176;8541,174;8550,171;8556,170;8568,169;8581,168;8583,168;5698,2250;5757,2277;5816,2305;5872,2333;5933,2362;5992,2390;6107,2446;3871,1340;3872,1334;3872,1330;3874,1325;3877,1320;3902,1297;3907,1292;3910,1287;3911,1282;3911,1277;3911,1271;4398,1923;4316,2005;4314,2010;8440,3248;8476,3230;8515,3222;8579,3223;8609,3226;8629,3231;3925,1910;3961,1875;4096,1740;4014,2503;4006,2499;3998,2494;3770,2356;1137,3908;9315,2999;9311,2982;9313,2967;9318,2950;9323,2927;9321,2892;9319,2853;9316,2836;9318,2824;9324,2814;9339,2803;9349,2799;9367,2790;9382,2780;9393,2767;9412,2734;9420,2720;9424,2705;7351,2227;7325,2207;6613,2768;6613,2715;6580,2690;6578,2676;6578,2634;6578,2592;4681,831;4683,830;4683,828;4683,827;4682,825;4681,824;4679,824;4677,824;4675,824;4674,826;4673,827;4673,829;4674,830;4675,831;4677,832;4679,832;3948,2947;3938,2945;3928,2944;3923,2942;3917,2939;3738,2832;3735,2829;3732,2828;3731,2826;3539,3676;3537,3681;3519,3700;3515,3702;3509,3702;3462,3673;3454,3667;3445,3632;7533,2544;7527,2532;7527,2526;7525,2469;3239,3529;3234,3529;3228,3529;3225,3527;3224,3523;3228,3508;3228,3505;3226,3501;3216,3496;763,3784;764,3774;763,3768;760,3761;755,3755;746,3749;733,3739;714,3731;702,3728;690,3721;680,3714;4989,2950;4991,2895;3764,1987;3772,1978;3780,1970;3787,1962;3794,1955;3799,1950;3804,1947;3809,1944;3818,1941;3828,1938;3839,1935;3849,1931;3856,1929;3862,1927;4528,2660;4514,2662;4492,2660;4470,2650;4448,2637;4325,2561;4108,2433;4089,2423;3619,3719;3567,3689;3522,3653;3517,3636;3505,3637;3495,3636;3461,3629;3424,3637;3415,3639;3408,3640;3400,3636;3380,3624;3379,3619;3379,3617;3381,3605;3382,3593;3384,3587;3387,3582;3390,3578;3377,3569;3336,3544;3332,3543;3326,3544;3302,3569;3299,3570;3294,3570;3247,3541;3241,3535;4745,181;4737,155;4723,131;4721,121;4722,116;4726,111;4732,108;4748,103;4766,95;4786,86;4791,85;4796,85;4800,87;4805,89;4809,92;4820,108;4825,112;4829,115;4835,118;4841,119;4847,118;4853,116;4858,114;4870,106;4882,98;4919,76;4927,71;4935,68;4943,64;4959,58;4986,47;5012,36;5052,21;4650,1885;4639,1880;4623,1870;4601,1857;4563,1834;4556,1830;5551,1889;5508,1861;5474,1842;9569,3601;9354,3599;9286,3624;9243,3621;9218,3587;9198,3553;9189,3521;9188,3488;9189,3455;8667,2485;8669,2553;8733,2568;4524,509;4520,509;4515,511;4512,513;4510,517;4495,544;4493,548;4494,552;4495,555;4497,558;4500,560;4504,562;4511,564;4151,2577;4105,2551;4077,2541;4046,2522;4039,2517;4030,2512;4024,2509;5584,1566;5592,1563;5615,1536;5624,1524;5629,1509;5635,1494;5653,1470;5671,1452;5683,1433;5693,1419;5696,1408;4769,1091;4777,1083;4801,1058;6052,4050;6023,4014;5992,3979;5960,3942;5945,3927;5934,3922;5798,3907;5507,3906;5526,3792;9373,2635;9366,2617;9365,2601;7009,1251;7018,1251;7027,1251;7035,1250;7042,1248;7050,1245;7060,1242;9958,3268;9959,3223;9956,3097;6872,2181;6881,2160;6891,2140;6904,2119;6926,2090;6931,2080;6932,2073;6930,2059;7459,3965;7459,3965;7460,3948;7459,3887;7458,3885;7452,3881;7444,3879;7438,3878;7432,3874;7429,3871;7428,3867;7429,3839;6410,1676;6397,1665;8660,3198;8687,3214;6624,2116;6632,2086;6634,2076;6631,2068;6626,2059;6625,2052;5935,189;5903,169;5899,168;5895,169;5892,169;5889,171;5880,180;5876,185;5876,188;5876,191;5980,3281;6009,3267;6015,3265;6022,3264;6028,3266;6035,3270;6044,3277;6072,3300;6097,3323;6109,3335;6115,3345;6121,3356;6129,3381;6818,1911;6826,1923;6830,1927;6836,1930;6842,1930;6920,1931;5242,4044;5031,873;5044,859;5063,840;5089,813;5093,809;5094,806;5095,802;4308,2256;4300,2256;4290,2256;4281,2254;4273,2252;4265,2248;4260,2245;4256,2242;4252,2238;4250,2233;4248,2227;4245,2223;4241,2219;4231,2213;4215,2204;4203,2197;4189,2188;4175,2180;4160,2171;4143,2160;4127,2151;4108,2140;4095,2132;4079,2123;4064,2114;4048,2104;4033,2094;2876,2120;2882,2121;2888,2124;2893,2127;2906,2138;2912,2146;2914,2151;5786,2098;5943,2099;5973,2099;1244,3120;1184,3158;1125,3195;1119,3199;1113,3201;1107,3201;1102,3201;1097,3200;1093,3198;1087,3193;5387,3830;5359,3827;2143,2705;2136,2703;2131,2701;2125,2700;2119,2700;2113,2701;5237,3110;5154,3110;4079,2662;4092,2628;4117,2613;4189,2540;3357,3073;3366,3064;3383,3044;3391,3035;3400,3026;3409,3017;3421,3005;3431,2994;3435,2989;3437,2984;3438,2979;5472,1017;5462,1010;5450,1003;5437,995;5419,985;5404,976;5384,964;5370,955;5356,947;5340,937;5328,930;5316,923;5303,915;5290,907;5274,898;5256,888;5247,883;5237,880;5229,879;5219,877;5211,877;5203,877;5197,878;5186,881;5177,884;5169,888;5163,892;5157,897;5151,903;5146,908;5142,912;5139,916;5137,922;5134,927;6465,2768;6465,2726;6466,2683;7331,2769;7329,2865;7329,2905;7328,2944;3735,3102;3813,3019;6401,3748;6400,3764;6462,3838;6490,3877;5831,667;5838,660;5853,645;5865,632;5875,622;5877,620;5878,615;5877,612;5876,611;5875,609;5850,584;5846,581;3506,1760;3497,1755;3491,1752;3486,1748;3480,1744;3475,1740;3473,1738;3472,1734;3471,1731;4242,1156;4251,1148;4327,1072;4337,1063;4340,1061;4345,1059;4352,1058;4379,1056;4385,1055;4390,1051;4395,1046;4399,1042;4433,1007;4454,986;4461,979;4466,977;4471,977;3043,2826;3026,2816;3002,2802;2991,2795;2980,2788;2957,2775;2945,2768;2921,2754;2911,2747;2892,2736;2883,2730;2870,2723;2840,2707;7244,398;7238,379;7235,371;7233,366;7231,363;7226,360;7198,344;7158,319;7154,318;7149,317;7145,317;7141,318;4522,755;4520,722;4520,697;4518,693;4516,689;4513,686;4507,684;4498,683;4435,676;4430,675;4426,676;4422,678;8907,2587;9019,2588;5550,3453;5554,3422;5540,3404;5530,3392;5527,3389;5516,3375;5502,3358;5499,3355;5490,3340;5482,3323;5475,3295;5474,3284;5474,3275;5476,3264;5478,3254;5484,3240;5492,3227;5507,3212;5514,3202;5517,3194;5517,3179;5519,3081;5519,3049;5520,3041;7460,2107;7507,2091;7539,2084;7571,2081;7599,2078;7724,2031;7739,2024;7751,2021;7766,2020;7778,2022;7791,2026;7815,2042;7862,2050;3218,3407;3207,3401;3171,3380;3168,3378;4428,2340;4398,2385;4370,2421;4368,2441;4360,2489;4351,2528;4298,2589;4289,2598;4254,2635;4215,2672;4179,2708;6706,473;6699,404;6698,400;6694,396;6688,394;6681,396;6663,403;6658,407;6655,409;6652,410;2467,2999;2468,2995;2475,2978;2492,2938;2493,2914;2485,2878;2309,2731;2311,2726;2313,2721;2316,2717;4699,2914;4709,2905;4733,2877;4709,2862;4681,2845;4645,2823;4641,2821;4636,2818;4626,2814;4612,2813;4599,2815;4587,2820;4581,2824;4580,2826;4564,2841;7719,342;7700,331;7653,302;7608,275;7585,261;3253,1809;3254,1810;3256,1810;3257,1810;3259,1810;3260,1809;3261,1808;3261,1806;3261,1805;3259,1804;3258,1804;3256,1804;3254,1804;3253,1805;3252,1806;3252,1807;6324,3910;6304,3913;6290,3919;6153,3995;5997,4080;5990,4084;5986,4089;4195,2969;4187,2959;4169,2948;4153,2937;4136,2927;4123,2920;4107,2911;4097,2904;5097,1156;5108,1145;5116,1136;5130,1122;5142,1110;5153,1098;5165,1085;5177,1073;5188,1061;4343,2874;4329,2865;4316,2859;4308,2854;4299,2849;4294,2845;4289,2837;4285,2831;4280,2824;4273,2817;4266,2812;4259,2807;2089,3735;2036,3701;2011,3676;1996,3656;1965,3609;1953,3595;1937,3586;9478,3249;9480,3245;9481,3233;9481,3208;9481,3172;9478,3167;9472,3164;9467,3165;9453,3164;9444,3162;9434,3157;5585,3131;5612,3096;6075,2841;6110,2823;6163,2837;5664,2295;5721,2322;5779,2351;5836,2379;5895,2408;5954,2436;6012,2464;6070,2493;6128,2521;6189,2549;6253,2582;9334,3415;9374,3364;9417,3332;9446,3322;9494,3321;9019,2566;9040,2551;9100,2550;9165,2555;9186,2560;7792,2164;7676,2165;7591,2164;7571,2159;7544,2143;4280,1487;4245,1439;4244,1435;4244,1431;4245,1428;4247,1425;4250,1422;4263,1415;4278,1409;4282,1407;4287,1406;6662,2380;6661,2346;6664,2329;6670,2316;6678,2305;6705,2274;6742,2231;6749,2226;6754,2224;5020,2786;5020,2734;5020,2694;538,3760;547,3747;550,3737;548,3728;541,3715;507,3676;474,3646;5237,3007;5335,3009;3258,3041;3262,3036;3268,3030;3280,3018;3285,3011;3288,3005;4577,635;4491,636;4480,635;4475,634;4454,623;4451,621;4448,618;4447,615;4447,612;4454,604;4458,602;6375,796;6368,790;6360,786;6356,785;6351,783;6336,781;6304,776;6291,773;6284,772;6283,771;6275,769;6270,767;6264,764;6258,760;6254,756;6251,750;6250,745;6249,740;6250,734;6252,730;6470,376;6484,371;6495,365;6507,357;6518,348;6589,275;6511,281;6439,240;6432,237;6426,235;6419,235;6395,239;6507,1231;6545,1231;6552,1232;6557,1233;6561,1235;6565,1238;6570,1244;9728,3675;9726,3612;9725,3521;9725,3486;9733,3469;9731,3457;9727,3449;9718,3441;9715,3428;9715,3424;9721,3409;9720,3402;7569,2276;7602,2262;7712,2266;7762,2266;7819,2261;7839,2258;7861,2251;7891,2248;8064,2250;4605,1649;4594,1642;4447,1553;4440,1548;4431,1538;9353,3669;9353,3642;9354,3558;9355,3519;9367,3478;9381,3447;9385,3440;9415,3401;9460,3365;9494,3339;9495,3300;9495,3272;9287,3455;9239,3456;9167,3455;9145,3456;9095,3477;4997,588;5071,633;5074,637;5075,640;5075,642;5073,645;5071,648;5028,692;9623,3482;9573,3481;9484,3479;9304,3466;9121,3523;9094,3529;9078,3526;9067,3514;9043,3504;9039,3504;8987,3502;8884,3501;8867,3501;8727,3498;8705,3500;8687,3505;8660,3518;6376,1954;6361,1937;7184,2811;7185,2769;7185,2725;7186,2639;9018,2663;6625,155;6629,143;6631,140;6630,138;6627,136;6624,136;6621,137;6613,151;6025,1310;6092,1239;6108,1224;9444,4082;9439,4068;9436,4057;9438,4035;9436,4013;9426,3999;9417,3993;9409,3982;9399,3946;9390,3909;9371,3876;9358,3852;9357,3829;9358,3792;9358,3754;9359,3711;4881,782;4911,750;4912,746;4911,743;4910,741;4908,739;4887,732;4884,732;7677,3009;7911,3011;7968,3012;8164,3015;8217,3012;5823,151;5828,150;5831,147;5851,126;5852,123;5851,120;5849,116;5820,83;7976,940;7977,941;7978,942;7980,942;7981,942;7983,942;7984,941;7985,939;7985,938;7984,937;7983,936;7981,935;7979,935;7978,936;7977,937;7976,938;3069,2675;3076,2669;3078,2664;3080,2659;7717,2771;7771,2770;7862,2771;7911,2772;7954,2773;7965,2778;7991,2800;8011,2813;8033,2819;8077,2819;8099,2819;8111,2814;8121,2807;6774,2320;6795,2314;6833,2313;6884,2313;6888,2311;2962,3759;2661,3582;2493,3487;2473,3470;2432,3437;2343,3331;9242,3323;9186,3323;9162,3322;9150,3318;9125,3297;9101,3271;3089,2631;3089,2635;3087,2639;3085,2646;3083,2652;1340,3387;1344,3391;1353,3402;6722,2140;6731,2119;6735,2105;6738,2090;6738,2077;6736,2059;6729,2039;6727,2029;6727,2012;6675,2442;6694,2427;6713,2422;6771,2423;1252,3436;1248,3435;1244,3434;1239,3432;1223,3422;1216,3417;7654,625;7647,620;7636,610;7630,606;7620,601;7613,597;7607,593;7601,587;5996,1338;5982,1337;5917,1292;5914,1283;5941,1254;4441,1950;4434,1956;4429,1961;4424,1966;4354,2037;4321,2075;4288,2122;4247,2164;4750,2558;4735,2529;4618,2458;4483,2378;4468,2337;4449,2288;4433,2267;4327,2201;4310,2199;8184,2727;8217,2743;8265,2745;8309,2744;8324,2738;8332,2730;5451,1377;5334,1308;6856,185;6874,175;7711,248;7759,198;7769,190;7779,185;7792,181;7805,173;7814,163;7817,152;7815,139;7811,126;7809,114;7810,101;5293,1281;5287,1269;5256,1250;5196,1213;5159,1194;5050,1129;5009,1104;4990,1092;4974,1085;4955,1091;4940,1094;4926,1092;5818,1278;5823,1274;5825,1270;5827,1264;5827,1260;5817,1213;5807,1153;5800,1111;6331,2725;3306,2089;3285,2112;3232,3263;3262,3230;3284,3208;3287,3197;7749,2921;7756,2866;5403,2229;5417,2215;5423,2212;3739,3051;3603,2971;7981,2891;7994,2878;8006,2868;8016,2864;8131,2866;5087,227;5145,262;5152,266;5160,269;5166,271;5173,271;5179,269;5185,267;5191,264;5194,259;5197,252;5196,245;5197,238;5922,591;5951,569;5990,539;6019,517;6022,512;6024,508;6024,504;6023,496;6021,491;6022,485;6023,483;6025,478;6027,476;6029,474;6041,467;3679,2632;3783,2525;3817,2490;9570,3560;5020,2687;5018,2680;5013,2675;5001,2669;4927,2632;3559,2180;3561,2181;3563,2181;3565,2181;3566,2180;3567,2179;3568,2178;3567,2176;3566,2175;3565,2174;3563,2174;3561,2174;3559,2175;3558,2176;3558,2178;3558,2179;5058,2804;5054,2802;5011,2792;4994,2795;4978,2796;5530,1909;5538,1905;5606,1828;5552,4031;5395,4015;3632,2605;3703,2532;6194,3395;6210,3387;6273,3352;3546,2550;3547,2546;3552,2540;3574,2517;3646,2445;3653,2440;3666,2426;3684,2410;2934,2190;2936,2190;2938,2189;2939,2188;2940,2186;2940,2184;2939,2183;2937,2182;2935,2181;2933,2181;2931,2182;2929,2183;2928,2185;2929,2187;2930,2188;2931,2190;5334,2385;5403,2419;5461,2447;5519,2476;5577,2504;5637,2534;5692,2561;5751,2590;5808,2619;5866,2647;5926,2676;5250,4002;5258,3958;5675,2836;5785,2875;4991,3395;4998,3359;5004,3347;5019,3329;5034,3311;5052,3290;5054,3287;5058,3278;5062,3264;5061,3253;5061,3249;5055,3235;5053,3232;5044,3221;5031,3211;5015,3204;5006,3202;4994,3199;4965,3196;4933,3193;8192,1200;8191,1186;8191,1178;8191,1174;8193,1172;8197,1169;8206,1168;8223,1168;8228,1167;5715,1163;5710,1156;5656,1126;5599,1092;5591,1087;5579,1080;5558,1067;5550,1062;5543,1057;5531,1050;5522,1044;8149,1186;5786,2053;5879,2054;5887,2054;5893,2052;5900,2049;5903,2047;5905,2043;5906,2039;5906,2010;6757,1916;6780,1917;6802,1917;6808,1915;6907,1863;6976,1828;6993,1818;7003,1817;7103,2255;7132,2232;7144,2220;7152,2208;7165,2187;7170,2178;7177,2171;7186,2166;7195,2163;7218,2163;7374,625;7375,623;7375,622;7374,620;7373,619;7371,619;7369,619;7367,619;7366,620;7365,622;7365,623;7366,625;7367,626;7369,627;7371,627;7373,626;8140,1218;8147,1218;8161,1216;8177,1214;8183,1212;8186,1210;8190,1207;8191,1203;7107,145;7092,161;5255,200;5269,200;5280,202;5295,211;5300,214;5305,218;5306,223;6951,3050;6964,3035;6966,3032;6966,3026;6966,2987;7013,90;6993,108;4820,2032;4817,2032;4813,2030;4807,2026;4799,2022;4792,2017;4783,2013;4777,2009;4775,2006;4775,2004;7618,338;7578,316;7548,297;7313,820;7306,821;7300,822;7294,824;7288,827;7283,830;7279,834;7276,837;7273,841;7270,845;7267,851;7268,861;3210,3251;3116,3347;6580,1381;6573,1365;6566,1346;1097,3333;1098,3330;1099,3327;1102,3323;1105,3320;1133,3303;1142,3296;1152,3291;1161,3284;1174,3277;1196,3264;1227,3244;1246,3233;1280,3212;1290,3206;1299,3199;418,3870;369,3836;6279,2768;6277,2810;6275,2938;6277,2947;6287,2962;6314,2993;6506,3382;6511,3377;6514,3202;5395,3783;5367,3780;3764,2514;3743,2502;3695,2470;3669,2457;6432,3199;6462,3199;6251,3496;6267,3499;6293,3496;6310,3498;6327,3497;6342,3495;6348,3494;6361,3485;3557,1833;3557,1820;3556,1816;3553,1812;3550,1809;3541,1798;3536,1793;3532,1789;3529,1784;3529,1780;3531,1775;3534,1772;5354,3891;5358,3874;5361,3866;5367,3859;5378,3850;5382,3846;5385,3840;5398,3769;5397,3760;5386,3748;5381,3741;5377,3734;5376,3726;5383,3684;5390,3642;5397,3602;5404,3560;6014,185;6009,181;6005,177;5969,156;5963,152;5320,2625;5353,2584;5820,401;5802,397;5792,395;5783,392;5775,389;5766,384;5752,373;5723,357;5701,344;5685,335;5669,325;5654,314;5625,292;4663,2346;4611,2398;6626,1576;6626,1569;6624,1537;6623,1530;6623,1523;6625,1511;6625,1506;6623,1502;6620,1498;6615,1494;6610,1489;6604,1483;6600,1477;6595,1471;6592,1464;6589,1454;6587,1447;6587,1439;6587,1426;5621,719;5600,740;5356,377;5360,375;5370,364;5400,335;4979,1980;4973,1985;4965,1993;4960,1999;4954,2004;4946,2009;4931,2019;4906,2037;4888,2055;4884,2059;4875,2068;9262,1193;9188,1117;6665,2768;6665,2727;6664,2634;6664,2582;6665,2571;6665,2565;6677,2539;6699,2489;6707,2478;6717,2467;6749,2442;6766,2428;6773,2419;6775,2413;6777,2407;6777,2381;6777,2333;6776,2326;6770,2313;6765,2307;6759,2303;6746,2296;6661,2251;6609,2224;6596,2216;6589,2209;6583,2200;6580,2191;6579,2180;6578,2152;6033,565;6078,531;6080,527;7791,2869;7811,2867;7904,2841;3125,2064;3108,2054;7140,3456;7189,3523;7208,3524;7337,3525;4198,3616;4140,3578;4087,3534;3903,3425;5821,3085;5802,3094;5758,3095;5729,3065;6765,466;6752,468;6734,471;6725,472;6670,476;6665,475;6659,473;6656,470;6654,465;6650,417;6650,413;9474,918;9471,876;9469,858;9467,840;9466,820;9464,812;9460,803;9454,795;9447,788;9437,780;9424,765;9420,755;9418,744;9416,734;9417,726;9420,720;9422,714;9424,706;9426,698;9428,689;9427,681;9425,670;9419,647;9416,634;9414,609;9412,597;9409,588;9404,581;9401,574;9402,569;9403,561;9409,549;7227,710;7333,761;4912,3619;4782,3606;4771,3607;6313,2768;6313,2759;6315,2750;6317,2745;6324,2740;6329,2733;6331,2684;9320,3162;9330,3159;9333,3157;9335,3156;9339,3151;9344,3145;9378,3102;9396,3067;9398,3052;7080,1089;7082,1092;7085,1096;7088,1101;7090,1105;7092,1110;7092,1115;7090,1124;7089,1136;7089,1148;7089,1159;7093,1178;7096,1188;7099,1200;7103,1209;7108,1221;7114,1230;7119,1239;7126,1248;7131,1255;7139,1263;7147,1271;7156,1278;7173,1291;9405,1037;9441,1015;6538,3159;6540,3145;6527,3125;6518,3104;6517,3080;6521,3029;6520,2986;8622,3312;8536,3310;8498,3269;6559,3118;6581,3116;6709,3116;6712,3073;6712,2986;8515,3205;8524,3189;8579,3138;8615,3102;8637,3080;8651,3074;8704,3075;481,3829;468,3811;7061,118;7042,139;5314,1977;5313,1973;5312,1969;5307,1965;5300,1960;5290,1953;5282,1948;5275,1943;5266,1941;9691,3644;9692,3612;9692,3579;9689,3579;9680,3578;9678,3644;9683,3646;3532,2492;3379,2401;3336,2375;7200,749;7204,740;7206,735;7210,730;7257,672;7284,639;7286,639;6717,1366;6721,1363;6725,1357;6728,1351;6729,1345;6731,1337;6731,1330;6731,1322;3696,2643;3588,2578;3552,2556;3548,2553;456,3933;387,3931;374,3930;362,3927;352,3922;344,3915;4196,1999;5479,379;5447,360;5104,1590;5089,1581;4902,1467;2584,2383;2606,2359;2607,2354;2606,2348;2603,2344;2599,2340;2591,2334;2580,2328;2570,2321;2559,2315;2549,2309;2539,2304;2524,2296;2513,2292;2495,2286;5839,317;5836,313;5833,310;5826,307;5819,303;5797,291;5778,279;5756,264;5458,1324;5369,1270;5287,1219;7091,3119;7203,3119;7338,3068;7269,3067;7270,3028;7338,3029;5294,2554;5410,2612;5468,2641;5527,2670;5585,2698;5643,2727;5700,2755;5759,2784;5817,2813;5874,2841;5932,2870;6011,2909;2296,3029;2290,3035;2274,3049;2268,3054;2263,3051;3767,1391;3769,1391;3770,1390;3771,1388;3772,1387;3771,1385;3770,1384;3768,1383;3766,1383;3764,1384;3763,1385;3762,1386;3762,1388;3762,1389;3763,1390;3765,1391;8799,1829;8780,1811;6694,1325;6700,1321;7380,2865;7381,2808;7381,2769;4192,2003;4187,2004;4184,2005;4180,2005;4176,2005;4173,2003;4667,1312;4658,1308;4643,1298;4624,1287;4603,1273;6730,1578;6730,1572;6729,1537;6728,1527;6728,1514;6729,1494;6730,1479;6731,1474;6731,1469;6729,1465;6725,1462;6720,1459;6714,1456;6708,1452;6702,1446;6698,1442;6694,1437;6691,1428;6687,1426;9575,3339;8169,2157;8208,2154;8221,2151;8228,2123;8227,2121;7635,400;7586,371;7580,368;7576,366;7571,365;7564,364;6789,16;6835,46;6839,49;6847,53;6855,56;6862,59;6868,60;6873,62;6879,63;6884,63;6889,62;6894,58;6897,55;6900,51;6903,47;6904,42;6904,37;6903,33;6898,28;6893,25;7079,3964;7078,3965;7040,3980;7038,3981;3270,3438;3312,3463;3417,3373;2787,2507;2776,2518;2765,2531;2758,2537;2754,2540;2753,2543;2755,2548;2767,2556;6549,3434;6567,3426;6567,3414;6571,3202;6571,3159;4641,2549;4641,2539;4638,2531;4634,2528;4585,2497;4286,2319;4254,2299;4240,2301;7015,3338;7119,3340;7136,3354;5747,3511;5757,3541;5767,3551;5778,3560;5792,3568;5800,3576;5806,3584;5809,3595;5809,3605;5796,3678;5793,3685;5778,3696;4963,2736;4895,2735;4889,2733;4887,2727;4888,2693;4888,2676;4890,2668;4895,2663;4948,2612;4962,2603;4974,2605;5009,2622;5016,2629;6636,1375;6644,1380;6650,1382;6657,1382;6676,1382;6685,1381;6694,1379;6701,1376;6708,1372;2648,4077;2662,4064;2708,4028;2753,3989;2796,3941;2831,3904;2834,3901;2894,3837;2944,3781;6983,1737;6976,1720;6952,1685;6949,1679;6947,1675;6923,1641;6907,1617;6906,1609;6907,1600;6911,1591;6915,1586;6918,1581;6919,1571;6918,1552;6919,1511;7063,1512;7075,1509;6760,2223;6767,2223;6796,2231;6850,2246;6911,2262;6973,2279;7024,2292;3299,3065;3305,3058;3334,3028;3342,3020;3357,3003;3364,2995;3371,2984;6049,1369;6053,1364;6067,1351;6070,1346;6070,1339;6064,1333;6048,1324;5984,1282;5916,1238;9365,3245;9382,3249;9394,3249;9426,3250;9459,3250;9473,3250;7022,2854;7054,2854;7060,2856;7096,2885;7143,2921;7146,2927;7146,2944;4184,1673;4177,1680;4164,1694;4153,1705;4150,1707;4148,1708;6520,2855;6714,2855;5793,3935;5738,3930;5727,3929;5679,3924;5641,3920;5485,3904;5454,3901;5296,3885;5240,3879;5220,3877;5185,3873;5111,3866;1805,3473;1800,3475;1794,3476;1787,3479;1779,3482;1772,3485;1765,3487;1760,3489;1759,3491;1758,3492;1758,3495;3594,2571;3648,2516;3658,2505;7820,2350;7831,2341;7850,2346;7875,2347;7902,2344;7913,2348;3571,2937;3564,2938;3555,2937;3547,2935;3537,2930;3526,2923;3414,2854;3401,2846;3391,2840;3380,2833;7963,2754;7973,2742;7982,2735;7992,2734;8004,2740;6731,1736;6723,1736;6666,1735;7444,1102;7489,1070;7537,1039;4536,2746;4227,2562;4118,2495;8382,3055;8483,3055;8506,3070;5872,1169;5908,1165;5923,1161;5944,1153;5962,1138;3913,3004;3905,3013;3898,3019;3893,3025;3890,3027;3105,2694;3092,2689;3014,2642;3003,2635;2996,2631;2976,2620;2930,2591;2896,2570;2878,2560;2865,2553;2849,2543;2828,2530;6445,338;6476,386;6909,624;6910,623;6911,622;6911,621;6911,619;6909,618;6908,618;6906,618;6904,618;6903,619;6902,620;6902,622;6903,623;6904,624;6906,625;6907,625;5924,1440;5945,1429;7033,362;7031,359;7029,356;7026,354;7006,343;7002,342;6998,342;6992,343;6989,345;6987,348;6985,352;6965,399;6963,403;6963,407;6965,410;6966,412;6969,414;6973,416;7007,425;5780,3819;5765,3819;5733,3815;5634,3806;5634,3798;5591,3794;7248,1460;7247,1441;7247,1412;4862,1093;4850,1087;4839,1083;4778,1045;4738,1020;4733,1018;4728,1018;4725,1018;4721,1019;4719,1020;6395,2053;6398,2056;6423,2084;6442,2106;6454,2112;6465,2113;6578,2113;6672,2127;6772,2154;6822,2167;6921,2194;6971,2208;7022,2221;7047,2228;7068,2235;7087,2244;7135,2285;7156,2307;7169,2314;7184,2317;7215,2317;7269,2318;7322,2317;7376,2317;7389,2318;7400,2321;7413,2326;7451,2349;7490,2374;7504,2383;7889,2465;7892,2430;7902,2423;7913,2397;7915,2366;5827,4014;5815,4000;5807,3996;5782,3992;3062,2125;3044,2117;4241,1210;4274,1176;4206,3250;4248,3205;6205,2886;6215,2874;6217,2868;6218,2832;6111,2894;6134,2884;6191,2884;6207,2889;6209,2895;6209,2932;9072,1859;9071,1860;9070,1863;9062,1879;9059,1888;9059,1902;9062,1909;9071,1930;9075,1939;9078,1950;9077,1981;9081,1990;9088,2001;9091,2004;9094,2007;9102,2014;9115,2020;9127,2024;9139,2027;9147,2027;9203,2034;9212,2037;9217,2041;9239,2064;6303,207;6313,216;6317,221;6320,227;6324,237;6325,243;6325,250;5955,3251;5926,3266;5917,3270;5912,3278;5911,3284;5911,3288;5914,3293;5927,3306;5937,3318;5941,3322;5948,3327;5970,3331;5978,3330;6001,3329;6014,3325;3497,1376;3537,1336;3545,1325;3551,1317;3561,1306;3573,1295;3591,1284;3612,1274;3632,1265;3635,1264;3650,1256;3663,1248;3682,1228;3703,1207;6778,2012;6779,1971;7014,538;7031,544;7036,547;7042,550;7048,554;7051,559;7052,563;7053,568;7051,573;7048,579;7044,583;7041,589;7039,593;7036,600;7033,608;7030,612;2034,3793;2125,3702;2223,3598;2249,3570;2281,3560;2288,3559;2337,3551;2381,3540;2388,3537;2430,3518;2456,3506;4428,3110;4484,3051;4491,3047;4505,3041;4512,3036;4519,3029;4520,3027;4527,3019;4569,2977;4579,2973;4590,2971;4601,2970;4609,2964;4635,2936;4642,2934;5347,1829;5376,1801;5380,1794;5396,1755;5392,1746;5367,1729;5366,1724;5392,1697;3077,2791;3069,2788;3052,2778;3045,2774;3035,2768;3007,2751;2982,2737;2959,2722;2944,2713;2935,2708;2915,2697;3389,3594;3409,3594;3412,3592;3413,3589;3411,3586;3399,3574;5318,1812;5288,1842;5252,1879;5248,1882;5243,1883;5221,1885;5216,1886;5202,1900;5854,998;5862,1002;5869,1002;5873,1002;5875,1001;5876,999;5875,997;5873,996;5869,995;6337,3955;6318,3959;6303,3964;6185,4029;6080,4086;6063,4097;6847,593;6844,587;6836,577;6833,573;6830,570;6826,568;6822,568;6817,568;6813,570;6785,584;6779,588;6774,591;6771,594;6766,596;6760,597;6733,604;5802,3867;5749,3863;5694,3857;5629,3855;5586,3856;5577,3853;6031,3903;6013,3891;6003,3887;5960,3881;7078,3106;7099,3083;7103,3080;7108,3077;7114,3076;7120,3075;7209,3076;5521,2918;5615,2918;6575,3073;6271,3696;6241,3697;6133,3685;5995,3671;5840,3656;7397,579;7404,572;7413,559;7416,555;7416,550;7416,545;7413,538;7411,536;7401,529;7770,1305;7815,1288;7818,1286;7826,1279;4335,1214;4345,1204;4359,1190;4371,1178;4399,1151;5804,2836;5834,2788;5850,2767;5888,2721;5961,2630;5998,2584;6034,2538;6144,2401;6180,2357;6238,2282;6247,2263;6250,2246;6253,2204;6253,2129;6261,3662;6277,3719;6282,3736;6289,3762;6293,3779;6301,3819;6313,3866;6332,3935;6348,4000;6359,4047;6366,4071;6371,4087;7100,1355;7085,1343;7070,1332;7060,1322;7051,1313;7044,1305;7039,1299;7036,1298;4243,3272;4285,3228;8397,1107;8414,1049;8427,1022;8437,1000;8444,987;8450,979;8457,967;8462,954;8467,939;8478,900;8477,891;8472,882;8467,874;8467,868;8469,862;8473,856;8479,852;8495,844;8514,836;8540,826;8547,824;8554,823;8562,825;8581,830;8588,831;8594,830;8600,827;8605,823;8618,802;1263,4038;1372,3970;1381,3966;1408,3949;4274,3221;4310,3183;5737,3792;5742,3762;7250,2536;7275,2536;7319,2540;7352,2530;7370,2523;7384,2515;7392,2512;7412,2509;6552,1210;6512,1209;6506,1207;6504,1204;6503,1200;6503,1194;4530,1710;4526,1715;4515,1725;4497,1744;4482,1760;4473,1769;4446,1796;4422,1819;4418,1824;4416,1827;4417,1831;4418,1835;4422,1838;4429,1843;4436,1848;4455,1859;4463,1865;4471,1870;4486,1879;4492,1882;4496,1882;4500,1882;6271,3092;6309,3074;5846,1725;5838,1708;5830,1701;5704,1624;7710,1072;7693,1076;7683,1080;7656,1092;7647,1097;7631,1105;7607,1118;7555,1143;7534,1153;7527,1156;7517,1158;7504,1159;870,3915;877,3914;894,3912;897,3909;896,3906;893,3905;884,3906;869,3907;6724,1370;6739,1379;6744,1381;6750,1382;6758,1382;6785,1383;6799,1383;6809,1383;6822,1380;6838,1377;6845,1375;6853,1373;6860,1372;6867,1372;6871,1372;6877,1372;6892,1376;6910,1380;6919,1382;6928,1383;6937,1383;6948,1383;6959,1384;6970,1383;6975,1382;6990,1378;1856,3428;1851,3424;1837,3410;1836,3405;1834,3400;1833,3395;1832,3389;5403,1862;5405,1860;5413,1851;5419,1844;6489,2379;6489,2363;6491,2356;6507,2334;6510,2325;6510,2278;6510,2205;6510,2180;7751,1966;7777,1963;7809,1966;7818,1966;7824,1963;7829,1958;7845,1873;7841,1828;7847,1791;7857,1740;7857,1733;7856,1727;4596,542;4599,537;4608,525;4616,516;4627,506;4637,494;4657,467;4672,446;4702,423;4705,421;2292,3220;2292,3203;2295,3190;2301,3174;2309,3162;7521,2727;7611,2729;7663,2728;7674,2688;7684,2650;9053,2486;9060,2460;9079,2437;9099,2410;9112,2397;9124,2378;9126,2375;9151,2321;9156,2297;9156,2293;9157,2267;9161,2199;9162,2169;9164,2152;9168,2138;9175,2125;9182,2113;9210,2082;9224,2071;9269,2049;9312,2033;9317,2030;9326,2026;9345,2008;9356,1996;9375,1976;9406,1931;9438,1881;9475,1827;9484,1813;9489,1803;9494,1788;9500,1772;9503,1751;9506,1725;9507,1709;9506,1686;9501,1634;9502,1621;9507,1597;9511,1573;9517,1546;9520,1535;9531,1503;9546,1462;9548,1451;9549,1443;9544,1389;9542,1375;9542,1358;9546,1344;9550,1333;9560,1317;9571,1305;9582,1296;9594,1287;9671,1245;9699,1226;9713,1212;9720,1204;5127,1227;5065,1191;5039,1189;5020,1197;4997,1217;7025,2676;7034,2675;7038,2670;7043,2667;7063,2667;7131,2667;6035,2156;6036,2105;6037,2018;6037,2014;6034,2013;6033,2011;6033,2009;6035,2008;6179,757;6181,753;6184,750;6185,746;6185,740;6185,721;6185,709;6185,702;6184,699;6182,696;6179,693;6176,692;6170,692;6148,692;6122,692;6117,692;6112,692;6108,694;6104,696;6101,698;6097,703;6095,707;6095,711;6095,714;6097,719;6100,722;6103,725;6107,728;6113,732;9209,3046;9214,3049;9221,3051;9257,3051;9465,3052;9477,3050;9493,3045;9500,3043;9569,3672;9570,3644;9572,3521;9573,3418;9574,3380;9573,3303;9493,4004;9505,3992;9516,3980;9523,3967;9529,3943;9530,3906;9529,3868;9530,3832;9536,3793;9558,3758;9571,3740;9575,3715;6234,3464;6297,3451;5237,2957;5334,2956;6198,1245;6210,1242;6230,1224;6244,1210;6207,3184;6209,3195;6259,3257;8414,3211;8453,3188;8549,3095;8598,3048;8623,3041;8652,3042;7371,1972;7379,1969;7449,1964;7459,1961;7465,1957;7471,1950;7473,1942;7474,1935;7472,1930;7467,1924;7459,1913;4356,1899;4273,1983;3862,1922;3866,1916;3873,1909;3879,1903;3885,1897;3891,1891;2949,1888;2934,1882;2923,1877;2918,1875;2913,1874;2909,1874;2904,1874;2900,1875;2895,1877;2877,1887;2863,1896;2856,1899;2850,1903;2845,1908;2843,1911;2842,1915;2841,1920;2844,1929;2850,1935;2858,1939;2864,1941;2871,1941;2877,1940;9656,2230;9656,2207;9653,2194;9643,2186;9630,2183;9611,2176;9585,2163;9550,2145;9523,2138;9512,2133;9503,2125;9499,2120;9499,2109;9502,2102;9512,2083;9514,2079;9521,2065;9521,2061;9520,2056;9518,2052;9515,2047;459,4020;445,4021;360,4018;332,4012;318,4008;306,4002;286,3993;271,3981;255,3968;6081,1137;6069,1149;6063,1160;6065,1170;6126,1209;6185,1243;5226,1912;5223,1913;5219,1911;5072,1822;5070,1819;5071,1816;5101,1784;6104,1704;6085,1694;6056,1704;6031,1720;6013,1726;5991,1727;5904,1722;5871,1721;5822,1731;5805,1731;5791,1726;5673,1655;5592,1606;4924,1385;4994,1299;9398,3198;9418,3207;9262,2899;9258,2835;9263,2817;9272,2802;9276,2797;9286,2785;9297,2777;9307,2770;9318,2767;9333,2761;9341,2756;9346,2753;9351,2745;9355,2723;6581,210;6575,209;6570,208;6564,205;6559,202;6526,182;6480,155;6456,141;6435,129;6428,127;6422,127;6417,128;6410,134;6405,140;9680,34;9473,174;9470,191;9473,213;9465,234;9450,250;9400,260;9383,260;9360,256;9343,242;3723,2276;3724,2277;3726,2278;3727,2278;3729,2277;3730,2276;3731,2275;3731,2274;3730,2273;3729,2272;3727,2271;3726,2271;3724,2272;3723,2273;3722,2274;3722,2275;3726,3558;3808,3471;3821,3456;3827,3444;3830,3432;3831,3418;3831,3407;3825,3393;3819,3383;3809,3373;3772,3342;3735,3307;3731,3304;3724,3300;3694,3284;3683,3279;3671,3276;3593,3252;3564,3244;3550,3240;6782,2262;6250,233;6262,229;6276,222;6290,215;6348,178;6354,175;6360,173;6367,172;6373,169;6379,166;6390,155;6628,2047;6663,2029;6686,2016;6699,2013;6713,2011;6798,2014;6876,2015;7491,1879;7478,1864;7474,1856;7474,1835;7478,1827;7484,1822;7490,1818;7497,1817;7528,1816;5650,3180;5649,3224;5649,3268;5643,3319;5635,3355;5632,3396;5622,3428;4128,2096;4069,2056;3884,1947;3869,1937;3866,1934;3863,1931;5572,769;5443,693;4977,663;4979,663;4981,663;4982,661;4983,660;4983,658;4982,656;4980,655;4978,655;4976,655;4974,655;4972,657;4972,658;4972,660;4973,662;4974,663;6794,1427;6798,1426;6803,1425;6813,1425;6831,1429;6846,1433;6857,1435;6866,1435;6873,1435;6881,1435;6889,1433;6900,1431;6912,1429;6921,1427;6930,1426;6943,1425;6952,1425;6970,1425;6980,1425;6987,1425;6993,1424;7000,1422;7013,1416;3577,2933;3581,2929;3585,2923;3586,2917;3585,2911;3583,2906;3578,2902;3572,2898;3556,2889;3441,2819;3436,2818;3430,2817;3423,2818;3402,2825;3084,2781;3087,2777;3088,2774;3095,2757;3097,2750;3098,2742;3099,2729;3101,2715;3113,2670;3118,2654;3125,2634;3127,2626;3130,2619;3136,2608;3147,2593;3153,2585;3163,2573;3176,2557;3190,2541;3209,2518;3238,2483;3241,2479;3271,2442;3289,2421;3305,2404;3375,2332;3406,2301;3421,2285;3449,2253;3495,2195;3509,2176;3514,2166;3517,2160;3522,2145;3523,2142;3529,2111;3530,2103;3531,2095;3544,2071;3554,2060;3562,2052;3572,2044;3591,2029;3607,2016;3638,1994;3673,1969;3686,1958;3691,1951;3702,1937;3722,1908;3732,1892;3738,1884;3745,1874;3753,1863;3759,1856;3772,1842;3787,1824;3801,1808;3810,1796;3830,1764;3841,1746;3853,1732;3871,1717;3910,1696;3977,1666;3707,3085;3716,3075;3724,3066;3731,3059;3747,3043;3758,3033;7059,2519;7095,2519;7111,2516;7120,2515;7136,2509;7155,2502;7179,2491;7181,2490;7214,2478;7217,2477;7234,2470;7237,2467;7239,2462;7237,2415;7235,2402;7236,2382;7526,1267;7532,1275;7537,1277;7543,1279;7548,1277;7587,1261;7642,1240;7682,1224;7689,1221;7695,1216;7701,1210;6551,1561;6546,1556;6542,1550;6538,1543;6535,1535;6535,1529;6536,1521;6536,1512;6537,1506;6537,1499;6537,1492;6537,1476;6537,1469;6536,1451;6535,1433;6536,1429;6538,1427;1639,3449;1594,3402;3384,2785;3372,2778;3200,2676;3186,2667;3175,2662;5778,1017;5780,1015;5782,1011;5783,1007;5784,1003;5786,996;5788,985;5794,961;5799,938;5804,914;5805,908;5806,904;5807,901;5810,897;5832,875;5367,1471;5386,1451;5420,1415;5449,1386;5454,1329;5464,1320;5495,1288;5534,1249;5568,1214;5600,1181;5671,1112;9458,1889;7728,2105;7739,2123;8015,1976;8104,1850;8109,1789;3566,1698;3562,1692;3559,1686;3558,1682;3560,1678;3562,1675;3565,1671;3570,1667;3582,1660;3585,1656;3586,1652;3584,1648;3581,1645;3572,1641;3563,1636;3552,1630;3549,1628;3541,1622;3530,1616;3509,1603;3505,1602;3501,1602;3499,1604;3493,1611;3487,1617;3484,1622;3479,1631;3478,1637;9679,4010;9702,4018;7872,2092;7909,2076;7922,2072;7933,2066;7940,2059;7953,2045;7990,2002;7467,2648;7520,2648;7577,2648;7634,2648;7676,2649;7736,2654;7771,2658;4001,1526;4028,1518;4039,1514;4046,1512;4052,1508;4063,1499;4075,1486;4093,1468;4124,1438;4143,1418;4147,1414;4151,1411;4157,1408;4164,1406;4177,1403;4228,1389;4236,1386;4242,1383;4247,1380;4252,1376;4279,1349;4283,1345;4286,1342;4317,1311;4347,1281;4350,1278;4353,1275;4383,1243;5898,2913;5968,2824;6005,2779;6041,2733;6078,2687;6115,2641;6151,2595;6223,2503;6260,2457;6308,2398;6311,2392;6312,2379;5943,417;5946,417;5949,416;5969,404;5992,390;5999,384;6004,379;6013,371;6034,349;6036,346;6036,343;6036,340;6702,2726;6713,2726;6289,1894;6304,1894;6367,1894;6454,1894;6462,1894;6468,1893;6471,1891;6474,1889;9871,3677;9875,3397;9878,3202;9878,3125;9875,3117;6328,4003;6313,4008;6215,4064;3970,2416;3965,2416;3960,2415;3955,2414;3950,2411;3935,2402;3912,2387;3900,2380;3887,2373;3864,2359;3852,2351;3843,2345;3837,2341;3835,2336;3833,2331;4993,4086;4994,4075;4993,4064;4989,4053;4977,4027;4884,3842;4809,3692;4780,3633;4766,3588;4762,3563;4761,3545;4762,3521;4767,3497;4773,3468;4781,3455;4790,3446;4801,3434;1463,3339;1458,3335;1449,3328;1441,3325;1425,3320;1419,3318;1413,3314;1408,3310;1376,3279;1351,3253;1308,3210;1295,3194;1291,3187;1286,3180;7642,2829;7657,2836;7666,2838;7705,2841;6963,649;6971,638;6976,631;6978,625;6980,619;6981,614;6982,605;6983,599;6276,1620;6286,1620;6336,1620;6357,1620;6387,1620;6418,1620;6432,1620;6443,1621;6451,1624;6459,1627;6466,1631;7492,3122;7492,2987;6209,1734;6222,1734;6233,1734;6243,1734;6285,1734;6304,1734;6311,1736;6318,1738;6325,1742;6332,1746;5857,3266;5804,3254;5786,3249;5773,3240;5767,3226;5768,3185;5770,3141;3732,2824;3733,2822;3765,2791;3796,2757;3808,2746;3815,2738;3825,2728;3831,2722;4737,2780;4596,2697;7032,366;6989,464;6974,498;4877,1177;4895,1157;4907,1146;4923,1138;4944,1134;4963,1132;4980,1126;7210,3032;7130,3031;4481,1145;4472,1139;4457,1130;4437,1118;4416,1105;4407,1098;4396,1092;4392,1091;4388,1090;4263,1005;4258,1002;4238,990;4219,978;4204,968;5481,2078;5547,2112;5924,3372;5940,3385;4150,1047;4166,1058;7387,1996;7381,1998;7376,2000;7336,2000;7268,2001;6085,2286;6087,2219;9425,2999;9451,2996;9461,2992;9474,2979;9476,2974;9477,2968;9477,2958;9477,2946;9477,2938;9478,2931;9478,2916;9479,2909;9474,2902;5528,1393;5506,1389;4537,1338;4571,1304;4609,1267;4618,1257;4630,1245;4634,1244;9702,2302;9686,2284;9679,2277;5094,2612;5128,2571;5237,2435;5241,2414;8903,2488;8902,2542;8911,2545;8954,2547;8962,2542;8960,2488;6498,2043;9121,3421;9104,3397;9102,3391;9105,3383;9115,3379;9141,3374;9180,3375;9256,3377;5409,2713;5411,2831;5409,2856;5416,2869;5442,2894;5489,2937;5522,2938;3137,2418;3126,2430;3118,2438;3107,2449;3102,2455;3094,2463;3087,2471;5121,1965;5152,1932;5156,1931;9120,2458;9159,2458;7215,2198;7235,2202;7256,2204;7264,2208;4689,2611;4672,2599;8541,3918;8592,3918;8749,3919;6362,3460;6455,3436;5681,3504;5655,3658;5648,3701;5638,3864;5645,3872;5647,3881;6194,919;6232,880;6235,871;6232,866;6197,842;6171,834;6148,828;6115,820;6083,812;6077,812;9359,4052;9342,4011;9329,4002;9311,3995;9299,3995;9277,3996;6863,3118;6915,3118;7017,3118;9285,3668;9286,3567;9288,3531;9291,3505;3356,2253;3346,2257;3340,2258;3333,2259;3323,2260;3312,2260;3300,2260;3290,2260;5326,2062;5313,2056;5274,2031;5290,2009;5160,1931;5230,2622;5213,2644;5201,2653;4958,1967;4975,1949;5022,1910;5054,1875;5060,1872;5065,1872;5104,1894;5107,1898;5108,1901;7760,895;7757,863;7756,845;7755,823;7753,818;7749,813;7745,808;7739,804;7571,2937;7572,2918;7574,2910;7580,2900;7611,2864;7655,2811;7208,1093;7209,1097;7209,1101;7203,1112;7199,1126;7198,1134;7197,1143;7197,1150;7198,1159;7200,1167;7202,1174;7205,1182;7209,1188;7216,1200;7220,1206;7231,1217;7244,1228;9277,932;9273,920;9270,915;9267,911;9260,908;9201,885;9197,882;9194,878;9191,875;9190,870;9188,846;9277,3444;9272,3435;9267,3414;9241,3272;7828,2680;7832,2644;7834,2638;8013,913;8013,920;8014,934;8025,951;8042,964;5569,2311;5591,2284;6353,1355;6355,1350;6359,1343;6365,1336;6370,1327;6375,1322;6380,1318;6386,1315;6393,1313;6401,1313;6435,1313;6452,1312;6470,1313;6488,1313;6505,1313;6515,1313;6524,1312;6532,1310;6540,1308;6548,1305;6563,1297;6584,1287;6595,1282;6604,1278;6615,1275;6625,1273;6633,1272;6640,1271;8259,1657;8256,1679;8260,1709;8271,1726;8273,1730;8298,1773;8308,1791;8310,1800;8308,1848;7745,3642;7749,3550;9454,2241;9454,2243;9465,2266;9465,2267;9450,2278;9446,2285;9446,2292;9446,2301;9446,2312;9435,2337;9433,2346;9435,2358;9438,2366;9444,2374;9450,2377;3082,2005;3077,2009;3062,2023;3053,2033;3045,2041;3035,2053;8244,1264;8288,1206;8295,1197;8322,1163;8357,1112;8364,1108;8373,1107;8384,1107;3789,1293;3737,1262;9447,3904;4575,2032;4487,2121;8300,2217;8300,2241;8299,2249;8296,2257;8292,2262;8291,2265;8283,2280;8283,2318;8283,2321;8280,2378;8280,2387;8284,2396;8287,2399;8289,2401;8295,2405;8306,2409;8313,2411;8322,2412;8334,2410;8343,2407;8353,2404;8359,2403;8364,2402;8379,2393;6706,119;6682,114;8000,1093;8002,1092;8003,1090;8003,1089;8003,1087;8002,1086;8000,1085;7998,1085;7996,1085;7994,1086;7993,1087;7993,1089;7993,1090;7994,1092;7996,1093;7998,1093;7391,3112;7393,3117;7398,3121;7405,3122;7440,3122;7529,3122;7537,3120;7542,3118;7561,3115;7599,3115;5252,1693;5250,1687;5242,1661;4489,1093;4499,1083;4520,1063;4531,1051;4543,1041;4555,1028;4560,1022;4564,1016;4568,1010;3879,1472;3878,1459;3879,1456;3882,1453;3888,1448;3891,1444;8410,1112;8461,1137;8511,1160;8522,1164;8533,1165;8543,1167;8561,1168;8584,1168;8606,1166;8624,1165;8638,1164;8665,1166;8677,1168;8686,1171;8693,1179;7391,1458;7388,1460;7370,1461;7346,1460;7315,1459;4572,1682;4557,1673;4544,1665;4512,1645;4484,1629;4469,1619;4444,1605;4418,1589;4397,1577;4392,1572;4387,1567;4383,1563;4586,1799;4580,1804;4561,1825;4549,1836;4540,1845;4534,1851;4525,1860;4520,1865;4514,1871;4508,1878;4503,1881;7271,2113;7270,2108;7271,2070;7271,2020;4339,2412;4287,2372;4257,2357;1716,3458;1680,3420;1653,3395;1645,3388;1639,3383;1632,3378;1815,3125;1816,3126;1818,3126;1819,3126;1821,3125;1821,3124;1822,3123;1821,3121;1820,3120;1819,3120;1817,3120;1816,3120;1815,3121;1814,3122;1814,3123;1814,3124;1659,3351;1651,3347;1640,3342;1625,3334;1621,3330;1620,3326;1621,3320;1625,3304;7352,558;7330,584;7325,593;3991,2820;4061,2749;4066,2745;7075,713;7074,718;7072,737;7070,747;7072,782;7073,798;7072,808;7070,819;7067,834;7065,848;7063,859;7061,874;7059,882;7056,887;7053,893;7048,898;7042,902;7035,906;7028,908;7019,910;7005,911;6219,1559;6215,1556;6207,1549;6199,1542;6192,1527;6189,1519;6188,1511;6188,1503;6188,1497;6190,1489;6191,1484;6199,1470;6215,1447;6221,1440;6245,1409;6259,1390;6270,1374;6286,1352;6298,1336;6307,1324;6325,1299;6329,1293;6333,1289;6337,1285;6342,1281;6348,1278;6354,1276;6359,1274;6369,1271;3292,2997;3295,2990;3300,2984;3313,2970;3319,2964;3324,2960;3561,1345;8858,502;8855,437;8725,3573;8727,3444;8730,3265;8731,3243;8771,3170;8790,3133;8794,3113;8802,3096;8836,3038;8136,982;8137,982;8139,982;8141,982;8142,981;8143,980;8143,979;8143,978;8142,977;8140,976;8139,976;8137,976;8136,977;8135,978;8135,979;8135,981;9964,2271;9955,2093;9955,2045;9945,1972;4695,1278;4684,1273;4667,1263;4650,1253;4638,1244;6426,432;6380,363;6355,323;6352,322;5144,1546;5142,1544;5137,1540;5121,1531;5115,1530;5110,1529;5092,1531;5085,1530;5080,1529;5075,1526;4931,1439;8473,3284;8397,3195;8383,3173;8376,3147;8382,3013;8389,2988;8414,2976;5832,967;5837,967;5840,966;5844,965;5846,963;5848,961;5849,958;5851,947;5852,941;5853,936;5855,930;5857,925;5860,921;5865,916;5869,913;5871,909;5873,905;5873,902;4932,3086;4935,3084;4941,3082;4949,3081;4954,3082;4993,3082;5146,3082;5174,3072;5201,3071;5237,3057;6140,1026;6058,979;5988,936;5942,908;5926,899;5898,882;5854,856;5848,853;5774,808;5720,778;5695,762;5542,671;5449,616;5444,613;5415,596;5336,547;4288,1740;4300,1727;4397,1629;9308,1235;9315,1229;9320,1223;9324,1217;9326,1210;9328,1204;9328,1198;9327,1192;9326,1187;9324,1183;9321,1179;9318,1174;9234,1087;7209,3254;7209,3297;7209,3324;7209,3376;7207,3435;6291,1354;6295,1354;6313,1355;6331,1355;6424,1355;6442,1356;6463,1356;6511,1356;6522,1355;6527,1355;6538,1353;6548,1351;6558,1348;6576,1341;6585,1337;6594,1332;6601,1330;6608,1329;6615,1328;6622,1328;2854,2143;2877,2160;2878,2163;4278,1674;4270,1669;4260,1663;4245,1654;4212,1633;4191,1621;4175,1612;4166,1605;8050,3253;8036,3304;8032,3394;8036,3402;8044,3409;8052,3412;8068,3413;8073,3413;8092,3414;8107,3410;8143,3403;8150,3401;4143,2874;4137,2868;4132,2863;4125,2858;4120,2854;4113,2852;4107,2852;4104,2850;4102,2847;7304,1940;7307,1907;7306,1903;7303,1899;7297,1897;7264,1896;7260,1897;7257,1900;7255,1907;7238,1907;7235,1910;7236,1943;3863,2720;3865,2734;3864,2736;3861,2737;7082,1895;7082,1931;7068,1936;7065,1941;7065,1949;2750,2193;2740,2196;2731,2199;2721,2203;2716,2206;2708,2211;3138,2362;7766,732;7759,726;7754,720;7747,713;7741,705;7736,696;7733,690;4745,1627;4751,1621;4762,1609;4769,1602;4776,1595;4787,1584;4794,1577;4800,1571;4805,1566;4813,1558;4822,1548;4827,1543;4833,1537;4839,1531;4845,1526;4873,1496;4963,1410;5035,1323;5053,1303;5063,1291;5084,1271;5166,1187;5175,1178;5184,1169;5192,1162;5118,1069;5106,1062;5095,1055;5084,1049;5072,1042;5061,1036;5050,1029;5545,3577;5541,3575;5448,3565;5383,3558;6223,3798;6159,3832;6094,3867;5897,3978;5773,4044;7012,1978;7010,1973;7009,1924;7009,1900;7012,1897;7017,1895;9472,3969;9483,3944;7086,1939;7096,1937;7136,1938;7160,1938;7183,1939;7192,1940;7219,1944;7260,1940;7322,1940;7345,1931;7354,1926;7433,1921;7448,1917;7469,1903;7482,1887;7505,1873;7517,1871;7529,1871;7582,1872;7637,1872;7692,1872;7767,1873;4428,1271;4561,1136;4677,2901;4655,2888;4646,2886;4630,2882;4612,2870;4553,2835;4481,2792;4475,2787;833,4069;844,4055;874,4040;3743,2444;3747,2440;3751,2435;3754,2429;3760,2402;3774,2337;7136,1905;7140,1900;7146,1896;7191,1896;8141,1129;8159,1128;8187,1127;8191,1126;8195,1127;8199,1129;8201,1132;8205,1139;5540,2550;5613,2460;5651,2414;8562,1956;8548,1960;8540,1966;8531,1977;8529,1978;8526,1986;8517,2004;8510,2020;8504,2033;8503,2054;8508,2080;8516,2121;8519,2135;8523,2146;8529,2162;8528,2177;8528,2199;7638,1761;7641,1747;7647,1736;8793,3884;8798,3867;8799,3849;8802,3842;7229,500;7299,411;7303,406;7303,402;7302,397;7299,386;5968,955;5935,935;5928,934;3844,2085;3837,2094;3830,2101;3823,2109;9264,3116;9290,3098;9292,3097;9298,3094;9309,3094;9333,3094;9338,3094;9348,3094;9358,3096;6852,1164;6887,1150;6895,1147;6901,1146;6908,1146;6923,1146;6936,1146;6952,1146;6969,1146;6980,1146;7034,1146;8154,3823;8199,3830;8238,3837;3070,2886;3070,2879;3071,2871;3072,2865;3076,2859;3081,2853;3086,2848;3091,2844;3102,2837;3107,2833;3121,2820;5877,195;5881,198;5884,200;5906,211;5909,212;5913,211;5916,211;5919,210;5922,208;6398,2940;6402,2768;4305,2199;4300,2199;4297,2199;5623,2246;5666,2191;4006,1902;4141,1767;4683,1647;4688,1647;4691,1648;4696,1651;4703,1655;4710,1659;4716,1662;4727,1670;4741,1677;4533,469;4536,467;7989,2935;7974,2872;7965,2834;7966,2823;7974,2813;5466,1108;5468,1112;5473,1116;5480,1119;5487,1123;5491,1125;5497,1125;5502,1124;5506,1122;5513,1115;5521,1106;5532,1094;5544,1082;5925,3213;5884,3235;5866,3251;5854,3284;5858,3301;5869,3319;5878,3330;5715,2127;7425,2311;7431,2300;7434,2291;6743,635;6714,651;6710,654;6707,658;6705,662;6704,666;6704,670;6705,675;6708,686;4703,2374;4687,2360;4556,2284;4333,2150;4176,2055;4161,2046;4141,2040;4105,2019;9987,2044;7024,2339;7060,2339;7067,2336;2543,2998;2529,2993;2494,2986;3650,3512;3731,3424;7507,480;7528,457;6691,1106;6699,1108;6705,1110;6711,1113;6715,1116;6718,1119;6721,1123;6725,1131;5421,563;5436,549;3998,2381;3904,2326;3897,2322;6520,2899;6659,2899;3213,2189;3207,2181;3203,2174;3196,2167;3191,2163;3186,2160;3179,2157;3172,2155;3165,2154;3157,2154;3149,2154;3140,2154;3285,3294;3354,3221;3359,3219;3364,3218;3372,3219;3406,3241;3409,3245;3410,3249;3407,3254;3338,3326;5774,3796;1063,3715;1052,3704;1036,3692;1018,3682;982,3668;947,3638;911,3615;889,3607;874,3603;6983,2180;6999,2154;7019,2131;7040,2108;7049,2095;7054,2083;7056,2070;7056,2008;5573,1512;5461,1447;7321,2265;7329,2246;7372,2212;7391,2205;7495,2206;7515,2198;8922,2816;8981,2816;8995,2820;9006,2828;9011,2837;9013,2858;9012,2883;9017,2892;9025,2896;9041,2897;9122,798;9097,791;5211,1529;5234,1504;5236,1495;5231,1487;5181,1456;7977,1039;7968,1020;7966,1017;7965,1013;7966,1010;7967,1006;7968,1003;7970,1001;7972,997;7975,995;7979,992;7983,990;8017,981;8021,980;8025,978;8029,975;8032,972;8038,967;6862,3159;6863,3031;5091,1676;5189,1573;5217,1542;5216,1535;541,3657;553,3655;977,3619;891,3676;876,3685;866,3689;851,3690;840,3689;829,3686;821,3681;783,3645;7063,3440;7097,4069;7104,4033;7187,4028;7188,3917;7023,2812;7104,2811;7264,2811;7271,2813;7276,2817;7277,2823;7277,2856;7276,2900;7276,2944;5773,2156;5811,2175;5817,2177;5824,2177;5831,2176;5839,2175;5860,2164;5871,2160;5881,2158;5907,2158;5916,2159;5972,2159;5987,2159;5998,2159;6007,2158;6016,2157;6026,2156;6072,2156;6083,2156;6094,2154;6128,2148;8909,2854;8922,2801;8917,2788;8905,2773;8891,2760;8880,2742;8881,2721;8903,2689;8904,2651;6392,4067;6409,4066;6503,4078;6527,4078;6556,4075;6583,4069;6605,4060;486,4058;475,4062;462,4065;432,4064;387,4062;346,4060;314,4053;295,4048;275,4041;257,4032;231,4015;213,3994;6355,4091;7311,988;7313,987;7314,986;7315,984;7314,982;7313,981;7312,980;7310,980;7307,980;7306,981;7305,982;7304,984;7304,985;7305,987;7307,988;7309,988;7278,2442;7277,2429;7280,2427;6330,2379;6330,2337;6333,2319;6338,2304;6346,2290;6394,2236;6400,2225;6402,2215;6403,2204;5866,1128;5900,1125;5915,1120;5928,1112;2890,2985;2899,2990;2909,2995;2919,3001;2924,3003;2929,3004;2934,3005;2940,3006;2945,3008;2955,3014;2986,3032;3042,3065;3045,3067;3047,3070;3047,3073;3047,3078;9161,1733;9160,1772;9159,1781;9162,1791;9165,1826;9162,1855;9087,2864;9109,2831;9118,2801;9132,2768;9151,2748;9171,2736;9193,2727;9217,2723;9236,2721;9305,2723;9369,2724;9388,2726;6624,2497;6645,2497;9362,2118;9402,2098;9414,2092;4193,2429;8326,2650;8338,2592;8342,2571;8338,2564;8334,2557;8323,2551;8309,2548;8273,2547;5522,2964;5604,2964;5614,2960;3219,1824;3222,1829;3232,1845;3235,1855;4392,976;4276,906;4254,892;4205,862;4194,856;4183,851;4173,847;4164,843;4156,839;4118,815;6865,1284;6862,1275;6860,1269;6859,1263;6860,1257;6860,1251;6860,1246;6857,1237;6844,1217;6832,1199;6804,1158;6202,3779;6119,3771;5982,3755;5841,3742;3562,2038;3549,2030;3521,2013;3507,2004;6770,2943;6956,2943;6961,2942;6964,2940;6965,2935;6965,2899;6918,2899;6912,2898;6909,2896;6908,2892;6908,2856;6908,2812;6908,2769;9124,2432;9103,2436;9079,2458;8823,2938;8818,2931;8818,2899;5250,2416;5348,1558;5288,1520;9126,2060;9141,2070;9142,2073;6105,1670;5971,1590;5827,1504;5737,1451;5732,3986;5719,3991;5697,3994;5646,3995;5092,2622;5096,2631;5117,2658;5132,2679;5139,2693;5135,2704;5116,2729;5016,2856;5013,2865;5011,2877;3364,2325;3354,2320;3346,2315;3338,2310;3332,2308;3326,2307;3321,2306;3315,2305;3309,2305;3301,2305;3293,2306;3286,2307;3281,2307;3276,2306;3271,2304;3266,2303;3261,2301;3253,2296;3244,2291;3234,2285;7398,829;7398,827;7397,826;7396,825;7394,825;7392,825;7390,825;7389,826;7389,828;7389,829;7390,831;7391,832;7393,832;7395,832;7396,831;7398,830;8983,2716;8983,2718;8984,2719;8986,2719;8987,2720;8989,2719;8990,2718;8991,2717;8992,2716;8991,2715;8990,2714;8989,2713;8987,2713;8985,2713;8984,2714;8983,2715;4504,1052;4484,1039;4460,1024;5907,3190;5926,3180;5950,3171;5990,3165;6025,3161;6180,3140;6188,3138;6194,3139;6198,3139;6202,3141;6205,3145;6208,3148;6209,3151;6209,3165;6214,3170;6220,3176;6231,3181;6242,3181;6276,3181;6287,3182;6297,3181;6308,3180;6318,3177;6333,3170;6112,1617;6111,1602;6099,1562;6088,1543;6071,1523;6048,1507;6022,1494;5974,1478;5957,1470;5939,1458;5896,1416;5870,1399;5841,1383;5797,1365;5148,1491;5210,1428;5214,1424;5232,1412;5245,1399;6342,3765;6368,3823;799,3729;831,3709;837,3701;8686,832;8690,827;8697,822;8707,815;8716,809;8722,804;8726,798;8730,792;8733,787;8736,780;8737,773;8736,767;8734,760;2208,3101;2202,3108;2193,3117;2187,3124;2177,3135;2181,3137;7739,1255;7828,1220;8452,3012;8483,3007;8512,3000;8551,3025;3425,1946;3421,1948;3417,1951;3411,1956;3404,1964;3393,1975;3384,1984;3366,2001;3358,2011;3357,2014;755,3692;737,3676;6323,3157;6462,3158;6683,3160;6958,3160;7016,3160;7074,3160;7093,3160;7129,3160;7200,3161;7282,3161;7290,3161;7308,3160;7340,3161;7441,3162;7637,3163;7644,3162;7649,3160;7651,3156;7653,3148;7666,3072;7693,2918;7749,2572;6705,1054;6708,1051;6712,1049;6716,1047;6722,1047;6730,1049;9300,1240;9294,1242;9288,1244;9281,1245;9274,1246;9268,1246;9259,1246;9252,1244;9246,1242;9240,1240;9234,1238;9229,1234;9224,1230;9216,1221;9200,1206;9185,1190;9166,1170;9143,1146;9268,851;9265,821;9262,797;9261,793;5778,4057;5774,4053;5790,3950;5811,3823;5819,3783;3985,1780;3957,1763;6794,2102;4140,1984;4150,1974;4163,1960;4185,1938;4204,1918;4213,1909;4241,1880;4249,1872;4265,1856;4273,1849;7037,1104;7035,1106;7034,1109;7034,1126;7034,1136;7034,1156;7036,1166;7039,1187;7041,1195;7044,1204;7048,1214;7066,1250;7077,1266;7083,1273;7090,1282;7096,1289;7115,1306;7130,1318;7136,1323;3221,1918;3222,1919;3223,1920;3225,1921;3227,1921;3228,1920;3230,1919;3230,1918;3230,1916;3229,1915;3228,1914;3226,1914;3224,1914;3223,1914;3221,1915;3221,1917;6235,3741;6126,3728;5988,3713;5842,3698;6815,2;6807,5;6800,8;6793,13;6786,19;272,4048;273,4054;275,4059;280,4064;285,4069;291,4076;305,4087;315,4093;328,4099;342,4102;516,4085;6702,1234;6696,1229;6691,1221;6687,1212;6683,1204;6681,1196;6679,1188;6678,1181;6677,1174;6678,1165;6678,1155;6679,1149;6680,1144;6684,1129;6688,1117;6085,596;6131,561;379,3896;365,3880;7818,2477;7811,2464;7823,2395;5882,1065;5872,1054;5851,1040;5847,1034;5593,528;5599,520;5607,511;5617,502;5629,486;5632,484;5633,483;5634,480;5634,478;5633,475;5631,473;5627,470;5613,463;5600,457;5577,443;5568,437;5561,432;5555,427;5550,424;5546,422;5539,419;5487,3978;5472,3978;5458,3975;5438,3962;5415,3947;5400,3942;5345,3937;5762,3763;5723,3759;5715,3753;5709,3747;5707,3739;5707,3731;5707,3724;5703,3718;5698,3713;5683,3711;5669,3708;5587,3695;7320,543;7383,573;7945,1534;7945,1528;7940,1459;7934,1345;9370,2895;9374,2869;9375,2841;9379,2831;9383,2826;9393,2823;9400,2821;9410,2823;9423,2827;9434,2832;5442,1048;5427,1039;5413,1030;5398,1022;5384,1014;5371,1006;5355,996;5338,986;5314,972;5299,963;5278,951;5256,938;5241,929;5231,923;5224,919;5219,917;5214,917;5209,917;5204,918;5199,921;5195,924;5190,930;5180,941;6772,3026;6770,3021;6769,2986;6770,2899;6769,2820;6770,2816;6774,2813;6778,2812;7315,700;7331,680;7337,677;7342,675;7346,673;7353,673;7359,674;7365,676;7425,711;7494,751;5425,1797;5439,1791;5445,1785;5461,1744;5455,1735;5348,1670;5301,1642;5232,1599;6587,752;6538,765;6502,774;6462,779;6400,789;6368,800;6356,808;6347,815;6338,823;6327,835;6317,845;6226,938;6023,1146;5970,1181;5901,1250;5881,1273;5849,1301;5829,1323;5777,1391;5770,1403;5754,1424;5701,1497;5672,1525;5561,1643;5551,1661;5537,1692;5520,1733;5505,1767;5453,1892;5452,1895;5440,1920;5425,1941;5392,1982;5357,2022;5331,2055;5297,2102;5294,2118;5297,2131;5469,2016;5465,2016;5456,2013;5449,2010;5414,1989;5409,1987;5404,1985;5399,1983;5775,3285;5775,3284;5774,3283;5772,3282;5770,3281;5768,3281;5766,3282;5765,3283;5765,3285;5765,3287;5766,3288;5768,3289;5770,3289;5772,3289;5773,3288;5775,3287;4793,3383;4761,3382;4710,3378;4573,3370;6609,2380;6609,2339;6611,2325;6617,2307;6626,2292;6693,2212;6695,2206;6219,3431;6256,3419;6298,3394;3656,2238;3657,2239;3659,2239;3661,2239;3662,2238;3663,2236;3663,2235;3663,2233;3661,2232;3660,2232;3658,2232;3656,2232;3655,2233;3654,2234;3654,2236;3654,2237;3454,2561;3467,2554;3476,2548;3483,2542;3498,2526;9565,1536;9652,1536;9762,1536;9840,1534;9901,1532;9925,1531;5047,1649;5050,1645;5076,1619;5141,1555;9558,4060;9585,4037;9596,4023;9622,3975;9626,3945;9628,3824;9634,3805;9654,3784;9672,3762;9683,3749;9688,3735;9690,3716;4550,3182;4479,3139;4460,3128;4373,3077;4333,3053;4289,3026;4201,2974;5889,3526;5877,3601;3947,2793;4013,2725;4021,2719;4027,2715;4037,2711;4791,1399;4796,1394;4802,1387;4810,1380;4814,1375;4818,1371;4825,1365;4831,1358;4836,1352;4841,1346;4846,1339;4860,1316;4867,1306;4872,1298;4882,1284;4891,1274;4902,1263;4909,1256;4914,1250;4920,1245;4937,1228;4945,1220;3395,2295;3385,2289;3379,2286;3375,2283;3372,2279;3369,2274;3365,2268;6636,3527;6637,3516;4719,913;4715,910;4710,907;4704,905;4698,904;4693,903;4687,904;4682,905;4678,905;4672,906;4666,905;4660,902;4654,899;4646,892;4640,886;4638,883;4637,878;4643,871;6124,3195;6127,3204;6130,3210;6134,3215;6142,3221;6156,3229;6174,3243;6182,3250;6190,3259;6206,3279;5884,3962;5874,3959;9573,3832;9580,3822;9581,3809;9589,3791;9604,3774;9624,3750;9630,3734;9631,3715;9478,4061;9500,4048;9520,4035;9542,4019;9557,4001;9571,3975;9577,3945;1257,3435;1261,3435;1267,3433;1271,3431;1383,3359;8169,3687;8165,3743;6940,489;6933,488;6929,489;6925,492;6923,495;6921,500;6919,505;6917,509;6914,514;6911,517;6906,520;6886,530;6879,533;6875,535;6872,538;6872,542;7678,2131;7643,2122;7593,2121;7578,2108;7882,2679;7871,2681;7769,2678;7778,2616;3641,2764;3647,2758;3658,2746;3660,2743;3661,2739;3662,2736;3662,2728;3659,2717;3656,2698;8216,2358;8220,2347;8218,2300;8210,2289;8189,2285;8163,2288;8152,2354;8163,2364;8186,2367;8207,2364;6389,982;6409,979;6371,2027;6363,2021;6346,2011;6329,2002;6320,1995;6313,1989;1027,3313;1045,3302;1109,3261;1115,3257;1120,3255;1124,3255;1139,3255;6285,1814;6301,1814;6329,1814;6346,1813;6464,1814;6469,1815;6472,1817;7842,2203;7859,2118;5682,3417;5704,3436;8364,2006;8366,2007;8367,2007;8369,2008;8371,2007;8373,2006;8374,2005;8374,2003;8373,2002;8372,2000;8370,2000;8368,2000;8366,2000;8365,2001;8364,2003;8364,2004;5075,1666;5071,1671;5050,1692;5046,1695;5041,1696;5038,1695;5034,1694;5016,1683;4991,1666;4976,1658;4960,1648;4948,1640;6602,3916;6867,3786;6147,1961;6150,1956;6153,1953;6155,1951;6159,1948;6163,1946;6168,1945;6176,1944;6189,1943;6202,1941;4572,849;4573,849;4576,850;4578,849;4579,848;4580,847;4581,845;4580,843;4579,842;4577,841;4575,841;4573,842;4571,843;4570,844;4570,846;4570,847;6626,3203;9067,1856;9049,1847;9021,1836;8997,1828;5006,818;5008,819;5010,819;5012,818;5013,817;5014,816;5014,814;5014,813;5012,812;5010,811;5008,811;5007,811;5005,812;5004,814;5004,815;5005,817;5397,468;5426,485;5460,504;5474,514;5512,536;5575,574;5578,577;5579,579;5580,581;5580,584;5580,587;1268,3275;1277,3273;1293,3270;3147,1763;3138,1756;3127,1747;3122,1743;3108,1737;3101,1732;3096,1728;3092,1723;3086,1713;6176,2172;6171,2165;6157,2119;6156,2114;6157,2110;6159,2105;6170,2088;6181,2072;6184,2067;6183,2061;6181,2054;6178,2050;6173,2043;6166,2031;6164,2021;6162,2016;6156,2005;6148,1989;6146,1980;6145,1971;4601,1512;4583,1529;9788,2435;9840,2444;9888,2452;7778,1908;7776,1897;7771,1886;7741,1745;7744,1722;7749,1707;7756,1695;7768,1681;9990,2204;8965,3586;8923,3575;8860,3575;8792,3575;8763,3604;5975,3486;5978,3470;5974,3463;5970,3457;5961,3452;5948,3449;5926,3443;5919,3439;5910,3432;5903,3426;5411,3177;5671,3180;5694,3184;5710,3184;5816,3184;5827,3186;5835,3191;5846,3202;5839,2884;5910,2796;5946,2751;5983,2704;6020,2658;6056,2613;6092,2567;6165,2474;6201,2429;6243,2379;4595,2247;4595,2234;4711,2113;5863,3133;5903,3114;5926,3104;5950,3091;5969,3078;5989,3073;6119,3066;6150,3061;6176,3053;6222,3033;6287,3001;6339,2988;6363,2986;6464,2986;7019,2988;7074,2988;7210,2988;7242,2988;7261,2987;7334,2987;7392,2987;7441,2987;7543,2988;7621,2988;7639,2992;7655,3000;7664,3006;7669,3009;7502,1666;7530,1666;7584,1667;7607,1667;7619,1669;7632,1674;7666,1690;7676,1692;7687,1692;7696,1687;7734,1658;7109,566;7117,567;7124,567;7130,566;7137,564;7143,560;7146,556;7148,553;7162,535;7166,530;7166,526;7167,522;7163,518;7152,512;9282,4015;9726,4103;9723,4097;9709,4083;9692,4067;9678,4057;9669,4052;9654,4047;5967,882;6011,837;6014,828;6011,815;6010,799;6015,763;6014,752;6003,738;5997,736;5993,735;7485,469;7450,501;7428,2905;8940,2124;8954,2157;8955,2206;8954,2253;8958,2256;8967,2257;9024,2258;9089,2260;9101,2262;9117,2266;6868,488;6855,482;6844,476;6836,471;6830,466;6824,460;6820,453;6816,446;6814,437;6811,426;6810,416;6809,404;6810,396;6811,389;6815,377;6819,365;6825,352;6828,349;6832,347;6264,1393;6269,1394;6275,1395;6280,1396;6343,1397;6382,1397;6403,1397;6471,1397;6483,1397;6490,1397;6497,1395;6503,1392;6517,1383;6521,1378;6523,1374;6526,1369;6527,1365;6528,1360;5170,3947;8858,2490;8857,2478;8856,2468;8854,2459;8839,2397;8826,2358;8821,2347;8815,2338;8790,2309;8755,2266;8727,2229;8698,2189;8669,2148;8647,2117;8628,2092;7131,822;7141,825;7152,830;7175,841;7183,844;7188,845;7191,844;7195,844;7198,843;7200,843;7204,841;7208,838;7212,834;7231,811;7244,796;7246,791;7248,786;7249,781;7249,781;7248,778;7247,775;7246,773;7243,770;7236,765;7209,752;7205,750;7195,747;7190,746;7142,743;7112,740;7086,739;7038,737;7028,743;7023,747;7020,753;7017,761;7015,786;7013,807;6753,1862;6752,1801;6752,1795;6748,1792;6677,1792;6644,1792;6612,1793;6604,1792;5463,3483;5320,341;5311,351;5523,1684;5494,1668;5483,1663;5472,1665;5455,1673;5444,1672;5412,1652;5314,1592;5254,1555;7585,1178;7587,1177;7588,1175;7588,1174;7587,1172;7585,1171;7583,1170;7581,1170;7579,1171;7577,1172;7577,1174;7577,1175;7577,1177;7579,1178;7581,1179;7583,1179;3428,2013;3429,2014;3431,2014;3433,2014;3435,2013;3436,2012;3436,2010;3435,2009;3434,2008;3433,2007;3431,2007;3429,2007;3428,2008;3427,2009;3426,2010;3427,2012;8846,2720;8828,2720;8819,2723;8813,2729;8811,2742;8813,2753;6285,1854;6304,1854;6476,1854;6303,2542;6338,2496;6358,2473;6366,2469;6375,2467;6410,2468;3016,1788;3018,1789;3020,1789;3022,1789;3024,1788;3025,1787;3025,1785;3024,1783;3023,1782;3021,1781;3019,1781;3017,1782;3016,1783;3015,1784;3014,1785;3015,1787;3940,2289;3938,2279;3934,2253;3936,2249;3938,2245;3941,2241;3958,2224;6537,1772;6538,1754;6538,1735;6538,1725;6538,1695;6536,1685;6535,1674;6535,1668;6535,1640;6536,1621;924,3596;924,3590;919,3585;889,3556;7890,1581;7910,1580;7930,1579;7956,1578;7980,1577;8061,1574;6314,2246;6319,2248;4787,2527;4742,2498;4734,2489;4730,2476;9775,927;9769,917;9766,914;9761,911;9751,911;9735,912;9718,908;4738,2444;4737,2435;4735,2429;4724,2410;4722,2408;4720,2405;4699,2393;4705,2387;4728,2400;4715,1820;4709,1825;4704,1830;4679,1855;4627,1910;4624,1912;4620,1913;4617,1913;8120,1572;8106,1350;9246,3416;9140,3414;5677,844;5692,848;7946,1077;7947,1076;7948,1075;7948,1073;7948,1072;7946,1071;7945,1070;7943,1070;7941,1071;7940,1072;7939,1073;7939,1074;7940,1076;7941,1077;7943,1077;7944,1077;1809,3195;1799,3183;1776,3159;1761,3144;9431,3942;8542,4069;8541,4031;8542,3844;8541,3820;8544,3810;8234,1094;8236,1098;8239,1102;8242,1107;8259,1130;8263,1133;8268,1136;8273,1137;8278,1138;8284,1137;8289,1137;8291,1136;8294,1135;8296,1134;8298,1133;8300,1132;8304,1127;8311,1116;8318,1105;8320,1103;8321,1099;8321,1097;8320,1081;4932,812;4941,804;4955,789;4968,777;4973,773;4979,769;4985,767;4990,765;5020,762;5025,762;5029,762;5034,763;5038,765;5043,767;5065,780;5079,788;5092,796;5094,799;6355,1724;6347,1717;6343,1711;6340,1706;6340,1699;6340,1669;6340,1653;6338,1647;6337,1641;6337,1630;3207,3010;3214,3002;3220,2996;3226,2992;3234,2989;3245,2982;3250,2978;3254,2972;3256,2966;3257,2960;3256,2944;3256,2934;3257,2929;3259,2923;3264,2918;3269,2912;5254,1456;1753,3149;1735,3159;1724,3165;1722,3165;1719,3165;5517,1340;8912,3007;8913,2898;7223,1741;7251,1731;7261,1729;7291,1729;7330,1729;7338,1730;7345,1731;7399,1744;7404,1745;7413,1747;7459,1748;7403,2769;7402,2734;7403,2723;7408,2709;7408,2699;7409,2641;7408,2632;7406,2623;7401,2612;7394,2601;7373,2564;7340,2510;7335,2493;7334,2485;7335,2471;7335,2424;7335,2423;7337,2383;5649,1800;5702,1768;5717,1761;5762,1746;5773,1740;5773,1345;5624,1257;5509,1184;5407,1128;5395,1125;5382,1125;6845,3327;6846,3292;2682,3119;2664,3122;2429,3157;2360,3167;2349,3169;2342,3169;2334,3169;2322,3166;7987,2636;7983,2623;7983,2502;7988,2493;7989,2492;8037,2492;5747,1376;5576,1275;5351,1152;5306,1128;5296,1121;5285,1116;5273,1110;5260,1103;5249,1097;5237,1089;5225,1082;5211,1074;5201,1068;5179,1055;5170,1050;5159,1044;5149,1038;5143,1034;5136,1031;5127,1025;5115,1018;5107,1015;5100,1012;5091,1012;5083,1013;5076,1015;5068,1019;5059,1024;5041,1032;5031,1035;5018,1037;5009,1038;4999,1038;4991,1038;4982,1037;4973,1035;4965,1032;4957,1029;4950,1026;4936,1017;5414,3735;5425,3734;5443,3735;5475,3737;5488,3736;5506,3729;5519,3717;5525,3707;5528,3696;5534,3657;5541,3617;5547,3581;7820,2909;7872,2895;7921,2881;8030,2899;8046,2905;8138,2908;8167,2906;8203,2896;5928,860;5890,835;5977,747;5986,736;5987,736;7071,3296;4429,3029;4417,3009;4280,2926;4275,2922;4273,2919;5236,2686;5327,2686;4628,1768;4638,1758;4678,1718;4686,1711;4694,1702;4702,1695;4708,1688;6692,4010;6693,4024;6702,4037;6708,4045;6720,4048;7683,1605;7688,1611;7714,1640;7791,1693;7822,1706;7845,1715;7847,1716;7853,1721;5521,2875;5613,2876;3992,2501;3976,2517;3972,2521;3968,2523;3965,2523;3960,2521;2891,2621;2892,2624;2893,2627;2895,2631;2900,2633;2904,2636;2909,2639;2918,2644;2254,2717;2252,2712;2249,2707;2245,2703;2240,2700;2235,2698;2228,2695;2222,2691;2217,2688;2213,2683;2209,2679;2206,2675;1281,3173;1273,3164;1263,3147;1242,3117;1240,3113;1236,3109;1232,3106;1228,3103;1223,3100;1215,3098;1208,3096;1199,3095;1191,3096;1171,3098;1159,3099;1148,3100;1138,3101;1129,3101;1115,3102;1104,3102;1090,3103;1077,3104;1059,3106;1042,3110;1025,3114;1012,3117;993,3122;983,3122;976,3121;966,3118;8151,2272;8145,2260;8148,2243;8159,2225;8166,2204;3380,1915;3376,1919;3313,1984;3308,1988;3305,1991;3300,1993;3295,1995;3290,1996;3285,1996;3281,1996;3276,1995;3270,1992;3267,1986;4793,3026;4783,3015;4648,2935;6069,3851;5967,3839;3360,2978;3350,2974;3340,2969;3331,2964;3316,2953;3309,2948;3300,2938;3295,2931;3290,2926;3285,2922;3278,2917;6018,1966;6020,1826;6019,1815;4288,773;4290,772;4291,771;4291,769;4291,768;4290,766;4288,765;4286,765;4284,765;4282,766;4281,768;4281,769;4281,771;4282,772;4284,773;4286,773;9733,2430;9728,2437;9720,2447;9715,2455;9713,2461;9711,2466;9724,2497;9732,2505;9745,2509;9766,2513;5240,1188;5247,1186;5255,1180;5263,1171;5274,1160;5282,1152;5293,1141;5300,1134;5331,1102;6088,2863;6040,2886;6024,2895;5994,2930;5994,2936;7709,2113;7695,2094;6778,510;6786,510;6795,511;6804,512;6822,511;6831,509;6840,507;6847,504;6854,500;6860,495;6732,1657;6721,1657;6667,1657;9410,1146;9450,1137;9460,1134;9468,1129;9474,1126;9479,1122;9485,1118;9490,1113;9494,1107;9498,1101;9500,1096;9502,1089;9502,1083;9502,1077;9500,1072;9498,1067;9496,1062;9486,1048;3481,3411;3387,3508;7529,1916;7718,1917;9428,2899;9430,2840;9442,2822;9444,2814;9445,2806;9445,2800;9437,2789;9422,2780;3960,1486;3946,1500;3938,1503;4640,996;4619,982;4594,967;4566,949;4540,933;4514,916;4478,894;4447,875;4418,856;4383,834;4375,828;4367,824;4361,823;4353,822;4346,822;4630,492;4610,481;4606,477;4604,474;4602,470;4600,466;4598,455;4597,450;4597,445;4600,440;4603,436;4624,416;4674,365;8078,2256;8081,2298;7520,2687;7521,2561;7525,2552;6727,3706;6758,3744;833,3878;858,3844;877,3829;928,3799;970,3774;1022,3741;1075,3708;1086,3689;1095,3681;1127,3661;5788,640;5830,597;5857,568;5861,565;5866,562;5871,559;5888,551;5335,2907;5335,2933;5337,3043;5337,3053;6274,2623;6275,2604;6278,2599;6284,2596;6453,2596;6460,2599;4081,1272;4086,1268;4114,1241;4148,1208;4180,1174;8163,2950;8172,2945;8174,2939;8174,2926;8151,2881;8141,2872;2642,2914;2624,2903;2610,2894;2595,2885;2583,2878;2576,2876;2570,2874;2563,2874;2552,2874;2537,2874;2524,2875;2516,2875;2509,2875;2502,2876;2493,2877;8729,575;8721,575;8710,576;8700,577;8695,577;8690,579;8685,582;8681,586;8675,588;8670,589;8663,589;8657,586;8650,582;8646,577;8643,571;8643,564;8643,558;8641,554;8638,550;8634,548;8628,547;8621,548;8610,551;8603,552;8593,553;8582,553;8567,551;8558,550;8552,546;8547,544;8541,544;8535,545;8529,547;8525,549;8522,552;8520,556;8519,561;8520,567;8524,576;8531,595;8536,605;8537,610;8536,615;4913,1940;4908,1946;4903,1951;4837,2019;4831,2024;4828,2027;4824,2030;3746,3565;3597,3482;3577,3469;3550,3453;3409,3368;3307,3308;3137,3207;3092,3180;2998,3124;2401,3479;2391,3469;2383,3463;2377,3458;2369,3453;2366,3452;2893,3088;2890,3079;2888,3070;2886,3063;2884,3059;2881,3055;2876,3052;2838,3029;9104,1874;9105,1871;9109,1867;9114,1863;9126,1859;9150,1856;9168,1855;9189,1859;9198,1862;9205,1867;9207,1872;7761,76;7770,83;7778,88;7788,93;7799,98;4407,3614;4423,3533;4427,3529;4433,3528;4525,3537;4550,3387;3414,3522;3421,3519;3463,3478;4653,2649;4648,2646;4592,2609;4550,2584;4407,2500;4294,2479;4239,2456;4143,2400;5162,3991;7552,510;7589,492;5078,2604;5069,2600;5065,2600;5062,2603;5062,2611;5062,2671;6048,1214;6411,2424;6366,2423;9304,2704;9303,2693;9295,2686;9266,2671;8457,1895;8463,1907;8466,1917;8467,1921;8474,1933;8484,1947;8507,1959;8518,1965;8591,4031;8592,4025;8592,3993;8594,3955;8750,3957;2771,1794;2771,1792;2772,1791;2771,1789;2769,1788;2767,1787;2765,1787;2763,1788;2762,1789;2761,1790;2761,1792;2762,1794;2763,1795;2765,1795;2767,1796;2769,1795;5378,2653;5449,2567;5482,2522;5554,2432;5592,2385;5628,2340;5947,3532;5935,3608;7083,382;7101,387;7110,389;7117,391;7123,390;7127,389;7134,387;7140,384;7147,378;9314,3161;9306,3157;9278,3129;9251,3104;9242,3095;9237,3090;9237,3087;9241,3082;9248,3077;9254,3071;9257,3065;9258,3057;527,3277;547,3321;548,3329;549,3338;547,3346;544,3354;539,3360;533,3367;8581,3214;8586,3201;8614,3172;8668,3120;8688,3113;8704,3111;9186,826;7814,1828;8113,1171;8137,1152;7820,2281;7826,2290;7838,2296;7854,2298;7913,2295;7986,2298;8063,2302;8104,2296;8143,2300;7802,1126;7825,1155;7826,1163;7814,21;5031,1748;5008,1735;4948,1698;4922,1682;4913,1676;6028,3175;6029,3183;6033,3192;6038,3200;6042,3206;6062,3222;6149,3294;6156,3297;4114,1380;4108,1375;4108,1370;4108,1367;4111,1365;4114,1362;4119,1360;4130,1357;4155,1350;7246,1778;7197,1798;8963,3007;8964,2941;8960,2926;8961,2899;5348,1084;5344,1081;5339,1078;5332,1075;5327,1073;5319,1071;5312,1069;5306,1066;5297,1061;5281,1051;5266,1043;5246,1031;5232,1023;5223,1018;5211,1011;5200,1004;5180,992;5165,983;5152,975;5144,971;5136,968;5129,965;5119,963;5110,962;5101,961;5091,961;5081,962;5073,964;5065,965;5056,969;5046,974;5038,979;5031,984;5021,989;5016,991;5012,992;5006,993;5001,993;4996,993;4990,991;4983,989;4975,984;7015,3295;7015,3375;7030,3396;7032,3398;7034,3400;7047,3418;7051,3423;7056,3430;7090,3477;7094,3482;7139,3544;7140,3546;7149,3558;7163,3577;7173,3594;7173,3614;4288,1184;4304,1168;4333,1140;4356,1116;4368,1105;4378,1094;4384,1092;8421,1819;8421,1821;8423,1822;8424,1822;8426,1822;8428,1822;8429,1821;8430,1819;8430,1818;8429,1816;8428,1815;8426,1815;8424,1815;8422,1816;8421,1817;8420,1818;5209,1693;5203,1687;5176,1664;5176,1657;3904,2767;3905,2764;3907,2762;3910,2759;3970,2699;3980,2689;3987,2683;3996,2678;4007,2672;5431,1477;5491,1415;5503,1400;5510,1354;5549,1306;5340,1947;5338,1943;5340,1939;5411,1867;3196,2510;3178,2500;3162,2490;3148,2481;3132,2472;3118,2464;2119,3314;2115,3317;2109,3321;2103,3323;2098,3324;2091,3325;2084,3326;2076,3326;2069,3327;2060,3329;2045,3334;7095,2191;7113,2170;7141,2137;7151,2118;7157,2100;7160,2079;7161,2009;5793,1216;4405,3308;4386,3292;4367,3277;4321,3249;4224,3191;4168,3158;8460,2167;8460,2165;8460,2148;4117,1079;4129,1067;4166,1031;4183,1013;4183,1008;4182,993;4183,989;4187,983;4211,963;4225,957;4233,949;4244,939;4310,872;4327,855;8002,2692;8029,2681;8043,2682;8091,2681;8105,2683;8108,2685;3260,2080;3260,2069;3260,2064;3258,2059;3256,2056;3252,2052;3246,2050;3229,2044;3219,2041;3212,2040;3206,2042;3201,2043;3195,2047;3190,2051;3183,2063;7030,2200;7037,2187;7050,2170;7082,2134;7094,2116;7102,2100;7107,2084;7108,2069;7109,2009;6975,2011;6974,1972;9767,1033;9747,1034;9746,1040;9746,1046;9749,1057;9751,1069;9753,1079;9753,1086;9751,1090;9748,1093;9739,1100;9731,1106;9721,1112;9715,1116;9706,1119;7019,1980;7027,1982;7092,1981;5744,610;5743,607;5745,603;5762,587;5770,580;5796,541;5814,524;5822,520;5830,514;5846,505;5851,503;5126,1327;5145,1309;5147,1307;5165,1287;5185,1272;5205,1267;5237,1262;5321,1184;5372,1130;6466,2549;6468,2379;7097,1962;7122,1962;7128,1964;7160,1965;6436,2379;6436,2341;6437,2333;6443,2325;6482,2284;6487,2280;6495,2278;3237,3511;3238,3508;3242,3506;3269,3502;3782,2693;3786,2690;3789,2686;3793,2684;3798,2682;3809,2680;3825,2678;3838,2678;3844,2676;3849,2674;3854,2672;3861,2665;3869,2657;3880,2646;3891,2634;3901,2624;3910,2615;4752,3062;4749,3060;7079,3059;7075,3054;7073,3047;8653,2563;8647,2577;8641,2591;8635,2599;8628,2602;8604,2602;3946,2169;3944,2162;3943,2156;3944,2151;3947,2146;3951,2141;3958,2134;3965,2128;3971,2122;8331,2488;8332,2510;8335,2519;8339,2523;8343,2524;8346,2522;8347,2519;8346,2516;8342,2513;7095,1977;7825,2924;7823,2935;7811,2956;7805,2963;7800,2965;7745,2963;3165,3037;3151,3028;3063,2976;4110,1130;4143,1095;4313,1634;4312,1632;4309,1630;4296,1622;4283,1616;4272,1609;4261,1602;4251,1597;4245,1593;4240,1589;4235,1584;4228,1573;7351,867;7329,884;7300,907;7286,917;7279,921;7272,923;7263,924;7256,923;7248,920;7243,916;7233,909;8600,423;8592,425;8581,425;8568,426;8563,426;8557,428;8538,433;8519,438;8513,439;8507,439;8501,439;8490,440;8484,441;8478,442;8472,444;8462,449;8455,451;8451,452;8446,453;8438,453;8405,453;8357,453;8322,453;8299,452;8290,451;8281,449;7219,1972;7474,571;7475,570;7474,568;7473,567;7471,566;7469,565;7467,566;7466,567;7464,568;7464,570;7464,571;7466,573;7467,574;7470,574;7472,574;7473,573;5940,3232;5968,3218;5974,3218;7158,1069;7157,1077;7157,1081;7157,1085;7152,1099;7149,1105;7147,1112;7144,1125;7143,1139;7143,1153;7144,1161;7145,1169;7148,1179;7153,1195;7157,1202;7161,1210;7166,1218;7171,1225;7186,1240;7194,1248;7208,1259;9138,2900;9149,2896;9162,2893;9206,2896;9233,2899;9249,2899;9278,2898;9298,2894;9345,2893;9386,2898;9407,2898;9468,2900;9472,2901;4828,1030;4833,1027;4838,1026;4844,1024;4850,1023;4856,1023;4861,1022;4865,1023;4870,1023;4875,1024;4881,1023;4885,1021;4888,1018;4889,1016;4890,1014;4891,1010;4891,1005;4893,1001;4900,995;4422,3168;4424,3168;4426,3168;4427,3167;4428,3166;4429,3165;4429,3164;4428,3163;4427,3162;4426,3161;4424,3161;4422,3162;4421,3163;4421,3164;4421,3165;4421,3167;5881,1965;5906,1966;5959,2011;5963,2014;5968,2018;5972,2023;5973,2028;5973,2080;5973,2083;8202,1021;8206,1021;8211,1022;8215,1024;8219,1026;8223,1028;8225,1031;8228,1035;7314,1882;7329,1877;7406,1877;7412,1874;7414,1871;7414,1825;7411,1820;5784,2006;5786,2005;5789,2006;5791,2007;5792,2009;5795,2009;5945,2010;5953,2010;4495,1440;4487,1429;4466,1406;4461,1401;4450,1393;4257,1275;4213,1248;4050,1147;4033,1137;8109,2741;8137,2743;8162,2740;5797,1317;5696,590;5697,589;5698,587;5697,586;5696,584;5694,584;5692,583;5690,584;5689,584;5687,586;5687,587;5687,589;5689,590;5690,591;5692,592;5694,591;4736,3164;4702,3178;4694,3178;4689,3176;4610,3123;4594,3113;4585,3111;6841,2512;6836,2510;6827,2511;6802,2511;6789,2510;6775,2508;6757,2499;6338,1741;6342,1736;6351,1727;6363,1720;6372,1716;6379,1711;6384,1707;6386,1702;6391,1693;6393,1689;6398,1684;6417,1672;6427,1668;6436,1666;6445,1665;6481,1665;6034,337;6030,335;6019,331;6009,331;5994,328;5987,326;5941,303;8426,3315;8515,3266;8624,3267;4267,2799;4272,2793;4274,2788;4276,2783;4276,2779;4275,2775;4274,2771;4270,2765;4265,2760;4257,2755;4239,2745;4223,2734;4206,2724;4192,2716;4165,2701;4145,2688;4131,2679;4119,2673;4105,2668;4091,2664;4064,2662;4051,2662;4041,2662;4034,2663;4025,2666;4017,2668;5877,697;5869,692;5854,683;5842,675;5814,657;5764,625;5747,616;5745,615;5745,614;2301,2732;2297,2731;2292,2731;2288,2729;2283,2726;2279,2722;2274,2720;2267,2718;2261,2717;4358,3028;7530,2044;7485,2051;7075,514;7099,488;7137,450;6142,274;6140,242;5020,2005;5014,2011;5009,2016;5004,2022;4996,2030;4987,2039;4978,2049;4970,2057;4963,2064;4954,2073;4946,2081;4939,2088;4932,2095;4923,2104;7450,2866;4036,2833;4030,2834;4023,2833;4014,2832;4006,2829;3999,2825;3908,2770;2247,2719;2243,2720;2238,2723;2234,2727;2230,2731;2227,2736;2225,2742;2223,2748;2222,2754;2219,2758;2214,2761;7348,2769;7349,2682;7350,2675;7352,2671;7356,2657;7354,2646;7341,2625;6556,1566;6564,1570;6569,1573;6575,1575;6582,1577;6590,1578;6599,1578;6637,1576;6678,1577;6716,1578;6742,1578;6755,1578;5258,2045;5253,2045;5071,1936;7200,2231;7218,2009;5909,1829;5910,1822;5911,1816;5793,1311;5668,1235;5661,1219;5546,1149;2248,4002;2265,3987;2274,3980;2286,3963;2300,3936;2411,3818;2444,3804;2493,3757;2519,3730;2553,3697;5466,1104;5468,1100;5477,1091;5484,1084;5492,1075;5499,1068;5505,1062;5512,1054;8198,1200;8213,1196;8221,1195;8233,1195;7129,3251;6600,2180;6617,2183;6689,2203;6040,676;6052,672;6056,670;6060,668;6065,664;6079,648;9015,3202;9172,3203;8621,3332;8623,3242;8716,3146;8743,3135;5848,2147;5520,2827;5607,2830;9401,3868;9489,3670;9419,3670;6062,636;6049,629;7915,2986;7933,2943;7934,2917;7892,2807;7886,2789;7879,2779;4018,1181;4018,1179;4019,1177;4078,1119;4081,1117;4084,1116;4523,904;4525,899;4527,894;4527,889;4525,884;4523,880;4517,876;7193,1461;7158,1461;7132,1461;7128,1460;7126,1458;7119,1446;7108,1429;7099,1415;2456,2999;2442,2998;2431,2996;2419,2994;2411,2991;2403,2988;2395,2984;2383,2977;2373,2971;2361,2964;2345,2955;2328,2944;2316,2937;2303,2930;2291,2922;2280,2916;2271,2911;2259,2907;2245,2903;5741,4043;5707,4041;5681,4041;5647,4043;5635,4043;5901,745;5903,746;5905,746;5907,746;5909,745;5910,743;5911,742;5910,740;5909,739;5907,738;5905,737;5903,738;5901,739;5900,740;5899,742;5900,743;6203,2621;6216,2623;6275,2631;6278,2635;6286,2639;6375,2640;6454,2639;6461,2637;6465,2631;6465,2603;6471,1627;6481,1620;6486,1619;6493,1620;6505,1619;6512,1620;6517,1621;6560,1620;6589,1621;6601,1621;6627,1621;6636,1620;6643,1619;6655,1618;6669,1618;6679,1618;6692,1618;6714,1618;6720,1619;6724,1621;6726,1622;6728,1624;6731,1626;6731,1631;6732,1652;6732,1668;6732,1690;6731,1696;6732,1714;6731,1730;6731,1753;4052,1930;4067,1915;9946,3678;9745,3675;9644,3674;4095,3116;4069,3101;4050,3093;2680,3110;2678,3102;2676,3096;2674,3092;2671,3089;2654,3079;2641,3071;2617,3057;2600,3048;2553,3019;2546,3015;2537,3011;2526,3007;2515,3004;2505,3002;2494,3000;4075,859;4084,848;4089,844;4147,787;8145,2469;8144,2412;8741,3441;8759,3433;8763,3433;8786,3436;8821,3437;8826,3435;8855,3404;8868,3395;8875,3393;8882,3392;8887,3390;8891,3390;8894,3392;8898,3397;8899,3401;8899,3404;8897,3406;8893,3406;8891,3405;8888,3403;5036,2735;5613,1778;5633,1756;5289,1738;5287,1731;5525,3746;6396,1773;6396,1765;6397,1757;6398,1753;6402,1750;6406,1747;6412,1743;6422,1734;6435,1717;6439,1713;6442,1711;6446,1709;6451,1709;6470,1709;6480,1709;4981,4055;4542,4011;8620,2706;8618,2667;8616,2658;8610,2653;8603,2652;8370,2651;6063,2917;6065,2920;6064,2925;6061,2928;6036,2939;6022,2940;6003,2940;5997,2939;4745,2923;8675,2701;8653,2699;8645,2700;8633,2704;8378,2703;8373,2701;8369,2695;164,3370;150,3357;115,3322;64,3272;6,3213;6161,3297;6169,3294;6304,3241;6309,3238;6309,3235;6310,3231;3351,2206;3342,2201;3330,2194;3307,2181;3289,2170;3280,2164;3272,2159;3263,2154;3568,2374;3552,2363;3538,2355;3525,2347;3511,2339;3501,2332;3490,2326;3478,2318;3464,2310;8018,3122;7983,3120;7967,3125;7958,3134;7955,3208;7959,3217;7968,3224;7982,3227;8015,3226;6017,609;6018,608;6018,606;6017,604;6016,603;6014,602;6012,602;6009,603;6008,604;6007,605;6006,607;6007,609;6009,610;6011,611;6013,611;6015,611;6324,1983;6390,1947;6404,1939;6431,1925;6442,1919;6447,1917;6451,1913;6453,1907;6454,1901;1083,3333;1080,3334;1077,3335;1076,3337;7212,2856;4465,2284;2236,2901;2226,2900;2215,2900;2204,2901;2193,2902;2184,2904;2171,2908;2160,2912;2150,2916;2141,2920;2127,2925;2116,2929;2105,2934;2092,2937;2084,2939;2069,2940;2057,2941;2048,2940;2039,2939;2027,2936;2019,2933;2008,2929;1996,2923;1986,2917;1977,2911;1969,2906;1960,2901;5938,1820;5948,1822;5957,1822;5963,1822;5975,1820;5988,1817;6001,1815;6045,1815;7126,829;7121,838;7118,846;7117,854;7114,873;7883,1461;7886,1460;3248,3370;5475,331;1552,3427;1601,3398;1610,3393;3248,3222;3247,3215;5613,4102;5620,4060;5623,4053;5629,4048;5639,4022;5652,3968;6539,2717;6528,2726;6523,2728;6519,2726;6519,2725;6519,2721;6533,2711;3029,1864;3038,1847;3046,1832;3053,1822;3057,1817;3070,1806;3079,1801;3088,1796;3099,1791;3108,1786;3119,1781;3129,1775;3136,1771;3143,1767;3179,1738;5608,2772;5678,2682;5714,2636;5787,2544;5823,2499;5859,2453;5993,2287;3998,3070;3936,3133;3913,3153;3836,3190;3800,3208;3784,3215;3770,3220;3758,3223;3747,3225;3735,3226;3720,3226;3702,3224;3678,3218;3425,3154;3382,3144;3362,3139;3271,3117;3232,3107;3210,3101;3193,3097;3173,3093;3156,3089;3136,3086;3114,3083;3093,3081;3072,3079;3060,3078;3030,3078;3012,3078;2974,3079;2952,3080;2781,3104;2713,3115;2698,3117;4484,1976;4404,2057;4398,2060;3160,2982;3165,2977;3172,2970;3179,2965;3185,2960;3191,2957;3196,2952;3199,2948;3202,2942;3203,2936;3203,2930;3201,2925;3193,2912;3190,2906;3189,2901;3190,2877;1609,3090;1605,3086;1601,3082;1600,3078;1600,3075;1598,3071;1595,3066;1582,3055;1578,3051;1575,3048;1571,3045;3723,2658;3731,2650;3748,2633;3760,2622;3767,2613;3806,2574;3863,2516;4096,1957;4104,1949;4112,1940;4124,1929;4138,1913;4149,1903;4158,1893;4167,1884;4175,1876;4183,1868;4190,1861;4194,1859;4199,1858;4203,1859;4208,1860;4223,1870;4234,1876;6227,1551;6240,1540;6245,1538;6250,1536;6257,1534;6266,1533;6314,1533;6342,1533;6422,1533;6466,1532;6481,1532;4015,2110;4025,2102;4038,2089;4044,2082;4052,2074;4060,2065;4079,2046;4090,2035;4099,2026;4115,2009;4127,1997;4134,1989;7187,1682;7126,1708;9364,2682;9364,2680;9363,2678;9362,2677;9360,2676;9358,2676;9356,2677;9354,2678;9353,2679;9353,2681;9353,2683;9355,2684;9357,2685;9359,2685;9361,2684;9363,2683;5300,328;5280,315;5257,300;5253,294;5251,288;5251,282;5254,275;5270,260;5493,1979;5485,1976;5477,1972;5433,1945;6837,346;6841,346;6845,347;6861,356;6863,358;6867,363;6869,366;6869,370;6868,375;6864,386;6862,392;6861,398;6861,404;6860,410;6863,425;6862,429;6860,432;6852,438;6834,448;6826,451;8416,1931;8384,1934;8376,1934;8367,1932;2777,2213;2775,2218;2770,2229;2770,2235;2772,2240;2774,2244;2777,2248;2783,2252;2789,2256;6666,900;6674,902;6685,906;4597,2884;4594,2887;4558,2922;4500,2888;4535,2853;8089,3140;8095,3128;8095,3121;8091,3116;8079,3109;8069,3104;8059,3099;8054,3093;8050,3087;8049,3076;8041,3068;8029,3064;8017,3067;8011,3073;8006,3081;8007,3090;8017,3101;8017,3156;8016,3241;8027,3250;8037,3253;8061,3253;8119,3267;8126,3268;8173,3280;8197,3288;8220,3295;8273,3310;8288,3320;8328,3364;8342,3375;8354,3380;8376,3386;8398,3385;8423,3377;8459,3353;4333,1767;4327,1764;4278,1734;4240,1711;4221,1701;4214,1696;4208,1690;4202,1684;4195,1678;5285,1927;5288,1919;5366,1841;6081,3208;6090,3204;6103,3199;9421,1201;9420,1187;9418,1175;9416,1164;9413,1154;9407,1137;9402,1127;9397,1118;9392,1108;9386,1100;9381,1093;9376,1086;9370,1078;9324,1032;3433,3146;3441,3138;3450,3129;3458,3120;3468,3110;3478,3100;3488,3089;3504,3074;5464,2752;5493,2712;5563,2627;5598,2579;5672,2489;5709,2442;5743,2396;5847,2267;5875,2230;8689,2385;8688,2354;8688,2314;2857,1739;2850,1740;2842,1741;2834,1742;2828,1744;2823,1746;2818,1748;2812,1749;2797,1750;9404,957;9459,954;4282,1841;4318,1805;4321,1802;4324,1796;4325,1790;4326,1788;4329,1778;4331,1771;4336,1764;4340,1760;4347,1752;4357,1742;4368,1732;4378,1721;4391,1709;4400,1698;4411,1688;4431,1667;4436,1662;4441,1656;8263,2843;8263,2827;8263,2788;8264,2721;8270,2691;8272,2684;8267,2663;8265,2639;8271,2613;8272,2593;7244,2163;7269,2269;7264,2258;7257,2252;7402,2019;7436,2008;7528,2009;7555,2008;4538,3079;7024,2711;7041,2712;7056,2712;7059,2707;7086,2704;7117,2707;7120,2709;7121,2714;7118,2717;7108,2718;7059,2716;9618,3642;9612,3644;5310,2313;5338,2326;5369,2340;5438,2373;5496,2403;5728,2516;5846,2573;5904,2601;7620,415;5538,625;5533,625;5529,625;5521,623;5517,621;5499,610;5471,593;5446,579;5397,550;5394,548;5392,545;5390,544;5390,542;6387,994;6378,1014;6357,1076;6346,1089;6337,1096;6333,1097;6328,1099;6322,1099;6313,1099;6299,1093;6240,1058;6196,1033;6193,1030;7377,974;7367,966;7354,952;7353,949;6045,1806;6045,1799;6045,1792;6046,1787;6048,1783;6053,1781;6059,1780;6066,1779;6523,2595;6615,2591;6637,2587;9539,3381;9519,3384;9505,3389;9495,3397;9481,3406;9469,3415;9461,3422;9444,3434;9433,3440;9420,3440;9058,2427;9023,2425;8972,2425;8956,2418;8946,2407;8945,2394;8948,2308;8944,2303;5573,1563;5502,1521;5266,1378;4950,1189;6744,372;6749,370;6757,367;6763,362;6766,359;6769,354;6771,349;6774,344;6780,333;6806,304;6810,301;6815,298;6822,296;6835,296;6844,298;6861,302;6944,324;5871,898;5868,895;5861,892;5846,883;2909,2283;2903,2288;2896,2294;2891,2299;2878,2312;6227,993;6229,993;6231,993;6232,992;6233,990;6234,989;6233,987;6232,986;6230,985;6228,985;6226,986;6225,987;6224,988;6224,989;6224,991;6225,992;2864,2249;2858,2259;2848,2275;2844,2280;2835,2289;6196,1490;6205,1492;6221,1495;6226,1494;6238,1493;6245,1491;6251,1490;6259,1489;6287,1489;6481,1488;7692,1744;8502,1832;8476,1841;8474,1842;8449,1857;8439,1861;8427,1864;8417,1866;8397,1867;8388,1867;8382,1865;8377,1864;8374,1862;8370,1859;8367,1855;8366,1851;8365,1848;8365,1844;8367,1841;6679,1611;6678,1595;6679,1587;6676,1543;6676,1531;6676,1520;6676,1514;6678,1496;6677,1489;6675,1484;6670,1480;6664,1474;6657,1467;6652,1461;6647,1454;6643,1447;6640,1441;6638,1434;6638,1426;6550,1208;6548,1206;6548,1203;6550,1035;8554,2117;8554,2118;8556,2119;8557,2119;8559,2119;8561,2119;8562,2118;8563,2117;8563,2115;8562,2114;8561,2113;8559,2113;8558,2113;8556,2113;8555,2114;8554,2115;6306,3307;6324,3320;6338,3341;6360,3402;6359,3429;6357,3447;6363,3477;8643,2991;8623,2968;8600,2940;8583,2912;4757,451;4761,450;4766,450;4770,452;4774,454;4813,477;4818,481;4821,485;4823,489;4824,492;4820,498;4796,522;4789,527;6459,3237;6239,1783;6249,1776;6252,1776;6284,1776;6709,1237;6717,1239;6727,1241;6736,1242;6745,1244;6759,1243;6789,1242;6798,1242;6808,1243;6817,1243;6828,1243;6839,1241;6850,1240;8056,3157;8064,3156;8075,3154;8082,3148;4584,1742;4589,1736;4677,1650;4680,1648;3340,2811;3354,2804;3364,2798;3372,2794;3379,2790;6966,2873;5335,4005;5332,3998;6187,3374;6196,3350;6206,3337;6233,3320;6270,3303;6282,3303;6286,3303;5053,963;5050,958;5049,953;5050,948;5052,942;5057,937;5064,931;5079,916;5089,906;3148,1999;3145,2003;3145,2006;3148,2009;3152,2013;3155,2017;3158,2022;3159,2026;3159,2031;3152,2040;3149,2043;3145,2046;5514,596;6408,3541;6426,3508;6434,3498;6450,3489;6454,3487;5300,1343;6785,1368;6785,1345;6786,1341;6788,1337;6790,1333;6794,1331;6799,1328;6806,1327;6896,1327;6902,1327;6909,1329;6913,1330;6917,1333;6920,1337;6927,1347;6934,1357;6935,1361;6936,1365;6936,1369;5684,272;5703,250;5706,245;5709,240;5710,234;5712,229;5717,223;5722,218;5727,210;5735,200;5740,194;9129,2838;9140,2840;9163,2829;9165,2822;9167,2804;9172,2792;9179,2783;9189,2775;9201,2767;9215,2762;9228,2760;9236,2759;9262,2759;9283,2759;9292,2761;9298,2764;9304,2769;4671,2089;4676,2084;4685,2075;4693,2068;4701,2059;4709,2051;4171,2296;4173,2297;4175,2297;4177,2297;4178,2296;4179,2295;4180,2293;4179,2292;4178,2291;4176,2290;4174,2289;4172,2290;4171,2291;4170,2292;4169,2294;4170,2295;2906,2220;2896,2215;2880,2205;2870,2198;5574,3850;5572,3844;5581,3800;5585,3796;4062,1449;4035,1433;3957,1385;3951,1382;3916,1360;3898,1350;3892,1347;3885,1344;3857,1340;3848,1341;3812,1347;3759,1356;3736,1359;3723,1360;3713,1359;3701,1357;3692,1355;3683,1351;3676,1347;3613,1306;6210,3416;6241,3490;7583,1716;7584,1625;6093,2758;6109,2762;6129,2766;6149,2767;6521,2768;6559,2768;6716,2768;6966,2769;7024,2769;7465,2769;7466,2769;7506,2769;7587,2770;7612,2770;7239,2726;7277,2726;7285,2725;7290,2722;7292,2716;7293,2675;4750,749;4748,710;4747,686;4745,683;4741,678;3435,1341;3382,1309;5263,2043;5311,1983;5313,1980;8553,3807;8590,3807;8606,3804;8656,3805;8747,3806;5959,2005;5959,1983;5960,1974;5961,1966;6460,2940;6492,2940;6508,2942;6519,2942;6702,2942;6709,2940;6712,2937;6714,2932;8509,4030;8744,4033;4829,2381;4727,2322;4663,2283;4633,2256;4561,2215;4364,2106;8045,2948;8041,2966;9695,317;9669,318;9649,319;9643,321;9638,325;9635,328;9632,332;9628,339;9623,351;9622,358;9619,369;5381,4101;5397,4006;5400,3999;5404,3994;5478,3922;5483,3915;5545,1634;5509,1612;2297,3020;2297,3011;2297,3006;2292,3001;2259,2984;9418,2554;9385,2554;3669,1842;3631,1882;3624,1889;7238,272;7217,293;2295,3044;2293,3058;2292,3072;2289,3091;2289,3101;5495,469;5509,452;5534,427;5540,414;5540,408;5541,402;5543,397;5546,393;5554,381;5562,372;3439,2117;3412,2146;7083,639;7121,643;7126,643;7132,642;7137,640;7142,638;7146,634;7151,630;7164,611;7177,595;7189,578;7204,559;7208,556;7211,554;7216,553;6374,1270;6379,1270;6401,1270;6460,1271;6504,1271;6512,1271;6518,1270;6523,1269;6528,1267;6534,1264;3660,3667;3683,3679;9905,3715;9878,3715;9338,3711;9320,3713;9310,3714;9298,3717;9287,3721;9278,3728;9265,3743;9257,3750;9249,3752;9237,3754;9227,3755;3518,1993;3535,1976;3556,1955;3606,1906;3612,1900;6070,1962;6072,1958;6074,1815;2827,1650;2806,1665;2801,1667;2785,1674;2773,1679;2764,1680;2759,1681;2733,1684;2704,1684;2667,1674;2622,1647;2530,1590;2508,1577;2496,1570;2483,1565;2468,1560;2452,1558;2430,1558;2385,1555;2255,1545;2249,1545;2148,1537;2081,1532;2061,1531;2050,1531;2037,1532;2025,1534;2008,1538;1991,1543;1977,1549;9518,2482;9478,2403;7275,3579;6111,2097;6105,2099;6097,2100;6089,2102;6080,2103;6071,2104;6063,2105;6055,2105;6046,2105;8982,3778;8965,3788;8955,3788;8943,3784;8837,3730;8797,3712;8764,3703;8718,3699;8606,3700;8355,3698;8327,3700;8299,3708;8246,3739;8225,3746;8209,3747;8191,3746;8140,3742;8116,3738;8080,3727;8038,3703;8025,3699;7997,3692;7948,3685;7941,3685;7891,3683;7592,3675;7367,3668;7260,3662;6991,3638;6834,3624;6808,3627;6784,3634;6749,3653;3287,2216;3276,2216;3266,2217;3257,2219;3248,2221;3240,2224;3233,2227;3227,2231;3221,2235;3215,2239;3208,2247;3201,2255;3195,2261;7916,2138;7956,2152;8010,2158;5027,2306;4937,2250;4908,2233;4805,2168;4784,2157;4749,2136;4539,2009;4529,2004;4513,1994;4468,1967;4422,1938;4368,1906;4316,1876;4303,1867;4291,1860;4164,1782;4073,1726;4039,1707;3990,1675;3881,1611;3811,1568;3671,1483;3666,1480;3652,1471;3578,1427;3420,1339;3403,1337;3386,1337;3372,1339;3357,1343;3346,1348;3322,1362;3303,1372;3296,1374;3276,1378;3255,1377;3253,1377;3234,1372;3210,1363;3105,1323;3054,1316;3022,1319;2992,1329;2968,1343;2920,1389;2899,1418;2887,1460;2856,1611;2845,1631;5772,2901;5760,2927;5755,2942;5752,2954;5751,2970;5753,2985;5759,3003;5768,3018;5896,3177;6021,3333;6042,3359;6049,3368;6078,3405;6169,3518;6990,983;6992,982;6993,981;6993,979;6993,978;6992,976;6990,976;6988,976;6986,976;6985,977;6984,978;6984,980;6984,981;6985,982;6987,983;6989,983;2942,2054;2948,2065;2963,2094;2967,2100;2969,2107;6548,3795;6591,3774;6775,3682;7634,2599;7276,1825;7289,1820;7299,1818;7406,1818;4194,1017;4202,1022;8738,4071;8738,4076;8737,4082;8743,4097;8745,4101;7543,3070;7543,3029;3287,2392;3265,2379;3246,2367;3226,2356;3201,2341;3180,2330;3160,2318;3142,2307;3128,2298;3102,2283;3074,2266;5621,3498;5578,3748;5413,1075;5408,1075;5404,1074;5399,1071;5385,1063;5374,1057;5361,1049;5348,1041;5329,1030;5309,1018;5290,1007;5271,995;5252,984;5234,973;5215,962;5199,952;5171,937;5162,934;5154,931;5146,929;5127,926;5120,924;5112,921;5103,915;5064,892;2528,2906;2524,2901;2521,2897;2518,2891;2517,2885;2516,2879;2516,2867;2516,2857;2516,2850;2515,2846;2512,2842;2506,2839;2498,2834;2491,2829;2486,2827;2481,2826;2476,2826;2472,2829;2466,2834;2457,2840;3460,3548;7911,1140;7910,1134;7899,1127;7891,1121;7885,1116;7880,1111;7875,1106;7866,1095;9939,111;9942,118;9945,122;9947,132;9950,145;9952,160;9953,171;9955,183;9956,189;9959,191;9961,192;9964,192;5720,3961;5724,3973;5775,3329;5775,3328;5774,3327;5772,3326;5770,3325;5768,3326;5766,3326;5765,3328;5765,3329;5765,3331;5766,3332;5768,3333;5770,3333;5772,3333;5773,3332;5775,3331;4086,2909;4076,2911;4067,2912;4060,2913;4055,2912;4051,2909;4041,2904;4031,2897;4020,2891;7984,2467;7983,2404;7991,2380;7985,2329;5742,3998;5746,4007;5745,4018;5737,4057;5734,4064;5725,4071;5697,4086;3686,2788;3683,2788;3680,2788;3677,2787;3670,2782;3660,2775;3616,2750;3611,2747;3604,2746;3576,2739;3571,2736;3554,2726;3462,2671;3455,2666;3448,2660;3444,2655;3436,2645;3427,2628;3423,2619;3419,2611;4339,2292;4356,2274;9126,1965;9128,1965;9129,1964;9131,1964;9132,1962;9132,1961;9131,1960;9130,1958;9128,1958;9127,1958;9125,1958;9123,1959;9123,1960;9122,1962;9123,1963;9124,1964;6985,3378;6976,3374;6965,3370;6916,3370;6863,3370;6802,3369;6790,3369;5881,1682;5910,1652;5938,1621;6028,1553;6089,1510;7110,1361;7120,1368;7144,1381;7168,1391;7170,1394;7434,1157;7436,1158;7438,1158;7440,1158;7441,1157;7442,1156;7442,1154;7442,1152;7441,1151;7439,1150;7437,1150;7435,1151;7433,1152;7432,1153;7432,1155;7432,1156;5934,710;5936,711;5938,711;5941,711;5942,709;5943,708;5943,706;5943,705;5941,704;5939,703;5937,703;5935,703;5934,704;5933,706;5932,707;5933,709;5256,1150;5240,1144;5226,1135;5213,1127;5206,1124;5199,1124;8866,2898;8803,2899;8760,2921;8744,2929;8734,2939;5561,1801;5023,1152;6413,3394;6455,3391;7031,1442;7053,1433;7072,1426;7106,1412;7112,1411;7118,1411;7132,1411;7162,1411;7192,1411;7221,1412;4000,1665;4050,1659;4064,1655;4088,1645;4125,1625;4272,1551;4399,1487;4425,1474;4505,1435;4519,1428;4537,1419;4561,1406;4602,1379;4622,1363;4639,1345;4653,1329;4660,1321;4728,1243;4734,1236;4740,1229;4749,1219;4781,1181;4794,1165;4799,1159;4810,1146;4815,1142;4835,1120;4840,1114;4847,1107;4872,1083;4910,1044;5160,797;5230,727;5234,723;5350,524;5371,494;5428,434;5556,294;5589,253;5629,202;5804,2;4027,1307;3989,1317;3978,1319;3967,1320;3957,1320;3949,1319;3940,1317;3930,1313;3920,1309;3911,1304;8800,2014;8827,2041;8842,2054;8848,2057;8860,2057;8877,2050;8885,2047;8899,2040;8950,2016;8952,2015;8958,2013;8975,2013;8986,2013;9010,2016;9033,2019;9061,2017;6117,1622;6096,1609;6063,1589;6051,1580;6004,1536;5973,1525;5947,1517;5925,1507;5905,1494;5879,1472;5850,1442;5825,1428;8720,540;8727,536;8734,533;8740,528;8746,523;8753,517;8764,507;8768,506;8779,505;8787,505;8798,503;8805,502;8818,502;8829,502;8841,502;8850,502;8872,501;8882,501;8894,502;8904,503;8922,505;6696,1194;6705,1194;6713,1195;6720,1196;6728,1198;6738,1200;6747,1201;6753,1202;6761,1202;6770,1201;6783,1201;6793,1201;6802,1201;6815,1201;6823,1201;6828,1200;3143,1893;3145,1905;3148,1915;3151,1924;3154,1930;3158,1935;3162,1939;3173,1948;3196,1964;3201,1965;5242,2138;5227,2130;5216,2123;5199,2113;5182,2103;5168,2094;5151,2084;5139,2077;5129,2071;5473,3693;1275,3305;1281,3306;1321,3311;8798,1879;8792,1849;8793,1838;8795,1833;8808,1826;8832,1826;8848,1827;8858,1831;8861,1835;8869,1863;9362,3328;9358,3313;9358,3273;9360,3256;9373,3229;9386,3213;9480,3095;9471,3040;1006,3728;990,3720;972,3713;961,3709;954,3703;954,3696;959,3690;6826,2856;6247,4098;6390,3699;6423,3653;6940,2155;6951,2137;6968,2116;6988,2094;6999,2080;7002,2074;7003,2068;1596,3392;1592,3388;1588,3382;1587,3377;1583,3370;1576,3363;1571,3360;1559,3355;6360,2506;3418,3566;3432,3561;3443,3560;3454,3562;3475,3572;3499,3586;3526,3602;3532,3608;3535,3628;9420,2590;9440,2591;9457,2590;9470,2592;9477,2592;9494,2588;9518,2582;5213,3733;4703,1813;4713,1803;4835,1681;4867,1649;2828,4100;2803,4086;4312,3002;7041,1100;7045,1099;7054,1097;7064,1094;7073,1091;7092,1083;7099,1081;7106,1079;7130,1072;7138,1071;7147,1069;7153,1069;7166,1070;7171,1071;7175,1073;7190,1080;7203,1088;7206,1090;8472,2966;8498,2956;8522,2938;8532,2929;8633,2894;1220,3412;1226,3405;1232,3399;1247,3388;1276,3370;1286,3364;1295,3358;1306,3352;1313,3344;1317,3338;1318,3331;1320,3317;5727,1412;5714,1408;5684,1386;6258,1039;6264,1030;6280,998;6293,983;4910,3387;4910,3361;4910,3333;4913,3322;4922,3291;4923,3282;4924,3276;4927,3251;4930,3231;4932,3213;4932,3210;4932,3173;4932,3169;4930,3163;4928,3153;4921,3130;4917,3121;4917,3112;4920,3099;4923,3095;7679,990;7665,1010;7637,1042;7633,1047;7632,1052;7631,1056;7631,1057;7632,1063;7636,1069;7645,1080;7682,1124;6962,2305;6958,2325;5779,984;5765,982;5753,980;5748,979;5741,975;5731,969;5719,962;5708,955;5699,950;5689,944;5685,941;5684,937;8168,4068;8176,4067;8189,4066;8222,4066;8276,4067;8283,4066;8388,4067;8492,4068;8769,4072;8803,4073;8879,4074;8900,4074;8927,4075;8948,4075;8961,4075;8968,4079;8972,4082;4859,1301;4779,1252;4752,1236;5110,1466;5098,1472;5085,1480;5075,1478;4315,2891;4317,2894;8000,1531;7987,1336;7987,1306;5237,3148;5016,3149;7004,1400;7015,1396;7040,1385;7051,1381;347,3012;411,2974;424,2966;523,2908;529,2903;533,2898;536,2890;560,2822;4483,1361;7691,2607;7689,2599;8222,4087;6221,1561;6226,1564;6231,1567;6239,1570;6247,1573;6255,1575;6261,1577;6267,1578;6273,1578;6285,1578;6320,1576;6340,1577;6354,1576;6384,1577;6439,1576;6456,1576;6481,1576;6490,1576;6499,1578;6507,1578;6515,1578;6524,1577;6530,1575;6542,1569;6547,1566;5278,3712;5268,3714;5215,3709;9394,2629;9414,2630;1801,3440;1801,3445;1799,3456;1799,3461;1801,3465;1802,3470;4716,1236;4660,1199;4612,1169;4582,1149;4517,1109;4508,1104;4500,1099;4459,1078;4441,1069;4425,1059;4391,1037;4370,1021;4363,1014;4359,1009;4349,1002;4333,993;4317,983;4299,973;4281,961;4216,922;4157,886;4133,871;4108,856;9691,3428;9652,3427;9643,3427;9640,3424;9640,3420;9642,3418;9653,3417;9686,3417;9689,3419;6733,2310;5494,678;5489,675;5483,672;5478,672;5473,672;5467,673;5462,674;5458,677;7078,876;7086,876;7096,875;7107,873;4586,927;5240,2623;5330,2510;5367,2463;5474,2327;5512,2282;5546,2238;5595,2177;9099,3117;9100,3063;9098,3058;9095,3054;4527,2620;4494,2610;4390,2540;3303,2186;3298,2191;3294,2196;3290,2200;3288,2205;3287,2210;3289,2225;3289,2238;3290,2249;6791,1430;6789,1434;6789,1438;6795,1463;6797,1468;6800,1472;6802,1475;6806,1477;6811,1479;6817,1480;6873,1480;6915,1480;6956,1481;6962,1481;6966,1480;6972,1477;6977,1474;6979,1469;6980,1464;9818,3130;9761,3146;9630,3212;9546,3257;9428,3275;9304,3273;9171,3272;9014,3270;8959,3270;3634,3410;3637,3403;3637,3399;3634,3394;3485,3305;3475,3305;3468,3307;5482,1541;5494,1571;5508,1557;2862,1842;2863,1843;2864,1844;2866,1844;2868,1844;2870,1844;2871,1843;2872,1841;2871,1840;2871,1838;2869,1837;2867,1837;2866,1837;2864,1838;2863,1839;2862,1840;7531,1600;7493,900;7494,901;7495,903;7497,903;7499,904;7501,903;7503,902;7504,901;7504,899;7503,897;7502,896;7500,895;7498,895;7496,896;7494,897;7493,898;4045,2505;4043,2512;5808,519;5788,504;5777,496;5761,486;5736,473;5700,454;5667,435;5646,422;5624,408;5607,396;5594,388;5581,382;2153,3018;2126,3002;2120,2999;2114,2997;2108,2997;2102,2997;2096,2999;2090,3001;2084,3003;2078,3003;2075,3003;7561,923;7564,929;7568,937;7572,945;7574,951;7577,958;7581,964;7586,970;7597,977;7612,985;7641,999;7711,1032;7717,1035;7722,1038;7727,1043;1790,1667;1758,1688;1625,1809;1360,1999;1256,2064;1174,2109;1159,2118;4651,2421;4520,2344;4505,2329;6481,1567;6481,1515;6482,1461;6480,1456;6478,1451;6474,1448;6748,2058;6841,2058;6871,2059;6894,2061;6971,2056;6990,2056;6998,2058;7002,2062;3702,1297;3704,1297;3706,1297;3708,1297;3709,1296;3710,1294;3710,1293;3709,1291;3708,1290;3706,1290;3704,1289;3702,1290;3701,1291;3700,1292;3700,1294;3701,1295;4884,1361;4953,1275;6546,1506;6554,1508;6562,1511;6569,1515;6578,1523;6584,1528;6590,1532;6597,1535;6603,1536;6610,1537;6617,1537;3018,3256;3016,3261;3017,3266;3049,3285;3056,3286;3062,3283;6834,2285;6836,2278;9518,2701;9523,2705;9529,2706;9642,2703;9653,2705;9660,2709;9666,2713;9672,2721;9681,2740;9693,2773;9696,2785;6583,815;6577,808;6572,802;6566,798;6561,794;6554,789;6548,784;4725,628;4728,629;4732,630;4737,631;4758,633;4779,635;4792,635;4808,634;4832,634;4855,633;4874,633;4897,633;4905,632;4921,628;4929,625;4942,620;4949,616;4957,612;4975,603;4990,594;5014,573;7503,2360;7511,2353;7593,2306;5220,2410;5201,2406;5177,2398;5160,2390;5155,2387;5142,2379;9185,2706;9185,2664;9596,4099;9634,4076;9663,4031;9695,3983;9695,3826;9696,3813;9695,3803;9684,3796;613,4041;577,4006;569,3996;567,3986;566,3978;567,3966;569,3955;573,3943;580,3931;591,3922;606,3915;622,3909;643,3904;666,3907;686,3911;705,3919;760,3947;776,3955;791,3958;804,3957;1633,3509;1700,3468;1729,3451;1744,3446;1753,3443;1769,3440;1777,3439;1785,3439;1792,3439;1809,3441;1818,3442;1825,3443;1830,3442;1835,3441;1841,3438;1848,3433;1921,3388;834,3941;856,3929;865,3921;4171,2646;4205,2603;4111,2254;4096,2245;4080,2236;4065,2227;4051,2218;4035,2209;4019,2199;4002,2189;3987,2179;3977,2174;3966,2170;3956,2168;5218,3671;5147,3664;5134,3664;5119,3665;5110,3664;6703,656;6696,654;6690,654;6684,655;6679,656;6669,658;5731,4098;5730,4095;5725,4093;5703,4090;6141,2717;6161,2722;6175,2722;6191,2719;6228,2710;6250,2708;6272,2708;4180,1534;4183,1540;4186,1544;4189,1547;4192,1550;4199,1553;7553,2383;7667,2383;6297,3124;6338,3106;6349,3104;6362,3105;6418,3117;6433,3115;6444,3111;6623,3415;6624,3376;6625,3314;5201,2607;5197,2603;5197,2598;5199,2593;5208,2582;4416,1422;4411,1422;4406,1420;4401,1417;5560,2729;5620,2653;5656,2607;5764,2470;5800,2424;5907,2289;5945,2240;6541,165;5814,763;5835,741;5846,730;5861,715;6065,861;6074,847;6077,833;6077,789;6078,785;6079,780;6082,777;6085,772;6900,1171;6909,1185;6912,1187;6917,1188;6940,1188;6958,1188;6976,1189;7002,1189;7013,1189;7023,1189;7028,1188;7034,1187;6653,2533;6646,2530;6645,2517;6645,2475;6650,2461;7614,3029;4123,2243;4132,2235;4136,2226;4134,2218;4129,2209;4114,2201;4101,2193;4083,2182;4062,2170;4041,2157;4032,2154;4023,2153;4015,2155;4008,2159;3998,2168;3771,2628;3779,2633;3785,2635;3790,2636;3796,2636;3803,2635;3815,2633;3820,2631;3825,2628;3834,2618;3855,2596;3873,2578;3876,2575;3881,2574;3886,2573;3902,2576;5974,3798;5997,3659;7484,2319;7515,2300;7519,2296;7517,2289;7489,2250;9091,742;9106,730;9111,726;9120,722;9129,718;9138,715;9147,714;5484,3264;5503,3267;5516,3267;5470,2015;5472,2014;5504,1961;5505,1954;8033,2636;8101,2636;8109,2634;9395,2455;9397,2423;9360,2367;9349,2350;9338,2330;9351,2248;9352,2200;9352,2177;7554,2552;7654,2553;7702,2554;7710,2550;8048,1359;8161,1341;4542,1020;4528,1010;4509,998;4496,990;4478,978;4475,977;4391,2059;4317,2015;8432,1751;8409,1766;8343,1791;7905,2165;7900,2187;7906,2196;7922,2200;7982,2202;8076,2206;4529,510;4542,516;4548,521;4559,529;6461,773;6456,750;6454,744;6451,736;6447,721;6445,712;6443,707;6440,704;6436,702;9014,3244;9015,3159;9015,3115;9015,3091;9016,3056;9016,3055;9016,3007;9017,2998;9019,2991;9033,2967;9036,2960;9036,2947;9455,3003;9459,3007;9465,3009;9474,3010;9485,3010;5232,1186;5219,1178;5205,1169;5183,1156;5178,1152;5176,1146;5180,1139;5186,1133;5193,1127;1619,3299;1587,3267;1586,3264;7576,2598;4420,944;4419,941;4416,938;4275,849;4243,828;4236,824;4226,820;4215,815;4193,808;4183,804;4172,800;4163,796;4156,792;3561,1703;3550,1716;3545,1720;3541,1722;3538,1723;3535,1722;3531,1719;3523,1714;3512,1708;3504,1703;3502,1700;3500,1698;3497,1695;3495,1695;3493,1694;3489,1694;3481,1689;3455,1674;3448,1669;3446,1665;3447,1659;3451,1654;3454,1653;3462,1648;3468,1644;3473,1640;5886,3429;5900,3428;5907,3423;5917,3414;5938,3386;5943,3383;5959,3377;5971,3375;5980,3374;5988,3374;5992,3374;6003,3373;6017,3368;3024,1691;3017,1688;3011,1684;3004,1680;2998,1677;2991,1675;4043,1486;4015,1471;3981,1450;3957,1435;3922,1413;9695,3521;6589,190;6624,198;6626,199;6628,200;6631,202;6633,205;6633,206;6633,209;6628,235;7330,1700;4125,3014;4114,3009;4102,3002;4088,2993;4074,2986;4063,2979;4055,2972;4045,2964;4039,2958;4032,2952;4025,2948;4018,2943;4007,2936;3997,2931;3987,2925;8181,2539;8186,2514;8188,2469;5336,1473;5346,1461;6919,3086;7393,1455;7393,1435;7393,1412;7426,2056;7417,2059;7394,2059;7380,2061;7361,2066;7341,2071;9103,2664;9107,2544;9111,2486;9113,2473;5315,902;650,3983;642,3983;637,3982;632,3981;627,3977;624,3972;623,3963;625,3959;629,3955;634,3952;640,3951;647,3950;647,3950;7314,825;7316,830;7319,836;7326,846;7371,882;7391,899;7397,905;7400,911;7415,929;7424,938;5564,1747;5445,1887;5167,1721;5164,1719;9695,3502;9693,3499;9689,3498;9686,3500;9684,3503;9684,3534;9686,3538;9690,3540;9694,3538;9695,3535;8591,3845;8608,3842;8748,3844;7228,659;7326,707;7333,714;7338,721;7341,728;7342,737;7342,746;7322,780;7314,796;7312,804;7312,813;865,3650;4700,1438;4707,1431;4715,1422;4720,1416;4728,1409;4756,1380;2678,4012;2654,3996;2629,3977;2608,3956;2591,3935;2575,3911;2562,3889;2551,3862;2523,3788;2517,3778;2511,3771;2505,3765;2365,3681;2098,3525;2080,3515;2063,3509;2055,3506;9737,132;9795,130;9838,129;9869,127;9898,126;9910,124;9920,122;9926,119;9933,116;3975,2415;3979,2414;3987,2410;3991,2406;3994,2401;3996,2394;7362,2107;7360,2111;8904,2753;8911,2751;8919,2748;8926,2747;8930,2744;7239,2675;8359,2322;8359,2321;8358,2320;8357,2319;8355,2318;8353,2319;8352,2319;8351,2320;8350,2322;8351,2323;8352,2324;8353,2325;8355,2325;8356,2325;8358,2324;8359,2323;9310,3940;9312,3932;9298,3878;9279,3762;9276,3757;9268,3753;4667,1848;4633,1827;4606,1811;4551,1777;4541,1771;4509,1753;4504,1749;7599,1716;7611,1719;7669,1741;7767,1746;7778,1749;7785,1754;7792,1762;7797,1774;7804,1782;7812,1786;6541,1425;6545,1424;6565,1425;6576,1426;6595,1426;6649,1425;6661,1425;6680,1424;6684,1424;4700,3149;4645,3115;4595,3085;4588,3082;4568,3070;4519,3040;9949,102;9957,96;9963,92;9970,90;9977,88;9985,86;9995,85;4006,2381;4013,2379;4018,2378;4025,2374;4029,2370;4042,2356;4050,2348;4098,2301;4109,2290;4116,2280;4119,2273;4119,2266;4116,2259;8034,2582;8034,2561;8039,2468;6791,3327;6792,3278;6798,3264;6803,3258;6814,3251;6833,3247;6958,3249;9961,3344;9945,3356;9949,3363;9972,3388;9976,3400;9973,3416;9974,3485;9956,3526;9947,3559;9942,3591;9291,2657;3364,2107;3362,2119;3361,2122;3359,2124;3356,2125;8707,3125;8703,3019;8699,2992;8657,2929;8646,2917;8586,2811;5707,1744;5588,1673;4920,1668;4943,1644;4979,1608;6476,1885;6476,1880;6476,1871;6476,1862;6476,1844;6476,1834;6476,1824;6475,1820;4811,2162;4818,2155;4825,2148;4832,2142;4838,2136;4842,2131;8044,1135;8040,1133;8037,1130;4295,3277;3378,3085;5141,1753;5138,1749;5140,1744;5614,2837;7200,3132;7204,3111;7210,3086;4664,3362;4668,3343;4676,3293;4677,3291;4680,3286;4681,3284;4689,3277;4744,3257;4754,3254;4763,3245;3614,1830;3606,1824;3602,1821;3599,1817;3598,1813;3598,1808;3599,1802;3600,1795;3600,1791;3597,1783;3593,1779;3589,1776;3583,1773;3577,1770;3565,1761;3558,1757;3555,1755;3551,1753;3545,1751;3539,1749;3532,1748;3526,1748;3518,1750;3513,1752;3509,1756;7418,2463;7424,2442;7426,2441;7763,2092;7776,2087;7785,2086;7792,2085;7806,2087;2983,2887;2971,2879;2945,2863;2917,2848;2906,2841;2892,2833;2878,2824;2858,2812;2830,2796;2775,2763;2759,2753;2748,2746;2736,2740;2711,2725;2697,2717;2691,2713;2684,2711;2675,2708;2666,2707;2655,2705;2644,2703;2638,2702;2632,2700;2627,2697;2621,2693;2616,2686;2605,2671;2599,2662;2592,2656;2585,2651;2575,2645;2552,2631;2523,2614;2491,2595;3290,1763;3291,1762;3292,1761;3293,1759;3292,1758;3291,1757;3290,1756;3288,1755;3286,1756;3284,1757;3283,1758;3283,1759;3283,1761;3284,1762;3286,1763;3288,1763;4223,1306;4226,1306;4229,1304;4283,1250;4286,1247;4287,1245;4288,1242;3353,3076;3348,3080;3343,3082;3339,3083;3328,3083;3324,3082;3319,3080;3314,3076;3305,3069;5416,1074;5419,1072;5425,1066;5433,1058;5438,1052;5451,1038;5460,1029;5483,1006;5491,999;5494,995;5497,990;5498,985;5497,981;5495,976;5494,973;5490,970;5483,965;6316,2815;6326,2820;6332,2826;6337,2835;6338,2842;6336,2929;6334,2936;6329,2941;6320,2946;5988,1709;5981,1696;5761,1563;5746,1556;5711,1548;5652,1514;9275,3566;9261,3562;9246,3537;9238,3521;9239,3500;3919,2998;3926,2991;3933,2984;3940,2975;3943,2969;3945,2963;3946,2956;6832,2143;6844,2121;6856,2101;6867,2084;6869,2079;6880,2007;6900,1972;6918,1938;6920,1925;6920,1883;6917,1875;6858,1807;3958,2948;3963,2947;3966,2945;3970,2942;3979,2934;4029,2881;4036,2874;4039,2870;4041,2868;4042,2865;4042,2862;4043,2858;4041,2850;4039,2843;1687,3416;1695,3411;1702,3405;1716,3394;1728,3380;1736,3369;1739,3365;1743,3361;1748,3357;1754,3354;1762,3351;1770,3348;1781,3345;1792,3343;1802,3342;1810,3342;1826,3343;1834,3344;1839,3344;1843,3344;1846,3343;1851,3340;1857,3336;1866,3331;9071,3116;9124,3117;9131,3116;9150,3114;5737,2203;5770,2160;5783,2144;5785,2139;5786,2134;5786,2014;5785,2012;5784,2011;5783,2010;5783,2008;7945,2099;7972,2110;8072,2116;8151,2111;8162,2112;8165,2119;8166,2130;8163,2136;8163,2140;8164,2144;8166,2148;8166,2149;412,3889;411,3878;527,3802;542,3794;561,3787;573,3783;591,3779;611,3776;629,3774;6154,1180;6891,2307;1139,3259;1140,3263;1147,3271;1156,3280;6349,2204;6430,2205;6455,2206;6027,253;6025,249;6027,245;6029,242;6032,238;6036,233;6041,229;6046,226;6134,190;6152,182;6163,178;4793,1867;4908,1753;5964,1403;3837,2193;3839,2194;3840,2194;3842,2194;3843,2193;3844,2191;3844,2190;3843,2189;3842,2188;3841,2187;3839,2187;3837,2188;3836,2188;3835,2190;3835,2191;3836,2192;1199,3180;1203,3185;1205,3190;1205,3195;1204,3199;1201,3204;1194,3209;1150,3237;1145,3241;1141,3243;1140,3247;1139,3251;4722,625;4721,621;4720,612;4719,600;4718,595;4714,585;4707,576;4701,568;4694,558;4681,543;4679,538;4678,534;4679,530;4680,526;4721,484;4728,479;4750,455;4753,453;5007,1997;5083,1924;5095,1917;5106,1906;5107,1904;5394,2832;5379,2829;5356,2810;5331,2786;660,3598;677,3583;6226,1443;6230,1444;6235,1445;6241,1445;6250,1445;6287,1446;6462,1444;6468,1446;7519,842;7543,864;6663,3376;6665,3427;5732,1594;5796,1535;5841,1493;6113,3811;6135,3671;5087,1097;5083,1097;5079,1096;5075,1094;5068,1089;5056,1082;5043,1075;5030,1066;5016,1058;5000,1049;4993,1043;1138,3308;1143,3314;1149,3319;1155,3324;1159,3325;1163,3326;1167,3325;1172,3323;1202,3305;1208,3301;1213,3297;1216,3294;1218,3290;1218,3286;1216,3283;1211,3278;5669,2794;5736,2710;5772,2665;5882,2528;5918,2482;6060,2305;6470,3338;6435,3354;6406,3360;6781,3029;6793,3030;6893,3032;6924,3038;6972,3064;6993,3076;7019,3084;7073,3103;7084,3109;7088,3114;7093,3126;5474,3785;6650,2424;7215,2284;5139,1048;5131,1056;5125,1062;5113,1075;5108,1080;5102,1086;5095,1094;5091,1096;7376,2274;7383,2263;7395,2252;7415,2247;7478,2246;7572,2940;7575,2942;7578,2943;7628,2943;7631,2942;7633,2941;7634,2938;7635,2913;7636,2906;7638,2900;7643,2888;7643,2884;7642,2881;7638,2878;9171,3247;2947,2241;2954,2248;2961,2255;2977,2271;2985,2276;2991,2280;2999,2284;3009,2288;3019,2293;3029,2297;3038,2300;3046,2304;3054,2308;3062,2314;3068,2319;3071,2323;3076,2327;3079,2329;1938,3250;1940,3250;1942,3250;1944,3249;1944,3247;1945,3245;1944,3244;1942,3243;1941,3242;1939,3242;1937,3243;1935,3244;1934,3245;1934,3247;1935,3248;1936,3249;6980,1134;6980,1125;6980,1111;6984,1096;192,4005;300,3941;394,3890;468,3892;479,3895;5904,1706;5900,1697;3720,1979;3716,1985;3714,1988;3713,1992;3713,1999;3716,2005;3720,2011;3726,2015;3735,2019;3746,2027;3761,2035;3782,2048;3797,2057;3808,2064;3818,2070;3831,2077;3854,2091;3865,2097;3874,2103;3880,2108;3883,2113;3884,2119;3883,2124;3881,2129;3877,2134;3873,2138;3870,2138;3348,2434;3355,2426;2034,3182;2030,3177;2019,3169;2012,3164;2008,3161;2005,3160;1997,3156;1989,3150;1979,3144;1969,3137;4774,1119;4763,1112;4749,1104;4681,1061;4621,1023;4587,1001;4555,980;4539,970;4464,922;4387,873;4360,855;4339,842;4288,809;4254,788;4234,778;4220,772;4214,768;4208,765;4194,758;926,3858;1007,3808;1013,3807;1018,3808;1022,3811;1045,3831;1047,3835;1047,3839;1045,3843;1040,3847;965,3882;954,3884;5123,2077;5118,2081;5114,2085;5110,2090;5106,2095;5101,2097;5095,2099;5090,2101;5085,2105;5080,2111;5072,2118;5065,2125;5058,2134;5051,2140;5040,2150;9621,3637;3088,2097;3072,2085;7356,2113;7279,2113;4013,1552;3992,1568;3982,1572;3977,1571;3972,1569;3960,1557;8976,2652;9001,2661;4270,2421;4141,2327;4132,2322;4121,2315;4109,2308;2075,3009;2075,3014;2074,3021;2072,3027;2069,3032;2061,3040;2054,3047;4512,814;4513,815;4515,816;4517,816;4518,815;4520,814;4520,813;4520,811;4519,810;4518,809;4516,809;4514,809;4513,809;4512,810;4511,812;4511,813;8132,1953;8081,1957;3057,2983;3049,2991;9987,2017;4867,1912;4860,1919;4851,1928;4842,1936;4835,1944;4829,1947;4824,1950;4817,1957;4807,1967;4799,1975;4792,1982;4786,1988;4780,1994;4776,1998;4775,2001;4248,1704;4257,1695;4264,1688;4271,1681;7824,2817;6520,2812;3836,2722;3846,2721;3853,2721;3871,2719;3878,2717;3884,2714;3890,2708;3901,2696;3912,2686;3923,2673;3938,2659;3947,2650;3956,2641;4727,2579;4703,2563;4673,2553;4629,2550;4615,2551;4602,2555;4587,2559;4568,2569;4537,2598;4526,2627;4524,2636;4526,2652;4540,2686;4558,2704;4575,2715;6847,597;6844,601;6839,604;6818,615;6813,618;6808,622;6803,626;6799,629;6795,631;6760,639;6756,640;6752,640;6747,638;4547,2001;4556,1992;4564,1983;4570,1977;4577,1970;7296,377;7295,372;7297,366;7299,362;7323,337;7326,336;9354,3436;9306,3322;9304,3307;6313,2546;6325,2549;6409,2549;6493,2550;5339,4010;6730,600;6726,597;6721,594;6712,589;1367,4098;1274,4046;1164,3951;1154,3941;1146,3931;1141,3919;1134,3895;5593,333;5599,336;5611,343;5621,349;5655,373;5670,382;5688,392;5709,402;5725,412;5745,425;5767,440;5775,445;5784,449;5793,452;5801,453;5808,454;5814,455;5823,455;5236,3035;5194,3035;5183,3038;4980,3036;4952,3029;6387,3056;6400,3032;6681,2104;6685,2090;6685,2078;6683,2065;6679,2053;6672,2041;6650,2013;6230,3601;6185,3610;6030,3595;5990,3612;6018,3616;6024,3613;6027,3606;6034,3576;6028,3571;5997,3567;6345,377;6456,333;6467,326;6472,322;6478,316;6545,247;6560,231;6566,226;7104,2828;7106,2832;7189,2897;7194,2899;4336,1592;4340,1588;4348,1581;4360,1574;4392,1558;4404,1552;4447,1529;4454,1527;4462,1525;4469,1524;4476,1525;5476,2203;5265,2477;5276,2482;5389,2539;5505,2595;6016,2849;2894,2718;6599,171;6595,176;6592,182;6587,194;6579,215;6577,219;6572,222;8750,3995;5969,3110;5978,3116;5987,3118;6005,3118;6118,3104;6159,3097;6172,3093;6181,3089;6188,3083;6188,3075;9149,953;9144,938;9141,926;9139,919;9136,911;9130,902;9126,896;9122,892;2991,3026;2999,3018;3007,3009;3013,3002;8405,2754;8625,2756;8661,2764;5664,568;5687,548;5690,546;5695,543;5701,542;5708,541;5715,541;5725,540;5735,541;4439,2810;4415,2789;4150,2634;4008,2548;2952,2705;2962,2693;2982,2673;2986,2669;2999,2660;3003,2656;3007,2652;7220,553;7224,555;7228,557;7248,568;7250,571;7252,574;7251,577;7250,580;7231,604;7215,623;7202,641;7199,645;7195,646;7191,647;7188,647;7184,646;6543,4011;5238,2630;5236,2636;5236,2644;5236,2720;6585,2321;6579,2319;6575,2315;6573,2311;6573,2282;6576,2269;6580,2259;6587,2249;8389,4049;4904,2424;4935,2394;5146,2190;5182,2165;5217,2149;5345,2129;5375,2133;9023,2390;9023,2357;9024,2249;9025,2120;9025,2080;9562,1051;9559,1047;9555,1043;9551,1041;9545,1040;9506,1041;9499,1043;9493,1045;4524,2010;4517,2016;4444,2092;913,3785;907,3780;896,3777;876,3767;865,3757;864,3749;874,3739;892,3729;903,3728;926,3741;940,3747;950,3754;1163,3705;1184,3688;1240,3655;7259,328;7261,329;7262,329;7264,329;7266,328;7267,327;7267,326;7267,325;7266,323;7265,323;7263,322;7262,322;7260,323;7259,324;7258,325;7259,327;5411,3331;5411,3306;5417,3239;5412,3203;5412,3196;5410,3061;5409,3008;5410,3000;5415,2990;5433,2978;9026,3493;8988,3491;4989,2477;4978,2471;4946,2454;6375,2683;7535,2227;7556,2218;7577,2215;7667,2210;7790,2210;6421,3885;6420,3883;6417,3881;6415,3880;6409,3880;6405,3880;6399,3882;6371,3891;6364,3863;6365,3855;5255,3645;5252,3638;5254,3604;5256,3598;4959,2214;4959,2209;4958,2205;4954,2201;4948,2196;4939,2190;4928,2183;4916,2176;4901,2167;4888,2158;4875,2151;4864,2144;4851,2136;4827,2122;4815,2115;4805,2109;4792,2101;4781,2095;4770,2088;4758,2080;4747,2073;4734,2065;4722,2058;4700,2045;4690,2039;4680,2033;4663,2023;4648,2014;4635,2005;4620,1996;4604,1987;4589,1977;4567,1965;4557,1959;4547,1953;4537,1947;4533,1944;4531,1942;4531,1939;4533,1936;4537,1933;4544,1925;4553,1917;4561,1908;4570,1899;4577,1892;4486,1683;4481,1688;4471,1698;4453,1717;4437,1733;4429,1741;4405,1766;4396,1774;4389,1781;4375,1797;4371,1800;4368,1801;4364,1803;4360,1803;4356,1802;4342,1795;4335,1792;6629,350;6607,339;3989,3064;3978,3058;3964,3049;3949,3040;3945,3038;3935,3032;3929,3027;3924,3021;3918,3012;5927,55;5918,45;5909,35;5905,30;6655,3029;6717,2634;6743,2634;9187,2487;9188,2449;9175,2432;4121,1621;4116,1617;4112,1612;4104,1607;4084,1595;4051,1576;4032,1563;4009,1546;4005,1538;3995,1516;3990,1509;3983,1502;3974,1494;3873,1433;3849,1419;3835,1409;3831,1405;3828,1402;3825,1397;3823,1392;3819,1377;6119,623;6116,619;6113,614;6109,611;6060,582;6366,1263;6365,1257;6364,1252;6365,1247;6366,1242;6369,1238;6381,1221;6388,1211;6392,1206;6395,1201;6398,1197;6408,1191;8237,2688;3507,3577;5301,2173;3505,2518;3559,2464;3589,2435;3599,2423;7030,3520;7035,3563;7036,3572;7034,3606;3563,3787;3502,3752;3456,3735;3443,3727;3349,3670;3337,3663;3335,3662;3295,3638;3251,3611;3240,3608;3205,3606;3184,3606;3177,3604;3172,3603;3134,3580;1030,3286;1030,3280;1378,3354;1365,3341;6622,3812;4387,2320;4317,2275;4310,2192;4310,2190;4311,2184;4312,2176;4315,2170;4319,2164;4323,2160;4328,2155;4711,2475;4691,2467;4670,2454;4671,2429;4665,2428;4659,2433;4659,2446;4663,2450;2298,3156;2290,3153;2282,3147;2275,3141;2269,3135;2260,3131;4943,2245;4949,2238;4956,2231;4958,2226;4959,2223;4960,2220;4960,2218;5402,1504;5408,1498;5832,3213;5818,3227;5799,3286;5810,3326;523,3759;509,3754;482,3724;451,3689;440,3677;5227,1908;5226,1906;5223,1904;5220,1902;5216,1895;5211,1856;5206,1849;5200,1843;5220,3648;5237,3649;5284,3639;5290,3635;5292,3631;5295,3627;5294,3622;5292,3618;5287,3613;5247,3595;5242,3594;5223,3593;9235,2450;8629,807;8635,811;8642,816;8650,821;8658,825;8667,827;8674,830;8681,831;6165,2666;6177,2668;6261,2668;6270,2670;6273,2675;6275,2683;6522,2684;6277,2379;6277,2350;6278,2333;6280,2315;6284,2300;6293,2281;6303,2266;6347,2218;6349,2213;6349,2166;6350,2160;6353,2157;6371,2148;6378,2147;6233,1659;6223,1655;6216,1651;6212,1649;6207,1640;6206,1634;6206,1622;9983,2615;9980,2616;9968,2615;9965,2614;9964,2613;9956,2609;9948,2595;9945,2570;9938,2560;9933,2556;9923,2553;9915,2553;9849,2564;9839,2571;9825,2577;9812,2580;9796,2582;9251,2941;9271,2939;9287,2940;9298,2946;9341,2953;9365,2949;9395,2944;9421,2944;9438,2949;7020,2943;7334,2944;7429,2945;7438,2944;7461,2941;7474,2941;7498,2943;7507,2944;5816,78;5860,55;8687,836;8687,841;8686,849;8685,854;8685,859;8686,866;8690,879;8693,889;8694,904;8696,915;8697,925;8698,931;8697,938;8696,946;8691,961;8686,974;8683,986;8682,992;8682,998;8683,1005;8685,1014;8688,1024;9990,2093;7717,694;7706,697;7697,700;7686,705;7676,711;7667,717;7659,724;7649,734;7627,758;5859,1087;5869,1075;5920,1053;5934,1043;5941,1028;5940,1018;5936,1006;5935,994;5942,984;5997,928;6007,917;6017,907;6020,904;6023,903;6027,902;6033,902;6038,904;6065,919;5820,151;5816,150;5788,137;5754,120;5751,118;5749,116;5748,114;5748,112;5748,109;5750,106;5756,99;5784,69;5788,67;5792,66;5796,65;5800,65;5803,66;5807,68;8439,3171;8432,3146;8433,3118;8435,3102;8442,3099;8471,3099;8485,3091;8562,3015;8575,3009;8581,2999;8576,2990;8556,2967;5886,1235;5880,1226;5860,1100;6958,3350;6958,3329;6958,3204;3258,2160;3250,2168;3243,2175;3238,2179;3231,2182;3224,2185;9075,2792;9057,2784;9041,2774;9032,2762;9029,2747;9034,2729;9043,2720;1370,2227;7787,2494;7832,2471;7852,2467;8177,2469;8237,2470;8253,2473;8299,2484;8316,2487;8358,2487;8385,2483;8409,2481;8502,2482;8508,2482;8688,2486;8736,2489;8745,2489;8750,2490;8755,2492;8758,2493;8763,2496;8767,2499;8770,2502;8774,2506;8787,2521;8827,2500;8834,2497;8841,2494;8850,2492;8870,2489;8884,2488;9331,2489;9466,2490;9490,2488;9545,2470;9565,2461;9592,2441;9637,2403;9747,2331;9772,2323;9940,2278;9998,2261;9051,2715;9057,2712;9064,2712;9071,2714;7203,798;7198,797;4333,3120;6771,2457;6796,2464;6822,2470;6874,2469;4531,1781;4845,1899;4938,1807;9768,3487;6950,2015;7004,2009;5744,3540;5739,3548;5736,3560;5724,3639;5725,3649;5728,3657;5734,3665;5744,3674;5765,3686;5784,3705;5787,3713;5789,3723;5788,3735;5785,3746;5781,3753;5774,3759;4103,2900;4113,2893;4122,2888;4133,2881;7593,2503;7598,2502;7604,2500;7609,2497;7617,2493;9768,3501;9768,3465;9770,3464;9779,3464;9781,3465;9781,3500;9779,3502;9772,3502;6157,3376;6201,3380;5303,2644;5304,2643;5304,2641;5303,2640;5302,2639;5300,2638;5298,2638;5296,2639;5294,2640;5294,2641;5294,2643;5294,2644;5296,2646;5298,2646;5300,2646;5302,2646;7077,2901;6565,642;6551,606;7091,1949;3918,1849;3951,1815;4002,1763;4782,1861;4776,1867;4760,1884;4757,1888;4750,1900;4745,1906;4737,1915;4729,1922;4714,1937;4699,1952;4037,1712;4034,1719;4031,1726;4029,1731;4027,1736;4024,1740;4020,1746;4014,1751;4010,1755;2913,2068;2904,2061;2900,2057;2898,2052;2897,2047;2898,2042;2900,2037;2911,2023;2933,1996;2947,1977;2952,1974;6284,3822;6274,3826;6192,3869;5869,4046;5861,4051;5856,4057;5850,4074;8492,4089;6553,1674;6564,1674;6575,1674;6584,1674;6588,1673;6595,1671;6599,1668;4403,2303;5223,3600;5199,3599;5186,3600;5167,3597;5146,3593;5122,3591;5088,3590;5039,3592;8864,2983;8865,2970;8865,2945;8885,3496;8886,3478;563,4064;541,4044;521,4018;514,4004;511,3992;511,3958;516,3934;523,3921;532,3909;548,3893;564,3883;586,3873;613,3866;640,3862;666,3861;691,3865;712,3872;778,3905;811,3922;820,3927;6346,3934;6372,3913;6375,3908;6312,3777;6372,3751;6385,3748;6508,3761;6522,3766;6534,3775;6298,3867;6284,3871;6220,3904;5933,4063;5926,4068;5922,4073;5916,4089;1716,3163;1713,3161;1708,3156;1703,3151;7092,289;7061,271;6367,142;6368,140;6368,139;6367,138;6366,136;6365,136;6363,135;6361,136;6359,137;6358,138;6358,139;6359,141;6360,142;6361,143;6363,143;6365,143;2808,2170;2815,2177;4010,1256;4006,1248;4002,1240;3998,1234;3990,1224;3985,1220;3979,1217;3972,1215;3965,1213;3926,1209;3910,1207;3904,1206;3891,1201;3887,1199;3881,1196;3876,1192;3872,1188;3842,1150;3033,2308;3027,2314;3023,2322;3015,2335;3005,2344;2987,2359;2982,2364;2980,2367;2980,2373;2980,2376;2980,2380;2982,2385;2985,2389;2991,2393;3007,2402;3015,2406;3024,2413;3029,2415;3035,2417;3042,2417;3048,2418;9115,1163;9115,2877;9053,2858;8946,2859;8874,2842;8836,2822;8798,2808;8776,2804;8756,2804;8696,2813;8659,2817;7137,3846;7149,3864;7151,3873;7152,3888;7151,3897;7151,3978;7149,3993;7146,3998;7143,4001;7131,4004;7127,4003;7123,4002;9233,2942;9208,2944;9177,2945;9164,2941;9154,2933;9144,2921;5711,1170;5905,3059;5920,3050;5943,3037;5958,3032;5979,3029;6008,3029;6081,3028;6119,3026;6135,3021;6149,3016;4967,728;4969,727;4970,725;4970,724;4970,722;4969,721;4967,719;4965,719;4963,719;4961,720;4959,722;4959,723;4959,725;4960,727;4962,728;4965,728;5464,2875;5065,1612;7788,2194;5236,2907;5085,2907;4617,1333;4592,1317;5876,2959;5875,2965;5877,3007;5878,3030;5889,3045;8945,3663;8942,3655;8935,3653;8919,3651;6556,553;6559,544;6561,534;6563,530;6567,527;6571,526;6576,525;6583,526;6591,529;6596,532;6602,534;6618,543;6634,557;6641,563;6646,569;6651,576;6655,580;6659,584;6662,590;6672,616;5497,551;4980,1762;4975,1764;4971,1764;4864,1699;4842,1685;4801,1662;4789,1655;4671,1583;6609,2675;3409,3521;7187,3436;6480,1773;6480,1763;6481,1694;6481,1656;6479,1649;6475,1642;5299,2430;5406,2293;5442,2247;5482,2195;5510,2160;5583,2067;7419,480;7421,480;7422,478;7423,477;7422,476;7422,474;7420,473;7418,473;7416,473;7415,473;7413,475;7413,476;7413,477;7414,479;7415,480;7417,480;6424,297;6426,297;6428,295;6429,294;6428,292;6428,291;6426,289;6424,289;6422,289;6420,290;6418,291;6418,292;6418,294;6418,296;6420,297;6422,297;7453,436;7476,421;9173,3170;9172,3162;9170,3155;9165,3143;9154,3124;9150,3104;9151,3095;9157,3085;9165,3076;9175,3071;9191,3061;9198,3057;9211,3028;9213,2994;9220,2984;9232,2975;9243,2964;9249,2954;6545,787;6538,791;6534,793;6529,794;6524,795;6519,797;6516,800;6516,803;6517,807;6902,3327;6903,3292;4219,1306;4216,1304;4073,1216;4021,1185;4019,1183;5940,417;5937,415;5915,392;5914,389;5914,386;5915,383;5917,381;5933,373;5943,367;5960,354;5969,346;5979,336;4203,1463;4193,1466;4186,1468;4181,1468;4177,1468;4172,1467;4167,1464;4033,1381;4030,1379;4028,1377;4029,1375;4029,1372;4031,1369;4114,1297;4420,1421;4424,1419;4517,1326;5422,2301;4892,1927;4896,1922;4907,1913;4915,1907;4929,1897;4935,1892;4943,1888;4951,1883;4960,1876;5019,1819;5021,1815;5022,1810;5022,1806;5020,1798;5021,1794;5024,1790;5054,1759;3689,2787;3693,2783;3747,2727;7602,3070;7607,3072;7612,3075;7614,3080;7610,3106;7608,3110;7604,3114;2137,3890;2191,3834;6681,3326;6683,3202;4860,2462;4741,2392;6337,999;6317,1029;6314,1044;8792,3004;8822,2986;8837,2982;8866,2992;8881,3007;8591,3887;8594,3882;8600,3882;8660,3883;8681,3880;8750,3881;8764,3881;8773,3881;8781,3881;6232,1720;6230,1690;6229,1682;6229,1673;6229,1668;6231,1664;6237,1655;6240,1653;6249,1648;6255,1646;6267,1645;6279,1643;9033,3492;9038,3483;9038,3478;9034,3472;9029,3467;9020,3462;9015,3461;9007,3456;9003,3450;8999,3444;8989,3443;8962,3443;8942,3444;8930,3444;8914,3444;8900,3441;8894,3440;8887,3440;8881,3440;8878,3442;3825,1444;3827,1445;3829,1445;3831,1444;3832,1443;3833,1442;3834,1441;3833,1439;3832,1438;3830,1437;3828,1437;3826,1437;3825,1438;3824,1440;3824,1441;3824,1443;8934,1862;8925,1835;6660,2811;9423,1939;9430,1949;9434,1957;9436,1972;9438,1994;9440,2005;9446,2011;9455,2015;9485,2026;3606,2209;3608,2210;3610,2210;3612,2209;3613,2208;3614,2207;3614,2205;3613,2204;3612,2203;3610,2202;3609,2202;3607,2203;3605,2204;3605,2205;3604,2206;3605,2208;690,3633;693,3643;688,3649;679,3657;652,3671;3903,2316;3922,2296;3926,2293;3935,2290;9133,3161;9143,3159;3126,2411;3111,2401;9722,4076;9729,4075;5838,1295;5834,1291;5829,1286;5825,1282;5733,1228;5731,1222;5733,1216;5788,1159;5793,1155;5797,1153;5690,3411;5697,3403;5704,3392;9261,3934;9273,3933;9284,3934;9334,3947;7880,2921;7878,2935;7870,2955;7855,2981;3172,1733;3165,1727;3158,1720;3152,1714;3143,1704;3139,1699;3135,1692;3128,1678;3122,1659;3118,1655;3115,1651;3110,1649;3102,1646;3098,1646;4568,2539;4411,2450;3104,1780;3101,1776;3097,1772;3092,1770;3076,1767;3071,1765;3060,1757;3041,1742;3038,1738;3032,1725;3027,1717;3022,1706;3021,1699;3022,1694;3027,1686;3032,1682;3039,1680;9090,1731;9067,1736;9060,1739;9053,1742;9048,1745;3113,2954;3120,2947;3126,2941;3131,2938;3136,2932;3139,2927;3138,2921;3135,2916;3132,2909;3129,2892;3128,2885;1753,3134;1751,3130;1751,3125;1753,3119;1757,3114;1764,3106;1772,3098;1816,3054;1826,3045;6277,3188;6287,3203;6308,3227;5700,798;9202,2199;9206,2199;9276,2199;9293,2199;3486,2518;3349,2436;6241,947;6256,956;6165,902;6147,893;6116,890;6560,2736;6545,2722;6524,2702;6643,580;6635,583;6610,588;6605,589;6599,588;6595,585;6592,580;6586,575;6580,570;6574,568;6569,566;6563,563;6559,561;6557,558;1275,3300;1275,3296;1274,3291;1270,3282;1265,3267;1262,3261;1259,3253;1255,3243;1251,3238;7272,1983;7321,1984;7326,1982;7328,1978;7329,1965;428,3685;458,3662;483,3637;515,3617;527,3613;551,3609;579,3597;590,3593;600,3590;610,3590;643,3593;652,3595;9554,3419;9540,3421;9529,3426;9513,3437;9501,3445;9490,3456;9485,3466;5334,2902;5332,2883;5330,2876;5321,2870;5309,2863;5284,2861;5266,2861;5236,2862;7650,1630;5253,237;5241,238;5231,239;5223,240;5214,239;4286,1239;4285,1238;4281,1235;4089,1117;4086,1117;6593,1775;6594,1767;6594,1758;6594,1733;6591,1728;7666,572;7673,567;7687,557;7691,555;7695,554;7700,553;7702,553;7705,553;7708,554;7713,556;7723,563;6734,3326;6739,3326;6642,3314;5685,2369;5803,2216;5731,2819;5939,2556;5976,2510;4416,953;4418,949;7041,2686;1164,3386;1171,3380;1190,3367;1199,3363;1209,3356;1231,3343;1261,3324;1267,3319;1271,3314;1274,3309;3362,1856;3372,1857;3380,1859;3385,1860;3400,1869;3429,1888;3455,1903;3461,1905;3466,1906;3945,2094;3925,2082;3912,2075;3899,2067;3881,2057;3867,2049;3855,2041;3841,2032;3826,2023;3812,2015;3794,2004;3782,1997;3772,1991;7950,1534;7985,1532;6029,255;6032,258;6037,260;6072,272;6078,273;6084,274;6089,274;6113,274;6163,273;6180,272;6192,270;6202,267;6207,265;6213,262;6214,258;2981,2514;2980,2512;2978,2510;2976,2508;2969,2504;2961,2500;2951,2494;2943,2489;2935,2484;2926,2478;2918,2474;2913,2470;2911,2467;2909,2463;2909,2458;2910,2452;2908,2448;2906,2444;2902,2441;2898,2437;2887,2431;2878,2426;2870,2421;2862,2417;2854,2417;5930,57;5933,59;5937,60;5941,60;5944,58;5949,56;5978,27;5980,24;5980,20;5980,17;5978,15;5973,6;5971,2;2816,1871;2818,1871;2820,1870;2821,1869;2821,1867;2820,1866;2819,1864;2817,1864;2815,1864;2813,1864;2812,1865;2811,1866;2811,1868;2811,1869;2813,1871;2814,1871;7383,1039;7383,1035;7385,1031;7388,1027;7391,1024;7397,1020;7418,1008;7443,991;7465,977;4632,2440;4856,2286;4845,2284;4813,2265;4808,2264;4801,2266;4755,2293;7887,1540;7886,1511;7884,1485;7882,1463;452,3976;385,3975;361,3973;343,3969;330,3964;319,3957;285,3925;282,3920;281,3918;282,3916;284,3913;287,3910;308,3893;310,3892;314,3888;315,3885;314,3883;295,3862;293,3861;289,3862;288,3862;287,3864;287,3865;287,3868;289,3870;302,3883;5171,1326;5182,1327;5192,1321;5203,1310;5216,1303;5252,1304;5275,1297;5287,1289;5235,2535;759,4102;764,4092;778,4082;817,4065;826,4065;5105,2664;5090,2671;5089,2678;5996,119;5999,120;8704,2906;2038,3285;2028,3283;2004,3277;1999,3277;6714,1696;6667,1696;6926,449;6925,443;6918,430;6914,422;6912,415;6911,409;6912,403;6920,380;6948,316;6953,308;6959,300;6975,282;6980,278;6986,275;6991,273;7002,271;4291,1407;4295,1407;4298,1409;4304,1412;4337,1433;4344,1437;4348,1440;4350,1444;4351,1448;4350,1453;4348,1456;4345,1459;4339,1462;4326,1468;4308,1475;4226,1511;6016,1195;6002,1196;3922,1798;7025,2639;7026,2632;7029,2626;7032,2622;7052,2602;7056,2594;7058,2588;7058,2584;7059,2436;7060,2423;7057,2418;7035,2400;7025,2392;7024,2389;7023,2382;7026,2279;7031,2267;9992,2248;8456,2092;8457,2092;8458,2093;8459,2093;8461,2092;8462,2092;8462,2091;8462,2090;8462,2089;8461,2088;8460,2087;8458,2087;8457,2088;8456,2088;8455,2089;8455,2091;5520,3219;5530,3223;5540,3223;2555,2125;2556,2124;2557,2123;2556,2121;2555,2120;2554,2119;2552,2119;2550,2119;2549,2120;2548,2121;2547,2123;2548,2124;2549,2125;2550,2126;2552,2126;2554,2126;8310,2866;8308,2845;7473,376;7609,236;7658,185;7717,123;7777,59;7797,39;6412,2379;7752,2072;6383,2379;6384,2333;6386,2323;6392,2310;6435,2264;6446,2248;6453,2232;6030,1678;6012,1665;5584,1727;6430,2184;6427,2178;6423,2174;6383,2148;5895,3004;5918,2993;5937,2987;5952,2984;5979,2982;6041,2982;6114,2985;5583,1500;5586,1488;5583,1478;5574,1466;7817,892;7816,885;7816,866;7815,852;7816,838;7817,829;7821,814;7824,797;7827,783;7832,763;7832,756;9218,2811;9221,2803;9228,2798;9235,2796;9241,2794;9252,2795;1740,3273;1744,3275;1750,3278;1757,3282;1763,3284;1769,3285;1776,3285;1786,3285;1797,3285;1805,3286;1813,3287;1821,3290;1828,3293;1834,3297;1841,3303;1853,3317;6637,735;6701,721;6719,717;6727,715;6817,696;6837,694;6912,700;6918,701;7123,716;7146,713;7165,709;7188,697;7207,683;7316,548;7420,419;7422,417;7424,414;7427,411;7444,396;9033,1731;9042,1736;9060,1766;9063,1783;5661,3043;5668,3047;5668,3053;5668,3062;5671,3073;5675,3081;5703,3106;5709,3113;5712,3123;5712,3136;7276,2629;7306,2631;7322,2630;7356,2619;7373,2609;6340,4051;6327,4054;6853,2899;3825,2719;3808,2709;3773,2688;3761,2681;3749,2674;3737,2667;4033,2655;4033,2649;4033,2644;4034,2639;4036,2634;4042,2626;3074,2337;3063,2349;3058,2354;3052,2359;3047,2363;3042,2368;2920,2602;2914,2609;2909,2613;2904,2617;2900,2619;2895,2620;6148,2187;6142,2180;6138,2174;6135,2168;6091,2036;6087,2028;6082,2020;6079,2015;6076,2012;6072,2011;6062,2011;6050,2011;6044,2010;6042,2010;6040,2008;6037,2008;3865,3402;3853,3432;862,3604;848,3607;692,3705;1288,3827;1321,3818;1354,3808;1408,3794;1466,3778;1517,3764;1561,3748;1591,3737;1618,3724;1641,3712;1649,3707;1155,3518;1201,3568;1250,3620;1259,3631;1313,3687;1334,3705;1353,3717;1368,3725;1275,3655;1285,3674;1291,3692;1292,3710;1292,3720;1290,3731;1284,3748;1274,3768;1258,3786;1236,3803;1189,3833;1766,3571;1678,3602;1656,3609;1629,3615;1608,3619;1585,3621;1689,3563;1680,3563;1654,3568;1631,3574;1605,3585;1587,3597;1576,3604;5212,3437;5183,3435;5153,3434;5117,3433;5070,3432;4978,3426;4944,3421;4783,3393;4734,3387;4706,3383;4609,3373;4535,3366;4427,3355;4334,3346;4273,3335;4139,3317;9741,3690;9602,3689;9573,3689;8877,3680;1525,3645;1507,3653;1495,3658;1479,3662;1458,3666;1435,3665;1416,3663;1393,3655;1369,3645;1345,3633;1314,3617;1278,3593;1233,3560;3915,3258;3919,3252;3930,3240;3935,3236;3945,3232;3953,3231;3962,3231;3973,3233;3982,3238;3989,3245;3993,3251;3994,3259;3990,3270;3984,3275;3975,3282;3965,3286;3952,3287;3928,3287;1314,3815;1337,3801;1354,3786;1363,3774;1374,3755;1378,3745;1379,3736;1381,3717;1380,3705;1377,3693;1372,3680;1365,3668;1352,3651;1333,3634;1454,3744;1487,3745;1515,3744;1529,3742;1542,3741;1561,3737;1579,3733;1596,3728;1612,3723;3878,3278;3867,3275;3855,3271;3844,3265;3838,3260;3833,3252;3832,3245;3833,3237;3838,3230;3844,3224;3853,3220;3862,3217;3874,3218;3884,3220;3892,3225;3898,3231;3903,3237;3906,3244;3905,3262;3890,3314;3883,3334;3878,3345;3870,3352;3861,3356;3851,3357;3841,3356;3831,3354;3823,3349;3816,3342;3812,3335;3811,3329;3811,3322;3813,3316;3817,3310;3825,3304;3834,3300;3846,3298;3884,3300;8933,3706;8964,3703;9139,3706;9215,3715;9360,3699;9501,3696;4119,3018;4103,3026;4072,3045;4969,3393;4923,3396;4891,3398;4863,3399;4830,3397;4779,3389;5024,3704;5001,3672;5035,3418;5007,3424;4992,3430;4982,3435;4970,3442;4955,3453;4944,3461;4934,3473;4926,3486;4920,3499;4915,3510;5417,3455;5308,3441;5264,3436;4882,3485;4889,3497;4898,3529;4962,3522;4971,3509;4978,3502;4989,3491;5009,3477;5023,3470;5045,3463;5063,3458;5077,3454;5097,3451;5129,3448;5215,3445;6227,3596;6226,3582;6229,3576;6234,3571;6240,3569;6261,3567;6281,3567;6354,3565;6382,3567;6438,3569;5036,3858;4643,3817;4485,3802;4909,3563;4923,3589;5044,3734;5010,3703;5030,3735;5061,4036;5067,4004;5075,3938;5081,3903;5082,3863;5081,3818;5076,3797;5067,3776;3920,3239;3942,3203;3955,3187;3967,3175;3980,3166;4642,3385;4715,3396;4747,3401;4775,3409;4803,3420;4827,3432;4842,3440;4860,3456;4874,3473;3662,3703;3670,3691;3670,3686;3669,3683;3665,3680;3662,3679;3658,3679;3654,3681;3644,3689;4061,3079;4077,3066;4034,3103;4088,3056;4115,3033;4131,3021;4152,3006;4261,2932;4263,2926;5053,3777;5061,3796;5067,3820;5070,3848;5070,3864;5054,4004;5047,4043;4942,3534;4944,3498;4943,3489;4942,3481;4934,3459;4926,3446;4913,3429;4900,3418;4891,3412;4882,3407;4869,3399;4849,3393;4822,3387;9564,3685;9516,3675;3770,3566;3784,3566;3810,3538;3821,3511;3831,3497;3860,3461;3867,3452;3875,3445;3936,3402;3987,3376;4029,3360;4051,3355;4072,3351;4094,3350;4259,3359;4408,3374;4737,3405;4751,3408;4763,3412;4777,3417;4787,3423;4860,3487;4881,3501;4904,3510;4933,3517;4959,3516;4991,3508;5017,3496;5039,3486;5069,3478;5090,3476;5113,3479;5135,3485;5205,3507;5213,3508;5233,3509;5249,3508;5255,3507;5262,3506;5275,3501;5305,3488;5321,3483;5340,3479;5360,3476;5378,3475;5398,3475;5509,3489;5589,3495;6026,3541;6074,3549;6144,3566;6160,3572;6168,3582;683,4075;760,4039;920,3969;998,3935;1114,3882;1148,3865;1358,3768;52,2276;35,2276;17,2275;781,3146;776,3137;770,3129;743,3099;730,3085;724,3079;711,3067;707,3063;655,2846;681,2812;690,2800;693,2797;698,2792;708,2785;6425,435;6425,437;6424,439;6425,442;6427,443;6430,444;6432,443;6435,442;6436,440;6436,437;6434,435;6432,434;6430,433;4371,2854;4540,2742;4612,2681;6202,3536;6169,3533;8828,3679;5261,3449;5339,3456;5422,3464;5566,3478;5636,3486;5725,3495;5800,3503;5883,3512;5958,3520;6044,3528;6173,3541;5215,3431;6207,3544;8171,3657;5199,3429;5151,3423;5123,3419;5094,3416;5079,3415;5066,3415;5047,3416;5264,3441;8843,3686;8887,3687;6700,3600;6683,3582;9202,3679;9198,3668;9183,3640;9153,3584;9026,3374;8903,3181;8875,3086;8866,3069;8854,3053;8657,2787;8745,2550;8757,2538;1483,3741;1507,3738;1520,3736;1532,3732;1547,3727;1561,3722;1588,3706;1609,3691;1535,3637;1494,3668;1468,3687;1447,3704;1428,3718;1399,3738;3910,3273;6046,3521;5869,3501;5608,3473;5476,3461;5362,3450;5311,3446;1763,3602;1714,3577;1133,3880;1133,3868;1135,3851;1139,3830;1638,3669;1661,3650;1675,3639;1690,3628;1723,3609;1772,3581;3897,3314;2324,3305;1358,3758;1520,3623;1483,3619;1427,3610;1356,3594;1294,3576;1271,3568;1249,3559;1215,3543;1667,3543;1668,3552;1668,3557;1663,3563;1298,3784;1264,3799;1126,3861;1051,3896;963,3935;911,3960;848,3989;737,4037;608,4098;1390,3733;1404,3737;1415,3739;1435,3743;1402,3748;1570,3622;1553,3623;1619,3496;1513,3388;1478,3354;1144,3819;1151,3799;1154,3783;1155,3690;1075,3608;1061,3595;1055,3590;1044,3586;1020,3583;1005,3581;989,3577;974,3568;955,3552;902,3495;895,3490;889,3486;875,3483;844,3478;820,3474;804,3469;793,3462;788,3459;780,3451;772,3439;759,3416;753,3409;747,3405;700,3383;692,3378;688,3374;683,3369;671,3349;662,3336;8270,3151;8250,3162;8199,3184;8178,3197;8159,3213;8141,3230;8127,3248;8114,3289;8114,3308;8116,3329;8124,3353;8147,3413;8156,3438;8162,3469;8165,3528;8168,3569;8169,3619;8170,3643;8171,3650;1451,3726;1531,3689;1582,3666;8681,3678;7551,3653;7458,3652;7389,3650;7300,3645;7112,3632;6763,3596;6540,3573;6357,3554;6338,3552;2308,3279;9209,3697;6266,3550;6339,3558;6428,3568;6520,3577;6680,3593;6775,3603;6849,3611;6919,3619;6945,3623;7047,3632;7159,3642;7273,3650;7346,3655;7421,3658;7544,3660;7664,3664;7724,3665;7866,3669;830,3053;828,3041;827,3032;828,3024;830,3014;832,3006;837,2996;845,2985;851,2980;855,2976;866,2968;877,2961;714,3030;723,3029;731,3028;741,3029;752,3030;765,3033;771,3036;892,2942;874,2953;862,2958;849,2962;838,2963;825,2963;814,2961;803,2958;786,2949;770,2937;755,2920;749,2958;750,2964;750,2971;749,2978;747,2986;744,2994;740,3000;735,3006;6198,3555;6210,3559;6247,3565;6185,3562;6193,3561;6196,3558;8177,3687;8178,3657;4404,3353;4399,3361;4421,3363;4445,3333;4426,3323;4448,3365;4550,3376;4690,3390;4730,3393;4775,3400;4921,3429;4965,3436;5005,3441;5035,3441;5103,3441;5158,3442;8178,3650;8178,3643;8178,3624;8177,3578;8176,3549;8173,3527;8168,3463;8167,3457;8167,3455;8163,3437;8152,3407;8132,3356;8123,3328;8121,3310;8121,3291;8123,3277;8132,3254;8147,3233;8168,3214;8198,3191;8274,3157;4959,3617;4950,3599;4946,3586;4942,3574;4941,3556;4945,3617;4995,3686;7038,2252;7032,2392;7032,2388;7035,2386;7039,2383;7046,2382;6351,2077;6364,2070;5272,2420;5425,2493;6038,2795;5658,2100;5121,2363;5105,2352;6507,1993;6530,1981;6603,1942;6692,1895;6729,1875;7045,1704;7102,1673;7161,1642;7232,1604;7254,1592;7305,1565;7423,1504;7506,1461;7576,1428;7659,1388;7679,1379;7705,1366;7741,1354;7781,1342;7848,1328;7951,1311;8032,1298;8128,1283;8181,1274;8330,1250;8587,1209;8640,1198;8648,1195;8748,1151;8802,1108;8840,1076;8844,1072;8861,1057;8900,1024;8929,1005;8960,992;9006,977;9329,925;9402,922;9759,907;9789,905;9904,900;9929,899;9943,898;9947,898;9969,897;3378,4005;3341,4064;3353,4048;3386,4010;3450,3933;3505,3866;3568,3790;3606,3751;3610,3747;3636,3726;3708,3648;3854,3442;3866,3418;3871,3401;3870,3388;3866,3400;3823,3476;3693,3631;3655,3675;3801,3519;3833,3474;3928,3308;3947,3300;3817,3277;3771,3267;3696,3249;3632,3231;3547,3207;3254,3128;3186,3111;3145,3102;3105,3098;3053,3093;3004,3092;2953,3093;2902,3098;2853,3107;2809,3116;2770,3126;2740,3134;2711,3146;2656,3169;2591,3198;2530,3225;2463,3256;2392,3289;2318,3321;2242,3357;2148,3399;1943,3490;1859,3530;1678,3612;1631,3633;1607,3644;6733,3636;6732,3627;6733,3622;6735,3619;6741,3616;6697,3613;6700,3611;6703,3609;6704,3605;6774,3615;6832,3614;6861,3615;6884,3617;3116,3598;3191,3522;3206,3506;3263,3447;2176,3929;1976,3737;1961,3724;1946,3711;1923,3695;1897,3680;1812,3629;3437,4042;3073,3825;804,3188;845,3173;641,2874;644,2865;649,2856;651,2852;971,3112;975,3104;981,3093;137,3387;146,3380;149,3378;152,3376;160,3372;1468,3335;1473,3331;1478,3326;1480,3323;1480,3320;1479,3317;1476,3313;1393,3227;587,2906;584,2903;582,2899;580,2896;579,2892;578,2886;579,2880;581,2857;580,2851;579,2845;573,2835;570,2831;6049,2803;6057,2810;6065,2822;6092,2870;6669,3566;5522,2811;5550,2779;5555,2768;5559,2737;5371,2214;5383,2220;5153,4027;5155,4015;5180,3901;5198,3808;5208,3758;5234,3498;5236,3490;5236,3484;5237,3480;5217,3810;5229,3811;5240,3808;5245,3804;5250,3796;5251,3788;5250,3774;5247,3766;5242,3763;8279,3952;8285,3945;8291,3942;8298,3941;8414,3943;8422,3943;8435,3947;6144,3816;5829,3782;8016,3961;8121,3964;8138,3963;8159,3961;8174,3950;8185,3947;8261,3948;8275,3950;8285,3955;8303,3969;8317,3975;8333,3979;8375,3980;8403,3980;8416,3981;8428,3986;8438,3997;8444,4006;6227,2377;8344,4024;8355,4016;8371,4002;8375,3995;6250,2044;6248,2031;6245,2020;6238,2005;6227,1986;6220,1974;6213,1961;6205,1949;6201,1935;6202,1916;6202,1908;6202,1888;6203,1854;6202,1843;6201,1838;6199,1831;6195,1818;6189,1802;6187,1794;893,3157;925,3146;934,3142;1616,3650;1576,3658;1475,3703;1426,3725;1665,3699;1648,3636;1698,3678;1741,3649;1768,3632;1788,3616;858,3169;5514,98;5494,120;5459,154;5427,185;5516,92;5516,90;5516,87;5514,82;5511,78;5507,74;5448,39;5442,37;5437,37;5434,36;5427,37;5421,40;5416,44;5412,48;5410,53;5410,56;5410,58;5411,64;5411,64;5413,69;5417,73;5524,90;5531,91;5536,92;5543,96;5615,140;5618,144;5621,147;5622,152;5623,156;5622,160;5620,165;5617,168;5612,173;5608,177;5601,185;5516,94;5515,96;5370,99;5366,98;5363,98;5361,99;4849,1162;4830,1152;4578,1364;5555,255;5554,254;5553,252;5552,251;5549,251;5547,251;5545,252;5544,253;5543,255;5544,256;5545,258;5546,259;5549,259;5551,259;5553,258;5554,257;5383,159;5347,136;5339,131;5337,129;5336,127;5335,125;5335,123;5336,121;5337,118;5340,116;5344,111;5349,107;5354,102;5358,100;5317,533;9279,4043;9247,4003;9115,3890;9110,3886;9060,3844;8923,3730;8858,3679;8838,3663;8620,3485;8276,3158;8272,3153;8264,3142;8243,3112;8224,3069;8211,2931;8190,2874;8180,2861;7811,2517;7492,2159;7478,2136;7202,1707;7178,1669;3778,1818;3756,1805;3747,1799;3743,1796;3736,1789;3730,1781;3723,1772;3723,1771;3716,1765;3712,1759;3699,1749;3692,1745;3687,1740;3677,1736;3666,1731;3652,1726;3646,1724;3643,1723;3632,1720;3623,1720;3605,1719;3596,1718;3588,1715;3582,1712;3578,1710;3575,1707;6684,30;6680,31;6677,32;6663,47;6662,49;6661,51;6661,52;6661,55;6662,57;6664,60;6665,62;6698,162;6689,161;6682,161;6677,162;6633,196;6636,196;6639,197;6640,199;6641,201;6639,203;6637,205;6728,79;6726,81;6722,88;6717,96;6713,104;6705,127;6701,147;6698,166;6692,205;6689,220;6687,230;6685,238;6683,246;6679,255;6675,262;6671,269;6666,277;6660,283;6765,38;6760,43;6749,54;6741,62;6733,71;6730,75;6669,161;6660,160;6634,157;6604,148;6598,144;6593,140;6589,136;6585,133;6580,129;6574,126;6569,123;6562,121;6555,119;6548,118;6539,118;6529,120;6521,122;6513,125;6506,129;6501,134;6733,77;6737,72;6746,63;6763,45;6768,40;6780,28;6785,22;6782,20;6776,27;6543,383;6514,411;6726,43;6727,44;6729,45;6731,45;6733,44;6734,43;6735,42;6735,41;6734,39;6733,38;6731,37;6730,37;6728,38;6726,39;6725,40;6725,41;6716,77;6713,76;6704,73;6694,71;6683,68;6675,66;6670,64;6688,165;6681,163;6482,397;6487,403;6492,407;6498,410;6506,412;5185,237;5175,234;5162,227;5149,219;5144,216;5140,211;5418,390;5381,325;5364,318;5345,308;5314,287;5357,379;5356,382;5355,383;5352,384;5348,384;5345,382;5345,379;5347,377;5350,376;5353,376;5405,329;5414,320;5419,312;5421,303;5419,297;5414,291;5407,286;5392,280;5380,273;5369,266;5356,256;5353,255;5263,254;5259,249;5255,243;5253,225;5255,217;5257,208;7507,125;7508,128;7508,130;7506,132;7503,132;7500,131;7499,129;7499,127;7503,125;5419,392;5419,394;5418,396;5416,397;5414,397;5411,395;5410,393;5411,391;5414,390;5416,389;7624,165;7604,185;7524,105;7556,155;7557,157;7558,159;7556,161;7552,162;7549,160;7549,157;7551,155;7454,8;7455,10;7455,12;7453,14;7451,15;7448,14;7446,12;7446,10;7448,8;7451,8;7711,252;7711,255;7709,256;7705,257;7702,255;7701,253;7702,249;7706,248;5474,329;5474,326;5476,324;5479,324;5482,324;5484,326;5484,327;5484,330;5483,331;5479,332;7498,77;7492,78;7478,81;7465,86;7459,86;7453,86;7447,85;7443,82;7439,78;7435,68;7433,65;7431,61;7426,58;7422,55;7417,53;7411,51;7404,50;5249,184;5234,174;5174,138;5168,135;5163,134;5157,134;5153,134;5313,352;5313,354;5312,356;5310,357;5307,357;5304,356;5303,354;5305,352;5307,350;5198,231;5201,225;5202,220;5201,214;5199,208;5195,202;5188,197;5151,174;5128,159;7621,417;7621,419;7619,421;7617,423;7614,423;7610,421;7610,419;7610,416;7613,415;7616,414;7574,135;7402,52;7399,53;7396,53;7394,51;7394,48;7396,46;7399,46;7402,47;7404,48;6659,61;6656,62;6653,61;6651,59;6651,56;6654,54;6656,53;7110,1;7106,5;7103,10;7101,15;7101,16;7100,25;7102,30;7104,34;7108,39;7113,44;7167,76;7187,87;7193,90;7198,91;7204,92;7210,92;7223,90;7239,86;7219,150;7221,150;7222,150;7224,151;7224,152;7224,154;7224,154;7223,156;7221,157;7219,157;7218,156;7217,156;7216,155;7215,154;7215,152;7216,151;7217,150;7218,150;7380,163;7352,163;7305,164;7292,166;7284,169;7276,175;7271,179;7230,227;7226,232;7163,232;7166,229;7172,214;7174,207;7177,201;7177,196;7175,192;7094,25;7089,25;7085,24;7084,21;7085,19;7087,17;7089,16;7217,135;7534,27;7533,27;7496,5;7489,2;7467,0;7462,2;7457,5;7041,137;7042,141;7041,143;7038,143;7035,142;7034,140;7035,137;7038,136;7266,112;7271,115;7280,121;7295,130;7298,134;7302,141;7303,147;6995,111;6994,114;6992,115;6989,115;6987,114;6986,111;6988,109;6990,108;7290,81;7289,85;7287,88;7285,92;7282,95;7276,102;7288,79;7287,77;7289,75;7291,73;7294,73;7297,75;7298,77;7297,80;7294,81;7349,109;7346,109;7344,108;7342,107;7341,105;7342,103;7344,101;7347,100;7350,101;7352,103;7352,105;7351,107;7500,82;7502,86;7504,90;7508,94;7513,98;7520,103;7560,126;7033,28;7017,30;7380,174;7381,182;7382,188;7385,197;7390,206;7393,217;7396,226;7398,233;7399,241;7399,247;7397,254;7395,262;7390,270;7385,277;7374,287;7358,303;7562,366;7559,367;7555,367;7553,365;7552,363;7553,361;7556,359;7559,359;7561,360;7563,361;7354,109;7358,111;7363,114;7367,118;7370,122;7373,127;7375,133;7377,138;7379,143;7380,148;7380,156;7156,173;7149,180;7146,181;7142,181;7140,179;7139,176;7141,174;7147,168;7816,93;7824,85;7834,79;7845,75;7854,73;7869,72;7885,72;7894,70;7903,65;7909,57;7910,50;7910,41;7902,33;7897,26;7894,20;7894,10;7899,2;7606,185;7607,187;7607,188;7607,189;7606,190;7605,191;7604,192;7602,192;7600,192;7598,191;7597,190;7597,189;7597,187;7597,186;7598,185;7600,184;7600,184;7602,184;6773,161;6762,147;6932,193;6934,194;6933,197;6931,198;6928,198;6925,197;6925,194;6927,192;6930,191;6963,162;6958,167;7017,32;7014,34;7011,34;7008,32;7007,29;7009,27;7012,26;7016,27;6857,124;6856,119;6854,116;6851,114;6848,114;6845,115;6844,117;6844,120;6845,122;6847,126;6979,140;6974,145;6969,151;6966,156;6963,159;7224,6;7230,11;7236,17;7239,22;7243,33;7244,39;7243,47;7241,53;7173,195;7172,197;7168,206;7165,213;7164,218;7163,223;7162,229;6944,79;6946,82;6946,84;6944,86;6942,87;6939,86;6937,84;6938,81;6940,79;7094,164;7093,166;7091,168;7089,168;7086,167;7085,165;7086,163;7088,161;6874,173;6875,171;6878,170;6880,171;6881,172;6881,174;6881,176;6878,177;6876,176;6608,678;6608,675;6610,673;6614,672;6616,673;6618,675;6618,678;6617,680;6614,680;6611,680;7550,11;7538,23;7525,36;7513,45;7507,50;7504,54;7501,58;7500,62;7499,66;7498,74;7163,238;7162,243;7161,255;7163,264;6977,598;6972,598;6967,598;6963,598;6962,598;7063,314;7064,318;7063,321;7061,323;7058,323;7054,322;7053,320;7052,318;7052,315;7370,387;6748,222;6750,221;6752,220;6753,219;6753,217;6753,216;6751,215;6750,214;6748,214;6746,214;6744,215;6743,216;6743,218;6743,219;6745,221;6746,221;7316,382;7328,381;7338,379;7346,380;7354,381;7359,382;7152,433;7159,426;7167,419;7174,414;7182,411;7189,409;7139,319;7139,318;7138,313;7139,310;7142,309;7145,309;7147,310;7148,312;6528,661;6541,655;6553,650;6559,646;6562,644;7035,5;7034,10;7033,14;7032,19;7032,24;7033,29;7036,36;7039,42;7042,48;7046,52;7051,57;7055,61;7121,100;7147,115;7174,130;7180,132;7186,134;7192,135;7204,136;7210,136;7224,135;7230,133;7236,131;7243,129;7251,124;7258,119;6549,608;6546,609;6542,608;6539,606;6539,603;6541,601;6545,600;6548,601;6550,603;7209,551;7210,548;7213,547;7216,547;7218,548;7220,549;7221,551;6925,980;6927,976;6929,968;6933,942;6936,925;6939,905;7388,368;7390,368;7392,368;7393,368;7395,367;7395,366;7395,364;7395,363;7393,362;7392,361;7390,361;7388,362;7387,363;7386,364;7386,366;7387,367;6602,679;6598,680;6593,680;6587,680;6583,678;6579,675;6576,671;6915,730;6730,734;6731,739;6733,744;6733,745;6734,747;6736,751;6743,759;6753,768;6759,775;6761,778;6779,805;6783,812;6789,820;6794,828;6799,835;6805,846;6807,852;6810,865;6811,870;6811,882;6810,888;6808,900;6804,918;6802,924;6799,929;6728,719;6730,731;7238,62;7236,69;7236,74;7236,78;7240,89;7243,95;7247,99;7253,104;7260,109;6857,727;6855,744;6845,795;6783,769;6786,768;6789,767;6794,763;6798,758;6799,753;6799,746;6799,741;6801,736;6806,731;6810,728;6817,725;6824,724;6830,724;6886,728;6909,730;6912,730;6842,792;6840,790;6836,790;6833,791;6832,793;6832,796;6838,801;6840,804;6843,804;6846,804;6848,802;6849,799;6848,797;6885,843;6879,842;6870,842;6867,844;6866,846;6866,849;6868,850;6871,851;6883,852;6887,853;6891,851;6893,849;6893,846;6891,844;6888,843;6721,721;6727,732;6889,838;6892,834;6894,831;6896,827;6897,822;6900,802;6905,771;6956,735;6963,731;6965,730;6968,731;6970,732;6971,734;6970,737;6968,739;6963,741;7474,515;7488,524;7492,525;7433,419;7439,423;7443,426;7446,430;7682,607;7687,609;7691,609;7693,608;7695,606;7695,604;7693,601;7690,600;7685,600;7619,659;7635,644;7649,629;7660,622;7668,618;7675,615;7680,610;7685,595;7683,591;7682,587;7679,584;6994,910;6879,899;6876,896;7657,567;7650,561;7644,555;7637,544;7630,529;7124,874;7132,875;7139,877;7145,879;7162,888;6941,892;6947,853;6960,777;6961,766;6963,754;6964,746;6964,744;6959,737;6952,734;6948,733;6935,732;6968,159;6974,154;6979,148;6984,143;7509,736;7518,726;7527,718;7547,696;7552,693;7557,690;7582,677;7602,668;7796,714;7817,701;7827,691;7838,680;7583,820;7587,837;7588,840;7591,841;7594,841;7728,679;7721,661;7720,656;7720,652;7724,647;7555,1026;7593,1004;7605,994;6984,593;6986,587;6990,578;6995,570;7001,563;7006,556;7117,237;7109,236;7101,235;7091,234;7081,230;7071,228;7063,226;7052,225;7044,227;7037,229;7030,232;7020,237;7014,243;7010,248;7006,252;7004,259;7004,280;7008,288;7015,297;7025,304;7036,310;7043,313;7049,315;7057,315;7068,312;7078,303;7597,840;7598,837;7594,819;7430,423;7441,429;7761,917;7034,490;7048,460;7051,458;7622,971;7634,957;7650,936;7661,922;7668,914;7675,909;7682,905;7688,902;7696,900;7704,898;7857,891;7415,1077;7390,1055;7386,1050;7384,1045;7589,820;7599,818;7612,817;7626,814;7634,813;7641,810;7649,805;7675,789;7706,770;7739,750;7389,967;7394,962;7400,955;7407,949;7415,943;7107,548;7109,556;7108,573;7106,579;7103,586;7089,610;7087,615;7085,621;7079,684;7245,508;7257,513;7270,522;7137,319;7132,321;7124,329;7098,356;7094,361;7090,367;7080,388;7078,395;7076,402;7078,410;7080,414;7084,418;7089,421;7099,428;7113,435;6933,448;6941,448;6949,449;6958,450;6966,452;6974,455;7174,472;7194,484;7216,494;7105,276;7110,268;7113,262;7115,256;7116,248;7616,767;7600,781;7595,785;7589,790;7586,795;7585,800;7585,805;7587,812;6817,156;6821,148;6825,141;6829,136;6834,132;6840,129;6845,127;6851,125;6862,124;6871,123;6878,124;6884,126;6891,128;6898,132;6923,147;6943,158;7475,894;7486,876;7492,867;7499,859;7506,853;7529,836;7541,831;7551,827;7569,823;7579,821;7450,922;7456,918;7461,914;7465,909;7770,784;7776,781;7782,780;7787,779;7793,778;7802,780;6872,483;6876,476;6881,471;6886,466;6892,462;6903,455;6914,451;6524,655;6542,649;6556,644;6944,236;6946,243;6948,249;6947,252;6945,254;6941,255;6938,253;6937,250;6935,246;6934,237;7468,454;7531,493;7539,498;7557,518;7570,543;7621,1054;7617,1053;7616,1050;7617,1048;7618,1046;7622,1046;7627,1046;7342,765;7350,768;7387,781;7396,784;7402,786;7411,787;7419,788;7424,788;7434,787;7441,786;7444,785;7454,782;7461,779;7468,775;7473,771;7480,765;6573,639;6583,637;6637,625;6661,620;6684,611;6692,607;6703,598;6708,594;6721,577;6736,559;6745,553;6761,540;6767,534;6772,528;6774,522;6776,516;6779,503;6778,497;6775,486;6760,456;6756,444;6753,433;6751,400;6750,391;6747,378;6739,365;6735,358;6731,352;6722,341;6920,978;6916,977;6912,977;6911,978;6909,979;6909,981;6909,983;6912,985;6922,989;6924,989;6927,988;6929,986;6929,983;6928,981;7189,848;7190,850;7192,852;7195,852;7198,852;7200,850;7200,848;7199,845;7534,723;7540,725;7548,727;7557,729;7578,732;7586,734;7593,737;7601,741;7495,1158;7490,1156;7485,1152;7481,1147;7477,1141;7473,1136;7467,1125;7457,1116;7449,794;7451,796;7454,797;7456,796;7458,795;7460,793;7459,791;7085,521;7092,527;7099,534;7103,540;7132,0;7136,4;7140,8;7148,13;7173,28;7195,41;7201,43;7207,45;6826,160;6834,164;6840,168;6846,174;6883,217;6889,224;6893,227;6904,233;6910,235;6917,237;6925,238;6930,238;6949,235;6957,232;6964,228;6971,223;6976,217;6981,210;6983,203;6983,201;6984,197;6984,192;6982,187;6977,180;6973,177;6965,171;6868,356;6871,355;6874,356;6876,358;6877,361;6875,363;6872,364;6999,192;7002,193;7004,195;7005,197;7004,199;7002,201;6997,201;6958,537;6956,542;6953,545;6950,548;6945,551;6908,569;6902,572;6898,572;6894,571;6891,569;6886,565;6882,559;6878,554;6875,549;6873,545;6732,746;6726,748;6718,750;6713,752;6710,753;6708,754;6705,757;6702,760;6699,763;6698,767;6696,774;6698,780;6699,785;6703,789;6710,797;6719,808;6726,817;6733,827;6739,837;6750,854;6753,859;6755,867;6756,873;6757,877;6756,889;6754,892;6752,896;6948,73;6951,70;6955,68;6959,66;6964,65;6969,66;6974,67;7069,122;7088,134;7132,159;7164,178;7169,181;7172,185;7174,189;6695,752;6692,751;6690,752;6688,754;6688,756;6688,758;6690,759;6693,761;7125,687;7131,687;7136,686;7141,685;7146,684;5404,65;5400,64;5398,63;5398,59;5401,57;5405,56;5426,33;5427,30;5430,28;5433,28;5435,29;5437,31;5437,33;7404,585;7408,589;7409,593;7415,628;7416,636;7418,644;7422,650;7426,656;7433,662;7458,677;7477,688;7491,961;7533,935;7543,930;7552,925;7574,919;7587,913;7594,909;7600,904;7603,900;7611,890;7615,885;7622,878;7631,873;7639,868;7654,861;7665,858;7682,853;7689,848;7695,844;7701,837;7706,830;7710,825;7714,820;7729,810;5129,417;5105,384;5093,363;5074,326;5059,296;5044,265;5032,242;5019,218;5006,194;4999,177;4996,163;4994,149;4995,132;4997,124;4998,119;5003,101;5009,84;5017,67;5023,56;5032,43;5047,27;5282,513;5228,477;5169,442;5056,373;4998,338;4930,296;4899,277;4868,258;4832,236;4785,209;4756,189;6174,118;6136,134;6136,141;6020,183;5864,60;5854,48;5834,25;5822,13;5818,9;6017,190;5889,12;6002,122;6177,124;6157,132;6142,138;5843,71;5696,279;5708,287;5719,295;5751,318;5782,338;5786,340;5791,342;5794,342;5798,341;5801,340;5805,338;5941,182;5730,189;5712,183;5701,179;5698,178;5693,179;5690,179;5687,181;5664,209;5660,215;5659,223;5949,145;5940,139;5935,135;5930,131;5925,127;5920,122;5966,245;5959,266;5947,294;5944,300;5949,177;5433,138;5434,138;5559,214;5574,243;5577,246;5581,248;5636,275;5900,40;5889,46;5874,54;5817,411;5816,423;5816,437;5820,450;5828,466;5835,478;5844,493;5863,520;6110,99;6098,80;6125,145;6098,157;6073,167;6055,175;6036,182;6162,176;6164,172;6158,161;6151,152;6142,150;6147,158;6153,167;6159,175;6005,86;6004,84;6005,81;6007,80;6009,80;6011,81;6012,82;6012,84;6010,86;6007,86;6016,130;6019,131;6023,133;6028,133;6032,132;6036,130;6215,254;6214,251;6195,222;6010,194;5998,203;5989,212;5984,218;5977,229;5973,236;5971,239;5990,115;5988,112;5987,109;5987,106;5988,103;6007,189;5998,194;5989,202;5982,210;5978,214;5972,223;5967,234;5965,240;5895,490;5896,488;5898,487;5901,486;5904,487;5906,489;5907,491;5907,493;5906,494;5872,298;5878,294;5883,289;5888,284;5944,174;5948,169;5957,158;5641,270;5646,267;5651,265;5656,264;5662,264;5666,264;5671,266;5630,283;5739,616;5735,616;5732,614;5731,612;5732,609;5735,607;5738,606;5482,462;5464,454;5446,444;5578,520;5562,510;5549,500;5537,492;5530,488;5520,481;5386,544;5381,544;5378,543;5377,541;5378,538;5381,536;5385,535;5388,535;5583,578;5587,578;5590,579;5591,581;5591,584;5590,586;5587,587;5583,587;6045,687;6049,698;6052,705;5899,564;5915,584;5928,598;5939,606;5956,617;5993,638;6021,656;6025,659;6034,665;6036,668;6039,671;5830,454;5844,451;5851,448;5857,446;5862,444;5867,441;5871,438;5875,433;5389,539;5389,533;5390,529;5392,526;5580,589;5579,592;5576,596;5567,607;5557,617;5554,619;5550,621;5546,623;5542,624;5923,298;5871,277;5856,270;5843,263;5820,250;5807,242;5794,233;5780,223;5768,212;5758,204;5750,198;5920,654;5920,649;5921,645;5924,644;5928,644;5930,646;5931,648;5932,650;5932,652;5260,742;5278,752;5296,763;5303,767;5378,821;5377,825;5376,828;5374,831;5371,834;5366,837;5362,839;5358,840;5357,841;5353,841;5348,841;5345,840;5343,840;5338,838;5332,834;5304,818;5286,807;5266,795;5251,785;5247,782;5244,779;5242,777;5241,773;5240,770;5240,769;5241,766;5242,762;5244,759;5246,756;5255,747;5544,799;5525,817;5522,819;5269,733;5278,723;5284,717;5286,714;5289,709;5294,699;5303,684;5438,620;5434,624;5433,628;5358,844;5357,846;5354,847;5351,847;5348,846;5346,844;5250,736;5427,708;5425,712;5425,717;5425,722;5427,725;5429,729;5431,732;5434,734;5345,720;5341,728;5340,730;5334,736;5328,742;5315,755;5309,761;5408,776;5396,773;5383,765;5354,747;5341,740;5243,729;5248,732;5240,732;5246,735;5835,872;5675,847;5669,853;5631,891;5629,896;5849,861;5844,866;5840,869;5867,496;5872,494;5881,492;5892,490;5898,490;5902,491;5905,492;5907,495;5925,514;5685,933;5687,930;5708,909;5723,894;5741,874;5765,849;5768,847;5771,846;5775,845;5844,859;5840,863;5837,867;5635,770;5634,766;5635,764;5637,762;5640,762;5643,763;5644,764;5646,768;5579,853;5580,853;5584,855;5588,856;5593,857;5597,857;5602,856;5606,854;5610,852;5613,849;5641,820;5667,793;5676,784;5631,771;5627,773;5574,827;5573,830;5571,834;5570,838;5570,841;5572,846;5574,849;5817,865;5801,856;5789,849;5786,847;5782,845;5779,844;5650,769;5642,768;5639,768;4343,837;4346,826;4346,817;4346,811;4351,760;4352,716;4355,679;4357,669;4359,663;4362,657;4366,650;4369,644;4388,621;4399,608;4871,977;4854,968;4844,961;4835,954;4830,948;4825,942;4822,934;4819,927;4817,919;4815,902;4812,802;4812,750;4601,544;4623,556;4646,584;4660,601;4664,616;4663,622;5936,310;5930,315;5925,320;5912,330;5890,343;5870,355;5853,365;5847,369;5842,374;5837,378;5828,388;5825,393;5822,397;5923,653;5926,652;5929,652;5936,654;5958,667;5962,670;5963,673;5964,676;4843,1087;4845,1090;4846,1094;4848,1097;4847,1101;4982,843;4963,832;4903,796;4846,762;4832,756;4820,752;4580,754;4421,759;4376,760;4715,1022;4701,1036;4643,752;4643,700;4644,696;4650,689;4419,720;4417,687;4418,683;4420,680;4805,749;4797,748;4720,750;4680,751;4747,1065;4744,1065;4739,1071;4739,1073;4758,1084;4606,404;4807,611;4806,571;4802,556;4798,545;4793,536;7985,1149;7980,1153;7964,1180;7962,1182;7959,1184;7929,1204;8069,938;8084,932;8131,930;8142,932;8170,951;5374,811;5379,811;5382,812;5384,813;5385,816;5384,818;5382,820;5380,821;7942,1220;7948,1283;7977,1186;7978,1189;7978,1191;7981,1193;7983,1193;7986,1192;7988,1191;7988,1188;7987,1186;7985,1185;7982,1184;7980,1185;8069,981;8036,1038;8040,1034;8043,1033;8047,1033;8049,1034;8050,1036;8050,1039;8048,1041;8045,1044;7639,1234;7635,1228;7633,1226;7625,1221;5353,609;5349,615;5347,619;5346,624;5346,627;5347,632;5349,636;5352,639;5356,642;5360,644;5397,666;5684,814;5681,817;5679,821;5678,825;5679,829;5679,837;5679,840;7895,1080;7933,1060;7580,1251;7572,1246;7950,1052;7973,1040;7708,1215;7714,1220;7719,1224;7721,1229;7730,1242;7768,1300;7771,1315;7777,1332;4580,924;4578,921;4578,919;4580,917;4582,916;4585,916;4590,919;4596,923;4601,927;4604,929;4605,930;4604,933;4603,934;4600,935;4596,934;4593,932;4590,930;5357,610;5362,611;5366,611;5369,609;5369,606;5367,603;5354,596;5350,596;5348,597;5346,599;5346,601;5348,604;5349,607;7871,890;8286,1201;8283,1198;8280,1196;8277,1195;8273,1193;8091,1252;8097,1249;8103,1244;8016,887;8013,886;7987,876;7892,881;7883,883;8178,1159;8149,1159;8144,1159;8192,965;8195,968;8197,972;8198,976;8200,994;7988,1151;7995,1145;8000,1141;8005,1136;8008,1131;8095,1255;8100,1252;8104,1248;8109,1245;8113,1243;8118,1242;8123,1241;8130,1238;8213,878;8213,865;8215,862;8219,861;8222,862;8223,864;8224,865;8225,876;8224,878;8222,880;8219,881;8215,881;8213,881;8012,905;8012,897;8202,881;8131,875;8115,878;8090,886;8038,890;4622,1016;4667,969;4681,953;4705,928;4713,920;4730,909;4738,907;4752,906;4781,904;4799,903;8022,1119;8024,1118;8026,1116;8047,1100;8052,1098;8057,1096;8071,1093;8078,1092;8087,1092;8137,1090;8207,1086;8214,1086;8219,1087;8225,1089;8229,1091;4855,1066;4861,1059;4862,1057;4861,1055;4857,1053;4850,1049;4847,1047;4845,1044;4844,1039;4844,1035;4842,1031;4840,1028;8142,1237;8142,1234;8141,1226;7723,1176;7727,1170;7731,1165;7737,1160;7745,1155;7829,1113;5442,623;5438,626;8020,1166;7874,882;7983,1147;7991,1141;7996,1137;8001,1134;8027,1123;8032,1127;8210,1145;8213,1150;8221,1158;8224,1162;8230,1169;8230,1172;8231,1185;8231,1189;8118,1237;8113,1239;8109,1241;8099,1245;8093,1245;8088,1243;8076,1238;7900,1222;7898,1225;7896,1227;7894,1231;7894,1233;7893,1236;7895,1267;7897,1270;7898,1273;7900,1275;7902,1277;7905,1279;7908,1281;7912,1282;7915,1283;7920,1284;8200,1025;8196,1030;8191,1033;8187,1036;8182,1038;8177,1039;8171,1040;8165,1040;8160,1039;8155,1038;8150,1036;8143,1035;8137,1035;8130,1035;8125,1036;8120,1037;8115,1038;8698,1227;8703,1223;8704,1220;8702,1218;8700,1216;8697,1216;8695,1217;8694,1219;8690,1222;4780,517;4771,507;4756,496;4649,432;7473,987;7481,993;7489,1001;7501,1009;7515,1021;7553,1052;7558,1057;7575,1079;7661,1184;7667,1190;7674,1195;7685,1202;8873,1339;8876,1338;8879,1338;8881,1340;8881,1343;8879,1345;8876,1345;8873,1344;8872,1341;8870,1336;8867,1335;8861,1332;8855,1330;8845,1327;9341,956;9337,955;9334,952;9334,950;9336,948;9339,947;9343,948;9344,950;9343,953;9260,980;9260,977;9261,973;9262,970;9266,966;9272,961;9276,957;9278,953;9279,950;9280,946;9279,941;9279,938;8931,1159;8932,1162;8935,1166;8937,1170;8341,1298;8333,1300;8322,1302;8317,1303;8314,1301;8313,1299;8314,1297;8316,1295;8339,1290;9050,1231;9049,1234;9048,1236;9046,1238;9042,1239;9038,1238;9037,1235;9038,1233;9041,1230;9044,1230;9056,1231;9061,1231;9068,1231;9074,1230;9080,1229;9086,1227;9093,1225;9100,1223;9108,1220;9115,1217;9121,1214;9128,1210;9131,1208;8030,1120;8034,1125;8942,1145;8949,1143;8954,1142;8960,1142;8964,1142;8971,1143;8976,1146;8982,1148;8988,1153;8995,1160;9003,1168;9009,1173;9013,1177;9020,1181;9025,1183;9032,1185;9038,1187;9044,1188;9051,1188;9058,1188;9064,1187;9071,1186;9076,1184;9084,1181;9091,1177;9098,1173;9103,1171;9461,956;9464,958;9467,957;9469,956;9470,953;9469,951;9467,950;9464,949;9461,950;9459,951;9006,1339;9008,1340;9008,1343;9007,1345;9005,1346;9002,1346;8999,1345;8998,1342;8999,1340;9002,1338;8355,1339;8351,1333;8350,1327;8348,1321;8345,1313;8342,1304;8337,1274;8332,1256;8285,1194;9262,1362;9267,1362;9271,1362;9275,1362;9276,1364;9276,1367;9274,1368;9272,1369;9269,1369;9266,1367;9264,1365;9254,1353;9247,1350;9242,1348;9236,1346;9230,1345;9223,1344;9216,1344;9209,1345;9183,1351;9166,1355;9160,1355;9153,1355;9147,1355;9139,1353;9133,1352;8963,1037;8958,1036;8955,1035;8953,1032;8954,1030;8957,1028;8961,1028;8963,1030;8964,1032;8988,1062;9009,1083;9023,1097;9033,1107;9048,1122;9058,1132;9054,1135;9048,1139;9047,1141;9047,1143;9049,1145;9051,1145;9054,1145;9063,1139;9064,1137;9063,1135;9445,1071;9442,1072;9438,1072;9434,1070;9430,1068;9427,1065;9423,1058;9420,1053;9393,1026;9370,1003;8870,1095;8874,1091;8905,1166;8896,1171;8891,1175;8887,1178;8885,1182;8883,1186;8883,1188;8883,1192;8884,1197;8888,1209;8890,1213;8892,1218;8895,1226;8904,1246;8908,1258;8910,1262;8912,1266;8919,1285;8928,1306;8930,1310;8932,1315;8939,1333;8947,1351;8954,1369;8957,1374;8961,1378;8965,1381;8970,1385;8974,1388;8979,1389;8985,1390;8992,1391;9000,1391;9007,1390;9075,1376;9091,1372;9105,1369;9116,1366;9121,1364;9127,1361;9131,1358;8775,1167;8774,1171;8773,1174;8769,1179;8764,1186;8759,1193;8757,1196;8757,1199;8756,1203;8758,1211;8760,1224;8763,1243;8765,1261;8769,1282;8771,1295;8775,1295;8779,1296;8781,1297;8783,1299;8783,1302;8781,1303;8778,1304;8775,1304;8773,1302;8772,1300;8771,1297;9159,1306;9160,1308;9160,1311;9158,1313;9155,1314;9152,1313;9150,1310;9151,1308;9153,1306;9156,1305;8909,1163;8911,1160;8914,1157;8810,1382;8806,1384;8803,1384;8799,1383;8797,1380;8797,1378;8799,1376;8802,1375;8807,1374;7984,1037;7991,1036;8000,1036;8020,1035;8030,1036;9444,1017;9447,1016;9450,1015;9452,1014;9452,1011;9450,1009;9448,1008;9444,1008;9441,1010;9440,1011;9439,1013;9165,1243;9153,1250;9148,1254;9145,1252;9141,1252;9139,1254;9138,1256;9139,1259;9142,1260;9145,1260;9148,1258;9149,1256;8934,1148;8930,1149;8927,1150;9424,1202;9426,1204;9427,1207;9425,1209;9422,1210;9419,1210;9416,1208;9416,1205;9417,1202;9443,1074;9442,1076;9443,1079;9445,1082;9446,1085;9444,1087;9441,1088;9438,1089;9435,1087;9433,1085;9432,1082;9434,1079;9435,1076;9435,1074;8920,1162;8912,1164;9201,1279;9184,1289;9174,1295;9161,1303;8938,1148;8935,1151;8933,1153;8931,1155;8906,1214;8908,1212;8909,1211;8908,1208;8906,1206;8903,1206;8894,1117;8890,1121;8883,1126;8875,1131;8868,1135;8863,1138;8857,1140;8850,1140;8846,1139;8842,1138;8840,1135;8841,1133;8841,1129;8839,1127;8836,1126;8832,1127;8831,1129;8831,1132;8833,1134;8837,1136;8946,1312;8948,1310;8949,1308;8949,1305;8947,1303;8944,1302;8941,1303;8851,1082;8858,1087;8864,1091;8876,1100;8882,1104;8887,1108;8891,1113;8901,1123;8905,1128;8909,1133;8911,1138;8914,1144;8915,1149;8915,1153;8932,1167;8928,1164;8923,1162;9261,1195;9260,1197;9261,1199;9263,1200;9266,1201;9268,1200;9270,1198;9271,1196;9269,1194;9267,1192;9565,1051;9568,1052;9571,1055;9571,1058;9569,1061;9566,1062;9562,1062;9559,1059;9559,1056;9559,1053;8979,1220;8967,1222;8965,1222;8962,1221;8960,1219;8960,1217;8962,1215;8974,1212;9023,1320;9014,1330;9009,1336;9254,980;9251,979;9250,976;9251,974;9253,972;9258,972;8899,1113;8904,1108;8910,1102;8916,1098;8920,1093;8926,1089;8930,1086;8933,1087;8935,1088;8938,1091;8942,1092;8945,1091;8947,1090;8948,1087;8946,1084;8942,1083;8937,1083;8934,1084;8877,1184;8876,1181;8876,1179;8879,1177;8882,1177;9006,1108;8993,1115;8979,1123;8972,1128;8968,1130;8966,1134;8965,1137;9261,1070;9293,1050;9396,986;9399,982;9401,977;9404,971;9404,966;5340,789;5367,805;5370,807;5376,814;5377,817;8144,1158;8140,1154;8133,1149;8127,1145;8120,1140;8115,1138;8109,1137;8062,1139;8057,1139;8052,1138;8048,1137;9109,1185;9124,1200;9143,1220;9156,1234;9170,1248;9180,1258;9196,1274;9206,1284;9214,1293;9219,1297;9219,1299;9218,1301;9216,1303;9214,1303;9211,1303;9209,1301;9209,1298;9211,1295;5232,771;8976,1395;8973,1398;8970,1398;8967,1398;8965,1396;8965,1393;8357,1319;8365,1317;8370,1316;8374,1313;8378,1310;8380,1307;8383,1303;8386,1300;8390,1298;8399,1292;8136,1146;8138,1144;8141,1141;8142,1138;8142,1135;8140,1118;8039,1039;8041,1041;8047,1046;8049,1051;8049,1055;8051,1068;8052,1082;8052,1086;8054,1091;8930,1261;8933,1260;8934,1258;8933,1255;8930,1253;8926,1253;8922,1254;7769,1422;7770,1417;7770,1412;7768,1409;7828,1357;7830,1357;7831,1356;7832,1354;7832,1353;7832,1352;7830,1350;7828,1350;7826,1350;7825,1350;7823,1351;7822,1353;7822,1354;7823,1356;7824,1357;7826,1357;8139,1572;8146,1571;8151,1569;8156,1567;8161,1564;8165,1562;8169,1560;8174,1559;8179,1559;8188,1558;7757,1401;7762,1403;7767,1405;7709,1383;7712,1386;7718,1390;7723,1394;7728,1396;7732,1398;7737,1399;7741,1400;7746,1401;7752,1401;7782,1355;7785,1362;7789,1371;7791,1375;7793,1380;7794,1385;7797,1393;7761,1421;7763,1416;7765,1411;7830,1426;7828,1428;7824,1430;7821,1432;7816,1433;7813,1435;7808,1435;7805,1436;8032,1331;8034,1328;8037,1325;8041,1324;8043,1325;8045,1326;8045,1329;8044,1331;8043,1333;8041,1335;8025,1331;8036,1333;9407,547;9406,544;9407,542;9409,541;9413,541;9415,542;9416,545;9415,547;9413,548;8063,1597;8058,1528;8048,1352;8047,1347;8046,1342;8044,1338;8139,1212;8139,1208;8140,1204;8147,1192;8148,1189;8147,1172;8145,1163;9120,1345;9114,1341;9106,1336;9101,1333;9094,1332;9088,1330;9082,1331;9072,1332;9065,1331;9057,1330;9048,1328;9039,1326;9028,1322;9018,1317;9012,1311;9006,1305;9001,1299;8997,1294;8994,1287;8992,1280;8991,1271;8991,1259;8990,1254;8988,1249;8980,1223;8977,1216;8972,1208;8967,1202;8951,1184;9342,960;9341,963;9339,967;9336,970;9310,986;9295,994;9291,996;9285,997;9280,997;9276,996;9270,994;9266,991;9263,987;9261,983;8395,1289;8392,1285;8389,1283;8390,1280;8391,1279;8394,1278;8397,1278;8404,1284;8405,1286;8404,1289;8402,1290;9705,1122;9702,1124;9698,1125;9694,1122;9694,1120;9697,1118;9700,1117;9704,1118;8247,1086;8251,1084;8256,1083;8352,1079;8076,1220;8082,1217;8086,1215;8091,1213;8097,1211;8102,1209;8108,1208;8114,1208;8121,1207;8127,1207;8134,1208;4579,733;4579,678;4577,601;4578,597;4578,592;4591,552;4593,546;7832,1529;7837,1526;7841,1521;7842,1516;7842,1511;7842,1505;7841,1488;7841,1481;7840,1475;7840,1472;7838,1469;7835,1466;7828,1460;7825,1458;7819,1453;7812,1447;7807,1443;8690,1384;8688,1388;8686,1389;8683,1389;8680,1388;8679,1386;8680,1383;8682,1382;8685,1381;8688,1382;8698,1384;8705,1382;8710,1381;8715,1379;8718,1376;8721,1373;8723,1370;8725,1366;8725,1363;8725,1359;8722,1339;8721,1331;8719,1319;8717,1301;8714,1281;8711,1264;8709,1252;8708,1244;8707,1240;8705,1236;8703,1233;8700,1229;8695,1225;8692,1223;8687,1221;8683,1220;8680,1219;8672,1217;8667,1215;8663,1213;8658,1210;8655,1206;8653,1202;8651,1198;8919,1150;8917,1151;8915,1160;8917,1162;8926,1162;8929,1161;8930,1152;8924,1149;8923,1149;8921,1149;7752,1462;7763,1469;7769,1472;7774,1475;7780,1479;7784,1484;7786,1489;7789,1497;7790,1501;7792,1515;7795,1521;7799,1526;7801,1528;7805,1530;7809,1531;7814,1532;7820,1532;7826,1531;7830,1530;8691,1025;8694,1028;8695,1031;8693,1033;8689,1034;8687,1032;8685,1030;8686,1027;5466,668;5467,666;5468,664;5471,663;5474,663;5476,664;5477,666;5478,668;7748,1366;7751,1371;7753,1376;7755,1380;7756,1384;7757,1388;7757,1392;7757,1397;8310,92;8332,104;8351,114;8363,120;8370,124;8375,127;8378,130;8379,133;8379,137;8377,140;8373,143;8354,160;8349,164;8346,168;8344,171;8343,173;8343,176;8344,177;8635,3;8635,9;8635,13;8731,761;8727,761;8725,759;8725,757;8726,756;8729,756;8732,757;8733,758;8282,321;8280,320;8279,318;8280,315;8282,313;8285,313;8288,313;8290,315;8291,317;8291,319;8289,321;8286,322;8269,444;8259,438;8248,431;8234,421;8229,416;8224,410;8222,404;8220,397;8220,391;8222,383;8224,376;8227,369;8231,363;8235,357;8240,351;8247,345;8253,340;8261,335;8269,331;8273,329;8278,326;8534,620;8526,633;8524,637;8521,644;8515,665;8510,676;8505,684;8498,693;8497,696;8496,700;8496,704;8498,716;8499,729;8500,738;8502,743;8506,747;8511,749;8517,751;8525,749;8549,743;8572,737;8578,735;8583,732;8587,727;8590,717;8697,163;8697,160;8695,156;8692,153;8686,151;8682,151;8676,150;8667,150;8662,151;8656,152;8648,155;8642,157;8637,159;8630,162;8624,164;8619,164;8614,164;8610,162;8879,308;8880,312;8880,316;8878,318;8875,317;8874,314;8874,311;8876,309;9124,20;9125,17;9129,14;9131,11;9133,6;9134,2;8924,4;8923,7;8924,13;8927,21;8930,25;8933,27;8937,28;8944,28;8959,28;8974,27;8984,27;8976,161;8983,159;8993,159;9022,158;9046,156;9067,155;9080,155;9088,154;9094,152;9098,150;9102,147;9107,140;9116,127;9120,121;9121,115;9119,110;9118,102;9118,93;9119,81;9120,64;9121,47;9121,32;9121,26;9122,23;8584,200;8587,202;8590,204;8589,208;8586,210;8582,210;8580,207;8580,203;8582,201;8666,0;8654,3;8645,6;8639,8;8799,191;8808,194;8819,197;8831,200;8844,203;8853,206;8860,208;8867,209;8875,210;8883,210;8889,209;8894,205;8907,204;8935,209;8951,211;8955,213;8959,215;8985,233;8988,236;8989,239;8990,243;8989,256;8991,264;8994,284;8996,306;8510,12;8510,7;9123,118;9125,119;9128,121;9125,120;9123,120;8584,193;8584,189;8581,176;8581,173;8885,304;8891,300;8896,296;8900,293;8903,291;8907,290;8911,290;8915,290;8919,292;8922,294;8924,298;8926,306;8926,314;8924,325;8924,331;8923,334;8924,339;8926,343;8929,345;8933,347;8938,348;8943,347;8950,345;8957,343;8964,339;8973,333;8979,329;8987,321;8992,316;8995,310;8592,715;8594,712;8595,708;8594,705;8592,702;8589,701;8586,702;8584,704;8584,706;8585,710;8587,713;8921,1146;8920,1142;8917,1137;8914,1132;8910,1127;8907,1122;8902,1117;8892,1107;8887,1102;8881,1097;8869,1088;8862,1083;8854,1077;8991,63;8992,57;8992,48;8990,42;8988,36;8986,31;8981,19;8979,8;9003,27;9021,27;9038,25;9050,23;9061,23;9072,23;9083,23;9096,22;9106,22;9117,22;9617,373;9614,375;9608,377;9598,378;9570,379;9559,379;9553,381;9550,385;9547,391;9543,400;9540,409;9538,415;9538,421;9539,426;9542,429;9546,432;9554,436;8597,166;8604,165;8609,164;8612,160;8615,155;8618,146;8620,128;8621,121;8623,117;8626,112;8633,107;8640,102;8647,98;8652,96;8663,95;8669,96;8674,97;8680,99;8687,104;8694,107;8702,109;8726,110;8750,111;8771,112;8796,112;8804,112;9554,440;9556,444;9557,447;9559,449;9563,450;9568,450;9571,449;9573,446;9573,443;9568,441;9562,438;7801,1435;7797,1431;7792,1429;7786,1426;7780,1424;7774,1422;7767,1421;7758,1421;7753,1421;7746,1420;7738,1420;7733,1418;7727,1417;7723,1416;7720,1415;7714,1412;7708,1409;7704,1406;7703,1405;7699,1402;7696,1401;7695,1399;7689,1392;7685,1388;7681,1382;8892,1394;8894,1392;8897,1390;8900,1391;8902,1392;8903,1395;8902,1397;8899,1398;8896,1398;8893,1396;8873,1393;8854,1393;8837,1392;8832,1392;8826,1391;8822,1390;8817,1388;8814,1386;8808,1378;8806,1371;8806,1367;8808,1363;8809,1360;8812,1357;8814,1355;8829,1344;8836,1338;8839,1335;8842,1331;8847,1323;8853,1311;8857,1304;8858,1301;8858,1298;8858,1295;8858,1292;8856,1288;8846,1264;8839,1245;8830,1225;8822,1205;8816,1190;8814,1186;8811,1182;8807,1179;8804,1176;8801,1175;8799,1174;8795,1172;8790,1170;8784,1168;8780,1168;8771,1167;8767,1165;8764,1163;8759,1159;8754,1155;8703,1333;8689,1334;8684,1334;8679,1334;8674,1332;8669,1330;8666,1327;8664,1324;8662,1321;8661,1318;8658,1289;8656,1265;8655,1257;8655,1253;8656,1250;8657,1247;8660,1243;8662,1241;8667,1238;8670,1236;8674,1234;8677,1231;8680,1228;8682,1224;9135,122;9142,123;9148,123;9154,121;9159,120;9164,118;9169,114;9172,110;9174,105;9177,101;9181,98;9186,96;9192,93;9196,92;9201,91;9208,91;9215,91;9220,92;9225,94;6731,1312;6732,1283;6728,1139;6732,1145;6736,1152;6739,1156;6742,1158;6746,1159;6752,1160;6798,1160;6840,1145;6801,1152;6794,1140;6787,1132;6782,1125;6773,1110;6759,1090;6751,1078;6742,1068;6715,1026;6713,1023;6711,1021;6708,1021;6651,1270;6662,1270;6672,1271;6681,1273;6694,1276;6708,1279;6721,1282;6746,1284;6757,1284;6777,1283;6813,1283;6841,1284;6854,1284;6872,1284;6918,1266;7219,1267;7232,1273;7242,1278;7262,1286;7275,1290;7286,1293;7310,1297;7322,1298;7350,1299;7375,1299;7391,1297;7399,1295;7406,1292;7413,1289;7149,1331;7160,1338;7171,1344;7197,1356;7208,1361;7222,1365;7236,1370;7249,1373;7263,1376;7275,1379;7287,1380;7301,1382;7316,1383;7345,1384;7357,1384;7368,1384;7381,1383;7392,1383;7411,1380;7430,1376;7444,1372;7450,1370;7455,1368;9741,97;9744,86;9748,73;9752,62;9755,56;9757,52;9759,50;9762,46;9769,42;9793,32;9808,27;9825,22;9841,17;9847,14;9854,10;9860,5;6695,1095;6703,1069;6704,1060;6704,1025;6705,1022;7055,1389;7060,1396;7060,1398;7059,1400;7056,1401;7053,1401;7051,1399;7048,1396;8873,75;8880,77;8890,80;8897,82;8906,83;8911,84;8916,83;8919,82;8930,76;8936,74;8943,74;8948,75;8954,75;8960,77;8966,78;8972,78;8978,77;8984,77;8987,76;7186,1300;7197,1307;7215,1315;7225,1319;7234,1323;7250,1328;7260,1331;7272,1334;7285,1336;7297,1338;7309,1340;7323,1341;7347,1342;7381,1341;7391,1341;7407,1337;7415,1335;7431,1330;7439,1327;9103,902;9098,901;9096,900;9096,898;9097,895;8595,413;8592,400;8594,393;8596,385;8600,380;8606,374;8614,368;8622,364;8634,360;8664,351;8680,346;8688,342;8693,338;8698,332;8702,326;8711,306;8715,296;8719,287;8724,279;8729,272;8733,266;8750,249;8768,229;8776,219;8791,203;8796,196;8801,188;8802,182;8803,174;8803,153;8803,134;8803,82;8804,58;8806,30;8806,11;7316,1440;7317,1412;9288,820;9129,829;9132,829;9134,830;9135,831;9136,833;9134,835;9133,837;9130,836;9127,835;9126,833;9096,793;9093,794;9091,793;9088,792;9087,790;9088,787;9090,786;9093,785;9095,786;9097,788;9092,744;9092,747;9091,748;9088,749;9085,749;9082,747;9082,744;9084,742;9088,741;9096,722;9089,714;9084,708;9081,701;9079,692;9079,686;9079,680;9080,674;9082,670;9082,670;9085,667;9089,665;8638,764;8656,734;8659,724;8659,716;8659,700;8662,691;8666,681;8674,672;8691,653;8705,642;8714,635;8723,628;8732,619;8736,611;8737,603;8735,595;9268,855;9268,859;9266,861;9264,862;9261,863;9257,862;9253,860;9252,857;9254,854;9257,851;9262,850;7250,1184;7252,1188;7260,1196;7267,1203;7263,1207;7248,1223;9184,805;9184,801;9184,796;9093,663;9098,663;9105,665;9110,668;9804,873;9812,855;9814,844;9811,797;9797,609;9793,560;9792,544;9790,535;9182,794;9181,792;9182,790;9184,788;9187,789;9189,790;9189,793;9188,795;9741,122;9743,113;9743,103;9741,95;9740,88;9738,81;9736,76;9730,73;9720,67;9704,60;9695,54;9688,49;9683,42;9673,20;9668,8;6898,1571;9101,893;9104,891;9108,889;9111,886;9113,884;6590,1233;6604,1226;6615,1221;6197,1578;6195,1577;6194,1574;6196,1572;6200,1568;6567,1210;6604,1210;6608,1209;6337,845;6396,847;6420,847;6467,848;6240,810;6226,805;6220,804;6207,799;6193,794;6177,789;6166,784;6151,779;6136,774;6250,817;6259,824;6268,831;6274,835;6281,838;6291,841;6197,615;6195,616;6188,620;6183,624;6170,637;6159,647;6152,652;6144,657;6138,660;6254,725;6258,722;6263,718;6269,715;6276,712;6283,709;6289,707;6293,702;6295,700;6296,698;6299,693;6301,689;6301,683;6301,676;6097,751;6094,756;6141,654;6139,653;6136,652;6133,652;6131,654;6130,656;6130,658;6131,660;6133,662;9109,670;9109,672;9110,674;9113,675;9117,675;9119,673;9120,670;9118,668;9115,667;9792,526;9794,518;9825,422;9826,415;9826,408;9823,401;9819,395;9777,359;9760,346;9750,341;9726,332;9716,330;9708,327;9702,324;9697,320;9107,816;9111,811;9116,806;9119,802;9124,793;9126,789;9127,783;9128,774;9129,768;9128,762;9126,756;9123,751;9120,745;9109,881;9104,875;9100,870;9097,865;9095,859;9094,852;9094,847;9094,842;9095,835;9097,830;9100,825;9258,794;9255,792;9254,790;9255,787;9257,785;9259,785;9262,785;9263,786;9265,788;9265,790;9265,791;6431,701;6425,701;6405,702;6394,702;6384,702;6381,702;6377,702;6371,701;6365,699;6358,695;6352,690;6347,686;6341,683;6336,681;6329,679;6323,677;6317,677;6310,676;7074,1372;7083,1367;7088,1363;6051,713;6053,718;6058,726;6063,731;6069,738;6075,743;6081,748;6088,752;6103,761;6110,764;6116,766;6124,769;6130,772;6533,753;6529,753;6523,753;6517,750;6512,746;6507,739;6504,733;6502,728;6501,722;6501,718;6502,715;6503,712;6506,711;6510,710;6898,1582;6900,1584;6903,1586;6906,1586;6910,1586;7256,1235;7265,1240;7280,1246;7299,1252;7319,1255;7329,1256;7349,1257;7359,1256;7370,1254;7376,1255;7380,1256;7392,1266;6109,738;6105,743;6101,747;7046,1374;7040,1366;7037,1364;7034,1365;7032,1366;7030,1368;7031,1370;7036,1378;6058,711;6063,719;6068,726;6074,734;6081,740;6088,746;6110,758;6118,761;6129,765;6140,769;6150,773;6170,780;6190,786;6206,792;6219,797;6229,801;6234,803;6091,636;6096,632;6101,630;6110,626;9689,219;9687,201;9687,191;9688,185;9690,177;9693,171;9700,163;9711,154;9724,144;6214,1568;6207,1575;6202,1578;6199,1579;6172,588;6175,589;6179,588;6182,586;6183,584;6182,581;6179,580;6176,580;6173,581;6172,583;6171,585;6215,765;6213,759;6212,755;6212,752;6213,750;6216,748;6219,748;6221,749;6223,753;6225,760;6227,767;6227,771;6226,773;6223,774;6220,774;6218,772;6216,770;6216,767;9082,670;9081,670;9080,669;9077,666;9076,663;9079,661;9083,660;9085,661;9088,663;6534,756;6532,748;6532,740;6531,734;6527,726;6522,719;6517,714;6514,712;6520,810;6523,812;6528,812;6533,810;6537,807;6542,805;6547,803;6553,802;6560,801;6563,800;8725,558;8721,544;8717,536;8711,530;8695,517;8685,510;8675,504;8666,498;8653,491;8647,486;8641,481;8625,462;8616,451;8608,438;6985,151;6991,156;7043,186;7068,196;7078,199;7091,203;7120,208;7158,211;7176,215;7184,217;7195,220;7206,224;7216,227;8413,1736;8403,1729;8357,1710;8321,1695;8293,1680;8246,1645;8227,1625;8208,1602;8202,1592;8196,1580;7872,725;7871,720;7869,716;7867,712;7862,703;7852,691;7828,673;7819,667;7809,657;7801,647;7794,634;7790,622;7785,590;7780,575;8103,1262;8085,1247;8061,1225;8048,1214;8037,1203;8007,1167;7945,1118;7923,1100;6301,668;6300,662;6298,657;6295,652;6292,648;6287,644;6263,629;6258,626;6241,616;6236,614;6231,613;6225,612;6219,611;6213,612;6207,613;6201,614;6913,1511;6907,1511;6903,1512;6900,1514;6898,1519;6898,1524;6898,1538;6898,1554;6898,1566;6898,1576;6897,1588;6897,1593;6899,1602;6901,1607;6904,1613;8185,1544;8183,1524;8182,1501;8179,1469;8169,1394;8160,1327;8157,1313;8147,1299;7772,561;7765,552;7763,549;7760,547;7754,542;7751,540;7733,529;7681,498;7553,422;7524,405;7496,390;7234,236;7246,243;7265,254;7278,261;7284,264;7301,275;7316,284;7335,294;7349,303;7365,313;7378,319;7417,1294;7422,1301;7426,1307;7430,1313;7435,1321;7444,1337;7449,1349;7452,1357;7458,1374;7459,1381;7461,1388;7462,1394;7464,1403;6708,12;6775,52;6791,62;6816,76;6828,81;6839,86;6851,89;6877,96;6888,100;6907,107;6919,113;6934,122;6949,131;6966,141;4161,772;7283,1412;7345,1412;7368,1412;7382,1412;7403,1412;7413,1411;7439,1412;7471,1412;7475,1412;7478,1414;7480,1417;7481,1422;7482,1427;7481,1431;7481,1438;7484,1444;7488,1449;7495,1452;7500,1455;4074,1052;3997,1006;7213,219;7201,214;7190,211;7179,208;7161,205;7148,203;7116,201;7101,198;7087,195;7075,192;7061,186;7050,181;7036,173;7025,167;7010,158;6993,148;6129,620;6134,617;7331,286;7296,265;7282,257;7268,249;7242,233;7385,324;7413,342;8611,2062;8597,2030;8581,1995;8563,1958;8542,1912;8536,1899;8522,1872;8493,1811;8484,1795;8478,1788;8472,1783;6126,739;6140,744;6161,751;6200,765;6205,765;6210,766;6940,117;6920,106;6906,99;6893,94;6846,80;6833,76;6818,69;6804,61;6732,18;6718,9;6706,3;4259,1167;4222,1145;4196,1129;4192,1126;4176,1116;4162,1107;4130,1088;4108,1074;4100,1070;4084,1059;4498,1314;4478,1301;4324,1207;4310,1198;7856,887;7854,874;7853,858;7853,848;7854,840;7861,808;7871,762;7873,751;7874,740;7887,1072;7880,1063;7876,1058;7873,1051;7869,1040;7867,1031;7862,980;7860,942;7858,919;4637,1241;4637,1239;4634,1238;4631,1238;4629,1239;4629,1242;4290,1238;4293,1238;4296,1240;4296,1242;4295,1245;4293,1246;4289,1247;4274,1345;4267,1341;4260,1337;4257,1334;4256,1331;4258,1329;3846,1508;3851,1507;3855,1507;3857,1508;3859,1510;3859,1512;3858,1515;3855,1516;3852,1516;3847,1517;4127,1499;4126,1494;4127,1492;4129,1490;4132,1489;4135,1490;4137,1492;4137,1495;4137,1498;4228,1514;4223,1516;4203,1524;4142,1499;4148,1500;4154,1502;4158,1505;4162,1510;4349,1272;4343,1269;4335,1264;4332,1262;4328,1262;4326,1264;4178,1344;4184,1344;4189,1344;4193,1345;4206,1353;4245,1533;4239,1527;4233,1521;4222,1505;4218,1497;4212,1483;4192,1439;4168,1380;4142,1321;4138,1315;4133,1311;4125,1305;4071,1266;4052,1620;4054,1620;4055,1619;4056,1617;4056,1616;4055,1614;4053,1613;4051,1613;4050,1613;4048,1614;4047,1615;4046,1616;4046,1618;4047,1619;4049,1620;4050,1621;2798,1554;2795,1558;2790,1563;2786,1567;2783,1570;2780,1572;2778,1573;2775,1573;2770,1574;2765,1574;2761,1575;2756,1576;2752,1577;2748,1579;2744,1583;2740,1587;2738,1589;2735,1592;2745,1524;2746,1522;2746,1520;2745,1518;2743,1517;2741,1516;2739,1517;2737,1517;2735,1519;2734,1520;2734,1522;2735,1524;2737,1525;2739,1526;2742,1526;2744,1525;4078,1115;4078,1113;4079,1111;4082,1110;4085,1110;4087,1111;4088,1112;4089,1114;2814,1681;2814,1677;3560,1347;3562,1350;3565,1351;3568,1351;3571,1349;3572,1346;3569,1344;3567,1343;3472,1906;3477,1906;3483,1905;3489,1903;3493,1901;3499,1898;3510,1887;3517,1880;3520,1876;3521,1872;3522,1867;3519,1863;3227,1857;3218,1860;3207,1865;3198,1869;3188,1874;3164,1886;3157,1889;3149,1891;3126,1893;3118,1893;3111,1892;3103,1889;3076,1881;3008,1858;2991,1852;2978,1848;2959,1841;2949,1836;2941,1833;2933,1829;2919,1820;2832,1703;2839,1702;2911,1691;2830,1798;2827,1795;2825,1793;2821,1793;2818,1794;2816,1797;2817,1799;2818,1802;2822,1804;3494,2035;3488,2036;3484,2036;3481,2034;3480,2030;3482,2028;3486,2026;3492,2026;2879,1784;2887,1781;2895,1776;2901,1772;2924,1738;2943,1897;2935,1908;2930,1912;2891,1934;2884,1938;3558,1995;3557,2001;3557,2004;3557,2007;3559,2009;3561,2010;3564,2010;3567,2009;3568,2007;3569,2003;3568,2001;3568,1996;3464,1978;3468,1974;3477,1964;3485,1957;3204,1829;3194,1833;3188,1836;3149,1857;4324,1266;4326,1269;4330,1271;4336,1275;4343,1279;3337,1888;3325,1900;3316,1909;3296,1929;3290,1935;2923,1816;2931,1810;2941,1801;2950,1791;2958,1782;2963,1773;2974,1758;2824,1614;2818,1614;2813,1613;2811,1610;2813,1607;2817,1605;2821,1604;2824,1604;4280,1338;4273,1334;4266,1330;4264,1328;4261,1328;4259,1328;3452,2078;3454,2077;3455,2076;3455,2074;3455,2073;3454,2072;3452,2071;3450,2070;3448,2071;3446,2072;3445,2073;3445,2074;3445,2076;3447,2077;3448,2078;3450,2079;3635,1940;3648,1942;3654,1943;3658,1943;3660,1941;3661,1938;3660,1936;3657,1934;3653,1933;3647,1933;3636,1931;3287,1859;3295,1845;3299,1844;3831,1494;3839,1500;3842,1503;3844,1505;3847,1513;3846,1522;3845,1525;3841,1529;3836,1534;3831,1539;3827,1544;3825,1547;3823,1550;3821,1554;3819,1558;3816,1563;3813,1566;2772,1681;2777,1680;2783,1678;2787,1676;2791,1675;2795,1674;2799,1673;2803,1674;2805,1675;2809,1678;4172,1538;4159,1548;4145,1558;4140,1561;4133,1562;4127,1563;4119,1562;4112,1559;4106,1556;4100,1552;4096,1547;4094,1541;4093,1536;4095,1530;4098,1525;4118,1505;4122,1502;4129,1499;4132,1498;2834,1796;2839,1795;2844,1794;2849,1795;2855,1794;2860,1792;2866,1790;4067,1264;4059,1260;4049,1257;4033,1255;4018,1255;3964,1262;3902,1270;3887,1269;3871,1266;3862,1264;3852,1260;3843,1257;3836,1253;3824,1244;3819,1239;3814,1234;3804,1224;3771,1192;3761,1187;2840,1908;2837,1908;2834,1909;2832,1911;2831,1913;2832,1916;2834,1918;3617,1912;3627,1918;3631,1922;3633,1924;3635,1928;3636,1935;3632,1944;3626,1949;3615,1959;3606,1969;3598,1977;3588,1986;3582,1991;3579,1993;3575,1995;3572,1996;3564,1996;3560,1996;3557,1995;3552,1992;3546,1988;3543,1983;3540,1980;3538,1978;2807,1674;2804,1671;3357,2020;3358,2024;3360,2028;3364,2032;3368,2035;3372,2038;3378,2040;3385,2042;3360,1862;3357,1867;3354,1872;3348,1877;3342,1883;2743,1592;2749,1595;2753,1598;2758,1600;2759,1602;2760,1605;2759,1607;2757,1608;2755,1609;2752,1608;2736,1598;2734,1596;2734,1594;2735,1725;2732,1722;2730,1719;2729,1717;2729,1715;2732,1713;2735,1713;2740,1713;2744,1715;3189,1732;3199,1724;3208,1717;3215,1710;3230,1695;3231,1690;3482,2092;3483,2097;3485,2101;3487,2105;3489,2107;3491,2107;3495,2107;3497,2104;3498,2102;3497,2099;3493,2090;3490,1994;3474,1985;3458,1975;3454,1972;3441,1959;3413,1936;3403,1929;3348,1895;3331,1885;3322,1880;3294,1863;3276,1856;3269,1854;3260,1853;3251,1853;3243,1854;2736,1722;2738,1720;2745,1714;2751,1713;2757,1712;2775,1711;2786,1710;2807,1706;2818,1707;2824,1707;2828,1704;2973,1855;2965,1869;2958,1877;3507,2055;3515,2054;3519,2052;3521,2051;3522,2048;3520,2046;3517,2044;3514,2044;3503,2047;3679,1827;3677,1830;3674,1833;3672,1835;3670,1836;3669,1838;3666,1840;3449,1682;3446,1684;3443,1686;3439,1688;3435,1691;3431,1693;3427,1695;3424,1696;3419,1696;2913,1816;2904,1809;2898,1803;2890,1796;2873,1776;2867,1766;2863,1756;2859,1747;2852,1725;2848,1720;3564,1849;3561,1847;3553,1842;3549,1840;3546,1838;3546,1835;3546,1833;3529,1742;3525,1742;3520,1739;3514,1735;3507,1731;3502,1727;3501,1725;3502,1722;3507,1719;3510,1719;3516,1723;3521,1727;3526,1731;3529,1734;3530,1738;3536,1769;3542,1755;3435,1686;3432,1685;3427,1686;3424,1687;3421,1689;3420,1692;3416,1698;3412,1700;3407,1702;3403,1704;3399,1705;3662,1838;3657,1834;3652,1831;3646,1829;3641,1828;3637,1827;3620,1829;3604,1832;3601,1832;3595,1832;3590,1833;3588,1833;3570,1833;3551,1833;3616,1873;3620,1875;3624,1878;3627,1880;3610,1791;3597,1830;3600,1825;3601,1823;3573,1735;3570,1739;3565,1744;3560,1749;3667,1832;3663,1829;3658,1826;3656,1828;3654,1830;3537,1774;3542,1779;3549,1784;3563,1794;3565,1797;3569,1806;3570,1811;3570,1825;3541,1832;3537,1830;3534,1827;3524,1819;3512,1807;3508,1803;3504,1799;3502,1797;3501,1796;3498,1790;3497,1785;3497,1781;3498,1776;3502,1766;3726,1876;3697,1859;3683,1851;3592,1839;3594,1843;3597,1847;3601,1851;3606,1854;3610,1856;3614,1857;3618,1858;3620,1855;3622,1852;3620,1849;3615,1847;3610,1844;3605,1840;3603,1837;3470,1722;3469,1703;3468,1699;3467,1695;3464,1692;3461,1689;3457,1686;3442,1678;3417,1663;3408,1659;3401,1658;3394,1657;3386,1658;3378,1660;3369,1663;3362,1666;3356,1671;3350,1677;3341,1689;3493,1792;3490,1794;3487,1798;3484,1801;3483,1803;3486,1806;3491,1808;3494,1807;3496,1804;3500,1800;3513,2156;3512,2153;3510,2149;3507,2146;3501,2143;3496,2141;3003,2084;2998,2087;2992,2090;2988,2092;2985,2093;2978,2096;2971,2099;3565,1752;3569,1755;3581,1762;3587,1765;3599,1773;3603,1777;3606,1781;3609,1786;3609,1800;3609,1807;3608,1814;3607,1819;3501,2139;3494,2138;3483,2137;2671,2087;2674,2087;2679,2087;2681,2088;2683,2090;2682,2093;2679,2095;2672,2094;3513,2143;3504,2142;2647,2125;2651,2121;2658,2114;2663,2109;2669,2102;2671,2098;2672,2091;2903,2223;2901,2228;2900,2233;2900,2239;2901,2254;3353,2107;3352,2111;3352,2116;3352,2119;3352,2122;3353,2123;2669,2084;2665,2080;2656,2075;2645,2068;2633,2061;2901,2262;2901,2268;2902,2273;2904,2277;3524,2114;3522,2119;3521,2125;3519,2131;3516,2134;3513,2136;3508,2138;2616,2150;2623,2148;2628,2145;2635,2138;2638,2119;2560,2073;2976,2080;2979,2082;2986,2090;3473,2135;3466,2133;3434,2115;3426,2112;3407,2108;3396,2107;3387,2107;3373,2107;3359,2107;3345,2105;3337,2104;3330,2101;3322,2098;3301,2086;3295,2083;3288,2082;3283,2081;3043,2421;3044,2424;3047,2426;3051,2426;3053,2424;3055,2422;3055,2419;3054,2416;3253,2080;3244,2080;3236,2080;3227,2078;3167,2058;3161,2055;3155,2052;3123,2032;3111,2025;3103,2021;3095,2016;3088,2011;3072,1991;3070,1988;3067,1981;3063,1975;3059,1972;3054,1969;3047,1967;3041,1966;3034,1967;3028,1968;3022,1971;3017,1974;3014,1978;3012,1983;3009,1995;3007,2002;3003,2009;2998,2015;2993,2023;2979,2036;2969,2042;2960,2048;2937,2056;2930,2057;2924,2059;2920,2062;2891,2090;2884,2097;2880,2101;2877,2107;2876,2114;2869,2130;2865,2135;2860,2138;2850,2146;2844,2150;2796,2175;2774,2187;2766,2190;2751,2195;3355,2024;3350,2024;3347,2023;3345,2021;3345,2018;3347,2016;3350,2015;3353,2014;2618,2156;2617,2160;2614,2162;2610,2161;2608,2159;2607,2157;2607,2151;3460,1745;3455,1741;3451,1739;3446,1738;3440,1739;3433,1740;3428,1742;3424,1746;3424,1749;3426,1751;3430,1752;3436,1752;3461,1745;3470,1742;2915,2285;2922,2288;2928,2289;2932,2291;2937,2294;2951,2303;2958,2308;2964,2312;2973,2376;2969,2375;2968,2373;2968,2370;2971,2368;2975,2367;3138,2052;3112,2078;3105,2084;3098,2089;3082,2101;3076,2107;3071,2113;3060,2130;3057,2135;3053,2139;3049,2142;3043,2146;3036,2151;3029,2157;3020,2163;3015,2169;3003,2182;3000,2188;2995,2195;2990,2202;2971,2219;2964,2227;2956,2234;2940,2246;2933,2249;2920,2253;2913,2254;2907,2254;2894,2254;2883,2253;2877,2252;2871,2251;2857,2245;2842,2235;2831,2229;2822,2224;2815,2221;2810,2218;2804,2216;2768,2210;2763,2207;2758,2204;2755,2201;2747,2186;2745,2178;2742,2174;2737,2170;2729,2166;2707,2160;2700,2157;2691,2152;2676,2143;3085,2331;3092,2334;3099,2336;3103,2338;3108,2341;3110,2344;3112,2348;3114,2352;3115,2357;3113,2363;3110,2367;3099,2379;3082,2393;3075,2398;3071,2402;3065,2409;3061,2412;3011,2628;3018,2622;3202,2194;3192,2198;3183,2202;3175,2206;3168,2208;3162,2210;3156,2211;3149,2212;3141,2212;3140,2179;3140,2169;3139,2138;3140,2132;3143,2127;3146,2123;3152,2118;3157,2116;3249,2146;3239,2140;3222,2130;3214,2125;3205,2120;3198,2118;3190,2115;3180,2114;3173,2113;3168,2113;3162,2114;3225,2280;3214,2273;3205,2268;3187,2256;3176,2251;3167,2245;3157,2238;3152,2233;3147,2228;3145,2225;3144,2222;3142,2218;3141,2210;3141,2204;3141,2192;3294,2312;3294,2322;3073,2655;3064,2650;3052,2643;3041,2636;3029,2630;3276,2260;3270,2261;3264,2263;3258,2265;3253,2267;3248,2271;3244,2275;3238,2281;2536,2911;2543,2914;2551,2919;2558,2922;2564,2925;2571,2927;2579,2929;2586,2931;2592,2933;2597,2933;2602,2931;2604,2927;1614,2992;1612,2993;1609,2991;1609,2988;1609,2986;1612,2985;1616,2986;1618,2988;1617,2990;2085,2796;2080,2802;2077,2806;2074,2809;2070,2812;2066,2816;2177,2828;2179,2831;2182,2832;2187,2832;2189,2830;2190,2827;2188,2825;2185,2823;2182,2824;2177,2826;2066,2786;2071,2781;2074,2780;2077,2779;2081,2781;2082,2783;2082,2785;2079,2792;2410,2961;2410,2963;2410,2966;2412,2968;2416,2969;2419,2968;2421,2966;2421,2963;2419,2960;2416,2960;2414,2960;1982,2760;1986,2755;1988,2752;1991,2751;1994,2752;1996,2753;1997,2755;1997,2758;1995,2764;2404,2957;2396,2953;2389,2949;2381,2943;2371,2938;2362,2932;2352,2926;2342,2920;2333,2915;2326,2911;2316,2905;2311,2902;2139,2846;2149,2842;2156,2838;2162,2835;2168,2832;2173,2828;2284,2887;2282,2888;2278,2888;2275,2887;2274,2884;2275,2881;2277,2880;2280,2879;2283,2880;2285,2882;2285,2884;2291,2890;2297,2894;2305,2898;1569,3042;1568,3047;1566,3049;1561,3049;1558,3047;1557,3045;1557,3043;1559,3041;1561,3040;1564,3039;1567,3040;2068,3002;2063,3000;2016,2986;3022,2618;3025,2615;3030,2610;3034,2607;3039,2606;1611,3520;1614,3523;1615,3524;1618,3527;1621,3529;1622,3531;1621,3534;1620,3535;1623,3512;1616,3515;1609,3518;1320,3459;1331,3453;1369,3429;1378,3424;1390,3416;1399,3410;1408,3405;1416,3399;1426,3393;1433,3389;1439,3384;1443,3381;1446,3377;1448,3374;1451,3371;1467,3360;1555,3572;1557,3572;1559,3571;1564,3569;1571,3565;1577,3562;1583,3558;1591,3553;1609,3542;1615,3539;1631,3529;1599,3498;1595,3500;1588,3505;1571,3515;1563,3521;1555,3525;1534,3539;1530,3543;1528,3545;1528,3548;1528,3552;1530,3555;1538,3563;1542,3566;1550,3571;1552,3572;1837,3034;1926,2949;1934,2941;1874,3326;1883,3322;1896,3313;1997,2981;1989,2976;1629,3297;1633,3289;1641,3277;1650,3268;1663,3257;1913,3102;3044,2607;3049,2608;3056,2611;3063,2616;3072,2620;3080,2625;3088,2630;2024,2970;2028,2962;2031,2954;2035,2946;1940,2936;1948,2927;1955,2920;1992,3024;2000,3017;2004,3010;2008,3003;1817,3191;1833,3182;1840,3177;1848,3171;1374,3476;1375,3475;1381,3472;1388,3467;1394,3463;1400,3459;1404,3456;1423,3445;1446,3430;1453,3426;1458,3422;1464,3419;1470,3415;1476,3411;1486,3404;1492,3401;1498,3397;2064,2818;2062,2820;2058,2820;2056,2818;2054,2816;2056,2813;2058,2812;2061,2811;2065,2812;1723,3169;1721,3173;1717,3174;1714,3172;1714,3170;1714,3167;1955,2767;1956,2768;1956,2771;1955,2773;1953,2774;1949,2774;1946,2772;1945,2770;1947,2767;1950,2766;1953,2765;2599,2923;2588,2917;2579,2912;2571,2907;2566,2903;2561,2902;2556,2901;2550,2901;2544,2901;2538,2902;2534,2904;1608,3517;1604,3513;1600,3510;1597,3506;1594,3505;1868,3072;1893,3215;1878,3232;1870,3237;1865,3239;2043,3327;2039,3320;2037,3312;2036,3305;2036,3298;2036,3292;2044,3273;2055,3252;2057,3244;2059,3236;2058,3229;2057,3221;2053,3215;2049,3209;2044,3203;2040,3197;2037,3190;2202,2896;2201,2893;2195,2888;2187,2884;2179,2880;2170,2875;2162,2870;2157,2867;2154,2864;2150,2860;2146,2856;2142,2851;2134,2842;2129,2836;2123,2829;2118,2823;2112,2817;2106,2811;2100,2806;2095,2802;2088,2798;2074,2790;2070,2787;2059,2784;2050,2781;2039,2778;2028,2774;2017,2771;2007,2768;2001,2766;1990,2762;1986,2760;1978,2760;1973,2761;1968,2762;1963,2764;1959,2765;2891,2683;2904,2690;2193,2977;2200,2972;2207,2969;2214,2966;2220,2964;2225,2963;2232,2962;2241,2961;2249,2959;2256,2957;2264,2951;2272,2944;2278,2936;2284,2930;1618,3388;1640,3373;1648,3364;1376,3478;1377,3480;1377,3483;1377,3486;1374,3487;1370,3487;1367,3486;1366,3483;1366,3481;1368,3480;2296,2917;2302,2911;2306,2906;1927,3394;1939,3408;1943,3410;1947,3412;1953,3414;1960,3415;1967,3414;1974,3412;1979,3409;2030,3378;2035,3375;2041,3371;2045,3366;2048,3360;2050,3353;2049,3347;2048,3340;2036,3156;2033,3159;2030,3161;2025,3162;2018,3163;2013,3162;2035,3176;2034,3170;2035,3165;2035,3159;2040,3145;2044,3138;2048,3131;2054,3122;2061,3115;1664,3345;1668,3339;1673,3331;1676,3323;1680,3318;1685,3313;1702,3301;1712,3293;1723,3286;2114,2703;2113,2706;2110,2709;2106,2710;2103,2709;2100,2707;2101,2703;2103,2701;2108,2700;1679,3035;1671,3031;1663,3027;1656,3024;1651,3022;1645,3019;1640,3015;1634,3010;1628,3006;1621,3001;1617,2997;1322,3462;1321,3464;1319,3466;1316,3466;1312,3466;1310,3463;1310,3461;1313,3458;1316,3458;1318,3458;1619,3519;1629,3514;1860,3239;1854,3240;1845,3237;1836,3234;1825,3230;1812,3226;1801,3222;1790,3219;1782,3217;2285,3105;2279,3112;2268,3123;1748,3262;1754,3254;1759,3247;1765,3239;1772,3229;1786,3212;1790,3208;1796,3203;1803,3199;2230,3165;2221,3165;2205,3164;2187,3163;2172,3161;2153,3160;2137,3159;2124,3158;2110,3156;2213,3104;2195,3093;2169,3078;2248,2996;2234,3011;2221,3023;2199,3047;2187,3060;2177,3070;2253,3139;2219,3107;2225,3099;2233,3091;2241,3082;2236,3079;1807,3475;1815,3482;1820,3487;1826,3494;2136,3129;2129,3136;2119,3146;2114,3151;2247,3124;1757,3498;1757,3500;1761,3504;1765,3508;1768,3512;1775,3518;2259,3048;2273,3034;2280,3026;2287,3019;2231,3077;2221,3088;2186,3140;1098,3341;1090,3341;1084,3341;1079,3341;1076,3339;1327,3309;1208,3413;1752,3498;1749,3496;1746,3494;1745,3492;1747,3490;1750,3489;1754,3489;3351,2245;3347,2238;3345,2231;3345,2224;3345,2219;3346,2215;3348,2211;3365,2192;2766,2987;2749,2976;2738,2969;2729,2964;2723,2970;2717,2978;2712,2984;2704,2993;2701,2995;2696,2997;2690,2999;2685,2999;2980,2517;2985,2518;2989,2517;2991,2515;2991,2512;2989,2510;2987,2509;2983,2509;1113,3356;1106,3352;1102,3348;1099,3344;2201,2672;2194,2670;2189,2670;2183,2670;2176,2672;2171,2675;2165,2680;2161,2684;2156,2690;2152,2693;2147,2698;1672,3042;1664,3050;1653,3059;1643,3066;1635,3073;1620,3082;1358,3192;1349,3185;1336,3172;1325,3164;1321,3163;1318,3163;1314,3164;1307,3168;1299,3172;2156,3091;2144,3105;2128,3123;4539,1715;4169,1663;4145,1649;4139,1644;4132,1635;1950,2896;1939,2892;1929,2889;1920,2887;1910,2886;1902,2885;1890,2885;1881,2886;1872,2887;1861,2890;1852,2892;1840,2897;1827,2903;1815,2908;1790,2920;1774,2927;1763,2933;1751,2939;1743,2945;1731,2956;1726,2962;1720,2971;1709,2993;1703,3004;1697,3013;4545,1709;4556,1699;4284,1667;4291,1662;4299,1653;4306,1645;4311,1640;4312,1638;1296,3272;1299,3272;1302,3270;1301,3268;1299,3266;1296,3265;1293,3267;5355,2207;4279,1556;2540,2366;2534,2368;2525,2373;2514,2379;2496,2388;2482,2395;2473,2401;2456,2409;2436,2419;2419,2427;2404,2434;2390,2440;2381,2445;2372,2451;2365,2455;2357,2458;2352,2461;2346,2462;2341,2461;2336,2459;2329,2456;2323,2452;2318,2446;2206,2763;2198,2762;2190,2761;2182,2759;2174,2756;2169,2753;2162,2749;2158,2745;2154,2741;2150,2735;2146,2729;2144,2722;2143,2717;2142,2710;2479,2865;2472,2856;2464,2847;2451,2833;2443,2825;2434,2817;2427,2811;2417,2805;2409,2800;2397,2795;2382,2789;2362,2781;2352,2777;2343,2773;2335,2769;2330,2765;2324,2760;2318,2755;2314,2750;2312,2746;2311,2741;2309,2736;2827,3023;2813,3016;2805,3010;2786,2999;2887,2620;2882,2619;2876,2617;2870,2614;2859,2609;2851,2603;2836,2594;2820,2584;2769,2495;2763,2492;2753,2486;2743,2480;2733,2474;2721,2466;2707,2458;2694,2450;2673,2437;2654,2426;2642,2419;2628,2410;2614,2402;2603,2395;2592,2389;2574,2377;2565,2372;2556,2367;2551,2365;2546,2365;4145,1707;4141,1706;4068,1661;1391,3354;1405,3345;1412,3340;1416,3335;1419,3330;1423,3325;4963,2205;4967,2205;4971,2208;4973,2210;4974,2213;4974,2215;4972,2218;4969,2220;4965,2220;3199,3005;3137,2884;3136,2879;3133,2876;3129,2874;3125,2875;3121,2876;3118,2879;3117,2882;3118,2886;3309,2875;3318,2871;3326,2867;3331,2865;3335,2864;3339,2864;3344,2865;3358,2873;3431,2918;3188,2866;3187,2861;3182,2857;3152,2839;3141,2832;3669,2903;3417,2752;3701,2869;3571,3003;3581,2994;3588,2986;3597,2977;4036,3088;4016,3081;3723,3094;3278,2904;3284,2897;3291,2889;3298,2883;3303,2878;3306,2877;3400,2951;3763,3027;3767,3021;3767,3017;3764,3013;3636,2937;3163,2701;3163,2696;3166,2686;3169,2679;3172,2669;3681,2858;3449,2719;3510,3066;3520,3057;3528,3048;3537,3039;3546,3029;3558,3017;3113,2815;3104,2810;3097,2804;3092,2799;3086,2795;3364,2824;3350,2816;3610,2964;3619,2955;3627,2947;3390,2780;3398,2772;3258,2905;3238,2893;3229,2888;3220,2883;3213,2881;3205,2879;3198,2878;3101,2947;3087,2938;3061,2923;3041,2911;3036,2906;3034,2901;3032,2896;3032,2891;3029,2887;3025,2884;3014,2876;3001,2869;3907,2995;3903,2990;3898,2987;3890,2982;3867,2968;3835,2949;3810,2934;3777,2914;3748,2897;3726,2884;3165,2654;3156,2649;3147,2644;3140,2639;3135,2636;3466,2938;3487,2951;3496,2957;3502,2962;3509,2967;3516,2971;3528,2979;3377,2976;3383,2968;3389,2961;3395,2955;3181,2878;3148,2882;3106,2886;3093,2886;3051,2886;3044,2887;3037,2889;3975,2918;3890,3032;3890,3035;3888,3036;3883,3036;3880,3034;3879,3032;3879,3028;3636,2700;3622,2702;3614,2702;3607,2701;3601,2699;3495,2635;3491,2632;3488,2628;3485,2624;3472,2596;3409,2614;3398,2617;3387,2620;3382,2620;3378,2620;3374,2619;3370,2617;3354,2607;3341,2599;3265,2553;3248,2543;3221,2527;2867,2549;2874,2544;2879,2540;2887,2537;2895,2537;2901,2538;2910,2544;2921,2549;2928,2553;2936,2554;2944,2552;2951,2549;2961,2539;2968,2532;2977,2522;3320,2530;4003,2880;3989,2872;3943,2845;3910,2824;3895,2816;3880,2806;3865,2798;3819,2771;3806,2762;3783,2749;3710,2705;3700,2700;3694,2698;3688,2697;3683,2696;3678,2696;3350,2500;3349,2496;3349,2493;3352,2491;3355,2491;3357,2492;3358,2495;3359,2498;3853,2727;3855,2733;3856,2736;3858,2737;3154,2597;3995,2664;3981,2656;3901,2608;3898,2605;3896,2601;3897,2594;3900,2583;3438,2294;3468,2586;3464,2578;3461,2571;3450,2556;3441,2547;3432,2542;3408,2528;3396,2520;3381,2511;3362,2500;3356,2498;3353,2498;3655,2690;3654,2685;3652,2680;3649,2676;3647,2672;3643,2668;3533,2603;3524,2597;3513,2590;3509,2589;3504,2588;3499,2589;3638,2443;3630,2440;3620,2436;3610,2430;3590,2417;3579,2411;3569,2405;3558,2399;3548,2393;3540,2388;3525,2378;4103,2843;4105,2840;4111,2838;4119,2835;4125,2831;4131,2826;4137,2819;4142,2813;3528,2314;3543,2324;3581,2347;3604,2361;3620,2371;3651,2390;3665,2398;4187,2843;4185,2839;4181,2836;4175,2833;4164,2826;4151,2818;4129,2806;4121,2801;4115,2797;4110,2793;4107,2789;4107,2783;4108,2778;4109,2774;4111,2769;4251,2802;4239,2796;4227,2789;4209,2779;4197,2772;4190,2769;4182,2768;4174,2767;4167,2766;3728,3110;3723,3115;3722,3118;3723,3122;3725,3125;3732,3129;3743,3136;3756,3144;3759,3145;3773,3154;3789,3163;3805,3173;3811,3176;3817,3180;3826,3185;3436,2975;3433,2971;3429,2967;3364,2929;3352,2922;3343,2917;3337,2913;3329,2905;3325,2900;3320,2891;3314,2882;3464,2598;3455,2600;3331,2806;3171,2710;3166,2706;4050,2706;4059,2704;4067,2704;4076,2704;4086,2706;4093,2710;4103,2715;4118,2724;4134,2734;4144,2741;4151,2744;4158,2748;4162,2752;4164,2756;4166,2760;3417,2606;3411,2592;3409,2588;3407,2585;3404,2582;3401,2579;3393,2574;3905,2568;3908,2559;3910,2549;3910,2546;3907,2543;3896,2536;3873,2522;3843,2505;3830,2497;3807,2483;3780,2467;3767,2459;3736,2441;3727,2436;3713,2428;3694,2415;3051,2969;3038,2961;3020,2951;3000,2939;2995,2936;2993,2932;2992,2928;2989,2924;2983,2920;2970,2913;2963,2909;2390,2268;2380,2262;2364,2253;2350,2245;2335,2235;2322,2228;2308,2220;2295,2212;2281,2204;2270,2197;2258,2190;2247,2183;2234,2175;2221,2167;2210,2161;2198,2154;2181,2143;2167,2135;2150,2125;2139,2118;2126,2111;2115,2104;2103,2097;2088,2088;2076,2081;2062,2073;2050,2065;2039,2059;2028,2052;2018,2046;2005,2038;1992,2030;1981,2024;1969,2017;1954,2008;1941,2000;1929,1993;1916,1985;1907,1980;1896,1973;1886,1967;1875,1961;1865,1954;1852,1947;1840,1939;1828,1932;1815,1924;1803,1917;1793,1911;1781,1904;1770,1897;1761,1892;1749,1885;1738,1878;1726,1871;1715,1864;1703,1857;1684,1846;1667,1836;1650,1825;1636,1816;4149,2870;4160,2863;4169,2857;4178,2852;4184,2848;2314,2441;2312,2437;2311,2430;2312,2422;2316,2415;2321,2407;2327,2399;2334,2390;2341,2380;2348,2371;2355,2362;2361,2353;2366,2343;2372,2331;2376,2321;2382,2310;2387,2299;2391,2291;2394,2286;2395,2282;2396,2278;2396,2275;2394,2272;4100,2790;4094,2791;4089,2793;4084,2795;4078,2801;4070,2809;4062,2817;4055,2824;4048,2829;4042,2831;3886,3029;3882,3029;3875,3026;4095,2375;4086,2384;4078,2392;4071,2400;4063,2407;4058,2413;4049,2421;4043,2429;4035,2436;4023,2449;3804,2268;3797,2276;3778,2296;3777,2299;3624,2191;3616,2186;3608,2182;3590,2171;3578,2163;3569,2158;3560,2153;3547,2147;3832,2326;3832,2321;3834,2316;3836,2311;3845,2300;3850,2296;3862,2284;3868,2279;3872,2273;3875,2267;3876,2261;3876,2256;3874,2242;3874,2235;3876,2229;3880,2222;3886,2217;3893,2210;3908,2196;3925,2178;3931,2174;3937,2171;3573,2239;3559,2230;3544,2222;3522,2209;3507,2202;3796,2262;3789,2259;3782,2257;3775,2256;3766,2257;3749,2257;3739,2256;3733,2255;3726,2253;3719,2249;3702,2239;3673,2221;3657,2211;4131,2338;4122,2347;4113,2358;4104,2366;4086,2295;4075,2288;4060,2279;4048,2272;4039,2266;4031,2261;4024,2257;4019,2255;4014,2254;4305,2191;4300,2191;4296,2191;4294,2193;4151,2768;4141,2769;4130,2770;4121,2769;4104,2767;4097,2763;4088,2757;4077,2751;4060,2739;4053,2732;4047,2725;4041,2716;4003,2077;3977,2061;3953,2047;3936,2037;3922,2028;3908,2020;3892,2010;3875,2001;3862,1993;3846,1983;3840,1979;3836,1975;3831,1968;3827,1959;3822,1949;4294,2197;4293,2194;8886,3662;6768,3577;6755,3576;6650,3564;6390,3539;6277,3528;6232,3524;6077,3514;7809,3644;7703,3641;7569,3637;7505,3636;7500,3635;7457,3633;7421,3630;7297,3622;7073,3608;7007,3602;6979,3599;6973,3599;6889,3590;5853,3484;5489,3446;5480,3445;4815,3376;4646,3361;4492,3346;4473,3343;4459,3339;4058,2353;4064,2357;4072,2362;4080,2366;4088,2371;8467,3659;8412,3659;8369,3656;8326,3648;8321,3648;3814,1934;3810,1929;3805,1924;3795,1918;3784,1911;3772,1904;3759,1897;3748,1890;3945,2290;3950,2291;3956,2293;3995,2316;5567,3419;5579,3420;5587,3421;5623,3428;5637,3430;5647,3429;5660,3427;5674,3422;3972,3124;3963,3133;3944,3153;3931,3164;3920,3173;3907,3181;3884,3192;3798,3232;3785,3237;3770,3240;3753,3244;3734,3244;3715,3242;3682,3236;1787,3627;1803,3628;3545,2273;3540,2268;3535,2264;3532,2258;3531,2250;3532,2242;3535,2234;3539,2228;8147,3873;8145,3886;8136,3953;8142,3990;8152,4024;8922,3721;8925,3713;3887,2316;3839,2289;3827,2282;3817,2276;8239,3644;8217,3644;8204,3643;8146,3642;8142,3642;8111,3642;8080,3646;8058,3649;3758,1986;3748,1987;3740,1987;3734,1986;3727,1983;3713,1974;3705,1970;3697,1965;5326,3430;5239,3423;5211,3419;5180,3415;5150,3411;5102,3406;5074,3404;7753,2552;7334,3010;7754,2544;7753,2537;7745,2510;7358,2471;6578,2145;6638,1416;6638,1407;6638,1395;6637,1388;6632,1371;6629,1365;6626,1356;6624,1348;6624,1314;6626,1305;6629,1297;6637,1280;6357,1939;6353,1940;6350,1938;6350,1935;6352,1933;6355,1932;6358,1934;6360,1935;5963,1829;5969,2085;5966,2088;5963,2090;5959,2093;5954,2096;5950,2097;4906,1672;6351,1763;6344,1771;5907,2148;5908,2146;5910,2144;5913,2144;5916,2146;5917,2148;6338,1752;6345,1758;6356,1766;6362,1768;6370,1772;6377,1773;6386,1773;6405,1773;6425,1774;6450,1774;6466,1773;6491,1774;6502,1774;6527,1773;6547,1772;6556,1772;6572,1772;6587,1775;4587,1667;4595,1658;4615,1639;4625,1630;4632,1622;4638,1616;4647,1608;6060,1966;6066,1965;5910,2046;5913,2047;5915,2049;5916,2052;5914,2053;5911,2054;5908,2053;5904,2052;4937,1634;4886,1603;4856,1585;4844,1578;4823,1565;4660,1576;4648,1569;4635,1562;4628,1556;4611,1546;4592,1535;4523,1493;4768,1590;4744,1575;4693,1544;4668,1529;4665,1527;4661,1527;4657,1527;4653,1529;6309,1985;6306,1981;6303,1975;6298,1946;6295,1923;6286,1879;6285,1868;6285,1800;6284,1794;4484,1526;4490,1528;4498,1531;4507,1537;4520,1544;4533,1553;4547,1561;4560,1570;4574,1577;4587,1586;4603,1595;4613,1913;4609,1912;6639,1264;6637,1257;6633,1249;6623,1232;6603,1199;6602,1196;6600,1195;6598,1193;6594,1193;6586,1193;6582,1192;6580,1190;6578,1187;6578,1172;6108,1815;6130,1815;6144,1813;5080,1771;6285,1717;6285,1681;6286,1666;6277,1634;6276,1624;6276,1615;6273,1606;6272,1601;9742,1173;5338,1094;5359,1073;6119,1215;4804,1554;4775,1537;4753,1523;4739,1514;4714,1499;4703,1492;4700,1489;4697,1487;4698,1484;4700,1481;4704,1478;4726,1454;4781,1394;4863,1490;5474,2017;5475,2019;5474,2021;5472,2022;5469,2022;5467,2021;5466,2019;4854,1246;4854,1243;4855,1228;4855,1216;4893,1462;4806,1408;4922,1434;4948,1400;5119,1475;5097,1447;5057,1421;5045,1412;5041,1404;5044,1393;5079,1358;5076,1347;4895,1239;4887,1235;4881,1232;4874,1230;4864,1229;4807,1235;4798,1237;4793,1239;4784,1248;5187,1701;5195,1696;5225,1693;5239,1695;5271,1677;9759,1141;9765,1132;9767,1128;9770,1117;9774,1104;9774,1092;9773,1080;9765,1011;9764,1006;9763,992;9761,979;9760,964;9763,951;9768,940;6656,290;6653,297;6652,301;6651,307;6651,312;6650,318;6648,324;6646,330;6642,335;6638,340;6634,344;6621,360;6751,1007;6732,977;6439,522;6382,435;7260,1921;7258,1912;5437,2145;5439,2146;5909,2237;5927,2239;5968,2241;5982,2241;6000,2239;6015,2238;6033,2234;6047,2231;6067,2226;6078,2221;6105,2210;6132,2196;6215,263;6218,263;6221,262;6223,261;6223,258;6221,256;6218,255;5102,894;5115,880;5127,868;5143,853;5151,850;6022,898;6023,896;6026,894;6029,894;6032,895;6033,898;5527,1038;5533,1033;5540,1029;5546,1025;5554,1023;5561,1022;5568,1022;5574,1024;5580,1027;5596,1037;5610,1046;5629,1057;5653,1071;5670,1081;5687,1092;5700,1099;5715,1108;5731,1118;5742,1124;5747,1125;6136,240;6135,237;6135,234;6137,232;6140,232;6143,233;6145,235;6145,238;6144,240;8865,2915;8864,2874;8867,2857;8810,2755;8810,2758;8812,2761;8816,2762;8819,2760;8821,2758;8820,2755;8817,2753;8760,2905;8761,2902;8765,2901;8771,2900;9419,2669;9312,3166;9315,3170;9319,3170;9324,3169;9327,3165;9449,3674;9474,3677;9495,3679;9509,3677;9531,3673;9557,3673;9878,3730;9878,3746;9877,3762;9862,3793;9860,3798;8147,3649;8154,3649;8186,3651;8194,3651;8212,3654;8227,3654;8244,3652;8035,3649;8180,3654;8165,3634;8158,3640;8161,3651;8168,3654;8858,3674;8859,3671;8862,3669;8864,3667;8190,3641;8185,3637;8182,3633;8962,3664;8853,3666;8880,3669;8902,3671;8916,3670;8638,3659;9169,3668;8261,3648;8296,3648;8306,3649;8311,3649;9809,3744;9788,3749;9778,3756;9777,3766;9778,3778;9786,3784;9797,3788;9818,3789;9832,3788;9850,3789;9878,3799;8928,3666;8948,3666;8299,3643;8277,3643;9115,4038;9118,4039;9129,4039;9133,4037;9135,4034;9135,4030;9134,4027;9130,4025;9126,4027;9123,4032;9120,4036;9114,4038;9104,4038;9090,4034;9069,4026;9097,3898;9090,3907;9084,3921;9088,3978;9086,3990;9084,3999;9081,4007;9077,4016;9074,4021;9071,4024;8822,3897;8801,3927;8800,3931;8800,3958;8800,3988;8802,3991;8805,3993;8807,3994;8877,4091;8877,4102;8882,3946;8859,3955;8849,3957;8837,3958;8917,3972;8914,3978;8911,3983;8908,3986;8902,3989;8888,3994;8882,3996;8864,3997;8814,3996;8976,4088;9019,3936;8998,3958;8982,3972;8965,3985;8953,3993;8924,4025;8926,4038;8967,4011;8896,4035;8887,4036;8854,4036;8822,4034;8756,4034;8753,4034;8740,4044;8750,4019;8747,3787;8746,3780;8727,3756;8718,3744;8717,3730;9059,4032;9055,4034;9051,4035;9039,4036;9029,4037;9009,4037;8992,4034;8983,4031;8976,4025;8964,4005;8956,3995;8948,3988;8941,3981;8912,3970;8894,3957;8870,3925;8854,3912;8799,3886;9002,3921;9031,3947;9034,3950;9036,3953;9040,3983;9039,3988;9031,3998;9030,4002;9029,4009;8238,3839;8250,3839;8267,3838;8280,3832;8292,3825;8302,3819;8309,3818;8317,3816;8327,3817;8343,3819;8354,3822;8372,3824;8395,3824;8424,3821;8454,3819;8467,3820;8473,3821;8476,3825;8481,3830;8483,3838;8487,3868;8485,3882;8483,3886;8480,3890;8475,3893;8468,3896;8462,3898;8449,3897;8433,3894;8394,3890;8369,3890;8344,3891;8297,3895;8259,3896;8251,3894;8243,3890;8239,3886;8236,3881;8237,3876;8235,3867;9051,4100;9059,4098;9087,4098;9184,4098;9201,4095;9209,4093;9266,4093;8884,3836;8865,3902;7150,3837;7118,3854;7109,3857;7104,3860;7098,3866;7090,3885;7087,3891;7083,3895;7078,3897;7061,3905;8812,4094;8807,4089;8804,4084;7359,3814;7365,3810;7370,3804;7371,3795;7364,3772;7363,3758;7364,3743;7366,3732;7372,3701;7152,3761;7151,3766;7150,3773;7148,3778;7144,3782;7140,3785;7132,3786;7124,3788;7113,3793;7105,3801;7055,3823;7051,3826;7042,3844;7034,3863;7034,3868;7038,3874;7082,3932;7087,3942;7084,3955;7185,3898;7429,3753;7431,3718;7439,3709;7458,3703;7493,3841;7471,3840;7492,3864;7493,3839;7494,3763;7494,3728;7488,3713;6631,4044;6667,4022;6673,4018;6689,4011;6780,3982;6797,3975;6821,3963;6856,3940;6952,3874;6880,3800;6966,3779;6968,3776;6850,4033;6859,4003;6873,3957;6590,3980;6591,3981;6605,3992;6612,4002;6615,4010;6619,4023;6623,4032;6590,3976;6591,3977;6591,3978;6590,3979;6589,3981;6587,3981;6585,3981;6583,3981;6581,3979;6581,3977;6581,3976;6582,3975;6583,3974;6585,3974;6587,3974;6589,3975;6589,3975;7040,3986;7024,3957;6996,3919;7462,3967;7463,3968;7463,3969;7463,3970;7462,3971;7461,3972;7459,3972;7458,3973;7456,3972;7454,3970;7454,3969;7454,3968;7455,3967;7456,3966;7457,3965;7460,3965;7461,3966;7462,3966;7330,3814;7316,3810;7303,3811;7289,3814;7273,3816;7261,3814;7250,3807;7249,3801;7251,3773;7255,3748;7257,3738;7256,3724;7256,3714;7255,3691;9814,2531;9815,2537;9945,2511;9964,2515;9973,2515;9980,2512;9989,2507;9992,2502;9990,2390;9971,2348;9957,2620;9952,2624;9943,2630;9935,2635;9933,2637;9930,2639;9926,2642;9926,2646;9926,2649;9929,2653;9933,2654;9939,2654;9942,2651;9942,2644;9938,2640;9927,2600;9914,2602;9908,2604;9904,2608;9903,2611;9908,2613;9913,2612;9918,2609;9923,2605;9987,2623;9988,2629;9988,2635;9985,2642;9984,2647;9985,2650;9989,2653;9994,2651;9999,2633;9995,2630;9898,2409;9881,2407;9861,2398;9855,2392;9844,2370;9837,2358;9831,2353;9824,2351;9817,2351;9803,2352;9789,2356;9754,2366;9743,2371;9657,2421;9554,2268;9555,2284;9553,2297;9549,2307;9538,2314;9531,2316;9511,2317;9456,2237;9456,2239;9456,2240;9451,2242;9449,2241;9447,2240;9446,2239;9446,2238;9446,2237;9447,2236;9448,2235;9450,2234;9452,2234;9453,2234;9455,2235;9456,2236;9321,2034;9327,2040;9337,2051;9348,2058;9359,2063;9370,2066;9396,2075;9407,2084;9421,2101;9425,2124;9429,2135;9437,2143;9468,2166;9485,2173;9500,2179;9524,2185;9536,2191;9591,2217;9631,2228;9684,2227;9709,2220;9718,2148;9663,2140;9630,2129;9719,2050;9703,2053;9688,2059;9656,2084;9655,2093;9663,2116;9664,2125;9664,2137;9322,2423;9322,2413;9313,2400;9305,2387;9278,2344;9276,2327;9293,2237;9137,2041;9135,2047;9130,2056;9118,2066;9108,2070;9099,2073;9091,2074;9046,2074;9039,2074;9034,2074;9028,2077;9161,1922;9161,1921;9161,1919;9161,1918;9159,1917;9158,1916;9156,1916;9154,1917;9153,1918;9152,1919;9152,1921;9153,1922;9154,1923;9156,1924;9158,1924;9159,1923;9205,2145;9197,2135;9189,2130;9166,2122;9157,2121;9091,2121;9088,2275;9089,2307;9085,2324;9062,2348;9051,2353;9041,2355;8932,1980;8926,1973;8921,1973;8914,1972;8873,1990;8869,1997;8872,2004;9136,2381;9132,2389;9136,2423;9190,2294;9192,2294;9229,2294;9175,2420;9161,2387;9188,2332;9186,2346;9179,2360;9172,2369;9325,1869;9334,1864;9345,1856;9354,1843;9003,1955;9004,1954;9005,1953;9005,1951;9005,1949;9004,1948;9002,1947;9000,1947;8998,1948;8996,1949;8995,1950;8995,1952;8995,1953;8997,1954;8999,1955;9001,1955;8945,1762;8962,1745;9217,1831;9218,1733;9870,2515;9869,2523;9863,2531;9857,2535;9833,2541;9825,2543;9819,2541;9816,2538;9335,1982;9327,1972;9322,1959;9323,1947;9325,1937;9334,1919;9337,1911;9337,1903;9334,1885;9328,1872;9313,1856;9266,1834;9243,1831;9183,1829;9154,1824;9133,1825;9114,1831;9092,1838;9085,1843;9211,1875;9211,1877;9211,1878;9209,1879;9206,1880;9204,1879;9202,1878;9202,1877;9201,1876;9202,1875;9202,1874;9203,1873;9205,1872;9209,1873;9210,1874;9211,1874;9110,1876;9110,1878;9110,1879;9108,1881;9106,1881;9103,1881;9101,1879;9101,1879;9101,1878;9101,1876;9102,1875;9102,1874;9106,1874;9108,1874;9109,1875;9110,1876;9785,2580;9777,2574;9769,2565;9764,2557;9760,2549;9760,2542;9763,2524;9795,2407;9797,2382;9781,2342;9747,2283;9716,2235;9711,2196;9713,2175;9717,2157;9720,2139;9720,2121;9717,2098;9700,2072;9675,2046;9222,1728;9222,1730;9222,1731;9221,1733;9215,1733;9213,1731;9213,1731;9213,1730;9213,1728;9214,1727;9215,1726;9216,1726;9218,1726;9220,1726;9221,1727;9222,1728;9165,1728;9166,1730;9165,1730;9164,1732;9158,1732;9156,1731;9156,1730;9156,1729;9156,1728;9157,1726;9158,1726;9159,1725;9161,1725;9163,1725;9164,1726;9165,1727;8622,2178;9514,1821;9546,1838;9559,1851;9564,1859;9569,1868;9572,1882;9578,1891;9584,1901;9592,1911;9611,1930;9638,2314;9633,2326;9624,2331;9610,2338;9471,2380;9457,2380;9092,1783;9024,1783;9011,1785;8995,1787;8378,2441;8383,2450;8384,2456;8385,2462;8364,2218;8241,2217;8233,2218;8227,2221;8224,2229;8222,2235;8220,2265;8220,2271;8218,2277;8215,2282;8574,2357;8582,2351;8590,2341;8593,2334;8593,2321;8591,2313;8586,2306;8570,2296;8552,2293;8492,2289;8469,2289;8462,2291;8457,2294;8455,2300;8456,2304;8459,2315;8460,2323;8461,2333;8463,2338;8469,2347;8478,2357;8491,2364;8380,2269;8329,2268;8316,2268;8363,2446;8362,2449;8363,2452;8365,2454;8369,2455;8373,2454;8507,2461;8505,2435;8505,2428;8505,2422;8508,2417;8514,2408;8515,2402;8516,2394;8512,2387;8501,2379;8495,2376;8489,2373;8488,2370;8489,2366;8500,2355;8526,2346;8537,2346;8553,2350;8568,2355;8576,2358;8585,2359;8599,2357;8609,2360;8616,2365;8621,2371;8627,2381;8630,2399;8627,2407;8624,2415;8614,2427;8598,2447;8591,2454;8585,2457;8578,2458;8571,2459;8568,2458;8541,2447;8530,2439;8524,2436;8519,2436;8954,2069;8945,2072;8935,2073;8918,2074;8900,2072;8894,2071;8889,2068;8836,3397;8827,3396;8811,3398;8800,3399;8792,3399;8787,3398;8773,3397;8766,3399;8761,3402;8760,3406;8758,3425;8631,3612;8546,3612;8540,3611;8535,3607;8526,3604;8517,3603;8512,3602;8480,3603;8475,3603;8890,3478;8901,3479;8914,3482;8934,3484;8946,3484;8963,3484;8974,3486;8981,3488;9213,1991;9214,1990;9215,1989;9215,1987;9214,1985;9213,1984;9211,1984;9209,1983;9207,1984;9205,1985;9204,1987;9204,1988;9205,1990;9207,1991;9209,1992;9211,1992;8466,3594;8467,3587;8471,3580;8525,3537;8536,3532;8552,3528;8561,3525;8570,3523;8598,3503;8639,3619;8640,3625;8640,3633;8551,2031;8552,2032;8553,2033;8554,2034;8556,2034;8557,2033;8559,2032;8560,2031;8560,2030;8559,2029;8558,2028;8557,2027;8555,2027;8553,2027;8552,2028;8551,2029;9034,1727;9034,1729;9034,1730;9030,1732;9027,1732;9025,1730;9025,1729;9025,1728;9025,1727;9026,1726;9027,1725;9028,1725;9030,1724;9032,1725;9033,1726;9034,1727;8279,2406;8277,2409;8277,2411;8279,2413;8281,2414;8284,2413;8288,2411;9102,1782;9102,1784;9102,1785;9100,1786;9097,1787;9095,1786;9093,1785;9092,1784;9092,1782;9093,1781;9094,1780;9096,1779;9098,1779;9100,1780;9101,1781;9102,1781;8654,1868;8655,1868;8657,1868;8658,1868;8660,1867;8660,1866;8660,1865;8660,1864;8659,1863;8657,1862;8656,1862;8654,1863;8653,1864;8653,1865;8652,1866;8653,1867;8573,3542;8560,3549;8544,3559;8522,3577;8515,3584;8512,3591;8511,3598;8876,3449;8874,3459;8873,3466;8873,3471;8876,3474;8880,3476;8620,3589;8611,3575;8607,3570;8604,3565;8602,3561;8600,3557;8597,3552;8595,3550;8589,3548;8579,3544;8568,3539;8566,3537;8562,3530;8447,1817;8448,1814;8449,1813;8450,1812;8451,1811;8453,1811;8455,1811;8456,1813;8457,1813;8457,1814;8457,1816;8457,1817;8456,1818;8454,1819;7526,2465;7528,2461;7533,2458;7574,2459;7581,2461;7596,2470;7647,2524;7654,2541;5987,3404;5984,3408;8347,2790;8380,2796;8488,2797;8547,2798;8572,2802;6737,3265;6741,3253;6750,3238;6764,3228;6790,3212;6808,3205;6860,3203;6122,2987;6130,2993;6157,3026;7548,2483;7502,2469;7498,2467;7482,2457;7475,2453;7468,2449;7457,2445;7416,2438;7405,2434;7389,2427;7380,2425;7351,2423;7289,2423;7285,2424;6747,3213;6736,3206;6723,3203;6711,3202;7593,2502;7593,2504;7591,2505;7590,2506;7588,2506;7586,2506;7585,2505;7584,2504;7583,2502;7584,2501;7585,2500;7586,2499;7588,2499;7590,2499;7591,2499;7593,2500;8488,2828;8487,2834;8484,2840;8479,2841;8369,2840;8345,2837;8338,2836;8330,2838;8329,2839;8312,2845;8297,2846;8285,2847;8271,2845;7026,3402;7009,3404;6998,3404;6992,3404;6986,3409;6986,3426;6986,3432;6988,3437;6992,3439;6998,3439;7005,3436;9099,1728;9099,1730;9099,1731;9097,1733;9095,1733;9092,1733;9090,1731;9089,1730;9090,1728;9090,1727;9091,1727;9093,1726;9095,1726;9097,1726;9098,1727;9099,1728;7085,3485;7079,3489;7081,3536;7083,3545;7086,3547;7089,3548;7108,3549;7120,3549;7129,3547;7137,3545;6863,3395;6803,3394;7073,3565;6918,3395;6985,3491;6985,3519;6986,3527;6974,3380;6975,3396;7143,2757;7047,2756;7042,2754;7041,2749;8218,2593;8199,2591;8169,2584;8149,2580;8137,2580;8109,2583;8089,2583;6985,3460;6983,3463;6984,3480;7001,3482;7068,3485;7077,3487;5101,2721;5095,2717;5090,2711;5088,2704;5237,3052;5322,3053;5349,3052;5369,3054;5457,3069;5464,3071;5584,3091;5618,3100;5626,3108;5650,3132;5663,3136;5742,3136;5760,3141;5844,3139;5380,3330;5434,3331;5452,3330;5501,3318;5540,3311;5572,3311;5609,3314;5677,3323;5705,3323;4992,2953;5010,2954;4962,3366;5349,2907;5236,2905;4729,3230;9482,2263;9491,2264;9500,2265;9513,2266;9523,2268;9558,2268;9574,2266;9599,2268;9609,2271;9617,2279;9628,2300;9663,2318;9674,2318;5236,2872;5083,2871;5075,2872;5706,3306;5710,3363;4968,2966;4967,2995;4982,3253;4967,3250;4943,3233;8448,2148;8418,2148;8408,2147;8400,2144;8390,2141;8387,2140;8383,2139;8374,2138;8355,2141;8350,2141;8342,2141;4925,3172;4913,3174;4879,3180;4984,3106;4956,3106;4949,3104;4943,3101;4923,3025;4896,3059;4898,3063;4901,3065;4930,3068;8254,2501;8250,2504;8245,2505;8242,2503;8243,2499;8245,2498;8250,2498;8263,2501;8269,2504;8273,2508;8274,2514;4913,3169;4913,3165;4912,3159;4913,3157;5037,3238;5034,3239;5026,3238;4972,3204;8178,2721;8172,2703;8171,2694;8172,2685;8175,2673;8183,2661;8195,2652;8209,2644;8226,2640;8253,2639;5466,3133;5463,3019;5442,2987;5411,2957;5359,2910;4929,3062;4940,3043;4946,3032;5015,3321;5012,3289;5014,3285;5019,3282;5028,3283;4859,3251;4857,3247;4857,3241;4863,3223;4872,3219;4916,3090;4892,3087;4890,3088;4883,3127;4886,3129;4898,3130;4986,3164;4969,3162;4959,3161;4954,3161;5070,3292;5071,3301;5071,3307;5067,3312;5061,3314;5055,3315;5048,3315;5042,3315;6845,2518;6845,2547;6842,2552;5082,3247;5086,3253;5089,3258;5088,3283;5085,3287;5079,3290;5057,3289;6716,2724;6719,2718;6717,2580;6730,2543;6733,2539;6755,2502;6767,2486;6597,2424;6597,2421;6596,2419;6595,2417;6595,2415;6612,2420;6603,2422;6592,2429;6588,2430;6582,2430;6578,2430;6577,2429;6745,3396;6746,3374;6750,3371;6761,3370;3224,1344;3219,1339;3213,1333;3201,1327;3174,1318;3171,1315;3168,1311;3169,1303;3177,1294;3178,1286;3226,1341;3229,1333;3232,1326;3231,1313;3228,1305;3223,1300;3218,1293;3215,1287;3213,1279;3213,1277;3203,3529;3218,3538;3241,3550;3263,3563;3312,3593;3326,3602;3328,3603;3335,3609;3342,3615;3350,3621;3363,3628;3365,3632;2718,3336;2718,3337;2718,3338;2717,3339;2716,3340;2713,3341;2710,3340;2709,3339;2708,3338;2708,3337;2708,3336;2709,3335;2710,3334;2712,3333;2714,3333;2715,3334;2717,3335;2717,3335;3219,3661;3248,3629;3248,3679;3276,3647;7472,2467;7470,2487;7468,2553;7467,2568;7466,2678;7462,2707;7460,2733;7462,2743;7465,2750;7466,2763;2738,2372;2653,2321;2599,2290;2545,2258;3174,3611;3170,3616;3167,3620;3163,3626;3102,3584;3049,3542;3012,3519;2930,3470;2532,3448;2530,3454;2525,3464;2518,3472;2510,3479;3254,3607;3255,3604;3254,3600;3241,3594;3239,3591;3239,3588;3176,3552;3170,3562;3171,3567;3199,3579;3208,3587;3208,3591;3207,3596;2678,3553;2684,3545;2691,3535;2697,3523;2698,3515;2697,3511;2694,3506;2683,3499;2667,3493;2612,3481;2598,3476;2578,3466;2569,3460;2566,3456;2553,3452;2541,3449;2524,3442;2513,3425;2501,3409;2495,3393;2494,3378;2482,3361;2471,3349;2467,3337;2466,3329;2467,3322;2473,3315;2524,3279;2543,3271;2560,3269;2581,3267;2594,3268;2630,3279;2668,3294;2678,3297;2695,3295;2719,3288;2738,3286;2745,3286;2761,3295;2766,3305;2765,3317;2761,3324;2755,3329;2749,3333;2740,3335;2732,3336;2721,3337;8940,1733;8956,1740;8977,1757;8985,1768;8992,1781;9001,1803;9000,1820;8995,1833;8975,1850;8964,1855;8961,1856;8950,1860;8917,1865;8887,1864;8873,1863;8865,1863;8821,1883;8815,1884;8809,1883;8795,1878;8790,1878;8788,1879;8778,1884;8775,1887;8772,1892;8771,1897;8773,1902;8775,1907;5008,3199;5014,3195;5026,3190;5031,3187;5061,3185;5067,3187;5069,3190;5068,3194;5065,3195;5048,3196;5034,3196;5030,3194;4982,3346;4981,3303;4977,3295;4965,3290;5236,2833;5203,2832;5197,2830;5188,2827;5182,2823;5177,2821;5170,2819;5164,2819;5109,2818;8244,2547;8228,2548;8209,2545;8171,2536;8153,2535;8122,2534;8114,2535;8105,2537;8097,2542;8093,2548;8091,2553;8090,2560;6594,2481;6583,2480;6578,2479;6561,2479;6557,2477;6555,2476;6553,2474;6552,2470;6552,2458;6551,2457;6548,2455;6539,2454;6501,2455;6610,2413;6608,2415;6602,2416;6597,2416;6596,2404;6595,2396;6594,2394;6592,2393;6585,2391;6576,2391;6509,2391;6507,2391;6504,2394;6503,2396;6500,2436;6501,2461;6501,2501;6501,2515;6502,2520;6504,2526;6504,2541;6504,2559;6505,2562;6509,2564;6571,2565;6577,2562;6581,2558;6584,2555;6592,2549;6594,2545;6594,2499;6594,2468;6594,2466;6596,2458;6597,2455;6602,2451;6606,2447;6612,2442;6615,2435;6615,2431;5822,2917;5827,2921;5830,2927;5842,2953;5844,2956;5847,2958;5854,2958;4676,3284;4659,3281;4624,3277;4619,3275;4614,3272;4613,3266;4615,3259;4617,3254;4625,3252;4637,3251;4653,3248;4682,3244;4714,3234;4720,3233;4736,3227;4752,3220;4777,3203;4783,3200;4795,3198;4808,3200;4826,3204;4830,3207;4832,3210;4827,3229;4816,3268;4809,3274;4808,3275;4803,3277;4773,3279;4746,3287;4729,3293;4719,3296;4712,3296;4701,3295;4811,3227;4796,3226;4789,3227;4781,3232;4966,3045;4956,3074;7055,3579;7067,3579;7068,3592;7063,3594;7055,3594;7055,3580;7054,3578;7051,3575;7046,3574;6993,3569;6990,3568;6989,3566;6987,3562;6987,3545;7276,2580;7290,2587;7299,2589;7308,2590;7311,2590;7328,2582;7346,2575;7389,2558;7410,2555;7432,2554;5087,3216;5087,3240;5084,3245;5080,3248;6831,2553;6786,2553;4951,3127;6998,3515;3356,3669;3363,3665;3368,3663;3384,3659;3395,3660;3411,3662;3432,3669;3441,3678;3447,3688;3449,3694;3452,3705;3451,3712;3449,3720;3432,3737;3423,3741;3417,3743;3399,3745;3391,3745;3380,3743;3372,3741;3362,3737;3353,3730;3348,3725;3344,3717;3341,3710;3340,3700;3339,3694;3341,3689;3344,3682;3300,3699;3297,3701;3294,3702;3290,3702;3286,3701;3171,3632;3160,3622;3151,3617;3129,3603;8375,1867;8373,1869;8370,1869;8368,1869;8366,1867;8365,1867;8365,1866;8365,1865;8366,1863;8176,2513;3868,1819;2296,3248;2293,3229;628,3646;615,3636;602,3628;593,3621;587,3611;617,3746;598,3722;597,3717;600,3710;599,3699;594,3690;570,3663;562,3658;661,3726;643,3736;667,3701;660,3682;632,4033;643,4025;649,4016;652,4008;648,3967;647,3948;635,3818;625,3760;633,3794;667,3818;697,3822;722,3828;746,3836;888,4038;902,4040;912,4044;945,4012;979,3992;989,3994;1018,4021;1024,4020;1114,3958;855,3894;864,3900;470,4038;454,3999;452,3962;454,3948;495,3875;522,3851;544,3840;583,3827;610,3821;7591,3690;671,3772;844,3799;891,3841;900,3847;911,3851;948,3882;1858,3543;1987,3483;2320,3334;2365,3313;2742,3145;2794,3129;2838,3120;2873,3113;2919,3107;2966,3103;3017,3103;3067,3105;3123,3111;3174,3120;3234,3134;4115,3323;3819,3268;3741,3251;3605,3218;1809,3625;1799,3618;3928,3215;3948,3184;3971,3159;3988,3142;4018,3117;1791,3622;4072,3061;4055,3075;4029,3097;4012,3112;3983,3138;3965,3155;3943,3180;3923,3211;3914,3236;3905,3264;3903,3271;4707,2597;4702,2599;4617,2674;4591,2667;4880,2444;4666,2595;4640,2590;4610,2597;4583,2622;4577,2639;4580,2653;4585,2662;4587,2663;4254,2928;4100,3038;4082,3052;4623,2677;4694,2614;4707,2601;498,2723;577,2763;582,2766;381,2679;332,2671;219,2658;118,2649;6,2636;485,2709;459,2699;422,2688;380,2688;430,2699;477,2715;90,2655;219,2668;287,2675;320,2679;352,2683;4002,3092;3988,3106;3966,3134;3955,3151;3941,3176;3936,3183;3932,3191;4012,3143;4037,3304;3981,3296;4088,3071;4103,3050;4030,3131;4036,3127;4034,3069;5367,3436;5397,3440;5425,3447;5438,3448;5461,3445;6308,3535;6330,3541;6339,3541;6368,3539;5260,3951;6349,3499;6358,3501;6363,3501;6367,3498;6369,3494;6368,3488;6365,3484;6771,3582;6800,3588;6817,3591;6853,3589;5223,3471;5225,3473;5228,3478;5246,3503;5244,3501;5242,3498;5243,3475;5246,3473;5247,3471;5249,3470;5238,3386;5232,3400;5230,3406;5226,3411;5224,3413;5220,3415;7463,2383;7546,2402;7579,2416;7599,2425;7618,2436;7636,2448;7681,2490;7697,2501;7720,2508;7767,2503;5226,3501;5224,3502;5220,3503;5218,3504;3845,3390;3851,3394;3859,3398;2416,3104;6454,516;6457,512;6474,467;9247,3865;9236,3805;9233,3788;7103,1553;7077,1512;7070,1503;7055,1480;6981,1365;6953,1322;6882,1213;565,2827;492,2748;463,2718;608,2784;636,2806;659,2827;677,2845;695,2864;710,2884;740,2929;783,3009;845,3117;905,3226;935,3272;968,3315;1017,3370;1067,3423;1120,3478;585,2758;577,2753;534,2729;791,2266;770,2271;656,3326;659,3236;695,3224;750,2275;670,2285;611,2288;559,2288;509,2286;458,2282;357,2275;227,2273;182,2271;136,2270;732,3212;621,3274;619,3270;608,3254;7362,3462;7328,3546;2319,3150;2331,3137;2342,3127;2361,3116;2393,3108;2736,3058;2780,3052;2812,3044;2873,3002;2940,2932;3009,2860;3019,2850;3055,2814;3065,2802;7447,1146;6208,1622;6210,1621;6211,1620;6212,1619;6212,1617;6211,1616;6209,1615;6207,1614;6205,1614;6204,1615;6202,1616;6201,1617;6202,1619;6202,1620;6204,1622;6398,1664;6398,1662;6398,1661;6397,1660;6396,1659;6394,1659;6392,1659;6391,1660;6390,1661;6389,1662;6390,1664;6391,1665;6392,1665;6394,1666;6396,1665;7036,1297;7036,1296;7035,1295;7034,1294;7032,1294;7031,1295;7030,1296;7029,1297;7029,1298;7029,1299;7030,1300;7032,1300;7033,1300;7035,1300;7036,1299;6728,1621;7515,1094;7507,1086;7497,1077;7477,1059;7470,1053;7462,1046;7451,1038;7441,1031;7432,1022;6592,1727;6593,1725;6593,1724;6593,1722;6591,1721;6590,1720;6588,1720;6586,1721;6584,1722;6583,1723;6583,1724;6584,1726;6585,1727;6587,1728;6589,1728;6656,1657;6656,1659;6658,1660;6659,1661;6662,1662;6664,1661;6665,1660;6667,1659;6667,1656;6665,1654;6663,1653;6661,1653;6659,1653;6657,1654;6656,1656;7798,1444;7800,1445;7803,1445;7805,1444;7808,1441;7808,1439;7807,1438;7803,1435;7799,1436;7797,1437;7796,1439;7796,1441;7797,1442;7141,513;7142,514;7143,515;7145,516;7147,516;7149,516;7151,515;7152,513;7151,510;7150,509;7148,508;7146,508;7144,509;7142,510;7141,511;7052,460;7053,460;7055,461;7057,460;7059,459;7060,458;7060,456;7059,455;7058,454;7057,453;7055,453;7053,453;7051,454;7050,456;7050,457;6913,627;6918,631;6924,635;6935,641;6940,642;6945,643;6950,644;6957,646;6986,662;7001,670;7011,676;7019,678;7026,680;7037,681;6711,695;6713,694;6715,693;6715,691;6715,690;6714,688;6712,687;6710,686;6706,687;6704,689;6704,690;6704,692;6705,694;6707,695;6709,695;6660,661;6661,662;6662,663;6664,663;6666,663;6667,662;6668,661;6669,660;6668,657;6666,656;6665,656;6663,656;6661,657;6660,658;6660,659;7381,627;7397,628;7436,625;7448,621;7459,617;7475,610;7492,603;7502,597;7509,591;7537,561;7548,553;7557,548;7607,534;7640,526;7648,523;7654,520;7663,515;7672,508;7212,299;7214,300;7216,300;7217,299;7218,298;7219,297;7219,296;7218,294;7215,293;7214,293;7212,293;7211,294;7210,296;7210,297;7211,299;7149,379;7151,379;7153,379;7154,378;7155,377;7155,375;7155,374;7154,373;7152,372;7150,372;7149,372;7147,373;7146,374;7146,376;7146,377;7732,567;7732,565;7732,564;7731,562;7730,561;7728,561;7726,561;7724,562;7722,564;7722,566;7723,567;7724,568;7726,569;7728,569;7730,568;7602,586;7603,585;7602,583;7602,582;7600,581;7599,581;7597,581;7595,581;7594,582;7593,584;7593,585;7594,586;7596,587;7597,588;7599,588;7172,1401;7174,1400;7175,1399;7175,1398;7175,1397;7174,1396;7173,1395;7172,1394;7168,1395;7167,1396;7167,1397;7167,1398;7168,1400;7169,1401;7170,1401;7833,755;7835,755;7835,753;7835,752;7835,751;7834,750;7832,749;7830,749;7829,750;7828,751;7827,752;7827,753;7828,754;7829,755;7830,756;7491,580;7563,623;7610,651;7615,655;7169,273;7171,271;7172,270;7172,268;7171,266;7170,265;7168,264;7166,264;7162,265;7160,267;7160,269;7161,271;7162,272;7164,273;7167,273;7421,484;7528,657;7529,655;7528,654;7527,652;7526,651;7524,651;7522,651;7520,652;7519,653;7518,655;7518,656;7520,658;7521,659;7523,659;7525,659;7527,658;7147,686;7149,687;7151,687;7153,687;7155,686;7156,685;7157,683;7157,681;7155,680;7154,679;7151,678;7149,679;7147,679;7146,681;7145,683;7323,601;7325,601;7327,600;7328,599;7329,598;7329,596;7328,595;7327,594;7324,593;7322,594;7320,595;7320,596;7319,597;7320,599;7321,600;7188,650;7188,651;7188,653;7188,654;7190,655;7191,656;7193,656;7195,655;7196,654;7197,653;7197,651;7197,650;7195,649;7271,869;7273,868;7274,867;7275,866;7275,864;7274,862;7272,861;7270,861;7266,862;7265,863;7264,865;7264,866;7265,868;7267,869;7269,869;7448,884;7446,880;7867,887;7874,889;7881,886;7004,862;7006,863;7008,862;7009,861;7010,860;7010,859;7010,857;7009,856;7007,855;7005,855;7003,855;7002,856;7001,858;7001,859;7001,860;7002,862;6984,972;6990,934;6993,913;6997,888;6999,879;7023,618;7025,619;7027,619;7029,619;7030,618;7031,616;7031,615;7031,613;7028,612;7026,611;7024,612;7023,613;7022,614;7022,616;7022,617;7170,892;7171,891;7171,889;7170,888;7169,887;7167,886;7165,886;7163,887;7161,889;7161,891;7162,892;7163,893;7165,894;7167,894;7169,893;7530,458;7532,458;7533,457;7535,456;7535,454;7535,453;7534,452;7533,451;7531,450;7529,450;7528,451;7526,452;7526,453;7526,455;7527,456;6877,895;6878,894;6878,893;6878,891;6877,890;6875,889;6873,889;6871,890;6870,891;6869,892;6869,893;6869,895;6870,896;6872,897;6874,897;7062,270;7063,269;7062,267;7061,266;7059,265;7058,265;7056,265;7054,266;7053,268;7053,269;7053,270;7054,272;7056,272;7058,273;7060,272;7726,647;7728,647;7729,647;7731,646;7732,644;7732,643;7731,641;7729,640;7728,639;7726,640;7724,640;7722,641;7722,643;7722,644;7722,646;7477,422;7479,423;7481,422;7483,422;7484,421;7484,419;7484,418;7483,416;7482,415;7480,415;7478,415;7477,416;7475,417;7475,419;7475,420;7186,797;7187,799;7188,801;7190,802;7193,802;7195,801;7197,800;7198,799;7198,795;7196,794;7194,793;7192,793;7190,793;7188,794;7187,796;7250,778;7250,779;7252,780;7253,781;7255,781;7257,780;7258,779;7259,778;7259,776;7258,775;7257,774;7255,774;7253,774;7251,774;7250,775;7250,777;7012,816;7015,816;7017,815;7018,814;7019,812;7018,810;7017,809;7016,808;7011,807;7009,808;7007,809;7007,811;7007,813;7008,815;7010,816;8075,985;8076,984;8076,983;8076,982;8075,980;8073,980;8072,980;8070,980;8068,982;8067,983;8068,984;8069,986;8070,986;8072,986;8074,986;7590,493;7592,493;7594,493;7596,493;7597,491;7598,490;7598,488;7597,487;7595,486;7593,485;7591,486;7589,486;7588,487;7588,489;7588,491;8107,1041;8108,1042;8110,1043;8111,1043;8113,1043;8114,1042;8115,1041;8116,1039;8114,1037;8113,1036;8111,1036;8109,1036;8108,1037;8107,1038;8107,1040;6601,1668;6603,1668;6604,1667;6605,1666;6606,1665;6606,1663;6605,1662;6603,1661;6602,1661;6600,1661;6598,1662;6597,1663;6596,1664;6597,1665;6597,1667;7907,1015;7909,1015;7911,1014;7912,1013;7912,1011;7911,1010;7910,1009;7909,1008;7907,1008;7905,1008;7903,1009;7902,1010;7902,1012;7903,1013;7904,1015;7905,1015;7704,549;7704,548;7704,547;7703,546;7701,545;7700,545;7698,545;7697,546;7696,547;7695,548;7696,550;7355,949;7357,948;7358,947;7359,945;7358,944;7357,942;7356,941;7354,941;7352,941;7350,942;7349,943;7348,945;7349,946;7350,948;7351,949;8299,1145;8301,1144;8302,1143;8302,1141;8302,1140;8301,1139;8299,1138;8297,1138;8295,1138;8294,1139;8293,1140;8292,1141;8293,1143;8294,1144;8296,1145;8298,1145;7402,527;7401,525;7400,524;7399,523;7397,523;7395,523;7393,524;7391,525;7391,526;7391,528;7392,529;7394,530;7396,531;7398,531;7400,530;8002,1096;7550,870;7551,869;7552,867;7552,866;7551,864;7549,863;7547,863;7545,863;7542,865;7541,867;7542,869;7543,870;7544,871;7546,871;7548,871;7502,527;7502,525;7501,524;7500,522;7498,522;7496,522;7494,522;7492,523;7492,527;7492,528;7494,529;7496,530;7498,530;7500,529;7501,528;6657,1696;6657,1698;6658,1699;6660,1700;6662,1700;6664,1700;6665,1699;6666,1698;6666,1695;6665,1693;6663,1693;6661,1692;6659,1693;6658,1694;6657,1695;6604,1192;7326,338;7328,339;7330,340;7332,340;7334,340;7335,339;7336,337;7337,336;7336,334;7335,333;7333,332;7331,332;7329,332;7327,333;7326,334;5884,615;7234,908;7234,906;7233,905;7232,904;7230,903;7228,903;7227,903;7225,904;7224,906;7224,907;7225,909;7226,910;7228,910;7230,910;7232,910;7385,827;7378,822;7374,817;7373,812;7373,807;7375,802;7380,793;7402,750;7407,738;7409,730;7412,725;7417,719;7435,700;7477,657;7482,654;7487,652;7491,651;7496,650;7501,649;7506,650;7511,651;5255,1316;6656,1735;6657,1736;6658,1738;6659,1738;6661,1739;6663,1738;6665,1738;6666,1736;6666,1733;6665,1732;6663,1731;6661,1731;6659,1731;6658,1732;6657,1734;7321,994;7329,996;7337,996;7344,994;7358,987;7867,888;7869,889;7873,889;7876,888;7876,886;7876,885;7875,883;7872,882;7870,882;7869,883;7867,884;7867,885;5290,154;5338,184;5439,246;5459,257;5463,259;5468,259;5472,258;5482,256;5487,255;5491,257;5496,259;5536,252;5507,234;5467,210;8190,932;8192,933;8193,933;8195,933;8197,932;8198,931;8198,929;8198,928;8196,927;8195,926;8193,926;8191,926;8190,927;8189,928;8188,930;8189,931;7447,880;7448,878;7449,877;7448,875;7447,874;7445,873;7443,873;7441,873;7440,874;7439,875;7438,877;7439,878;7440,880;7442,881;7444,881;5438,549;5440,550;5442,549;5443,548;5444,547;5444,546;5443,544;5442,543;5441,543;5439,542;5437,543;5436,544;5435,545;5435,546;5435,548;6747,903;6749,904;6751,903;6753,903;6754,902;6755,900;6754,899;6754,897;6750,896;6748,896;6747,897;6745,898;6745,899;6745,901;6746,902;5512,821;5513,823;5514,824;5516,824;5518,824;5520,823;5521,822;5522,820;5521,818;5519,817;5517,816;5515,816;5514,817;5512,818;5512,820;5928,933;5927,932;5926,931;5924,931;5923,931;5921,932;5920,933;5920,934;5920,935;5921,936;5923,937;5924,937;5926,937;5927,937;5928,935;7916,1040;7910,1032;7909,1029;7908,1025;7908,1021;7830,1364;7831,1368;7831,1373;7830,1378;7828,1382;7825,1385;7820,1387;7814,1389;7807,1391;7791,1395;7785,1396;7779,1398;7774,1399;7771,1402;6353,321;6352,320;6351,318;6350,317;6348,317;6346,317;6345,318;6343,319;6343,320;6343,322;6344,323;6345,324;6347,324;6349,324;6351,324;6746,198;6747,191;6750,184;6753,177;6757,172;6763,167;6771,162;6783,157;6791,156;6796,155;6803,155;5630,904;5632,904;5634,903;5635,902;5635,900;5634,899;5633,897;5631,897;5627,897;5626,898;5625,899;5625,901;5625,902;5626,903;5628,904;5701,852;5701,850;5701,849;5700,847;5698,846;5696,846;5694,846;5693,847;5691,850;5692,852;5693,853;5694,854;5696,854;5698,854;5700,853;8234,1042;8235,1041;8236,1039;8236,1038;8236,1036;8234,1035;8232,1034;8230,1034;8226,1036;8226,1037;8226,1039;8226,1040;8228,1042;8230,1042;8232,1042;6082,527;6083,526;6085,525;6085,524;6085,522;6084,521;6083,520;6081,520;6080,520;6078,520;6077,521;6076,523;6076,524;6077,525;6078,526;6515,414;6515,413;6513,410;6512,409;6510,409;6508,410;6506,411;6505,413;6506,415;6507,416;6509,417;6511,417;6512,416;6514,415;5304,230;5306,230;5307,230;5309,229;5309,227;5309,226;5309,225;5307,224;5304,223;5302,224;5301,225;5300,226;5300,227;5301,229;5302,230;5172,1252;5128,1295;6729,1622;6731,1622;6732,1622;6733,1621;6734,1620;6734,1619;6734,1617;6733,1616;6732,1616;6730,1616;6729,1616;6727,1617;6727,1618;6726,1619;6727,1620;6608,338;6608,336;6608,335;6607,334;6605,333;6603,333;6601,333;6600,334;6599,336;6599,337;6599,339;6600,340;6602,340;6604,341;6606,340;6681,112;6680,110;6678,109;6676,109;6674,109;6672,110;6670,111;6670,113;6670,115;6671,116;6673,117;6675,118;6677,118;6679,117;6681,115;6313,1052;6315,1051;6316,1051;6318,1050;6318,1048;6318,1047;6317,1045;6316,1044;6312,1044;6310,1045;6309,1046;6308,1047;6308,1049;6309,1050;6311,1051;6050,628;6050,626;6050,625;6049,624;6047,623;6045,623;6043,623;6042,624;6041,625;6040,626;6041,628;6042,629;6043,630;6045,630;6047,630;5490,558;5492,558;5494,558;5496,558;5497,557;5498,556;5499,554;5498,553;5495,551;5493,550;5491,551;5490,552;5489,553;5488,555;5489,556;5515,597;5517,597;5519,597;5520,597;5522,596;5522,594;5522,593;5521,592;5520,591;5518,590;5517,590;5515,591;5514,592;5513,593;5513,595;6072,924;6073,922;6073,921;6073,920;6071,919;6070,918;6068,918;6066,918;6064,921;6064,922;6064,923;6066,925;6067,925;6069,925;6071,925;5484,964;5484,963;5484,962;5483,961;5482,960;5480,960;5479,960;5477,961;5476,962;5476,963;5476,964;5477,965;5479,966;5480,966;5482,966;6388,218;6390,217;6391,216;6392,214;6392,213;6391,211;6389,210;6388,210;6386,210;6384,211;6382,212;6382,213;6382,215;6383,216;6384,217;6386,218;6420,286;6412,281;6408,278;6405,273;6403,267;5748,1126;5749,1127;5750,1128;5752,1128;5754,1127;5755,1126;5756,1125;5756,1124;5755,1123;5754,1122;5753,1121;5751,1121;5749,1121;5748,1122;5747,1123;5639,478;6327,1110;6328,1111;6329,1113;6331,1113;6333,1113;6335,1112;6337,1111;6337,1109;6337,1108;8353,1080;8354,1081;8356,1082;8357,1082;8359,1082;8360,1081;8361,1079;8361,1078;8361,1077;8359,1076;8358,1075;8356,1075;8354,1075;8353,1076;8352,1078;5138,211;5135,210;5133,208;5133,206;5135,204;5137,202;5140,202;5143,204;5144,206;5145,208;5143,210;5352,254;5351,252;5350,251;5348,251;5346,251;5344,252;5343,253;5343,255;5343,256;5344,258;5346,258;5348,259;5349,259;5351,258;5352,256;7687,1131;7688,1130;7689,1128;7689,1127;7688,1125;7687,1124;7685,1124;7683,1124;7680,1125;7679,1126;7679,1128;7680,1129;7681,1130;7683,1131;7685,1131;5849,999;5842,1000;5837,1000;5830,1001;5824,1001;5818,1001;5812,1000;5805,999;5798,998;5790,996;6132,562;6134,562;6136,562;6138,561;6139,560;6139,558;6139,557;6138,556;6136,555;6134,554;6132,555;6130,556;6129,557;6129,558;6129,560;7814,482;7811,476;7805,470;7789,459;7777,454;7773,454;7768,455;7756,466;7751,471;7750,475;7763,539;7780,523;7851,449;7861,439;7864,437;7869,436;7874,437;7878,440;7885,448;7701,479;7702,471;7703,466;7705,465;7707,464;7709,464;7712,465;7715,466;7719,469;7721,472;7771,525;7788,508;7790,506;7834,461;7858,436;7861,430;7861,427;7856,421;7956,802;8072,797;8109,795;8139,793;8151,791;8159,786;8162,781;8163,777;8162,771;8161,761;7877,708;7884,703;7916,669;7955,630;7994,590;8009,575;8011,571;8012,567;8011,564;8008,558;7984,503;7982,495;7976,468;7974,454;7877,717;7889,704;7924,666;7981,610;7986,605;8014,576;8024,569;8033,564;8044,561;8055,560;8063,561;8073,563;8091,566;8098,566;8103,564;8105,563;7788,501;7786,497;7783,494;7739,469;7803,335;7757,377;7715,413;7712,417;7712,420;7723,433;7729,440;7734,451;7734,455;7732,460;7727,467;7724,470;7715,474;7998,615;8002,618;8005,619;8007,619;8010,619;8017,618;7802,513;7813,506;7826,503;7840,503;7870,506;7888,506;5986,729;5988,727;5989,726;5992,726;5994,726;5996,727;5997,730;5930,520;5931,519;5932,518;5932,516;5931,515;5930,514;5928,513;5926,513;5923,514;5923,516;5922,517;5923,519;5924,520;5926,520;5928,520;6953,599;6953,600;6954,601;6956,602;6958,602;6959,601;6961,600;6962,599;6961,597;6960,595;6958,595;6956,595;6955,595;6953,596;6953,597;5745,545;5745,543;5745,541;5744,540;5742,539;5740,539;5738,539;5736,540;5734,543;5734,544;5736,546;5737,547;5739,547;5741,547;5743,546;6763,146;6764,144;6764,143;6764,141;6762,140;6760,139;6758,139;6756,140;6755,141;6754,142;6754,144;6754,145;6756,146;6758,147;6760,147;6195,1030;6196,1028;6197,1027;6197,1026;6197,1024;6195,1023;6193,1022;6191,1022;6190,1023;6188,1024;6188,1025;6187,1027;6188,1028;6190,1029;6191,1030;5656,563;5647,557;5638,551;5625,544;5614,539;5604,534;4742,676;4742,675;4742,673;4740,672;4739,671;4737,671;4735,671;4733,672;4732,673;4732,675;4732,676;4733,678;4735,679;4737,679;4739,679;6441,185;6618,291;6625,294;6631,297;6638,300;4645,872;4647,873;4649,872;4651,871;4652,870;4652,869;4652,867;4651,866;4649,865;4647,864;4645,865;4643,865;4642,867;4642,868;4642,870;4977,650;4517,874;4517,873;4516,871;4514,871;4512,870;4510,871;4508,872;4507,873;4506,875;4507,876;4508,878;4510,879;4512,879;4514,878;4516,877;7288,640;7289,641;7291,642;7293,641;7295,641;7296,639;7297,638;7297,636;7296,635;7294,634;7292,633;7290,633;7288,634;7287,636;7286,637;5022,697;5024,698;5025,698;5027,697;5028,697;5029,695;5030,694;5029,693;5026,691;5025,691;5023,691;5022,692;5021,693;5020,695;5021,696;6626,242;6628,242;6630,242;6631,241;6632,239;6632,238;6631,236;6629,235;6626,235;6624,235;6622,236;6622,238;6622,239;6623,241;6624,242;4537,468;4539,468;4540,468;4542,468;4543,467;4543,465;4543,464;4543,463;4541,462;4540,462;4538,462;4536,462;4535,463;4535,465;4535,466;4521,564;4521,562;4520,561;4518,560;4516,560;4514,560;4513,561;4511,562;4511,565;4512,566;4514,567;4516,568;4518,567;4519,567;4520,565;4671,820;4660,812;4653,803;4650,797;4643,758;4761,995;4767,988;4794,1015;4729,976;4728,972;4729,971;4732,969;4736,969;4459,603;4461,604;4463,605;4465,604;4466,603;4467,602;4468,601;4467,599;4466,598;4465,597;4463,597;4461,597;4459,598;4458,599;4458,601;4658,629;4660,629;4662,629;4664,629;4666,627;4666,626;4666,624;4665,623;4661,621;4659,621;4657,622;4656,623;4655,625;4656,627;4657,628;2914,2159;2916,2159;2918,2158;2919,2156;2919,2155;2918,2153;2917,2152;2916,2151;2912,2152;2910,2153;2909,2154;2909,2155;2909,2157;2911,2158;2912,2159;2932,2194;2921,2206;2914,2212;2971,2318;2972,2317;2973,2315;2972,2314;2971,2312;2970,2311;2968,2311;2965,2311;2962,2313;2962,2315;2962,2316;2963,2318;2965,2319;2967,2319;2969,2319;4252,2295;4250,2292;4248,2290;4246,2290;4244,2290;4241,2292;4240,2293;4240,2297;3009,1796;3003,1803;2996,1813;2993,1819;2989,1825;3394,2047;3395,2045;3395,2044;3394,2042;3393,2041;3391,2040;3389,2040;3387,2041;3384,2044;3384,2045;3385,2047;3387,2048;3389,2049;3391,2049;3393,2048;2702,2217;2704,2218;2706,2218;2708,2218;2709,2217;2710,2215;2710,2214;2710,2212;2706,2210;2704,2210;2703,2211;2701,2212;2700,2213;2700,2215;2701,2216;3139,2361;3139,2359;3138,2358;3137,2356;3135,2356;3133,2356;3131,2356;3130,2357;3129,2359;3129,2360;3130,2361;3131,2363;3133,2363;3135,2363;3136,2363;3269,1986;3270,1985;3271,1983;3272,1982;3271,1980;3270,1979;3268,1978;3265,1978;3263,1978;3262,1979;3261,1981;3260,1982;3261,1984;3262,1985;3264,1986;4014,2253;4013,2252;4012,2251;4010,2251;4009,2251;4007,2251;4006,2252;4006,2253;4006,2255;4006,2256;4008,2257;4009,2257;4011,2257;4012,2257;4013,2256;4508,816;4463,813;4456,812;4450,811;4444,809;4438,805;4433,801;4429,797;4425,792;4423,785;4421,779;3140,1861;3142,1862;3143,1863;3145,1863;3147,1863;3149,1862;3150,1860;3150,1859;3148,1856;3146,1856;3144,1855;3142,1856;3141,1857;3140,1858;3140,1860;3233,1817;5884,762;5866,781;5861,784;5856,785;5853,784;5849,783;2821,2582;2821,2580;2820,2579;2818,2577;2816,2577;2814,2577;2812,2577;2810,2579;2809,2580;2810,2582;2810,2584;2812,2585;2814,2586;2816,2586;2819,2585;3843,1150;3844,1148;3844,1147;3843,1146;3842,1145;3840,1144;3839,1144;3837,1145;3836,1146;3835,1147;3835,1148;3836,1149;3837,1150;3838,1151;3840,1151;4208,1555;4208,1553;4207,1552;4206,1551;4205,1550;4203,1550;4201,1551;4200,1552;4198,1554;4199,1556;4200,1557;4202,1557;4204,1557;4205,1557;4207,1556;4875,733;4876,735;4877,736;4879,736;4881,736;4882,736;4884,735;4884,734;4884,731;4883,730;4881,729;4879,729;4877,730;4876,731;4875,732;3039,1681;3041,1682;3043,1682;3045,1682;3047,1681;3048,1680;3049,1679;3048,1677;3047,1676;3046,1675;3044,1674;3042,1675;3040,1675;3039,1676;3038,1678;2828,2294;2829,2295;2831,2295;2833,2295;2834,2294;2835,2293;2836,2291;2836,2290;2833,2288;2831,2288;2830,2288;2828,2288;2827,2290;2826,2291;2827,2292;3960,2224;3961,2224;3963,2224;3964,2223;3965,2222;3965,2221;3964,2219;3963,2218;3961,2218;3960,2218;3958,2218;3957,2219;3956,2220;3956,2222;3957,2223;2890,1835;2899,1833;2907,1831;2912,1828;2916,1824;3334,1697;3336,1698;3339,1698;3341,1697;3343,1695;3344,1694;3344,1692;3343,1690;3338,1688;3336,1688;3334,1689;3332,1690;3331,1692;3331,1694;3332,1696;2774,2560;2775,2559;2775,2557;2775,2556;2773,2555;2772,2554;2770,2554;2768,2555;2766,2557;2766,2558;2766,2560;2767,2561;2769,2561;2771,2562;2773,2561;4739,847;4737,842;4736,836;4736,814;4737,811;4740,808;4743,806;4746,804;4751,803;3201,1967;3202,1968;3204,1968;3206,1969;3208,1968;3209,1968;3210,1966;3210,1965;3210,1964;3209,1963;3207,1962;3205,1962;3204,1962;3202,1963;3201,1964;4053,1622;4059,1628;5058,1868;5114,1902;3972,2123;3974,2123;3976,2123;3977,2122;3978,2120;3978,2119;3978,2118;3977,2116;3975,2116;3973,2116;3971,2116;3970,2117;3969,2118;3969,2120;3969,2121;4706,423;4708,424;4710,425;4712,425;4713,424;4715,423;4716,421;4716,420;4715,418;4713,417;4711,417;4709,417;4708,417;4706,418;4705,420;3035,2373;3037,2374;3039,2374;3041,2374;3042,2373;3043,2372;3043,2370;3043,2369;3040,2367;3038,2367;3036,2367;3035,2368;3034,2369;3033,2371;3034,2372;6792,935;6794,936;6796,936;6798,936;6799,935;6800,933;6800,932;6800,930;6797,929;6795,929;6793,929;6792,930;6791,931;6791,933;6791,934;3686,2207;3688,2208;3690,2208;3692,2207;3693,2206;3694,2205;3694,2204;3694,2202;3693,2201;3691,2200;3689,2200;3687,2201;3686,2201;3685,2203;3685,2204;3685,2206;2572,2135;2584,2143;2595,2149;2601,2151;2611,2151;6322,258;6324,258;6326,258;6328,257;6328,255;6329,254;6328,252;6327,251;6323,250;6321,251;6320,252;6319,253;6319,255;6319,256;6320,257;2787,1751;2787,1753;2789,1754;2790,1754;2792,1755;2794,1754;2796,1753;2797,1752;2796,1749;2795,1748;2793,1747;2791,1747;2789,1747;2788,1748;2787,1750;2872,2318;2874,2319;2876,2319;2878,2318;2879,2317;2880,2316;2880,2315;2879,2313;2877,2312;2875,2311;2873,2312;2872,2313;2871,2314;2871,2316;2871,2317;3520,1861;3521,1859;3520,1858;3519,1856;3517,1855;3514,1855;3512,1855;3510,1856;3509,1858;3508,1860;3509,1861;3510,1863;3512,1864;3515,1864;3517,1864;4580,835;4579,807;4578,789;4578,775;4579,763;4579,758;3279,2118;3280,2119;3282,2119;3284,2119;3286,2118;3287,2116;3287,2115;3286,2114;3283,2112;3281,2112;3280,2112;3278,2113;3277,2114;3277,2116;3278,2117;3235,1914;3240,1912;3245,1909;3251,1902;3260,1893;3274,1880;4281,758;4282,755;4285,753;4318,720;4322,718;4326,716;4331,716;4335,715;4659,1021;4694,1043;4703,1050;4707,1051;4714,1045;4713,1043;6410,980;6411,981;6413,981;6415,981;6417,981;6418,979;6419,978;6419,976;6418,975;6416,974;6414,974;6412,974;6411,974;6409,976;6409,977;4651,690;4653,690;4656,690;4657,689;4659,688;4659,686;4659,685;4658,683;4656,682;4654,682;4652,682;4650,683;4649,684;4649,686;4649,687;4976,849;4973,854;4973,859;4972,864;4972,869;4971,873;4967,877;4938,907;4913,931;4894,951;4880,964;4877,968;2809,1836;2808,1826;2809,1822;2810,1817;2815,1812;2818,1807;2825,1801;2818,2183;2820,2182;2821,2181;2821,2180;2821,2179;2820,2177;2818,2177;2817,2176;2814,2178;2813,2179;2812,2180;2813,2181;2814,2182;2815,2183;2817,2183;3588,2151;3590,2151;3593,2151;3595,2150;3597,2148;3598,2146;3597,2144;3595,2142;3593,2141;3591,2140;3588,2141;3586,2142;3584,2144;3584,2146;3584,2148;3586,2150;2749,1783;2745,1780;2741,1776;2739,1772;2736,1764;2732,1737;2732,1733;2733,1729;3087,1712;3088,1711;3089,1710;3088,1708;3087,1707;3086,1706;3084,1706;3082,1706;3081,1707;3080,1708;3079,1710;3080,1711;3081,1712;3082,1713;3084,1713;2871,2197;2871,2195;2871,2194;2869,2192;2867,2191;2865,2191;2863,2191;2861,2192;2860,2194;2860,2196;2861,2197;2862,2199;2864,2199;2866,2200;2868,2199;3097,1644;3097,1643;3095,1642;3093,1642;3092,1642;3090,1642;3089,1644;3088,1645;3088,1646;3089,1648;3090,1649;3092,1649;3094,1649;3096,1648;3097,1647;3777,2307;3779,2307;3780,2306;3782,2305;3782,2304;3782,2302;3781,2301;3779,2300;3775,2299;3773,2300;3772,2302;3772,2303;3772,2305;3773,2306;3775,2307;5155,1923;3044,2116;3044,2114;3043,2113;3042,2112;3040,2111;3038,2111;3036,2112;3035,2113;3034,2115;3034,2116;3035,2118;3037,2119;3039,2119;3041,2119;3042,2118;3487,1958;3488,1958;3490,1957;3492,1956;3493,1955;3493,1954;3492,1952;3491,1951;3489,1950;3487,1950;3486,1951;3484,1952;3483,1953;3483,1954;3484,1956;2880,2172;2882,2171;2883,2170;2884,2169;2884,2167;2884,2165;2882,2164;2880,2163;2876,2164;2874,2165;2873,2166;2873,2168;2874,2170;2875,2171;2877,2172;2925,2647;2926,2646;2926,2645;2925,2644;2924,2643;2922,2642;2921,2642;2919,2643;2917,2645;2917,2646;2918,2647;2919,2648;2921,2649;2922,2649;2924,2648;3284,1941;3286,1942;3288,1942;3289,1941;3291,1940;3292,1939;3292,1937;3291,1936;3288,1934;3286,1934;3284,1935;3283,1936;3282,1937;3282,1938;3283,1940;4266,1991;4268,1992;4270,1992;4273,1991;4275,1990;4276,1988;4276,1986;4275,1984;4271,1982;4269,1982;4266,1982;4264,1984;4263,1985;4263,1987;4264,1989;3074,2084;3074,2082;3074,2081;3073,2079;3071,2078;3069,2078;3067,2078;3065,2079;3064,2080;3064,2082;3064,2084;3065,2085;3067,2086;3069,2086;3071,2086;4553,2225;3109,2053;3109,2051;3109,2050;3107,2049;3106,2048;3104,2048;3102,2048;3100,2049;3099,2050;3099,2052;3099,2053;3100,2055;3102,2055;3104,2056;3106,2055;3816,2114;3818,2115;3820,2115;3822,2115;3823,2114;3824,2113;3825,2111;3824,2110;3821,2108;3819,2108;3817,2108;3816,2109;3815,2110;3815,2112;3815,2113;3861,2140;3862,2142;3863,2143;3865,2143;3867,2143;3869,2142;3870,2141;3871,2140;3870,2137;3868,2136;3866,2135;3865,2136;3863,2136;3862,2137;3861,2139;3789,2165;3790,2166;3792,2166;3794,2166;3795,2165;3796,2163;3797,2162;3796,2161;3795,2160;3793,2159;3792,2159;3790,2159;3788,2160;3787,2161;3787,2163;3788,2164;3733,2270;3735,2267;3741,2248;3744,2240;3748,2232;3760,2201;3763,2194;3765,2191;3768,2187;3775,2179;4297,2779;3637,2178;3639,2178;3641,2178;3642,2178;3644,2177;3644,2175;3644,2174;3644,2172;3642,2171;3641,2171;3639,2171;3637,2171;3636,2172;3635,2174;3635,2175;3636,2176;3618,2197;3631,2184;3015,3003;3017,3003;3018,3002;3020,3002;3020,3000;3020,2999;3020,2998;3019,2997;3017,2996;3015,2996;3014,2997;3012,2997;3012,2999;3012,3000;3012,3001;2953,1976;2955,1977;2957,1977;2959,1976;2961,1975;2962,1974;2962,1972;2962,1971;2961,1969;2959,1969;2957,1968;2955,1969;2953,1970;2952,1971;2952,1973;7268,322;7277,316;7280,311;7281,307;7280,302;7279,299;7277,295;7274,293;7198,249;7190,246;7181,242;7171,240;7153,237;7145,236;7126,237;2972,2114;2974,2114;2975,2112;2976,2111;2976,2109;2975,2108;2973,2107;2971,2106;2967,2107;2966,2109;2965,2110;2966,2112;2967,2113;2968,2114;2970,2115;3729,2048;3686,2794;3572,2169;3584,2156;3300,1845;3301,1846;3303,1846;3304,1846;3306,1846;3307,1844;3307,1843;3307,1842;3306,1841;3305,1840;3303,1839;3302,1840;3300,1840;3299,1841;3298,1843;3726,2826;2991,1674;2990,1672;2988,1671;2987,1671;2985,1671;2983,1671;2982,1672;2981,1674;2981,1675;2982,1677;2983,1678;2985,1678;2987,1678;2989,1678;2990,1677;2912,1692;2914,1693;2916,1694;2918,1694;2920,1693;2921,1692;2922,1690;2922,1688;2921,1687;2919,1686;2917,1685;2915,1686;2913,1686;2912,1688;2911,1689;2796,2262;2798,2260;2798,2259;2798,2257;2797,2256;2795,2255;2793,2254;2790,2255;2787,2257;2787,2259;2787,2260;2789,2262;2790,2263;2792,2263;2795,2263;2633,2060;2634,2058;2633,2057;2632,2056;2630,2055;2628,2055;2627,2055;2625,2056;2624,2057;2624,2059;2624,2060;2626,2061;2627,2062;2629,2062;2631,2062;6233,981;6266,944;6275,938;6285,934;6297,935;6307,939;6319,947;6330,953;6343,957;6363,964;6380,972;8381,2394;8383,2394;8385,2393;8386,2392;8387,2390;8387,2389;8386,2388;8385,2387;8383,2386;8381,2386;8379,2387;8378,2388;8377,2389;8377,2391;8378,2392;8171,2135;8172,2139;8170,2142;8228,2120;8228,2118;8228,2117;8227,2116;8226,2115;8224,2115;8223,2115;8221,2116;8220,2117;8220,2118;8220,2119;8221,2120;8222,2121;8224,2121;8225,2121;4164,1518;4165,1518;4167,1517;4168,1515;4168,1514;4167,1512;4166,1511;4164,1510;4161,1511;4159,1512;4158,1513;4158,1514;4159,1516;4160,1517;4162,1518;3455,2083;3458,2086;3462,2089;3465,2090;3470,2092;3475,2093;3481,2093;3488,2091;3497,2087;3501,2084;3504,2081;3506,2078;3507,2074;3509,2065;3508,2059;3496,2040;3494,2036;3492,2031;3492,2029;3492,2023;3494,2018;3502,2009;3233,1690;3235,1689;3236,1687;3236,1686;3236,1684;3235,1683;3233,1682;3231,1682;3229,1682;3228,1683;3227,1684;3226,1686;3227,1687;3228,1689;3229,1689;6320,3075;6319,3073;6318,3072;6317,3071;6315,3070;6312,3070;6311,3071;6309,3072;6309,3076;6310,3077;6312,3078;6314,3079;6316,3078;6318,3078;6319,3076;7960,3228;7955,3227;7953,3225;7953,3223;7954,3221;3407,2152;3408,2153;3410,2153;3412,2153;3413,2152;3414,2150;3414,2149;3414,2147;3411,2146;3409,2146;3407,2146;3406,2147;3405,2148;3405,2150;3405,2151;3661,2120;9078,2719;9079,2717;9079,2716;9079,2714;9077,2713;9076,2713;9074,2712;9072,2713;9070,2715;9069,2717;9070,2718;9071,2719;9073,2720;9075,2720;9077,2720;8927,1834;8928,1833;8929,1832;8929,1830;8928,1829;8927,1828;8925,1827;8923,1828;8921,1828;8920,1829;8919,1831;8919,1832;8920,1834;8921,1835;8923,1835;8367,1931;8367,1930;8366,1929;8365,1928;8363,1927;8362,1927;8360,1928;8359,1929;8358,1930;8358,1932;8359,1933;8360,1934;8362,1934;8364,1934;8365,1933;9009,2714;9026,2713;9143,2081;9145,2080;9146,2079;9147,2078;9148,2076;9147,2075;9146,2074;9144,2073;9140,2073;9138,2074;9137,2075;9137,2077;9138,2078;9139,2080;9141,2080;8465,2086;8471,2084;4746,2873;4772,2891;4772,2894;6338,1776;6340,1776;6341,1777;6343,1776;6344,1775;6345,1774;6345,1773;6345,1772;6342,1770;6341,1770;6339,1770;6338,1771;6337,1772;6337,1773;6337,1775;9367,2601;9369,2600;9370,2599;9371,2597;9371,2596;9369,2594;9368,2593;9366,2593;9364,2593;9362,2594;9361,2596;9360,2597;9361,2599;9362,2600;9363,2601;8781,1810;8782,1808;8782,1807;8781,1805;8779,1804;8777,1804;8776,1804;8774,1805;8772,1806;8772,1807;8772,1809;8773,1810;8774,1811;8776,1812;8778,1811;9129,1955;9114,1925;9139,1917;9129,1920;5962,682;5964,680;8986,1928;8982,1918;8982,1910;8982,1901;8983,1891;8983,1882;8977,1874;2976,1758;2977,1758;2979,1757;2980,1756;2981,1754;2980,1753;2979,1751;2978,1751;2976,1750;2974,1750;2972,1751;2971,1752;2971,1754;2971,1755;2972,1757;9213,1997;9212,2004;9207,2021;9193,2050;5010,130;5032,144;5042,149;5047,149;5056,146;5070,139;5075,135;5085,124;9188,2057;9190,2057;9192,2057;9194,2056;9195,2055;9196,2054;9195,2052;9194,2051;9191,2049;9189,2049;9187,2050;9186,2051;9186,2053;9186,2054;9187,2056;9416,2515;9328,2515;4164,2303;4156,2312;4148,2320;3442,1999;5979,3415;5981,3415;5983,3415;5984,3414;5985,3413;5986,3412;5986,3411;5985,3409;5982,3408;5980,3408;5979,3408;5978,3410;5977,3411;5977,3412;5978,3414;5974,3219;5975,3220;5977,3220;5978,3221;5980,3220;5981,3220;5982,3219;5982,3217;5981,3216;5980,3215;5979,3215;5978,3215;5976,3215;5975,3216;5974,3217;6291,3295;6295,3293;6299,3293;6304,3295;6307,3297;6308,3301;8547,2030;8533,2028;8481,2012;8467,2011;8452,2015;8444,2019;8437,2024;8405,2049;8394,2051;8395,2053;8396,2054;8398,2054;8401,2054;8403,2053;8404,2052;8405,2051;8404,2047;8402,2046;8400,2045;8398,2046;8396,2046;8394,2048;8394,2049;8780,1913;8781,1912;8782,1911;8782,1909;8781,1908;8780,1907;8779,1906;8777,1906;8774,1908;8773,1909;8773,1910;8773,1912;8775,1913;8776,1913;8778,1914;5806,3330;6275,2713;9374,2554;9375,2555;9376,2557;9377,2557;9379,2558;9381,2557;9383,2556;9384,2555;9384,2552;9383,2551;9381,2550;9379,2549;9377,2550;9376,2551;9375,2552;4696,2881;4732,2840;4486,2881;4467,2871;4462,2868;4457,2868;4453,2869;4448,2875;4446,2877;4448,2886;4456,2900;4467,2914;4483,2926;4517,2946;4547,2964;4553,2965;4668,2800;4667,2864;4703,2823;4707,2823;4593,2775;4638,2785;4646,2786;4625,2902;4623,2899;8342,2139;8341,2137;8340,2136;8338,2135;8335,2135;8333,2135;8331,2136;8330,2138;8330,2140;8330,2141;8332,2143;8334,2144;8336,2144;8338,2144;8340,2143;4758,2856;5325,2656;5328,2737;4624,2837;4629,2843;4600,2838;6543,166;6545,166;6546,166;6548,165;6548,163;6549,162;6548,161;6547,160;6545,159;6543,159;6542,159;6540,160;6539,162;6539,163;6540,164;4563,2964;4572,2959;4588,2942;4614,2914;8651,1870;8646,1872;8615,1880;8385,2001;8395,2003;8405,2007;8416,2011;8423,2014;4051,2873;2561,2071;2562,2070;2561,2068;2560,2067;2558,2066;2556,2066;2554,2067;2553,2068;2552,2069;2552,2071;2552,2072;2553,2073;2555,2074;2557,2074;2559,2074;3668,2225;3678,2216;3827,2203;3823,2207;3820,2212;3819,2217;3818,2243;3817,2251;3816,2255;3812,2259;9511,2316;9511,2314;9509,2313;9508,2313;9506,2313;9504,2313;9503,2314;9502,2315;9502,2317;9502,2318;9503,2319;9505,2320;9507,2320;9509,2320;9510,2319;9651,2426;9653,2427;9655,2427;9656,2426;9657,2426;9658,2424;9658,2423;9658,2422;9655,2420;9654,2420;9652,2421;9651,2421;9650,2423;9650,2424;9650,2425;9516,2046;9517,2044;9517,2043;9516,2041;9515,2040;9513,2040;9511,2040;9509,2041;9508,2042;9508,2043;9508,2044;9508,2046;9510,2047;9511,2047;9513,2047;1898,3314;1900,3315;1901,3315;1903,3314;1904,3313;1905,3312;1905,3310;1904,3309;1902,3308;1901,3307;1899,3308;1897,3308;1896,3309;1895,3311;1896,3312;5813,3334;5815,3333;5816,3332;5816,3330;5816,3329;5815,3327;5813,3327;5812,3326;5808,3327;5807,3328;5807,3331;5808,3333;5809,3333;5811,3334;5882,3335;5883,3334;5883,3333;5884,3332;5883,3331;5882,3330;5881,3330;5879,3330;5877,3331;5876,3332;5876,3333;5877,3334;5878,3335;5879,3335;5880,3335;4961,716;4933,700;4921,692;4912,688;4905,685;4884,680;4881,678;4875,671;4874,665;4872,576;4872,540;4872,536;4877,530;4880,527;4885,525;4890,525;4895,527;4900,530;2758,1530;2777,1541;2792,1551;2808,1560;2822,1569;2827,1573;2830,1577;2831,1582;2831,1587;2831,1591;2828,1595;2825,1601;2823,1610;2827,1619;2832,1623;2837,1626;1941,3240;1948,3232;7864,1735;7867,1732;7868,1729;7867,1726;7866,1722;7865,1720;7862,1718;7858,1717;1990,3280;1991,3281;1993,3282;1994,3282;1996,3282;1998,3281;1999,3280;1999,3278;1998,3276;1996,3275;1995,3275;1993,3275;1991,3276;1990,3277;1990,3278;1830,3499;1832,3498;1832,3497;1832,3496;1832,3494;1830,3494;1829,3493;1827,3493;1824,3494;1824,3496;1824,3497;1824,3498;1826,3499;1827,3500;1829,3500;1780,3523;1781,3522;1782,3521;1782,3520;1781,3519;1780,3518;1778,3517;1776,3517;1774,3519;1773,3520;1773,3522;1774,3523;1775,3524;1777,3524;1779,3524;8435,1817;8442,1816;8450,1818;8458,1822;8463,1827;2926,1738;2928,1738;2930,1737;2931,1736;2932,1734;2931,1733;2930,1731;2929,1730;2927,1730;2925,1730;2923,1731;2922,1732;2921,1734;2922,1735;2923,1737;8369,1842;8370,1842;8372,1841;8373,1840;8373,1839;8373,1837;8372,1836;8371,1835;8370,1835;8368,1835;8366,1836;8365,1837;8365,1838;8365,1839;8366,1840;1588,3264;1590,3263;1591,3262;1591,3261;1591,3260;1590,3259;1589,3258;1587,3257;1585,3257;1584,3258;1583,3259;1582,3260;1583,3262;1583,3263;1585,3264;2491,2594;2492,2593;2491,2591;2490,2590;2485,2588;2483,2588;2482,2588;2480,2589;2479,2591;2479,2592;2480,2594;2484,2596;2486,2597;2487,2597;2489,2596;9259,2660;9257,2652;9254,2627;9256,2611;9258,2606;9268,2600;9283,2596;9300,2592;9314,2585;9320,2580;9324,2570;9327,2545;3299,1775;3305,1782;3318,1794;3323,1797;3330,1801;3337,1805;3343,1809;3347,1813;3352,1819;3356,1824;3359,1832;3361,1838;3362,1843;3363,1849;8946,2302;8947,2300;8947,2298;8946,2297;8945,2296;8943,2295;8940,2295;8938,2295;8937,2297;8936,2298;8936,2300;8937,2301;8938,2303;8940,2303;8942,2303;1834,3389;1835,3388;1836,3387;1836,3386;1836,3385;1835,3384;1833,3383;1832,3383;1830,3383;1829,3384;1828,3385;1828,3386;1828,3387;1829,3388;1830,3389;8923,2129;8957,2120;6722,43;6712,41;6708,40;6704,37;6699,35;6695,32;6693,31;6689,30;6686,30;9680,2276;9681,2274;9680,2273;9679,2271;9677,2271;9675,2270;9673,2271;9672,2272;9670,2273;9670,2275;9671,2276;9672,2278;9674,2278;9676,2279;9678,2278;4683,1055;4682,1058;3885,3100;436,2689;402,2653;368,2616;323,2567;8180,1262;8179,1256;8178,1252;8182,1248;8217,1238;6453,3104;6343,3030;6363,3046;6422,3070;6442,3074;6461,3074;6458,3094;3775,3128;3781,3122;3782,3120;3783,3119;3784,3117;3785,3115;3785,3112;3786,3110;3787,3109;3803,3093;3823,3071;3825,3070;3826,3069;3827,3069;3830,3069;3833,3070;5534,2356;7469,2385;7495,2389;7521,2397;7535,2402;7546,2407;7552,2409;7557,2411;7508,2386;7512,2390;7517,2393;7522,2395;5236,2759;7768,2543;7778,2540;2366,3451;2366,3450;2365,3449;2363,3448;2361,3448;2360,3448;2358,3449;2358,3451;2358,3452;2358,3453;2359,3454;2361,3455;2363,3455;2364,3454;2366,3453;3371,3616;3366,3614;3365,3611;3369,3607;9136,3587;9120,3588;9083,3588;9015,3588;8978,3587;4786,3561;4791,3561;4795,3559;4816,3560;8278,3141;8285,3140;8288,3137;8293,3133;8287,3150;8292,3146;8295,3140;8297,3131;8300,3125;7072,3516;8284,3146;8289,3142;8292,3134;8293,3130;8294,3128;8319,3113;282,3347;317,3336;353,3326;384,3318;792,3165;788,3159;583,3261;627,3247;37,3482;63,3457;102,3420;118,3404;129,3394;134,3389;775,3197;948,3160;938,3148;1040,2866;1020,2872;1015,2874;941,3138;953,3132;960,3125;998,3007;996,2983;994,2970;993,2966;987,2952;983,2945;952,2908;942,2896;936,2891;932,2887;928,2883;922,2879;915,2875;906,2943;712,2782;745,2762;667,2990;655,2960;946,2917;943,2910;931,2917;653,2951;651,2943;644,2922;642,2914;640,2905;727,3014;677,3018;671,3005;687,3038;682,3029;695,3036;741,2943;697,3052;629,2924;623,2923;1144,2127;1080,2167;984,2210;961,2219;934,2228;878,2243;809,2261;976,2934;970,2928;720,3016;713,3020;708,3023;701,3025;697,3026;693,3026;689,3025;685,3023;681,3020;718,3021;711,3025;692,3032;1001,2881;982,2891;791,2820;786,2812;781,2803;776,2796;771,2789;759,2775;988,3072;991,3063;994,3049;996,3044;712,3061;708,3057;704,3052;703,3048;703,3046;704,3042;706,3037;709,3034;712,3032;785,3044;800,3058;816,3078;932,2892;935,2898;936,2901;936,2905;936,2908;934,2911;879,2963;937,2926;942,2924;946,2922;951,2921;956,2922;962,2924;1650,3525;1683,3557;1162,3864;1194,3853;1251,3836;997,3027;997,3017;909,2873;899,2870;892,2868;886,2867;875,2866;863,2865;848,2864;842,2862;833,2860;826,2857;819,2853;814,2850;811,2848;809,2846;804,2840;801,2837;799,2835;795,2827;618,2923;612,2921;605,2918;598,2915;639,2889;168,3369;176,3367;191,3365;196,3365;209,3364;219,3363;227,3362;235,3360;243,3358;987,2339;996,2342;1000,2345;1001,2351;1004,2357;1007,2363;1010,2367;1014,2369;1018,2369;1028,2367;1039,2365;1045,2361;1048,2355;1051,2349;1056,2346;1063,2343;1077,2336;1087,2332;1095,2328;1100,2324;1101,2319;1098,2315;1096,2311;1094,2306;1093,2300;1091,2291;1089,2282;1087,2275;1082,2270;1077,2266;1071,2262;1023,2235;994,2220;987,2214",
		"roads": [
			{
				"speed": 40,
				"name": "Halls Ferry Road",
				"nodes": [
					0,
					1
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					2,
					3,
					4,
					5,
					6,
					7,
					8,
					9,
					10,
					11,
					12,
					13,
					14,
					15,
					16
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					17,
					18,
					19
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					20,
					21,
					22,
					23,
					24
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					25,
					26,
					27,
					28,
					29,
					30,
					31,
					32
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					33,
					34,
					35,
					36,
					37,
					38,
					39,
					40,
					41,
					42
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					43,
					44,
					45,
					46,
					47
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					48,
					49,
					50,
					51,
					52,
					53,
					54,
					55,
					20
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					56,
					57,
					58,
					59,
					60,
					61,
					62,
					56
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					63,
					64
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					65,
					66,
					67,
					68,
					69,
					70
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					71
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					72,
					73,
					74,
					75,
					76
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					77,
					78,
					79,
					80,
					81,
					82,
					83,
					84,
					85
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					86,
					87
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					88,
					89,
					90,
					91,
					92
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					93,
					94,
					95,
					96,
					97,
					98
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					99,
					100,
					101,
					102,
					103,
					104,
					105,
					106,
					107,
					108
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					109,
					110,
					111,
					112,
					113,
					114
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					115,
					116,
					117,
					118,
					119,
					120,
					121,
					122,
					123,
					124,
					125,
					126,
					127,
					128
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					129,
					130,
					131,
					132,
					133
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					134,
					135,
					136,
					137,
					138,
					139,
					140
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					141,
					142
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					143,
					144,
					145,
					146,
					147
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					148,
					149,
					150
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					151,
					152,
					153
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					154,
					155
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					156,
					157,
					158,
					159,
					160,
					161,
					162,
					163,
					164,
					165,
					166,
					167,
					168,
					169,
					170,
					171,
					172,
					173,
					174
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					175,
					176,
					177,
					178,
					179,
					180,
					181,
					182
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					183,
					184,
					185,
					186,
					187,
					188,
					189,
					190,
					191,
					192,
					193,
					194,
					195
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					196,
					197,
					198
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					199,
					200,
					201,
					202,
					203
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					204,
					205
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					206,
					207,
					208
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					209,
					210,
					211,
					212,
					213,
					214
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					215,
					216,
					217,
					218,
					219,
					220,
					221,
					222,
					223,
					224,
					225,
					226,
					227,
					228,
					229,
					230,
					147,
					231,
					232,
					233,
					234
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					235,
					236
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					237,
					238,
					239,
					240,
					241
				]
			},
			{
				"speed": 25,
				"name": "Chartley Court",
				"nodes": [
					242,
					243,
					244,
					245,
					246,
					247,
					248
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					249,
					250,
					251,
					252
				]
			},
			{
				"speed": 25,
				"name": "Fee Fee Hills Drive",
				"nodes": [
					253,
					254
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					255,
					256,
					257,
					258,
					259,
					260,
					261,
					262,
					263,
					264,
					265,
					266,
					267,
					268,
					269,
					270,
					271,
					272
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					273,
					274
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					275,
					276
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					277,
					278,
					279,
					280,
					281,
					282,
					283,
					284,
					285,
					286,
					287,
					288,
					289,
					290,
					291,
					292,
					293,
					294,
					295,
					296,
					297,
					298,
					299,
					300,
					301,
					302,
					303,
					304,
					305,
					306,
					307,
					308
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					309,
					310,
					311
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					312,
					313,
					314,
					315
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					316,
					317,
					318
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					319,
					320,
					321
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					322,
					323,
					324,
					325,
					326,
					327
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					328,
					329,
					330,
					331,
					332
				]
			},
			{
				"speed": 25,
				"name": "Curtis Court",
				"nodes": [
					333,
					334
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					79,
					335,
					336,
					337,
					338,
					339,
					340
				]
			},
			{
				"speed": 25,
				"name": "Rancho Lane",
				"nodes": [
					341,
					342,
					343,
					344,
					345,
					346,
					347
				]
			},
			{
				"speed": 25,
				"name": "Bay Wind Court",
				"nodes": [
					348,
					349
				]
			},
			{
				"speed": 25,
				"name": "Kael Lane",
				"nodes": [
					350,
					351,
					352
				]
			},
			{
				"speed": 25,
				"name": "Lost Hollow Court",
				"nodes": [
					353,
					354,
					355,
					356,
					357,
					358,
					359,
					360,
					361,
					362,
					363,
					364,
					365,
					366,
					367,
					368,
					353
				]
			},
			{
				"speed": 25,
				"name": "Laclede Rd",
				"nodes": [
					369,
					370,
					371,
					372,
					373,
					374,
					375,
					376,
					377,
					378,
					182,
					379,
					380,
					381,
					183,
					382,
					383,
					384,
					385,
					386,
					387,
					388,
					389,
					390,
					391,
					392,
					393,
					394,
					395,
					396,
					397
				]
			},
			{
				"speed": 25,
				"name": "Rue Saint Joseph",
				"nodes": [
					398,
					399,
					400,
					401,
					402,
					403,
					404
				]
			},
			{
				"speed": 25,
				"name": "Ledyard Drive",
				"nodes": [
					405,
					406,
					407,
					408,
					409,
					410,
					411,
					412,
					413,
					414,
					415
				]
			},
			{
				"speed": 25,
				"name": "Linkous Drive",
				"nodes": [
					416,
					417,
					418
				]
			},
			{
				"speed": 25,
				"name": "Sulla Drive",
				"nodes": [
					419,
					420,
					421,
					422,
					423,
					424
				]
			},
			{
				"speed": 25,
				"name": "Albert Drive",
				"nodes": [
					425,
					426,
					427
				]
			},
			{
				"speed": 30,
				"name": "Tahoe Drive",
				"nodes": [
					428,
					429,
					430,
					431
				]
			},
			{
				"speed": 25,
				"name": "Gallatin Lane",
				"nodes": [
					432
				]
			},
			{
				"speed": 25,
				"name": "South Branridge Road",
				"nodes": [
					433,
					434,
					435,
					436,
					437,
					438,
					439,
					440,
					441,
					442,
					443,
					444,
					445,
					446,
					447,
					448,
					449,
					450
				]
			},
			{
				"speed": 25,
				"name": "Lancer Court",
				"nodes": [
					451,
					452
				]
			},
			{
				"speed": 25,
				"name": "Pimlico Drive",
				"nodes": [
					453,
					454,
					455,
					456,
					457,
					458
				]
			},
			{
				"speed": 25,
				"name": "Stoney End Court",
				"nodes": [
					459,
					460,
					461,
					462,
					463,
					464,
					465,
					466,
					467,
					468,
					469,
					470,
					471,
					472,
					473,
					474,
					459
				]
			},
			{
				"speed": 25,
				"name": "Haventree Lane",
				"nodes": [
					475,
					476,
					477,
					478,
					479,
					480,
					481,
					482,
					483
				]
			},
			{
				"speed": 25,
				"name": "Millcreek Drive",
				"nodes": [
					484,
					485,
					486,
					487,
					488,
					489,
					490,
					491
				]
			},
			{
				"speed": 25,
				"name": "Liverpool Drive",
				"nodes": [
					492,
					493,
					494,
					495
				]
			},
			{
				"speed": 25,
				"name": "Chaparrall Creek Drive",
				"nodes": [
					496,
					497,
					498,
					499,
					500,
					501,
					502,
					503,
					504
				]
			},
			{
				"speed": 25,
				"name": "Ellsinore Drive",
				"nodes": [
					505,
					506,
					507,
					508,
					509,
					510,
					511,
					512,
					513,
					514,
					515
				]
			},
			{
				"speed": 25,
				"name": "Marion Park Drive",
				"nodes": [
					516,
					517,
					70
				]
			},
			{
				"speed": 25,
				"name": "Albert Drive",
				"nodes": [
					518,
					519,
					520,
					521,
					522,
					523,
					524,
					525,
					526,
					527,
					528,
					529,
					530,
					531
				]
			},
			{
				"speed": 25,
				"name": "Kostka Lane",
				"nodes": [
					532,
					533,
					534,
					535,
					536,
					537,
					538,
					539
				]
			},
			{
				"speed": 25,
				"name": "Chaparrall Creek Drive",
				"nodes": [
					540,
					541,
					484,
					542,
					543,
					544,
					545,
					546,
					491,
					547,
					548,
					549,
					550,
					551,
					552,
					553,
					554,
					555,
					556,
					557,
					558,
					559,
					560,
					561,
					562,
					563,
					564,
					565,
					566,
					567,
					496
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					568,
					569,
					570,
					571,
					572,
					573,
					574,
					575,
					576,
					577,
					578,
					579,
					580,
					581,
					582,
					583,
					584,
					585,
					586,
					587,
					588,
					589,
					590,
					591,
					592,
					593,
					594,
					595,
					596,
					597,
					598,
					599,
					600
				]
			},
			{
				"speed": 25,
				"name": "Jeanette Drive",
				"nodes": [
					601,
					602,
					603,
					604,
					605,
					606
				]
			},
			{
				"speed": 25,
				"name": "Hundley Drive",
				"nodes": [
					607,
					608,
					609
				]
			},
			{
				"speed": 25,
				"name": "Haber Drive",
				"nodes": [
					610,
					611
				]
			},
			{
				"speed": 25,
				"name": "Saginaw Drive",
				"nodes": [
					612,
					613,
					614,
					615,
					616,
					617,
					618
				]
			},
			{
				"speed": 25,
				"name": "Whisper Lake Drive",
				"nodes": [
					619,
					620
				]
			},
			{
				"speed": 25,
				"name": "Whisper Lake Drive",
				"nodes": [
					620,
					621
				]
			},
			{
				"speed": 25,
				"name": "Periwinkle Court",
				"nodes": [
					622,
					623,
					624,
					625,
					626,
					627,
					628,
					629,
					630,
					631,
					632,
					633,
					634
				]
			},
			{
				"speed": 25,
				"name": "Shamrock Drive",
				"nodes": [
					635,
					636,
					637,
					638,
					639,
					640,
					641,
					428
				]
			},
			{
				"speed": 25,
				"name": "Flight Drive",
				"nodes": [
					642,
					643,
					644,
					645,
					646,
					647,
					648,
					649,
					650,
					651,
					652
				]
			},
			{
				"speed": 25,
				"name": "New Sun Court",
				"nodes": [
					653,
					654,
					655
				]
			},
			{
				"speed": 25,
				"name": "Sadonia Avenue",
				"nodes": [
					656,
					657,
					658,
					659,
					660,
					661,
					662
				]
			},
			{
				"speed": 25,
				"name": "Laupher Lane",
				"nodes": [
					663,
					664
				]
			},
			{
				"speed": 25,
				"name": "Calderabby Court",
				"nodes": [
					665,
					666,
					667
				]
			},
			{
				"speed": 25,
				"name": "New Haven Drive",
				"nodes": [
					668,
					669,
					670,
					671,
					672,
					673,
					674
				]
			},
			{
				"speed": 25,
				"name": "Stonymont Drive",
				"nodes": [
					196,
					675,
					676,
					677
				]
			},
			{
				"speed": 25,
				"name": "Canter Drive",
				"nodes": [
					678,
					679,
					680,
					681,
					682,
					683,
					684,
					685
				]
			},
			{
				"speed": 25,
				"name": "Briarwood Lane",
				"nodes": [
					686,
					687,
					688,
					689,
					690,
					691,
					692,
					693,
					694,
					695,
					696,
					697
				]
			},
			{
				"speed": 25,
				"name": "Buttercup Court",
				"nodes": [
					698,
					699
				]
			},
			{
				"speed": 25,
				"name": "Rhine Court",
				"nodes": [
					700,
					701
				]
			},
			{
				"speed": 25,
				"name": "Turf Lane",
				"nodes": [
					702,
					703,
					704,
					705,
					706,
					707
				]
			},
			{
				"speed": 25,
				"name": "Sycamore Glen Court",
				"nodes": [
					708,
					709,
					710,
					711,
					712,
					713,
					714,
					715,
					716,
					717
				]
			},
			{
				"speed": 25,
				"name": "Saint Mark Drive",
				"nodes": [
					718,
					719,
					720,
					721,
					722,
					723,
					724,
					725,
					726,
					727,
					728,
					729,
					730
				]
			},
			{
				"speed": 25,
				"name": "Hackney Drive",
				"nodes": [
					731,
					732,
					733,
					734,
					735,
					736
				]
			},
			{
				"speed": 25,
				"name": "Martony Lane",
				"nodes": [
					737,
					71
				]
			},
			{
				"speed": 25,
				"name": "Hedgerow Drive",
				"nodes": [
					738,
					739,
					740,
					741,
					742,
					743,
					744
				]
			},
			{
				"speed": 25,
				"name": "Flordawn Drive",
				"nodes": [
					745,
					746,
					747,
					748,
					749,
					750,
					751,
					752,
					753,
					754,
					755,
					756,
					757,
					758,
					759,
					760,
					761,
					762,
					763,
					764,
					765,
					766,
					767,
					768,
					769,
					770,
					771
				]
			},
			{
				"speed": 25,
				"name": "Barrath Place Court",
				"nodes": [
					772,
					773,
					774,
					775,
					776,
					777,
					778
				]
			},
			{
				"speed": 25,
				"name": "Redwood Drive",
				"nodes": [
					779,
					780,
					781
				]
			},
			{
				"speed": 25,
				"name": "Tulip Tree Lane",
				"nodes": [
					782,
					783,
					784,
					785,
					786,
					787,
					788,
					789,
					790,
					791
				]
			},
			{
				"speed": 25,
				"name": "Rockymont Drive",
				"nodes": [
					675
				]
			},
			{
				"speed": 25,
				"name": "Woody Court",
				"nodes": [
					792,
					793
				]
			},
			{
				"speed": 25,
				"name": "English Oak Court",
				"nodes": [
					794,
					795,
					796,
					797,
					798,
					799
				]
			},
			{
				"speed": 25,
				"name": "Henson Lane",
				"nodes": [
					800,
					801
				]
			},
			{
				"speed": 25,
				"name": "Lila Drive",
				"nodes": [
					802,
					803,
					804,
					635,
					805
				]
			},
			{
				"speed": 25,
				"name": "Cherryvale Drive",
				"nodes": [
					806,
					807,
					808,
					809,
					810,
					811,
					812,
					813,
					814,
					815,
					816
				]
			},
			{
				"speed": 25,
				"name": "Brenthaven Lane",
				"nodes": [
					817,
					818,
					819,
					820,
					821,
					822,
					823,
					824,
					825,
					826,
					827,
					828,
					829,
					830,
					831,
					832,
					833,
					834,
					835,
					836,
					837,
					838,
					839,
					840,
					841,
					842,
					843,
					844,
					845,
					846,
					847,
					848,
					849,
					850
				]
			},
			{
				"speed": 25,
				"name": "Saint Bernard Drive",
				"nodes": [
					851,
					852,
					853
				]
			},
			{
				"speed": 25,
				"name": "Paddlewheel Drive",
				"nodes": [
					854,
					855,
					856,
					857
				]
			},
			{
				"speed": 25,
				"name": "Village Square Shopping Center",
				"nodes": [
					858,
					859
				]
			},
			{
				"speed": 25,
				"name": "Argo Drive",
				"nodes": [
					860,
					861,
					862,
					863
				]
			},
			{
				"speed": 25,
				"name": "Advance Drive",
				"nodes": [
					864,
					865,
					866,
					867,
					868,
					869,
					870,
					871,
					872,
					873,
					874,
					875
				]
			},
			{
				"speed": 25,
				"name": "Flordawn Drive",
				"nodes": [
					876,
					877,
					878,
					879,
					880,
					881,
					882,
					883,
					884
				]
			},
			{
				"speed": 25,
				"name": "Swan Drive",
				"nodes": [
					885,
					886,
					887,
					888,
					889,
					890,
					891,
					892,
					893,
					894,
					895,
					896,
					897,
					898,
					899,
					900,
					901
				]
			},
			{
				"speed": 25,
				"name": "Altavia Drive",
				"nodes": [
					902,
					903,
					904,
					905,
					906,
					907,
					908,
					909,
					910,
					911,
					912,
					913,
					914
				]
			},
			{
				"speed": 25,
				"name": "Chaste Street",
				"nodes": [
					915,
					916,
					917,
					918,
					919,
					920,
					921,
					922,
					923,
					924,
					925,
					926
				]
			},
			{
				"speed": 25,
				"name": "Farflung Drive",
				"nodes": [
					927,
					928,
					929,
					930,
					931,
					932,
					933,
					934,
					935,
					936,
					937,
					938
				]
			},
			{
				"speed": 25,
				"name": "Craigmont Drive",
				"nodes": [
					939,
					940
				]
			},
			{
				"speed": 30,
				"name": "South Lafayette Street",
				"nodes": [
					941,
					942,
					943,
					944,
					945,
					946,
					947,
					948,
					949,
					950,
					951,
					952,
					953,
					954,
					955,
					956,
					957,
					958,
					959,
					960,
					961,
					962,
					963,
					964
				]
			},
			{
				"speed": 25,
				"name": "Hambletonian Drive",
				"nodes": [
					965,
					966,
					967,
					968,
					969,
					970,
					971,
					972,
					973,
					974,
					975,
					976,
					977
				]
			},
			{
				"speed": 25,
				"name": "Fee Fee Hill",
				"nodes": [
					978,
					979,
					980,
					981
				]
			},
			{
				"speed": 25,
				"name": "Canisius Lane",
				"nodes": [
					982,
					983,
					984,
					985,
					986,
					987,
					537,
					988,
					989,
					990,
					991,
					992
				]
			},
			{
				"speed": 25,
				"name": "Fox Island Drive",
				"nodes": [
					993,
					994,
					995,
					996,
					997,
					998,
					999,
					1000,
					1001,
					1002
				]
			},
			{
				"speed": 25,
				"name": "Cortena Drive",
				"nodes": [
					1003,
					1004,
					1005,
					1006,
					1007,
					1008
				]
			},
			{
				"speed": 25,
				"name": "Cortena Drive",
				"nodes": [
					1009,
					1010,
					1011,
					1012
				]
			},
			{
				"speed": 25,
				"name": "Avant Drive",
				"nodes": [
					1013,
					1014,
					1015,
					1016,
					1017,
					1018,
					1019,
					1020,
					1021,
					1022,
					1023,
					1024,
					1025,
					1026,
					1027
				]
			},
			{
				"speed": 25,
				"name": "White Oak Trail Drive",
				"nodes": [
					1028,
					1029,
					1030,
					1031,
					1032
				]
			},
			{
				"speed": 25,
				"name": "Chianti Court",
				"nodes": [
					1033,
					1034,
					1035,
					1036,
					1037,
					1038,
					1039,
					1040,
					1041,
					1042,
					1043,
					1044,
					1045,
					1046,
					1047,
					1048,
					1033
				]
			},
			{
				"speed": 25,
				"name": "Bascom Drive",
				"nodes": [
					1049,
					1050,
					1051,
					1052,
					656,
					1053,
					1054,
					1055
				]
			},
			{
				"speed": 25,
				"name": "Elm Grove Lane",
				"nodes": [
					1056,
					1057,
					1058,
					1059,
					1060,
					1061,
					1062,
					1063
				]
			},
			{
				"speed": 25,
				"name": "Liberty Drive",
				"nodes": [
					1064,
					1065,
					1066,
					1067,
					1068,
					1069,
					1070,
					1071,
					1072
				]
			},
			{
				"speed": 25,
				"name": "Coachway Lane",
				"nodes": [
					1073,
					1074,
					1075,
					1076,
					1077,
					1078,
					1079,
					1080,
					1081,
					1082,
					1083,
					1084
				]
			},
			{
				"speed": 25,
				"name": "Hornet Drive",
				"nodes": [
					1085,
					1086,
					1087,
					1088,
					1089,
					1090,
					1091
				]
			},
			{
				"speed": 25,
				"name": "Wamsutta Trail",
				"nodes": [
					1092,
					1093,
					1094,
					1095,
					1096,
					1097,
					1098,
					1099,
					1100,
					1101,
					1102
				]
			},
			{
				"speed": 25,
				"name": "St Rose Court",
				"nodes": [
					1103,
					1104
				]
			},
			{
				"speed": 25,
				"name": "Lila Lane",
				"nodes": [
					1105,
					1106,
					1107
				]
			},
			{
				"speed": 25,
				"name": "Saint Antoine Street",
				"nodes": [
					1108,
					1109,
					1110,
					1111,
					1112,
					1113,
					1114,
					1115,
					1116,
					1117,
					1118
				]
			},
			{
				"speed": 25,
				"name": "Mammoth Drive",
				"nodes": [
					1119,
					1120,
					1121,
					1122,
					1123
				]
			},
			{
				"speed": 25,
				"name": "Craigmont Drive",
				"nodes": [
					940,
					1124,
					1125,
					1126,
					1127,
					1128
				]
			},
			{
				"speed": 25,
				"name": "Tremont Drive",
				"nodes": [
					1129,
					1130,
					1131,
					1132,
					1133,
					966
				]
			},
			{
				"speed": 25,
				"name": "Mantilla Lane",
				"nodes": [
					1134,
					1135,
					1136,
					1137,
					1138,
					1139,
					1140,
					1141,
					1142,
					1143,
					1144
				]
			},
			{
				"speed": 25,
				"name": "Hialeah Place",
				"nodes": [
					1145,
					1146,
					1147,
					1148,
					1149,
					1150,
					1151,
					1152,
					1153
				]
			},
			{
				"speed": 25,
				"name": "Brower Drive",
				"nodes": [
					1154,
					1155,
					1156
				]
			},
			{
				"speed": 25,
				"name": "Bittick Drive",
				"nodes": [
					1157,
					1158,
					1159,
					1160,
					1161,
					1162,
					1163
				]
			},
			{
				"speed": 25,
				"name": "St Ronald Lane",
				"nodes": [
					1164,
					1165
				]
			},
			{
				"speed": 25,
				"name": "Sandy Hill Drive",
				"nodes": [
					1166,
					1167,
					1168,
					1169,
					1170,
					1171
				]
			},
			{
				"speed": 25,
				"name": "Wharton Court",
				"nodes": [
					1172,
					1173,
					1174,
					1175,
					1176,
					1177,
					1178,
					1179,
					1180,
					1181,
					1182
				]
			},
			{
				"speed": 25,
				"name": "Greenway Manor Drive",
				"nodes": [
					1183,
					1184,
					1185,
					1186,
					1187,
					1188,
					1189,
					1190,
					1191,
					1192,
					1193,
					1194,
					1195,
					1196,
					1197,
					1198,
					1199,
					1200,
					1201,
					1202
				]
			},
			{
				"speed": 25,
				"name": "Hope Haven Drive",
				"nodes": [
					1203,
					1204,
					1205,
					1206,
					1207,
					1208
				]
			},
			{
				"speed": 25,
				"name": "Redemption Way",
				"nodes": [
					1209,
					1210,
					1211,
					1212,
					1213,
					1214
				]
			},
			{
				"speed": 25,
				"name": "Oxford Drive",
				"nodes": [
					1215,
					1216,
					1217,
					1218,
					1219,
					1220,
					1221
				]
			},
			{
				"speed": 25,
				"name": "Sugartrail Drive",
				"nodes": [
					1222,
					1223,
					1224,
					1225,
					1226,
					1227,
					1228,
					1229,
					1230,
					1231,
					1232,
					1233
				]
			},
			{
				"speed": 25,
				"name": "Marietta Drive",
				"nodes": [
					1234,
					1235,
					1236,
					1237,
					1238,
					1239,
					1240,
					1241,
					1242
				]
			},
			{
				"speed": 25,
				"name": "Ensenada Drive",
				"nodes": [
					1243,
					1244,
					1245,
					1246,
					1247
				]
			},
			{
				"speed": 25,
				"name": "Landseer Drive",
				"nodes": [
					1248,
					1249,
					611,
					1250,
					1251,
					1252,
					1253,
					1254,
					1255,
					1256,
					1257,
					1123,
					1258,
					1259
				]
			},
			{
				"speed": 25,
				"name": "Netherton Drive",
				"nodes": [
					1260,
					1261,
					618,
					1262,
					1263,
					1264
				]
			},
			{
				"speed": 25,
				"name": "Monks Hollow Drive",
				"nodes": [
					1265,
					1266,
					1267,
					1268,
					1269,
					1270,
					1271,
					1272
				]
			},
			{
				"speed": 25,
				"name": "Netherton Drive",
				"nodes": [
					1273,
					1274,
					1275,
					1252,
					1276
				]
			},
			{
				"speed": 25,
				"name": "Netherton Drive",
				"nodes": [
					1277,
					1278,
					1279,
					1280,
					1281,
					1282,
					1283,
					1284,
					1285,
					1286,
					1287,
					1288,
					1289
				]
			},
			{
				"speed": 25,
				"name": "Martin Court",
				"nodes": [
					1290,
					1291
				]
			},
			{
				"speed": 25,
				"name": "Wilshire Drive",
				"nodes": [
					1292,
					1293,
					1294,
					1295
				]
			},
			{
				"speed": 25,
				"name": "Kimbrough Drive",
				"nodes": [
					1296,
					940
				]
			},
			{
				"speed": 25,
				"name": "Trifecta Drive",
				"nodes": [
					1297,
					1298,
					1299,
					1300,
					1301,
					1302,
					1303,
					1304
				]
			},
			{
				"speed": 25,
				"name": "Morris Drive",
				"nodes": [
					1305,
					1306,
					1307
				]
			},
			{
				"speed": 25,
				"name": "Landseer Drive",
				"nodes": [
					1308,
					1309,
					1310,
					1311,
					1312,
					1313,
					1314,
					1315,
					1316,
					1317,
					1318,
					1319,
					1320,
					1321,
					1322,
					1323
				]
			},
			{
				"speed": 25,
				"name": "Courtyard Place",
				"nodes": [
					1324,
					1325,
					1326,
					1327,
					1328,
					1329,
					1330,
					1331
				]
			},
			{
				"speed": 30,
				"name": "Pohlman Road",
				"nodes": [
					1332,
					1333,
					1334,
					1335,
					1336
				]
			},
			{
				"speed": 25,
				"name": "Spangler Drive",
				"nodes": [
					1337,
					1338,
					1339,
					1340,
					1341,
					1342,
					1343,
					1344
				]
			},
			{
				"speed": 25,
				"name": "Quiet Cove Court",
				"nodes": [
					1345,
					1346,
					1347,
					1348,
					1349,
					1350,
					1351,
					1352,
					1353,
					1354,
					1355,
					1356,
					1357,
					1358,
					1359,
					1360,
					1345
				]
			},
			{
				"speed": 25,
				"name": "Teson Garden Walk",
				"nodes": [
					1361,
					1362,
					1363,
					1364
				]
			},
			{
				"speed": 25,
				"name": "Greengrass Drive",
				"nodes": [
					1365,
					1366,
					1367,
					1368,
					1369,
					1370,
					1371,
					1372,
					1373,
					1374,
					1375,
					1376,
					1377
				]
			},
			{
				"speed": 25,
				"name": "Derby Place",
				"nodes": [
					1378,
					1379,
					1380,
					1381,
					1382
				]
			},
			{
				"speed": 40,
				"name": "McDonnell Boulevard",
				"nodes": [
					1383,
					1384,
					1385,
					1386,
					1387,
					96,
					1388
				]
			},
			{
				"speed": 25,
				"name": "Garham Drive",
				"nodes": [
					1389,
					1390,
					1391,
					1392,
					1393,
					1394
				]
			},
			{
				"speed": 25,
				"name": "Teson Garden Walk",
				"nodes": [
					1395,
					1396,
					1397,
					1398,
					1399,
					1364
				]
			},
			{
				"speed": 25,
				"name": "Conifer Lane",
				"nodes": [
					1400,
					1401,
					1402
				]
			},
			{
				"speed": 25,
				"name": "Jodphur Drive",
				"nodes": [
					1403,
					1404,
					1405,
					1406,
					1407,
					1408,
					1409,
					1410,
					1411
				]
			},
			{
				"speed": 25,
				"name": "Churchill Downs Drive",
				"nodes": [
					1412,
					1413,
					1414,
					1415
				]
			},
			{
				"speed": 25,
				"name": "Rosecrest Drive",
				"nodes": [
					1416,
					1417,
					1418,
					1419,
					1420,
					1421
				]
			},
			{
				"speed": 25,
				"name": "Piety Court",
				"nodes": [
					1422,
					1423,
					1424,
					1425,
					1426,
					1427,
					1428,
					1429
				]
			},
			{
				"speed": 25,
				"name": "Lula Drive",
				"nodes": [
					1305,
					1430,
					1431,
					1432,
					1433,
					1434
				]
			},
			{
				"speed": 25,
				"name": "Radford Drive",
				"nodes": [
					1435,
					1436,
					1437,
					1438,
					1439,
					1440,
					1441,
					1442
				]
			},
			{
				"speed": 25,
				"name": "Florland Drive",
				"nodes": [
					1443,
					1444,
					1445,
					1446,
					1447,
					1448,
					1449,
					1450,
					1451
				]
			},
			{
				"speed": 25,
				"name": "Fireside Drive",
				"nodes": [
					1452,
					1453,
					1454,
					1455,
					1456,
					1457
				]
			},
			{
				"speed": 25,
				"name": "Jackson Lane",
				"nodes": [
					1458,
					1459
				]
			},
			{
				"speed": 25,
				"name": "Hurstland Court",
				"nodes": [
					1460,
					1461
				]
			},
			{
				"speed": 25,
				"name": "Eagle Estates Drive",
				"nodes": [
					1462,
					1463,
					1464,
					1465,
					1466,
					1467,
					1468,
					1469,
					1470,
					1471,
					1472,
					1473
				]
			},
			{
				"speed": 25,
				"name": "Jackson Lane",
				"nodes": [
					1474,
					1475,
					1476,
					1477,
					1478,
					1064,
					1479,
					1480,
					1481,
					1482,
					1483,
					1484,
					1485
				]
			},
			{
				"speed": 25,
				"name": "Charvel Drive",
				"nodes": [
					1486,
					1487,
					1488,
					1489,
					1490,
					1491,
					1492,
					1493
				]
			},
			{
				"speed": 25,
				"name": "Saint Stephen Drive",
				"nodes": [
					1494,
					852
				]
			},
			{
				"speed": 25,
				"name": "Mc Bride Place",
				"nodes": [
					1495,
					1496
				]
			},
			{
				"speed": 25,
				"name": "Tesson Park Drive",
				"nodes": [
					1497,
					1498,
					1499,
					1500
				]
			},
			{
				"speed": 25,
				"name": "Greenberry Drive",
				"nodes": [
					1501,
					1502,
					1366
				]
			},
			{
				"speed": 25,
				"name": "Chandler Court",
				"nodes": [
					1503,
					1504,
					1505
				]
			},
			{
				"speed": 25,
				"name": "Saratoga Drive",
				"nodes": [
					1506,
					1507
				]
			},
			{
				"speed": 25,
				"name": "Highwillow Drive",
				"nodes": [
					1508,
					1509,
					1510,
					1511,
					1512
				]
			},
			{
				"speed": 25,
				"name": "Red Clover Drive",
				"nodes": [
					1513,
					1514,
					1515,
					1516,
					1517,
					1518,
					1519,
					1520,
					1521,
					1522,
					1523,
					1524,
					1525
				]
			},
			{
				"speed": 25,
				"name": "Chickory Creek Lane",
				"nodes": [
					1526,
					1527,
					1528,
					1529,
					1530,
					1531,
					1532,
					1533,
					1534,
					1535,
					1536,
					1537,
					1538,
					1539,
					1540
				]
			},
			{
				"speed": 25,
				"name": "Naples Drive",
				"nodes": [
					1541,
					1542,
					1543
				]
			},
			{
				"speed": 25,
				"name": "Nathan Drive",
				"nodes": [
					1544,
					1250
				]
			},
			{
				"speed": 25,
				"name": "Brower Lane",
				"nodes": [
					1156,
					1545,
					1546,
					1547,
					1548,
					1549
				]
			},
			{
				"speed": 25,
				"name": "Rosary Tree Court",
				"nodes": [
					1550,
					1551,
					1552,
					1553,
					1554,
					1555,
					1556,
					1557,
					1558,
					1559,
					1560,
					1561,
					1562,
					1563,
					1564,
					1565,
					1550
				]
			},
			{
				"speed": 25,
				"name": "Brower Lane",
				"nodes": [
					1566,
					1567,
					1154,
					1568,
					1569,
					1570,
					65
				]
			},
			{
				"speed": 25,
				"name": "Marshall Court",
				"nodes": [
					1571,
					1572,
					607,
					1573
				]
			},
			{
				"speed": 25,
				"name": "Jacklin Avenue",
				"nodes": [
					1574,
					1575
				]
			},
			{
				"speed": 25,
				"name": "Caione Court",
				"nodes": [
					1576,
					1577
				]
			},
			{
				"speed": 25,
				"name": "Saint Margaret Court",
				"nodes": [
					1578,
					1579,
					1580
				]
			},
			{
				"speed": 25,
				"name": "Tannoia Drive",
				"nodes": [
					1581,
					1582,
					1583,
					1584,
					1585,
					1586,
					1587,
					1588
				]
			},
			{
				"speed": 25,
				"name": "Beam Place",
				"nodes": [
					1589,
					1590,
					1591,
					1592,
					1593,
					1594,
					1595,
					1596,
					1597,
					1598,
					1599,
					1600,
					1601,
					1602,
					1603,
					1604,
					1589
				]
			},
			{
				"speed": 25,
				"name": "Rue Saint Catherine",
				"nodes": [
					1605,
					1606,
					1607,
					1608,
					1609,
					1610,
					1611,
					1612,
					1613,
					1614,
					1615
				]
			},
			{
				"speed": 25,
				"name": "Noble Drive",
				"nodes": [
					1616,
					1617
				]
			},
			{
				"speed": 25,
				"name": "Regina Court",
				"nodes": [
					1618,
					1619
				]
			},
			{
				"speed": 25,
				"name": "Sieloff Drive",
				"nodes": [
					1620,
					1621,
					1622,
					1623,
					1624,
					1625,
					1626,
					1627,
					1628,
					1629,
					1630,
					1631,
					1632,
					1633,
					1634,
					1635,
					1636,
					1637,
					1638,
					1639
				]
			},
			{
				"speed": 25,
				"name": "Inlet Isle Drive",
				"nodes": [
					1640,
					1641,
					1642,
					1643,
					1644,
					1645,
					1646,
					1647,
					1648
				]
			},
			{
				"speed": 25,
				"name": "North Park Lane",
				"nodes": [
					1649,
					1650,
					1651,
					1652,
					1653,
					1654,
					1655,
					1656,
					1657,
					1658,
					1659
				]
			},
			{
				"speed": 25,
				"name": "Canal Drive",
				"nodes": [
					1660,
					1641
				]
			},
			{
				"speed": 25,
				"name": "St Laurence Drive",
				"nodes": [
					1661,
					1662,
					1663,
					1664,
					1665,
					1666,
					1667,
					1668,
					1669
				]
			},
			{
				"speed": 25,
				"name": "Sorrell Drive",
				"nodes": [
					1670,
					1671,
					1672,
					1673,
					731,
					1674,
					1675,
					1676,
					1677
				]
			},
			{
				"speed": 25,
				"name": "Golden Gate Drive",
				"nodes": [
					1678,
					1679,
					1680,
					1681,
					1682,
					1683,
					1684,
					1685,
					1686,
					1687
				]
			},
			{
				"speed": 25,
				"name": "Avenue de Paris Drive",
				"nodes": [
					1688,
					1689,
					1690,
					1691,
					1692,
					1693,
					1694,
					1695,
					1696,
					1697,
					1698,
					1699,
					1700,
					1701,
					1702,
					1703,
					1688
				]
			},
			{
				"speed": 25,
				"name": "Inlet Isle Drive",
				"nodes": [
					1704,
					1705,
					1706,
					1707,
					1708,
					1709,
					1710,
					1711,
					1640
				]
			},
			{
				"speed": 25,
				"name": "Turfway Court",
				"nodes": [
					1712,
					1713
				]
			},
			{
				"speed": 25,
				"name": "Moon Flower Court",
				"nodes": [
					1714,
					1715,
					1716,
					1717,
					1718,
					1719,
					1720
				]
			},
			{
				"speed": 25,
				"name": "Mohican Lane",
				"nodes": [
					1721,
					1722,
					1723,
					1724,
					1725
				]
			},
			{
				"speed": 25,
				"name": "Futurity Court",
				"nodes": [
					1726,
					1727
				]
			},
			{
				"speed": 25,
				"name": "La Crosse Drive",
				"nodes": [
					1728,
					1729,
					1730,
					1731,
					1732,
					1733,
					1734,
					1735,
					1736,
					1737
				]
			},
			{
				"speed": 25,
				"name": "Bradford Place Drive",
				"nodes": [
					1738,
					1739,
					1740
				]
			},
			{
				"speed": 25,
				"name": "Adriot Court",
				"nodes": [
					1741,
					1742,
					1743,
					1744,
					1745,
					1746,
					1747,
					1748,
					1749,
					1750,
					1751,
					1752
				]
			},
			{
				"speed": 25,
				"name": "Robinwing Lane",
				"nodes": [
					1753,
					1754
				]
			},
			{
				"speed": 25,
				"name": "Darwin Court",
				"nodes": [
					1755,
					1756,
					1757
				]
			},
			{
				"speed": 25,
				"name": "Plum Tree Lane",
				"nodes": [
					1758,
					1759,
					1760,
					1761,
					1762,
					1763,
					1764,
					1765,
					1766,
					1767,
					1768,
					1769,
					1770,
					1771,
					1772,
					1773
				]
			},
			{
				"speed": 25,
				"name": "Humeston Lane",
				"nodes": [
					1774,
					1775
				]
			},
			{
				"speed": 25,
				"name": "Saint Eugene Lane",
				"nodes": [
					1776,
					1777,
					1778,
					1779,
					1780,
					1781
				]
			},
			{
				"speed": 25,
				"name": "Clearview Drive",
				"nodes": [
					1782,
					1783,
					1784
				]
			},
			{
				"speed": 25,
				"name": "Patty Court",
				"nodes": [
					1785,
					1786
				]
			},
			{
				"speed": 25,
				"name": "Oliveto Lane",
				"nodes": [
					1542,
					1787,
					1788,
					1789,
					1790,
					1585
				]
			},
			{
				"speed": 25,
				"name": "Valerie Court",
				"nodes": [
					1791,
					1792
				]
			},
			{
				"speed": 25,
				"name": "South Duchesne Drive",
				"nodes": [
					1793,
					1794,
					1795,
					1796,
					1797,
					1798,
					1799,
					1800
				]
			},
			{
				"speed": 25,
				"name": "Pelican Cove Drive",
				"nodes": [
					1801,
					1802,
					1803,
					1804,
					1805,
					1806,
					1807,
					1808,
					1809,
					1810,
					1811,
					1812
				]
			},
			{
				"speed": 25,
				"name": "Berkridge Drive",
				"nodes": [
					1813,
					1814,
					1815,
					1816,
					1817,
					1818,
					1819,
					792,
					1785,
					1820,
					1821,
					1822,
					1823,
					1824,
					1825,
					1826,
					1827,
					1828,
					1829
				]
			},
			{
				"speed": 25,
				"name": "Barkwood Drive",
				"nodes": [
					1830,
					1831,
					1832,
					1833,
					1834
				]
			},
			{
				"speed": 25,
				"name": "Rue St Pierre",
				"nodes": [
					1835,
					1836
				]
			},
			{
				"speed": 25,
				"name": "Somerset Shire Drive",
				"nodes": [
					1837,
					1838,
					1839,
					1840,
					1841,
					1842,
					1843,
					1844,
					1845,
					1846,
					1847,
					1848,
					1849
				]
			},
			{
				"speed": 25,
				"name": "Gladiola Lane",
				"nodes": [
					1850,
					1851
				]
			},
			{
				"speed": 25,
				"name": "Dover Drive",
				"nodes": [
					1852,
					1853,
					1854,
					1855,
					1856,
					1857,
					1858,
					1859,
					1860,
					1861,
					1862,
					1863,
					1864,
					1865,
					1866,
					1867,
					1868,
					1869,
					1870
				]
			},
			{
				"speed": 25,
				"name": "Dolfield Drive",
				"nodes": [
					1871,
					1872
				]
			},
			{
				"speed": 25,
				"name": "Wood Poppy Drive",
				"nodes": [
					1873,
					1874,
					1875,
					1876
				]
			},
			{
				"speed": 25,
				"name": "Mc Nulty Drive",
				"nodes": [
					1877,
					1878,
					1879,
					1880,
					1881,
					1882,
					1883,
					1884,
					1885,
					1886,
					1887
				]
			},
			{
				"speed": 25,
				"name": "Pettycoat Lane",
				"nodes": [
					1888,
					1889
				]
			},
			{
				"speed": 25,
				"name": "Paddock Drive",
				"nodes": [
					1890,
					1891,
					1892,
					1893,
					1894,
					1895,
					1896,
					1897,
					1898,
					1899,
					1900,
					1901,
					1415,
					1902,
					1903,
					1904,
					1905,
					1906,
					1907,
					1378,
					1908,
					1909,
					1910,
					1911,
					1150,
					1912,
					1913,
					1914,
					1915,
					1916,
					1917,
					1918,
					1919
				]
			},
			{
				"speed": 25,
				"name": "Malinda Court",
				"nodes": [
					1920,
					1921,
					1922
				]
			},
			{
				"speed": 25,
				"name": "Thistledown Drive",
				"nodes": [
					1502,
					1923,
					1924,
					1925
				]
			},
			{
				"speed": 25,
				"name": "Taylor Trails Drive",
				"nodes": [
					1926,
					1927
				]
			},
			{
				"speed": 25,
				"name": "Acredale Drive",
				"nodes": [
					1928,
					1929,
					1930,
					1931
				]
			},
			{
				"speed": 25,
				"name": "Ford Lane",
				"nodes": [
					1932,
					1933,
					1934,
					1935
				]
			},
			{
				"speed": 25,
				"name": "Reighley Place",
				"nodes": [
					1936,
					1937,
					1938,
					1939
				]
			},
			{
				"speed": 25,
				"name": "Waterfall Drive",
				"nodes": [
					1940,
					1941,
					1942,
					1943,
					993,
					1944,
					1945,
					1946,
					1947,
					1948,
					1949,
					1950,
					1002
				]
			},
			{
				"speed": 25,
				"name": "Homestead Estate Drive",
				"nodes": [
					1951,
					1952,
					1953,
					1954,
					1955,
					1956,
					1957,
					1958,
					1959,
					1960,
					1961,
					1962,
					1963,
					1964,
					1965,
					1966,
					1967,
					1968,
					1969,
					1970,
					1971,
					1972,
					1973,
					1974,
					1975,
					1976,
					1977,
					1978,
					1979,
					1980,
					1981,
					1982
				]
			},
			{
				"speed": 25,
				"name": "Viembra Drive",
				"nodes": [
					1983,
					1984
				]
			},
			{
				"speed": 25,
				"name": "Heather Lane",
				"nodes": [
					1985,
					1986,
					1987
				]
			},
			{
				"speed": 25,
				"name": "Saint Gabrielle Drive",
				"nodes": [
					1988,
					1989,
					1990,
					1991,
					1992,
					1993,
					1494,
					1994
				]
			},
			{
				"speed": 25,
				"name": "Granger Trail",
				"nodes": [
					1995,
					1996,
					1997,
					1998,
					1999,
					2000,
					2001,
					2002,
					2003
				]
			},
			{
				"speed": 25,
				"name": "Aberdeen Drive",
				"nodes": [
					2004,
					2005,
					2006,
					2007,
					2008,
					2009,
					2010,
					2011,
					2012,
					2013,
					2014,
					2015,
					2016,
					2017,
					2018,
					2019,
					2020,
					2021,
					2022,
					2023,
					2024,
					2025,
					2026,
					2027
				]
			},
			{
				"speed": 25,
				"name": "Paw Paw Court",
				"nodes": [
					2028,
					2029
				]
			},
			{
				"speed": 25,
				"name": "Taney Drive",
				"nodes": [
					2030,
					2031,
					2032,
					2033,
					2034,
					2035,
					2036
				]
			},
			{
				"speed": 25,
				"name": "Lares Drive",
				"nodes": [
					2037,
					2038,
					2039
				]
			},
			{
				"speed": 25,
				"name": "Robinwood Drive",
				"nodes": [
					2032,
					2040,
					2041,
					2042,
					2043,
					2044
				]
			},
			{
				"speed": 25,
				"name": "Papal Drive",
				"nodes": [
					421,
					2045,
					2046,
					2047,
					2048,
					2049,
					2050,
					2051
				]
			},
			{
				"speed": 25,
				"name": "Braman Lane",
				"nodes": [
					2052,
					2053
				]
			},
			{
				"speed": 25,
				"name": "Gainesway Court",
				"nodes": [
					2054,
					2055
				]
			},
			{
				"speed": 25,
				"name": "Sharon Court",
				"nodes": [
					2056,
					2057,
					2058,
					2059,
					2060,
					2061,
					2062,
					2063,
					2064
				]
			},
			{
				"speed": 25,
				"name": "Thousand Oaks Drive",
				"nodes": [
					2065,
					2066,
					2067,
					2068,
					2069,
					2070,
					2071,
					2065
				]
			},
			{
				"speed": 25,
				"name": "Gerard Park Lane",
				"nodes": [
					1584,
					2072,
					2073,
					2074
				]
			},
			{
				"speed": 25,
				"name": "Ange Drive",
				"nodes": [
					2075,
					2076,
					2077,
					2078,
					1983,
					2079,
					2080,
					2081
				]
			},
			{
				"speed": 25,
				"name": "Chadwick Drive",
				"nodes": [
					2082,
					2083,
					2084,
					2085,
					2086,
					2087,
					2088,
					2089
				]
			},
			{
				"speed": 25,
				"name": "Thousand Oaks Drive",
				"nodes": [
					1223,
					2066
				]
			},
			{
				"speed": 25,
				"name": "Gerard Park Lane",
				"nodes": [
					2090,
					1541,
					1576,
					2091,
					2092,
					2093,
					1581
				]
			},
			{
				"speed": 25,
				"name": "Baskin Drive",
				"nodes": [
					2094,
					2095,
					2096,
					2097,
					2098,
					2099
				]
			},
			{
				"speed": 25,
				"name": "Bobbinray Avenue",
				"nodes": [
					1440,
					2100
				]
			},
			{
				"speed": 25,
				"name": "Spring Beauty Drive",
				"nodes": [
					2101,
					2102
				]
			},
			{
				"speed": 25,
				"name": "Swallow Lane",
				"nodes": [
					2103,
					2104,
					2105
				]
			},
			{
				"speed": 25,
				"name": "Chatillion Estates Drive",
				"nodes": [
					2106,
					2107,
					2108,
					2109,
					2110,
					2111,
					2112,
					2113,
					2114,
					2115,
					2116,
					2117,
					2118,
					2119,
					2120
				]
			},
			{
				"speed": 25,
				"name": "Burnside Court",
				"nodes": [
					2121,
					2122,
					2123,
					2124,
					2125,
					2126,
					2127,
					2128
				]
			},
			{
				"speed": 25,
				"name": "Sherman Lane",
				"nodes": [
					2129,
					2130,
					2131
				]
			},
			{
				"speed": 25,
				"name": "Seminole Lane",
				"nodes": [
					2132,
					2133
				]
			},
			{
				"speed": 25,
				"name": "Saddlegate Court",
				"nodes": [
					2134,
					2135,
					2136,
					2137
				]
			},
			{
				"speed": 25,
				"name": "Saint Marie Street",
				"nodes": [
					2138,
					1836,
					2139,
					2140,
					2141,
					2142,
					2143,
					2144,
					2145,
					2146,
					2147,
					2148,
					2149
				]
			},
			{
				"speed": 25,
				"name": "Knoll Creek Court",
				"nodes": [
					2150,
					2151,
					2152,
					2153,
					2154
				]
			},
			{
				"speed": 25,
				"name": "Manthorne Court",
				"nodes": [
					2155,
					2156,
					2157,
					2158,
					2159,
					2160,
					2161,
					2162,
					2163,
					2164,
					2165,
					2166,
					2167,
					2168,
					2169,
					2170,
					2155
				]
			},
			{
				"speed": 25,
				"name": "Crestwood Bend Court",
				"nodes": [
					2171,
					2172
				]
			},
			{
				"speed": 25,
				"name": "Cameo Court",
				"nodes": [
					2173,
					2174,
					2089
				]
			},
			{
				"speed": 25,
				"name": "Clemens Drive",
				"nodes": [
					2175,
					2176,
					2177
				]
			},
			{
				"speed": 25,
				"name": "Bobbinray Avenue",
				"nodes": [
					2100,
					2178,
					2179,
					2180,
					2181,
					2182,
					2183
				]
			},
			{
				"speed": 25,
				"name": "Swallow Lane",
				"nodes": [
					2184,
					2185,
					2186,
					2187,
					2188
				]
			},
			{
				"speed": 25,
				"name": "Sussex Drive",
				"nodes": [
					2189,
					2190,
					2191,
					2192,
					2193,
					2194,
					2195,
					2196,
					2197,
					2198,
					2199,
					2200,
					2201,
					2202,
					2203,
					2204,
					2205,
					2206,
					2207
				]
			},
			{
				"speed": 25,
				"name": "Olson Drive",
				"nodes": [
					2208,
					1257
				]
			},
			{
				"speed": 25,
				"name": "Fairway Court",
				"nodes": [
					2209,
					2210,
					2211,
					2212,
					2213
				]
			},
			{
				"speed": 25,
				"name": "Bartlett Pear Drive",
				"nodes": [
					2214,
					2215,
					2216,
					2217,
					2218,
					2219
				]
			},
			{
				"speed": 25,
				"name": "Rose Wreath Lane",
				"nodes": [
					2220,
					2221,
					2222,
					2223,
					2224,
					2225,
					2226,
					2227,
					2228,
					2229,
					2230,
					2231,
					2232,
					2233,
					2234,
					2235,
					2236,
					2237,
					2238,
					2239
				]
			},
			{
				"speed": 25,
				"name": "Monceau Drive",
				"nodes": [
					2240,
					2241,
					2242,
					2243
				]
			},
			{
				"speed": 25,
				"name": "Fee Fee Road",
				"nodes": [
					2244,
					2245
				]
			},
			{
				"speed": 25,
				"name": "Fee Fee Road",
				"nodes": [
					2245,
					2246
				]
			},
			{
				"speed": 25,
				"name": "Freeland Drive",
				"nodes": [
					2247,
					2248,
					2249,
					2250,
					2251,
					2252,
					2253,
					2254
				]
			},
			{
				"speed": 25,
				"name": "Lynn Meadows Lane",
				"nodes": [
					2255,
					2256,
					2257,
					2258,
					2259
				]
			},
			{
				"speed": 25,
				"name": "Bellarmine Lane",
				"nodes": [
					2260,
					2261,
					2262,
					2263,
					2264,
					983,
					2265,
					2266,
					2267
				]
			},
			{
				"speed": 25,
				"name": "Ozment Drive",
				"nodes": [
					2268,
					2269,
					2270
				]
			},
			{
				"speed": 25,
				"name": "Dubourg Lane",
				"nodes": [
					2271,
					151,
					2272,
					2273,
					2274,
					2275,
					2276,
					2277,
					2278,
					2279,
					2280,
					2281,
					2282
				]
			},
			{
				"speed": 25,
				"name": "Cades Cove",
				"nodes": [
					2283,
					2284,
					2285,
					2286,
					2287,
					2288,
					2289,
					2290,
					1549,
					2291,
					2292,
					2293,
					2294,
					2295
				]
			},
			{
				"speed": 25,
				"name": "Chadwick Drive",
				"nodes": [
					2296,
					2297,
					2298,
					2299,
					2300,
					2301,
					2302,
					2303,
					2304,
					2082
				]
			},
			{
				"speed": 30,
				"name": "Fee Fee Road",
				"nodes": [
					2305,
					2306,
					2307,
					2308,
					2309,
					2310,
					2311,
					2312,
					2313,
					1383
				]
			},
			{
				"speed": 25,
				"name": "Cougar Drive",
				"nodes": [
					2314,
					2315,
					2316,
					2317,
					2318,
					2319,
					2320,
					2321,
					2322,
					2323,
					2324,
					2325,
					2326,
					2327,
					2328,
					2329,
					2330
				]
			},
			{
				"speed": 25,
				"name": "Narraganset Drive",
				"nodes": [
					1153,
					2331,
					2332,
					2333,
					2334,
					2335,
					2336,
					2337
				]
			},
			{
				"speed": 25,
				"name": "Olivewood Drive",
				"nodes": [
					2338,
					2339,
					2340,
					2341,
					2342,
					2343,
					2344
				]
			},
			{
				"speed": 25,
				"name": "Jana Drive",
				"nodes": [
					2345,
					2346,
					2347,
					2348,
					2349,
					2350,
					2351,
					1305,
					2352,
					1434,
					2353
				]
			},
			{
				"speed": 25,
				"name": "Ponawanda Trail",
				"nodes": [
					2354,
					2355,
					2356,
					2357,
					2358,
					2359,
					1092
				]
			},
			{
				"speed": 25,
				"name": "Blackwood Drive",
				"nodes": [
					2360,
					2361,
					2362,
					2363,
					2364,
					2365,
					2366
				]
			},
			{
				"speed": 25,
				"name": "Shirley Drive",
				"nodes": [
					2367,
					2368,
					2369,
					2370,
					2371,
					2372
				]
			},
			{
				"speed": 25,
				"name": "Brook Drive",
				"nodes": [
					2373,
					2374
				]
			},
			{
				"speed": 25,
				"name": "Latty Avenue",
				"nodes": [
					2375,
					2376,
					2377,
					2378,
					2379,
					663,
					2380,
					2381,
					1813,
					2382,
					2383,
					2384,
					2385,
					2386
				]
			},
			{
				"speed": 25,
				"name": "Ville Teresa Court",
				"nodes": [
					2387,
					2388,
					2389,
					2390,
					2391,
					2392,
					2393,
					2394,
					2395,
					2396,
					2397
				]
			},
			{
				"speed": 25,
				"name": "Landi Court",
				"nodes": [
					2091,
					2398,
					2399,
					2400
				]
			},
			{
				"speed": 25,
				"name": "Nanette Drive",
				"nodes": [
					2401,
					2402,
					2403,
					2404,
					2405,
					2406
				]
			},
			{
				"speed": 25,
				"name": "Teson Road",
				"nodes": [
					2407,
					2408,
					2409,
					2410,
					2411,
					2412,
					2413,
					2414,
					2415,
					2416
				]
			},
			{
				"speed": 25,
				"name": "Calavera Drive",
				"nodes": [
					1369,
					2417,
					2418,
					2419,
					2420,
					2421,
					1374
				]
			},
			{
				"speed": 25,
				"name": "Blue Jay Way Court",
				"nodes": [
					2422,
					2423,
					2424
				]
			},
			{
				"speed": 25,
				"name": "Argonne Forest Drive",
				"nodes": [
					2425,
					2426,
					2427
				]
			},
			{
				"speed": 25,
				"name": "Hazelvalley Drive",
				"nodes": [
					2428,
					989,
					2429,
					805,
					2430
				]
			},
			{
				"speed": 25,
				"name": "Metarus Drive",
				"nodes": [
					2431,
					2432,
					2433
				]
			},
			{
				"speed": 25,
				"name": "Knollwood Lane",
				"nodes": [
					2434,
					2435,
					2436,
					2437,
					2438,
					346
				]
			},
			{
				"speed": 25,
				"name": "Holiday Avenue",
				"nodes": [
					2439,
					2440,
					2441,
					2442,
					2443
				]
			},
			{
				"speed": 30,
				"name": "Teson Road",
				"nodes": [
					2444,
					2445,
					1361,
					2446,
					2447,
					2448,
					2449,
					2450,
					2451,
					2452,
					2453,
					2454,
					2455,
					2247
				]
			},
			{
				"speed": 25,
				"name": "Mercy Drive",
				"nodes": [
					2456,
					1203,
					2457
				]
			},
			{
				"speed": 25,
				"name": "90th Avenue",
				"nodes": [
					2458,
					2459,
					2460,
					2461,
					2462,
					2463,
					2464,
					2465,
					2466,
					2467,
					2468,
					2469,
					2470,
					2471,
					2472,
					2473,
					2458
				]
			},
			{
				"speed": 25,
				"name": "Marsielle Drive",
				"nodes": [
					2474,
					2475
				]
			},
			{
				"speed": 25,
				"name": "Bugle Run Drive",
				"nodes": [
					2476,
					2477,
					2478,
					2479,
					2480,
					2481,
					2482,
					2483,
					2484,
					2485,
					2486,
					2487,
					2488,
					2489,
					2490,
					2491,
					2492,
					2493,
					2494
				]
			},
			{
				"speed": 25,
				"name": "Buddie Drive",
				"nodes": [
					2495,
					2496,
					2497,
					2498
				]
			},
			{
				"speed": 25,
				"name": "Buddie Drive",
				"nodes": [
					2499,
					2500
				]
			},
			{
				"speed": 25,
				"name": "Sunswept Park Court",
				"nodes": [
					2501,
					2502,
					2503
				]
			},
			{
				"speed": 25,
				"name": "High Sun Drive",
				"nodes": [
					2504,
					2505,
					2506,
					655,
					2507,
					2508,
					2509,
					2510,
					2511,
					2512,
					2513
				]
			},
			{
				"speed": 30,
				"name": "North Waterford Drive",
				"nodes": [
					2514,
					2515,
					2516,
					2517,
					2518,
					2519,
					2520,
					702,
					2521,
					1403,
					2522,
					2523,
					678,
					2524,
					2525,
					2526,
					2527,
					2528,
					2529,
					1678,
					2530,
					2531,
					2532,
					2533,
					2534,
					2535,
					2536,
					2537,
					2538,
					2539,
					2540,
					2541,
					2542,
					2543
				]
			},
			{
				"speed": 25,
				"name": "Denise Drive",
				"nodes": [
					2544,
					2545,
					2546,
					2547,
					2548,
					2406
				]
			},
			{
				"speed": 25,
				"name": "Ryan Avenue",
				"nodes": [
					2549,
					2550,
					2551,
					2552
				]
			},
			{
				"speed": 25,
				"name": "Paul Pl Court",
				"nodes": [
					2553,
					2554
				]
			},
			{
				"speed": 25,
				"name": "Cypress Drive",
				"nodes": [
					2555,
					2556
				]
			},
			{
				"speed": 25,
				"name": "Fordshire Lane",
				"nodes": [
					2557,
					2558
				]
			},
			{
				"speed": 25,
				"name": "Orchard Drive",
				"nodes": [
					2559,
					2560,
					2561,
					2562
				]
			},
			{
				"speed": 25,
				"name": "Orchard Drive",
				"nodes": [
					2563,
					2564,
					2565,
					2559
				]
			},
			{
				"speed": 25,
				"name": "Fountain Court",
				"nodes": [
					2559,
					2566,
					2567,
					2568
				]
			},
			{
				"speed": 25,
				"name": "Jamestowne Ridge Drive",
				"nodes": [
					2569,
					2570,
					2571,
					2572,
					2573,
					2574,
					2575,
					2576,
					2577,
					2578,
					2579,
					2580,
					2581,
					2582,
					2583,
					2584,
					2585,
					2586,
					2587,
					2588,
					2589,
					2590,
					2591,
					2592
				]
			},
			{
				"speed": 25,
				"name": "Advocate Court",
				"nodes": [
					2593,
					2594,
					2595,
					2596,
					2597,
					2598,
					2599
				]
			},
			{
				"speed": 25,
				"name": "Spring Drive",
				"nodes": [
					2600,
					2601,
					2602,
					2603,
					2604,
					2605,
					2606,
					2607,
					2608,
					2609,
					2610,
					2611,
					2612,
					2613,
					2614
				]
			},
			{
				"speed": 25,
				"name": "Bluff Parks Drive",
				"nodes": [
					2615,
					2616,
					2617,
					2618,
					2619,
					2620,
					2621,
					2622,
					2623,
					2624,
					2625,
					2626,
					2627,
					2628
				]
			},
			{
				"speed": 25,
				"name": "Banstead Drive",
				"nodes": [
					2629,
					2630,
					1671
				]
			},
			{
				"speed": 25,
				"name": "97th Avenue",
				"nodes": [
					2631,
					2632,
					2633,
					2634,
					2635,
					2636,
					2637,
					2638,
					2639,
					2640,
					2641,
					2642,
					2643,
					2644,
					2645,
					2646
				]
			},
			{
				"speed": 25,
				"name": "Campus Parkway",
				"nodes": [
					2647,
					1085,
					2648,
					2649,
					2650,
					2651,
					2652,
					2653,
					2654,
					2655,
					2656,
					2657,
					1385
				]
			},
			{
				"speed": 25,
				"name": "Sunset Drive",
				"nodes": [
					2658,
					2659,
					2660,
					2661,
					2662,
					2663,
					2664,
					2665,
					2666,
					2667,
					2668,
					2669,
					2670,
					2671,
					2672
				]
			},
			{
				"speed": 25,
				"name": "Florissant Park Drive",
				"nodes": [
					2673,
					2674,
					2675,
					2676,
					2677,
					2678,
					2679,
					2680
				]
			},
			{
				"speed": 25,
				"name": "Chula Drive",
				"nodes": [
					2681,
					2682,
					2683,
					2684,
					2685,
					2686,
					2687,
					2688,
					2689,
					2690,
					2691
				]
			},
			{
				"speed": 25,
				"name": "Boulder Creek Court",
				"nodes": [
					555,
					2692,
					2693,
					2694,
					2695,
					2696,
					2697
				]
			},
			{
				"speed": 25,
				"name": "Florissant Park Drive",
				"nodes": [
					2698,
					2699,
					2700,
					2701,
					2702,
					2703,
					2704,
					2705
				]
			},
			{
				"speed": 25,
				"name": "Dawnview Court",
				"nodes": [
					2706,
					2707,
					2708,
					2709,
					2710,
					2711,
					2712,
					2713,
					2714,
					2706
				]
			},
			{
				"speed": 25,
				"name": "Young Drive",
				"nodes": [
					2715,
					2716,
					2717,
					2718,
					2719,
					2720
				]
			},
			{
				"speed": 25,
				"name": "Karsten Drive",
				"nodes": [
					2721,
					2722,
					2723,
					2724,
					2725,
					2726,
					2727,
					2728,
					2729,
					2730,
					2731,
					2732,
					2733,
					2734,
					2735,
					2736
				]
			},
			{
				"speed": 25,
				"name": "Richwood Lane",
				"nodes": [
					2737,
					2738,
					2739,
					2378
				]
			},
			{
				"speed": 25,
				"name": "Gladys Avenue",
				"nodes": [
					2740,
					2741,
					2742
				]
			},
			{
				"speed": 25,
				"name": "Gladys Avenue",
				"nodes": [
					2743,
					2744,
					2745,
					2746,
					2737
				]
			},
			{
				"speed": 25,
				"name": "Navajo Lane",
				"nodes": [
					2747,
					2748,
					2749,
					2750,
					2751,
					2752,
					2753
				]
			},
			{
				"speed": 25,
				"name": "St Cheryl Lane",
				"nodes": [
					2754,
					2755
				]
			},
			{
				"speed": 25,
				"name": "Pebble Lane",
				"nodes": [
					2756,
					2043
				]
			},
			{
				"speed": 25,
				"name": "Barto Drive",
				"nodes": [
					2757,
					2758,
					2759,
					2760,
					2761
				]
			},
			{
				"speed": 25,
				"name": "Riviere Marne Court",
				"nodes": [
					2762,
					2763,
					2764,
					2765,
					2766,
					2767,
					2768,
					2769,
					2770
				]
			},
			{
				"speed": 25,
				"name": "Combraille Court",
				"nodes": [
					2771,
					2772,
					2773,
					2774
				]
			},
			{
				"speed": 25,
				"name": "Parakeet Lane",
				"nodes": [
					2775,
					2776,
					2777,
					2778,
					2779
				]
			},
			{
				"speed": 35,
				"name": "North New Florissant Road",
				"nodes": [
					1619,
					2780,
					2146,
					2781,
					2782,
					2783,
					1615,
					2784,
					2785,
					2786,
					1115,
					404,
					2787,
					2788,
					2789,
					2790,
					2791,
					2792,
					2793
				]
			},
			{
				"speed": 35,
				"name": "New Florissant Road",
				"nodes": [
					2794,
					2757,
					2795,
					2796,
					2797,
					2798,
					2799,
					2800,
					1049,
					2801,
					2715,
					2802,
					2803,
					2804,
					2805
				]
			},
			{
				"speed": 25,
				"name": "Edinburg Court",
				"nodes": [
					2806,
					2807,
					2808,
					2809,
					2810,
					2811,
					2812,
					2813
				]
			},
			{
				"speed": 25,
				"name": "Willow Lane",
				"nodes": [
					2814,
					2815
				]
			},
			{
				"speed": 30,
				"name": "Sinks Road",
				"nodes": [
					2816,
					2817,
					2818,
					2819,
					2820,
					2821,
					2822,
					2823,
					2824,
					2825,
					2826,
					2827,
					2828,
					2829,
					2830,
					2831,
					2832,
					2833,
					2834,
					2835,
					2836,
					2837,
					2838,
					2839,
					2840,
					2841,
					2842,
					2843,
					2844
				]
			},
			{
				"speed": 25,
				"name": "Willow Lane",
				"nodes": [
					2845,
					2846,
					2847,
					2848
				]
			},
			{
				"speed": 25,
				"name": "Willow Lane",
				"nodes": [
					2849,
					2850
				]
			},
			{
				"speed": 25,
				"name": "Brebouef Lane",
				"nodes": [
					2497,
					2851,
					2852
				]
			},
			{
				"speed": 25,
				"name": "Long Champs Drive",
				"nodes": [
					2853,
					2854,
					2855,
					2856,
					2857,
					2858,
					2859,
					2860
				]
			},
			{
				"speed": 25,
				"name": "Suncrest Drive",
				"nodes": [
					2861,
					2862,
					2863,
					2864,
					2865,
					2866
				]
			},
			{
				"speed": 25,
				"name": "Eldorado Drive",
				"nodes": [
					2867,
					2868,
					2869,
					2870,
					2871,
					2872,
					2873,
					2874,
					2875,
					2876,
					2877,
					2878,
					2879,
					2880,
					2881,
					2882,
					2883,
					2884,
					2885,
					2886,
					2887,
					2888
				]
			},
			{
				"speed": 25,
				"name": "New Hope Court",
				"nodes": [
					2889,
					2890
				]
			},
			{
				"speed": 25,
				"name": "Raven Lane",
				"nodes": [
					2891,
					2892,
					2893,
					2894
				]
			},
			{
				"speed": 25,
				"name": "Arpent Lane",
				"nodes": [
					2895,
					2896,
					2897,
					2898,
					2899,
					2900,
					2901,
					2902,
					2903,
					2904,
					2905,
					2906
				]
			},
			{
				"speed": 25,
				"name": "Weskan Court",
				"nodes": [
					2907,
					2908,
					2909,
					2910,
					2911,
					2912,
					2913,
					2914
				]
			},
			{
				"speed": 25,
				"name": "Dresden Drive",
				"nodes": [
					2082,
					2915,
					2916,
					2917,
					2918,
					2919,
					2920,
					2921,
					2922,
					2923,
					2924,
					2925,
					2926,
					2927,
					2928,
					2929,
					2930,
					2931,
					2932,
					2933,
					2934,
					2935,
					2936,
					2937,
					2938,
					2939,
					2940
				]
			},
			{
				"speed": 25,
				"name": "Ville Donna Court",
				"nodes": [
					2941,
					2942,
					2943,
					2944,
					2945,
					2946,
					2947
				]
			},
			{
				"speed": 25,
				"name": "Mullanphy Court",
				"nodes": [
					2948,
					2949,
					2950,
					2951
				]
			},
			{
				"speed": 25,
				"name": "Burning Tree Drive",
				"nodes": [
					2952,
					2953,
					2954,
					2955,
					2956,
					2957,
					2958,
					2959
				]
			},
			{
				"speed": 25,
				"name": "Pyrenees Drive",
				"nodes": [
					2960,
					2961,
					2962,
					2963,
					2964,
					2965,
					2966,
					2967,
					2968,
					2969,
					2970,
					2971
				]
			},
			{
				"speed": 25,
				"name": "Mill Valley",
				"nodes": [
					2972,
					2973,
					2974,
					2975,
					2976,
					2977,
					2978,
					2979,
					2980,
					2981
				]
			},
			{
				"speed": 40,
				"name": "McDonnell Boulevard",
				"nodes": [
					2982,
					2983,
					2984,
					2985,
					2986
				]
			},
			{
				"speed": 25,
				"name": "Brookstone Drive",
				"nodes": [
					2987,
					2988,
					2989,
					2990,
					2991
				]
			},
			{
				"speed": 30,
				"name": "Old Jamestown Road",
				"nodes": [
					2992,
					2993,
					2994,
					2995,
					2996,
					2997,
					2998,
					2999,
					3000,
					3001,
					3002,
					3003,
					3004,
					3005,
					3006,
					3007,
					3008,
					3009,
					3010,
					2592,
					3011,
					3012,
					3013,
					3014,
					3015,
					3016,
					3017,
					3018,
					3019,
					3020,
					3021,
					3022,
					3023,
					3024,
					3025,
					3026,
					3027,
					3028,
					3029,
					3030,
					3031,
					3032,
					3033,
					3034,
					3035,
					3036,
					3037,
					3038,
					3039,
					3040,
					3041,
					3042,
					3043,
					3044,
					3045,
					3046,
					3047,
					3048,
					3049,
					3050,
					3051
				]
			},
			{
				"speed": 25,
				"name": "Redbird Drive",
				"nodes": [
					3052,
					3053,
					3054,
					3055,
					3056
				]
			},
			{
				"speed": 25,
				"name": "Pomander Drive",
				"nodes": [
					3057,
					3058,
					3059,
					3060,
					3061,
					3062
				]
			},
			{
				"speed": 25,
				"name": "Rissant Drive",
				"nodes": [
					3063,
					3064,
					3065,
					3066,
					3067,
					3068,
					3069,
					3070
				]
			},
			{
				"speed": 25,
				"name": "Liberty Village Drive",
				"nodes": [
					3071,
					3072,
					3073,
					3074,
					3075,
					3076,
					3077,
					3078,
					3079,
					3080,
					3081,
					3082,
					3083,
					3084,
					3085,
					3086,
					3087,
					3088,
					3089,
					3090,
					3091,
					3092,
					3093,
					3094,
					3095,
					3096,
					3097,
					3098,
					3099
				]
			},
			{
				"speed": 25,
				"name": "Longhorn Trail",
				"nodes": [
					3100,
					3101,
					3102,
					3103,
					2003,
					3104,
					3105,
					3106,
					3107
				]
			},
			{
				"speed": 25,
				"name": "Linnell Drive",
				"nodes": [
					3108,
					3109,
					610,
					1544,
					3110,
					1274,
					3111,
					3112,
					2208,
					3113,
					1258
				]
			},
			{
				"speed": 25,
				"name": "Linnell Drive",
				"nodes": [
					1311,
					3114,
					3115,
					3116,
					3117,
					3118,
					3119,
					3120,
					3121,
					3122,
					3123,
					3124,
					3125
				]
			},
			{
				"speed": 25,
				"name": "Saint Thomas Court",
				"nodes": [
					3126,
					3127
				]
			},
			{
				"speed": 25,
				"name": "St Walter Lane",
				"nodes": [
					3128,
					3129
				]
			},
			{
				"speed": 25,
				"name": "Chaple View Drive",
				"nodes": [
					3130,
					3131,
					3132,
					3133,
					341
				]
			},
			{
				"speed": 25,
				"name": "Saint Joan Drive",
				"nodes": [
					3134,
					3135,
					3136
				]
			},
			{
				"speed": 25,
				"name": "Caracalla Drive",
				"nodes": [
					3137,
					3138,
					3139,
					3140,
					3141,
					3142
				]
			},
			{
				"speed": 25,
				"name": "Hermoso Drive",
				"nodes": [
					3143,
					3144,
					3145,
					3146,
					3147,
					3148,
					3149,
					3150,
					3151,
					3152,
					3153
				]
			},
			{
				"speed": 25,
				"name": "Springwood Place Court",
				"nodes": [
					3154,
					3155
				]
			},
			{
				"speed": 25,
				"name": "Layven Avenue",
				"nodes": [
					531,
					3156,
					3157,
					3158,
					3159,
					3160,
					3161
				]
			},
			{
				"speed": 25,
				"name": "Miraclair Drive",
				"nodes": [
					3162,
					3163,
					3164,
					3165,
					3166,
					3167,
					3168,
					3169,
					3170,
					3171,
					3172,
					3173,
					3174,
					3175,
					3176,
					3177,
					3178,
					3179,
					3180,
					3181,
					3182,
					3183,
					3184
				]
			},
			{
				"speed": 25,
				"name": "Spring Trail Drive",
				"nodes": [
					3185,
					3186,
					3187,
					3188,
					3189,
					3190,
					3191,
					3192,
					3193,
					3194,
					3195,
					3196,
					3197,
					3198,
					3199,
					3200,
					3201,
					3202,
					3203,
					3204,
					3205
				]
			},
			{
				"speed": 25,
				"name": "Grandin Lane",
				"nodes": [
					3206,
					3207,
					3208,
					3209,
					3210,
					3211,
					3212,
					3213,
					3214
				]
			},
			{
				"speed": 25,
				"name": "Chaple View Drive",
				"nodes": [
					344,
					3215,
					3216,
					3217,
					3218,
					3219,
					3220,
					3130
				]
			},
			{
				"speed": 25,
				"name": "Babler Drive",
				"nodes": [
					3221,
					3222,
					3223,
					2705,
					3224,
					3225,
					3226,
					3227
				]
			},
			{
				"speed": 25,
				"name": "Humes Lane",
				"nodes": [
					3228,
					3229
				]
			},
			{
				"speed": 25,
				"name": "Humes Lane",
				"nodes": [
					3229,
					3230,
					3231,
					3232,
					3233,
					3234,
					3235,
					2891,
					3236,
					3237,
					3238,
					3239,
					3240
				]
			},
			{
				"speed": 25,
				"name": "Ranchwood Drive",
				"nodes": [
					3241,
					3242
				]
			},
			{
				"speed": 25,
				"name": "Towpath Trail",
				"nodes": [
					3243,
					3244,
					1095
				]
			},
			{
				"speed": 25,
				"name": "Brampton Hunt Road",
				"nodes": [
					3245,
					3246,
					3247,
					3248,
					3249,
					3250,
					3251,
					3252,
					3253,
					3254,
					3255,
					3256,
					3257,
					3258
				]
			},
			{
				"speed": 25,
				"name": "Salvation Road",
				"nodes": [
					3259,
					3260,
					3261,
					3262,
					3263,
					3264,
					3265,
					3266,
					3267,
					3268,
					3269,
					3270,
					3271,
					3272
				]
			},
			{
				"speed": 25,
				"name": "Jamestown Estates",
				"nodes": [
					3273,
					3274,
					3275,
					3276,
					3277,
					3278,
					3279,
					3280,
					3281,
					3282
				]
			},
			{
				"speed": 25,
				"name": "Timberwood Trail",
				"nodes": [
					3283,
					3284,
					3285,
					3286,
					3287,
					3288,
					3289,
					3290,
					3291,
					3292,
					3293,
					3294,
					3295,
					3296,
					3297,
					3298,
					3283
				]
			},
			{
				"speed": 25,
				"name": "Brookes Drive",
				"nodes": [
					3299,
					3300,
					3301,
					3302,
					3303,
					3304,
					3305,
					3306,
					3307,
					3308,
					3309,
					3310,
					3311,
					3312,
					3313,
					3314,
					3315,
					3316,
					3317,
					3318
				]
			},
			{
				"speed": 25,
				"name": "Count Fleet Circle",
				"nodes": [
					2333,
					3319
				]
			},
			{
				"speed": 25,
				"name": "Salvation Road",
				"nodes": [
					3320,
					3321,
					3322,
					3323,
					2593,
					3324,
					3325,
					3326,
					3327,
					3328,
					3329,
					3330,
					3272
				]
			},
			{
				"speed": 25,
				"name": "Stirrup Lane",
				"nodes": [
					707,
					3331,
					3332,
					3333,
					3334,
					3335,
					1411,
					2629,
					3336,
					3337
				]
			},
			{
				"speed": 25,
				"name": "Cantabrian Court",
				"nodes": [
					3338,
					3339,
					3340,
					3341,
					3342,
					3343,
					3344,
					3345,
					3346
				]
			},
			{
				"speed": 25,
				"name": "St Bernadette Lane",
				"nodes": [
					3347,
					3348,
					3349,
					3350,
					3351,
					3352,
					3353
				]
			},
			{
				"speed": 25,
				"name": "Layven Avenue",
				"nodes": [
					1442,
					3354,
					3355,
					3356,
					3357,
					3358,
					3359,
					531
				]
			},
			{
				"speed": 25,
				"name": "Harting Drive",
				"nodes": [
					3360,
					3361
				]
			},
			{
				"speed": 25,
				"name": "Freemantle Court",
				"nodes": [
					3362,
					3363,
					3364,
					3365,
					3366,
					3367,
					3368,
					3369,
					3370,
					3371,
					3372,
					3373,
					3374,
					3375,
					3376,
					3377,
					3362
				]
			},
			{
				"speed": 25,
				"name": "Bradwell Drive",
				"nodes": [
					3378,
					3379,
					3380,
					3381,
					3382,
					3383,
					3384,
					3385,
					3386,
					3387,
					3388,
					3389,
					3390,
					3391,
					3392,
					3393,
					3394,
					3395,
					3396,
					3397,
					3398,
					3399,
					3400
				]
			},
			{
				"speed": 25,
				"name": "Riderwood Drive",
				"nodes": [
					2407,
					3401,
					3402,
					3403,
					3404,
					3405,
					3406,
					3407,
					3408,
					3409,
					3410,
					3411,
					3412,
					3413,
					3414,
					2416
				]
			},
			{
				"speed": 40,
				"name": "Howdershell Road",
				"nodes": [
					2681,
					3415,
					3416,
					3417,
					3418,
					3419,
					3420,
					3421,
					3422,
					2444,
					3423,
					3424,
					3425,
					3426,
					3427,
					3428,
					3429,
					3430,
					3431,
					3432,
					3433,
					3434,
					3435,
					3436,
					3437,
					3438,
					3439,
					2074,
					3440,
					3441,
					3442,
					3443,
					3444,
					3445,
					3446,
					3447,
					3448,
					3449,
					3450,
					3451,
					3452,
					3453,
					3454,
					3455,
					3456,
					3457,
					3458,
					3459,
					3460,
					3461,
					3462,
					3463,
					3464,
					3465,
					3466,
					3467,
					3468,
					3469,
					3470,
					3471,
					3472,
					3473,
					155,
					3474,
					3475,
					3476,
					3477,
					3478,
					3479
				]
			},
			{
				"speed": 25,
				"name": "Impala Lane",
				"nodes": [
					3480,
					3481,
					3482,
					3483,
					1506,
					3484,
					3485
				]
			},
			{
				"speed": 25,
				"name": "Civic Center Drive",
				"nodes": [
					3486,
					3487,
					3488,
					3489,
					3490,
					3491,
					3492,
					3493,
					3494,
					3495,
					3496,
					3497,
					3498,
					3499,
					3500,
					3501
				]
			},
			{
				"speed": 25,
				"name": "Monsols Drive",
				"nodes": [
					3502,
					3503,
					3504,
					3505,
					3506,
					3507,
					3508,
					3509,
					3510,
					3511,
					3512
				]
			},
			{
				"speed": 25,
				"name": "Devonshire Drive",
				"nodes": [
					3513,
					3514,
					3515,
					3516,
					3517,
					3518,
					3519,
					3520,
					3521,
					3522,
					3523,
					3524,
					3525,
					3526,
					3527,
					3528,
					3529
				]
			},
			{
				"speed": 25,
				"name": "Cork Lane",
				"nodes": [
					3530,
					3531
				]
			},
			{
				"speed": 25,
				"name": "Riderwood Drive",
				"nodes": [
					3532,
					3533,
					3534,
					3535,
					3536
				]
			},
			{
				"speed": 25,
				"name": "Grants Parkway",
				"nodes": [
					3537,
					3538,
					3539,
					3540,
					3541,
					3542,
					3543,
					3544,
					3545,
					3546,
					3547,
					3548,
					3549,
					3550,
					3551
				]
			},
			{
				"speed": 25,
				"name": "Grants Parkway",
				"nodes": [
					3552,
					3553,
					3554,
					3555,
					1458,
					3556,
					2129,
					3557,
					3558,
					3559,
					3560,
					3561,
					1651,
					3562
				]
			},
			{
				"speed": 25,
				"name": "Jerries Lane",
				"nodes": [
					3019,
					3563
				]
			},
			{
				"speed": 25,
				"name": "Brindle Court",
				"nodes": [
					3564,
					3565
				]
			},
			{
				"speed": 25,
				"name": "Club Grounds North Drive",
				"nodes": [
					3566,
					3567,
					3568
				]
			},
			{
				"speed": 25,
				"name": "Sucasa Drive",
				"nodes": [
					3569,
					3570,
					3571,
					3572,
					3573,
					3574,
					3575,
					3576,
					3577,
					3578,
					3579,
					3580,
					3581,
					3582,
					3583,
					3584,
					3585,
					3586,
					3587,
					3588,
					3589,
					3590,
					3591,
					3592,
					3593,
					3594,
					3595,
					3596
				]
			},
			{
				"speed": 25,
				"name": "Hallwood Court",
				"nodes": [
					3597,
					3598
				]
			},
			{
				"speed": 25,
				"name": "Club Grounds North Drive",
				"nodes": [
					3599,
					3600,
					3601,
					3602,
					3603,
					3604,
					3605,
					3566
				]
			},
			{
				"speed": 25,
				"name": "Stonehaven Drive",
				"nodes": [
					3606,
					3607,
					3608,
					3609,
					3610,
					2991,
					3611,
					3612
				]
			},
			{
				"speed": 25,
				"name": "Dewayne Drive",
				"nodes": [
					3613,
					3614,
					3615,
					3616,
					3617,
					3618,
					3619,
					3620,
					3621,
					3622,
					3623,
					3624,
					3625,
					3626,
					3627,
					3628,
					3629,
					3630,
					3631,
					3632,
					3633,
					3634,
					3635,
					3636,
					3637,
					3638,
					3639,
					3640
				]
			},
			{
				"speed": 25,
				"name": "Aubuchon Street",
				"nodes": [
					3641,
					2148,
					3642,
					3643,
					3644,
					3645,
					3646,
					3647,
					1117,
					3648,
					3649,
					3650,
					3651,
					3652
				]
			},
			{
				"speed": 25,
				"name": "Mowing Green Drive",
				"nodes": [
					3653,
					3654,
					3655,
					3656,
					3657,
					3658,
					3659,
					3660,
					3661,
					3662,
					3663,
					3664
				]
			},
			{
				"speed": 25,
				"name": "Furlong Lane",
				"nodes": [
					1891,
					3665,
					3666
				]
			},
			{
				"speed": 25,
				"name": "Cardinal Drive",
				"nodes": [
					3667,
					3668,
					3669,
					3670,
					3671,
					3672,
					3673,
					3674
				]
			},
			{
				"speed": 25,
				"name": "Jerries Lane",
				"nodes": [
					3675,
					3676,
					3677,
					3678,
					3679
				]
			},
			{
				"speed": 25,
				"name": "Grether Avenue",
				"nodes": [
					2802,
					3680,
					3681,
					3682
				]
			},
			{
				"speed": 25,
				"name": "Driftwood Trails Drive",
				"nodes": [
					3683,
					3684,
					3685,
					3686,
					3687,
					3688,
					3689,
					3690,
					3691,
					3692,
					3693,
					3694,
					3695,
					3696,
					3697
				]
			},
			{
				"speed": 25,
				"name": "Hazelwood Avenue",
				"nodes": [
					3698,
					3699,
					3700,
					3701,
					3702,
					3703,
					3704,
					3705,
					1987,
					3706,
					3707,
					3708,
					3709,
					3710,
					3711,
					3712,
					3713,
					3714
				]
			},
			{
				"speed": 30,
				"name": "Leaf Crest Drive",
				"nodes": [
					3715,
					3716,
					3717,
					3718,
					3719,
					3720,
					3721,
					3722,
					3723,
					3724,
					3725,
					1773,
					3726,
					3727,
					3728
				]
			},
			{
				"speed": 25,
				"name": "Salazar Drive",
				"nodes": [
					3729,
					3730,
					3731,
					3732
				]
			},
			{
				"speed": 25,
				"name": "95th Avenue",
				"nodes": [
					3733,
					3734,
					3735,
					3736,
					3737,
					3738,
					3739,
					3740
				]
			},
			{
				"speed": 25,
				"name": "Cottontail Drive",
				"nodes": [
					3741,
					3742,
					3743,
					3744,
					3745,
					3746,
					3747,
					3748,
					3749,
					3750,
					3751
				]
			},
			{
				"speed": 25,
				"name": "Birchlawn Drive",
				"nodes": [
					3752,
					3753
				]
			},
			{
				"speed": 25,
				"name": "East Humes Lane",
				"nodes": [
					3754,
					3755,
					3756,
					3757,
					3758,
					3759,
					3760,
					3761,
					3762,
					3763
				]
			},
			{
				"speed": 25,
				"name": "Elm Drive",
				"nodes": [
					3764,
					3765,
					3766,
					3767,
					3768,
					3769,
					3770
				]
			},
			{
				"speed": 25,
				"name": "Coachman Lane",
				"nodes": [
					483,
					3771,
					3772,
					3773,
					3774,
					3775,
					3776,
					3777,
					3778
				]
			},
			{
				"speed": 25,
				"name": "Industrial Lane",
				"nodes": [
					3779,
					3780
				]
			},
			{
				"speed": 25,
				"name": "Bugle Bend Drive",
				"nodes": [
					2476,
					3781,
					2494,
					3782,
					3783
				]
			},
			{
				"speed": 25,
				"name": "Splendor Drive",
				"nodes": [
					3784,
					3785,
					3786,
					3787,
					3788,
					3789,
					3790,
					1480
				]
			},
			{
				"speed": 25,
				"name": "Blackfoot Court",
				"nodes": [
					3791,
					3792
				]
			},
			{
				"speed": 25,
				"name": "Pheasant Drive",
				"nodes": [
					3793,
					3794,
					3795,
					3796,
					3797,
					3798,
					3799,
					3800,
					3801
				]
			},
			{
				"speed": 25,
				"name": "Pheasant Drive",
				"nodes": [
					3802,
					3803,
					3804,
					3805,
					3806
				]
			},
			{
				"speed": 25,
				"name": "Menke Place",
				"nodes": [
					3807,
					3808
				]
			},
			{
				"speed": 25,
				"name": "Claire Court",
				"nodes": [
					3809,
					3810
				]
			},
			{
				"speed": 25,
				"name": "Canary Court",
				"nodes": [
					3811,
					3812
				]
			},
			{
				"speed": 25,
				"name": "Cross Keys Place Drive",
				"nodes": [
					3813,
					3814,
					3815,
					3816,
					3817
				]
			},
			{
				"speed": 25,
				"name": "Brightwell Court",
				"nodes": [
					3818,
					3819
				]
			},
			{
				"speed": 25,
				"name": "Edgemere Drive",
				"nodes": [
					276,
					433,
					3820,
					3821,
					3822,
					3823,
					3824,
					3825,
					3826,
					3827,
					3828,
					3829,
					3830,
					3831,
					3832
				]
			},
			{
				"speed": 25,
				"name": "Pelican Lane",
				"nodes": [
					648,
					3833,
					3834
				]
			},
			{
				"speed": 25,
				"name": "Cardinal Lane",
				"nodes": [
					3835,
					3836,
					2188,
					3837,
					3838,
					3839,
					3840
				]
			},
			{
				"speed": 25,
				"name": "Trailoaks Court",
				"nodes": [
					3841,
					3842,
					3843
				]
			},
			{
				"speed": 25,
				"name": "North Saint Charles Street",
				"nodes": [
					3844,
					3845,
					3846,
					3847
				]
			},
			{
				"speed": 25,
				"name": "Black Jack Court",
				"nodes": [
					3848,
					3849,
					3850,
					3851,
					3852,
					3853
				]
			},
			{
				"speed": 25,
				"name": "Paddock Hills Plaza Shoping Center",
				"nodes": [
					2516,
					3854
				]
			},
			{
				"speed": 25,
				"name": "Farber Drive",
				"nodes": [
					1263,
					3855,
					3856,
					3857,
					3858,
					3859,
					3860,
					3861,
					3862
				]
			},
			{
				"speed": 25,
				"name": "South St Jacques St",
				"nodes": [
					3863,
					3864,
					3865,
					3866,
					3867,
					3868,
					3869
				]
			},
			{
				"speed": 25,
				"name": "Janria Drive",
				"nodes": [
					3870,
					3871,
					3872,
					3873,
					3874,
					3875,
					3876
				]
			},
			{
				"speed": 25,
				"name": "Edna Drive",
				"nodes": [
					3877,
					3878,
					3879
				]
			},
			{
				"speed": 25,
				"name": "Centerbrook Court",
				"nodes": [
					3880,
					3881
				]
			},
			{
				"speed": 25,
				"name": "Mustang Court",
				"nodes": [
					3882,
					3883,
					3884,
					3885
				]
			},
			{
				"speed": 25,
				"name": "Southwell Lane",
				"nodes": [
					3886,
					3887
				]
			},
			{
				"speed": 25,
				"name": "Dowd Drive",
				"nodes": [
					3888,
					3889,
					3890
				]
			},
			{
				"speed": 25,
				"name": "Saint Genevieve Court",
				"nodes": [
					3891,
					3892
				]
			},
			{
				"speed": 25,
				"name": "Clover Lane",
				"nodes": [
					3893,
					3894,
					3895,
					2499,
					2498,
					2740,
					3896,
					3897,
					3898,
					2379
				]
			},
			{
				"speed": 25,
				"name": "Mediterranean Drive",
				"nodes": [
					3899,
					3900,
					3901,
					3902,
					3903,
					3904,
					3905,
					3906,
					3907,
					3908
				]
			},
			{
				"speed": 25,
				"name": "Murat Drive",
				"nodes": [
					3909,
					3910,
					3911,
					3912,
					3913,
					3914
				]
			},
			{
				"speed": 25,
				"name": "Apache Drive",
				"nodes": [
					3915,
					3916,
					3917
				]
			},
			{
				"speed": 25,
				"name": "Ebert Drive",
				"nodes": [
					3918,
					612,
					3919,
					3920,
					3921,
					1276
				]
			},
			{
				"speed": 25,
				"name": "El Centro Drive",
				"nodes": [
					3922,
					3923,
					3924,
					3925,
					3926,
					3927,
					3928,
					3929
				]
			},
			{
				"speed": 25,
				"name": "Sally Drive",
				"nodes": [
					3930,
					3931,
					3932
				]
			},
			{
				"speed": 25,
				"name": "Sally Drive",
				"nodes": [
					3933,
					3934,
					3879
				]
			},
			{
				"speed": 25,
				"name": "Quick Drive",
				"nodes": [
					3935,
					3936,
					3937
				]
			},
			{
				"speed": 25,
				"name": "Hammes Drive",
				"nodes": [
					3938,
					3939,
					3940,
					3941,
					3942,
					3943,
					3944,
					3945,
					3946
				]
			},
			{
				"speed": 25,
				"name": "Baratton Drive",
				"nodes": [
					3947,
					3948,
					3949,
					3950,
					3951,
					3952,
					3953,
					3954
				]
			},
			{
				"speed": 25,
				"name": "Pontchartrain Drive",
				"nodes": [
					3955,
					3956,
					3957,
					3958,
					3959,
					3729,
					3960
				]
			},
			{
				"speed": 25,
				"name": "Churchill Drive",
				"nodes": [
					3961,
					3962,
					3963,
					3964,
					3965,
					3966,
					3967,
					3968,
					3969,
					3970,
					3971,
					3972,
					3973,
					3974,
					3975,
					3976,
					3977
				]
			},
			{
				"speed": 25,
				"name": "Williamsburg Manor Drive",
				"nodes": [
					3978,
					3979,
					3980,
					3981,
					3982,
					3983,
					3984,
					3985,
					3986,
					3987,
					3988
				]
			},
			{
				"speed": 25,
				"name": "Ebert Drive",
				"nodes": [
					1276,
					1260,
					3989,
					3990,
					3991,
					3862,
					1389,
					3992
				]
			},
			{
				"speed": 25,
				"name": "Cape Cod Drive",
				"nodes": [
					3993,
					3994,
					3995
				]
			},
			{
				"speed": 25,
				"name": "Lighthouse Drive",
				"nodes": [
					3996,
					3997,
					3998,
					3999,
					4000
				]
			},
			{
				"speed": 25,
				"name": "St Pierre Court",
				"nodes": [
					4001,
					4002
				]
			},
			{
				"speed": 25,
				"name": "Wedgwood Drive West",
				"nodes": [
					4003,
					4004,
					4005,
					4006,
					4007,
					4008,
					4009,
					4010,
					4011,
					4012,
					4013,
					4014,
					4015,
					4016,
					4017,
					4018,
					4019,
					4020,
					4021,
					4022,
					4023,
					4024,
					4025,
					4026,
					4027,
					4028,
					4029,
					4030
				]
			},
			{
				"speed": 25,
				"name": "Country Club Lane",
				"nodes": [
					4031,
					4032,
					4033,
					4034,
					4035,
					4036,
					4037,
					4038,
					4039
				]
			},
			{
				"speed": 25,
				"name": "Singing Pines Drive",
				"nodes": [
					4040,
					4041
				]
			},
			{
				"speed": 25,
				"name": "Willow Trail Drive",
				"nodes": [
					4042,
					4043,
					4044,
					4045,
					4046,
					4047,
					4048,
					4049,
					4050,
					4051,
					4052,
					4053,
					4054,
					4055,
					4056
				]
			},
			{
				"speed": 25,
				"name": "Boggan Place",
				"nodes": [
					4057,
					4058,
					4059,
					4060,
					4061,
					4062
				]
			},
			{
				"speed": 25,
				"name": "Robbins Mill Road",
				"nodes": [
					4063,
					4064,
					4065,
					4066,
					4067,
					4068,
					4069,
					4070,
					2816
				]
			},
			{
				"speed": 25,
				"name": "Buttonwood Court",
				"nodes": [
					4071,
					4072,
					2627
				]
			},
			{
				"speed": 25,
				"name": "Burwell Drive",
				"nodes": [
					1317,
					4073,
					3119
				]
			},
			{
				"speed": 25,
				"name": "Elwood Court",
				"nodes": [
					4074,
					4075
				]
			},
			{
				"speed": 25,
				"name": "Bielfield Drive",
				"nodes": [
					4076,
					4077,
					4078,
					4079,
					4080,
					4081,
					4082,
					4083,
					4084,
					4085,
					4086,
					4087,
					4088,
					4089,
					4090,
					4091,
					4092,
					4093,
					4094,
					4095,
					4096,
					4097,
					4098,
					4099
				]
			},
			{
				"speed": 25,
				"name": "Quinnella Court",
				"nodes": [
					4100,
					4101
				]
			},
			{
				"speed": 25,
				"name": "Riverfront Court",
				"nodes": [
					4102,
					4103,
					4104,
					4105,
					4106,
					4107,
					4108,
					4109,
					4110,
					4111,
					4112,
					4113,
					4114,
					4115,
					4116,
					4117,
					4102
				]
			},
			{
				"speed": 25,
				"name": "Arundel Drive",
				"nodes": [
					4118,
					4119,
					4120,
					4121,
					4122,
					3752,
					4123,
					4124,
					4125,
					4126,
					4127
				]
			},
			{
				"speed": 25,
				"name": "Tyson Court",
				"nodes": [
					4128,
					4129,
					4130
				]
			},
			{
				"speed": 25,
				"name": "Chickadee Lane",
				"nodes": [
					4131,
					4132,
					4133,
					4134,
					4135,
					4136,
					4137,
					4138,
					4139
				]
			},
			{
				"speed": 25,
				"name": "Talon Drive",
				"nodes": [
					4140,
					4141,
					4142,
					4143,
					4144,
					4145
				]
			},
			{
				"speed": 25,
				"name": "Robbins Mill Road",
				"nodes": [
					2816,
					4146,
					4147,
					4148,
					4149,
					4150,
					4151,
					4152,
					4153,
					4154,
					4155,
					4156,
					4157,
					4158,
					4159,
					4160
				]
			},
			{
				"speed": 25,
				"name": "Summerfield Lane",
				"nodes": [
					4161,
					4162,
					4163,
					4164,
					4165
				]
			},
			{
				"speed": 25,
				"name": "Del Rey Drive",
				"nodes": [
					4166,
					4167,
					4168,
					4169,
					4170,
					4171,
					4172,
					4173,
					4174,
					4175,
					4176,
					4177
				]
			},
			{
				"speed": 25,
				"name": "Alberto Lane",
				"nodes": [
					4178,
					4179,
					4180,
					606,
					4181,
					4182,
					4183,
					4184,
					4185,
					4186,
					4187,
					4188,
					2888
				]
			},
			{
				"speed": 25,
				"name": "Koch Drive",
				"nodes": [
					4189,
					4190,
					4191,
					4192
				]
			},
			{
				"speed": 25,
				"name": "Berchmans Lane",
				"nodes": [
					984,
					4193,
					4194,
					4195
				]
			},
			{
				"speed": 25,
				"name": "Pontmain Lane",
				"nodes": [
					4196,
					4197,
					4198,
					4199,
					4200,
					4201
				]
			},
			{
				"speed": 25,
				"name": "Ville Maura Court",
				"nodes": [
					4202,
					4203,
					4204,
					4205,
					4206,
					4207,
					4208,
					4209,
					4210,
					4211,
					4212,
					4213,
					4214,
					4215,
					4216,
					4217,
					4202
				]
			},
			{
				"speed": 25,
				"name": "Carey Lane",
				"nodes": [
					4218,
					4219,
					4220,
					4221,
					4222,
					4223,
					4224,
					4225
				]
			},
			{
				"speed": 25,
				"name": "Vission Court",
				"nodes": [
					4226,
					4227,
					4228
				]
			},
			{
				"speed": 25,
				"name": "Foxtrot Drive",
				"nodes": [
					4229,
					4230,
					4231
				]
			},
			{
				"speed": 25,
				"name": "Fort de France Lane",
				"nodes": [
					4232,
					4233,
					4234,
					4235,
					4236,
					4237,
					4238,
					4239,
					4240,
					4241,
					4242,
					4243,
					4244,
					4245,
					4246,
					4247,
					4248,
					4249,
					4250,
					4251,
					4252
				]
			},
			{
				"speed": 25,
				"name": "Heatherton Drive",
				"nodes": [
					4253,
					4254,
					4255,
					4256,
					4257,
					4258,
					4259,
					4260,
					4261,
					4262,
					4263,
					4264,
					4265,
					4266,
					4267,
					4268,
					4269,
					4270,
					4271,
					4272,
					4273,
					4274,
					4275,
					4276,
					4277,
					4278,
					4279,
					4280,
					4281
				]
			},
			{
				"speed": 25,
				"name": "Spikewood Court",
				"nodes": [
					1171,
					4282,
					4283,
					4284,
					4285,
					4286,
					4287
				]
			},
			{
				"speed": 25,
				"name": "Spikewood Court",
				"nodes": [
					2616,
					4288
				]
			},
			{
				"speed": 25,
				"name": "Kempfer Hills Court",
				"nodes": [
					4289,
					4290
				]
			},
			{
				"speed": 30,
				"name": "Mehl Avenue",
				"nodes": [
					4291,
					1286,
					4292,
					4293,
					4294,
					4295,
					4296,
					4297,
					4298,
					4299
				]
			},
			{
				"speed": 25,
				"name": "Seagull Court",
				"nodes": [
					4300,
					4301,
					4302,
					4303,
					4304,
					4305,
					4306,
					4307,
					4308,
					4309,
					4310,
					4311,
					4312,
					4313,
					4314,
					4315,
					4300
				]
			},
			{
				"speed": 25,
				"name": "Brackmann Lane",
				"nodes": [
					4316,
					4317,
					4318,
					4319
				]
			},
			{
				"speed": 25,
				"name": "Slusser Lane",
				"nodes": [
					2287,
					1156
				]
			},
			{
				"speed": 25,
				"name": "Bluebird Drive",
				"nodes": [
					4320,
					4321,
					4322,
					4323,
					4324,
					3840
				]
			},
			{
				"speed": 25,
				"name": "Justice Court",
				"nodes": [
					4325,
					4326,
					4327,
					4328
				]
			},
			{
				"speed": 25,
				"name": "Bluebird Drive",
				"nodes": [
					4329,
					4330,
					4331,
					4332,
					4333,
					4334,
					4335,
					4336,
					4337,
					4338,
					4339
				]
			},
			{
				"speed": 25,
				"name": "Nero Drive",
				"nodes": [
					4340,
					419,
					3137,
					4341,
					4342,
					4343,
					2431,
					4344,
					4345,
					4346
				]
			},
			{
				"speed": 25,
				"name": "Shadowcreek Drive",
				"nodes": [
					3544,
					4347,
					4348,
					4349,
					4350,
					4351,
					4352,
					4353,
					4354,
					4355,
					4356,
					4357,
					4358,
					4359,
					4360,
					4361,
					4362,
					4363,
					4364
				]
			},
			{
				"speed": 25,
				"name": "Calbreath Court",
				"nodes": [
					4365,
					4366,
					4367,
					4368,
					4369,
					4370,
					4371,
					4372,
					4373,
					4374
				]
			},
			{
				"speed": 30,
				"name": "Wiethaupt Road",
				"nodes": [
					4375,
					4376,
					4377,
					4378,
					4379,
					4380,
					4381,
					4382,
					4383,
					4384,
					4385,
					1871,
					4386,
					76,
					4387,
					4388,
					4389,
					4390
				]
			},
			{
				"speed": 25,
				"name": "Gerald Avenue",
				"nodes": [
					4391,
					4392,
					4393
				]
			},
			{
				"speed": 25,
				"name": "Soho Drive",
				"nodes": [
					4394,
					4395,
					4396,
					4397,
					4398,
					4399,
					4400,
					4401,
					4402,
					4403,
					4404,
					4405,
					4406
				]
			},
			{
				"speed": 25,
				"name": "Carmona Drive",
				"nodes": [
					4407,
					4408,
					4409,
					4410,
					4411,
					1930
				]
			},
			{
				"speed": 25,
				"name": "Canterbury Drive",
				"nodes": [
					4270,
					4412,
					4413,
					4414,
					4415,
					4003,
					4416,
					4417,
					4418,
					4419,
					4420,
					4421,
					4422,
					4423,
					4424,
					1757,
					4425,
					4426,
					4427,
					4428,
					4429,
					4430,
					4431
				]
			},
			{
				"speed": 25,
				"name": "Scoville Place Court",
				"nodes": [
					4432,
					4433,
					4434
				]
			},
			{
				"speed": 25,
				"name": "Miller Drive",
				"nodes": [
					4435,
					4436,
					4437,
					4438,
					4439,
					4440,
					4441,
					4442
				]
			},
			{
				"speed": 25,
				"name": "Northport Hills Drive",
				"nodes": [
					4443,
					4444,
					4445,
					4446,
					4447,
					4448,
					4449,
					4450,
					4451,
					4452,
					4453,
					4454
				]
			},
			{
				"speed": 25,
				"name": "Burke Drive",
				"nodes": [
					4455,
					4456,
					4457,
					4458,
					4459,
					4460,
					4461,
					4462,
					4463
				]
			},
			{
				"speed": 25,
				"name": "Santiago Drive",
				"nodes": [
					4464,
					4465,
					4466,
					4467,
					4468,
					4469,
					4470,
					4471,
					4472,
					4473,
					4474,
					4475
				]
			},
			{
				"speed": 25,
				"name": "Sir Lords Court",
				"nodes": [
					4476,
					4477,
					4478,
					4479
				]
			},
			{
				"speed": 25,
				"name": "Monfort Drive",
				"nodes": [
					4480,
					4481,
					4482,
					4483,
					4484
				]
			},
			{
				"speed": 25,
				"name": "Catanzaro Court",
				"nodes": [
					4485,
					4486,
					4487,
					4488,
					4489,
					4490
				]
			},
			{
				"speed": 25,
				"name": "Chateline Drive",
				"nodes": [
					3437,
					4491
				]
			},
			{
				"speed": 25,
				"name": "Faon Court",
				"nodes": [
					4492,
					4493,
					4494,
					4495,
					4496,
					4497,
					4498
				]
			},
			{
				"speed": 25,
				"name": "Loveland Drive",
				"nodes": [
					4499,
					4500,
					4501,
					4502,
					4503,
					4504,
					4505,
					4506,
					4507,
					4508,
					4509,
					4510,
					4511,
					4512,
					4513,
					4514,
					2105,
					4339,
					4515,
					4516,
					4517,
					4518,
					4519,
					3052,
					1478,
					4520,
					4521,
					4522,
					4523
				]
			},
			{
				"speed": 25,
				"name": "Surfwood Drive",
				"nodes": [
					4524,
					4525,
					4526,
					4527,
					4528,
					4529,
					4530
				]
			},
			{
				"speed": 25,
				"name": "Tally Ho Drive",
				"nodes": [
					4531,
					4532,
					4533,
					1829,
					4534
				]
			},
			{
				"speed": 25,
				"name": "Williams Boulevard",
				"nodes": [
					2797,
					4535,
					4536,
					4537,
					2743,
					659,
					4538,
					2549,
					4539
				]
			},
			{
				"speed": 25,
				"name": "Monfort Drive",
				"nodes": [
					4540,
					4541,
					4542,
					4543,
					4544,
					4545,
					4480
				]
			},
			{
				"speed": 25,
				"name": "Kilbourn Drive",
				"nodes": [
					1313,
					4546,
					4547
				]
			},
			{
				"speed": 25,
				"name": "Santiago Drive",
				"nodes": [
					4481,
					4548,
					4549,
					4550,
					4551,
					4552,
					4553,
					4554,
					4475,
					274,
					4555,
					4464,
					4556,
					4557,
					4558,
					4559,
					4560,
					3153,
					4561,
					4562,
					3338,
					4563,
					4564,
					4565,
					4566,
					4567,
					4568,
					4569,
					2966
				]
			},
			{
				"speed": 25,
				"name": "Bobolink Drive",
				"nodes": [
					4570,
					4571
				]
			},
			{
				"speed": 25,
				"name": "Chez Paree Drive",
				"nodes": [
					1013,
					4572,
					4573,
					4574,
					4575,
					4576,
					1027,
					4577,
					4578,
					4579
				]
			},
			{
				"speed": 25,
				"name": "Grundy Drive",
				"nodes": [
					4580,
					4581,
					4582
				]
			},
			{
				"speed": 25,
				"name": "Hopi Drive",
				"nodes": [
					4583,
					4584,
					4585,
					4586,
					4587,
					431,
					4588
				]
			},
			{
				"speed": 25,
				"name": "Santiago Drive",
				"nodes": [
					4550,
					4589,
					4590,
					4591,
					4592
				]
			},
			{
				"speed": 25,
				"name": "Cape Horn Place",
				"nodes": [
					4593,
					4594,
					4595,
					4596,
					4597,
					4598,
					4599,
					4600
				]
			},
			{
				"speed": 25,
				"name": "Rue St Jacques",
				"nodes": [
					4601,
					1609,
					4602,
					4603
				]
			},
			{
				"speed": 25,
				"name": "Vanderwood Drive",
				"nodes": [
					4604,
					4605,
					4606,
					4607,
					4608,
					4609,
					4610,
					4611,
					4612,
					4613,
					4614,
					4615,
					4616,
					4617,
					4618,
					4619,
					4620
				]
			},
			{
				"speed": 25,
				"name": "Valencia Drive",
				"nodes": [
					4567,
					4621,
					4622,
					4623
				]
			},
			{
				"speed": 25,
				"name": "Sibley Court",
				"nodes": [
					4624,
					4625,
					4626,
					4627
				]
			},
			{
				"speed": 25,
				"name": "Goodness Drive",
				"nodes": [
					4628,
					4629,
					4630,
					4631,
					4632,
					4633
				]
			},
			{
				"speed": 25,
				"name": "Elksforth Court",
				"nodes": [
					4634,
					4635,
					4636
				]
			},
			{
				"speed": 25,
				"name": "Timberwood Crossing Court",
				"nodes": [
					4637,
					4638,
					4639,
					4640
				]
			},
			{
				"speed": 25,
				"name": "Campfire Trail",
				"nodes": [
					4641,
					4642,
					4643,
					4644,
					4645,
					4646,
					4647,
					4648,
					4649,
					2001
				]
			},
			{
				"speed": 25,
				"name": "Concord Drive",
				"nodes": [
					4650,
					4651,
					4652,
					4653,
					4654,
					4655,
					4656,
					4657,
					4658,
					4659,
					4660
				]
			},
			{
				"speed": 25,
				"name": "Harneywold Drive",
				"nodes": [
					4661,
					4662,
					4663
				]
			},
			{
				"speed": 25,
				"name": "Greenhart Drive",
				"nodes": [
					2215,
					1738,
					1030
				]
			},
			{
				"speed": 25,
				"name": "Vineland Drive",
				"nodes": [
					4664,
					4665,
					4666,
					4667,
					4668,
					4669,
					4670,
					4671,
					4672,
					4673,
					4674
				]
			},
			{
				"speed": 25,
				"name": "Whispering Woods Drive",
				"nodes": [
					717,
					4675,
					4676,
					4677,
					4678,
					4679,
					4680,
					4681,
					4682,
					4683,
					708
				]
			},
			{
				"speed": 25,
				"name": "Larry Drive",
				"nodes": [
					4684,
					4685
				]
			},
			{
				"speed": 25,
				"name": "Flora Court",
				"nodes": [
					1451,
					4686,
					4687,
					4688
				]
			},
			{
				"speed": 25,
				"name": "St George Court",
				"nodes": [
					4689,
					4690
				]
			},
			{
				"speed": 25,
				"name": "Downing Avenue",
				"nodes": [
					4691,
					4692
				]
			},
			{
				"speed": 25,
				"name": "Olvera Circle",
				"nodes": [
					4693,
					4694,
					4695,
					4696,
					4697,
					4698,
					4699,
					4700,
					4701
				]
			},
			{
				"speed": 25,
				"name": "Seascape Court",
				"nodes": [
					622,
					4702,
					4703
				]
			},
			{
				"speed": 25,
				"name": "Birchview Drive",
				"nodes": [
					1334,
					4704,
					1508,
					4705,
					4706,
					4707,
					4708,
					1371
				]
			},
			{
				"speed": 25,
				"name": "Carousel Court",
				"nodes": [
					4709,
					4710,
					4711,
					4712,
					4713,
					4714,
					4715,
					4716,
					4717,
					4718,
					4719,
					4720,
					4721,
					1655
				]
			},
			{
				"speed": 25,
				"name": "Locust Drive",
				"nodes": [
					4722,
					4723,
					4724,
					3764
				]
			},
			{
				"speed": 25,
				"name": "Locust Drive",
				"nodes": [
					3764,
					4725,
					4726,
					4727,
					4728
				]
			},
			{
				"speed": 25,
				"name": "Scotty Drive",
				"nodes": [
					637,
					2430
				]
			},
			{
				"speed": 25,
				"name": "St Pierre St",
				"nodes": [
					4690,
					4729
				]
			},
			{
				"speed": 25,
				"name": "Whitney Circle",
				"nodes": [
					2540,
					4730,
					4731,
					4732
				]
			},
			{
				"speed": 25,
				"name": "Birkemeier Court",
				"nodes": [
					4733,
					4734,
					4735,
					4736,
					4737,
					4738,
					4739,
					4740,
					4741
				]
			},
			{
				"speed": 30,
				"name": "Keeven Lane",
				"nodes": [
					4742,
					4743,
					1850,
					4744,
					4745,
					1441,
					4746,
					4747,
					4748,
					4749,
					425,
					3161,
					3471
				]
			},
			{
				"speed": 25,
				"name": "Sandycreek Drive",
				"nodes": [
					4318,
					4750
				]
			},
			{
				"speed": 25,
				"name": "Filly Court",
				"nodes": [
					4751,
					4752,
					4753
				]
			},
			{
				"speed": 25,
				"name": "Whitemoon Way",
				"nodes": [
					4754,
					4755,
					4756,
					1005
				]
			},
			{
				"speed": 25,
				"name": "Hazelwood Court",
				"nodes": [
					4757,
					4758
				]
			},
			{
				"speed": 25,
				"name": "Fortitude Court",
				"nodes": [
					4759,
					4760
				]
			},
			{
				"speed": 25,
				"name": "Yorkshire Drive",
				"nodes": [
					4761,
					4762,
					4763,
					4764,
					4765,
					4766,
					4767,
					4768
				]
			},
			{
				"speed": 25,
				"name": "Corn Silk Court",
				"nodes": [
					4769,
					4770
				]
			},
			{
				"speed": 25,
				"name": "Riverwood Trails Drive",
				"nodes": [
					4771,
					4772,
					4773
				]
			},
			{
				"speed": 25,
				"name": "Country Lane",
				"nodes": [
					4774,
					4775
				]
			},
			{
				"speed": 25,
				"name": "Lamadera Lane",
				"nodes": [
					4776,
					4777,
					4778,
					4779,
					4780,
					4781,
					4782,
					4783,
					4784,
					4785,
					4786,
					4787
				]
			},
			{
				"speed": 25,
				"name": "Kenwood Terrace",
				"nodes": [
					4788,
					4789,
					4790,
					4791,
					4792,
					4793,
					4794,
					4795,
					4796,
					4797
				]
			},
			{
				"speed": 25,
				"name": "Brebouff Lane",
				"nodes": [
					2851,
					4798
				]
			},
			{
				"speed": 25,
				"name": "Asherton Drive",
				"nodes": [
					4799,
					4800,
					4801,
					4802,
					4803,
					4804,
					4805,
					4806,
					4807
				]
			},
			{
				"speed": 25,
				"name": "Horseshoe Drive",
				"nodes": [
					2525,
					4808,
					4809,
					4810,
					4811,
					4812,
					4813,
					4814,
					4815
				]
			},
			{
				"speed": 25,
				"name": "Blackbird Drive",
				"nodes": [
					644,
					4816,
					4817
				]
			},
			{
				"speed": 25,
				"name": "Thoroughbred Lane",
				"nodes": [
					2536,
					4818,
					4819,
					451,
					4820,
					4821,
					4822,
					4823
				]
			},
			{
				"speed": 25,
				"name": "Wickham Fen Road",
				"nodes": [
					4824,
					4825,
					4826,
					4827,
					4828,
					4829,
					4830,
					4831,
					4832,
					4833
				]
			},
			{
				"speed": 25,
				"name": "Jamestown Bay Court",
				"nodes": [
					4834,
					4835
				]
			},
			{
				"speed": 25,
				"name": "Fernbrook Lane",
				"nodes": [
					4836,
					4837,
					4838,
					4839,
					4840
				]
			},
			{
				"speed": 25,
				"name": "Ocean Side Drive",
				"nodes": [
					4841,
					4842,
					4843,
					4844,
					4845,
					4846,
					4847,
					4848,
					4849,
					4850,
					4851,
					4852,
					4853,
					4854,
					4855,
					4856,
					4857,
					4858,
					4000
				]
			},
			{
				"speed": 25,
				"name": "Shawnee Lane",
				"nodes": [
					4859,
					3915,
					4860
				]
			},
			{
				"speed": 25,
				"name": "Fernbrook Lane",
				"nodes": [
					4861,
					4862,
					4863,
					4864,
					4836
				]
			},
			{
				"speed": 25,
				"name": "Celburne Drive",
				"nodes": [
					1162,
					4865,
					4866
				]
			},
			{
				"speed": 25,
				"name": "Allenhurst Drive",
				"nodes": [
					4867,
					4804,
					4868,
					4869,
					4870,
					4871,
					4872,
					4873,
					4874,
					4875
				]
			},
			{
				"speed": 25,
				"name": "Ramport Drive",
				"nodes": [
					4876,
					4410
				]
			},
			{
				"speed": 25,
				"name": "Alicia Avenue",
				"nodes": [
					4877,
					4878,
					4879,
					4880
				]
			},
			{
				"speed": 25,
				"name": "Durwood Drive",
				"nodes": [
					4881,
					4882,
					1292,
					4883,
					4884,
					4885,
					4886,
					4887,
					4888,
					4889
				]
			},
			{
				"speed": 25,
				"name": "St Celeste Drive",
				"nodes": [
					4890,
					4891,
					4892,
					4893,
					4894,
					4895,
					4896,
					4897,
					4898,
					4899,
					4900,
					4901,
					4902,
					4903,
					4904,
					4905,
					4906,
					3063,
					4907,
					4908,
					4909,
					4910
				]
			},
			{
				"speed": 25,
				"name": "Rollingsford Drive",
				"nodes": [
					4911,
					4824,
					4912,
					4913,
					4914,
					4915,
					4916,
					4917,
					4918,
					4919,
					939
				]
			},
			{
				"speed": 25,
				"name": "Calverton Road",
				"nodes": [
					2804,
					4920,
					4921,
					4922,
					4923,
					4924,
					4925,
					4926
				]
			},
			{
				"speed": 25,
				"name": "Brumley Drive",
				"nodes": [
					4927,
					4928,
					4929,
					4930,
					4931,
					4932,
					4933,
					4934,
					4935,
					4936,
					4937,
					4938
				]
			},
			{
				"speed": 25,
				"name": "Vierling Drive",
				"nodes": [
					2805,
					4939
				]
			},
			{
				"speed": 25,
				"name": "Rue de Renard",
				"nodes": [
					4940,
					4941,
					4942,
					4943,
					4944,
					4945,
					4946,
					4947,
					4948,
					4949,
					4950,
					4951,
					4952,
					4953,
					4954,
					4955,
					4940
				]
			},
			{
				"speed": 25,
				"name": "Sulky Drive",
				"nodes": [
					2854,
					4956,
					4957,
					4958
				]
			},
			{
				"speed": 25,
				"name": "Willowbrook Drive",
				"nodes": [
					4959,
					4960,
					4961,
					4962,
					4963,
					4964,
					4965,
					4966,
					4967
				]
			},
			{
				"speed": 25,
				"name": "Radcliffe Drive",
				"nodes": [
					4968,
					4969,
					4970,
					4971,
					347,
					4376
				]
			},
			{
				"speed": 25,
				"name": "Hazelwest Drive",
				"nodes": [
					4972,
					4973,
					4974,
					4975,
					4976,
					4977,
					4978,
					4979,
					4980,
					4981,
					4982,
					4983,
					4984,
					4985,
					4986,
					4987
				]
			},
			{
				"speed": 25,
				"name": "Brendan Wood Drive",
				"nodes": [
					4988,
					4989,
					4990,
					4991,
					4992,
					4993
				]
			},
			{
				"speed": 25,
				"name": "Abington Road",
				"nodes": [
					4994,
					4995,
					4996,
					4997,
					4998,
					4999,
					5000,
					5001,
					5002,
					5003,
					3258,
					5004,
					5005,
					448
				]
			},
			{
				"speed": 25,
				"name": "Stymie Lane",
				"nodes": [
					5006,
					5007
				]
			},
			{
				"speed": 25,
				"name": "Trailforest Lane",
				"nodes": [
					5008,
					5009,
					5010
				]
			},
			{
				"speed": 25,
				"name": "Claver Lane",
				"nodes": [
					2265,
					4195,
					5011
				]
			},
			{
				"speed": 25,
				"name": "Sandalwood Drive",
				"nodes": [
					1457,
					5012,
					5013,
					5014,
					5015,
					5016,
					5017,
					5018,
					5019
				]
			},
			{
				"speed": 25,
				"name": "St Diana Lane",
				"nodes": [
					5020,
					5021,
					5022
				]
			},
			{
				"speed": 25,
				"name": "Sansonmet Drive",
				"nodes": [
					5023,
					5024,
					5025,
					5026
				]
			},
			{
				"speed": 25,
				"name": "Mockingbird Lane",
				"nodes": [
					5027,
					5028,
					5029,
					5030,
					5031,
					5032,
					5033,
					5034,
					5035,
					5036
				]
			},
			{
				"speed": 25,
				"name": "Brunswick Drive",
				"nodes": [
					5037,
					5038,
					5039,
					5040,
					5041,
					5042,
					5043,
					5044,
					5045,
					5046,
					5047
				]
			},
			{
				"speed": 25,
				"name": "Becker Drive",
				"nodes": [
					4535,
					5048,
					5049,
					5050,
					5051
				]
			},
			{
				"speed": 30,
				"name": "Riverwood Estates Boulevard",
				"nodes": [
					3456,
					5052,
					5053,
					5054,
					5055
				]
			},
			{
				"speed": 25,
				"name": "Holiday Hill Drive",
				"nodes": [
					5056,
					5057,
					5058,
					5059,
					5060,
					5061,
					5062,
					5063,
					5064,
					5065,
					5066,
					5067,
					5068
				]
			},
			{
				"speed": 25,
				"name": "Kendelwood Court",
				"nodes": [
					5069,
					5070,
					5071
				]
			},
			{
				"speed": 25,
				"name": "Florence Hill Court",
				"nodes": [
					5072,
					5073,
					5074
				]
			},
			{
				"speed": 35,
				"name": "Washington Street",
				"nodes": [
					3847,
					5075
				]
			},
			{
				"speed": 25,
				"name": "Iris Drive",
				"nodes": [
					5076,
					5077
				]
			},
			{
				"speed": 25,
				"name": "Broadridge Court",
				"nodes": [
					5078,
					5079,
					5080
				]
			},
			{
				"speed": 25,
				"name": "Patterson Lane",
				"nodes": [
					3229,
					5081,
					5082,
					5083,
					5084
				]
			},
			{
				"speed": 25,
				"name": "Sagewood Lane",
				"nodes": [
					5085,
					5086,
					5087,
					5088
				]
			},
			{
				"speed": 25,
				"name": "South St Charles St",
				"nodes": [
					3844,
					5089,
					5090,
					5091,
					5092,
					5093,
					5094,
					5095,
					1566,
					5096,
					5097,
					5098
				]
			},
			{
				"speed": 25,
				"name": "Calle Vista Drive",
				"nodes": [
					3440,
					5099,
					5100,
					5101,
					5102,
					5103,
					5104,
					5105,
					5106,
					5107,
					5108,
					5109,
					5110,
					5111,
					5112,
					5113,
					5114,
					5115,
					5116,
					5117,
					5118
				]
			},
			{
				"speed": 25,
				"name": "Vago Lane",
				"nodes": [
					5119,
					5120,
					5121,
					5122,
					5123,
					5124,
					5125,
					5126,
					5127,
					5128,
					5129,
					5130,
					5131,
					5132,
					5133,
					5134,
					5119
				]
			},
			{
				"speed": 25,
				"name": "Brixworth Court",
				"nodes": [
					5135,
					5136,
					5137,
					5138,
					5139,
					5140,
					5141,
					5142,
					5143,
					5144,
					5145,
					5146,
					5147,
					5148,
					5149,
					5150,
					5135
				]
			},
			{
				"speed": 25,
				"name": "Mockingbird Lane",
				"nodes": [
					4133,
					5151,
					5152,
					5153,
					897
				]
			},
			{
				"speed": 25,
				"name": "Derhake Road",
				"nodes": [
					5154,
					5155,
					5156,
					5157,
					5158,
					5159,
					5160,
					5161,
					5162,
					5163,
					5164,
					5165,
					5166,
					5167,
					5168,
					5169,
					5170,
					5171,
					5172,
					5173,
					5174,
					5175,
					5176,
					5177
				]
			},
			{
				"speed": 25,
				"name": "Moule Drive",
				"nodes": [
					5178,
					5179,
					5180,
					5181,
					5182,
					5183,
					5184,
					5185,
					5186,
					5187,
					2474,
					5188,
					5189,
					5190,
					5191
				]
			},
			{
				"speed": 25,
				"name": "Don Donna Drive",
				"nodes": [
					5192,
					4840,
					5193,
					5194,
					5195,
					5196
				]
			},
			{
				"speed": 25,
				"name": "Thackery Court",
				"nodes": [
					5197,
					5198
				]
			},
			{
				"speed": 25,
				"name": "Drakeston Court",
				"nodes": [
					5199,
					5200,
					5201,
					4872
				]
			},
			{
				"speed": 25,
				"name": "Deer Valley Court",
				"nodes": [
					5202,
					5203,
					5204,
					5205,
					5206,
					5207,
					5208,
					5209,
					5210,
					5211,
					5212,
					5213,
					5214
				]
			},
			{
				"speed": 25,
				"name": "Knollwood Parkway Court",
				"nodes": [
					5215,
					5216,
					5217,
					5218,
					5219,
					5220
				]
			},
			{
				"speed": 25,
				"name": "Baville Court",
				"nodes": [
					5221,
					5222
				]
			},
			{
				"speed": 25,
				"name": "Varano Drive",
				"nodes": [
					4344,
					5223,
					5224,
					5225,
					5226
				]
			},
			{
				"speed": 25,
				"name": "Benedictine Court",
				"nodes": [
					5227,
					5228,
					5229,
					5230,
					5231,
					5232,
					5233,
					5234,
					5235,
					5236
				]
			},
			{
				"speed": 25,
				"name": "Kerry Court",
				"nodes": [
					5237,
					5238
				]
			},
			{
				"speed": 30,
				"name": "Derhake Road",
				"nodes": [
					5239,
					5240,
					2030,
					2259,
					5241,
					4859,
					5242,
					5243,
					5244,
					5245,
					5246,
					5247,
					5248,
					5249,
					5250,
					5251,
					5252,
					5253,
					5254,
					5255,
					5256,
					5257,
					5258,
					1332,
					5259,
					3732,
					1365,
					3611,
					5260
				]
			},
			{
				"speed": 25,
				"name": "Brookshire Drive",
				"nodes": [
					5261,
					5262,
					5263,
					5264,
					5265,
					5266
				]
			},
			{
				"speed": 25,
				"name": "Rockypoint Drive",
				"nodes": [
					4394,
					5267,
					5268,
					5269,
					5270,
					5271,
					5272,
					5273,
					5274,
					5275,
					5276,
					5277,
					5278,
					5279,
					5280,
					5281,
					5282,
					5283,
					5284
				]
			},
			{
				"speed": 25,
				"name": "Cape Charles Court",
				"nodes": [
					5285,
					5286,
					5287,
					5288
				]
			},
			{
				"speed": 25,
				"name": "Moran Drive",
				"nodes": [
					5289,
					5290,
					4539,
					2552,
					5291,
					2375,
					662,
					2737,
					5292,
					5293
				]
			},
			{
				"speed": 25,
				"name": "Terry Court",
				"nodes": [
					5294,
					5295
				]
			},
			{
				"speed": 25,
				"name": "Winners Circle",
				"nodes": [
					2522,
					5296
				]
			},
			{
				"speed": 25,
				"name": "Paul Drive",
				"nodes": [
					5297,
					5298,
					5299,
					5300,
					5301,
					5302,
					5303,
					5304,
					5305,
					5306
				]
			},
			{
				"speed": 25,
				"name": "Wintergreen Drive",
				"nodes": [
					5307,
					5308,
					5309,
					5310,
					5311,
					4660,
					5312,
					5313,
					5314,
					5315,
					5316,
					5317,
					674,
					5318,
					5319,
					5320,
					5321,
					5322,
					5323,
					5324,
					5325
				]
			},
			{
				"speed": 25,
				"name": "Mission Walk Court",
				"nodes": [
					5326,
					5327,
					5328,
					5329,
					5330,
					5331,
					5332,
					5333,
					5334,
					5335,
					5336,
					5337,
					5338,
					5339,
					5340,
					5341,
					5326
				]
			},
			{
				"speed": 25,
				"name": "Connolly Drive",
				"nodes": [
					2796,
					5342,
					5343,
					5344,
					5345
				]
			},
			{
				"speed": 25,
				"name": "Grand National Drive",
				"nodes": [
					5346,
					5347,
					5348,
					5349,
					2220,
					5350
				]
			},
			{
				"speed": 25,
				"name": "Celburne Lane",
				"nodes": [
					4935,
					5351,
					5352,
					5353,
					5354,
					5355,
					5356,
					5357,
					5358,
					5359,
					5360,
					5361
				]
			},
			{
				"speed": 25,
				"name": "Brookshire Drive",
				"nodes": [
					5362,
					5363,
					5364,
					5365,
					5366,
					5367,
					5368,
					5369,
					5370,
					5371,
					5372,
					5373,
					5374,
					5375,
					5376,
					4761
				]
			},
			{
				"speed": 25,
				"name": "Yvette Court",
				"nodes": [
					5377,
					5378
				]
			},
			{
				"speed": 25,
				"name": "Renwick Lane",
				"nodes": [
					5379,
					5380
				]
			},
			{
				"speed": 25,
				"name": "Renee Drive",
				"nodes": [
					5381,
					5382,
					5383,
					2401
				]
			},
			{
				"speed": 25,
				"name": "Sherwood Court",
				"nodes": [
					5384,
					5385,
					5386,
					5387
				]
			},
			{
				"speed": 25,
				"name": "Ventnor Place",
				"nodes": [
					5388,
					5389,
					5390,
					5391,
					5392,
					5393,
					5394,
					5395,
					5396,
					5397,
					5398,
					5399,
					5400,
					5401,
					5402,
					5403,
					5404,
					5405,
					5406,
					5407,
					5408
				]
			},
			{
				"speed": 25,
				"name": "Steve Avenue",
				"nodes": [
					5409,
					5410,
					5411,
					5412,
					5413,
					5414,
					5415
				]
			},
			{
				"speed": 25,
				"name": "Marechal Lane",
				"nodes": [
					5416,
					2852,
					5417,
					5418,
					5419,
					5420,
					5421,
					5422,
					5423,
					5424,
					5425,
					5426,
					3895,
					5427
				]
			},
			{
				"speed": 25,
				"name": "Verdun Estates Drive",
				"nodes": [
					5428,
					4226,
					5429,
					2762
				]
			},
			{
				"speed": 25,
				"name": "Davey Drive",
				"nodes": [
					5430,
					5431,
					5432,
					5433
				]
			},
			{
				"speed": 25,
				"name": "Beckett Fall Road",
				"nodes": [
					5434,
					5435,
					5436,
					5437,
					5438,
					5439,
					5440,
					5441,
					5442,
					5443
				]
			},
			{
				"speed": 25,
				"name": "Springhurst Drive",
				"nodes": [
					5444,
					5445,
					5446,
					5447,
					5448,
					5449,
					5450,
					5451,
					5452,
					5453,
					5454,
					5455,
					5456,
					5457,
					5458,
					5459,
					5460,
					5461,
					5462,
					5463,
					5464,
					5465,
					5466
				]
			},
			{
				"speed": 25,
				"name": "Countryside Drive",
				"nodes": [
					5467,
					5468,
					5469,
					5056,
					5470,
					5471,
					5472,
					5473,
					5474,
					5067
				]
			},
			{
				"speed": 25,
				"name": "Frais Drive",
				"nodes": [
					5475,
					5476,
					5477,
					5478,
					5479,
					5480,
					5481,
					5482,
					5483,
					5484
				]
			},
			{
				"speed": 25,
				"name": "Mark Twain Drive",
				"nodes": [
					2674,
					5485,
					5486,
					5487,
					5488,
					5489,
					2680,
					5490,
					5491,
					5492,
					4862
				]
			},
			{
				"speed": 35,
				"name": "Patterson Road",
				"nodes": [
					5493,
					5494,
					5495,
					5496,
					5497,
					1183,
					5498,
					5499,
					5500,
					5501,
					5502,
					5503,
					5504,
					4375,
					345,
					5505,
					5506,
					2353,
					5507,
					5508,
					5509,
					5510,
					5191,
					5511,
					5512,
					5513,
					5084,
					5514,
					5515,
					3240,
					5516,
					5517,
					5518,
					5519,
					5520,
					609,
					5521,
					5522,
					5523,
					5524,
					5525,
					5526,
					5527,
					3930,
					5528,
					5529,
					5530
				]
			},
			{
				"speed": 25,
				"name": "Lemondale Lane",
				"nodes": [
					5531,
					5532,
					5533,
					5534,
					5535,
					5536,
					5537,
					5538,
					5525
				]
			},
			{
				"speed": 25,
				"name": "Meadow Court",
				"nodes": [
					5539,
					5540,
					5541,
					5542,
					5543,
					5544,
					5545,
					5546,
					5547,
					5548,
					5549,
					5550,
					5551,
					5552,
					5553,
					5554,
					5539
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					5555,
					5556,
					5557,
					5558
				]
			},
			{
				"speed": 25,
				"name": "Arlington Drive",
				"nodes": [
					5559,
					5560,
					5561,
					5562,
					5563,
					1912,
					5564,
					5565
				]
			},
			{
				"speed": 25,
				"name": "Saint Martha Court",
				"nodes": [
					5566,
					5567,
					5568
				]
			},
			{
				"speed": 25,
				"name": "Lanawood Court",
				"nodes": [
					5569,
					5570,
					5571,
					5572,
					5573,
					5574,
					5575,
					5576,
					5577,
					5578,
					5579,
					5580,
					5581,
					5582,
					5583,
					5584,
					5569
				]
			},
			{
				"speed": 25,
				"name": "Royal Coach Lane",
				"nodes": [
					5585,
					5586,
					5587,
					5588,
					5589
				]
			},
			{
				"speed": 25,
				"name": "Janet Lane",
				"nodes": [
					3034,
					5590,
					5591,
					5592,
					5593,
					5594,
					5595
				]
			},
			{
				"speed": 25,
				"name": "Aspen Drive",
				"nodes": [
					5596,
					5597,
					5598,
					2103,
					5599,
					4329
				]
			},
			{
				"speed": 25,
				"name": "Vorhof Drive",
				"nodes": [
					5600,
					5601,
					5602,
					5603,
					5604,
					5605,
					5606,
					5607,
					5608,
					5609,
					5610,
					5611
				]
			},
			{
				"speed": 25,
				"name": "Elmgrove Avenue",
				"nodes": [
					5612,
					5613,
					5614,
					2658,
					5615,
					5616,
					5617,
					5618,
					1056
				]
			},
			{
				"speed": 25,
				"name": "Chateau Drive",
				"nodes": [
					5619,
					5620
				]
			},
			{
				"speed": 25,
				"name": "Foxtrail Drive",
				"nodes": [
					5621,
					5622,
					5623,
					5624,
					5625
				]
			},
			{
				"speed": 25,
				"name": "Harkee Drive",
				"nodes": [
					5626,
					5627,
					5628,
					5629,
					5630,
					5631,
					5632,
					5633,
					5634,
					5635,
					5636,
					5637,
					5638,
					5639,
					5640,
					5641,
					5642,
					5643,
					5644,
					5645,
					5646,
					5647
				]
			},
			{
				"speed": 25,
				"name": "Encino Drive",
				"nodes": [
					3441,
					5648,
					5649,
					5650,
					5651,
					5652,
					5653,
					5654,
					3922
				]
			},
			{
				"speed": 25,
				"name": "Grandview Plaza Shop Ctr",
				"nodes": [
					5655,
					5656
				]
			},
			{
				"speed": 25,
				"name": "Coldbrook Court",
				"nodes": [
					5657,
					5658,
					5659,
					5660,
					5661,
					5662,
					5663,
					5664,
					5665,
					5666,
					5667,
					5668,
					5669,
					5670,
					5671,
					5672,
					5673,
					5674
				]
			},
			{
				"speed": 25,
				"name": "Saint Florence Drive",
				"nodes": [
					5675,
					5676,
					5677,
					5678,
					5679,
					5680,
					5681,
					5682,
					5683,
					5684
				]
			},
			{
				"speed": 25,
				"name": "Manning Avenue",
				"nodes": [
					4538,
					5685,
					5686,
					5291
				]
			},
			{
				"speed": 25,
				"name": "Langford Drive",
				"nodes": [
					5687,
					5688,
					5689,
					5690,
					5691,
					5692,
					5693,
					5694
				]
			},
			{
				"speed": 25,
				"name": "Langford Drive",
				"nodes": [
					1308,
					5695,
					5696,
					5697,
					5698,
					5699,
					5700,
					5701
				]
			},
			{
				"speed": 25,
				"name": "Cherry Blossom Lane",
				"nodes": [
					1416,
					5702,
					5703,
					5704,
					5705,
					1400,
					5706
				]
			},
			{
				"speed": 40,
				"name": "West Florissant Avenue",
				"nodes": [
					5707,
					20,
					5708
				]
			},
			{
				"speed": 25,
				"name": "Bugle Hill Drive",
				"nodes": [
					3783,
					5709,
					5710,
					5711,
					5712,
					5713,
					5714,
					5715,
					5716,
					5717,
					5718,
					5719,
					5720,
					5721,
					5722,
					5723,
					5724
				]
			},
			{
				"speed": 25,
				"name": "Hollywood Lane",
				"nodes": [
					5725,
					5726,
					5727,
					5728,
					968
				]
			},
			{
				"speed": 25,
				"name": "Cranberry Court",
				"nodes": [
					5729,
					5730,
					3993,
					5731,
					3612,
					5732
				]
			},
			{
				"speed": 25,
				"name": "Carriage Lane",
				"nodes": [
					5733,
					5734,
					5735,
					5736,
					5737,
					5738,
					5739,
					5740,
					5741
				]
			},
			{
				"speed": 25,
				"name": "Dana Drive",
				"nodes": [
					5742,
					5743,
					5744,
					5745,
					5746,
					5747
				]
			},
			{
				"speed": 25,
				"name": "Dana Drive",
				"nodes": [
					5748,
					5749,
					5750,
					5751,
					5742
				]
			},
			{
				"speed": 25,
				"name": "Willow Creek Est Dr Court",
				"nodes": [
					5752,
					5753
				]
			},
			{
				"speed": 25,
				"name": "Thunderbird Avenue",
				"nodes": [
					2514,
					5754,
					5755,
					5756,
					5757,
					5758,
					5759
				]
			},
			{
				"speed": 25,
				"name": "Tall Tree Lane",
				"nodes": [
					5760,
					5761,
					5762,
					5763,
					5764,
					5765,
					5766
				]
			},
			{
				"speed": 25,
				"name": "Hummingbird Drive",
				"nodes": [
					5767,
					5768,
					5769,
					5770,
					5771,
					5772,
					5773
				]
			},
			{
				"speed": 25,
				"name": "Lisa Drive",
				"nodes": [
					1240,
					5774,
					5775,
					3599
				]
			},
			{
				"speed": 25,
				"name": "Saint Cornelius Court",
				"nodes": [
					5776,
					5777
				]
			},
			{
				"speed": 25,
				"name": "Hiddenbrook Drive",
				"nodes": [
					5778,
					5779,
					5780,
					5781,
					5782,
					5783,
					5784,
					5785,
					5786,
					5787,
					5788,
					5789,
					5790,
					5791,
					5792,
					5793,
					5778
				]
			},
			{
				"speed": 25,
				"name": "Aspen Drive",
				"nodes": [
					5794,
					5795,
					5796,
					5797,
					5798,
					5799,
					5800,
					5801,
					5802,
					5803,
					5804,
					5805
				]
			},
			{
				"speed": 25,
				"name": "Carrollton Lane",
				"nodes": [
					5806,
					5807
				]
			},
			{
				"speed": 25,
				"name": "Woodridge Lane",
				"nodes": [
					5808,
					5809,
					5810,
					5811,
					5812,
					5813,
					5814,
					5815,
					5816,
					5817
				]
			},
			{
				"speed": 25,
				"name": "Millvalley Drive",
				"nodes": [
					5818,
					5819,
					5820,
					5821,
					5822,
					5823,
					5824,
					5825,
					5826,
					5827,
					5828,
					5829,
					5830,
					5831,
					5832,
					5833,
					5818
				]
			},
			{
				"speed": 25,
				"name": "Northmoor Drive",
				"nodes": [
					1784,
					2258,
					5834
				]
			},
			{
				"speed": 25,
				"name": "Wheat Bridge Drive",
				"nodes": [
					2570,
					5835,
					5836,
					5837,
					5838
				]
			},
			{
				"speed": 25,
				"name": "Black Pine Court",
				"nodes": [
					5839,
					5840,
					5841,
					5842,
					5843,
					5844,
					5845,
					5846,
					5847,
					5848,
					5849,
					5850,
					5851,
					5852,
					5853,
					5854,
					5839
				]
			},
			{
				"speed": 25,
				"name": "Celerity Drive",
				"nodes": [
					5855,
					5856,
					5857,
					5858,
					5859,
					5860,
					5861,
					5862,
					5863,
					5864,
					5865
				]
			},
			{
				"speed": 25,
				"name": "Orange Blossom Court",
				"nodes": [
					5866,
					5867,
					5868
				]
			},
			{
				"speed": 25,
				"name": "Orvieto Court",
				"nodes": [
					5869,
					5870,
					5871,
					5872,
					5873,
					5874,
					5875,
					5876,
					5877
				]
			},
			{
				"speed": 25,
				"name": "Woodridge Lane",
				"nodes": [
					5878,
					5879,
					5880,
					5881,
					5882,
					5883,
					5884,
					5885,
					5886,
					5887,
					5888,
					5889,
					5890,
					5891,
					5892,
					5893,
					5894,
					5895,
					5896,
					5897,
					5808
				]
			},
			{
				"speed": 25,
				"name": "Estes Court",
				"nodes": [
					5898,
					5899
				]
			},
			{
				"speed": 25,
				"name": "Kingshead Drive",
				"nodes": [
					5900,
					5901,
					5902
				]
			},
			{
				"speed": 25,
				"name": "Cordoba Drive",
				"nodes": [
					2961,
					5903,
					5904,
					5905,
					4569,
					5906,
					5907,
					5908,
					5909,
					5910
				]
			},
			{
				"speed": 25,
				"name": "Rocket Drive",
				"nodes": [
					5911
				]
			},
			{
				"speed": 25,
				"name": "Target Drive",
				"nodes": [
					5912,
					5913,
					5914,
					5915,
					5916
				]
			},
			{
				"speed": 25,
				"name": "Santa Cruz Drive",
				"nodes": [
					148,
					5917,
					5918,
					5919,
					5920,
					5921,
					5922,
					5923,
					5924,
					5925,
					5926
				]
			},
			{
				"speed": 25,
				"name": "Maple Drive",
				"nodes": [
					5927,
					961,
					3347,
					5928,
					5929,
					5930,
					3769,
					5931,
					5932,
					5933,
					5934
				]
			},
			{
				"speed": 25,
				"name": "North Castello Street",
				"nodes": [
					5935,
					2147,
					5936,
					5937,
					5938,
					5939,
					5940,
					5941,
					1116,
					5942,
					5943,
					5944
				]
			},
			{
				"speed": 25,
				"name": "Blanchette Drive",
				"nodes": [
					4744,
					5945,
					5946,
					5947
				]
			},
			{
				"speed": 30,
				"name": "Saint Anthony Lane",
				"nodes": [
					5948,
					5949,
					5950,
					5951,
					5952,
					5953,
					5954,
					5955,
					5956,
					5957,
					5958,
					1781,
					5959,
					5960,
					5961,
					2036,
					2044,
					5469,
					1725,
					5962,
					5963,
					5964,
					5965,
					5966,
					5967,
					5968,
					5969,
					3753,
					5970,
					5971,
					5972,
					5973,
					5974,
					5975,
					1332
				]
			},
			{
				"speed": 25,
				"name": "Parc Chateau Lane",
				"nodes": [
					5976,
					5977,
					5978,
					5979,
					5980,
					5981,
					5982,
					5983,
					5984,
					5985,
					5986
				]
			},
			{
				"speed": 25,
				"name": "93rd Avenue",
				"nodes": [
					5987,
					5988,
					5989,
					5990,
					5991,
					5992,
					5993,
					5994,
					5995,
					5996,
					5997,
					5998,
					5999,
					6000
				]
			},
			{
				"speed": 35,
				"name": "Old Halls Ferry Road",
				"nodes": [
					1,
					6001
				]
			},
			{
				"speed": 25,
				"name": "Hudson Road",
				"nodes": [
					6002,
					6003,
					6004,
					6005,
					6006,
					6007,
					6008,
					5602
				]
			},
			{
				"speed": 25,
				"name": "Chance Drive",
				"nodes": [
					4378,
					6009,
					6010,
					6011,
					6012,
					6013,
					6014,
					6015,
					6016,
					6017,
					6018
				]
			},
			{
				"speed": 25,
				"name": "Understanding Drive",
				"nodes": [
					6019,
					6020
				]
			},
			{
				"speed": 25,
				"name": "Huckleberry Drive",
				"nodes": [
					856,
					6021
				]
			},
			{
				"speed": 25,
				"name": "Orley Drive",
				"nodes": [
					6022,
					6023,
					6024,
					6025,
					6026,
					6027,
					6028,
					6029,
					6030,
					6031,
					3002
				]
			},
			{
				"speed": 25,
				"name": "Hounds Hill Drive",
				"nodes": [
					6032,
					6033,
					6034,
					6035,
					6036,
					6037,
					6038,
					6039,
					6040,
					6041,
					6042,
					6043,
					6044,
					6045,
					6046,
					6047,
					6048,
					6049,
					6050
				]
			},
			{
				"speed": 25,
				"name": "Huntington Drive",
				"nodes": [
					4268,
					6051,
					6052,
					6053,
					6054,
					6055,
					6056,
					6057,
					6058,
					6059,
					6060,
					6061,
					6062,
					6063,
					6064,
					6065,
					6066,
					6067,
					6068,
					4421
				]
			},
			{
				"speed": 25,
				"name": "Elwyn Drive",
				"nodes": [
					1617,
					6069
				]
			},
			{
				"speed": 35,
				"name": "Old Halls Ferry Road",
				"nodes": [
					6070,
					6071,
					6072,
					6073,
					6074,
					6075,
					6076,
					6077,
					6078,
					6079,
					6080,
					6081,
					6082,
					6083,
					6084
				]
			},
			{
				"speed": 25,
				"name": "Les Cherbourg Lane",
				"nodes": [
					6085,
					6086,
					6087,
					6088,
					6089,
					6090,
					6091,
					6092,
					6093,
					6094,
					6095,
					6096,
					6097,
					6098,
					6099,
					6100,
					6101,
					6102,
					6103,
					6104,
					6105,
					6106,
					6107,
					6108,
					6109,
					6110,
					2075,
					6111,
					6112,
					6113,
					6114,
					6115,
					4234,
					6116,
					6117,
					6118,
					6119,
					6120,
					6121,
					6122
				]
			},
			{
				"speed": 25,
				"name": "Brown Lane",
				"nodes": [
					6123,
					6124,
					6125,
					6126,
					6127,
					6128,
					6129,
					6130
				]
			},
			{
				"speed": 25,
				"name": "Trotwood Drive",
				"nodes": [
					4533,
					6131
				]
			},
			{
				"speed": 25,
				"name": "Waterlily Court",
				"nodes": [
					6132,
					6133
				]
			},
			{
				"speed": 25,
				"name": "Lilac Drive",
				"nodes": [
					5518,
					6134,
					6135,
					6136,
					6137,
					6138,
					6139,
					6140,
					333,
					6141,
					6142
				]
			},
			{
				"speed": 25,
				"name": "Gravelle Lane",
				"nodes": [
					6143,
					6144,
					6145,
					6146,
					6147,
					6148,
					6149,
					6150,
					6151,
					6152,
					6153,
					6154,
					6155,
					6156,
					6157,
					6158,
					6143
				]
			},
			{
				"speed": 25,
				"name": "Seminary Court",
				"nodes": [
					6159,
					6160,
					6161,
					6162,
					6163,
					6164,
					6165,
					6166,
					6167,
					6168,
					6169,
					6170,
					6171,
					6172,
					6173,
					6174,
					6159
				]
			},
			{
				"speed": 25,
				"name": "Chalfont Road",
				"nodes": [
					4917,
					6175,
					6176,
					6177,
					6178,
					6179,
					6180
				]
			},
			{
				"speed": 25,
				"name": "Oriole Drive",
				"nodes": [
					6181,
					6182,
					6183
				]
			},
			{
				"speed": 25,
				"name": "Meadowlark Drive",
				"nodes": [
					6184,
					6185,
					6186,
					6187,
					6188,
					6189
				]
			},
			{
				"speed": 25,
				"name": "Beaujolais Drive",
				"nodes": [
					6190,
					6191,
					6192,
					6193,
					6194,
					6195,
					6196,
					6197,
					6198,
					6199,
					6200,
					6201,
					6202,
					6203,
					6204,
					6205,
					6190
				]
			},
			{
				"speed": 25,
				"name": "Fernwood Trail Court",
				"nodes": [
					6206,
					6207,
					6208,
					6209,
					6210,
					6211,
					6212
				]
			},
			{
				"speed": 25,
				"name": "Farnham Lane",
				"nodes": [
					6213,
					6214,
					6215,
					6216,
					6217,
					6218,
					6219,
					6220,
					6221,
					6222
				]
			},
			{
				"speed": 25,
				"name": "Halsey Drive",
				"nodes": [
					4805,
					6223,
					6224,
					6225,
					6226
				]
			},
			{
				"speed": 25,
				"name": "Belcroft Drive",
				"nodes": [
					6227,
					6228,
					6229,
					6230,
					6231,
					6232
				]
			},
			{
				"speed": 25,
				"name": "Old York Drive",
				"nodes": [
					2791,
					6233,
					6234
				]
			},
			{
				"speed": 25,
				"name": "Mescalero Court",
				"nodes": [
					6235,
					6236,
					6237,
					6238
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					6239,
					6240,
					6241,
					6242,
					6243,
					6244,
					6245
				]
			},
			{
				"speed": 25,
				"name": "Mescalero Court",
				"nodes": [
					6238,
					6246,
					6247,
					6248,
					6249,
					6250,
					6251,
					6252,
					6253,
					6254,
					6250
				]
			},
			{
				"speed": 25,
				"name": "Florisota Drive",
				"nodes": [
					6255,
					6256,
					6257,
					6258,
					601,
					6259,
					6260,
					6261,
					6262
				]
			},
			{
				"speed": 25,
				"name": "Invicta Drive",
				"nodes": [
					6263,
					6264
				]
			},
			{
				"speed": 25,
				"name": "Hadden Drive",
				"nodes": [
					3991,
					6265,
					6266,
					3855
				]
			},
			{
				"speed": 25,
				"name": "Liberty Gardens Court",
				"nodes": [
					6267,
					6268
				]
			},
			{
				"speed": 25,
				"name": "Ocean View Court",
				"nodes": [
					6269,
					6270,
					6271,
					6272,
					6273,
					6274,
					6275,
					6276,
					6277,
					6278,
					6279,
					6280,
					6281,
					6282,
					6283,
					6284,
					6269
				]
			},
			{
				"speed": 25,
				"name": "Ville Camelia Court",
				"nodes": [
					6285,
					6286,
					6287,
					6288
				]
			},
			{
				"speed": 25,
				"name": "Ainsworth Drive",
				"nodes": [
					1316,
					6289,
					4547,
					3118,
					5701,
					5604
				]
			},
			{
				"speed": 25,
				"name": "Alliance Drive",
				"nodes": [
					6290
				]
			},
			{
				"speed": 25,
				"name": "Alliance Drive",
				"nodes": [
					6291,
					3888,
					6292,
					6293,
					6294
				]
			},
			{
				"speed": 25,
				"name": "River Oaks Court",
				"nodes": [
					6295,
					6296,
					6297,
					6298,
					6299,
					6300,
					6301,
					6302,
					6303,
					6304,
					6305,
					6306,
					6307,
					6308,
					6309,
					6310,
					6311,
					6312,
					6313,
					6314,
					6315,
					6316,
					6317
				]
			},
			{
				"speed": 25,
				"name": "Saddleridge Drive",
				"nodes": [
					6318,
					6319,
					6320,
					6321,
					6322,
					6323,
					6324,
					6325,
					6326,
					6327,
					6328,
					6329,
					6330,
					6331,
					6332,
					6333,
					6334,
					6335,
					744
				]
			},
			{
				"speed": 25,
				"name": "Briarcrest Drive",
				"nodes": [
					6336,
					6337,
					6338,
					6339,
					6340,
					6341,
					6342,
					6343,
					6344,
					6345,
					3743
				]
			},
			{
				"speed": 25,
				"name": "Village Square Drive",
				"nodes": [
					6346,
					6347,
					6348,
					6349,
					6350,
					6351,
					6352,
					6353,
					6354,
					6355,
					6356,
					6357,
					6358,
					6359,
					6360,
					6361
				]
			},
			{
				"speed": 25,
				"name": "Kinderling Lane",
				"nodes": [
					6362,
					5193
				]
			},
			{
				"speed": 25,
				"name": "Ville Camelia Court",
				"nodes": [
					6288,
					6363,
					6364,
					6365,
					6366,
					6367
				]
			},
			{
				"speed": 25,
				"name": "Redwing Drive",
				"nodes": [
					650,
					6368
				]
			},
			{
				"speed": 25,
				"name": "Hazeloak Drive",
				"nodes": [
					6369,
					6370
				]
			},
			{
				"speed": 25,
				"name": "Cross Keys Drive",
				"nodes": [
					6371,
					6372,
					6373,
					6374,
					6375,
					6376,
					6377,
					6378,
					6379,
					6380,
					6381
				]
			},
			{
				"speed": 25,
				"name": "Meadowgrass Drive",
				"nodes": [
					6382,
					6383,
					6384,
					6385,
					6386,
					6387,
					6388,
					6389,
					6390,
					6391,
					6392,
					2856,
					6393,
					6394,
					6395,
					6396,
					6397,
					6398,
					6399
				]
			},
			{
				"speed": 25,
				"name": "Appleblossom Court",
				"nodes": [
					6400,
					6401,
					6402,
					6403,
					6404,
					3238
				]
			},
			{
				"speed": 25,
				"name": "5th Plaza",
				"nodes": [
					6405,
					6406,
					3560,
					6407,
					6408,
					6409,
					6410
				]
			},
			{
				"speed": 25,
				"name": "Fremont Court",
				"nodes": [
					6411,
					6412
				]
			},
			{
				"speed": 25,
				"name": "Brown Road",
				"nodes": [
					6413,
					6414,
					6415,
					6416,
					6417,
					6418,
					6419,
					6420,
					2986
				]
			},
			{
				"speed": 25,
				"name": "Eadstone Lane",
				"nodes": [
					6421,
					6422,
					6423,
					6424,
					6425,
					6426
				]
			},
			{
				"speed": 25,
				"name": "Central Parkway",
				"nodes": [
					5511,
					6427,
					6428,
					3559,
					6429,
					6430,
					6431,
					6432,
					6433,
					6434,
					6435,
					6436,
					6437,
					6438,
					6439,
					1072,
					6440,
					6441,
					6442,
					6443,
					6444,
					6445,
					6446,
					6447,
					6448,
					6449,
					6450,
					6451,
					6452,
					6453,
					6454,
					4530,
					6455,
					6456,
					6457,
					6458,
					6459,
					6460,
					6461,
					6462,
					6463,
					6464,
					6465,
					6466
				]
			},
			{
				"speed": 25,
				"name": "Boellner Drive",
				"nodes": [
					1822,
					6467,
					6468,
					6469,
					6470,
					6471,
					6472,
					6473,
					6474,
					6475,
					6476,
					6477,
					6478,
					4531
				]
			},
			{
				"speed": 25,
				"name": "Helmkampf Drive",
				"nodes": [
					5259,
					1501,
					6479,
					6480,
					6481,
					4705,
					1509,
					6482,
					6483,
					6484,
					6485,
					6486
				]
			},
			{
				"speed": 25,
				"name": "Oriental Drive",
				"nodes": [
					6009,
					6487,
					6488,
					6489,
					6490,
					6491,
					6018
				]
			},
			{
				"speed": 25,
				"name": "Wycomb Drive",
				"nodes": [
					5244,
					6492
				]
			},
			{
				"speed": 25,
				"name": "Tamma Lane",
				"nodes": [
					6493,
					6494,
					6495,
					6496,
					6497
				]
			},
			{
				"speed": 25,
				"name": "Westcott Drive",
				"nodes": [
					6498,
					6499
				]
			},
			{
				"speed": 25,
				"name": "Ronda Drive",
				"nodes": [
					6500,
					6501,
					6502,
					6503,
					6504,
					6505,
					6506,
					4700
				]
			},
			{
				"speed": 25,
				"name": "Calverton Park Lane",
				"nodes": [
					6507,
					6508,
					6509,
					6510,
					6511
				]
			},
			{
				"speed": 25,
				"name": "Seville Drive",
				"nodes": [
					6512,
					6513,
					6514,
					5986,
					5910,
					6515,
					6516,
					6517,
					6518,
					6519,
					2971
				]
			},
			{
				"speed": 25,
				"name": "St Baptista Lane",
				"nodes": [
					6520,
					6521
				]
			},
			{
				"speed": 25,
				"name": "Yaqui Drive",
				"nodes": [
					430,
					6522,
					6523,
					6524,
					6525,
					6526,
					6527,
					4587
				]
			},
			{
				"speed": 25,
				"name": "Christinia Marie Court",
				"nodes": [
					6528,
					6529,
					6530,
					6531,
					6532,
					6533,
					6534,
					6535
				]
			},
			{
				"speed": 25,
				"name": "Barnwood Drive",
				"nodes": [
					6536,
					6537,
					6538,
					6539,
					6540,
					6541,
					6542,
					6543,
					6544,
					6545,
					6546,
					6547
				]
			},
			{
				"speed": 30,
				"name": "Missouri Bottom Road",
				"nodes": [
					3728,
					6548,
					6549,
					6550,
					782,
					6551,
					6552,
					6553,
					6554,
					6555,
					6556,
					6557,
					6558,
					6559,
					6560,
					6561,
					6562,
					6563,
					6564,
					6565,
					6566,
					6567,
					6568,
					6569,
					6570,
					6571,
					6572,
					6573,
					6574,
					6575,
					6576,
					6577
				]
			},
			{
				"speed": 25,
				"name": "Tina Drive",
				"nodes": [
					5747,
					6578,
					6579,
					6580,
					6581,
					6582,
					2209
				]
			},
			{
				"speed": 25,
				"name": "Chardonway Court",
				"nodes": [
					6583,
					6584,
					6585,
					6586,
					6587,
					6588,
					6589,
					6590,
					6591,
					6592,
					6593,
					6594,
					6595
				]
			},
			{
				"speed": 25,
				"name": "Palm Drive",
				"nodes": [
					6596,
					6597,
					6598,
					2672
				]
			},
			{
				"speed": 25,
				"name": "Buddie Avenue",
				"nodes": [
					4537,
					6599,
					6600,
					5292
				]
			},
			{
				"speed": 25,
				"name": "Bellflower Drive",
				"nodes": [
					2344,
					6601,
					6602,
					6603,
					6604,
					4287,
					6605,
					6606,
					6607,
					6608,
					6609,
					6610,
					6611,
					6361
				]
			},
			{
				"speed": 25,
				"name": "Kay Drive",
				"nodes": [
					6612,
					6613,
					6614
				]
			},
			{
				"speed": 25,
				"name": "Stilton Court",
				"nodes": [
					6615,
					6616,
					6617,
					6618,
					6619,
					6620,
					6621,
					6622,
					6623,
					6624,
					6625,
					6626,
					6627,
					6628,
					6629,
					6630,
					6615
				]
			},
			{
				"speed": 25,
				"name": "Maidstone Court",
				"nodes": [
					6631,
					6632,
					6633,
					6634,
					6635,
					6636,
					6637,
					6638,
					6639,
					6640
				]
			},
			{
				"speed": 25,
				"name": "Palm Drive",
				"nodes": [
					6641,
					6642,
					6643,
					6644,
					6645,
					6646,
					6647,
					6648,
					6430,
					6649
				]
			},
			{
				"speed": 25,
				"name": "Alpha Drive",
				"nodes": [
					6650,
					6651,
					6652,
					2149,
					6653,
					6654
				]
			},
			{
				"speed": 25,
				"name": "Roan Circle",
				"nodes": [
					6655,
					6656
				]
			},
			{
				"speed": 25,
				"name": "Fox Plains Drive",
				"nodes": [
					6657,
					6658,
					6659,
					6660,
					6661,
					6662,
					6663,
					6664,
					6665,
					6666,
					6032
				]
			},
			{
				"speed": 25,
				"name": "Strawberry Fields Court",
				"nodes": [
					6667,
					6668,
					6669
				]
			},
			{
				"speed": 25,
				"name": "Madlar Lane",
				"nodes": [
					6670,
					6671,
					6672,
					6673,
					6674,
					6675,
					6676,
					6677,
					6678,
					6679,
					6680,
					6681,
					6682,
					6683,
					6684,
					6685,
					6686,
					6687
				]
			},
			{
				"speed": 25,
				"name": "Norshire Drive",
				"nodes": [
					6688,
					6689
				]
			},
			{
				"speed": 25,
				"name": "Dwyer Lane",
				"nodes": [
					6690,
					6691
				]
			},
			{
				"speed": 25,
				"name": "Colby Chase Road",
				"nodes": [
					6692,
					6693,
					5443,
					6694,
					6695,
					6696,
					6697,
					6698,
					6699,
					447
				]
			},
			{
				"speed": 25,
				"name": "Storkway Court",
				"nodes": [
					6700,
					6701,
					6702
				]
			},
			{
				"speed": 25,
				"name": "Foggy Bottom Drive",
				"nodes": [
					6703,
					6704,
					6705,
					6706,
					6707,
					6708,
					6709,
					6710,
					6711,
					6712,
					6713,
					6714,
					6715,
					6716,
					6717
				]
			},
			{
				"speed": 25,
				"name": "Littlefield Drive",
				"nodes": [
					2977,
					6718,
					6719,
					6720,
					6721,
					6722,
					6723,
					6724,
					6725,
					6726,
					6727,
					6728,
					6729,
					6730
				]
			},
			{
				"speed": 25,
				"name": "Christy Drive",
				"nodes": [
					1242,
					6731,
					6732
				]
			},
			{
				"speed": 25,
				"name": "Millstone Drive",
				"nodes": [
					2987,
					6733,
					3607,
					6734,
					6735,
					492
				]
			},
			{
				"speed": 25,
				"name": "La Grange Drive",
				"nodes": [
					6736,
					6737
				]
			},
			{
				"speed": 25,
				"name": "Brampton Drive",
				"nodes": [
					6738,
					6739,
					6740,
					6741,
					6742,
					6743,
					4799,
					6744,
					6745,
					6746,
					6747
				]
			},
			{
				"speed": 25,
				"name": "Atlantic Park Avenue",
				"nodes": [
					6748,
					6749,
					875,
					6750,
					6751,
					6752,
					6753,
					6754
				]
			},
			{
				"speed": 25,
				"name": "Saint Edith Lane",
				"nodes": [
					6755,
					6756,
					3129,
					1165,
					6757,
					6758
				]
			},
			{
				"speed": 25,
				"name": "Saint Loretto Drive",
				"nodes": [
					6759,
					6760,
					6761,
					6762,
					6763,
					6764
				]
			},
			{
				"speed": 25,
				"name": "Cedar Place",
				"nodes": [
					6765,
					6766,
					6767,
					6768,
					6769
				]
			},
			{
				"speed": 25,
				"name": "Grassland Drive",
				"nodes": [
					6770,
					6771,
					6772,
					6773,
					6485,
					6774,
					6775,
					1512
				]
			},
			{
				"speed": 25,
				"name": "Utz Lane",
				"nodes": [
					6776,
					6777,
					6778,
					6779,
					6780,
					6781,
					6782,
					6783,
					6784,
					6785,
					6786,
					6787,
					6788,
					6789,
					6790,
					1008
				]
			},
			{
				"speed": 25,
				"name": "Old Jamestown Winery Rd",
				"nodes": [
					6791,
					6792,
					6793,
					6794,
					6795,
					6796,
					6797,
					6798,
					6799,
					6800,
					6801,
					6802,
					6803,
					6804,
					6805,
					6806,
					6807,
					6808,
					6809,
					6810,
					6811,
					6812,
					6813,
					6814,
					6815,
					6816,
					6817,
					6818,
					6819,
					6820,
					6821,
					6822,
					6823,
					6824,
					6825,
					6826,
					6827,
					6828,
					6829,
					6830,
					6831,
					6832,
					6833
				]
			},
			{
				"speed": 25,
				"name": "La Venta Drive",
				"nodes": [
					6834,
					6835,
					6836,
					6837,
					6838,
					6839,
					6840,
					1728
				]
			},
			{
				"speed": 25,
				"name": "Utz Lane",
				"nodes": [
					6841,
					3299,
					4757,
					6842,
					6843,
					6844,
					6688,
					2246,
					6845,
					4797,
					6846,
					4788,
					1497,
					1753,
					6847,
					6848,
					6849
				]
			},
			{
				"speed": 25,
				"name": "Campus Court",
				"nodes": [
					2656,
					6850,
					6851,
					6852,
					6853,
					6854,
					6855
				]
			},
			{
				"speed": 25,
				"name": "Utz Lane",
				"nodes": [
					6856,
					6857,
					6858,
					6859,
					6860,
					6861,
					6862,
					6863
				]
			},
			{
				"speed": 25,
				"name": "Mystic Bend Lane",
				"nodes": [
					6864,
					6865,
					6866,
					6867,
					6868,
					6869,
					4993,
					6870,
					6871,
					6872,
					6873,
					6874
				]
			},
			{
				"speed": 25,
				"name": "Eagle Estate Lane",
				"nodes": [
					6875,
					6876,
					6877,
					6878,
					6879,
					1473
				]
			},
			{
				"speed": 25,
				"name": "Polson Lane",
				"nodes": [
					6880,
					6881,
					6882,
					6883,
					6884,
					6885
				]
			},
			{
				"speed": 25,
				"name": "Kersten Court",
				"nodes": [
					6886,
					6887,
					6888
				]
			},
			{
				"speed": 25,
				"name": "Manresa Lane",
				"nodes": [
					6889,
					6890,
					6891,
					6892,
					6893,
					986,
					6894,
					6895,
					5011,
					6896
				]
			},
			{
				"speed": 25,
				"name": "Gwin Drive",
				"nodes": [
					1616,
					6897
				]
			},
			{
				"speed": 25,
				"name": "Mildness Court",
				"nodes": [
					6898,
					6899
				]
			},
			{
				"speed": 25,
				"name": "Mc Grath Lane",
				"nodes": [
					3844,
					6900,
					6901,
					6902,
					6903,
					6904,
					6905
				]
			},
			{
				"speed": 25,
				"name": "Robert Drive",
				"nodes": [
					2352,
					6906
				]
			},
			{
				"speed": 25,
				"name": "Bluefield Court",
				"nodes": [
					6907,
					6908
				]
			},
			{
				"speed": 25,
				"name": "Wensley Road",
				"nodes": [
					5003,
					6909,
					6910,
					6911,
					6912
				]
			},
			{
				"speed": 25,
				"name": "Talleywood Drive",
				"nodes": [
					6913,
					6914,
					6915,
					6916,
					6917,
					6918,
					6919,
					6920,
					4607
				]
			},
			{
				"speed": 25,
				"name": "Crowley Drive",
				"nodes": [
					6921,
					6922,
					6923,
					6924,
					6925
				]
			},
			{
				"speed": 25,
				"name": "Rosebrook Drive",
				"nodes": [
					6926,
					6927,
					6928,
					6929,
					6930,
					6931,
					6932,
					6933,
					6934,
					6935,
					6936,
					6937,
					6938,
					6939,
					6940,
					6941,
					6926
				]
			},
			{
				"speed": 25,
				"name": "Rue Saint Jean",
				"nodes": [
					6942,
					2139,
					6943,
					6944,
					1608,
					6945,
					6946,
					6947
				]
			},
			{
				"speed": 25,
				"name": "La Havre Circle",
				"nodes": [
					6948,
					6949
				]
			},
			{
				"speed": 25,
				"name": "Joyful Court",
				"nodes": [
					6950,
					6951,
					6952,
					6953,
					6954,
					6955,
					6956,
					6957,
					6958
				]
			},
			{
				"speed": 25,
				"name": "Tobaggan Trail",
				"nodes": [
					1995,
					6959,
					6960,
					6961,
					4641,
					6962,
					6963,
					6964,
					6965,
					6966,
					6967,
					6968,
					6969,
					6970,
					3103
				]
			},
			{
				"speed": 25,
				"name": "Bridgeton Industrial Drive",
				"nodes": [
					6971,
					6972,
					6973,
					6974,
					6975,
					6976,
					6977,
					6978
				]
			},
			{
				"speed": 25,
				"name": "Remus Drive",
				"nodes": [
					422,
					6979,
					6980,
					6981,
					6982,
					6983,
					6984
				]
			},
			{
				"speed": 25,
				"name": "James River Drive",
				"nodes": [
					6985,
					5286
				]
			},
			{
				"speed": 25,
				"name": "Almonte Court",
				"nodes": [
					2967,
					6986
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					6987,
					6988
				]
			},
			{
				"speed": 25,
				"name": "Nara Drive",
				"nodes": [
					1238,
					6989,
					6990,
					6991,
					6992,
					6993,
					6994,
					6995,
					6732,
					6996,
					6997,
					5747
				]
			},
			{
				"speed": 25,
				"name": "Flumet Court",
				"nodes": [
					6998,
					6999,
					7000
				]
			},
			{
				"speed": 25,
				"name": "Vasquez Lane",
				"nodes": [
					7001
				]
			},
			{
				"speed": 25,
				"name": "Boulder Drive",
				"nodes": [
					7002,
					7003,
					7004,
					7005,
					7006
				]
			},
			{
				"speed": 25,
				"name": "Saint Matthew Drive",
				"nodes": [
					5158,
					7007,
					7008,
					7009,
					7010,
					7011,
					7012,
					7013,
					7014
				]
			},
			{
				"speed": 25,
				"name": "Armada Court",
				"nodes": [
					7015,
					7016,
					7017,
					7018,
					7019,
					7020,
					7021,
					7022,
					7023
				]
			},
			{
				"speed": 25,
				"name": "Cross Keys Place",
				"nodes": [
					7024,
					7025
				]
			},
			{
				"speed": 25,
				"name": "Helen Oak Drive",
				"nodes": [
					7026,
					7027,
					7028,
					7029
				]
			},
			{
				"speed": 25,
				"name": "Leisure Drive",
				"nodes": [
					7030,
					7031,
					7032,
					7033,
					7034,
					7035,
					7036,
					7037,
					7038,
					7039,
					7040,
					7041,
					7042,
					7043,
					7044,
					7045,
					7046,
					7047,
					7048,
					7049,
					7050,
					7051,
					7052,
					7053,
					7054,
					7055,
					7056,
					7057,
					7058,
					7059,
					7060,
					7061,
					7062,
					7063,
					7064,
					7065,
					7066,
					7067,
					7068,
					7069,
					7070,
					7071
				]
			},
			{
				"speed": 30,
				"name": "South Waterford Drive",
				"nodes": [
					5243,
					7072,
					2268,
					7073,
					7074,
					7075,
					7076,
					7077,
					7078,
					7079,
					4876,
					7080,
					7081,
					7082,
					7083,
					7084,
					7085,
					7086,
					7087
				]
			},
			{
				"speed": 25,
				"name": "Mallard Lane",
				"nodes": [
					7088,
					7089,
					7090,
					7091,
					7092,
					7093,
					7094,
					3801
				]
			},
			{
				"speed": 25,
				"name": "Paddock Ridge Court",
				"nodes": [
					7095,
					7096,
					7097,
					7098,
					7099,
					7100,
					7101,
					7102,
					7103,
					7104,
					7105,
					7106,
					7107,
					7108,
					7109,
					7110,
					7095
				]
			},
			{
				"speed": 25,
				"name": "Fenmore Drive",
				"nodes": [
					7111,
					7112,
					7113,
					7114,
					5492
				]
			},
			{
				"speed": 25,
				"name": "Foxfield Drive",
				"nodes": [
					7115,
					7116,
					7117,
					7118,
					7119,
					7120,
					7121,
					7122,
					7123
				]
			},
			{
				"speed": 25,
				"name": "Love Lane",
				"nodes": [
					7124,
					4817,
					7125,
					7126,
					3834,
					7127,
					6368,
					7128,
					6428
				]
			},
			{
				"speed": 25,
				"name": "Angelus Drive",
				"nodes": [
					5525,
					7129,
					7130,
					7131,
					7132
				]
			},
			{
				"speed": 25,
				"name": "Lundy Drive",
				"nodes": [
					3434,
					7133,
					7134,
					7135,
					7136,
					7137,
					7138,
					3874
				]
			},
			{
				"speed": 25,
				"name": "Ville Martha Lane",
				"nodes": [
					7139,
					7140,
					7141,
					7142,
					7143,
					7144,
					7145,
					7146,
					7147,
					7148,
					7149
				]
			},
			{
				"speed": 25,
				"name": "Gallant Fox Drive",
				"nodes": [
					2528,
					7150,
					7151,
					7152,
					7153,
					7154,
					7155,
					7156
				]
			},
			{
				"speed": 25,
				"name": "Colonial Court",
				"nodes": [
					1491,
					7157
				]
			},
			{
				"speed": 30,
				"name": "Taylor Road",
				"nodes": [
					7158,
					7159,
					7160,
					7161,
					2815,
					2849,
					2558,
					7162,
					7163
				]
			},
			{
				"speed": 25,
				"name": "Alderwood Court",
				"nodes": [
					7164,
					7165,
					7166
				]
			},
			{
				"speed": 25,
				"name": "Night Drive",
				"nodes": [
					7167,
					7168,
					3811,
					7169,
					7170,
					7171,
					7172,
					7173,
					7174,
					3806,
					7175,
					7176,
					7177,
					7178,
					5028,
					7179,
					7180
				]
			},
			{
				"speed": 25,
				"name": "Hearthstone Court",
				"nodes": [
					7181,
					7182,
					7183,
					7184,
					7185,
					7186
				]
			},
			{
				"speed": 25,
				"name": "Gastorf Place",
				"nodes": [
					7187,
					7188,
					7189,
					7190,
					7191,
					7192,
					7193,
					7194,
					7195,
					7196,
					7197,
					7198,
					7199,
					7200,
					7201
				]
			},
			{
				"speed": 25,
				"name": "Fairmount Drive",
				"nodes": [
					2526,
					7202,
					7203,
					7204,
					7205,
					7206,
					7207,
					7208,
					7209,
					7210
				]
			},
			{
				"speed": 25,
				"name": "North Downs Drive",
				"nodes": [
					7211,
					7212,
					1675
				]
			},
			{
				"speed": 25,
				"name": "Lake James Court",
				"nodes": [
					7213,
					7214,
					7215,
					7216,
					7217,
					7218,
					7219,
					7220,
					7221,
					7222,
					7223,
					7224,
					7225,
					7226,
					7227
				]
			},
			{
				"speed": 25,
				"name": "Nottinghill Row",
				"nodes": [
					4540,
					7228,
					7229,
					7230
				]
			},
			{
				"speed": 25,
				"name": "Clanfield Drive",
				"nodes": [
					7231,
					7232,
					7233,
					7234,
					7235,
					7236,
					7237,
					7238,
					7239,
					7240,
					7241
				]
			},
			{
				"speed": 25,
				"name": "North Pointe Lane",
				"nodes": [
					7242,
					7243,
					7244,
					7245,
					7246,
					7247,
					7248,
					1476,
					2131,
					7249,
					6429,
					7250,
					6410
				]
			},
			{
				"speed": 25,
				"name": "Spring Valley Drive",
				"nodes": [
					7251,
					7252
				]
			},
			{
				"speed": 25,
				"name": "Nottinghill Row",
				"nodes": [
					7253,
					7254,
					7255,
					7256
				]
			},
			{
				"speed": 25,
				"name": "Spring Valley Drive",
				"nodes": [
					7257,
					7258,
					7259,
					7260,
					7261,
					7262,
					7263,
					2957
				]
			},
			{
				"speed": 25,
				"name": "Nottinghill Row",
				"nodes": [
					7256,
					4551
				]
			},
			{
				"speed": 25,
				"name": "Chaparrall Creek Court",
				"nodes": [
					496,
					7264,
					7265,
					7266,
					7267
				]
			},
			{
				"speed": 25,
				"name": "Wagon Wheel Lane",
				"nodes": [
					7268,
					7269,
					7270,
					7271,
					7272,
					7273,
					7274,
					7275,
					7276,
					7277,
					7278,
					7279,
					7280,
					7281,
					7282,
					7283,
					7284
				]
			},
			{
				"speed": 25,
				"name": "Alma Drive",
				"nodes": [
					7285,
					7286,
					2669
				]
			},
			{
				"speed": 25,
				"name": "Comanche Lane",
				"nodes": [
					2749,
					7287,
					7288,
					7289,
					5963
				]
			},
			{
				"speed": 25,
				"name": "Whisper Lake Court",
				"nodes": [
					620,
					7290,
					7291,
					7292,
					7293,
					7294,
					7295
				]
			},
			{
				"speed": 25,
				"name": "Harbor Oaks Court",
				"nodes": [
					7296,
					7297,
					7298,
					7299,
					7300,
					7301,
					7302,
					7303,
					7304
				]
			},
			{
				"speed": 25,
				"name": "Fawn",
				"nodes": [
					7305,
					7306,
					7307,
					7308,
					7309,
					7310,
					7311,
					7312,
					7313,
					7306
				]
			},
			{
				"speed": 25,
				"name": "Nottinghill Row",
				"nodes": [
					7230,
					7314,
					7253
				]
			},
			{
				"speed": 25,
				"name": "Hazelnut Court",
				"nodes": [
					6479,
					7315,
					7316,
					7317,
					7318,
					7319,
					7320
				]
			},
			{
				"speed": 25,
				"name": "Mary Jo Lane",
				"nodes": [
					7321,
					7322,
					7323
				]
			},
			{
				"speed": 25,
				"name": "Linden Drive",
				"nodes": [
					7324,
					7325
				]
			},
			{
				"speed": 25,
				"name": "Moellering Drive",
				"nodes": [
					7326,
					7327,
					7328,
					7329,
					7330,
					7331,
					7332,
					7333,
					7334,
					7335,
					7336,
					7337
				]
			},
			{
				"speed": 25,
				"name": "Espace Court",
				"nodes": [
					7338,
					7339,
					7340,
					7341,
					7342,
					7343,
					7344,
					7345,
					7346,
					7347,
					7348
				]
			},
			{
				"speed": 25,
				"name": "Marion Garden Lane",
				"nodes": [
					7349,
					7350,
					7351,
					7352,
					7353,
					7354,
					7355,
					7356,
					7357,
					7358,
					7359,
					7360,
					7361,
					7362,
					7363,
					7364,
					7365,
					7366,
					7367,
					7368,
					7369,
					7370,
					7371,
					7372,
					7373,
					7374
				]
			},
			{
				"speed": 25,
				"name": "Bay Meadows Drive",
				"nodes": [
					7375,
					4554
				]
			},
			{
				"speed": 25,
				"name": "Rue Pardisse Lane",
				"nodes": [
					7376,
					7377,
					7378,
					7379,
					7380,
					7381,
					7382,
					7383,
					7384,
					7385,
					7386,
					7387,
					7388,
					7389,
					7390,
					7391,
					7376
				]
			},
			{
				"speed": 25,
				"name": "Saint John Court",
				"nodes": [
					7392,
					7393,
					7394
				]
			},
			{
				"speed": 25,
				"name": "Westminster Drive",
				"nodes": [
					7395,
					7396,
					7397,
					7398,
					7399,
					7400,
					7401,
					7402,
					7403,
					7404,
					7405,
					7406,
					7407,
					7408,
					7409,
					7410,
					7411,
					7412,
					7413,
					7414,
					7415
				]
			},
			{
				"speed": 25,
				"name": "Priory Brook Road",
				"nodes": [
					7416,
					7417,
					7418,
					7419,
					7420,
					7421,
					3245,
					7422,
					7423,
					438,
					7424,
					5434,
					7425,
					7426,
					6692,
					7427,
					7428,
					3832
				]
			},
			{
				"speed": 25,
				"name": "New Sun Drive",
				"nodes": [
					655,
					7429,
					7430,
					7431,
					7432,
					7433,
					7434,
					7435,
					7436,
					7437,
					7438,
					7439,
					7440,
					7441,
					7442,
					7443,
					7444,
					7445,
					7446,
					7447
				]
			},
			{
				"speed": 25,
				"name": "Elm Grove Court",
				"nodes": [
					7448,
					7449,
					7450,
					7451,
					7452,
					7453,
					7454,
					7455,
					7456,
					7457,
					7458,
					7459,
					7460,
					7461,
					7462,
					7463,
					7448
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					7464,
					7465
				]
			},
			{
				"speed": 25,
				"name": "Marquette Drive",
				"nodes": [
					7466,
					7467,
					7468,
					7469,
					7470,
					7471,
					7472,
					781,
					4901
				]
			},
			{
				"speed": 25,
				"name": "Gulfport Court",
				"nodes": [
					7473,
					7474,
					7475,
					7476,
					7477,
					7478,
					7479,
					7480
				]
			},
			{
				"speed": 25,
				"name": "Carefree Lane",
				"nodes": [
					7481,
					7482,
					7483,
					7484,
					7485,
					7486,
					7487
				]
			},
			{
				"speed": 25,
				"name": "Marquette Drive",
				"nodes": [
					7488,
					7489,
					7490,
					7491,
					7492,
					7493,
					1669,
					7494,
					7495,
					7466
				]
			},
			{
				"speed": 25,
				"name": "Teakwood Manor Drive",
				"nodes": [
					7496,
					7497,
					7498,
					7499,
					7500,
					3636,
					7501,
					7502,
					6768,
					7503,
					7504
				]
			},
			{
				"speed": 25,
				"name": "Windemer Drive",
				"nodes": [
					7183,
					7505,
					7506,
					7507,
					1452
				]
			},
			{
				"speed": 25,
				"name": "6th Lane",
				"nodes": [
					6427,
					6405,
					7508
				]
			},
			{
				"speed": 25,
				"name": "Boardwalk Avenue",
				"nodes": [
					7509,
					7510,
					7511,
					7512,
					7513,
					7514,
					7515,
					7516,
					7517,
					7518,
					7519,
					7520,
					7521,
					7522,
					7523,
					7524,
					7509
				]
			},
			{
				"speed": 25,
				"name": "Foxtree Drive",
				"nodes": [
					7525,
					7526,
					7527,
					7528,
					7529,
					7530,
					7531
				]
			},
			{
				"speed": 25,
				"name": "Belair Terrace",
				"nodes": [
					7532,
					7533,
					7534,
					7535,
					7536,
					7537,
					7538
				]
			},
			{
				"speed": 25,
				"name": "Buttercup Drive",
				"nodes": [
					3763,
					7539,
					7540,
					7541,
					6336,
					7542,
					7543,
					7544,
					7545,
					7546,
					7547,
					7548,
					7549,
					698,
					7550,
					7551,
					7552,
					7553,
					7554
				]
			},
			{
				"speed": 25,
				"name": "Langholm Drive",
				"nodes": [
					3664,
					7555,
					7556,
					7557,
					7558,
					7559,
					7560,
					7561
				]
			},
			{
				"speed": 25,
				"name": "Satiris Drive",
				"nodes": [
					7562,
					4340,
					2039,
					7563,
					7564
				]
			},
			{
				"speed": 25,
				"name": "White Birch Way",
				"nodes": [
					1084,
					7565,
					7566,
					7567,
					7568,
					7569,
					7570,
					7571,
					7572,
					7573,
					7574,
					7575,
					7576,
					7577,
					7578,
					992,
					7579,
					7580,
					7581,
					7582,
					7583,
					7584,
					802,
					7585,
					7586,
					7587,
					7588,
					7589,
					7590,
					7123
				]
			},
			{
				"speed": 25,
				"name": "Boardwalk Avenue",
				"nodes": [
					7591,
					7592,
					7593,
					7594,
					864,
					7595,
					6748,
					7596,
					7597,
					7598,
					7599,
					7231
				]
			},
			{
				"speed": 25,
				"name": "English Oak Drive",
				"nodes": [
					1009,
					7600,
					7601,
					7602,
					7603,
					7604,
					7605,
					7606,
					7607,
					7608,
					6536
				]
			},
			{
				"speed": 25,
				"name": "Rose Grove Court",
				"nodes": [
					5616,
					7609
				]
			},
			{
				"speed": 25,
				"name": "Laurel Court",
				"nodes": [
					7610,
					7611
				]
			},
			{
				"speed": 25,
				"name": "94th Avenue",
				"nodes": [
					7612,
					7613,
					7614
				]
			},
			{
				"speed": 25,
				"name": "Covey Court",
				"nodes": [
					7615,
					7616
				]
			},
			{
				"speed": 25,
				"name": "Alandale Court",
				"nodes": [
					7617,
					7618,
					7619,
					7620,
					7621,
					7622,
					7623,
					7624,
					7625,
					7626,
					7627,
					7628,
					7629,
					7630
				]
			},
			{
				"speed": 25,
				"name": "Tom Sawyer Drive",
				"nodes": [
					855,
					2175,
					7631
				]
			},
			{
				"speed": 25,
				"name": "Foxcrest Drive",
				"nodes": [
					7632,
					7633,
					7634,
					7635,
					7636,
					7637,
					4229,
					5621,
					7638,
					7115
				]
			},
			{
				"speed": 25,
				"name": "Foxmont Drive",
				"nodes": [
					5612,
					7529
				]
			},
			{
				"speed": 25,
				"name": "Bradstone Drive",
				"nodes": [
					6733,
					2990
				]
			},
			{
				"speed": 25,
				"name": "English Oak Drive",
				"nodes": [
					6536,
					7639,
					7640,
					7641,
					7642,
					7643,
					7644,
					7645,
					7646,
					7647,
					7648,
					7649
				]
			},
			{
				"speed": 25,
				"name": "Saint Judith Lane",
				"nodes": [
					5949,
					5156
				]
			},
			{
				"speed": 25,
				"name": "Gateswood Drive",
				"nodes": [
					7650,
					7651,
					7652,
					7653,
					7654,
					7655,
					7656
				]
			},
			{
				"speed": 25,
				"name": "Windsor Drive",
				"nodes": [
					3513,
					7657,
					7658,
					7659,
					7660,
					7661,
					7662,
					7663,
					1852,
					7664,
					7665,
					7666,
					2189,
					7667,
					7668
				]
			},
			{
				"speed": 25,
				"name": "Ruth Drive",
				"nodes": [
					7669,
					7670,
					3877,
					7671
				]
			},
			{
				"speed": 25,
				"name": "Bay Meadows Drive",
				"nodes": [
					2530,
					7672,
					3882,
					1687,
					7673
				]
			},
			{
				"speed": 25,
				"name": "Deborah Drive",
				"nodes": [
					7465,
					7674,
					7675,
					7676
				]
			},
			{
				"speed": 25,
				"name": "Lexington Park",
				"nodes": [
					7508,
					7677,
					7678,
					7679,
					3561,
					7680
				]
			},
			{
				"speed": 25,
				"name": "Phantom Drive",
				"nodes": [
					7681,
					7682,
					7683,
					7684,
					7685,
					7686,
					7687,
					7688,
					7689,
					7690,
					1384
				]
			},
			{
				"speed": 25,
				"name": "Valleybrook Drive",
				"nodes": [
					4709,
					7691,
					7692,
					7693,
					7694,
					7695,
					7696,
					7697,
					7698,
					1659
				]
			},
			{
				"speed": 25,
				"name": "Channel Drive",
				"nodes": [
					1640,
					7699,
					7700,
					7701,
					7702
				]
			},
			{
				"speed": 25,
				"name": "Ermanda Drive",
				"nodes": [
					5246,
					7703
				]
			},
			{
				"speed": 25,
				"name": "Palomino Lane",
				"nodes": [
					1918,
					7704,
					7705,
					7706,
					5565
				]
			},
			{
				"speed": 25,
				"name": "Sabina Lane",
				"nodes": [
					7707,
					7708,
					7709,
					7710,
					7711,
					7712
				]
			},
			{
				"speed": 25,
				"name": "Pineneedle Trail",
				"nodes": [
					7713,
					7714
				]
			},
			{
				"speed": 25,
				"name": "Rhine Drive",
				"nodes": [
					7715,
					2037,
					7564,
					7716,
					424,
					700,
					7717,
					7718,
					4296
				]
			},
			{
				"speed": 25,
				"name": "Champlain Court",
				"nodes": [
					4896,
					7719
				]
			},
			{
				"speed": 25,
				"name": "St Augusta Lane",
				"nodes": [
					7720,
					7721
				]
			},
			{
				"speed": 25,
				"name": "Crandell Drive",
				"nodes": [
					1318,
					7722,
					3120
				]
			},
			{
				"speed": 35,
				"name": "Dunn Road",
				"nodes": [
					7723,
					7724
				]
			},
			{
				"speed": 25,
				"name": "Ransome Court",
				"nodes": [
					7712,
					7725,
					7726
				]
			},
			{
				"speed": 25,
				"name": "Wheatfield Drive",
				"nodes": [
					1333,
					7727,
					7728,
					7729,
					6481,
					1925,
					7730,
					7731,
					7732,
					1367
				]
			},
			{
				"speed": 25,
				"name": "Tamerlane Court",
				"nodes": [
					7733,
					7734,
					7735,
					7503,
					7736,
					7737,
					7738
				]
			},
			{
				"speed": 25,
				"name": "Farthing Court",
				"nodes": [
					6708,
					7739,
					7740,
					7741,
					7742,
					7743,
					7744,
					7745
				]
			},
			{
				"speed": 25,
				"name": "Springtime Lane",
				"nodes": [
					2501,
					7746,
					7747,
					7748,
					7749,
					7750,
					7751,
					7752,
					7753
				]
			},
			{
				"speed": 30,
				"name": "Dunn Road",
				"nodes": [
					1003,
					7754,
					7755,
					7756,
					7757,
					7758,
					7759,
					7760,
					7761,
					7762,
					7763,
					7764,
					7765,
					7766,
					7767,
					7768,
					7769,
					7770,
					7771,
					7772
				]
			},
			{
				"speed": 25,
				"name": "Hatina Drive",
				"nodes": [
					7773,
					7774,
					7775,
					7776,
					7777
				]
			},
			{
				"speed": 25,
				"name": "Park New York Drive",
				"nodes": [
					7778,
					7779,
					7780,
					7781,
					7782,
					7783,
					7784,
					7785,
					7786,
					7787,
					7788,
					7789,
					7790,
					7791,
					7792,
					7793,
					7778
				]
			},
			{
				"speed": 25,
				"name": "Saint Denis Street",
				"nodes": [
					5941,
					3647,
					7794,
					7795,
					6759,
					7796,
					7797,
					7798,
					7799,
					7800,
					7801,
					7802,
					7803,
					6764
				]
			},
			{
				"speed": 25,
				"name": "Indiancup Drive",
				"nodes": [
					3751,
					7804,
					7805,
					7806,
					7807,
					7808,
					7809,
					7810,
					6222,
					7811,
					7812,
					7813,
					7814,
					7815,
					7816,
					7817,
					7818,
					7819,
					7820,
					7821,
					7822,
					7823,
					7824,
					7825,
					7826,
					7827,
					7828,
					6667,
					7829,
					7830,
					7831,
					7832,
					7833,
					2422,
					7834
				]
			},
			{
				"speed": 25,
				"name": "Bobbinray Circle",
				"nodes": [
					7835,
					7836
				]
			},
			{
				"speed": 30,
				"name": "Dunn Road",
				"nodes": [
					7837,
					3675,
					7838,
					1222,
					7839,
					3108
				]
			},
			{
				"speed": 30,
				"name": "Dunn Road",
				"nodes": [
					7163,
					7840,
					7841,
					7842
				]
			},
			{
				"speed": 30,
				"name": "Dunn Road",
				"nodes": [
					6413,
					7843,
					7844,
					7845,
					7846,
					7847,
					7848,
					7849,
					7850,
					7851,
					7852,
					7853,
					7854,
					7855,
					7856,
					7857,
					7858,
					1003
				]
			},
			{
				"speed": 25,
				"name": "Bluff Drive",
				"nodes": [
					7859,
					7860,
					7861,
					5036,
					7862
				]
			},
			{
				"speed": 25,
				"name": "Tamzine Court",
				"nodes": [
					7863,
					7864
				]
			},
			{
				"speed": 25,
				"name": "Liberty Landing Court",
				"nodes": [
					4292,
					7865,
					7866,
					7867,
					7868,
					7869,
					7870,
					7871,
					7872,
					7873,
					7874,
					7875,
					7876,
					7877,
					7878,
					7879,
					7880,
					7881,
					7882,
					7883,
					7884,
					7874
				]
			},
			{
				"speed": 25,
				"name": "Brower Court",
				"nodes": [
					7885,
					1155
				]
			},
			{
				"speed": 25,
				"name": "Peachtree Court",
				"nodes": [
					7886,
					7887
				]
			},
			{
				"speed": 25,
				"name": "Crowder Drive",
				"nodes": [
					2675,
					7888,
					7889,
					5490
				]
			},
			{
				"speed": 25,
				"name": "Susie Court",
				"nodes": [
					7890,
					6472
				]
			},
			{
				"speed": 25,
				"name": "Montagne Drive",
				"nodes": [
					7891,
					7892,
					7893,
					7894,
					7895,
					7896,
					7897,
					7898,
					7899,
					7900,
					7901,
					7902,
					7903,
					7904,
					7905
				]
			},
			{
				"speed": 25,
				"name": "Seeger Drive",
				"nodes": [
					3701,
					7906,
					7907
				]
			},
			{
				"speed": 25,
				"name": "Rolling Hills Drive",
				"nodes": [
					7908,
					7909,
					7910,
					7911,
					7912,
					7913,
					5012
				]
			},
			{
				"speed": 25,
				"name": "Beta Drive",
				"nodes": [
					6651,
					7914,
					7915,
					7916,
					7917,
					7918,
					7919,
					7920,
					7921,
					6654
				]
			},
			{
				"speed": 25,
				"name": "Chez Vant Court",
				"nodes": [
					7922,
					1014
				]
			},
			{
				"speed": 25,
				"name": "Rolling Hills Drive",
				"nodes": [
					7923,
					7924,
					7925,
					7926,
					7908,
					7927,
					7928,
					7929,
					7913
				]
			},
			{
				"speed": 25,
				"name": "Ferguson Lane",
				"nodes": [
					7930,
					7931,
					7932,
					7933,
					7934
				]
			},
			{
				"speed": 25,
				"name": "Saint Gregory Drive",
				"nodes": [
					7014,
					7935,
					7936,
					5684,
					3136,
					7937,
					7938,
					7939,
					7940
				]
			},
			{
				"speed": 25,
				"name": "La Cuesta Drive",
				"nodes": [
					7941,
					7942,
					7943,
					7944,
					7945,
					7946,
					7947,
					7948
				]
			},
			{
				"speed": 25,
				"name": "Avion Way",
				"nodes": [
					7949,
					7950,
					7951,
					7952,
					7953,
					7954,
					7955,
					7956,
					7957
				]
			},
			{
				"speed": 25,
				"name": "Northport Drive",
				"nodes": [
					7958,
					7959,
					7960,
					7961,
					7962,
					7963,
					7964,
					7965,
					7966
				]
			},
			{
				"speed": 25,
				"name": "Colbert Court",
				"nodes": [
					7967,
					7968,
					7969,
					7970,
					7971,
					7972,
					7973,
					7974,
					7975,
					7976,
					7977,
					7978,
					7979,
					7980,
					7981,
					7982,
					7967
				]
			},
			{
				"speed": 25,
				"name": "Martin Drive",
				"nodes": [
					5759,
					7983,
					1290,
					7984,
					7985,
					7986,
					7987,
					7988,
					7989,
					7990,
					7991,
					3670
				]
			},
			{
				"speed": 25,
				"name": "Rosecrest Court",
				"nodes": [
					1758,
					7992,
					7993,
					7994,
					7995
				]
			},
			{
				"speed": 25,
				"name": "Milbrook Lane",
				"nodes": [
					4887,
					7996
				]
			},
			{
				"speed": 25,
				"name": "Florland Court",
				"nodes": [
					1448,
					7997
				]
			},
			{
				"speed": 30,
				"name": "Dunn Road",
				"nodes": [
					7772,
					7998,
					7999,
					8000,
					8001,
					8002,
					8003,
					8004,
					8005,
					8006,
					8007,
					8008,
					8009,
					8010,
					8011,
					8012,
					8013,
					8014,
					8015,
					8016,
					8017,
					8018,
					8019,
					8020,
					8021,
					8022,
					8023,
					8024
				]
			},
			{
				"speed": 25,
				"name": "Carla Drive",
				"nodes": [
					7676,
					8025,
					8026,
					8027,
					8028,
					8029,
					8030,
					8031,
					6614,
					8032
				]
			},
			{
				"speed": 25,
				"name": "Cousteau Drive",
				"nodes": [
					6113,
					6085,
					8033,
					8034,
					8035,
					8036,
					8037
				]
			},
			{
				"speed": 25,
				"name": "Boeing Drive",
				"nodes": [
					8038,
					8039,
					5432
				]
			},
			{
				"speed": 25,
				"name": "Blackberry Meadow Lane",
				"nodes": [
					6846,
					8040
				]
			},
			{
				"speed": 25,
				"name": "Fireweed Court",
				"nodes": [
					2102,
					8041
				]
			},
			{
				"speed": 25,
				"name": "Ville Maria Lane",
				"nodes": [
					8042,
					3531,
					8043,
					8044
				]
			},
			{
				"speed": 25,
				"name": "Tesson Park Court",
				"nodes": [
					1498,
					8045,
					8046
				]
			},
			{
				"speed": 25,
				"name": "Woodhurst Drive",
				"nodes": [
					8047,
					8048,
					8049,
					8050,
					7777,
					8051,
					5088,
					8052
				]
			},
			{
				"speed": 25,
				"name": "Saratoga Court",
				"nodes": [
					8053,
					8054,
					8055,
					8056,
					8057,
					8058,
					8059
				]
			},
			{
				"speed": 25,
				"name": "Moselle Court",
				"nodes": [
					8060,
					8061,
					8062,
					8063,
					8064,
					8065,
					8066,
					8067,
					8068,
					8069,
					8070,
					8071,
					8072,
					8073,
					5869,
					8074
				]
			},
			{
				"speed": 25,
				"name": "Clark Street",
				"nodes": [
					8075,
					2143,
					8076,
					8077,
					1612,
					8078,
					8079,
					8080,
					1112,
					402,
					8081
				]
			},
			{
				"speed": 25,
				"name": "Pennhurst Drive",
				"nodes": [
					7072,
					6492,
					4408
				]
			},
			{
				"speed": 30,
				"name": "Dunn Road",
				"nodes": [
					8082,
					8083,
					8084,
					8085,
					8086,
					8087,
					8088,
					8089,
					8090,
					8091,
					8092,
					8093,
					8094,
					8095,
					8096,
					8097,
					8098,
					8099,
					8100,
					8101,
					8102,
					8103,
					8104,
					8105,
					8106,
					8107,
					8108,
					4987,
					8109,
					8110,
					8111,
					8112,
					6856,
					8113,
					8114,
					8115,
					6413
				]
			},
			{
				"speed": 25,
				"name": "Glynn Drive",
				"nodes": [
					8116,
					8117,
					8118
				]
			},
			{
				"speed": 25,
				"name": "Lightwood Drive",
				"nodes": [
					8119,
					8120,
					8121,
					8122,
					8123,
					8124,
					8125,
					8126,
					8127,
					8128,
					8129,
					8130,
					8131,
					8132,
					8133,
					8134
				]
			},
			{
				"speed": 25,
				"name": "Santa Maria Court",
				"nodes": [
					8135,
					8136,
					8137,
					8138,
					8139,
					8140,
					8141,
					8142,
					8143,
					8144,
					8145
				]
			},
			{
				"speed": 25,
				"name": "Georgetown Drive",
				"nodes": [
					8146,
					8147,
					8148,
					8149,
					8150,
					8151,
					8152
				]
			},
			{
				"speed": 25,
				"name": "Gerald Drive",
				"nodes": [
					8153,
					8154,
					8155,
					8156,
					8157,
					8158,
					8159,
					8160,
					8161,
					8162,
					8163,
					8164,
					8165,
					8166,
					8167,
					8168,
					8169,
					5303
				]
			},
			{
				"speed": 25,
				"name": "Shoreham Drive",
				"nodes": [
					4253,
					8170,
					8171,
					8172,
					8173,
					8174,
					8175,
					8176,
					8177,
					8178,
					8179,
					8180
				]
			},
			{
				"speed": 25,
				"name": "Paul Avenue",
				"nodes": [
					8181,
					8182,
					771,
					8183,
					8184,
					8185,
					8186,
					3355,
					8187,
					8188,
					8189,
					4749,
					8190,
					8191,
					8192,
					5297
				]
			},
			{
				"speed": 25,
				"name": "Cross Keys Shopping Center",
				"nodes": [
					8193,
					8194
				]
			},
			{
				"speed": 25,
				"name": "Shalfleet Court",
				"nodes": [
					8195,
					8196,
					8197,
					8198,
					8199,
					8200,
					8201,
					8202,
					8203,
					8204,
					8205,
					8206,
					8207,
					8208,
					8209,
					8210,
					8195
				]
			},
			{
				"speed": 25,
				"name": "Partridge Berry Drive",
				"nodes": [
					1875,
					6132,
					8211,
					8212,
					8213,
					8214,
					8215,
					8216,
					8217,
					8218
				]
			},
			{
				"speed": 25,
				"name": "Limedale Lane",
				"nodes": [
					8219,
					8220,
					8221,
					8222,
					5524
				]
			},
			{
				"speed": 25,
				"name": "Tera Bera Drive",
				"nodes": [
					6050,
					8223,
					8224,
					8225,
					8226,
					8227,
					8228,
					8229,
					8230,
					8231,
					8232,
					8233,
					8234,
					8235,
					8236,
					8237,
					8238,
					8239,
					8240,
					8241,
					8242,
					6038
				]
			},
			{
				"speed": 25,
				"name": "Blythewood Drive",
				"nodes": [
					6915,
					8243,
					8244,
					8245,
					8246
				]
			},
			{
				"speed": 25,
				"name": "Wente Place",
				"nodes": [
					8247,
					8248,
					8249,
					8250,
					8251,
					8252,
					8253,
					8254,
					8255
				]
			},
			{
				"speed": 25,
				"name": "Greenway Chase Drive",
				"nodes": [
					8256,
					8257,
					8258
				]
			},
			{
				"speed": 25,
				"name": "Chalmette Drive",
				"nodes": [
					4576,
					8259,
					8260,
					8261,
					8262,
					8263,
					4577
				]
			},
			{
				"speed": 25,
				"name": "Seven Hills Drive",
				"nodes": [
					8264,
					8265,
					8266,
					8267,
					8268,
					8269,
					8270,
					8271,
					8272,
					8273,
					8274,
					8275,
					8276,
					8277,
					8278,
					8279,
					8280,
					7958,
					8281,
					7966,
					8282,
					8283,
					8284,
					4443,
					8285,
					8286,
					8287,
					8288,
					8289,
					8290,
					8291,
					8292,
					8293,
					8294,
					8295,
					8296,
					8297,
					8298,
					8299
				]
			},
			{
				"speed": 25,
				"name": "Jenkee Avenue",
				"nodes": [
					8300,
					8301,
					4391,
					8302,
					8303,
					8304,
					8305,
					8306,
					8307,
					8308,
					2367
				]
			},
			{
				"speed": 25,
				"name": "Vesper Drive",
				"nodes": [
					8309,
					8310,
					8311
				]
			},
			{
				"speed": 25,
				"name": "Saint Luke Drive",
				"nodes": [
					7012,
					8312,
					8313,
					8314,
					5675,
					3134,
					5170
				]
			},
			{
				"speed": 25,
				"name": "Avocado Lane",
				"nodes": [
					8315,
					8316,
					8317,
					8318,
					8319,
					6670,
					8320,
					8321,
					8322,
					8323,
					8324,
					8325,
					8326,
					8327,
					8328
				]
			},
			{
				"speed": 25,
				"name": "Imperial Drive",
				"nodes": [
					8095,
					8329,
					8330,
					8331,
					8332,
					8333,
					8334,
					8335,
					8336
				]
			},
			{
				"speed": 25,
				"name": "North Jefferson Street",
				"nodes": [
					8337,
					8338,
					2141,
					8339,
					8340,
					1610,
					8341,
					8342,
					8343,
					1110,
					400,
					8344,
					8345
				]
			},
			{
				"speed": 25,
				"name": "Nordell Court",
				"nodes": [
					8346,
					8347,
					8348
				]
			},
			{
				"speed": 25,
				"name": "Nordell Court",
				"nodes": [
					8347,
					6075
				]
			},
			{
				"speed": 25,
				"name": "Marsala Drive",
				"nodes": [
					8349,
					8350,
					8351,
					8352,
					8353,
					8354,
					8355,
					8356,
					8357
				]
			},
			{
				"speed": 25,
				"name": "Teak Court",
				"nodes": [
					8358,
					8359
				]
			},
			{
				"speed": 25,
				"name": "Paul Avenue",
				"nodes": [
					5306,
					8360,
					8361,
					8362,
					8363,
					8364,
					8365,
					8366,
					8367,
					8300,
					8368,
					8369,
					8370,
					8371,
					8372,
					8373,
					8374,
					8375,
					8376,
					8377,
					8378,
					8379
				]
			},
			{
				"speed": 25,
				"name": "Danube Drive",
				"nodes": [
					8380,
					8381,
					8382,
					1454,
					8383,
					8384,
					8385,
					8386,
					8387,
					8388,
					8389,
					5019
				]
			},
			{
				"speed": 25,
				"name": "Golden Gate Court",
				"nodes": [
					1687,
					8390
				]
			},
			{
				"speed": 25,
				"name": "Stallion Drive",
				"nodes": [
					2535,
					8391,
					8392,
					8393,
					7672
				]
			},
			{
				"speed": 25,
				"name": "Rockingham Drive",
				"nodes": [
					8394,
					8395,
					8396,
					8397
				]
			},
			{
				"speed": 25,
				"name": "Mary Rose Court",
				"nodes": [
					5613,
					8398
				]
			},
			{
				"speed": 25,
				"name": "Country Green Court",
				"nodes": [
					8399,
					8400,
					8401,
					8402,
					8403,
					8404,
					8405,
					8406,
					8407,
					8408,
					8409,
					8401
				]
			},
			{
				"speed": 25,
				"name": "Burchard Drive",
				"nodes": [
					8410,
					8411,
					3109,
					1249
				]
			},
			{
				"speed": 25,
				"name": "Rue St Francois",
				"nodes": [
					8412,
					8413,
					8414,
					8415,
					8416,
					6945,
					4602,
					8341,
					8417,
					8078,
					8418,
					8419,
					2784
				]
			},
			{
				"speed": 25,
				"name": "Cherry Wood Trail",
				"nodes": [
					1029,
					2214,
					8420
				]
			},
			{
				"speed": 25,
				"name": "Spartina Drive",
				"nodes": [
					8421,
					8422,
					8423,
					72,
					8424,
					8425,
					8426,
					8427,
					8428,
					4769,
					8429,
					8430,
					8431,
					8432,
					8433
				]
			},
			{
				"speed": 25,
				"name": "Willow Creek Est Drive",
				"nodes": [
					5752,
					8434,
					8435,
					8436,
					8437,
					8438,
					8439,
					8440,
					8441,
					8442,
					8443,
					8444,
					8445,
					8446
				]
			},
			{
				"speed": 25,
				"name": "Portique Court",
				"nodes": [
					8447,
					8448,
					8449,
					8450
				]
			},
			{
				"speed": 25,
				"name": "Debra Lynn Lane",
				"nodes": [
					8032,
					8451,
					8452,
					8453,
					8454,
					8455,
					8456,
					8457,
					8458
				]
			},
			{
				"speed": 25,
				"name": "Johnstown Drive",
				"nodes": [
					8459,
					458,
					8460,
					8461,
					1895
				]
			},
			{
				"speed": 25,
				"name": "Dukeland Drive",
				"nodes": [
					3112,
					8462,
					8463,
					8464,
					8465,
					8466,
					8467,
					8468,
					8469,
					8470,
					8471,
					1254
				]
			},
			{
				"speed": 25,
				"name": "Meuse Drive",
				"nodes": [
					2994,
					8472,
					8473,
					8474,
					8475,
					8476,
					8477,
					8478,
					8479
				]
			},
			{
				"speed": 25,
				"name": "Madison Lane",
				"nodes": [
					642,
					8480,
					8481,
					7124,
					3553,
					8482
				]
			},
			{
				"speed": 25,
				"name": "Madison Lane",
				"nodes": [
					4519,
					3056,
					8483,
					3785
				]
			},
			{
				"speed": 25,
				"name": "Foxtail Drive",
				"nodes": [
					8484,
					8485,
					8486,
					8487,
					8488,
					8489,
					8490,
					8491,
					8492,
					8493,
					8494,
					8495,
					8496,
					8497,
					8498,
					8499,
					8500
				]
			},
			{
				"speed": 25,
				"name": "Shadowcreek Drive",
				"nodes": [
					4364,
					8501,
					8502,
					8503,
					8504,
					3551
				]
			},
			{
				"speed": 25,
				"name": "Marxkors Place",
				"nodes": [
					8505,
					8506,
					8507,
					8508,
					8509
				]
			},
			{
				"speed": 25,
				"name": "Willow Creek Est Drive",
				"nodes": [
					8510,
					8511,
					8512,
					8513,
					8514,
					8515,
					8516,
					8517,
					8518,
					8519,
					8520,
					8521,
					8522,
					8523,
					8524,
					8525,
					8510
				]
			},
			{
				"speed": 25,
				"name": "Dettmer Place",
				"nodes": [
					8526,
					8527,
					8528,
					8529,
					8530
				]
			},
			{
				"speed": 25,
				"name": "Greenheath Drive",
				"nodes": [
					4262,
					8531,
					8532,
					8533,
					8534,
					8535,
					8536,
					8537,
					8538,
					8539,
					8540
				]
			},
			{
				"speed": 25,
				"name": "Granada Drive",
				"nodes": [
					4568,
					8541
				]
			},
			{
				"speed": 25,
				"name": "Paddock Point Drive",
				"nodes": [
					8542,
					8543,
					8544,
					8545,
					8546,
					8547,
					8548,
					8549,
					8550,
					8551,
					8552,
					8553,
					8554,
					8555,
					8556,
					8557,
					8558,
					8559
				]
			},
			{
				"speed": 25,
				"name": "Wellington Drive",
				"nodes": [
					7819,
					8560,
					8561,
					8562,
					7665,
					8563,
					8564,
					8565,
					8566,
					8567,
					8568,
					8569,
					8570,
					8571,
					8572,
					8573,
					8574,
					8575,
					8576,
					8577,
					8578
				]
			},
			{
				"speed": 25,
				"name": "Wellington Drive",
				"nodes": [
					2861,
					8579,
					8580,
					8581,
					8582
				]
			},
			{
				"speed": 25,
				"name": "Silverbrook Drive",
				"nodes": [
					8583,
					8584,
					8585,
					8586,
					8587,
					8588,
					8589,
					8590,
					8591,
					8592,
					8593,
					8594,
					8595,
					8596,
					8597,
					8598,
					8583
				]
			},
			{
				"speed": 25,
				"name": "East Duchesne Drive",
				"nodes": [
					8599,
					8600,
					8601,
					8602,
					8603,
					8604,
					3891,
					8605,
					1800
				]
			},
			{
				"speed": 25,
				"name": "Macrinus Drive",
				"nodes": [
					2050,
					3142,
					8606,
					8607,
					8608,
					8609
				]
			},
			{
				"speed": 25,
				"name": "Larbrook Drive",
				"nodes": [
					8610,
					8611,
					8612,
					8613,
					8614,
					8615,
					8616,
					8617,
					8618,
					8619,
					8620,
					8621,
					8622
				]
			},
			{
				"speed": 25,
				"name": "Valerie Drive",
				"nodes": [
					5240,
					1792,
					8623
				]
			},
			{
				"speed": 25,
				"name": "Beavertail Court",
				"nodes": [
					8624,
					8625,
					8626,
					8627
				]
			},
			{
				"speed": 25,
				"name": "Greenbriar Drive",
				"nodes": [
					5362,
					8628,
					8629,
					8630,
					8631,
					8632,
					8633,
					8634,
					8635,
					8636,
					8637,
					8638,
					8639,
					8640,
					5044
				]
			},
			{
				"speed": 25,
				"name": "Max Weich Place",
				"nodes": [
					8281,
					8641,
					8642,
					8643,
					8644,
					8264
				]
			},
			{
				"speed": 25,
				"name": "San Mateo Drive",
				"nodes": [
					8645,
					8646,
					8647,
					8648,
					4693
				]
			},
			{
				"speed": 25,
				"name": "Deville Drive",
				"nodes": [
					8649,
					8650,
					8651,
					8652,
					8653,
					3532
				]
			},
			{
				"speed": 25,
				"name": "Little Lane",
				"nodes": [
					5061,
					8654
				]
			},
			{
				"speed": 25,
				"name": "Berkridge Court",
				"nodes": [
					8655,
					8656,
					5415,
					1813
				]
			},
			{
				"speed": 25,
				"name": "North Duchesne Drive",
				"nodes": [
					8657,
					8658,
					8659,
					8660,
					8661,
					8662,
					8663,
					8599
				]
			},
			{
				"speed": 25,
				"name": "Rhapsody Lane",
				"nodes": [
					7059,
					8664,
					8665,
					8666,
					8667,
					8668,
					8669,
					8670,
					8671,
					8672
				]
			},
			{
				"speed": 25,
				"name": "Riverwood Place Drive",
				"nodes": [
					8673,
					8674,
					8675,
					8676,
					8677,
					8678,
					8679,
					8680,
					8681,
					8682,
					8683,
					8684
				]
			},
			{
				"speed": 25,
				"name": "Russet Court",
				"nodes": [
					8426,
					8685
				]
			},
			{
				"speed": 25,
				"name": "Saint Michael Court",
				"nodes": [
					8686,
					8687,
					8688,
					8689,
					8690
				]
			},
			{
				"speed": 25,
				"name": "Kingsbrook Lane",
				"nodes": [
					3554,
					8691
				]
			},
			{
				"speed": 25,
				"name": "Cheshire Drive",
				"nodes": [
					2920,
					8692,
					8693,
					8694,
					8695,
					8696,
					8697,
					8698,
					8699,
					8700,
					8701,
					8702,
					8703,
					8704,
					8705,
					8706,
					8707,
					8708,
					8709,
					8710,
					2935
				]
			},
			{
				"speed": 25,
				"name": "Brocton Common Drive",
				"nodes": [
					8711,
					8712,
					8713,
					8714,
					8715,
					8716,
					8717,
					8718,
					8719,
					8720,
					8721
				]
			},
			{
				"speed": 25,
				"name": "Cheltenham Road",
				"nodes": [
					4995,
					8722,
					8723,
					327,
					322,
					8724,
					8725,
					8726,
					8727,
					8728,
					8729,
					8730,
					8731,
					8732,
					8733,
					8734,
					8735,
					8736,
					8737,
					8738,
					3252
				]
			},
			{
				"speed": 25,
				"name": "Roanoke Place",
				"nodes": [
					8739,
					8740,
					8741,
					8742,
					8743,
					8744
				]
			},
			{
				"speed": 25,
				"name": "Holly River Drive",
				"nodes": [
					8745,
					8746,
					8747,
					8748,
					8749,
					8750,
					8751,
					8752,
					8753,
					8754,
					8755,
					8756,
					8757,
					8758,
					8759,
					8760,
					8745
				]
			},
			{
				"speed": 25,
				"name": "Sackman Court",
				"nodes": [
					8761,
					8762,
					8763,
					8764
				]
			},
			{
				"speed": 25,
				"name": "Brackleigh Drive",
				"nodes": [
					2742,
					8765,
					8766,
					8767,
					8768,
					2500
				]
			},
			{
				"speed": 25,
				"name": "Blue Heron Drive",
				"nodes": [
					3620,
					8769,
					8770,
					8771,
					8772,
					8773,
					8774,
					8775,
					8776,
					405,
					8777,
					8778,
					8779,
					8780,
					8781,
					8782,
					8783,
					8784,
					8785,
					8786,
					8787,
					8788,
					2621
				]
			},
			{
				"speed": 25,
				"name": "West Duchesne Drive",
				"nodes": [
					8657,
					1578,
					8789,
					5566,
					3126,
					8790,
					1793
				]
			},
			{
				"speed": 25,
				"name": "Barcelona Drive",
				"nodes": [
					4566,
					8791,
					5978,
					8792
				]
			},
			{
				"speed": 30,
				"name": "Saint Catherine Street",
				"nodes": [
					1615,
					5938,
					3644,
					8793,
					8794,
					8795,
					8796,
					1776,
					1988,
					4685,
					851,
					8797,
					8798,
					453,
					1890,
					8799,
					5068,
					8800,
					8801,
					1293,
					854,
					7650,
					2177,
					6382,
					8802,
					8803,
					8804,
					8805,
					8806,
					1365
				]
			},
			{
				"speed": 25,
				"name": "Hargrove Lane",
				"nodes": [
					1294,
					8807,
					8808,
					8809,
					8810,
					8811,
					8812
				]
			},
			{
				"speed": 25,
				"name": "Auburnhill Court",
				"nodes": [
					8813,
					8814,
					8815,
					8816,
					8817
				]
			},
			{
				"speed": 25,
				"name": "Old Charbonier Road",
				"nodes": [
					8818,
					8819
				]
			},
			{
				"speed": 25,
				"name": "Sharon Drive",
				"nodes": [
					7669,
					8820,
					3932,
					3933,
					8821,
					8822,
					2056
				]
			},
			{
				"speed": 25,
				"name": "Grafton Drive",
				"nodes": [
					6294,
					8823,
					8824,
					8825,
					8826,
					8827
				]
			},
			{
				"speed": 25,
				"name": "Queens Drive",
				"nodes": [
					7466,
					8828,
					8829,
					8830,
					8831
				]
			},
			{
				"speed": 25,
				"name": "Allan Drive",
				"nodes": [
					4684,
					8832,
					8833,
					8834,
					8835,
					8836,
					8837,
					8838,
					8839,
					2374,
					8799
				]
			},
			{
				"speed": 25,
				"name": "Atmore Drive",
				"nodes": [
					8840,
					6291,
					6921,
					8841
				]
			},
			{
				"speed": 25,
				"name": "Thompson Drive",
				"nodes": [
					8842,
					8843,
					8844,
					8845,
					5946,
					8846,
					8847
				]
			},
			{
				"speed": 25,
				"name": "Stag Court",
				"nodes": [
					8848,
					8849
				]
			},
			{
				"speed": 25,
				"name": "Old Jamestown Court",
				"nodes": [
					8850,
					8851,
					8852,
					8853,
					8854,
					8855,
					8856,
					8857,
					8858,
					8859,
					8860
				]
			},
			{
				"speed": 25,
				"name": "Frostview Lane",
				"nodes": [
					8861,
					1575,
					8862,
					8863,
					8864,
					5412,
					8865,
					8866,
					2380
				]
			},
			{
				"speed": 25,
				"name": "Kathleen Court",
				"nodes": [
					5516,
					8867,
					8868
				]
			},
			{
				"speed": 25,
				"name": "Forest Creek Drive",
				"nodes": [
					2150,
					8869,
					8870,
					8871,
					8872,
					8873
				]
			},
			{
				"speed": 25,
				"name": "Welwyn Court",
				"nodes": [
					8874,
					8875
				]
			},
			{
				"speed": 25,
				"name": "Pratt Place",
				"nodes": [
					8876,
					8877,
					8878
				]
			},
			{
				"speed": 25,
				"name": "Hartack Court",
				"nodes": [
					8879,
					8880
				]
			},
			{
				"speed": 25,
				"name": "Knoll Creek Drive",
				"nodes": [
					2150,
					8881,
					8882,
					8883,
					8884,
					8885
				]
			},
			{
				"speed": 25,
				"name": "Matlock Drive",
				"nodes": [
					5857,
					8886,
					8887,
					8888,
					5408,
					8889,
					8890,
					8891,
					8892,
					8893,
					8894,
					8895
				]
			},
			{
				"speed": 25,
				"name": "Pratt Place",
				"nodes": [
					8896,
					8897
				]
			},
			{
				"speed": 25,
				"name": "91st Avenue",
				"nodes": [
					8898,
					8899,
					8900,
					8901,
					8902,
					8903,
					8904,
					8905,
					8906,
					8907,
					8908,
					8909,
					8910,
					8911,
					8912
				]
			},
			{
				"speed": 25,
				"name": "Somerset Drive",
				"nodes": [
					4281,
					8913,
					8914,
					8915,
					8916,
					8917,
					8918,
					8919,
					8920,
					8921,
					8922,
					1221
				]
			},
			{
				"speed": 25,
				"name": "Pershall Road",
				"nodes": [
					8923,
					8924
				]
			},
			{
				"speed": 30,
				"name": "Pershall Road",
				"nodes": [
					8925,
					8926,
					5611,
					5694,
					3125,
					1323,
					8927,
					8928,
					8929,
					8930,
					8931,
					8932,
					8933,
					8934,
					8935,
					8936,
					8937
				]
			},
			{
				"speed": 25,
				"name": "Pratt Place",
				"nodes": [
					5055,
					8938,
					8939,
					8940,
					8941,
					8942
				]
			},
			{
				"speed": 25,
				"name": "Beverly Drive",
				"nodes": [
					8943,
					8944,
					8945
				]
			},
			{
				"speed": 35,
				"name": "Charbonier Road",
				"nodes": [
					8946,
					8947,
					8948,
					8949,
					8950,
					8951,
					8952,
					8953,
					8954,
					8955,
					8956,
					8957,
					8958,
					8959,
					8960,
					8961,
					8962,
					8963,
					8964,
					8965,
					8966,
					8967,
					8968,
					8969,
					8970,
					8971,
					8972,
					8973,
					8974,
					8975
				]
			},
			{
				"speed": 25,
				"name": "Parkwood Lane",
				"nodes": [
					8976,
					8977
				]
			},
			{
				"speed": 25,
				"name": "Grandview Gardens Court",
				"nodes": [
					7085,
					8978
				]
			},
			{
				"speed": 25,
				"name": "Sansu Lane",
				"nodes": [
					8979,
					8980,
					8981,
					8982,
					8983,
					8984,
					8985,
					8986,
					8987,
					3064
				]
			},
			{
				"speed": 30,
				"name": "Pershall Road",
				"nodes": [
					8988,
					8989,
					8990,
					8991,
					8992,
					8993,
					8994,
					8995,
					8996,
					8997,
					8998,
					8999,
					9000,
					9001,
					9002,
					9003,
					5708,
					9004,
					9005,
					9006,
					9007,
					9008,
					9009,
					9010,
					9011,
					9012,
					9013,
					87,
					9014,
					9015,
					9016,
					9017,
					9018,
					9019,
					9020
				]
			},
			{
				"speed": 25,
				"name": "El Camino Drive",
				"nodes": [
					9021,
					9022,
					9023,
					9024,
					9025,
					9026,
					9027,
					9028,
					9029,
					9030,
					9031,
					9032,
					9033
				]
			},
			{
				"speed": 25,
				"name": "Bridle Spur Drive",
				"nodes": [
					6477,
					1828
				]
			},
			{
				"speed": 25,
				"name": "Fairway Drive",
				"nodes": [
					5775,
					9034,
					9035,
					9036,
					2209
				]
			},
			{
				"speed": 35,
				"name": "Charbonier Road",
				"nodes": [
					9037,
					9038,
					9039,
					9040,
					9041,
					9042,
					5947,
					8739,
					4074,
					9043,
					9044,
					9045,
					8116,
					9046,
					1435,
					9047,
					416,
					9048,
					3154,
					9049,
					9050,
					9051,
					5306,
					9052,
					4692,
					427,
					9053,
					9054,
					9055,
					3479,
					9056,
					9057,
					9058,
					9059,
					9060,
					9061,
					2615,
					8818,
					9062,
					9063,
					9064,
					9065,
					9066,
					9067,
					9068,
					9069,
					9070,
					9071,
					9072,
					9073,
					9074,
					9075,
					9076,
					9077,
					9078,
					9079,
					9080,
					9081,
					9082,
					9083,
					9084,
					9085,
					8946
				]
			},
			{
				"speed": 35,
				"name": "South New Florissant Road",
				"nodes": [
					1619,
					9086,
					9087,
					9088,
					9089,
					9090,
					9091,
					9092,
					9093,
					1936,
					5948,
					9094,
					5154,
					4722,
					7392,
					2600,
					718,
					2614,
					9095,
					9096,
					9097,
					9098,
					9099
				]
			},
			{
				"speed": 25,
				"name": "Domenique Lane",
				"nodes": [
					9100,
					9101,
					9102,
					9103,
					9104,
					9105,
					9106,
					9107,
					9108,
					9109,
					9110,
					9111,
					9112,
					9113,
					9114,
					9115,
					9100
				]
			},
			{
				"speed": 25,
				"name": "Gifford Court",
				"nodes": [
					9116,
					9117,
					9118,
					9119,
					9120
				]
			},
			{
				"speed": 25,
				"name": "Milbank Drive",
				"nodes": [
					862,
					9121,
					9122,
					6736,
					9123
				]
			},
			{
				"speed": 25,
				"name": "Kenstone Court",
				"nodes": [
					3609,
					9124
				]
			},
			{
				"speed": 25,
				"name": "Leisurewood Court",
				"nodes": [
					9125,
					9126,
					9127,
					9128,
					7487
				]
			},
			{
				"speed": 25,
				"name": "Sparrow Court",
				"nodes": [
					7170,
					9129,
					9130
				]
			},
			{
				"speed": 25,
				"name": "Trask Drive",
				"nodes": [
					9131,
					9132,
					9133,
					9134,
					9135
				]
			},
			{
				"speed": 25,
				"name": "Broadmere Drive",
				"nodes": [
					4125,
					9136,
					9137,
					5970
				]
			},
			{
				"speed": 25,
				"name": "Barwick Lane",
				"nodes": [
					3439,
					9138,
					9139,
					9140,
					9141,
					9142,
					9143,
					9144,
					9145,
					9146,
					9147,
					9148
				]
			},
			{
				"speed": 25,
				"name": "Brackleigh Lane",
				"nodes": [
					9149,
					5427,
					9150
				]
			},
			{
				"speed": 25,
				"name": "Kingsford Drive",
				"nodes": [
					9151,
					9152,
					9153,
					9154,
					9155,
					9156,
					9157,
					9158,
					9159,
					9160,
					9161,
					9162,
					9163,
					9164,
					9165,
					9166,
					5466,
					9167,
					9168,
					9169,
					9170,
					850,
					9171,
					9172,
					9173,
					9174,
					8672,
					9175
				]
			},
			{
				"speed": 25,
				"name": "Serenity Circle",
				"nodes": [
					9176,
					9177,
					9178,
					9179,
					9180,
					9181,
					6787,
					9182,
					9183,
					9184,
					9185,
					9186,
					9187,
					9188,
					9189,
					9190,
					9191,
					9192,
					9193,
					9194,
					9195
				]
			},
			{
				"speed": 25,
				"name": "Bon Vue Drive",
				"nodes": [
					6844,
					9196
				]
			},
			{
				"speed": 25,
				"name": "Gillon Court",
				"nodes": [
					9197,
					9198,
					9199,
					9200,
					9201,
					9202,
					9203,
					9204
				]
			},
			{
				"speed": 25,
				"name": "Blue Spruce Lane",
				"nodes": [
					9205,
					9206,
					9207,
					9208,
					9209,
					9210,
					9211,
					9212,
					9213,
					9214,
					9215,
					9216
				]
			},
			{
				"speed": 25,
				"name": "Midwood Avenue",
				"nodes": [
					2376,
					2738
				]
			},
			{
				"speed": 25,
				"name": "Midwood Avenue",
				"nodes": [
					2377,
					9217,
					9218,
					5085
				]
			},
			{
				"speed": 25,
				"name": "Willow Court",
				"nodes": [
					9219,
					9220,
					9221,
					9222,
					9223,
					9224,
					9225,
					9226,
					9227,
					9228,
					9229,
					9230,
					9231,
					9232,
					9233,
					9234,
					9219
				]
			},
			{
				"speed": 25,
				"name": "Coach Light Lane",
				"nodes": [
					1063,
					9235,
					9236,
					9237,
					9238,
					9239,
					9240,
					9241,
					9242,
					9243
				]
			},
			{
				"speed": 25,
				"name": "Van Crest Lane",
				"nodes": [
					9244,
					9245,
					9246,
					9247,
					6994
				]
			},
			{
				"speed": 25,
				"name": "Midwood Avenue",
				"nodes": [
					5085,
					9248,
					9249,
					9250,
					7773,
					9251,
					9252,
					9253,
					9254
				]
			},
			{
				"speed": 25,
				"name": "Lamplight Lane",
				"nodes": [
					9255,
					9256,
					9257,
					9258,
					9259,
					9260,
					5733,
					9261,
					9262,
					9263,
					9264,
					9265,
					9266,
					9267,
					9268,
					9269,
					9270,
					9271,
					9272,
					9273,
					9274
				]
			},
			{
				"speed": 25,
				"name": "Florentine Court",
				"nodes": [
					9275,
					9276
				]
			},
			{
				"speed": 25,
				"name": "Jamestowne Ridge Court",
				"nodes": [
					9277,
					9278,
					9279,
					9280,
					9281,
					9282,
					9283,
					9284,
					9285,
					9286,
					9287,
					9288,
					9289,
					9290,
					9291,
					9292,
					9277
				]
			},
			{
				"speed": 25,
				"name": "Wooden Drive",
				"nodes": [
					7073,
					9293,
					9294,
					9295,
					9296,
					9297,
					9298,
					9299
				]
			},
			{
				"speed": 25,
				"name": "Luxmore Drive",
				"nodes": [
					1321,
					3122
				]
			},
			{
				"speed": 25,
				"name": "Orleans Lane",
				"nodes": [
					9300,
					9301,
					9302,
					5082,
					9303,
					5182,
					9304
				]
			},
			{
				"speed": 25,
				"name": "Lancaster Court",
				"nodes": [
					2806,
					9305,
					9306,
					9307,
					9308,
					9309
				]
			},
			{
				"speed": 25,
				"name": "Arpent Court",
				"nodes": [
					9310,
					9311,
					9312,
					9313,
					9314,
					9315,
					9316,
					9317,
					9318,
					9319,
					9320,
					9321,
					9322,
					9323,
					9324,
					9325,
					9310
				]
			},
			{
				"speed": 25,
				"name": "Pacific Park Drive",
				"nodes": [
					9326,
					9327,
					9328,
					9329,
					9330,
					9331,
					9332,
					9333,
					9334,
					9335,
					9336,
					9337,
					9338,
					9339,
					9340,
					9341,
					9326
				]
			},
			{
				"speed": 25,
				"name": "Dew Drop Lane",
				"nodes": [
					6645,
					9342,
					9343,
					9344,
					9345,
					9346,
					9347
				]
			},
			{
				"speed": 25,
				"name": "Evelynaire Place",
				"nodes": [
					7029,
					6370,
					9348,
					5074,
					9349,
					9350,
					9351,
					9352
				]
			},
			{
				"speed": 25,
				"name": "Crosby Lane",
				"nodes": [
					608,
					9353
				]
			},
			{
				"speed": 25,
				"name": "Crane Drive",
				"nodes": [
					8483,
					9354,
					1479
				]
			},
			{
				"speed": 25,
				"name": "Saint James Court",
				"nodes": [
					8602,
					9355,
					9356
				]
			},
			{
				"speed": 25,
				"name": "Sunswept Park Drive",
				"nodes": [
					9357,
					9358,
					9359,
					7753,
					9360,
					9361,
					9362,
					9363,
					9364,
					9365,
					9366,
					2503
				]
			},
			{
				"speed": 40,
				"name": "Shackelford Road",
				"nodes": [
					3479,
					9367,
					9368,
					9369,
					9370,
					9371,
					4442,
					7337,
					9372,
					9373,
					9374,
					7496,
					9375,
					9376,
					9377,
					9378,
					9379,
					9380,
					9381,
					9382,
					9383,
					2184,
					4320,
					9384,
					9385,
					9386,
					9387,
					9388,
					9389,
					9390,
					9391,
					9392,
					9393,
					9394,
					9395,
					2504,
					9396,
					9397,
					6466,
					7071,
					9175,
					9398,
					9399,
					9400,
					4390,
					9401,
					9402,
					5855,
					9403,
					2101,
					9404,
					9405,
					9406,
					9407
				]
			},
			{
				"speed": 25,
				"name": "Soundview Court",
				"nodes": [
					9408,
					9409,
					9410,
					9411,
					9412,
					9413,
					9414,
					9415,
					9416,
					9417,
					410
				]
			},
			{
				"speed": 25,
				"name": "High Crest Street",
				"nodes": [
					9418,
					9419,
					9420,
					9421,
					9422,
					9423,
					9424,
					9425,
					9426,
					9427,
					9428,
					9429,
					9430,
					9431,
					9432,
					9433,
					2582
				]
			},
			{
				"speed": 25,
				"name": "Versailles Drive",
				"nodes": [
					9434,
					5178,
					9435,
					9436,
					9437,
					9303,
					9438,
					9439,
					9440,
					9441,
					9442,
					9443,
					9444,
					9445,
					5512
				]
			},
			{
				"speed": 25,
				"name": "Dieckmann Lane",
				"nodes": [
					9446,
					9447,
					9448,
					9449,
					9450,
					9451,
					9452,
					9453,
					9454,
					9455,
					9456,
					9457,
					9458,
					9459,
					9460,
					9461,
					4289,
					9462,
					9463,
					9464,
					9465,
					9466
				]
			},
			{
				"speed": 25,
				"name": "Cambridge Drive",
				"nodes": [
					5367,
					9467,
					9468,
					9469,
					9470,
					9471,
					9472,
					9473,
					9474,
					9475,
					9476,
					9477,
					9478,
					9479,
					9480,
					9481,
					9482,
					5046
				]
			},
			{
				"speed": 25,
				"name": "Grotto Court",
				"nodes": [
					9483,
					9484,
					9485,
					9486,
					9487,
					9488,
					9489,
					9490,
					9491,
					9492
				]
			},
			{
				"speed": 25,
				"name": "Lindsay Lane",
				"nodes": [
					9493,
					9494,
					9495,
					9496,
					9497,
					9498,
					9499,
					9500,
					9501
				]
			},
			{
				"speed": 25,
				"name": "Myrtle Drive",
				"nodes": [
					1573,
					9353,
					5520
				]
			},
			{
				"speed": 25,
				"name": "Rena Court",
				"nodes": [
					9502,
					1826
				]
			},
			{
				"speed": 25,
				"name": "Rose Blossom Lane",
				"nodes": [
					9503,
					9504,
					9505
				]
			},
			{
				"speed": 25,
				"name": "Crestwood Bend Lane",
				"nodes": [
					9506,
					9507,
					9508,
					9509,
					2171,
					9510,
					9511,
					9512,
					9513,
					9514,
					9515
				]
			},
			{
				"speed": 25,
				"name": "Prentice Drive",
				"nodes": [
					1120,
					9516,
					9517,
					9518,
					9519,
					2354,
					9520,
					9521,
					3243,
					1102,
					9522,
					3105,
					9523
				]
			},
			{
				"speed": 25,
				"name": "Lyford Lane",
				"nodes": [
					6743,
					9524,
					9525,
					9526,
					9527,
					9528,
					9529,
					9530,
					4803
				]
			},
			{
				"speed": 25,
				"name": "Holly Lane",
				"nodes": [
					5066,
					9531
				]
			},
			{
				"speed": 25,
				"name": "Cardinal Avenue",
				"nodes": [
					9532,
					3682,
					2718,
					1052
				]
			},
			{
				"speed": 25,
				"name": "Taille de Noyer Drive",
				"nodes": [
					2795,
					9533,
					9534
				]
			},
			{
				"speed": 25,
				"name": "Hackman Drive",
				"nodes": [
					3110,
					1251
				]
			},
			{
				"speed": 25,
				"name": "Gallop Lane",
				"nodes": [
					2524,
					9535,
					9536,
					9537,
					9538,
					9539,
					9540,
					9541
				]
			},
			{
				"speed": 25,
				"name": "Cork Court",
				"nodes": [
					8043,
					9542,
					9543,
					9544,
					9545,
					9546,
					9547,
					9548,
					9549
				]
			},
			{
				"speed": 25,
				"name": "Saint Michael Street",
				"nodes": [
					2787,
					5943,
					3649,
					6185,
					9550
				]
			},
			{
				"speed": 25,
				"name": "Hampshire Drive",
				"nodes": [
					3385,
					2928
				]
			},
			{
				"speed": 25,
				"name": "Boulder Creek Drive",
				"nodes": [
					558,
					2697,
					9551,
					9552,
					9553,
					9554,
					9555,
					9556,
					9557,
					9558,
					253,
					9559,
					543
				]
			},
			{
				"speed": 25,
				"name": "Streatley Road",
				"nodes": [
					9560,
					9561,
					9562,
					9563,
					9564,
					9565,
					9566
				]
			},
			{
				"speed": 25,
				"name": "Nyflot Avenue",
				"nodes": [
					9567,
					3704
				]
			},
			{
				"speed": 25,
				"name": "Manor Drive",
				"nodes": [
					9568,
					9569,
					9570,
					9571
				]
			},
			{
				"speed": 25,
				"name": "Woodlawn Avenue",
				"nodes": [
					9572,
					9573,
					2307
				]
			},
			{
				"speed": 25,
				"name": "Lynn Grove Court",
				"nodes": [
					5617,
					9574
				]
			},
			{
				"speed": 25,
				"name": "Chelsea Drive",
				"nodes": [
					5307,
					9575,
					9576,
					9577,
					9578,
					9579,
					2004,
					9580,
					9581,
					9582,
					9583,
					9584,
					9585,
					9586,
					7395,
					9587,
					9588,
					9589,
					9590,
					9591,
					9592,
					3961
				]
			},
			{
				"speed": 25,
				"name": "Gadbury Drive",
				"nodes": [
					1320,
					3121,
					5687
				]
			},
			{
				"speed": 25,
				"name": "Vandals Drive",
				"nodes": [
					4346,
					9593,
					9594,
					9595,
					9596,
					8609,
					9597
				]
			},
			{
				"speed": 25,
				"name": "Rose Blossom Lane",
				"nodes": [
					1421,
					9598,
					9599,
					9600,
					9601,
					9602,
					9603,
					9604,
					9605,
					9606,
					9607,
					9608,
					9609,
					9505
				]
			},
			{
				"speed": 25,
				"name": "Starlet Drive",
				"nodes": [
					5513,
					9610,
					9611,
					652,
					9612,
					7128
				]
			},
			{
				"speed": 25,
				"name": "Willow Mound Lane",
				"nodes": [
					8444,
					9613,
					9614,
					9615,
					9616
				]
			},
			{
				"speed": 25,
				"name": "Hazelcrest Drive",
				"nodes": [
					9617,
					9618,
					9619,
					9620,
					9621,
					9622,
					9623,
					9624,
					9625,
					9626,
					9627,
					1639,
					9628,
					9629,
					9630,
					9631,
					9632,
					9633,
					9634,
					9635,
					9636,
					4365
				]
			},
			{
				"speed": 25,
				"name": "Rosant Court",
				"nodes": [
					9637,
					9638,
					9639,
					9640,
					9641,
					9642,
					9643,
					9644,
					9645,
					9646,
					2898,
					9647
				]
			},
			{
				"speed": 25,
				"name": "Bridle Path Court",
				"nodes": [
					2336,
					9648,
					9649
				]
			},
			{
				"speed": 25,
				"name": "Dawnview Drive",
				"nodes": [
					3543,
					9650,
					9651,
					9652,
					9653,
					9654,
					9655,
					9656,
					9657,
					9658,
					9659,
					9660,
					9661
				]
			},
			{
				"speed": 25,
				"name": "Keelen Drive",
				"nodes": [
					9662,
					9663,
					9664,
					9665,
					9666,
					9667,
					9668,
					9669,
					6290,
					9131,
					9670,
					9671,
					9672,
					9673,
					9674,
					9675,
					9676,
					9677,
					9678
				]
			},
			{
				"speed": 25,
				"name": "Flamingo Drive",
				"nodes": [
					5638,
					9679,
					9680,
					9681,
					9386
				]
			},
			{
				"speed": 25,
				"name": "Flamingo Drive",
				"nodes": [
					9682,
					9683,
					9684,
					9685,
					4515
				]
			},
			{
				"speed": 25,
				"name": "Flamingo Drive",
				"nodes": [
					9686,
					9687,
					2665
				]
			},
			{
				"speed": 25,
				"name": "Sunland Drive",
				"nodes": [
					9688,
					9689,
					9690
				]
			},
			{
				"speed": 25,
				"name": "Graybrooke Lane",
				"nodes": [
					9691,
					9692
				]
			},
			{
				"speed": 25,
				"name": "Newcastle Drive",
				"nodes": [
					9693,
					9694,
					9695,
					9696
				]
			},
			{
				"speed": 25,
				"name": "Prouhet Farm Road",
				"nodes": [
					7934,
					9697,
					9698,
					9699,
					9700,
					9701,
					9702,
					9703,
					9704
				]
			},
			{
				"speed": 25,
				"name": "David Drive",
				"nodes": [
					9705,
					3638
				]
			},
			{
				"speed": 25,
				"name": "Brookstone Court",
				"nodes": [
					2991,
					9706,
					9707
				]
			},
			{
				"speed": 25,
				"name": "Varnum Drive",
				"nodes": [
					9665,
					9708
				]
			},
			{
				"speed": 25,
				"name": "Avon Drive",
				"nodes": [
					4253,
					9709,
					9710,
					9711,
					9712,
					9713,
					9714,
					9715,
					9716,
					9717,
					9718,
					9719,
					9720,
					9721,
					9722,
					9723,
					9724,
					9725,
					9726,
					9727,
					9728,
					9729,
					9730,
					9731,
					9732,
					9733,
					3513
				]
			},
			{
				"speed": 25,
				"name": "Britlanytown Place",
				"nodes": [
					9734,
					9735,
					9736
				]
			},
			{
				"speed": 25,
				"name": "North Branridge Road",
				"nodes": [
					665,
					9737,
					9738
				]
			},
			{
				"speed": 25,
				"name": "Ville Teresa Lane",
				"nodes": [
					9739,
					9740,
					9741,
					9742,
					9743,
					9744,
					2387
				]
			},
			{
				"speed": 25,
				"name": "Flamingo Drive",
				"nodes": [
					9384,
					9745,
					9746,
					9747,
					9748,
					4571,
					9749,
					9750,
					9751,
					4131,
					9752,
					9753,
					9754,
					896,
					9755,
					9756,
					9757,
					9758,
					9759,
					9760,
					9761,
					9762,
					9763,
					7178,
					9764,
					9765,
					9766,
					9767,
					7861
				]
			},
			{
				"speed": 25,
				"name": "Forest Shadows Drive",
				"nodes": [
					1230,
					9768,
					9769,
					9770,
					9771,
					9772,
					9773,
					9774,
					9775,
					9776,
					9768
				]
			},
			{
				"speed": 25,
				"name": "Chestnut Circle",
				"nodes": [
					1911,
					9777
				]
			},
			{
				"speed": 25,
				"name": "Parmer Drive",
				"nodes": [
					1872,
					9778,
					9779,
					9780,
					9781,
					9782,
					9783,
					9784,
					9785,
					3361
				]
			},
			{
				"speed": 25,
				"name": "Flandre Cove Court",
				"nodes": [
					4243,
					9786,
					9787,
					9788,
					9789,
					8037
				]
			},
			{
				"speed": 25,
				"name": "Freestone Court",
				"nodes": [
					6706,
					9790
				]
			},
			{
				"speed": 40,
				"name": "St Ferdinand St",
				"nodes": [
					9791,
					2138,
					9792,
					9793,
					1606,
					8415,
					9794,
					9795,
					9796,
					9797
				]
			},
			{
				"speed": 25,
				"name": "Maridosa Trail",
				"nodes": [
					9798,
					9799,
					9800,
					9801
				]
			},
			{
				"speed": 25,
				"name": "Borgia Lane",
				"nodes": [
					9802,
					9803,
					9804,
					987
				]
			},
			{
				"speed": 25,
				"name": "Annilo Drive",
				"nodes": [
					7944,
					9805,
					9806,
					9807,
					9808,
					9809,
					9810,
					9021,
					9811,
					9812,
					9813,
					3929
				]
			},
			{
				"speed": 25,
				"name": "Woodsage Drive",
				"nodes": [
					3378,
					9814,
					9815,
					9816,
					9817,
					9818,
					9819,
					9820,
					9821,
					9822,
					9823,
					9824,
					9825,
					9826,
					9827,
					9828,
					9829,
					9830,
					9831,
					9832,
					3396
				]
			},
			{
				"speed": 30,
				"name": "Redman Avenue",
				"nodes": [
					677,
					3679,
					9833,
					9834,
					9835,
					9836,
					1259,
					9837,
					9518,
					9838,
					3992,
					9839,
					1394,
					9840,
					9841
				]
			},
			{
				"speed": 25,
				"name": "Airshire Place",
				"nodes": [
					6843,
					9842,
					9843,
					9844,
					9845,
					9846,
					9847,
					9848,
					6845
				]
			},
			{
				"speed": 25,
				"name": "Shirlene Drive",
				"nodes": [
					9849,
					8481
				]
			},
			{
				"speed": 25,
				"name": "Shirlene Drive",
				"nodes": [
					6140,
					9850,
					9851
				]
			},
			{
				"speed": 25,
				"name": "Fleurie Drive",
				"nodes": [
					9852,
					9853,
					9854,
					9855,
					9856,
					9857,
					9858,
					9859,
					9860,
					9861,
					9862,
					9863,
					9864,
					9865,
					9866,
					9867,
					9852
				]
			},
			{
				"speed": 25,
				"name": "Aqueduct Drive",
				"nodes": [
					967,
					7610,
					8396,
					6690,
					4565,
					3346,
					5977,
					9868
				]
			},
			{
				"speed": 25,
				"name": "Bluegrass Lane",
				"nodes": [
					457,
					1892
				]
			},
			{
				"speed": 25,
				"name": "Airelle Court",
				"nodes": [
					9869,
					9870,
					9871,
					9872,
					9873,
					9874,
					9875,
					9876,
					9877,
					9878,
					9879,
					9880,
					9881,
					9882,
					9883,
					9884,
					9869
				]
			},
			{
				"speed": 25,
				"name": "Campion Lane",
				"nodes": [
					2267,
					6896,
					538,
					9885,
					9886,
					639
				]
			},
			{
				"speed": 25,
				"name": "Sherwood Forest Drive",
				"nodes": [
					7237,
					9887,
					9888,
					9889,
					9890,
					9891,
					9892,
					9893,
					9894,
					9895,
					9896,
					9897,
					9898,
					8895
				]
			},
			{
				"speed": 25,
				"name": "Ville Gloria Lane",
				"nodes": [
					9899,
					9900,
					9901,
					9902,
					9903,
					9904,
					9905,
					9906,
					9907,
					9908,
					9909
				]
			},
			{
				"speed": 25,
				"name": "Logis Lane",
				"nodes": [
					9910,
					9911,
					9912,
					9913,
					9914,
					9915,
					9916,
					9917,
					9918,
					9919,
					9920,
					9638,
					9921,
					9922,
					9923,
					9924
				]
			},
			{
				"speed": 35,
				"name": "Aubuchon Road",
				"nodes": [
					8975,
					9925,
					9926,
					9927,
					9928,
					9929,
					9930,
					9931
				]
			},
			{
				"speed": 25,
				"name": "Carmelita Lane",
				"nodes": [
					9932,
					1851,
					9933,
					9934
				]
			},
			{
				"speed": 25,
				"name": "Castleford Drive",
				"nodes": [
					9725,
					9935,
					8180,
					9936,
					8540,
					9937,
					9938,
					9939,
					9940
				]
			},
			{
				"speed": 25,
				"name": "Northridge Place",
				"nodes": [
					1408,
					9941,
					9942,
					9943,
					9944,
					685,
					9945,
					9946,
					9947,
					9948,
					9541
				]
			},
			{
				"speed": 25,
				"name": "Brittmore Court",
				"nodes": [
					9949,
					9950,
					9951,
					9952,
					9953,
					9954,
					9955,
					9956,
					9957,
					9958,
					9959,
					9960,
					9961,
					9962,
					9963,
					9964,
					9949
				]
			},
			{
				"speed": 25,
				"name": "Bristol Drive",
				"nodes": [
					9965,
					9966
				]
			},
			{
				"speed": 25,
				"name": "Kent Drive",
				"nodes": [
					3521,
					9967,
					9968,
					9969,
					9970,
					9971,
					9972,
					9973,
					9974,
					9975,
					9976,
					9977,
					1854
				]
			},
			{
				"speed": 25,
				"name": "Meadowland Drive",
				"nodes": [
					4704,
					8848,
					6770
				]
			},
			{
				"speed": 25,
				"name": "Dawn Ridge Drive",
				"nodes": [
					6848,
					9978,
					9979,
					9980,
					9981,
					9982,
					9983,
					6847
				]
			},
			{
				"speed": 25,
				"name": "Manowar Drive",
				"nodes": [
					1380,
					9984,
					9985,
					2334
				]
			},
			{
				"speed": 25,
				"name": "Uthe Lane",
				"nodes": [
					8976,
					9566,
					9986
				]
			},
			{
				"speed": 25,
				"name": "Uthe Lane",
				"nodes": [
					9986,
					9987,
					9988,
					9989,
					9990,
					9991,
					9992,
					9993,
					9994,
					9995,
					9996
				]
			},
			{
				"speed": 25,
				"name": "Shadow Rock Drive",
				"nodes": [
					9997,
					9998,
					9999,
					10000,
					10001,
					10002,
					10003,
					5494
				]
			},
			{
				"speed": 25,
				"name": "Freemantle Drive",
				"nodes": [
					10004,
					10005,
					10006,
					10007,
					10008,
					10009,
					10010,
					10011,
					10012,
					10013,
					10014,
					10015,
					10016,
					10017,
					10018,
					10019,
					10020,
					10021,
					10022,
					10023,
					1265,
					10024
				]
			},
			{
				"speed": 25,
				"name": "Aintree Drive",
				"nodes": [
					2542,
					10025,
					10026,
					10027
				]
			},
			{
				"speed": 35,
				"name": "West Washington Street",
				"nodes": [
					3847,
					10028,
					10029,
					10030,
					10031,
					10032,
					10033
				]
			},
			{
				"speed": 25,
				"name": "Winterset Drive",
				"nodes": [
					5000,
					10034,
					10035,
					1128
				]
			},
			{
				"speed": 25,
				"name": "Crest Stone Drive",
				"nodes": [
					8806,
					2988
				]
			},
			{
				"speed": 25,
				"name": "Hallwood Drive",
				"nodes": [
					10036,
					10037,
					6008,
					10038,
					3597,
					10039,
					10040,
					10041,
					10042,
					10043,
					5607
				]
			},
			{
				"speed": 25,
				"name": "Weskan Lane",
				"nodes": [
					10044,
					10045,
					10046,
					10047,
					10048,
					10049,
					10050,
					10051,
					10052,
					10053,
					10054,
					10055,
					10056,
					10057,
					10058,
					10059,
					10060,
					10061,
					10062,
					10063
				]
			},
			{
				"speed": 25,
				"name": "Ville Donna Lane",
				"nodes": [
					10064,
					10065,
					4196,
					10066,
					10067,
					10068,
					10069,
					10070,
					10071,
					10072,
					9739,
					10073,
					10074,
					10075,
					10076,
					10077,
					10078,
					10079,
					2941,
					10080
				]
			},
			{
				"speed": 25,
				"name": "Hallwood Drive",
				"nodes": [
					7076,
					2270,
					4409
				]
			},
			{
				"speed": 25,
				"name": "Weskan Lane",
				"nodes": [
					10063,
					10081,
					10082,
					10083,
					2907,
					2914
				]
			},
			{
				"speed": 25,
				"name": "Guhman Court",
				"nodes": [
					10084,
					10085
				]
			},
			{
				"speed": 25,
				"name": "Acorn Trail Drive",
				"nodes": [
					10086,
					10087,
					10088,
					10089,
					10090,
					10091,
					10092,
					10093,
					10094,
					10095,
					10096,
					10097,
					7296
				]
			},
			{
				"speed": 25,
				"name": "Carmel Court",
				"nodes": [
					10098,
					10099,
					10100,
					10101,
					10102
				]
			},
			{
				"speed": 25,
				"name": "Centorbi Court",
				"nodes": [
					4736,
					10103,
					10104,
					10105,
					10106,
					10107,
					10108
				]
			},
			{
				"speed": 25,
				"name": "Friarwood Drive",
				"nodes": [
					10109,
					10110,
					10111,
					10112,
					9254
				]
			},
			{
				"speed": 25,
				"name": "Saint Francois Street",
				"nodes": [
					2784,
					5939,
					3645,
					10113,
					10114,
					10115,
					10116,
					10117,
					10118,
					10119
				]
			},
			{
				"speed": 25,
				"name": "Cobblestone Creek Court",
				"nodes": [
					10120,
					10121,
					10122,
					10123,
					10124,
					10125
				]
			},
			{
				"speed": 30,
				"name": "Parker Spur",
				"nodes": [
					2543,
					10126,
					10127
				]
			},
			{
				"speed": 25,
				"name": "Saint Edward Lane",
				"nodes": [
					10128,
					10129,
					10130,
					10131,
					10132,
					10133,
					10134
				]
			},
			{
				"speed": 25,
				"name": "Capri Drive",
				"nodes": [
					2257,
					10135,
					10136,
					10137,
					5834
				]
			},
			{
				"speed": 25,
				"name": "Reeb Lane",
				"nodes": [
					9791,
					3935,
					10138,
					10139,
					10140,
					10141,
					10142
				]
			},
			{
				"speed": 25,
				"name": "Danelle Drive",
				"nodes": [
					10143,
					10144,
					10145,
					10146,
					3634
				]
			},
			{
				"speed": 30,
				"name": "North Lafayette Street",
				"nodes": [
					10147,
					2142,
					10148,
					10149,
					1611,
					8417,
					10150,
					10151,
					1111,
					401,
					10152,
					10153
				]
			},
			{
				"speed": 25,
				"name": "Pincay Court",
				"nodes": [
					3264,
					10154
				]
			},
			{
				"speed": 25,
				"name": "Dividend Park Drive",
				"nodes": [
					4383,
					10155,
					10156,
					10157,
					10158,
					7591
				]
			},
			{
				"speed": 25,
				"name": "Luxury Drive",
				"nodes": [
					10159,
					10160,
					10161,
					3908,
					10162,
					10163,
					10164,
					10165,
					10166
				]
			},
			{
				"speed": 25,
				"name": "Buckingham Drive",
				"nodes": [
					4651,
					10167,
					10168,
					10169,
					10170,
					10171,
					10172,
					10173,
					10174,
					10175,
					10176,
					10177,
					10178,
					5314
				]
			},
			{
				"speed": 25,
				"name": "Belmont Terrace",
				"nodes": [
					1896,
					10179,
					10180,
					10181,
					5007,
					10182,
					10183,
					1412
				]
			},
			{
				"speed": 25,
				"name": "Bonnie Court",
				"nodes": [
					9137,
					10184
				]
			},
			{
				"speed": 25,
				"name": "Tealwood Cove Drive",
				"nodes": [
					10086,
					10185,
					10186,
					10187,
					10188,
					10189,
					10190,
					10191,
					10192,
					10193,
					10194,
					10195,
					10196,
					10197,
					10198,
					10199,
					10094
				]
			},
			{
				"speed": 25,
				"name": "English Coach Lane",
				"nodes": [
					8149,
					10200,
					10201,
					10202,
					10203,
					10204,
					10205,
					10206,
					10207,
					10208,
					10209,
					10210,
					10211,
					10212,
					10213,
					10214,
					10215
				]
			},
			{
				"speed": 25,
				"name": "Gott Avenue",
				"nodes": [
					2746,
					6600,
					10216,
					5050,
					5344,
					2760,
					10217
				]
			},
			{
				"speed": 25,
				"name": "Ascot Terrace",
				"nodes": [
					2541,
					10218,
					10219,
					10220,
					10221,
					10222
				]
			},
			{
				"speed": 25,
				"name": "Bay Point Drive",
				"nodes": [
					10223,
					10224,
					10225,
					10226,
					10227,
					10228,
					10229
				]
			},
			{
				"speed": 25,
				"name": "St Madeleine Lane",
				"nodes": [
					954,
					10230,
					10231,
					10232,
					3349
				]
			},
			{
				"speed": 25,
				"name": "Orangedale Lane",
				"nodes": [
					5531,
					10233,
					10234,
					8219,
					10235,
					10236
				]
			},
			{
				"speed": 25,
				"name": "Flagstone Court",
				"nodes": [
					6421,
					10237,
					10238,
					10239
				]
			},
			{
				"speed": 25,
				"name": "Early Morning Drive",
				"nodes": [
					10240,
					10241,
					10242,
					10243,
					10244,
					10245,
					10246,
					10247
				]
			},
			{
				"speed": 25,
				"name": "Birchbark Drive",
				"nodes": [
					492,
					10248,
					10249,
					10250,
					10251
				]
			},
			{
				"speed": 25,
				"name": "Galaxie Drive",
				"nodes": [
					10252,
					6264,
					10253
				]
			},
			{
				"speed": 25,
				"name": "Dove Drive",
				"nodes": [
					4136,
					10254,
					10255,
					10256,
					10257,
					10258,
					10259,
					901
				]
			},
			{
				"speed": 25,
				"name": "Mundy Drive",
				"nodes": [
					8118,
					10260,
					1439,
					10261,
					418
				]
			},
			{
				"speed": 25,
				"name": "Country Club Court",
				"nodes": [
					10262,
					10263,
					10264
				]
			},
			{
				"speed": 25,
				"name": "Woodcrest Drive",
				"nodes": [
					9034,
					10265,
					10266,
					10267,
					10268,
					10269,
					10270,
					6582
				]
			},
			{
				"speed": 25,
				"name": "White Ash Court",
				"nodes": [
					622,
					10271,
					10272,
					10273,
					10274,
					2972
				]
			},
			{
				"speed": 25,
				"name": "Cypress Creek Drive",
				"nodes": [
					5496,
					10275,
					10276,
					10277,
					10278,
					10279,
					10280,
					10281,
					10282,
					10283
				]
			},
			{
				"speed": 25,
				"name": "Latonka Trail",
				"nodes": [
					9840,
					10284,
					7713,
					10285,
					10286,
					10287,
					10288,
					10289,
					10290,
					10291,
					10292,
					10293,
					10294,
					10295
				]
			},
			{
				"speed": 25,
				"name": "Edgemere Court",
				"nodes": [
					3821,
					10296,
					10297,
					10298,
					10299,
					10300
				]
			},
			{
				"speed": 25,
				"name": "Sandy Drive",
				"nodes": [
					6641,
					10301,
					10302,
					10303,
					4523,
					10304,
					10305,
					10306,
					10307,
					10308,
					10309,
					9347
				]
			},
			{
				"speed": 25,
				"name": "Carey Court",
				"nodes": [
					4225,
					10310,
					10311,
					10312
				]
			},
			{
				"speed": 25,
				"name": "Edgestone Court",
				"nodes": [
					3608,
					10313
				]
			},
			{
				"speed": 25,
				"name": "Dove Drive",
				"nodes": [
					10314,
					10315,
					10316,
					7179,
					10317,
					10318,
					10319,
					10320,
					10321,
					10322,
					10323,
					10324,
					10325,
					10326,
					7862
				]
			},
			{
				"speed": 25,
				"name": "Montezuma Drive",
				"nodes": [
					3569,
					10327,
					10328,
					10329,
					10330,
					10331,
					10332,
					10333,
					10334,
					10335,
					10336,
					10337,
					10338,
					10339,
					10340,
					10341,
					10342,
					10343,
					10344,
					10345,
					10346,
					10347,
					10348,
					10349,
					10350,
					10351,
					10352,
					3596
				]
			},
			{
				"speed": 25,
				"name": "Galaxie Drive",
				"nodes": [
					5433,
					9689
				]
			},
			{
				"speed": 25,
				"name": "Claire Drive",
				"nodes": [
					10353,
					10354,
					5926,
					10355,
					10356,
					10357,
					3810,
					10358,
					10359,
					10360,
					10361,
					10362,
					10363,
					10364,
					10365,
					9096
				]
			},
			{
				"speed": 25,
				"name": "Contessa Court",
				"nodes": [
					10366,
					10367,
					10368,
					10369,
					10370,
					10371
				]
			},
			{
				"speed": 25,
				"name": "Gold Finch Drive",
				"nodes": [
					3618,
					10372,
					10373,
					10374,
					10375,
					10376
				]
			},
			{
				"speed": 25,
				"name": "Lees Lane",
				"nodes": [
					3558,
					7249
				]
			},
			{
				"speed": 25,
				"name": "Towering Pines Drive",
				"nodes": [
					1224,
					10377
				]
			},
			{
				"speed": 25,
				"name": "Exacta Court",
				"nodes": [
					10378,
					10379,
					10380,
					10381,
					10382,
					10383,
					10384,
					10385,
					10386
				]
			},
			{
				"speed": 25,
				"name": "Nancy Drive",
				"nodes": [
					6375,
					10387
				]
			},
			{
				"speed": 25,
				"name": "Candlelight Lane",
				"nodes": [
					10388,
					10389,
					10390,
					10391,
					10392,
					10393,
					10394,
					10395,
					10396,
					10397,
					10398,
					10399,
					10400,
					10401,
					10402
				]
			},
			{
				"speed": 25,
				"name": "Royal Oak Drive",
				"nodes": [
					10403,
					10404,
					10405
				]
			},
			{
				"speed": 25,
				"name": "Violet Drive",
				"nodes": [
					6142,
					5077,
					10406,
					10407
				]
			},
			{
				"speed": 25,
				"name": "Heritage Drive",
				"nodes": [
					1322,
					3123
				]
			},
			{
				"speed": 25,
				"name": "Apache Court",
				"nodes": [
					3916,
					10408
				]
			},
			{
				"speed": 25,
				"name": "Seaview Lane",
				"nodes": [
					4161,
					10409,
					10410,
					10411
				]
			},
			{
				"speed": 25,
				"name": "Mohan Drive",
				"nodes": [
					10412,
					10413,
					10414,
					10415,
					10416,
					10417,
					4191
				]
			},
			{
				"speed": 25,
				"name": "Centerbrook Drive",
				"nodes": [
					10418,
					1126,
					10419,
					10420,
					10421,
					3880,
					5069
				]
			},
			{
				"speed": 25,
				"name": "Cedar Knoll Lane",
				"nodes": [
					829,
					10422
				]
			},
			{
				"speed": 25,
				"name": "Turon Court",
				"nodes": [
					10423,
					10424,
					10425,
					10426,
					10427,
					10428,
					10429,
					10430,
					10431,
					10432,
					10433,
					10434,
					10435
				]
			},
			{
				"speed": 30,
				"name": "Mondoubleau Lane",
				"nodes": [
					1741,
					10436,
					10437,
					10438,
					10439,
					7338,
					10440,
					10441,
					10442,
					10443,
					10444,
					10445
				]
			},
			{
				"speed": 25,
				"name": "Cherrydale Drive",
				"nodes": [
					6400,
					7886,
					10446,
					5519
				]
			},
			{
				"speed": 30,
				"name": "Mullanphy Road",
				"nodes": [
					5521,
					10447,
					7132,
					2948,
					8311,
					2673,
					2698,
					10448,
					10449,
					4861,
					5794,
					5596
				]
			},
			{
				"speed": 25,
				"name": "Towering Pines Drive",
				"nodes": [
					10450,
					10451,
					10452,
					10453,
					10454,
					10455,
					10456,
					10457,
					10458,
					10459,
					10377,
					10450
				]
			},
			{
				"speed": 25,
				"name": "Foley Drive",
				"nodes": [
					6292,
					10460,
					10461,
					10462
				]
			},
			{
				"speed": 30,
				"name": "Mondoubleau Lane",
				"nodes": [
					10463,
					2079,
					5475,
					10464,
					10465,
					10466,
					10467,
					10468,
					10469,
					1984,
					10470,
					10471,
					10472,
					10473,
					1741
				]
			},
			{
				"speed": 25,
				"name": "Tedford Court",
				"nodes": [
					4868,
					10474
				]
			},
			{
				"speed": 25,
				"name": "Mullan Drive",
				"nodes": [
					10475,
					10476,
					10477,
					10478,
					10479,
					10480
				]
			},
			{
				"speed": 25,
				"name": "Anglum Road",
				"nodes": [
					2307,
					10481,
					10482,
					10483,
					10484,
					10485,
					10486,
					10487,
					10488,
					10489,
					10490,
					10491,
					10492,
					7688,
					10493,
					2649,
					10494,
					10495,
					10496,
					10497
				]
			},
			{
				"speed": 25,
				"name": "Fort Bellefontaine Road",
				"nodes": [
					10498,
					10499,
					10500,
					10501,
					10502,
					10503,
					10504,
					10505,
					10506,
					9205
				]
			},
			{
				"speed": 25,
				"name": "Acorn Trail",
				"nodes": [
					3683,
					10507,
					10508,
					10509,
					10510,
					10511,
					10512,
					4771
				]
			},
			{
				"speed": 25,
				"name": "Reckamp Drive",
				"nodes": [
					10416,
					10513,
					10514
				]
			},
			{
				"speed": 25,
				"name": "Thornton Abbey Court",
				"nodes": [
					4915,
					10515,
					10516,
					10517,
					10518,
					10519
				]
			},
			{
				"speed": 25,
				"name": "Stafford Lane",
				"nodes": [
					8807,
					10520,
					8812,
					7652
				]
			},
			{
				"speed": 25,
				"name": "Bielfield Court",
				"nodes": [
					10521,
					10522,
					10523,
					10524,
					10525,
					10526,
					10527,
					10528,
					10529,
					10530,
					10531,
					10532,
					10533,
					10534,
					10535,
					10536,
					10521
				]
			},
			{
				"speed": 25,
				"name": "Hallstead Drive",
				"nodes": [
					10537,
					10538,
					10539,
					10540,
					10541,
					10542,
					8934
				]
			},
			{
				"speed": 25,
				"name": "Monterey Drive",
				"nodes": [
					6258,
					10543,
					10544,
					10545,
					4178,
					10546,
					10547,
					10548,
					10549,
					2870
				]
			},
			{
				"speed": 25,
				"name": "Meserta Drive",
				"nodes": [
					8791,
					10550,
					10551,
					4623,
					10552,
					8541,
					5906,
					10553,
					10554,
					10555,
					10556,
					10557,
					10558,
					10559,
					2968
				]
			},
			{
				"speed": 25,
				"name": "Belfast Drive",
				"nodes": [
					3529,
					10560,
					10561,
					10562,
					10563,
					1870,
					10564,
					8578,
					10565,
					10566,
					10567,
					10568,
					2207
				]
			},
			{
				"speed": 25,
				"name": "St Cin Lane",
				"nodes": [
					10569,
					10570,
					10571,
					10572,
					10573,
					10574,
					2662
				]
			},
			{
				"speed": 25,
				"name": "Fort Bellefontaine Road",
				"nodes": [
					9205,
					10575,
					10576,
					10577,
					10578,
					10579,
					10580,
					10581
				]
			},
			{
				"speed": 25,
				"name": "Acorn Trail",
				"nodes": [
					4771,
					10582,
					10583,
					10584,
					10585,
					10586,
					10587,
					10588,
					10589,
					10590,
					10591,
					10592,
					10593,
					10594,
					10086
				]
			},
			{
				"speed": 25,
				"name": "Weatherstone Drive",
				"nodes": [
					10237,
					10595,
					10596,
					6426,
					10597
				]
			},
			{
				"speed": 25,
				"name": "Dauphin Lane",
				"nodes": [
					10598,
					10599,
					10600,
					10601,
					10602,
					10603,
					10604
				]
			},
			{
				"speed": 25,
				"name": "Brightmoor Drive",
				"nodes": [
					4118,
					5968
				]
			},
			{
				"speed": 25,
				"name": "Village Drive North",
				"nodes": [
					197,
					10605,
					10606,
					10607,
					10608,
					10609,
					10610,
					198,
					10611,
					10612,
					10613,
					10614,
					7837
				]
			},
			{
				"speed": 25,
				"name": "Bayhamabby Road",
				"nodes": [
					6912,
					10615,
					665
				]
			},
			{
				"speed": 25,
				"name": "Capitharne Place",
				"nodes": [
					10616,
					10617,
					10618,
					10619,
					10620
				]
			},
			{
				"speed": 25,
				"name": "Galba Drive",
				"nodes": [
					7717,
					10621,
					6984,
					2051,
					10622,
					10623,
					10624,
					10625,
					9597,
					10626
				]
			},
			{
				"speed": 25,
				"name": "Ryan Drive",
				"nodes": [
					6402,
					10627,
					10628,
					5517
				]
			},
			{
				"speed": 25,
				"name": "Greeley Drive",
				"nodes": [
					7006,
					10629,
					10630,
					5805,
					10631
				]
			},
			{
				"speed": 25,
				"name": "Thrush Drive",
				"nodes": [
					3674,
					10632,
					10633,
					10634,
					10635,
					6183,
					10636,
					10637,
					10638,
					10639,
					5773
				]
			},
			{
				"speed": 25,
				"name": "Winsted Place",
				"nodes": [
					9040,
					10640,
					10641,
					10642,
					10643,
					10644,
					10645
				]
			},
			{
				"speed": 25,
				"name": "Riverfront Drive",
				"nodes": [
					10646,
					10647,
					10648
				]
			},
			{
				"speed": 25,
				"name": "Mc Guire Lane",
				"nodes": [
					10649,
					7161
				]
			},
			{
				"speed": 25,
				"name": "Undercliffe Drive",
				"nodes": [
					10650,
					806
				]
			},
			{
				"speed": 25,
				"name": "Tyson Drive",
				"nodes": [
					2699,
					10651,
					10652,
					10653,
					10449
				]
			},
			{
				"speed": 25,
				"name": "St Christina Lane",
				"nodes": [
					7721,
					10654,
					6521,
					2755,
					5022
				]
			},
			{
				"speed": 25,
				"name": "Pueblo Drive",
				"nodes": [
					5247,
					10655,
					2133,
					10656,
					10657,
					2753,
					3791,
					5964
				]
			},
			{
				"speed": 25,
				"name": "Normandie Court",
				"nodes": [
					10658,
					10659,
					10660,
					10661,
					10662,
					10663,
					10664,
					10665,
					10666,
					10667
				]
			},
			{
				"speed": 25,
				"name": "Collier Drive",
				"nodes": [
					5196,
					8482,
					8691,
					1459,
					2130
				]
			},
			{
				"speed": 25,
				"name": "Pelican Island Drive",
				"nodes": [
					10668,
					10669,
					10670,
					10671,
					10672,
					10673,
					10674,
					10675,
					10676,
					10677,
					10678,
					10679,
					10680,
					10681,
					10682,
					10683,
					10684,
					10685,
					10686,
					10687,
					10688,
					10689,
					10690,
					10691,
					10692,
					876
				]
			},
			{
				"speed": 25,
				"name": "Steed Court",
				"nodes": [
					10693,
					10694,
					10695
				]
			},
			{
				"speed": 25,
				"name": "Surrey Drive",
				"nodes": [
					1130,
					5725,
					6655,
					3564,
					10696,
					10697,
					10698,
					10699,
					10700
				]
			},
			{
				"speed": 25,
				"name": "Outlook Drive",
				"nodes": [
					676
				]
			},
			{
				"speed": 25,
				"name": "Woodcrest Lane",
				"nodes": [
					10701,
					10702,
					10703,
					10704,
					10705,
					10706,
					10707,
					10708,
					10709,
					10710,
					10711,
					10712,
					10713,
					10714,
					10715,
					10716,
					10717,
					10718,
					10719,
					10720,
					10721,
					10722,
					10723,
					10724,
					10725,
					10726,
					10727,
					10728,
					10729,
					10730,
					10731,
					10732,
					10733,
					10734
				]
			},
			{
				"speed": 25,
				"name": "St Stanislaus Court",
				"nodes": [
					10735,
					10736,
					10737,
					10738,
					10739,
					10740,
					10741,
					10742,
					10743,
					10744,
					10745,
					10746,
					10747,
					10748,
					10749,
					10750,
					10735
				]
			},
			{
				"speed": 25,
				"name": "Spruce Drive",
				"nodes": [
					10751,
					10752,
					10753,
					7501,
					10754,
					10755,
					10756,
					10757
				]
			},
			{
				"speed": 25,
				"name": "Undercliffe Drive",
				"nodes": [
					806,
					10758,
					10759,
					10760,
					10761,
					10762,
					10763,
					10764,
					10765,
					10766,
					2338,
					1166,
					6346
				]
			},
			{
				"speed": 25,
				"name": "Shorewood Drive",
				"nodes": [
					9151,
					10767,
					10768,
					10769,
					10770,
					10771,
					5444,
					10772,
					10773,
					817,
					10774,
					10775,
					10776,
					10777,
					10778,
					10779,
					10780,
					10781,
					10782,
					10783
				]
			},
			{
				"speed": 25,
				"name": "Saint Benedict Lane",
				"nodes": [
					1777,
					10784,
					10785,
					10786,
					10787,
					10788,
					10789,
					10790,
					10791,
					10792,
					1780
				]
			},
			{
				"speed": 25,
				"name": "Wren Drive",
				"nodes": [
					3233,
					10793,
					10794,
					9301,
					10795,
					10796,
					10797,
					5515,
					10798,
					646
				]
			},
			{
				"speed": 25,
				"name": "Perham Drive",
				"nodes": [
					3919,
					10799,
					10800,
					10801,
					10802,
					10803,
					1261
				]
			},
			{
				"speed": 25,
				"name": "Town and Country Place",
				"nodes": [
					2439,
					10804,
					10805,
					10806,
					10807,
					10808,
					10809,
					10810,
					475
				]
			},
			{
				"speed": 25,
				"name": "Trotterway Drive",
				"nodes": [
					2523,
					10811,
					10812,
					10813,
					10814,
					10815,
					9943,
					3337,
					10816,
					10817,
					10818,
					736,
					10819,
					10820,
					10821,
					1674,
					10822
				]
			},
			{
				"speed": 25,
				"name": "Town and Country Place",
				"nodes": [
					475,
					10823,
					10824,
					10825,
					10826,
					10827,
					10402,
					9243,
					10828,
					10829,
					10830,
					10831,
					10832,
					10833,
					10834,
					10835,
					10836,
					7632
				]
			},
			{
				"speed": 25,
				"name": "Auriesville Lane",
				"nodes": [
					4197,
					10837,
					10838,
					10839,
					10840,
					10841,
					10842,
					10843,
					10844,
					10845,
					10846,
					10847,
					10848,
					10849,
					10850,
					10851,
					10852,
					10853,
					10854,
					10855,
					10856,
					10857,
					10858,
					10859,
					10860
				]
			},
			{
				"speed": 25,
				"name": "Cloverfield Trail",
				"nodes": [
					10286,
					10861,
					9798,
					10862,
					10863,
					10864
				]
			},
			{
				"speed": 25,
				"name": "Saint Jean Street",
				"nodes": [
					6947,
					1108,
					398,
					10865,
					10866,
					4890,
					10867,
					10868,
					10869,
					779,
					1661,
					10870,
					10871,
					10872,
					10873,
					10874,
					7488
				]
			},
			{
				"speed": 25,
				"name": "Club Grounds South Drive",
				"nodes": [
					3600,
					10875,
					10876,
					10877,
					10878,
					10879,
					10880,
					10881,
					10882,
					10883,
					10884,
					10885,
					10886,
					2209
				]
			},
			{
				"speed": 25,
				"name": "Chartley Drive",
				"nodes": [
					10887,
					10888,
					1774,
					2052,
					10889,
					10890,
					10891,
					10892,
					10893,
					10894,
					10895
				]
			},
			{
				"speed": 25,
				"name": "Chapel Cross Drive",
				"nodes": [
					3215,
					10896,
					3132
				]
			},
			{
				"speed": 25,
				"name": "Whirlaway Drive",
				"nodes": [
					1382,
					10897,
					2335
				]
			},
			{
				"speed": 25,
				"name": "Spring Forest Lane",
				"nodes": [
					5766,
					10898,
					10899,
					10900,
					10901,
					1766
				]
			},
			{
				"speed": 25,
				"name": "Foxrun Drive",
				"nodes": [
					2792,
					10902,
					4967,
					10903,
					10904,
					2958
				]
			},
			{
				"speed": 25,
				"name": "Heather Trail Drive",
				"nodes": [
					10905,
					10906,
					10907,
					10908,
					10909,
					10910,
					10911,
					10912,
					10913,
					10914,
					10915
				]
			},
			{
				"speed": 25,
				"name": "Charlotte Drive",
				"nodes": [
					10916,
					10917
				]
			},
			{
				"speed": 25,
				"name": "Bardot Drive",
				"nodes": [
					10918,
					5510
				]
			},
			{
				"speed": 25,
				"name": "Pinecone Trail",
				"nodes": [
					10919,
					10920,
					10921,
					10922,
					10923,
					10924,
					10925,
					10926,
					10927,
					10928,
					10929,
					10930,
					10931,
					10932,
					10933,
					10934,
					10919
				]
			},
			{
				"speed": 25,
				"name": "Spring Forest Lane",
				"nodes": [
					783,
					10935,
					10936,
					10937,
					10938,
					10939,
					10940,
					10941,
					10942,
					10943,
					10944,
					10945,
					10946,
					5766
				]
			},
			{
				"speed": 25,
				"name": "Bensonhurst Drive",
				"nodes": [
					10004,
					10947,
					10948,
					10949,
					10950,
					10951,
					10952,
					10953,
					10954,
					10955,
					10956,
					10957,
					10958,
					10959,
					10960,
					10961,
					10962,
					10963,
					10964,
					8610
				]
			},
			{
				"speed": 25,
				"name": "Longhenrich Drive",
				"nodes": [
					10965,
					7671,
					10966,
					10967,
					10968,
					10969,
					3946
				]
			},
			{
				"speed": 25,
				"name": "St Albert Lane",
				"nodes": [
					3864,
					10970,
					10971,
					10972,
					10973
				]
			},
			{
				"speed": 25,
				"name": "Byram Drive",
				"nodes": [
					10974,
					10975
				]
			},
			{
				"speed": 25,
				"name": "Retford Drive",
				"nodes": [
					4266,
					10976,
					10977,
					10978,
					10979,
					10980,
					10981,
					10982,
					10983,
					9940
				]
			},
			{
				"speed": 25,
				"name": "Saille Court",
				"nodes": [
					10984,
					10985
				]
			},
			{
				"speed": 25,
				"name": "Montclair Court",
				"nodes": [
					10136,
					10986,
					10987
				]
			},
			{
				"speed": 25,
				"name": "Rivoli Place",
				"nodes": [
					3239,
					2894,
					10988,
					10795,
					10989,
					5083,
					10990,
					9443
				]
			},
			{
				"speed": 25,
				"name": "Boehner Avenue",
				"nodes": [
					10991,
					5049,
					5343,
					2759,
					10992
				]
			},
			{
				"speed": 25,
				"name": "Urbandale Drive",
				"nodes": [
					10993,
					10994,
					10995,
					10996,
					10997,
					10998,
					10999,
					11000,
					11001,
					11002,
					11003,
					6460
				]
			},
			{
				"speed": 25,
				"name": "Plum Tree Circle",
				"nodes": [
					1763,
					11004,
					11005,
					11006,
					11007,
					11008,
					11009,
					11010,
					11011,
					11012,
					11013,
					11014,
					11015,
					11016,
					11017,
					11018,
					11019,
					1768
				]
			},
			{
				"speed": 25,
				"name": "Boone Street",
				"nodes": [
					11020,
					2144,
					11021,
					11022,
					1613,
					8418,
					11023,
					11024,
					1113,
					403,
					11025
				]
			},
			{
				"speed": 25,
				"name": "Thrush Lane",
				"nodes": [
					3640,
					3793,
					9749
				]
			},
			{
				"speed": 25,
				"name": "Fatima Court",
				"nodes": [
					11026,
					11027,
					11028
				]
			},
			{
				"speed": 25,
				"name": "Cheyenne Drive",
				"nodes": [
					5467,
					11029,
					11030,
					4860,
					11031,
					11032,
					1721,
					11033,
					11034,
					11035,
					11036,
					2747,
					11037,
					11038,
					2132,
					11039,
					5245
				]
			},
			{
				"speed": 25,
				"name": "Marlac Drive",
				"nodes": [
					2381,
					11040
				]
			},
			{
				"speed": 25,
				"name": "Santa Anita Court",
				"nodes": [
					1412,
					11041
				]
			},
			{
				"speed": 25,
				"name": "Colt Circle",
				"nodes": [
					2534,
					11042
				]
			},
			{
				"speed": 25,
				"name": "Urbandale Drive",
				"nodes": [
					6443,
					11043,
					11044,
					11045,
					4524,
					11046,
					11047,
					11048,
					11049,
					11050,
					10993
				]
			},
			{
				"speed": 25,
				"name": "Yearling Drive",
				"nodes": [
					2537,
					11051,
					11052,
					11053,
					11054,
					11055,
					10222
				]
			},
			{
				"speed": 25,
				"name": "Birch Hill Drive",
				"nodes": [
					3955,
					11056,
					11057,
					11058,
					11059,
					11060,
					11061,
					11062,
					11063,
					11064,
					11065,
					11066,
					11067,
					11068,
					11069,
					3959
				]
			},
			{
				"speed": 25,
				"name": "Lockwig Trail",
				"nodes": [
					10284,
					11070
				]
			},
			{
				"speed": 25,
				"name": "Krause Hill Place",
				"nodes": [
					11071,
					11072,
					11073,
					11074,
					11075,
					11076,
					11077,
					11078,
					11079,
					11080,
					11081,
					11082,
					11083,
					11084,
					11085,
					11086,
					11087,
					11088
				]
			},
			{
				"speed": 25,
				"name": "Ville Anita Court",
				"nodes": [
					11089,
					11090,
					11091,
					11092,
					11093,
					11094,
					11095,
					11096,
					11097,
					11098,
					11099,
					11100,
					11101,
					11102,
					11103,
					11104,
					11089
				]
			},
			{
				"speed": 25,
				"name": "Concord Court",
				"nodes": [
					4659,
					11105,
					11106,
					11107,
					11108
				]
			},
			{
				"speed": 25,
				"name": "Bondurante Drive",
				"nodes": [
					11109,
					4938,
					3214,
					11110,
					2099,
					5379,
					11111,
					10887,
					11112,
					11113
				]
			},
			{
				"speed": 25,
				"name": "Skylark Drive",
				"nodes": [
					3234,
					11114,
					11115,
					9300,
					10988
				]
			},
			{
				"speed": 25,
				"name": "Timberwood Crossing Drive",
				"nodes": [
					11116,
					11117,
					11118,
					11119,
					11120,
					11121,
					11122,
					11123,
					11124,
					11125,
					11126,
					11127,
					11128,
					11129,
					11130,
					11131,
					4637,
					11132,
					11133,
					11134,
					11135,
					11136,
					11137,
					11138,
					11139,
					11140,
					11141,
					11142
				]
			},
			{
				"speed": 25,
				"name": "Conza Drive",
				"nodes": [
					11143,
					11144,
					2073
				]
			},
			{
				"speed": 25,
				"name": "Ville Maura Lane",
				"nodes": [
					11145,
					11146,
					11147,
					11148,
					11149,
					11150,
					11151,
					11152,
					11153,
					11154
				]
			},
			{
				"speed": 25,
				"name": "Sunset Park Drive",
				"nodes": [
					9392,
					11155,
					11156,
					11157,
					11158,
					11159,
					11160,
					11161,
					11162,
					11163,
					11164,
					11165,
					11166,
					11167,
					11168,
					11169,
					11170,
					11171,
					11172,
					11173
				]
			},
			{
				"speed": 25,
				"name": "Chartley Lane",
				"nodes": [
					11174,
					11175,
					11176,
					11177,
					11178,
					11179,
					11180,
					11181,
					11182,
					11183,
					11184,
					11185
				]
			},
			{
				"speed": 25,
				"name": "Merri Lane",
				"nodes": [
					9501,
					11186,
					11187,
					11188,
					11189,
					11190,
					11191,
					11192,
					11193,
					11194,
					11195,
					11196,
					11197,
					11198,
					11199,
					11200
				]
			},
			{
				"speed": 25,
				"name": "Worchester Drive",
				"nodes": [
					8410,
					11201,
					1273
				]
			},
			{
				"speed": 25,
				"name": "Sullivan Oaks Place",
				"nodes": [
					11202,
					11203
				]
			},
			{
				"speed": 25,
				"name": "Sackett Drive",
				"nodes": [
					10514,
					11204,
					11205,
					4189
				]
			},
			{
				"speed": 25,
				"name": "Windsong Court",
				"nodes": [
					11206,
					11207,
					11208,
					11209,
					11210,
					11211
				]
			},
			{
				"speed": 25,
				"name": "Kennewick Drive",
				"nodes": [
					4919,
					11212,
					11213,
					1296,
					10418,
					10035
				]
			},
			{
				"speed": 25,
				"name": "Garnier Court",
				"nodes": [
					6895,
					11214
				]
			},
			{
				"speed": 25,
				"name": "Cherokee Trail Lane",
				"nodes": [
					11215,
					11216,
					11217,
					11218,
					10589
				]
			},
			{
				"speed": 25,
				"name": "Ville Angela Lane",
				"nodes": [
					9909,
					11219,
					11220,
					11221,
					11222,
					11223,
					11224,
					11225,
					11154
				]
			},
			{
				"speed": 25,
				"name": "Battlefield Drive",
				"nodes": [
					11226,
					11227,
					11228,
					11229,
					11230,
					11231,
					11232,
					11233,
					11234,
					11235,
					11236,
					11237,
					11238,
					11239,
					11240,
					11241,
					11226
				]
			},
			{
				"speed": 25,
				"name": "Club Grounds Drive",
				"nodes": [
					3567,
					11242,
					11243,
					3566
				]
			},
			{
				"speed": 25,
				"name": "Ken Lane",
				"nodes": [
					7323,
					11244,
					11245
				]
			},
			{
				"speed": 25,
				"name": "Sandycreek Court",
				"nodes": [
					4750,
					11246
				]
			},
			{
				"speed": 25,
				"name": "La Sierra Drive",
				"nodes": [
					11247,
					11248,
					11249,
					11250,
					11251,
					11252,
					11253,
					11254,
					11255,
					11256,
					11257,
					11258,
					11259,
					11260,
					11261,
					1737
				]
			},
			{
				"speed": 25,
				"name": "Herbst Drive",
				"nodes": [
					8303,
					11262,
					11263,
					11264,
					11265,
					4435
				]
			},
			{
				"speed": 25,
				"name": "Pastoral Court",
				"nodes": [
					7730,
					11266
				]
			},
			{
				"speed": 25,
				"name": "Ridge Drive",
				"nodes": [
					8835,
					4774,
					2373,
					11267,
					8797
				]
			},
			{
				"speed": 25,
				"name": "Sir Lords Lane",
				"nodes": [
					3778,
					11268,
					11269,
					11270,
					4476,
					11271,
					11272,
					11273,
					11274,
					11275,
					11276,
					11277,
					11278,
					11279,
					11280
				]
			},
			{
				"speed": 25,
				"name": "Loyola Drive",
				"nodes": [
					11281,
					11282,
					11283,
					2260,
					11284,
					11285,
					11286,
					11287,
					11288,
					6892,
					11289,
					9802,
					11290,
					11291,
					11292,
					532,
					11293,
					11294,
					11295
				]
			},
			{
				"speed": 25,
				"name": "Birkemeier Drive",
				"nodes": [
					2721,
					11296,
					11297,
					11298,
					11299,
					11300,
					11301,
					11302,
					11303,
					11304,
					11305,
					11306,
					11307,
					11308,
					4733
				]
			},
			{
				"speed": 25,
				"name": "Ocala Place",
				"nodes": [
					9043,
					11309,
					11310,
					11311,
					11312,
					11313
				]
			},
			{
				"speed": 25,
				"name": "Goodness Court",
				"nodes": [
					4633,
					11314,
					11315,
					11316,
					11317,
					11318,
					11319
				]
			},
			{
				"speed": 25,
				"name": "Pritchard Drive",
				"nodes": [
					1253,
					11320,
					1119,
					11321,
					11322,
					9838
				]
			},
			{
				"speed": 25,
				"name": "Saint Joseph Street",
				"nodes": [
					404,
					5942,
					3648,
					6184,
					11323,
					11324,
					11325,
					7251,
					11326
				]
			},
			{
				"speed": 25,
				"name": "Jacklin Court",
				"nodes": [
					1575,
					11327,
					8655
				]
			},
			{
				"speed": 25,
				"name": "Birkemeier Drive",
				"nodes": [
					4733,
					2736,
					11328,
					11329,
					11330,
					11331
				]
			},
			{
				"speed": 25,
				"name": "Gist Road",
				"nodes": [
					11332,
					11333,
					2845,
					11334,
					11335,
					11336,
					11337,
					432,
					11338
				]
			},
			{
				"speed": 25,
				"name": "Key Gardens Drive",
				"nodes": [
					11339,
					11340,
					11341,
					11342,
					11343,
					11344,
					11345,
					11346,
					11347,
					11348,
					11349,
					11350,
					11351,
					11352,
					11353,
					11354,
					11355,
					11356
				]
			},
			{
				"speed": 25,
				"name": "Trinity Lane",
				"nodes": [
					11357,
					11358,
					11359,
					11360,
					11361
				]
			},
			{
				"speed": 25,
				"name": "Saint Pious Court",
				"nodes": [
					11362,
					11363
				]
			},
			{
				"speed": 25,
				"name": "Saddlespur Lane",
				"nodes": [
					2521,
					11364,
					11365,
					11366,
					11367,
					11368,
					11369,
					3332,
					11370
				]
			},
			{
				"speed": 25,
				"name": "Jean Drive",
				"nodes": [
					11371,
					11372,
					11373
				]
			},
			{
				"speed": 25,
				"name": "Jean Drive",
				"nodes": [
					11374,
					11375,
					11376,
					11377,
					11373,
					11378,
					11379,
					11380
				]
			},
			{
				"speed": 25,
				"name": "Justice Road",
				"nodes": [
					11381,
					4326,
					2456,
					11382,
					11383,
					11384,
					11385,
					1209,
					11386,
					11387,
					11388
				]
			},
			{
				"speed": 25,
				"name": "Newgate Drive",
				"nodes": [
					4882,
					11389,
					11390,
					11391,
					11392,
					4888
				]
			},
			{
				"speed": 25,
				"name": "Francisca Drive",
				"nodes": [
					11393,
					11394,
					11395,
					11396,
					4177,
					11397,
					11398,
					1247,
					11399,
					11400,
					11401,
					11402,
					11403
				]
			},
			{
				"speed": 25,
				"name": "Rue St Antoine",
				"nodes": [
					11404,
					9796
				]
			},
			{
				"speed": 25,
				"name": "Harrison Street",
				"nodes": [
					11405,
					11406,
					9792,
					11407,
					6943,
					11408,
					8339,
					10148,
					8076,
					11021,
					2782,
					5936,
					3642,
					11409
				]
			},
			{
				"speed": 25,
				"name": "Monte Drive",
				"nodes": [
					912,
					11410,
					2691
				]
			},
			{
				"speed": 25,
				"name": "Justice Road",
				"nodes": [
					1304,
					11411,
					11412,
					11413,
					10378,
					11414,
					3259,
					11415,
					11416,
					11417,
					11388
				]
			},
			{
				"speed": 25,
				"name": "Bradshaw Drive",
				"nodes": [
					6923,
					11418
				]
			},
			{
				"speed": 25,
				"name": "Saint Nicholas Lane",
				"nodes": [
					5951,
					11419,
					11420,
					11421,
					11422,
					11423,
					11424,
					11425,
					11426,
					11427,
					11428,
					5956
				]
			},
			{
				"speed": 25,
				"name": "Jamestown Bay Drive",
				"nodes": [
					11429,
					11430,
					11431,
					11432,
					11433,
					11434,
					11435,
					11436
				]
			},
			{
				"speed": 25,
				"name": "Hazelwest Court",
				"nodes": [
					4982,
					11437,
					11438,
					11439,
					11440
				]
			},
			{
				"speed": 25,
				"name": "Northridge Hills Court",
				"nodes": [
					11441,
					11442,
					11443
				]
			},
			{
				"speed": 25,
				"name": "Monopoly Drive",
				"nodes": [
					11444,
					11445,
					11446,
					11447,
					11448,
					11449,
					11450,
					11451,
					11452
				]
			},
			{
				"speed": 30,
				"name": "Queen Ann Lane",
				"nodes": [
					11453,
					11454,
					991,
					10084,
					11455,
					804,
					11456
				]
			},
			{
				"speed": 25,
				"name": "Monte Drive",
				"nodes": [
					2689,
					11457,
					11458,
					11459,
					11460,
					11461,
					11462,
					11463,
					2446
				]
			},
			{
				"speed": 25,
				"name": "92nd Avenue",
				"nodes": [
					8912,
					11464,
					11465,
					11466,
					11467,
					11468,
					11469,
					11470,
					11471,
					11472,
					11473,
					11474,
					11475,
					11476,
					11477,
					11478,
					11479,
					8905
				]
			},
			{
				"speed": 25,
				"name": "Niehaus Lane",
				"nodes": [
					4925,
					11480
				]
			},
			{
				"speed": 40,
				"name": "Graham Road",
				"nodes": [
					9791,
					11481,
					11482,
					11483,
					6498,
					11484
				]
			},
			{
				"speed": 25,
				"name": "Nashua Drive",
				"nodes": [
					5561,
					11485,
					11486,
					11487,
					11488,
					11489,
					11490,
					11491,
					11492,
					1913
				]
			},
			{
				"speed": 25,
				"name": "Tanner Drive",
				"nodes": [
					9666
				]
			},
			{
				"speed": 25,
				"name": "Tanner Drive",
				"nodes": [
					9668,
					11493
				]
			},
			{
				"speed": 40,
				"name": "?",
				"nodes": [
					11494,
					11495,
					9037,
					11496,
					11497,
					11498,
					9493,
					5530,
					11499,
					11500
				]
			},
			{
				"speed": 25,
				"name": "Broadridge Drive",
				"nodes": [
					8473,
					11501,
					11502,
					6028,
					11503,
					11504,
					11505
				]
			},
			{
				"speed": 25,
				"name": "Hidden Cove Lane",
				"nodes": [
					11506,
					11507,
					11508,
					11509,
					11510,
					11511,
					11512,
					11513,
					6687
				]
			},
			{
				"speed": 25,
				"name": "Norine Court",
				"nodes": [
					9044,
					11514,
					11515,
					11516
				]
			},
			{
				"speed": 25,
				"name": "Marburn Lane",
				"nodes": [
					6741,
					11517,
					11518,
					11519,
					11520,
					11521,
					11522,
					11523,
					11524,
					11525,
					11526,
					11527,
					11528,
					6742
				]
			},
			{
				"speed": 25,
				"name": "Garrett Road",
				"nodes": [
					11529,
					11530,
					11531
				]
			},
			{
				"speed": 25,
				"name": "Sprinters Row Drive",
				"nodes": [
					11532,
					11533,
					11534,
					11535,
					11536,
					11537,
					11538,
					11539,
					11540,
					11541,
					11542,
					11543,
					11544,
					11545,
					11546,
					11547,
					11532
				]
			},
			{
				"speed": 25,
				"name": "St Patrice Lane",
				"nodes": [
					11548,
					11549,
					11550,
					11551,
					11552,
					5927,
					11553,
					11554,
					11555,
					11556,
					11557
				]
			},
			{
				"speed": 25,
				"name": "Rottingdean Drive",
				"nodes": [
					11558,
					11559
				]
			},
			{
				"speed": 25,
				"name": "Bruce Drive",
				"nodes": [
					11560,
					11561,
					11562,
					11494
				]
			},
			{
				"speed": 25,
				"name": "Courtesy Lane",
				"nodes": [
					11563,
					7799
				]
			},
			{
				"speed": 25,
				"name": "Estates Drive",
				"nodes": [
					11564,
					11565,
					11566,
					11567,
					11568,
					5774
				]
			},
			{
				"speed": 25,
				"name": "Sassafras Manor",
				"nodes": [
					11569,
					11570,
					11571,
					11572,
					11573,
					11574,
					11575,
					11576,
					11577,
					11578
				]
			},
			{
				"speed": 25,
				"name": "Sunridge Lane",
				"nodes": [
					9042,
					8845
				]
			},
			{
				"speed": 25,
				"name": "Morningaire Circle",
				"nodes": [
					11579,
					11580,
					11581,
					11582
				]
			},
			{
				"speed": 25,
				"name": "Loekes Drive",
				"nodes": [
					11583,
					11584,
					11585,
					11586,
					11587,
					11588,
					11589,
					11590,
					11591,
					11592,
					11593,
					11594,
					11595,
					10645,
					11596,
					11597,
					11598,
					11599,
					11600,
					11601,
					11602,
					11603,
					11604,
					11605,
					8744,
					11606,
					11607,
					11608,
					11609,
					11610,
					11611,
					11612,
					11613,
					11614,
					11313,
					11615,
					11616,
					11617,
					11618,
					11619,
					11620,
					11621,
					11622,
					11623,
					11624,
					11625,
					11626,
					11627,
					11628
				]
			},
			{
				"speed": 25,
				"name": "Naomi Avenue",
				"nodes": [
					11629,
					11630,
					11631,
					11632,
					11633,
					11634,
					11635,
					11636,
					11637,
					11638,
					11639,
					11640,
					11641,
					11642,
					11643,
					11644,
					11645,
					8364
				]
			},
			{
				"speed": 25,
				"name": "Grand National Court",
				"nodes": [
					11646,
					11647
				]
			},
			{
				"speed": 30,
				"name": "Lynn Haven Lane",
				"nodes": [
					8082,
					11648,
					11649,
					11650,
					11651,
					11652,
					11653,
					11654,
					11655,
					11656,
					2439
				]
			},
			{
				"speed": 25,
				"name": "Rudelle Drive",
				"nodes": [
					11657,
					11658,
					11659,
					11660
				]
			},
			{
				"speed": 25,
				"name": "Bobbins Lane",
				"nodes": [
					2035,
					11661
				]
			},
			{
				"speed": 25,
				"name": "Greentree Drive",
				"nodes": [
					11662,
					11663
				]
			},
			{
				"speed": 25,
				"name": "Kendelwood Drive",
				"nodes": [
					11664,
					11665,
					11666,
					5069
				]
			},
			{
				"speed": 25,
				"name": "Jenkee Drive",
				"nodes": [
					9371,
					11667,
					11668,
					11669,
					11670,
					11671,
					11672,
					11673,
					11206,
					11674,
					11675,
					3613,
					11676,
					11677,
					11678,
					11679,
					6700,
					4145,
					11680,
					11681,
					11682,
					11683,
					11684,
					11685,
					11686,
					11687,
					8779
				]
			},
			{
				"speed": 25,
				"name": "Borden Drive",
				"nodes": [
					11688,
					11689,
					11690,
					11691,
					5377,
					11692,
					1920,
					1528
				]
			},
			{
				"speed": 25,
				"name": "Cricket Court",
				"nodes": [
					4281,
					11693,
					11694,
					11695,
					11696,
					11697,
					11698,
					11699,
					11700,
					11701,
					11702,
					11703,
					11704
				]
			},
			{
				"speed": 25,
				"name": "Covington Court",
				"nodes": [
					11705,
					8384
				]
			},
			{
				"speed": 25,
				"name": "Hazelwood Lane",
				"nodes": [
					11706,
					6842
				]
			},
			{
				"speed": 30,
				"name": "Saint Denis Street",
				"nodes": [
					9493,
					11707
				]
			},
			{
				"speed": 25,
				"name": "Gerardini Drive",
				"nodes": [
					5589,
					11708,
					2072,
					11709,
					11710,
					11711
				]
			},
			{
				"speed": 25,
				"name": "Stonebury Court",
				"nodes": [
					57,
					11712,
					11713,
					11714,
					11715
				]
			},
			{
				"speed": 25,
				"name": "Chapel Ridge Drive",
				"nodes": [
					11716,
					11717,
					11718,
					11719,
					11720,
					11721,
					11722,
					11723,
					11724,
					11725,
					11726,
					11727,
					11728,
					11729,
					11730
				]
			},
			{
				"speed": 25,
				"name": "Tall Tree Court",
				"nodes": [
					5761,
					11731,
					11732
				]
			},
			{
				"speed": 25,
				"name": "Cherry Blossom Court",
				"nodes": [
					5706,
					11733,
					11734
				]
			},
			{
				"speed": 25,
				"name": "Zurich Drive",
				"nodes": [
					863,
					11735,
					6737
				]
			},
			{
				"speed": 25,
				"name": "Flora Lane",
				"nodes": [
					4744,
					9934,
					1447,
					982,
					11736,
					9275,
					11737,
					745,
					1451,
					11738,
					11739,
					11740,
					11741,
					11742,
					11743,
					11744,
					11745,
					4745,
					8847
				]
			},
			{
				"speed": 25,
				"name": "Mendocina Court",
				"nodes": [
					6238,
					11746,
					11747,
					11748,
					11749,
					11750,
					11751,
					11752,
					11753,
					11748
				]
			},
			{
				"speed": 25,
				"name": "Knollwood Pkwy Drive",
				"nodes": [
					2986,
					11754,
					11755,
					11756,
					11757,
					11758,
					11759
				]
			},
			{
				"speed": 25,
				"name": "Loekes Drive",
				"nodes": [
					9038,
					11760,
					11761,
					11762,
					11763,
					11764,
					11765,
					11766,
					11583
				]
			},
			{
				"speed": 25,
				"name": "Gardenia Drive",
				"nodes": [
					6141,
					5076,
					11767,
					11768
				]
			},
			{
				"speed": 25,
				"name": "Valley Drive",
				"nodes": [
					9094,
					5934,
					11769,
					11770,
					3765,
					11771,
					11772
				]
			},
			{
				"speed": 25,
				"name": "Primghar Drive",
				"nodes": [
					10891,
					1157,
					11773,
					11774,
					11775,
					11776,
					11777
				]
			},
			{
				"speed": 25,
				"name": "Lariat Drive",
				"nodes": [
					6476,
					1827
				]
			},
			{
				"speed": 25,
				"name": "Daniel Boone Drive",
				"nodes": [
					3221,
					11778,
					11779,
					11780,
					11781,
					11782,
					2704,
					11783,
					11784,
					11785,
					3227
				]
			},
			{
				"speed": 25,
				"name": "Morningaire Circle",
				"nodes": [
					11786,
					11787,
					11579,
					11788,
					11789,
					11790,
					11791,
					11792,
					11793,
					11794,
					11582,
					11795,
					11796,
					11797
				]
			},
			{
				"speed": 25,
				"name": "Kendlewood Court",
				"nodes": [
					11665,
					11798
				]
			},
			{
				"speed": 25,
				"name": "Deer Valley Drive",
				"nodes": [
					2844,
					11799,
					11800,
					11801,
					11802,
					11803,
					11804,
					11805,
					11806,
					5202
				]
			},
			{
				"speed": 25,
				"name": "Saint Louis Street",
				"nodes": [
					2785,
					5940,
					3646,
					11807,
					11808,
					11809,
					11810,
					11811,
					11812,
					1994,
					11563,
					853,
					11813
				]
			},
			{
				"speed": 25,
				"name": "Verlene Drive",
				"nodes": [
					4836,
					5192
				]
			},
			{
				"speed": 25,
				"name": "Pepperhill Drive",
				"nodes": [
					11814,
					11815,
					11816,
					11817,
					11818,
					11819,
					11820,
					6234,
					11821,
					11822,
					10902,
					11823,
					11824,
					11825,
					11826,
					11827
				]
			},
			{
				"speed": 25,
				"name": "Bramble Lane",
				"nodes": [
					11828,
					11829,
					11830,
					11831,
					11832,
					11833,
					11834
				]
			},
			{
				"speed": 25,
				"name": "Kingsfont Place",
				"nodes": [
					11835,
					11836,
					11837,
					11838,
					11839,
					11840,
					11841,
					11842,
					11843,
					11844,
					11845,
					11846,
					11847,
					11848,
					11849,
					11850,
					11851
				]
			},
			{
				"speed": 25,
				"name": "Elktrail Drive",
				"nodes": [
					11852,
					11853,
					11854,
					11855,
					436,
					11856,
					11857,
					11858,
					11859,
					11860,
					3826
				]
			},
			{
				"speed": 25,
				"name": "Kingsley Drive",
				"nodes": [
					11861,
					2366,
					4889,
					857,
					11862,
					11863,
					11864,
					11865,
					11866,
					11867,
					11868
				]
			},
			{
				"speed": 25,
				"name": "Norberg Drive",
				"nodes": [
					11869,
					11870
				]
			},
			{
				"speed": 25,
				"name": "Deer Valley Drive",
				"nodes": [
					5202,
					11871,
					11872,
					11873,
					11874,
					11875,
					11876,
					11877,
					11878,
					11879,
					11880,
					11881,
					11882,
					11883,
					11884,
					11885,
					11886,
					11887,
					11888,
					11889,
					11890,
					11891,
					11892
				]
			},
			{
				"speed": 25,
				"name": "Satellite Drive",
				"nodes": [
					4317,
					11893
				]
			},
			{
				"speed": 25,
				"name": "Arbre Lane",
				"nodes": [
					4498,
					11894,
					11895,
					11896,
					11897,
					11898,
					11899,
					11900,
					11901,
					11902
				]
			},
			{
				"speed": 25,
				"name": "Sherwood Drive",
				"nodes": [
					11903,
					11904,
					5384,
					11905,
					11906,
					11907,
					11908,
					11909,
					11910,
					11911,
					4634,
					4377,
					11912,
					11913,
					11914,
					11915,
					11916,
					11917,
					11918,
					11919,
					11920
				]
			},
			{
				"speed": 25,
				"name": "Norberg Drive",
				"nodes": [
					1337,
					11921,
					11922,
					11923,
					11924,
					11925,
					11926,
					11927,
					11928,
					11929,
					11930,
					11931,
					11932,
					11933,
					11934,
					11935,
					11936,
					11937,
					11938,
					11869
				]
			},
			{
				"speed": 25,
				"name": "Cato Drive",
				"nodes": [
					3138,
					11939,
					11940,
					11941,
					11942,
					11943,
					11944,
					11945,
					2433,
					5226,
					11946,
					11947,
					11948,
					11949,
					11950,
					9595
				]
			},
			{
				"speed": 25,
				"name": "Sherwood Drive",
				"nodes": [
					5507,
					11951,
					11952,
					2434,
					4968,
					11953,
					11903
				]
			},
			{
				"speed": 25,
				"name": "Coteau Lane",
				"nodes": [
					11954,
					11955,
					10604,
					11956,
					5242
				]
			},
			{
				"speed": 25,
				"name": "La Cerros Lane",
				"nodes": [
					7948,
					11957,
					11958,
					11959,
					11960,
					11961,
					11962,
					4776
				]
			},
			{
				"speed": 25,
				"name": "Fleming Drive",
				"nodes": [
					9122,
					11735
				]
			},
			{
				"speed": 25,
				"name": "Bridekirk Court",
				"nodes": [
					4996,
					11963,
					11964,
					11965,
					11966,
					11967,
					11968,
					11969
				]
			},
			{
				"speed": 25,
				"name": "Garner Lane",
				"nodes": [
					9930,
					11970
				]
			},
			{
				"speed": 35,
				"name": "Parker Road",
				"nodes": [
					11971,
					5381,
					11972,
					11973,
					2544,
					9244,
					10597,
					7863,
					11974,
					10405,
					11975,
					11976,
					11977,
					11978,
					7305,
					11979,
					11980,
					11981,
					11982,
					11983,
					619,
					11984,
					11985,
					11986,
					11987,
					11988,
					11989,
					11990,
					11991,
					11992,
					11993,
					11994,
					11995,
					11996,
					11997,
					11998,
					6070,
					11999,
					12000,
					3848,
					3853,
					2992,
					10420,
					11664,
					12001,
					12002,
					12003,
					8976,
					12004,
					12005,
					12006,
					12007,
					12008,
					12009,
					12010,
					4316,
					12011
				]
			},
			{
				"speed": 25,
				"name": "Bridekirk Court",
				"nodes": [
					11969,
					12012,
					12013,
					12014,
					12015
				]
			},
			{
				"speed": 25,
				"name": "Les Cherbourg Court",
				"nodes": [
					6098,
					12016,
					12017
				]
			},
			{
				"speed": 25,
				"name": "Arrow Wood Lane",
				"nodes": [
					12018,
					5615
				]
			},
			{
				"speed": 25,
				"name": "Steeplechase Lane",
				"nodes": [
					1900,
					12019,
					12020,
					12021,
					12022
				]
			},
			{
				"speed": 25,
				"name": "Pompano Lane",
				"nodes": [
					10547,
					12023,
					2882
				]
			},
			{
				"speed": 25,
				"name": "Bon Aire Drive",
				"nodes": [
					5252,
					4122,
					5969
				]
			},
			{
				"speed": 25,
				"name": "Mary Ann Court",
				"nodes": [
					12024,
					12025
				]
			},
			{
				"speed": 25,
				"name": "Whispering Oaks Drive",
				"nodes": [
					1225,
					12026
				]
			},
			{
				"speed": 25,
				"name": "Delaware Drive",
				"nodes": [
					3337,
					12027,
					7211,
					12028,
					4815,
					7210,
					7156,
					7673
				]
			},
			{
				"speed": 25,
				"name": "De Smet Drive",
				"nodes": [
					151,
					12029,
					12030,
					12031,
					12032,
					12033,
					12034,
					12035,
					12036,
					12037,
					2282,
					12038,
					12039,
					12040,
					12041,
					12042,
					12043,
					12044,
					5416
				]
			},
			{
				"speed": 25,
				"name": "Olian Drive",
				"nodes": [
					1063,
					12045,
					12046,
					12047,
					12048,
					4455
				]
			},
			{
				"speed": 25,
				"name": "Amblewood Court",
				"nodes": [
					12049,
					12050,
					12051,
					12052,
					12053
				]
			},
			{
				"speed": 25,
				"name": "Whispering Oaks Drive",
				"nodes": [
					12054,
					12026,
					12055,
					12056,
					12057,
					12058,
					12059,
					12060,
					12061,
					12054
				]
			},
			{
				"speed": 25,
				"name": "Duchesne Drive",
				"nodes": [
					9098,
					730,
					12062,
					8657,
					12063,
					1579
				]
			},
			{
				"speed": 25,
				"name": "Guildford Drive",
				"nodes": [
					2630,
					10817,
					7212
				]
			},
			{
				"speed": 25,
				"name": "Elmdale Court",
				"nodes": [
					12064,
					12065,
					12066,
					12067,
					12068,
					12069,
					12070,
					12071,
					12072,
					12073,
					12074,
					12075,
					12076,
					12077,
					12078,
					12079,
					12064
				]
			},
			{
				"speed": 25,
				"name": "Lantern Lane",
				"nodes": [
					2363,
					12080
				]
			},
			{
				"speed": 25,
				"name": "Plaza Duchesne",
				"nodes": [
					208,
					1796
				]
			},
			{
				"speed": 25,
				"name": "Paschon Court",
				"nodes": [
					12081,
					12082
				]
			},
			{
				"speed": 25,
				"name": "Nottignhill Row",
				"nodes": [
					7253,
					12083,
					4548
				]
			},
			{
				"speed": 25,
				"name": "Raymond Drive",
				"nodes": [
					12084,
					12085,
					5294,
					12086
				]
			},
			{
				"speed": 25,
				"name": "Cedar Park Drive",
				"nodes": [
					12087,
					12088,
					12089,
					12090,
					312,
					12091,
					12092,
					12093,
					12094,
					328,
					12095,
					12096,
					309
				]
			},
			{
				"speed": 25,
				"name": "Raymond Drive",
				"nodes": [
					9054,
					12097,
					12098,
					12099,
					12100,
					12101,
					12102,
					12103,
					12104,
					12105,
					12086
				]
			},
			{
				"speed": 25,
				"name": "Zohner Court",
				"nodes": [
					12106,
					12107,
					12108,
					12109,
					12110,
					12111,
					12112,
					12113,
					12114,
					12115,
					12116
				]
			},
			{
				"speed": 25,
				"name": "Anistasia Drive",
				"nodes": [
					2799,
					12117,
					12118,
					12119,
					658,
					12120,
					12121,
					12122,
					12123
				]
			},
			{
				"speed": 25,
				"name": "Quaker Drive",
				"nodes": [
					12124,
					9669
				]
			},
			{
				"speed": 25,
				"name": "Farnham Court",
				"nodes": [
					6219,
					12125,
					12126,
					12127,
					12128,
					12129,
					12130,
					12131
				]
			},
			{
				"speed": 25,
				"name": "Florella Court",
				"nodes": [
					11736,
					12132
				]
			},
			{
				"speed": 25,
				"name": "Santa Bella Drive",
				"nodes": [
					12133,
					12134,
					12135,
					12136,
					12137,
					12138,
					12139,
					12140
				]
			},
			{
				"speed": 25,
				"name": "Carolview Drive",
				"nodes": [
					12141,
					12142,
					12143
				]
			},
			{
				"speed": 25,
				"name": "Michelham Drive",
				"nodes": [
					1284,
					12144,
					12145
				]
			},
			{
				"speed": 25,
				"name": "Lonsdale Drive",
				"nodes": [
					12146,
					12147,
					12148,
					12149,
					12150,
					12151,
					12152,
					12153,
					12154,
					12155,
					12156,
					12157,
					12158,
					12159,
					12160,
					12161,
					12162,
					12163,
					12164,
					12165,
					10081
				]
			},
			{
				"speed": 25,
				"name": "Sassafras Lane",
				"nodes": [
					2801,
					12166,
					12167,
					12168,
					11576
				]
			},
			{
				"speed": 25,
				"name": "Wadsworth Drive",
				"nodes": [
					2798,
					12169,
					5197,
					12170,
					12171,
					860,
					12172,
					12173,
					12174,
					9121
				]
			},
			{
				"speed": 25,
				"name": "Elbring Drive",
				"nodes": [
					2800,
					12175,
					12176,
					12177,
					657,
					12178,
					12179,
					12180,
					12181
				]
			},
			{
				"speed": 25,
				"name": "Parson Ridge Lane",
				"nodes": [
					6367,
					12182,
					12183,
					12184,
					12185
				]
			},
			{
				"speed": 25,
				"name": "Halter Court",
				"nodes": [
					12186,
					12187
				]
			},
			{
				"speed": 25,
				"name": "Patience Drive",
				"nodes": [
					12188,
					12189,
					12190,
					12191,
					12192,
					12193,
					12194,
					12195,
					12196,
					12197,
					12198,
					12199,
					12200,
					12201,
					12202,
					12203,
					12188
				]
			},
			{
				"speed": 25,
				"name": "Lawson Place Court",
				"nodes": [
					12204,
					12205
				]
			},
			{
				"speed": 25,
				"name": "Clovermere Court",
				"nodes": [
					12206,
					12207,
					12208,
					12209,
					12210,
					12211,
					12212,
					12213,
					12214,
					12215,
					12216,
					12217,
					12218,
					12219,
					12220,
					12221,
					12222,
					12223
				]
			},
			{
				"speed": 25,
				"name": "Martin Manor Place",
				"nodes": [
					11081,
					12224,
					12225,
					12226,
					12227,
					12228,
					12229,
					12230,
					12231,
					12232,
					12233,
					12234,
					12235,
					12236,
					12237,
					12238,
					12239,
					12240,
					12241,
					12242,
					12243,
					12244
				]
			},
			{
				"speed": 25,
				"name": "Delcastle Drive",
				"nodes": [
					12245,
					5284,
					1889,
					4406
				]
			},
			{
				"speed": 25,
				"name": "Bristol Rock Road",
				"nodes": [
					7416,
					12246,
					4994,
					12247,
					4829,
					12248,
					4911,
					12249,
					12250,
					12251,
					12252,
					12253,
					12254,
					12255
				]
			},
			{
				"speed": 25,
				"name": "Chartier Drive",
				"nodes": [
					12256,
					12257,
					12258,
					12259,
					12260,
					12261,
					12262,
					12263,
					12264,
					12265,
					12266,
					12267,
					2241
				]
			},
			{
				"speed": 25,
				"name": "Flower Ridge Lane",
				"nodes": [
					9041,
					8844
				]
			},
			{
				"speed": 25,
				"name": "Bristol Rock Road",
				"nodes": [
					11852,
					12268,
					12269,
					12270,
					12271,
					12272,
					12273,
					7416
				]
			},
			{
				"speed": 25,
				"name": "Morningside Drive",
				"nodes": [
					7679,
					12274,
					1649
				]
			},
			{
				"speed": 25,
				"name": "Saint Daniel Lane",
				"nodes": [
					12275,
					12276,
					12277,
					12278,
					12279,
					12280,
					12281,
					12282,
					12283,
					12284
				]
			},
			{
				"speed": 25,
				"name": "Hungerford Drive",
				"nodes": [
					12285,
					12286,
					12287,
					12288,
					12289,
					12290,
					12291,
					12292,
					12293,
					12294,
					12295,
					12296,
					12297,
					12298,
					12299,
					12300,
					12285
				]
			},
			{
				"speed": 25,
				"name": "South Jefferson Street",
				"nodes": [
					8337,
					12301,
					3867
				]
			},
			{
				"speed": 25,
				"name": "Flicker Drive",
				"nodes": [
					5598,
					12302,
					4514
				]
			},
			{
				"speed": 25,
				"name": "Balmoral Drive",
				"nodes": [
					11568,
					12303,
					1129,
					10700,
					976
				]
			},
			{
				"speed": 25,
				"name": "Ridgelawn Court",
				"nodes": [
					12304,
					12305
				]
			},
			{
				"speed": 25,
				"name": "Flicker Drive",
				"nodes": [
					9381,
					12306,
					12307,
					3836
				]
			},
			{
				"speed": 25,
				"name": "South Castello Street",
				"nodes": [
					12308,
					12309,
					12310,
					12311,
					12312,
					12275,
					5951
				]
			},
			{
				"speed": 25,
				"name": "Target Court",
				"nodes": [
					12313,
					12314,
					12315,
					12316,
					5913
				]
			},
			{
				"speed": 25,
				"name": "Watersedge Drive",
				"nodes": [
					12317,
					12318,
					12319,
					12320,
					12321,
					12322,
					12323,
					12324,
					12325,
					12326,
					12327,
					12328,
					12329,
					12330,
					12331,
					12332,
					12333,
					12334,
					12335,
					12336
				]
			},
			{
				"speed": 25,
				"name": "Sand Spur Court",
				"nodes": [
					5859,
					12337
				]
			},
			{
				"speed": 25,
				"name": "Estes Drive",
				"nodes": [
					7003,
					12338,
					12339,
					12340,
					12341,
					12342,
					9570,
					12343,
					12344,
					4499,
					12345
				]
			},
			{
				"speed": 25,
				"name": "Citation Court",
				"nodes": [
					456,
					12346
				]
			},
			{
				"speed": 25,
				"name": "Fee Fee Hills Drive",
				"nodes": [
					2244,
					978
				]
			},
			{
				"speed": 25,
				"name": "Fee Fee Hills Drive",
				"nodes": [
					8923,
					254
				]
			},
			{
				"speed": 25,
				"name": "Fee Fee Hills Drive",
				"nodes": [
					6886,
					12347,
					6689,
					2245
				]
			},
			{
				"speed": 25,
				"name": "Elder Drive",
				"nodes": [
					7703,
					4407
				]
			},
			{
				"speed": 25,
				"name": "Hadwin Drive",
				"nodes": [
					7080,
					1928,
					12348,
					4411
				]
			},
			{
				"speed": 25,
				"name": "Glenoro Drive",
				"nodes": [
					12349,
					12350,
					7905,
					12351,
					7554,
					12352,
					12353,
					12354,
					3751
				]
			},
			{
				"speed": 25,
				"name": "Saint Charles Street",
				"nodes": [
					12355,
					1605,
					8414,
					12356,
					12357,
					11404,
					12358,
					12359,
					3808,
					12360
				]
			},
			{
				"speed": 25,
				"name": "Understanding Court",
				"nodes": [
					12361,
					12362,
					12363,
					12364,
					12365,
					12366,
					12367,
					12368,
					12369,
					12370,
					12371,
					12372,
					12373,
					12374,
					12375,
					12376,
					12361
				]
			},
			{
				"speed": 25,
				"name": "Trinity Circle",
				"nodes": [
					12377,
					12378,
					12379,
					12380,
					12381,
					12382,
					12383,
					12384,
					12385,
					12386,
					12387,
					12388,
					12389,
					12390,
					12391,
					12392,
					12377
				]
			},
			{
				"speed": 25,
				"name": "Knowledge Court",
				"nodes": [
					12393,
					12394
				]
			},
			{
				"speed": 25,
				"name": "Bristol Rock Road",
				"nodes": [
					9839,
					11070,
					7714,
					12395,
					12396,
					12397,
					12398,
					12399,
					10864,
					12400,
					12401,
					12402,
					12403,
					12404,
					12405,
					12406,
					3100,
					12407,
					275,
					12408,
					12409,
					12410,
					12411,
					12412,
					11852
				]
			},
			{
				"speed": 25,
				"name": "Weymouth Court",
				"nodes": [
					10003,
					12413,
					12414,
					12415,
					12416,
					12417,
					12418,
					12419,
					12420,
					12421
				]
			},
			{
				"speed": 25,
				"name": "Carson Court",
				"nodes": [
					12422,
					12423
				]
			},
			{
				"speed": 25,
				"name": "Oakwood Manor Drive",
				"nodes": [
					10751,
					12424,
					12425,
					6767,
					12426,
					12427,
					12428,
					7733
				]
			},
			{
				"speed": 25,
				"name": "Green Pasture Drive",
				"nodes": [
					3653,
					12429,
					12430,
					12431,
					12432,
					12433,
					12434,
					12435,
					12436,
					12437,
					12438,
					12439,
					12440,
					7560
				]
			},
			{
				"speed": 25,
				"name": "Glynebourne Drive",
				"nodes": [
					1283,
					11559
				]
			},
			{
				"speed": 25,
				"name": "Marrisa Lane",
				"nodes": [
					12441,
					12442,
					12443,
					12444,
					12445,
					12446,
					12447,
					3621,
					12448,
					12449,
					12450,
					12451,
					12452,
					12453,
					12454
				]
			},
			{
				"speed": 25,
				"name": "Randell Court",
				"nodes": [
					10143,
					12455,
					12456,
					7500,
					9705,
					12457
				]
			},
			{
				"speed": 25,
				"name": "Rue St Louis",
				"nodes": [
					12356,
					12458
				]
			},
			{
				"speed": 25,
				"name": "Mercury Drive",
				"nodes": [
					12459,
					12460,
					12461,
					12462,
					12463,
					12464,
					12465,
					12466,
					12467,
					12468,
					12469,
					12470,
					12471,
					12472,
					12473,
					12474,
					12475
				]
			},
			{
				"speed": 25,
				"name": "Cartwheel Lane",
				"nodes": [
					9255,
					12476,
					12477,
					12478
				]
			},
			{
				"speed": 25,
				"name": "Ardmore Drive",
				"nodes": [
					9136,
					12479,
					12480,
					12481,
					12482,
					12483,
					12484,
					12485,
					4127
				]
			},
			{
				"speed": 25,
				"name": "Eagle Ind Court",
				"nodes": [
					12486,
					12487
				]
			},
			{
				"speed": 25,
				"name": "Duquette Lane",
				"nodes": [
					12488,
					12489,
					5241
				]
			},
			{
				"speed": 30,
				"name": "Materdei Lane",
				"nodes": [
					12490,
					12491,
					4742
				]
			},
			{
				"speed": 25,
				"name": "Rexford Creek Court",
				"nodes": [
					12492,
					12493,
					12494
				]
			},
			{
				"speed": 25,
				"name": "Patricia Ridge Drive",
				"nodes": [
					12495,
					12496,
					12497,
					12141,
					12498,
					12499
				]
			},
			{
				"speed": 25,
				"name": "Elkins Drive",
				"nodes": [
					3889,
					12500,
					12501,
					12502,
					12503,
					12504,
					12505,
					12506,
					12507,
					12508,
					4624
				]
			},
			{
				"speed": 25,
				"name": "South Park Lane",
				"nodes": [
					6407,
					7680,
					1652
				]
			},
			{
				"speed": 25,
				"name": "Spoonwood Drive",
				"nodes": [
					3756,
					12509,
					12510,
					12511,
					12512,
					12513,
					12514,
					11828
				]
			},
			{
				"speed": 25,
				"name": "Spoonwood Drive",
				"nodes": [
					11828,
					12515,
					12516,
					12517,
					12518,
					12519,
					12520
				]
			},
			{
				"speed": 25,
				"name": "Glynebourne Drive",
				"nodes": [
					11558,
					12521,
					12522,
					12523,
					12524,
					12525,
					12526,
					12527,
					12528,
					12529,
					12530,
					12531,
					12532,
					12533,
					12534,
					12535,
					12536,
					12537,
					12538,
					12539,
					12540
				]
			},
			{
				"speed": 25,
				"name": "Black Earth Court",
				"nodes": [
					12541,
					12542,
					12543,
					12544,
					12545,
					12546,
					12547,
					12548,
					12549,
					12550,
					12551,
					12552,
					12553,
					12554,
					12555,
					12556,
					12541
				]
			},
			{
				"speed": 25,
				"name": "Amarose Court",
				"nodes": [
					12557,
					12558
				]
			},
			{
				"speed": 25,
				"name": "Cherry Lane",
				"nodes": [
					11267,
					12559
				]
			},
			{
				"speed": 25,
				"name": "Wolverton Drive",
				"nodes": [
					3018,
					12560,
					12561,
					12562,
					12563,
					12564,
					12565,
					12566,
					12567,
					12568
				]
			},
			{
				"speed": 25,
				"name": "Willow River Court",
				"nodes": [
					12569,
					12570,
					12571,
					12572,
					12573,
					12574,
					12575,
					12576,
					12577,
					12578,
					12579,
					12580,
					12581,
					12582,
					12583,
					12584,
					12569
				]
			},
			{
				"speed": 25,
				"name": "Manteca Drive",
				"nodes": [
					10974,
					12585,
					12586,
					12587,
					12588,
					12589
				]
			},
			{
				"speed": 25,
				"name": "Fernwood Trail Drive",
				"nodes": [
					4773,
					12590,
					12591,
					12592,
					12593,
					6206
				]
			},
			{
				"speed": 25,
				"name": "Bluesage Trail",
				"nodes": [
					10285,
					12594,
					12595,
					12397
				]
			},
			{
				"speed": 25,
				"name": "Bienville Drive",
				"nodes": [
					3436,
					3870,
					12596,
					12597
				]
			},
			{
				"speed": 25,
				"name": "Queen Drive",
				"nodes": [
					6004,
					12598,
					12599
				]
			},
			{
				"speed": 25,
				"name": "Lawnview Drive",
				"nodes": [
					5509,
					12600,
					12601,
					12602,
					12603,
					1486,
					12604,
					12605,
					12606,
					12607,
					12608,
					12609,
					1492
				]
			},
			{
				"speed": 25,
				"name": "Saint Cornelius Lane",
				"nodes": [
					5776,
					12610,
					12611,
					12612
				]
			},
			{
				"speed": 25,
				"name": "Ashton Drive",
				"nodes": [
					12613,
					12614,
					12615,
					10537,
					12616
				]
			},
			{
				"speed": 25,
				"name": "Cornflower Court",
				"nodes": [
					6480,
					12617,
					12618,
					12619,
					12620
				]
			},
			{
				"speed": 25,
				"name": "Cheval Court",
				"nodes": [
					8074,
					12621,
					12622,
					12623,
					12624,
					12625,
					12626,
					12627,
					12628,
					12629,
					12630,
					12631,
					12632,
					12633,
					12634
				]
			},
			{
				"speed": 25,
				"name": "Gonzaga Lane",
				"nodes": [
					11287,
					12635,
					12636,
					985
				]
			},
			{
				"speed": 25,
				"name": "Cynthiana Court",
				"nodes": [
					8069,
					12637,
					12638,
					12639,
					12640,
					12641,
					12642,
					12643,
					12644,
					12645,
					12646,
					12647,
					12648,
					12649,
					12650,
					10366,
					12651,
					12652,
					12653
				]
			},
			{
				"speed": 25,
				"name": "Country Lane Woods Court",
				"nodes": [
					12654,
					12655,
					12656,
					12657,
					12658
				]
			},
			{
				"speed": 25,
				"name": "Flowervale Drive",
				"nodes": [
					12659,
					12660,
					12661,
					12662,
					12663,
					12664,
					12665,
					12666,
					12667,
					12668,
					12669
				]
			},
			{
				"speed": 25,
				"name": "Ville-Cecelia Lane",
				"nodes": [
					6288,
					12670,
					12671,
					12672,
					12673,
					12674,
					12675,
					12676,
					12677,
					12678
				]
			},
			{
				"speed": 25,
				"name": "Saint Richard Drive",
				"nodes": [
					5172,
					12679,
					12680,
					12681,
					7940
				]
			},
			{
				"speed": 25,
				"name": "Liberty Gardens Drive",
				"nodes": [
					4384,
					12682
				]
			},
			{
				"speed": 25,
				"name": "Old Jamestown Forest Drive",
				"nodes": [
					3003,
					12683,
					12684,
					12685,
					12686,
					10246
				]
			},
			{
				"speed": 25,
				"name": "Caposele Lane",
				"nodes": [
					5589,
					12687,
					12688,
					11143
				]
			},
			{
				"speed": 25,
				"name": "Baltic Drive",
				"nodes": [
					5504,
					12689,
					12690,
					9616,
					12492,
					8435
				]
			},
			{
				"speed": 25,
				"name": "Baltic Drive",
				"nodes": [
					5504,
					3899,
					12691,
					12692,
					12693,
					10159,
					6010
				]
			},
			{
				"speed": 25,
				"name": "Jamaica Place",
				"nodes": [
					8798,
					12694,
					12695,
					8053,
					8059,
					12696,
					11813,
					8459
				]
			},
			{
				"speed": 25,
				"name": "Doyne Drive",
				"nodes": [
					12332,
					12697,
					12698,
					12699,
					12700,
					12701,
					12702,
					12703,
					12704,
					12705,
					12706,
					12707,
					12708,
					12709,
					12710,
					12317
				]
			},
			{
				"speed": 25,
				"name": "Orange Blossom Lane",
				"nodes": [
					9503,
					12711,
					12712,
					12713,
					12714,
					5866,
					12715,
					12716,
					12717,
					12718,
					12719,
					1770
				]
			},
			{
				"speed": 25,
				"name": "Sir Christopher Lane",
				"nodes": [
					7375,
					273,
					12720,
					12721,
					12722,
					12723,
					12724,
					4556
				]
			},
			{
				"speed": 25,
				"name": "Manteca Drive",
				"nodes": [
					12725,
					11777,
					12726,
					1163,
					12727,
					12728,
					12729,
					12730,
					12731,
					12732,
					12733,
					12734,
					12735,
					12736,
					10974
				]
			},
			{
				"speed": 25,
				"name": "Rigsby Drive",
				"nodes": [
					3111,
					12737,
					12738,
					12739,
					12740,
					12741,
					12742,
					12743,
					1275
				]
			},
			{
				"speed": 25,
				"name": "St Alice Lane",
				"nodes": [
					6755,
					12744,
					12745,
					12746,
					12747,
					12748,
					12749,
					12750,
					12751
				]
			},
			{
				"speed": 25,
				"name": "Seville Court",
				"nodes": [
					6513,
					12752
				]
			},
			{
				"speed": 25,
				"name": "Wind Flower Drive",
				"nodes": [
					12753,
					12754,
					12755,
					12756,
					12757,
					1525
				]
			},
			{
				"speed": 25,
				"name": "Hawthorne Manor Drive",
				"nodes": [
					10757,
					12758,
					12759,
					12760,
					2555,
					6769,
					7324,
					12761,
					12762,
					7738
				]
			},
			{
				"speed": 25,
				"name": "Morning Mist Court",
				"nodes": [
					12763,
					12764,
					12765,
					12766,
					12767
				]
			},
			{
				"speed": 25,
				"name": "North St Jacques St",
				"nodes": [
					3863,
					2140,
					11408
				]
			},
			{
				"speed": 25,
				"name": "Piety Circle",
				"nodes": [
					12768,
					12769,
					12770,
					12771,
					12772,
					12773,
					12774,
					12775,
					12776,
					12777,
					12778
				]
			},
			{
				"speed": 25,
				"name": "Rogers Lane",
				"nodes": [
					12488,
					12779,
					12780,
					10598,
					6411,
					12422,
					11955
				]
			},
			{
				"speed": 25,
				"name": "Rogers Lane",
				"nodes": [
					10137,
					12781
				]
			},
			{
				"speed": 25,
				"name": "North St Jacques St",
				"nodes": [
					12782,
					1109,
					399,
					12783
				]
			},
			{
				"speed": 25,
				"name": "Brown Street",
				"nodes": [
					12784,
					2145
				]
			},
			{
				"speed": 25,
				"name": "Brown Street",
				"nodes": [
					1614,
					8419,
					12785,
					12786,
					1114
				]
			},
			{
				"speed": 25,
				"name": "Starling Drive",
				"nodes": [
					9758,
					5027,
					12787,
					12788,
					10314
				]
			},
			{
				"speed": 25,
				"name": "Waterford Drive",
				"nodes": [
					8400,
					12789,
					3058
				]
			},
			{
				"speed": 25,
				"name": "Orange Blossom Lane",
				"nodes": [
					12790,
					12791,
					12792,
					12793,
					12794,
					12795,
					12796,
					12797,
					12798,
					12799,
					9503
				]
			},
			{
				"speed": 25,
				"name": "Meditation Way Court",
				"nodes": [
					12800,
					12801,
					12802,
					12803,
					12804,
					12805,
					12806,
					12807,
					12808
				]
			},
			{
				"speed": 25,
				"name": "Croftdale Drive",
				"nodes": [
					12809,
					12810,
					12811,
					12812,
					12813,
					12814,
					12815,
					12816,
					12817,
					12818,
					12819,
					12820,
					12821,
					518
				]
			},
			{
				"speed": 25,
				"name": "Cordin Drive",
				"nodes": [
					5430,
					12822,
					12823,
					9688
				]
			},
			{
				"speed": 25,
				"name": "Woodpath Drive",
				"nodes": [
					10905,
					12824,
					12825,
					12826,
					12827,
					12828,
					12829,
					12830,
					12831,
					7615,
					12832,
					12833,
					12834,
					12835,
					12836,
					12837,
					12838
				]
			},
			{
				"speed": 25,
				"name": "Nathaniel Court",
				"nodes": [
					12839,
					12840,
					12841,
					12842,
					12843,
					12844,
					12845,
					12846,
					12847,
					12848,
					12849,
					12850,
					12851,
					12852,
					12853,
					12854,
					12855,
					12856,
					12857,
					12858,
					12859,
					12860,
					12861,
					12862,
					12863
				]
			},
			{
				"speed": 25,
				"name": "Rudelle Drive",
				"nodes": [
					11657,
					12864,
					12865,
					12866,
					12867,
					12868,
					12869,
					12870,
					12871,
					12872,
					12873,
					12874,
					12875,
					12876
				]
			},
			{
				"speed": 25,
				"name": "Rhinegarten Drive",
				"nodes": [
					12877,
					12878,
					12879,
					12880,
					12881,
					12882,
					12883,
					12884,
					12885,
					12886,
					12887,
					12888,
					12889,
					12890,
					12891,
					12892,
					12877
				]
			},
			{
				"speed": 25,
				"name": "Hirondelle Lane",
				"nodes": [
					12893,
					12894,
					12895,
					12896,
					12897,
					12898,
					12899,
					12900,
					12901
				]
			},
			{
				"speed": 25,
				"name": "Rosetta Drive",
				"nodes": [
					4742,
					9932,
					12902,
					1445
				]
			},
			{
				"speed": 25,
				"name": "Rosetta Drive",
				"nodes": [
					9039,
					12903,
					12904,
					12905,
					12906,
					12907,
					12908,
					8843,
					4743
				]
			},
			{
				"speed": 25,
				"name": "Evan Aire Drive",
				"nodes": [
					6227,
					12909,
					12910,
					12911,
					12912,
					8038
				]
			},
			{
				"speed": 25,
				"name": "Hemet Lane",
				"nodes": [
					12913,
					12914,
					12915,
					12916,
					12917,
					12918,
					11110,
					12919,
					12920,
					12921,
					12922,
					12923,
					12924,
					12925,
					12926,
					12927,
					12928,
					12929,
					12930,
					12931,
					12932,
					12933,
					12934,
					12935,
					12936,
					12937,
					12938,
					12926
				]
			},
			{
				"speed": 25,
				"name": "Aristocrat Drive",
				"nodes": [
					7243,
					12939,
					12940,
					12941,
					12942,
					12943,
					12944,
					12945,
					12946,
					1474
				]
			},
			{
				"speed": 25,
				"name": "Louise Court",
				"nodes": [
					12947,
					11406
				]
			},
			{
				"speed": 25,
				"name": "Dupage Drive",
				"nodes": [
					12948,
					12949,
					12950,
					12951,
					12952,
					4580
				]
			},
			{
				"speed": 25,
				"name": "Venetia Court",
				"nodes": [
					5091,
					12953,
					12954,
					12955
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					12956,
					12957
				]
			},
			{
				"speed": 25,
				"name": "Parian Drive",
				"nodes": [
					10624,
					12958
				]
			},
			{
				"speed": 25,
				"name": "Ville Patricia Court",
				"nodes": [
					12959,
					12960,
					12961,
					12962
				]
			},
			{
				"speed": 25,
				"name": "Lavin Court",
				"nodes": [
					7831,
					12963,
					12964
				]
			},
			{
				"speed": 25,
				"name": "Fox Crossing Drive",
				"nodes": [
					12965,
					12966,
					12967,
					12968,
					12969,
					12970,
					12971,
					12972,
					8500,
					12973,
					12974,
					12975,
					12976,
					12977,
					12978,
					12979,
					12980
				]
			},
			{
				"speed": 25,
				"name": "Torero Lane",
				"nodes": [
					1144,
					12981,
					12982,
					12983,
					12984,
					12985,
					12986,
					12987,
					12988,
					12989,
					12990,
					12991,
					12992,
					12993,
					12994,
					12995,
					1134,
					12996
				]
			},
			{
				"speed": 25,
				"name": "Benne Drive",
				"nodes": [
					1306,
					6906,
					12997,
					12998,
					1434
				]
			},
			{
				"speed": 25,
				"name": "Elizabeth Court",
				"nodes": [
					12085,
					12999
				]
			},
			{
				"speed": 30,
				"name": "Waterford Drive",
				"nodes": [
					5243,
					3917,
					11035,
					5962,
					11861,
					2360,
					4881,
					8801,
					8399,
					3057,
					13000,
					13001,
					13002,
					13003,
					13004,
					13005,
					13006,
					13007,
					3486,
					13008,
					13009,
					13010,
					13011,
					13012,
					13013,
					13014,
					4751,
					2337,
					13015,
					13016
				]
			},
			{
				"speed": 25,
				"name": "Space Drive",
				"nodes": [
					12011,
					13017,
					5911,
					11893
				]
			},
			{
				"speed": 25,
				"name": "Canoebrook Drive",
				"nodes": [
					13018,
					13019,
					13020,
					13021,
					13022,
					13023,
					13024,
					13025,
					13026,
					13027,
					13028,
					13029,
					13030,
					13031,
					13032,
					13033,
					13018
				]
			},
			{
				"speed": 25,
				"name": "St Florent Lane",
				"nodes": [
					958,
					13034,
					13035,
					13036,
					3348
				]
			},
			{
				"speed": 25,
				"name": "Lehne Court",
				"nodes": [
					13037,
					13038,
					13039,
					13040,
					13041,
					13042,
					13043,
					13044,
					13045,
					13046,
					13047,
					13048,
					13049,
					13050,
					13051,
					13052,
					13037
				]
			},
			{
				"speed": 25,
				"name": "Cicero Drive",
				"nodes": [
					13053,
					13054
				]
			},
			{
				"speed": 30,
				"name": "Vaile Avenue",
				"nodes": [
					13055,
					1740,
					1032,
					13056,
					13057,
					13058,
					6875,
					13059,
					13060,
					7001
				]
			},
			{
				"speed": 25,
				"name": "Bluefield Drive",
				"nodes": [
					11325,
					6189,
					6907,
					13061
				]
			},
			{
				"speed": 25,
				"name": "Rothwell Drive",
				"nodes": [
					10036
				]
			},
			{
				"speed": 25,
				"name": "Pacer Court",
				"nodes": [
					10696,
					13062
				]
			},
			{
				"speed": 25,
				"name": "Bluefield Drive",
				"nodes": [
					13063,
					13064,
					13065,
					13066,
					13067,
					13068,
					13069,
					10904
				]
			},
			{
				"speed": 25,
				"name": "Falcon Drive",
				"nodes": [
					3230,
					13070,
					13071,
					9302,
					10989,
					5514
				]
			},
			{
				"speed": 25,
				"name": "Sherry Court",
				"nodes": [
					10446,
					13072
				]
			},
			{
				"speed": 25,
				"name": "Bluefield Drive",
				"nodes": [
					10903,
					13073,
					13074,
					13075,
					13076,
					11827
				]
			},
			{
				"speed": 25,
				"name": "Saint Regis Lane",
				"nodes": [
					12310,
					13077,
					13078,
					13079,
					13080,
					13081,
					13082,
					13083
				]
			},
			{
				"speed": 25,
				"name": "Crabapple Lane",
				"nodes": [
					4816,
					13084,
					13085,
					13086,
					13087,
					7125
				]
			},
			{
				"speed": 25,
				"name": "Naomi Drive",
				"nodes": [
					2100,
					9049
				]
			},
			{
				"speed": 25,
				"name": "Rouvre Drive",
				"nodes": [
					13088,
					13089,
					13090,
					13091,
					13092,
					13093,
					13094,
					13095,
					13096,
					13097,
					13098
				]
			},
			{
				"speed": 25,
				"name": "Barden Tower Road",
				"nodes": [
					7419,
					13099,
					13100,
					13101,
					13102,
					13103,
					13104,
					3248
				]
			},
			{
				"speed": 25,
				"name": "Patrich Ridge",
				"nodes": [
					12499,
					6369,
					7026,
					10290
				]
			},
			{
				"speed": 25,
				"name": "Ville Rosa Lane",
				"nodes": [
					13105,
					13106,
					13107,
					13108,
					13109,
					13110,
					13111,
					13112,
					13113,
					13114,
					13115,
					13116,
					13117,
					13118,
					13119,
					13120,
					10860
				]
			},
			{
				"speed": 35,
				"name": "Vaile Avenue",
				"nodes": [
					5493,
					13121,
					13122,
					13123,
					13124,
					13125,
					13126,
					13127,
					13128,
					4232,
					13129,
					13130,
					13131,
					13132,
					13133,
					10463,
					13134,
					5428,
					13135,
					13136,
					13137,
					13138,
					13139,
					13055
				]
			},
			{
				"speed": 25,
				"name": "Country Lane Woods Street",
				"nodes": [
					13140,
					13141,
					12658,
					13142,
					13143
				]
			},
			{
				"speed": 25,
				"name": "Saint Patrick Lane",
				"nodes": [
					964,
					13144,
					13145,
					13146,
					13147,
					13148,
					13149,
					13150,
					13151,
					13152,
					13153
				]
			},
			{
				"speed": 25,
				"name": "Classic Drive",
				"nodes": [
					13154,
					13155,
					13156,
					7656,
					13157,
					13158,
					6391
				]
			},
			{
				"speed": 25,
				"name": "Van Asche Court",
				"nodes": [
					10119,
					11812
				]
			},
			{
				"speed": 25,
				"name": "Cady Drive",
				"nodes": [
					2803,
					13159,
					13160,
					9532
				]
			},
			{
				"speed": 25,
				"name": "Bayberry Lane",
				"nodes": [
					5470,
					13161
				]
			},
			{
				"speed": 25,
				"name": "Coach House Drive",
				"nodes": [
					3778,
					13162,
					13163,
					7268,
					13164,
					13165,
					13166,
					13167,
					8146,
					2090
				]
			},
			{
				"speed": 25,
				"name": "Foxfield Court",
				"nodes": [
					7588,
					13168,
					13169,
					13170,
					13171,
					13172,
					13173
				]
			},
			{
				"speed": 25,
				"name": "Hutchinson Wy Place",
				"nodes": [
					11088,
					13174,
					13175,
					13176,
					13177,
					13178,
					13179
				]
			},
			{
				"speed": 25,
				"name": "Christinia Marie Lane",
				"nodes": [
					2450,
					13180,
					13181,
					13182,
					13183,
					13184,
					13185,
					6528
				]
			},
			{
				"speed": 25,
				"name": "Florval Drive",
				"nodes": [
					13186,
					13187,
					13188,
					13189,
					4910,
					8979,
					13190,
					13191,
					13192,
					13193,
					13194,
					13195,
					13196,
					13197,
					13198,
					13199,
					13200,
					13201,
					3070
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					13202,
					13203,
					42
				]
			},
			{
				"speed": 25,
				"name": "Cordin Lane",
				"nodes": [
					4807,
					13204,
					13205,
					4875,
					5238,
					13206,
					515
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13207,
					13208,
					13209,
					13210,
					13211,
					13212,
					13213,
					13214,
					13215,
					13216,
					13217
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13218,
					13219,
					13220,
					13221,
					13222,
					13223,
					13224,
					13225
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13221,
					13226,
					13227,
					13228,
					13229,
					13230,
					13231,
					13232,
					13233,
					13234,
					13235,
					13236
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13237,
					13238,
					13239,
					13240,
					13241,
					13242
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13243,
					13244,
					13245,
					13246,
					13247,
					13248,
					13249
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13250,
					13251,
					13252,
					13253,
					13254,
					13255,
					13256,
					13257,
					13258,
					13259,
					13260,
					5558,
					13261,
					13262
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13263,
					13264,
					13265,
					115
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13266,
					13267,
					13268,
					109,
					13269
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13270,
					13271,
					13272,
					13273,
					13274,
					13275,
					13276,
					13277,
					13278,
					13279,
					13280,
					13281,
					13282,
					2
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13283,
					13284,
					13285,
					13286,
					13287,
					13288,
					13289,
					13290,
					13291,
					13292,
					13293,
					13294,
					13295,
					13296,
					13297,
					13298,
					13299,
					13300
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13207,
					13301,
					13302,
					13303,
					13304,
					13305,
					13306,
					13307,
					13308,
					13309,
					13310,
					13311,
					13312,
					13313,
					13314,
					13281
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13315,
					13316,
					13317,
					13318,
					13319,
					13320,
					13321,
					13322,
					13323,
					13216
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13324,
					13325,
					13326,
					13327,
					13328,
					13329,
					13330,
					13331,
					13332,
					13333,
					13334,
					13335,
					13336,
					13337,
					13338,
					13339,
					13340,
					13341,
					13342
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13343,
					13344,
					13345,
					13346,
					13347,
					13348,
					13349,
					13350,
					13351,
					13352,
					13353,
					13354,
					13355,
					13356,
					13357,
					13358,
					13359,
					13360,
					13361
				]
			},
			{
				"speed": 40,
				"name": "Pershall Road",
				"nodes": [
					19,
					13362,
					13363,
					13364,
					13365
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13365,
					13366,
					13367
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					13368,
					13369,
					13370
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13371,
					13372,
					13373,
					13374,
					13375,
					13376,
					13258
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13377,
					13378,
					134
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13379,
					13380,
					13381,
					13382,
					13383,
					13384,
					13385,
					13386,
					13387,
					13388,
					13389,
					129
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13390,
					13391,
					13392
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13393,
					13394,
					13395
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					140,
					13396,
					13397,
					13398
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13398,
					13399,
					13400
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13400,
					13401,
					13402,
					13403,
					13404,
					13405
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13405,
					13406,
					13407
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13408,
					13409,
					13410,
					13411,
					13412,
					13413,
					13414,
					13415,
					13416,
					13417
				]
			},
			{
				"speed": 25,
				"name": "Latty Avenue",
				"nodes": [
					13418,
					3703,
					13419,
					13420
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13395,
					13421,
					13422,
					133
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13423,
					13377
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13424,
					13425
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13426,
					13427,
					13428,
					13429,
					13430,
					13431,
					13432,
					13433,
					13423
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					13434,
					13435,
					13436,
					13437,
					13438,
					128
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13439,
					13440,
					13441,
					13442,
					13443,
					13444,
					13445,
					13446,
					13447,
					13393
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					13448,
					13449,
					13450,
					13451,
					13452,
					13453,
					13454,
					13455,
					13456
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					13457,
					13458
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					13459,
					13457
				]
			},
			{
				"speed": 40,
				"name": "?",
				"nodes": [
					13458,
					13460,
					13461,
					13462,
					13463,
					5618,
					13464,
					13465
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13425,
					13466,
					13467,
					13468,
					13469,
					13470,
					13471,
					13472
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13473,
					13474,
					13475,
					13476,
					13477,
					13478,
					13479,
					13480,
					13481,
					13482,
					13483,
					13484,
					13485,
					5555
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13267,
					13486,
					13487,
					7723
				]
			},
			{
				"speed": 25,
				"name": "Pershall Road",
				"nodes": [
					6841,
					13488,
					13489,
					43,
					32,
					13490,
					13491,
					13492,
					141,
					13493,
					13494,
					13495,
					1935,
					13496,
					13497,
					13498,
					13499,
					13500,
					13501,
					13502,
					13503,
					6885,
					13504,
					13505,
					13506,
					13507,
					13508,
					3714,
					13509,
					13510,
					13511,
					13512,
					13513,
					13514,
					13515,
					13516,
					13517,
					13518,
					13519,
					13520,
					13521,
					13522,
					13523,
					13524,
					13525,
					13526,
					13527,
					13528,
					13529,
					13530,
					13531,
					13532,
					13533,
					6131,
					13534,
					13535,
					9149,
					3893,
					2271,
					153,
					5619,
					6948,
					13536,
					13537,
					13538,
					13539,
					13540,
					11372
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13541,
					13542,
					13543,
					13544,
					13545,
					13546,
					13547
				]
			},
			{
				"speed": 35,
				"name": "Missouri Bottom Road",
				"nodes": [
					13548,
					13549,
					13550
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					13551,
					13552,
					13553,
					13554,
					13555,
					13556,
					13557,
					13558
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					13559,
					13560
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					13560,
					13561,
					13562,
					13563,
					13564
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					4325,
					13565,
					13566,
					13567,
					13568,
					13569,
					13570,
					13571,
					13572,
					13573,
					13574,
					13575,
					13576,
					13577,
					4325
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					2428,
					4579,
					11453,
					13578,
					1073,
					9686,
					6497,
					13465
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					2428,
					13579,
					11295,
					3780,
					13580
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13581,
					13582
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13269,
					13583
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13584,
					13585,
					13586,
					174,
					13587,
					13588,
					13589,
					13590,
					13591,
					13592,
					209,
					13593,
					13594
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13392,
					13595
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13594,
					13596
				]
			},
			{
				"speed": 40,
				"name": "West Florissant Avenue",
				"nodes": [
					13597,
					5707
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13595,
					13598,
					13599,
					13600,
					13601,
					13602,
					13603,
					13604,
					13379
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13605,
					13250
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13606,
					13607
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13407,
					13584
				]
			},
			{
				"speed": 35,
				"name": "North Elizabeth Avenue",
				"nodes": [
					13608,
					13609
				]
			},
			{
				"speed": 35,
				"name": "Old Halls Ferry Road",
				"nodes": [
					13610,
					13611,
					13612,
					13613,
					1277,
					1264,
					13614,
					9841,
					13615,
					13616,
					13617,
					13618,
					4299,
					12495,
					9352,
					12958,
					12255,
					13619,
					11443,
					7923,
					621,
					13620,
					13621,
					11994
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13315,
					13622,
					13623,
					13624,
					13625,
					13626,
					13627,
					13628,
					13629
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13630,
					13270,
					13631,
					13632,
					13633,
					13634,
					13635
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					13636,
					13283
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13582,
					13637,
					13638,
					150,
					13639,
					199,
					13640,
					13390,
					13641,
					13642,
					13605
				]
			},
			{
				"speed": 30,
				"name": "Missouri Bottom Road",
				"nodes": [
					13643,
					13644
				]
			},
			{
				"speed": 25,
				"name": "Gist Road",
				"nodes": [
					11338,
					13645,
					13646,
					13647,
					13648
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13649,
					13650,
					13651,
					13652,
					13653,
					13654
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					13655,
					13636
				]
			},
			{
				"speed": 40,
				"name": "McDonnell Boulevard",
				"nodes": [
					1388,
					13656
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13635,
					13657
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13249,
					13630
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13658,
					13659,
					13660,
					13661,
					13662,
					13663,
					13664,
					13665,
					2
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13666,
					13667,
					13668,
					13669,
					13245
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13657,
					13670,
					13671,
					13236,
					13672,
					13673,
					13674,
					13675,
					13676,
					13677,
					13678
				]
			},
			{
				"speed": 25,
				"name": "Woodford Way Drive",
				"nodes": [
					5361
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13225,
					13679,
					13680,
					13681,
					13682,
					13315
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13547,
					13683
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13629,
					13649
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13242,
					13684,
					13685,
					13658
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13607,
					13367
				]
			},
			{
				"speed": 30,
				"name": "Missouri Bottom Road",
				"nodes": [
					13686,
					8042,
					13687,
					13688,
					3715
				]
			},
			{
				"speed": 25,
				"name": "Gist Road",
				"nodes": [
					13648,
					13689,
					13690,
					13691,
					11529,
					13692,
					6747,
					13693,
					13694,
					13695,
					13696,
					13697,
					13698,
					13699,
					13700,
					13701,
					13702,
					13703,
					13704,
					13705,
					13706,
					13707,
					13708,
					13709,
					13710,
					13711,
					13712,
					13713,
					13714,
					13715,
					13716,
					13717,
					13718,
					13719,
					13720,
					13721
				]
			},
			{
				"speed": 40,
				"name": "West Florissant Avenue",
				"nodes": [
					13722,
					13723,
					13724,
					13725,
					13726,
					13727,
					13728,
					8286,
					13729,
					13730,
					13731,
					13732,
					4453,
					13733,
					13734,
					13735,
					13736,
					13737,
					13738,
					13739,
					13740,
					13597
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13683,
					13741,
					13742,
					13743
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13583,
					13744,
					205,
					249,
					321,
					13745,
					13746,
					13747,
					13748,
					13749,
					316,
					13750,
					13751,
					206,
					13752,
					13753,
					13581
				]
			},
			{
				"speed": 40,
				"name": "McDonnell Boulevard",
				"nodes": [
					13656,
					335,
					13754,
					85
				]
			},
			{
				"speed": 35,
				"name": "Old Halls Ferry Road",
				"nodes": [
					13755,
					13610
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13596,
					13756,
					13757,
					13758,
					13417,
					88,
					13759,
					13760,
					13761,
					13762,
					13763,
					13764,
					13765,
					13766,
					13767,
					13768,
					13769,
					13770,
					13771,
					13772,
					13773,
					48,
					24,
					17,
					13606
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					10,
					13774,
					13775,
					13776,
					13777,
					13778,
					13779,
					13780,
					13781,
					13782,
					13783,
					13784,
					13785
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13786,
					13787,
					13788,
					13789,
					13790,
					13791,
					13792
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13793,
					13794,
					13795,
					13796,
					13797,
					13798,
					13799,
					13800,
					13801,
					13802,
					13803,
					13
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13804,
					13805,
					13806,
					13807,
					13808,
					13809,
					13810,
					13811
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13812,
					13813,
					13814,
					13413
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					213,
					13815,
					13816,
					13817,
					13812
				]
			},
			{
				"speed": 40,
				"name": "West Florissant Avenue",
				"nodes": [
					13818,
					13819
				]
			},
			{
				"speed": 40,
				"name": "West Florissant Avenue",
				"nodes": [
					5708,
					21,
					13818
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13820,
					13263
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13262,
					13820
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13821,
					13822
				]
			},
			{
				"speed": 30,
				"name": "Dunn Road",
				"nodes": [
					13823,
					13824
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13822,
					13825,
					13826,
					13439,
					13827,
					13828,
					13829,
					156,
					13830,
					13831,
					13832,
					13833,
					13834,
					13835,
					13407
				]
			},
			{
				"speed": 40,
				"name": "West Florissant Avenue",
				"nodes": [
					13819,
					13836,
					13837,
					13838,
					13839,
					13840,
					13841,
					13842,
					13843,
					13844,
					13845,
					13846,
					4454,
					13847,
					13848,
					13849,
					13850,
					13851,
					8287,
					13852,
					13853,
					13854,
					13855,
					13856
				]
			},
			{
				"speed": 30,
				"name": "Dunn Road",
				"nodes": [
					13824,
					7158
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					134,
					13857,
					13858,
					13859,
					13860,
					13861,
					13473
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					133,
					13862,
					13863,
					13424
				]
			},
			{
				"speed": 30,
				"name": "Waterford Drive",
				"nodes": [
					13016,
					13864
				]
			},
			{
				"speed": 30,
				"name": "Waterford Drive",
				"nodes": [
					13864,
					2527
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					13011,
					13865,
					13866,
					13867,
					13868,
					13869
				]
			},
			{
				"speed": 40,
				"name": "Lindbergh Boulevard",
				"nodes": [
					13870,
					13871
				]
			},
			{
				"speed": 35,
				"name": "Washington Street",
				"nodes": [
					13872,
					12355,
					9793
				]
			},
			{
				"speed": 35,
				"name": "Washington Street",
				"nodes": [
					9793,
					13873,
					6944,
					4601,
					8340,
					10149,
					8077,
					11022,
					2783,
					5937,
					3643,
					13874
				]
			},
			{
				"speed": 25,
				"name": "St Ferdinand",
				"nodes": [
					9797,
					13875
				]
			},
			{
				"speed": 35,
				"name": "West Washington Street",
				"nodes": [
					13876,
					13877,
					9037
				]
			},
			{
				"speed": 35,
				"name": "Washington Street",
				"nodes": [
					5075,
					13872
				]
			},
			{
				"speed": 35,
				"name": "West Washington Street",
				"nodes": [
					10033,
					13876
				]
			},
			{
				"speed": 40,
				"name": "?",
				"nodes": [
					13871,
					2514,
					13878,
					13879,
					13880,
					13881,
					13882,
					6123,
					10822,
					2314,
					13883,
					13884,
					13885,
					13886,
					13887,
					13888,
					13889,
					13890,
					13891,
					13892,
					13893,
					13894,
					13895,
					13896,
					13897,
					13898,
					9690,
					13899,
					13900,
					13901,
					4063,
					13902,
					13903,
					13904,
					13905,
					4160,
					13906,
					13907,
					13908,
					13909,
					13910,
					13911,
					13912,
					13913,
					13914,
					11429,
					3978,
					13915,
					13916,
					1951,
					6245,
					13917,
					13918,
					13919,
					13920,
					13921,
					13922,
					13923
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					13924
				]
			},
			{
				"speed": 40,
				"name": "?",
				"nodes": [
					13925,
					13926
				]
			},
			{
				"speed": 40,
				"name": "?",
				"nodes": [
					13926,
					13927,
					13928,
					13929,
					13930,
					13931,
					13932,
					13933,
					13448,
					8924,
					13934,
					25
				]
			},
			{
				"speed": 40,
				"name": "?",
				"nodes": [
					99,
					13935,
					13936,
					13937,
					13655
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					13343,
					13938,
					13939
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					13456,
					540,
					11716,
					13924
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					42,
					13940,
					6841,
					13941,
					8923,
					13942,
					13456
				]
			},
			{
				"speed": 40,
				"name": "?",
				"nodes": [
					25,
					13488,
					47,
					13943,
					13944,
					99
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					33,
					13361,
					13945,
					108
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13946,
					13947,
					13948,
					13949,
					13950,
					13951,
					13952,
					13953,
					13954,
					13955,
					13956,
					13957,
					13958,
					13959,
					13960,
					13961,
					13962,
					13963,
					13964,
					13965,
					13966,
					77,
					13967,
					13968,
					13969,
					13970,
					13971,
					13972,
					340,
					13973,
					13974,
					13237,
					13975,
					13976,
					13977
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13978,
					13979,
					13980,
					13981,
					13982
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					91,
					13983,
					13984,
					13985,
					13986
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					92,
					13982,
					13987,
					13988,
					13989,
					13990,
					13763
				]
			},
			{
				"speed": 25,
				"name": "Fee Fee Road",
				"nodes": [
					1383,
					13991,
					11730,
					13992,
					13993,
					504,
					13994,
					2244
				]
			},
			{
				"speed": 30,
				"name": "Missouri Bottom Road",
				"nodes": [
					7681,
					13995,
					12486,
					2647,
					13996,
					13997,
					13998,
					13999,
					14000,
					14001
				]
			},
			{
				"speed": 40,
				"name": "James S McDonnell Boulevard;Brown Road",
				"nodes": [
					14002,
					13927,
					13924,
					14003,
					1383
				]
			},
			{
				"speed": 30,
				"name": "Taussig Avenue",
				"nodes": [
					14004,
					14005
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					14006,
					14007,
					14008,
					14009,
					13559
				]
			},
			{
				"speed": 30,
				"name": "Taussig Avenue",
				"nodes": [
					6577,
					14010,
					14011,
					14012
				]
			},
			{
				"speed": 35,
				"name": "Taussig Avenue",
				"nodes": [
					14013,
					14014,
					14015,
					14016,
					14017,
					7930
				]
			},
			{
				"speed": 25,
				"name": "Missouri Bottom Road",
				"nodes": [
					3715,
					14018,
					14019,
					14020,
					14021,
					14022,
					14023,
					14024,
					14025
				]
			},
			{
				"speed": 30,
				"name": "Missouri Bottom Road",
				"nodes": [
					14026,
					14027,
					14028,
					14029,
					14030,
					14031,
					14032,
					14033,
					14034,
					14035,
					14036,
					14037
				]
			},
			{
				"speed": 25,
				"name": "Monarch Drive",
				"nodes": [
					10037
				]
			},
			{
				"speed": 35,
				"name": "Washington Street",
				"nodes": [
					13874,
					14038,
					14039,
					14040,
					1105,
					6650,
					14041,
					2563,
					5957,
					2889,
					10128,
					5239,
					5177,
					11026,
					1782,
					2255,
					5655,
					14042,
					13609
				]
			},
			{
				"speed": 30,
				"name": "South Lafayette Street",
				"nodes": [
					7720,
					14043,
					14044,
					14045,
					14046,
					10147
				]
			},
			{
				"speed": 30,
				"name": "South Lafayette Street",
				"nodes": [
					964,
					5020,
					3869,
					2754,
					6520,
					7720
				]
			},
			{
				"speed": 30,
				"name": "Saint Denis Street",
				"nodes": [
					14047,
					14048,
					1503,
					12357,
					9795,
					4001,
					6947,
					12782,
					8343,
					10151,
					8080,
					11024,
					12786,
					2786
				]
			},
			{
				"speed": 40,
				"name": "North Hanley Road",
				"nodes": [
					71,
					14049,
					14050,
					6897,
					6069,
					14051,
					2385,
					14052,
					14053,
					9567,
					9736
				]
			},
			{
				"speed": 40,
				"name": "North Hanley Road",
				"nodes": [
					9736,
					10098,
					11786,
					12133,
					11797,
					13523,
					14054,
					14055,
					14056,
					14057,
					169
				]
			},
			{
				"speed": 25,
				"name": "Reasor Drive",
				"nodes": [
					12181,
					12123,
					5289
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14052,
					14058,
					14059,
					14060,
					14061,
					14062,
					14063,
					14064,
					14065,
					14066,
					14053
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14067,
					14068,
					14069,
					14070,
					14071,
					14072,
					14073
				]
			},
			{
				"speed": 25,
				"name": "Flora Drive",
				"nodes": [
					12177,
					12119,
					4536,
					14074,
					10991,
					10216,
					14075,
					5293
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14076,
					14077,
					14078,
					14079,
					14080,
					14081,
					14082,
					14083,
					14067,
					14084,
					14085,
					14086,
					14087,
					14088,
					14089,
					14090,
					14091,
					14092,
					14093
				]
			},
			{
				"speed": 35,
				"name": "Parker Road",
				"nodes": [
					2788,
					14094,
					5944,
					11814,
					3652,
					4959,
					13063,
					13061,
					7257,
					7252,
					2952,
					5559,
					1145,
					1905,
					13014,
					13869
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14095,
					14096,
					14097,
					14098,
					14088
				]
			},
			{
				"speed": 30,
				"name": "North New Florissant Road",
				"nodes": [
					2793,
					14099,
					14100,
					14101,
					14102,
					14103,
					14104,
					14105,
					14106,
					5817,
					14107,
					14108,
					14109,
					14110,
					352,
					14111,
					14112,
					14113,
					14114,
					14115,
					14116,
					14117
				]
			},
			{
				"speed": 30,
				"name": "Taussig Avenue",
				"nodes": [
					14118,
					14119,
					14120
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13743,
					14121
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13977,
					14122
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					14122,
					14123,
					14124,
					13635
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13217,
					14125
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					14121,
					14126,
					13654
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					14125,
					14127,
					14128,
					14129,
					14130
				]
			},
			{
				"speed": 30,
				"name": "Taussig Avenue",
				"nodes": [
					14131,
					14118
				]
			},
			{
				"speed": 25,
				"name": "Chateau De Marcay Trail",
				"nodes": [
					14132,
					14133,
					14134,
					14135
				]
			},
			{
				"speed": 25,
				"name": "Meadow Trail",
				"nodes": [
					14136,
					14137,
					14138,
					14139,
					14140,
					14141,
					14142,
					14143,
					14144,
					14145,
					14146,
					14147,
					14148,
					14149,
					14150,
					14151,
					14152,
					14153,
					14154,
					14155,
					14156
				]
			},
			{
				"speed": 25,
				"name": "Meadow Pass Drive",
				"nodes": [
					14137,
					14157,
					14158,
					14159,
					14160,
					14161,
					14162,
					14163,
					14164,
					14165,
					14166,
					14167,
					14168,
					14169,
					14170,
					14171
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14136,
					14172,
					14173,
					14132
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14174,
					14175,
					14176,
					14177
				]
			},
			{
				"speed": 30,
				"name": "Patterson Road",
				"nodes": [
					5530,
					11707
				]
			},
			{
				"speed": 25,
				"name": "Meadow Trail",
				"nodes": [
					14156,
					14133
				]
			},
			{
				"speed": 30,
				"name": "Humes Lane",
				"nodes": [
					3240,
					9851,
					9849,
					11768,
					3552,
					10407,
					5196,
					7242,
					4518,
					5647,
					3784,
					14178,
					14179,
					9392
				]
			},
			{
				"speed": 25,
				"name": "Mullanphy Road",
				"nodes": [
					9379,
					14180,
					3835,
					12457
				]
			},
			{
				"speed": 30,
				"name": "Campion Lane",
				"nodes": [
					639,
					11456
				]
			},
			{
				"speed": 25,
				"name": "Chateau Du Mont Drive",
				"nodes": [
					14181,
					14182,
					14183,
					14184,
					14185,
					14186,
					14187,
					14188,
					14189,
					14190,
					14191,
					14192,
					14193,
					14194,
					14195,
					14196,
					14181
				]
			},
			{
				"speed": 25,
				"name": "Chateau De Mont Drive",
				"nodes": [
					14135,
					14197,
					14198,
					14199,
					14200,
					14201,
					14202,
					14203,
					14204,
					14205,
					14206,
					14207,
					14208,
					14209,
					14210,
					14177
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					4390,
					14211
				]
			},
			{
				"speed": 40,
				"name": "New Halls Ferry Road",
				"nodes": [
					1,
					14212,
					14213,
					14214,
					14215,
					14216,
					8988,
					14217,
					19,
					14218,
					14219,
					5916,
					4291,
					1289,
					14220,
					8299,
					7562,
					14221,
					13856,
					14222,
					13722,
					14223,
					14224,
					14225,
					1336,
					14226,
					6486,
					14227,
					14228,
					1377,
					7181,
					14229,
					11971,
					10127,
					10027,
					1234,
					11564,
					4823,
					14230,
					14231,
					965,
					10412,
					8394,
					3813,
					3143,
					4557,
					7481,
					9125,
					7024,
					6371,
					14232,
					8193,
					14233,
					13885
				]
			},
			{
				"speed": 25,
				"name": "Keeven Lane",
				"nodes": [
					3471,
					14234,
					14235,
					14236,
					14237,
					14238,
					14239,
					14240,
					14241,
					14242,
					14243,
					14244,
					14245,
					14246,
					14247,
					14248,
					14249,
					14250,
					14251,
					14252,
					14253,
					14254,
					14255,
					14256,
					14257,
					14258,
					14259,
					3569
				]
			},
			{
				"speed": 25,
				"name": "Saratoga Springs Court",
				"nodes": [
					14260,
					14261,
					14262,
					14263,
					14264,
					14265,
					14266,
					14267,
					14268,
					14269,
					14270
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14271,
					14272,
					14273,
					14274
				]
			},
			{
				"speed": 25,
				"name": "Exacta Court",
				"nodes": [
					10380,
					14275,
					14276,
					14277,
					14278,
					14279,
					14280,
					14281,
					10384
				]
			},
			{
				"speed": 25,
				"name": "Grand National Drive",
				"nodes": [
					14282,
					14283,
					14284,
					14285,
					14286,
					4100,
					14287,
					14288,
					14271,
					14289,
					14290,
					14291,
					14292,
					14293,
					14294,
					14295,
					14296,
					14297,
					14298,
					14299
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14300,
					14301,
					14302,
					14303,
					14304,
					14305,
					14282
				]
			},
			{
				"speed": 25,
				"name": "Trifecta Drive",
				"nodes": [
					14274,
					14306,
					14307,
					14308,
					1297,
					1304,
					14309,
					14310,
					14311,
					14312,
					14313,
					14314,
					14315,
					14316,
					14317,
					14318,
					14319,
					14320,
					14321,
					14322,
					14323,
					14324,
					14325,
					3265
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14282,
					14326,
					14327,
					14328,
					14329,
					14330
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14330,
					14331,
					14332,
					5350
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					5350,
					14333,
					14334,
					14300
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14335,
					14336
				]
			},
			{
				"speed": 25,
				"name": "Saratoga Springs Court",
				"nodes": [
					14337,
					14338,
					14339,
					14340,
					14341,
					14342,
					14343,
					14344,
					14345,
					14346,
					14347,
					14348,
					14349,
					14350,
					14351,
					14352,
					14337
				]
			},
			{
				"speed": 25,
				"name": "Saratoga Springs Court",
				"nodes": [
					14283,
					14353,
					14354,
					14355,
					14356,
					14357,
					14358,
					14359,
					14270
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14289,
					14360,
					14361,
					14274
				]
			},
			{
				"speed": 25,
				"name": "Mercy Drive",
				"nodes": [
					2457,
					14362,
					14363,
					14364,
					14365,
					14366
				]
			},
			{
				"speed": 25,
				"name": "Wind Flower Drive",
				"nodes": [
					1525,
					14367,
					14368,
					14369,
					14370,
					14371,
					14372
				]
			},
			{
				"speed": 25,
				"name": "Shackelford Farms Ct",
				"nodes": [
					14373,
					2102
				]
			},
			{
				"speed": 25,
				"name": "Spring Beauty Drive",
				"nodes": [
					1876,
					14374,
					14375,
					14376,
					14377,
					8218
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1873,
					14378,
					14379,
					14380,
					14381,
					14382,
					14383,
					14384,
					14385,
					14386,
					14387,
					1873
				]
			},
			{
				"speed": 25,
				"name": "Spring Beauty Drive",
				"nodes": [
					2102,
					1876
				]
			},
			{
				"speed": 25,
				"name": "Wood Poppy Drive",
				"nodes": [
					1876,
					14388,
					14389,
					14390,
					14391,
					14392,
					14393,
					14394,
					14395,
					14396,
					14397,
					14398,
					14399
				]
			},
			{
				"speed": 25,
				"name": "Spring Beauty Drive",
				"nodes": [
					8218,
					14400,
					14401,
					14402,
					12753,
					14403,
					14404,
					14405,
					1714
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14406,
					14407,
					14408,
					14409,
					14410,
					14411,
					14412,
					14413,
					14414,
					14406
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14373,
					14415,
					14416,
					14417,
					14418,
					14419,
					14420,
					14421,
					14422,
					14423,
					14424,
					14373
				]
			},
			{
				"speed": 25,
				"name": "Portland Grove Court",
				"nodes": [
					14425,
					14426
				]
			},
			{
				"speed": 25,
				"name": "Hillow Court",
				"nodes": [
					14427,
					14406
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14428,
					14429,
					14430,
					14431,
					14432,
					14433,
					14434,
					14435,
					14428
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14436,
					14437,
					14438,
					14439,
					14440,
					14441,
					14442,
					14443,
					14444,
					14445,
					14436
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1462,
					14446,
					14447,
					14448,
					14449,
					14450,
					14451,
					14452,
					14453,
					1462
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					8041,
					14454,
					14455,
					14456,
					14457,
					14458,
					14459,
					14460,
					14461,
					14462,
					14463,
					8041
				]
			},
			{
				"speed": 25,
				"name": "Marie Way Court",
				"nodes": [
					14464,
					14465,
					14466,
					14467,
					14468,
					14469,
					14470,
					14471,
					14472,
					14473,
					14474,
					14475,
					14476,
					14477,
					14478,
					14479,
					14480
				]
			},
			{
				"speed": 25,
				"name": "Spring Beauty Drive",
				"nodes": [
					1714,
					14481,
					14482,
					14483,
					14484,
					14485,
					14486,
					14487
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					6133,
					14488,
					14489,
					14490,
					14491,
					14492,
					14493,
					14494,
					14495,
					14496,
					6133
				]
			},
			{
				"speed": 25,
				"name": "Red Clover Drive",
				"nodes": [
					1525,
					14497,
					14498,
					14499,
					14500,
					14501,
					14502,
					14503,
					14504,
					14505
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					8420,
					14506,
					14507,
					14508,
					14509,
					14510,
					14511,
					14512,
					14513,
					14514,
					14515,
					8420
				]
			},
			{
				"speed": 25,
				"name": "Terri Ann Court",
				"nodes": [
					14516,
					14428
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14480,
					14517,
					14518,
					14519,
					14520,
					14521,
					14522,
					14523,
					14524,
					14525,
					14480
				]
			},
			{
				"speed": 25,
				"name": "Saratoga Springs Court",
				"nodes": [
					14269,
					14526,
					14527,
					14528,
					14529,
					14530,
					14531,
					14532,
					14266
				]
			},
			{
				"speed": 25,
				"name": "Portland Manor Drive",
				"nodes": [
					14533,
					14534,
					14535,
					14536,
					14537,
					14538,
					14539,
					14540,
					14541,
					14542,
					14543,
					14544,
					14545,
					14546,
					14547,
					14548,
					14549,
					14550
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14551,
					14552,
					14553,
					14554,
					14555,
					14556,
					14557,
					14558,
					14559,
					14560,
					14561,
					14562,
					14563,
					14564,
					14565,
					14566,
					14567,
					14568,
					14551
				]
			},
			{
				"speed": 25,
				"name": "Portland Lake Drive",
				"nodes": [
					14569,
					14570,
					14571,
					14572,
					14573,
					14574,
					14575,
					14576,
					14577
				]
			},
			{
				"speed": 25,
				"name": "Triple Crown Drive",
				"nodes": [
					14578,
					14579,
					14580,
					14581,
					14582,
					14583,
					14584
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14538,
					14585,
					14586,
					14587,
					14588,
					14589,
					14590,
					14591,
					14537
				]
			},
			{
				"speed": 25,
				"name": "Jost Circle",
				"nodes": [
					14592,
					14551
				]
			},
			{
				"speed": 25,
				"name": "Karen Ann Court",
				"nodes": [
					14593,
					14594,
					14595,
					14596,
					14597,
					14598,
					14599,
					14436
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14600,
					2055,
					14601,
					14602,
					14603,
					14604,
					14605,
					14606,
					14607,
					14600
				]
			},
			{
				"speed": 25,
				"name": "Debridge Way",
				"nodes": [
					14608,
					14609,
					14610,
					14611,
					14612,
					14613,
					14614,
					14571
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1727,
					14615,
					14616,
					14617,
					14618,
					14619,
					14620,
					14621,
					14622,
					1727
				]
			},
			{
				"speed": 25,
				"name": "Margaret Ridge Drive",
				"nodes": [
					14623,
					14624,
					14625,
					14626,
					14627,
					14628,
					14608
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14623,
					14629,
					14630,
					14631,
					14632,
					14633,
					14634,
					14635,
					14636,
					14637,
					14623
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14638,
					14639,
					14640,
					14641,
					14642,
					14643,
					14644,
					14645,
					14646,
					14647,
					14648,
					14649,
					14638
				]
			},
			{
				"speed": 25,
				"name": "Caballo Crossing Drive",
				"nodes": [
					14464,
					14650,
					14651,
					14652,
					14653,
					14654,
					14655,
					14427,
					14656,
					14516,
					14425,
					13057
				]
			},
			{
				"speed": 25,
				"name": "Margaret Ridge Court",
				"nodes": [
					14657,
					14658
				]
			},
			{
				"speed": 25,
				"name": "Keevenshore Drive",
				"nodes": [
					14569,
					14659,
					14660,
					14661,
					14662,
					14663,
					14664,
					14665,
					14666,
					14667,
					14668,
					14669,
					14670,
					14671,
					14672,
					14673,
					14674
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					2219,
					14675,
					14676,
					14677,
					14678,
					14679,
					14680,
					14681,
					14682,
					14683,
					14684,
					2219
				]
			},
			{
				"speed": 25,
				"name": "Keevenshore Drive",
				"nodes": [
					14649,
					14685,
					14686,
					14687,
					14688,
					14689,
					14690,
					14691,
					14692,
					14693,
					14694,
					14695,
					14569
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14696,
					14697,
					14698,
					14699,
					14700,
					14701,
					14702,
					14703
				]
			},
			{
				"speed": 25,
				"name": "Eagle Estates Drive",
				"nodes": [
					1473,
					14704,
					14705,
					14706,
					14707,
					14708,
					14709,
					14710,
					14711,
					14712,
					14713,
					14714,
					14715,
					14716,
					14717,
					14718,
					14719,
					14720
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14426,
					14721,
					14722,
					14723,
					14724,
					14725,
					14726,
					14727,
					14728,
					14729,
					14730,
					14731,
					14732,
					14733,
					14734,
					14735,
					14736,
					14737,
					14738,
					14426
				]
			},
			{
				"speed": 25,
				"name": "Keeneland Court",
				"nodes": [
					14739,
					14740
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14741,
					14742,
					14743,
					14744,
					14745,
					14746,
					14747,
					14748,
					14749,
					14741
				]
			},
			{
				"speed": 25,
				"name": "Breeders Cup Drive",
				"nodes": [
					14750,
					14751,
					14741
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14658,
					14752,
					14753,
					14754,
					14755,
					14756,
					14757,
					14758,
					14759,
					14658
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14760,
					14761,
					14762,
					14763,
					14764,
					14765,
					14766,
					14767,
					14768,
					14769
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14770,
					14771,
					14772,
					14773,
					14774,
					14750
				]
			},
			{
				"speed": 25,
				"name": "Debridge Way",
				"nodes": [
					14775,
					14776,
					14777,
					14778,
					14779,
					14780,
					14781,
					14782
				]
			},
			{
				"speed": 25,
				"name": "Triple Crown Drive",
				"nodes": [
					14584,
					14783,
					14784,
					14785,
					14786,
					14787,
					14788,
					14789,
					14578
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14790,
					14791,
					14792,
					14793,
					14794,
					14795,
					14796,
					14797,
					14798,
					14790
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1713,
					14799,
					14800,
					14801,
					14802,
					14803,
					14804,
					14805,
					14806,
					1713
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1461,
					14807,
					14808,
					14809,
					14810,
					14811,
					14812,
					14813,
					14814,
					14815,
					1461
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14816,
					14817,
					14818,
					14819,
					14820,
					14821,
					14822,
					14823,
					14824,
					14825,
					14816
				]
			},
			{
				"speed": 25,
				"name": "Caballo Crossing Drive",
				"nodes": [
					14826,
					14827,
					14593,
					14828,
					14829,
					14830,
					14831,
					14832,
					14833,
					14834,
					14835,
					14464
				]
			},
			{
				"speed": 25,
				"name": "Triple Crown Drive",
				"nodes": [
					14578,
					14836,
					14837,
					14838,
					14839
				]
			},
			{
				"speed": 25,
				"name": "96th Avenue",
				"nodes": [
					3740,
					14840,
					14841,
					14842,
					14843,
					14844
				]
			},
			{
				"speed": 25,
				"name": "Sprinters Row Drive",
				"nodes": [
					14845,
					14846,
					14847,
					14848,
					14849,
					14850,
					14851,
					14852,
					14853
				]
			},
			{
				"speed": 25,
				"name": "94th Avenue",
				"nodes": [
					14854,
					13136
				]
			},
			{
				"speed": 25,
				"name": "Keeneland Road",
				"nodes": [
					14855,
					14856,
					14857,
					14858,
					14859,
					14860,
					14861,
					14862,
					14863,
					14864,
					14865,
					14866,
					14867,
					14868,
					14869,
					14870,
					14855
				]
			},
			{
				"speed": 25,
				"name": "94th Avenue",
				"nodes": [
					4633,
					14871,
					14872,
					14873,
					14874,
					14875,
					14876,
					14854
				]
			},
			{
				"speed": 25,
				"name": "94th Avenue",
				"nodes": [
					915,
					4633
				]
			},
			{
				"speed": 25,
				"name": "94th Avenue",
				"nodes": [
					7614,
					14877,
					14878,
					14879,
					14880,
					14881,
					14882,
					915
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14883,
					14884,
					14885,
					14886,
					14887,
					14888,
					14889,
					14890,
					924
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14891,
					14892,
					14893,
					14894,
					14895
				]
			},
			{
				"speed": 25,
				"name": "Margaret Ridge Drive",
				"nodes": [
					14896,
					14897,
					14898,
					14899,
					14900,
					14657,
					14901,
					14902,
					14903,
					14904,
					14905,
					14906,
					14907,
					14908,
					14909,
					14910,
					14911,
					14912,
					14913,
					14914,
					14915,
					14592,
					14916,
					14917,
					14918,
					14919,
					14920,
					14921,
					14608
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					12082,
					14922,
					14923,
					14924,
					14925,
					14926,
					14927,
					14928,
					14929,
					14930,
					12082
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					8911,
					14931,
					14932,
					14933,
					14934,
					14935,
					14936,
					14937,
					11464
				]
			},
			{
				"speed": 25,
				"name": "Jost Estates Drive",
				"nodes": [
					14938,
					14939,
					14940,
					14941,
					14942,
					14943
				]
			},
			{
				"speed": 25,
				"name": "Christus Court",
				"nodes": [
					14944,
					14945,
					14946,
					14947,
					14948,
					14949,
					14950,
					14951,
					14952,
					14953,
					14954,
					14955,
					14956,
					14957,
					14958,
					14959,
					14944
				]
			},
			{
				"speed": 25,
				"name": "Paschon Place",
				"nodes": [
					14816,
					14960,
					14961,
					14962,
					14963,
					14964,
					14965,
					14966,
					12081
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14967,
					13128
				]
			},
			{
				"speed": 25,
				"name": "Jost Main Street",
				"nodes": [
					14968,
					14969,
					14970,
					14971,
					14972,
					14973,
					14974,
					14975,
					14976,
					14977,
					14978,
					14979,
					14980,
					14981,
					14982,
					14983,
					14984,
					14985,
					14986,
					14987,
					14988,
					14989,
					14990,
					14991,
					14992
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					13124,
					14993,
					14994,
					14968
				]
			},
			{
				"speed": 25,
				"name": "Debridge Way",
				"nodes": [
					14782,
					14995,
					14996,
					14997,
					14998,
					14550,
					14999,
					15000,
					15001,
					15002,
					15003,
					14608
				]
			},
			{
				"speed": 25,
				"name": "Jost Manor Court",
				"nodes": [
					15004,
					15005,
					15006
				]
			},
			{
				"speed": 25,
				"name": "Jost Farm Way",
				"nodes": [
					14977,
					15007,
					15008,
					15009,
					15010,
					15011,
					15012,
					15013,
					15014,
					15015,
					15016,
					15017,
					15018,
					15019,
					15020,
					15004,
					15021,
					15022,
					15023
				]
			},
			{
				"speed": 25,
				"name": "Jost Manor Court",
				"nodes": [
					15006,
					15024,
					15025,
					15026,
					15027,
					15028,
					15029,
					15030,
					15031,
					15032,
					15033,
					15034,
					15035,
					15036,
					15006
				]
			},
			{
				"speed": 25,
				"name": "Jost Manor Drive",
				"nodes": [
					15037,
					15038,
					15039,
					15040,
					15041,
					15042,
					15043,
					15044,
					15045,
					15046,
					15047,
					15048,
					15049,
					15050,
					15051,
					15037
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					13123,
					15052,
					15053,
					14968
				]
			},
			{
				"speed": 25,
				"name": "Jost Manor Drive",
				"nodes": [
					15037,
					15054,
					15055,
					15056,
					15057,
					15058,
					15059,
					15060,
					15023
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					13127,
					15022
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					15061,
					15062,
					15063,
					15064,
					15065,
					15066,
					15067,
					15068,
					15069
				]
			},
			{
				"speed": 25,
				"name": "Understanding Court",
				"nodes": [
					6020,
					15070,
					15071,
					15072
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					13137,
					15073,
					15074,
					15075,
					15076
				]
			},
			{
				"speed": 25,
				"name": "Viembra Drive",
				"nodes": [
					15077,
					15078,
					15079,
					15080,
					15081,
					15082,
					15083,
					15084,
					15085
				]
			},
			{
				"speed": 25,
				"name": "Viembra Drive",
				"nodes": [
					15086,
					15087,
					15088,
					1422,
					15089,
					15090,
					15091,
					15092,
					15077,
					15085,
					15093,
					15094,
					15095,
					15096
				]
			},
			{
				"speed": 25,
				"name": "Fort de France Lane",
				"nodes": [
					4252,
					15097,
					14943,
					15098,
					15099
				]
			},
			{
				"speed": 25,
				"name": "Viembra Drive",
				"nodes": [
					15096,
					12768,
					15100,
					15101,
					15102,
					15103,
					15104
				]
			},
			{
				"speed": 25,
				"name": "Flandre Cove Court",
				"nodes": [
					8037,
					15105,
					15106,
					15107,
					15108,
					15109
				]
			},
			{
				"speed": 25,
				"name": "Jost Estates Drive",
				"nodes": [
					14943,
					15110,
					15111,
					15112,
					15113,
					15114,
					15115,
					15116,
					15069,
					15117,
					15061,
					15118,
					15119,
					15120,
					14967,
					15023
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14750,
					15121,
					15122,
					15123,
					15124
				]
			},
			{
				"speed": 25,
				"name": "Viembra Drive",
				"nodes": [
					5484,
					15125,
					15126,
					15127,
					15128,
					15129,
					15130,
					15131,
					15132,
					15086
				]
			},
			{
				"speed": 25,
				"name": "Rue de Renard",
				"nodes": [
					4492,
					15133,
					15134,
					15135,
					15136
				]
			},
			{
				"speed": 25,
				"name": "Arbre Lane",
				"nodes": [
					15137,
					15138,
					15139,
					15140,
					15141
				]
			},
			{
				"speed": 25,
				"name": "Faon Court",
				"nodes": [
					4498,
					15142,
					15143,
					15144,
					15145,
					15146
				]
			},
			{
				"speed": 25,
				"name": "Argonne Forest Drive",
				"nodes": [
					2427,
					15147,
					15148,
					15149,
					9919
				]
			},
			{
				"speed": 25,
				"name": "95th Avenue",
				"nodes": [
					3740,
					15150,
					15151,
					15152,
					15153,
					15154,
					15155,
					2631
				]
			},
			{
				"speed": 25,
				"name": "Sprinters Row Drive",
				"nodes": [
					15156,
					15157,
					15158,
					15159,
					15160,
					15161,
					15162,
					15163,
					15164,
					15165,
					15166,
					15167,
					15168,
					15169,
					15170,
					15171,
					12980,
					15172,
					15173,
					15174,
					15175,
					15176,
					15177,
					15178,
					14853,
					15179,
					14845,
					15180,
					15181,
					12186
				]
			},
			{
				"speed": 25,
				"name": "Arbre Lane",
				"nodes": [
					15141,
					15182,
					15183,
					15184
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					13135,
					15185,
					15186,
					15076
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					3947,
					15187
				]
			},
			{
				"speed": 25,
				"name": "95th Avenue",
				"nodes": [
					15188,
					15189,
					15190
				]
			},
			{
				"speed": 25,
				"name": "Argonne Forest Drive",
				"nodes": [
					9919,
					15191,
					15192,
					15193,
					15194,
					15195,
					15196,
					15197,
					15198,
					15199,
					15200,
					3947,
					13088,
					15201
				]
			},
			{
				"speed": 25,
				"name": "Arpent Lane",
				"nodes": [
					2425,
					15202,
					15203,
					15204,
					15205,
					12893
				]
			},
			{
				"speed": 25,
				"name": "Rue de Renard",
				"nodes": [
					15206,
					15184,
					15207,
					15208,
					15209,
					15210,
					15211,
					15212,
					15213,
					15214,
					15215,
					4492
				]
			},
			{
				"speed": 25,
				"name": "Rue de Renard",
				"nodes": [
					8447,
					15216,
					15217,
					15218,
					15219,
					15220,
					10445
				]
			},
			{
				"speed": 25,
				"name": "Fox Plains Drive",
				"nodes": [
					15221,
					15222,
					5987,
					15223,
					15224,
					15225,
					15226,
					15227,
					15228,
					8898,
					15229,
					4232
				]
			},
			{
				"speed": 25,
				"name": "Chaste Street",
				"nodes": [
					4628,
					15230,
					15231,
					15232,
					13134
				]
			},
			{
				"speed": 25,
				"name": "Chaste Street",
				"nodes": [
					926,
					14883,
					15233,
					15234,
					15235,
					15236,
					15237,
					15238,
					6950,
					15239,
					15240,
					15241,
					15242,
					15243,
					15244,
					15245,
					15246,
					15247,
					7614
				]
			},
			{
				"speed": 25,
				"name": "Fox Plains Drive",
				"nodes": [
					12965,
					15248,
					15249,
					15250,
					15251,
					15252,
					15253,
					3782
				]
			},
			{
				"speed": 25,
				"name": "Chaste Street",
				"nodes": [
					7614,
					15254,
					15255,
					15256,
					4628
				]
			},
			{
				"speed": 25,
				"name": "Sprinters Row Drive",
				"nodes": [
					12186,
					15257,
					15258,
					15259,
					15260,
					15261,
					15156
				]
			},
			{
				"speed": 25,
				"name": "Arbre Lane",
				"nodes": [
					11902,
					15262,
					15263,
					15264,
					15265,
					15266,
					15267,
					15268,
					15269,
					15206
				]
			},
			{
				"speed": 25,
				"name": "Keeneland Court",
				"nodes": [
					15270,
					15271,
					15272,
					15273,
					15274,
					15275,
					15276,
					14769,
					15277,
					14760,
					15278,
					15279,
					15280,
					15281,
					15282,
					15283,
					15284,
					15285,
					14751
				]
			},
			{
				"speed": 25,
				"name": "Baratton Drive",
				"nodes": [
					3954,
					15214
				]
			},
			{
				"speed": 25,
				"name": "Rue de Renard",
				"nodes": [
					15286,
					15287,
					15288,
					15289,
					15290,
					10984,
					15291,
					15292,
					15293,
					15294,
					15295,
					15137,
					15206
				]
			},
			{
				"speed": 25,
				"name": "Rue de Renard",
				"nodes": [
					10445,
					15296,
					15297,
					15298,
					15299,
					15286
				]
			},
			{
				"speed": 25,
				"name": "95th Avenue",
				"nodes": [
					2631,
					15188
				]
			},
			{
				"speed": 25,
				"name": "Hirondelle Lane",
				"nodes": [
					3954,
					15300,
					15301,
					15302,
					15303,
					15304,
					15305,
					13096
				]
			},
			{
				"speed": 25,
				"name": "Fox Plains Drive",
				"nodes": [
					6032,
					15306,
					15307,
					15308,
					15309,
					15310,
					15311,
					15312,
					12965
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					15313,
					15314,
					15315,
					14895
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					15316,
					15317,
					15318,
					15319,
					15320,
					15321,
					15322,
					15323,
					15324,
					15325
				]
			},
			{
				"speed": 25,
				"name": "94th Avenue",
				"nodes": [
					15076,
					12393,
					15326,
					6019,
					4759,
					15327,
					15328,
					6898,
					15329,
					15330
				]
			},
			{
				"speed": 25,
				"name": "Rosant Court",
				"nodes": [
					9642,
					15331,
					15332,
					15333,
					15334,
					15335,
					15336,
					15337,
					9640
				]
			},
			{
				"speed": 25,
				"name": "Viembra Drive",
				"nodes": [
					1984,
					15338,
					15339,
					15340,
					15341,
					15342,
					15343,
					15344,
					15345,
					15346,
					15347,
					15348,
					15349,
					15350,
					15351,
					15352,
					15353,
					5484
				]
			},
			{
				"speed": 25,
				"name": "Del Lago Drive",
				"nodes": [
					14895,
					12081,
					15354,
					15355,
					15356,
					15357,
					12336,
					15358,
					15359,
					15360,
					15361,
					11331,
					15362,
					15363,
					15364,
					15365,
					15366,
					15367,
					15368,
					15369,
					6657,
					15370,
					15371,
					15372,
					1940,
					15373,
					15374,
					15375,
					15376,
					15377,
					15378,
					8484,
					15379,
					15380,
					15381,
					15382
				]
			},
			{
				"speed": 25,
				"name": "Jost Estates Drive",
				"nodes": [
					14938,
					15383,
					15384,
					15385,
					15386,
					15387,
					15388,
					15389,
					15390,
					15391,
					15392,
					15393,
					15394,
					15395,
					15396,
					14938
				]
			},
			{
				"speed": 25,
				"name": "Les Cherbourg Lane",
				"nodes": [
					6090,
					15397,
					15398,
					15399,
					15400,
					15401,
					15402,
					15403,
					15404,
					6093
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					15127,
					15405,
					15406,
					15407,
					15408,
					15409,
					15410,
					15411,
					15412,
					11902
				]
			},
			{
				"speed": 25,
				"name": "Arpent Lane",
				"nodes": [
					2906,
					15413,
					15414,
					15415,
					15416,
					15417,
					15418,
					15419,
					15420,
					2425
				]
			},
			{
				"speed": 25,
				"name": "Viembra Drive",
				"nodes": [
					15348,
					15421,
					15422,
					15423,
					15424,
					15425,
					15426,
					15427,
					15349
				]
			},
			{
				"speed": 25,
				"name": "Fox Plains Drive",
				"nodes": [
					3782,
					15188,
					7612,
					15428,
					15429,
					15430,
					15431,
					15221
				]
			},
			{
				"speed": 25,
				"name": "Bangor Drive",
				"nodes": [
					15432,
					15433,
					15434,
					15435,
					15436,
					15437,
					15438,
					15439,
					14782
				]
			},
			{
				"speed": 25,
				"name": "Keeneland Court",
				"nodes": [
					15270,
					15440,
					15441,
					15442,
					15443,
					1460,
					15444,
					15445,
					15446,
					15447,
					15448,
					15449,
					15450,
					15451,
					15325,
					15316,
					15452,
					15453,
					15454,
					15455,
					15456,
					15457,
					15458,
					15459,
					15460,
					15461,
					15462,
					15463,
					15464,
					15465,
					14751
				]
			},
			{
				"speed": 25,
				"name": "Tera Bera Drive",
				"nodes": [
					8227,
					15466,
					15467,
					15468,
					15469,
					15470,
					15471,
					15472,
					8229
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					15461,
					15473,
					15474,
					15475,
					15476,
					15477,
					15478,
					15479,
					15459
				]
			},
			{
				"speed": 25,
				"name": "Bugle Bend Drive",
				"nodes": [
					3783,
					15480,
					15481,
					15482,
					15483,
					15484,
					15485,
					15486,
					15487,
					15488,
					15489,
					15490,
					15491,
					15492,
					15493,
					15494,
					5724
				]
			},
			{
				"speed": 25,
				"name": "Jost Villa Drive",
				"nodes": [
					14971,
					15495,
					15496,
					15497,
					15498,
					15499,
					15500,
					15501,
					15502,
					15503,
					15504,
					15505,
					15506,
					15507,
					15508,
					15509,
					15510,
					15511,
					15512,
					15513,
					15514,
					15515,
					15516,
					15517,
					15518,
					15519,
					15520,
					15521
				]
			},
			{
				"speed": 25,
				"name": "Triple Crown Drive",
				"nodes": [
					14790,
					15522,
					15523,
					15524,
					15525,
					15526,
					15527,
					15528,
					1726,
					2054,
					15529,
					15530,
					1712,
					15531,
					14703,
					14696,
					15532,
					15533,
					15534,
					15535,
					14584
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					15501,
					15536,
					15537,
					15538,
					15539,
					15540,
					15541,
					15542,
					15543,
					15503
				]
			},
			{
				"speed": 25,
				"name": "90th Avenue",
				"nodes": [
					15229,
					15544,
					15545,
					15546,
					15547,
					15548
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14153,
					15549,
					15550,
					15551,
					15552,
					15553,
					15554,
					14151
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14146,
					15555,
					15556,
					15557,
					15558,
					15559,
					15560,
					15561,
					14144
				]
			},
			{
				"speed": 25,
				"name": "Verdun Estates Drive",
				"nodes": [
					2762,
					15562,
					15563,
					15564,
					15565,
					15566,
					15567,
					15568,
					15569,
					15570,
					15571,
					15572,
					15127
				]
			},
			{
				"speed": 25,
				"name": "Hirondelle Lane",
				"nodes": [
					12901,
					15573,
					15574,
					15575,
					15576,
					9910,
					15577,
					15578,
					15579,
					15580,
					15581,
					15582,
					15583,
					15584,
					15585,
					15586,
					15587,
					15588,
					15589,
					15590,
					15591,
					15592,
					15593,
					15594,
					15595,
					15596,
					3954
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					15597,
					15598,
					15599,
					15600,
					15601,
					15602,
					15603,
					15604,
					15605,
					15606,
					15607,
					15608,
					15609,
					15610,
					15611,
					15612,
					15613,
					15614,
					15615,
					15616,
					15617,
					600
				]
			},
			{
				"speed": 25,
				"name": "Wiethaupt Road",
				"nodes": [
					14211,
					15618,
					15619,
					15620,
					15597,
					15621,
					15622,
					15623,
					15624,
					15625,
					15626,
					15627,
					15628,
					568
				]
			},
			{
				"speed": 30,
				"name": "Greenway Chase Drive",
				"nodes": [
					15629,
					15630
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					15630,
					15631
				]
			},
			{
				"speed": 25,
				"name": "Greenway Chase Drive",
				"nodes": [
					15630,
					15632
				]
			},
			{
				"speed": 25,
				"name": "Barkwood Drive",
				"nodes": [
					15633,
					11870,
					15634,
					15635,
					15636,
					15637,
					9407
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					15638,
					1830
				]
			},
			{
				"speed": 25,
				"name": "Woodman Drive",
				"nodes": [
					11660,
					15639
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					12957,
					15640
				]
			},
			{
				"speed": 30,
				"name": "Greenway Chase Drive",
				"nodes": [
					15641,
					15642,
					15643
				]
			},
			{
				"speed": 25,
				"name": "Norberg Drive",
				"nodes": [
					15633,
					15644,
					1344
				]
			},
			{
				"speed": 25,
				"name": "Matlock Drive",
				"nodes": [
					8711,
					15645,
					15646,
					15647,
					15648,
					15649,
					15650,
					15651,
					15652,
					15653,
					15654,
					15655,
					2121
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					708,
					15656
				]
			},
			{
				"speed": 25,
				"name": "Langholm Drive",
				"nodes": [
					8721,
					15657,
					15658,
					15659,
					15660,
					15661,
					15662,
					15663,
					15664,
					15665,
					15666
				]
			},
			{
				"speed": 25,
				"name": "Barkwood Drive",
				"nodes": [
					1834,
					15667,
					15668,
					15669,
					15670,
					15671,
					15672,
					15633
				]
			},
			{
				"speed": 25,
				"name": "Greenway Chase Drive",
				"nodes": [
					15673,
					15674,
					15675,
					15676,
					7561
				]
			},
			{
				"speed": 25,
				"name": "Greenway Chase Drive",
				"nodes": [
					15632,
					1830
				]
			},
			{
				"speed": 25,
				"name": "Whispering Woods Drive",
				"nodes": [
					15656,
					15677,
					1833,
					15640
				]
			},
			{
				"speed": 25,
				"name": "Kilmory Drive",
				"nodes": [
					14174,
					15678,
					15679,
					14134,
					15680,
					15681,
					15682,
					15683,
					9405,
					15684
				]
			},
			{
				"speed": 25,
				"name": "Norberg Drive",
				"nodes": [
					11659,
					15685,
					15686,
					15687,
					15633
				]
			},
			{
				"speed": 25,
				"name": "Norberg Drive",
				"nodes": [
					11870,
					11660
				]
			},
			{
				"speed": 25,
				"name": "Woodpath Drive",
				"nodes": [
					15643,
					15630
				]
			},
			{
				"speed": 25,
				"name": "Greenway Chase Drive",
				"nodes": [
					15643,
					15631
				]
			},
			{
				"speed": 25,
				"name": "Greenway Chase Drive",
				"nodes": [
					1837,
					15688,
					15689,
					15690,
					15691,
					11356,
					15692,
					15693,
					15694,
					7241,
					15695,
					6754
				]
			},
			{
				"speed": 25,
				"name": "Woodpath Drive",
				"nodes": [
					15630,
					15696,
					15697
				]
			},
			{
				"speed": 25,
				"name": "Greenway Chase Drive",
				"nodes": [
					15631,
					15698,
					15699,
					15700,
					15701,
					15702,
					15638
				]
			},
			{
				"speed": 25,
				"name": "Woodpath Drive",
				"nodes": [
					15703,
					15704,
					15705,
					15706,
					15643
				]
			},
			{
				"speed": 25,
				"name": "Woodpath Drive",
				"nodes": [
					15631,
					15707,
					15708,
					15709,
					15710,
					15703
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					15711,
					15712,
					15713,
					15714,
					15715,
					15716,
					15717,
					15718,
					15719,
					15720,
					15711
				]
			},
			{
				"speed": 25,
				"name": "Briargrove Drive",
				"nodes": [
					15640,
					15721,
					15722,
					15723,
					15724,
					15725,
					15726,
					15696
				]
			},
			{
				"speed": 25,
				"name": "Woodpath Drive",
				"nodes": [
					12838,
					15727,
					15728,
					15729,
					10915,
					15703
				]
			},
			{
				"speed": 25,
				"name": "Greenway Chase Drive",
				"nodes": [
					15638,
					15730,
					15731,
					15732,
					15733,
					15734,
					15735,
					15736,
					15673
				]
			},
			{
				"speed": 25,
				"name": "Whispering Woods Drive",
				"nodes": [
					12956,
					15737,
					15738,
					15739,
					15740,
					15741,
					15711
				]
			},
			{
				"speed": 25,
				"name": "Greenway Chase Drive",
				"nodes": [
					1830,
					15742,
					15743,
					15744,
					15745,
					15746,
					15747,
					15748,
					15749,
					15673
				]
			},
			{
				"speed": 25,
				"name": "Clanfield Drive",
				"nodes": [
					15750,
					15751,
					15752,
					15753,
					15754,
					15755,
					15756,
					15757,
					15758
				]
			},
			{
				"speed": 25,
				"name": "Matlock Drive",
				"nodes": [
					2121,
					15759,
					15760,
					15761,
					15762
				]
			},
			{
				"speed": 25,
				"name": "Whispering Woods Drive",
				"nodes": [
					15656,
					15763,
					15764,
					15765,
					1834,
					12956
				]
			},
			{
				"speed": 25,
				"name": "Matlock Drive",
				"nodes": [
					15684,
					15766,
					15767,
					15768,
					15769,
					15770,
					15771,
					15772,
					8711
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1344,
					11869
				]
			},
			{
				"speed": 25,
				"name": "Matlock Drive",
				"nodes": [
					8895,
					11339,
					1849,
					15773,
					15684
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					7598,
					15774,
					15775,
					15776,
					15777,
					15778,
					15779,
					15780,
					7232
				]
			},
			{
				"speed": 25,
				"name": "Boardwalk Avenue",
				"nodes": [
					8886,
					15781,
					15782,
					15783,
					9403
				]
			},
			{
				"speed": 25,
				"name": "Boardwalk Avenue",
				"nodes": [
					5388,
					15784,
					15785,
					15786,
					15787,
					15788,
					15789,
					8886
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					8432,
					15790,
					15791,
					15792,
					15793,
					15794,
					15795,
					15796,
					15797
				]
			},
			{
				"speed": 25,
				"name": "Celerity Drive",
				"nodes": [
					5862,
					15798,
					15799,
					15800,
					15801,
					15802,
					15803,
					15804,
					15805,
					5865
				]
			},
			{
				"speed": 25,
				"name": "Greenway Chase Drive",
				"nodes": [
					7707,
					15806,
					15807,
					15808
				]
			},
			{
				"speed": 25,
				"name": "Greenway Chase Drive",
				"nodes": [
					6754,
					15809,
					15810,
					1526,
					15811,
					15812,
					15813,
					15814,
					15815,
					15816,
					15817,
					15818,
					15819,
					7707
				]
			},
			{
				"speed": 25,
				"name": "Key Gardens Drive",
				"nodes": [
					11356,
					15820,
					15821,
					15822,
					15823,
					15824,
					15825,
					15826,
					15827
				]
			},
			{
				"speed": 25,
				"name": "Spartina Drive",
				"nodes": [
					8433,
					15828,
					15797,
					15829,
					15830,
					15831,
					5856
				]
			},
			{
				"speed": 25,
				"name": "Celerity Drive",
				"nodes": [
					5865,
					15832,
					15833,
					15834,
					15835,
					15836,
					15837,
					15838,
					15839,
					15840,
					8421
				]
			},
			{
				"speed": 25,
				"name": "Langholm Drive",
				"nodes": [
					7561,
					15841,
					15762,
					15842,
					15843,
					15844,
					15845,
					15846,
					15847,
					15848,
					15849,
					15850,
					15851,
					8721
				]
			},
			{
				"speed": 35,
				"name": "North Elizabeth Avenue",
				"nodes": [
					9020,
					13978,
					92,
					13986,
					13608
				]
			},
			{
				"speed": 25,
				"name": "Dividend Park Drive",
				"nodes": [
					15852,
					15853,
					15854,
					15855,
					15856,
					15857,
					15858,
					15859,
					15860
				]
			},
			{
				"speed": 25,
				"name": "Emerald Creek Ct",
				"nodes": [
					15861,
					15862,
					15863,
					15864
				]
			},
			{
				"speed": 25,
				"name": "Emerald Creek Ct",
				"nodes": [
					15865,
					15866,
					15867,
					15868,
					15869,
					15870,
					15871,
					15872,
					15873,
					15874,
					15875,
					15876,
					15877,
					15878,
					15879,
					15880,
					15881,
					15882,
					15883,
					15884,
					15885,
					15886,
					15887,
					15888,
					15889,
					15890,
					15891,
					15892,
					15893,
					15894,
					15861
				]
			},
			{
				"speed": 25,
				"name": "Dolfield Drive",
				"nodes": [
					15895,
					15896,
					15897
				]
			},
			{
				"speed": 25,
				"name": "Emerald Creek Ct",
				"nodes": [
					15861,
					15898,
					15899,
					15900,
					15901,
					15902,
					15903,
					15904
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					4388,
					15905,
					15906,
					15907
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					15873,
					15908,
					15909,
					15910,
					15911,
					15912,
					15913,
					15876
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					15861,
					15914
				]
			},
			{
				"speed": 25,
				"name": "Parmer Drive",
				"nodes": [
					3361,
					15915,
					15916,
					15917,
					15918,
					15919,
					15920,
					15921,
					15922,
					15895
				]
			},
			{
				"speed": 25,
				"name": "Dolfield Drive",
				"nodes": [
					3360,
					15895
				]
			},
			{
				"speed": 25,
				"name": "Chapel Ct",
				"nodes": [
					15923,
					15924,
					15925,
					15926,
					15927,
					15928,
					15929,
					15864
				]
			},
			{
				"speed": 25,
				"name": "Golden Pond Ct",
				"nodes": [
					15930,
					15931,
					15932,
					15933,
					15934,
					15926
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					9400,
					15935,
					15936,
					15914
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					9399,
					15937,
					15938,
					15914
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					15939,
					3551
				]
			},
			{
				"speed": 25,
				"name": "Liberty Gardens Drive",
				"nodes": [
					6267,
					15940,
					15941,
					15942,
					15943
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					4381,
					15944,
					15945,
					15946,
					15939
				]
			},
			{
				"speed": 25,
				"name": "Clanfield Drive",
				"nodes": [
					7241,
					15947,
					15948,
					15949,
					15950,
					15750,
					15951,
					15952,
					15953,
					15758,
					15954,
					15955
				]
			},
			{
				"speed": 25,
				"name": "Dawnview Drive",
				"nodes": [
					9661,
					15956,
					15957,
					15958,
					15959,
					15960,
					15961,
					15962,
					15963,
					15964
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					4382,
					15965,
					15966,
					15967,
					15939
				]
			},
			{
				"speed": 25,
				"name": "Garden Village Drive",
				"nodes": [
					15968,
					15969,
					15970,
					15971,
					15972,
					15973,
					15974,
					15975
				]
			},
			{
				"speed": 25,
				"name": "Garden Village Drive",
				"nodes": [
					15976,
					15977,
					15978,
					15979,
					15980,
					15981,
					15982,
					15983,
					15984,
					15985,
					15986,
					15987,
					15988
				]
			},
			{
				"speed": 25,
				"name": "Garden Village Drive",
				"nodes": [
					15968,
					15989,
					15990,
					15991,
					15992,
					15993,
					15994,
					15995,
					15996,
					15997,
					15976
				]
			},
			{
				"speed": 25,
				"name": "Chesswood Drive",
				"nodes": [
					3551,
					15998,
					15999,
					16000,
					16001,
					16002,
					16003,
					15964
				]
			},
			{
				"speed": 25,
				"name": "Garden Village Drive",
				"nodes": [
					12682,
					15988,
					16004,
					15975,
					16005,
					16006,
					15968
				]
			},
			{
				"speed": 25,
				"name": "Night Drive",
				"nodes": [
					16007,
					16008,
					6717,
					16009,
					16010,
					16011,
					16012,
					16013,
					16014,
					16015,
					16016,
					16017,
					16018,
					16019,
					16020
				]
			},
			{
				"speed": 25,
				"name": "Central Parkway",
				"nodes": [
					16021,
					16022,
					16023,
					16024,
					16025,
					16026,
					16027,
					16028,
					16029,
					16030,
					16031,
					16032
				]
			},
			{
				"speed": 25,
				"name": "White Ash Court",
				"nodes": [
					2972,
					16033,
					16034,
					16035,
					16036,
					16037,
					16038
				]
			},
			{
				"speed": 25,
				"name": "Greenway Chase Drive",
				"nodes": [
					7561,
					16039,
					16040,
					16041,
					16042,
					16043,
					16044,
					16045,
					16046,
					16047,
					16048,
					16049,
					16050,
					16051,
					1837
				]
			},
			{
				"speed": 25,
				"name": "Central Parkway",
				"nodes": [
					6466,
					7447,
					16021
				]
			},
			{
				"speed": 25,
				"name": "Dividend Park Drive",
				"nodes": [
					7591,
					15852,
					16052,
					16053,
					16054,
					15860,
					16055,
					16056,
					16057,
					16058,
					16059
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					2506,
					16060,
					16061,
					16062,
					16063,
					16064,
					9395
				]
			},
			{
				"speed": 25,
				"name": "Kingsford Drive",
				"nodes": [
					9175,
					738,
					16065,
					16066,
					6318,
					16067,
					1324,
					16068,
					16069,
					16070,
					16032
				]
			},
			{
				"speed": 25,
				"name": "Kingsford Drive",
				"nodes": [
					16071,
					927,
					16072,
					16073,
					16011
				]
			},
			{
				"speed": 25,
				"name": "High Sun Drive",
				"nodes": [
					2513,
					16074,
					16075
				]
			},
			{
				"speed": 25,
				"name": "Stoney End Court",
				"nodes": [
					16076,
					16077,
					16078,
					16079
				]
			},
			{
				"speed": 25,
				"name": "Battlefield Drive",
				"nodes": [
					16072,
					16080,
					16081,
					16082,
					16083,
					938
				]
			},
			{
				"speed": 25,
				"name": "Kingsford Drive",
				"nodes": [
					16032,
					16084,
					16085,
					8813,
					16086,
					16087,
					16076,
					16071
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					654,
					16088,
					16089,
					16090,
					16091,
					16092,
					653
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16093,
					6729
				]
			},
			{
				"speed": 25,
				"name": "Central Parkway",
				"nodes": [
					10011,
					16094,
					16095,
					16096,
					16097,
					16098,
					8622
				]
			},
			{
				"speed": 25,
				"name": "River Oaks Drive",
				"nodes": [
					16099,
					16100,
					16101,
					16102,
					16103,
					16104
				]
			},
			{
				"speed": 25,
				"name": "Ocean Side Drive",
				"nodes": [
					4000,
					16105,
					16106,
					16107,
					16108,
					16109
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16110,
					16111,
					16112,
					16113,
					16114,
					16115,
					16116,
					16117,
					15865
				]
			},
			{
				"speed": 25,
				"name": "Meadows Court",
				"nodes": [
					16104,
					16118,
					16119,
					13898
				]
			},
			{
				"speed": 25,
				"name": "Ashbury Crossing Court",
				"nodes": [
					16120,
					16121,
					16122,
					16123,
					16124,
					16125,
					16126,
					16127,
					16128,
					16129,
					16130,
					16131,
					16120
				]
			},
			{
				"speed": 25,
				"name": "Lighthouse Drive",
				"nodes": [
					4000,
					16132
				]
			},
			{
				"speed": 25,
				"name": "Monsols Drive",
				"nodes": [
					16133,
					16134,
					16135,
					16136,
					16137,
					16138,
					16139,
					16140,
					16141
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					3508,
					16142,
					16143,
					16144,
					16145
				]
			},
			{
				"speed": 25,
				"name": "Harting Dr",
				"nodes": [
					16146,
					16147,
					16148,
					16149,
					16150,
					16151,
					16152,
					16153,
					16154,
					16155,
					16156,
					3361
				]
			},
			{
				"speed": 25,
				"name": "Liberty Gardens Drive",
				"nodes": [
					12682,
					16157,
					16158,
					16159,
					16160,
					16161,
					16162,
					16163,
					6267
				]
			},
			{
				"speed": 25,
				"name": "Ashbury Crossing Court",
				"nodes": [
					16101,
					16120
				]
			},
			{
				"speed": 25,
				"name": "Monsols Drive",
				"nodes": [
					16164,
					16165
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					3507,
					16166,
					16167
				]
			},
			{
				"speed": 25,
				"name": "Central Parkway",
				"nodes": [
					16032,
					10011
				]
			},
			{
				"speed": 25,
				"name": "Monsols Drive",
				"nodes": [
					16165,
					16168,
					16169,
					4841
				]
			},
			{
				"speed": 30,
				"name": "Mondoubleau Lane",
				"nodes": [
					3512,
					16170,
					16171,
					16172,
					16173,
					16174,
					5221,
					16175,
					2771,
					16176,
					16177,
					13896
				]
			},
			{
				"speed": 25,
				"name": "Freestone Ct",
				"nodes": [
					9790,
					16178,
					16179,
					16180,
					16181,
					16182,
					16183,
					16184,
					16185,
					16186,
					16187,
					16188,
					16189,
					16190,
					16191,
					16192,
					16193,
					16194,
					9790
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16146,
					16195,
					16196,
					16197,
					16198,
					16199,
					16200,
					16201,
					16202,
					16203,
					16204,
					16205,
					16206,
					16207,
					16146
				]
			},
			{
				"speed": 25,
				"name": "Argonne Forest Drive",
				"nodes": [
					15201,
					16208
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					4064,
					16209,
					16210,
					16211,
					16212,
					16213
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16214,
					16215,
					16216
				]
			},
			{
				"speed": 25,
				"name": "Argonne Forest Drive",
				"nodes": [
					16217,
					16218,
					16219,
					16220,
					16221
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16222,
					16223,
					16224
				]
			},
			{
				"speed": 25,
				"name": "Ocean Side Drive",
				"nodes": [
					16109,
					16225,
					16226,
					16227,
					16228,
					16229,
					7473
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16230,
					16231,
					16232,
					16233,
					16234
				]
			},
			{
				"speed": 25,
				"name": "Riverfront Dr",
				"nodes": [
					16235,
					16236,
					16237,
					16238,
					16239,
					16240,
					16241,
					16242
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16243,
					16244,
					16245,
					16246,
					16247,
					16248,
					16249,
					16250,
					16251,
					16252,
					16253,
					16254,
					16255,
					16243
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					3996,
					16256,
					16257,
					16217
				]
			},
			{
				"speed": 25,
				"name": "Argonne Forest Dr",
				"nodes": [
					16255,
					16258,
					16259,
					16260,
					16261,
					16262,
					16217
				]
			},
			{
				"speed": 25,
				"name": "Northern Limits Drive",
				"nodes": [
					16263,
					6703,
					16264,
					16265,
					16266,
					16267,
					5657,
					16268,
					16269,
					16270,
					16271,
					16272,
					16030
				]
			},
			{
				"speed": 25,
				"name": "River Oaks Drive",
				"nodes": [
					16234,
					16273,
					16274,
					16275,
					16276,
					16277,
					16278,
					16279,
					16280,
					16281,
					16282,
					16283,
					16284,
					16285,
					16286,
					16287,
					6295
				]
			},
			{
				"speed": 25,
				"name": "New Sun Ct",
				"nodes": [
					16288,
					16289,
					16290,
					16291,
					16292,
					16293,
					16294,
					16295,
					16296,
					16297,
					16298,
					16299,
					7431
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16242,
					16300,
					16301,
					16302
				]
			},
			{
				"speed": 25,
				"name": "Monsols Drive",
				"nodes": [
					3512,
					16303,
					16304,
					16305,
					16306,
					16307,
					6998,
					16308,
					9204,
					16164
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					4387,
					16309,
					16310,
					15907
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16311,
					10646
				]
			},
			{
				"speed": 25,
				"name": "Argonne Forest Drive",
				"nodes": [
					16221,
					16312
				]
			},
			{
				"speed": 25,
				"name": "Hidden Dr",
				"nodes": [
					16156,
					15907
				]
			},
			{
				"speed": 25,
				"name": "Dolfield Drive",
				"nodes": [
					1872,
					3360
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16313,
					16314,
					16315,
					16316,
					16234
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16273,
					16317,
					16318,
					10648
				]
			},
			{
				"speed": 25,
				"name": "Cape Horn Place",
				"nodes": [
					4600,
					16319,
					16320,
					16321,
					16322,
					1648,
					16323,
					16324,
					16325,
					16326,
					7702
				]
			},
			{
				"speed": 25,
				"name": "Riverfront Dr",
				"nodes": [
					16242,
					16327,
					16328,
					16329,
					16216,
					16330,
					16331,
					16332,
					16333
				]
			},
			{
				"speed": 25,
				"name": "River Oaks Drive",
				"nodes": [
					16104,
					16334,
					16335,
					16336,
					16337,
					16338,
					16339,
					16340,
					16341,
					16342,
					16343,
					16344,
					16345,
					16346,
					16347,
					16348,
					16349,
					16119
				]
			},
			{
				"speed": 25,
				"name": "Ocean Side Drive",
				"nodes": [
					7473,
					16350,
					16351,
					16352,
					16353,
					16354,
					16355,
					16356,
					16357,
					16358,
					16359,
					16360,
					16361,
					16362,
					16363,
					16364,
					16365,
					16366
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16367,
					16368,
					16369,
					16370,
					16371,
					16372,
					16373,
					16374,
					16375
				]
			},
			{
				"speed": 25,
				"name": "Central Parkway",
				"nodes": [
					8622,
					16376,
					16377,
					16378,
					10962,
					2979,
					16379,
					6729
				]
			},
			{
				"speed": 30,
				"name": "Mondoubleau Lane",
				"nodes": [
					10445,
					12901,
					16380,
					16381,
					16382,
					16383,
					16384,
					2427,
					16385,
					16386,
					16387,
					2901,
					16388,
					16389,
					16390,
					16391,
					3512
				]
			},
			{
				"speed": 25,
				"name": "Glen Allen Court",
				"nodes": [
					16392,
					16393,
					16394,
					16395,
					16396,
					16397,
					16398,
					16399,
					16400,
					16392,
					16401,
					16402,
					16403,
					16404,
					16405
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16406,
					16407,
					16408,
					16409,
					16410,
					16411,
					16412,
					16413,
					16414,
					16406
				]
			},
			{
				"speed": 25,
				"name": "Misty Crossing Ct",
				"nodes": [
					16415,
					16416,
					16417,
					16418,
					16419,
					16420,
					16421,
					16422,
					16423,
					16424,
					16425,
					16426,
					3978
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16427,
					16428,
					16429,
					16430
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16431,
					16432,
					16433,
					16434,
					16435,
					16436,
					16437,
					16438,
					16439
				]
			},
			{
				"speed": 25,
				"name": "Belhmann Lake Court",
				"nodes": [
					16440,
					16441,
					16442,
					16443,
					16444,
					16445,
					16446,
					16447,
					16448,
					16449,
					16440,
					16450,
					16451,
					16452,
					16453,
					16454,
					16455,
					16456,
					16457,
					16458,
					16459,
					16460,
					16461,
					16462
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16275,
					16463,
					16464,
					10648
				]
			},
			{
				"speed": 25,
				"name": "Delcastle Drive",
				"nodes": [
					16465,
					16466,
					16467,
					16468,
					16469,
					16470,
					16471,
					16472,
					16473,
					16474,
					16475,
					16476,
					16477,
					16478,
					16479,
					16480,
					16481,
					16482,
					16483,
					16484,
					16485,
					16486,
					16487,
					16488,
					16489,
					16490,
					16491,
					12245
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					8359,
					16492,
					16493,
					16494,
					16495,
					16496,
					16497,
					16498,
					16499,
					16500,
					16501,
					8359
				]
			},
			{
				"speed": 25,
				"name": "Behlmann Orchard Court",
				"nodes": [
					16502,
					16503,
					16504,
					16505,
					16506,
					16507,
					16508,
					16509,
					16510,
					16511,
					16502
				]
			},
			{
				"speed": 25,
				"name": "Hollow Brook Dr",
				"nodes": [
					16512,
					16513,
					16514,
					16515,
					16516,
					16517,
					16431,
					16439,
					16518,
					16519,
					13902
				]
			},
			{
				"speed": 25,
				"name": "Channel Drive",
				"nodes": [
					7702,
					16213,
					16520,
					4065
				]
			},
			{
				"speed": 25,
				"name": "Behlmann Farms Boulevard",
				"nodes": [
					16521,
					16522,
					16523,
					16524,
					16525,
					16526,
					16527,
					16528,
					16529,
					16530,
					16531,
					16521,
					16532,
					16533,
					16534,
					16535,
					16536,
					16537,
					16538,
					16539,
					16540,
					16541,
					16542,
					16543,
					16544,
					16545,
					16546
				]
			},
			{
				"speed": 25,
				"name": "Behlmann Grove Place",
				"nodes": [
					16547,
					16548,
					16549,
					16550,
					16551,
					16552,
					16553,
					16554,
					16555,
					16547,
					16556,
					16557,
					16558,
					16559,
					16560,
					16561,
					16562,
					16563,
					16564,
					16565,
					16566,
					16567,
					16568,
					16569,
					16570,
					16571,
					16561
				]
			},
			{
				"speed": 25,
				"name": "Hidden Cove Lane",
				"nodes": [
					6687,
					16572,
					16573,
					16574,
					16575,
					16576,
					16577,
					16578,
					16579,
					2028,
					16580,
					16581
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16582,
					16583
				]
			},
			{
				"speed": 25,
				"name": "Belhmann Meadows Way",
				"nodes": [
					16584,
					16585,
					16586,
					16587,
					16588,
					16589,
					16590,
					16591,
					16592,
					16593,
					16594,
					16595,
					16596,
					16597,
					16598,
					16599,
					16600,
					16601,
					16602,
					16603,
					16604,
					16605,
					16606,
					16607,
					16608,
					16609,
					16610,
					16611,
					16612,
					16613,
					16614,
					16615,
					16616,
					16617,
					16618,
					16619,
					16620,
					16621,
					16622,
					16623,
					16624,
					16546
				]
			},
			{
				"speed": 25,
				"name": "Carytown Lane",
				"nodes": [
					16625,
					16626,
					16627,
					16628,
					16629,
					16630,
					16631,
					16632,
					16633,
					16634,
					16635,
					16636,
					16637,
					16638,
					16639,
					16640,
					16641,
					16642,
					16643,
					16644,
					16645,
					16646,
					16647,
					16648,
					16649,
					16650,
					16639
				]
			},
			{
				"speed": 25,
				"name": "Behlmann Estates Court",
				"nodes": [
					16651,
					16652,
					16653,
					16654,
					16655,
					16656,
					16657,
					16658,
					16659,
					16660,
					16651
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16584,
					16661,
					16662,
					16663
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16664,
					16665,
					16666,
					16667,
					16668,
					16669,
					16670,
					16671,
					16672
				]
			},
			{
				"speed": 25,
				"name": "Monsols Drive",
				"nodes": [
					4841,
					16673,
					16674,
					16675,
					16676,
					16677,
					16133
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					2029,
					16678,
					16679,
					16680,
					16681,
					16682,
					16683,
					16684,
					16685,
					16686,
					16687,
					16688,
					2029
				]
			},
			{
				"speed": 25,
				"name": "Bertha Place Court",
				"nodes": [
					16689,
					16690,
					16691,
					16692,
					16693,
					16694,
					16695,
					16696,
					16697,
					16698,
					16699,
					16700,
					16691
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16465,
					16701,
					16702,
					16703
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					8315,
					16704,
					16705,
					16706,
					16707,
					16708,
					16709,
					16710,
					16711,
					16712,
					8315
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16572,
					16713,
					16714,
					16715,
					16716,
					16717,
					16718,
					16719,
					16720,
					16721,
					16722,
					16723,
					16724,
					16725,
					16726,
					16575
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16727,
					16728,
					16584
				]
			},
			{
				"speed": 25,
				"name": "Behlmann Estates Court",
				"nodes": [
					16729,
					16730,
					16731,
					16732,
					16651
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16465,
					16733,
					16734,
					16735,
					16736
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16595,
					16737,
					16738,
					16739,
					16740,
					16741,
					16742,
					16593
				]
			},
			{
				"speed": 25,
				"name": "August Place Court",
				"nodes": [
					16743,
					16744,
					16745,
					16746,
					16747,
					16748,
					16749,
					16750,
					16751,
					16752,
					16753,
					16754,
					16755,
					16756,
					16757,
					16758,
					16759,
					16760,
					16761,
					16762,
					16752
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16604,
					16763,
					16764,
					16765,
					16766,
					16767,
					16768,
					16769,
					16602
				]
			},
			{
				"speed": 25,
				"name": "Behlmann Farms Boulevard",
				"nodes": [
					13908,
					16770,
					16771,
					16772,
					16582,
					16773,
					16774,
					16775,
					16776,
					16743,
					16777,
					16778,
					16779,
					16780,
					16781,
					16782,
					16783
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16430,
					16784,
					16785,
					16786
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1888,
					16787,
					16788,
					16789,
					16790,
					16791,
					16792,
					16793,
					16794,
					16795,
					16796,
					1888
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					11506,
					16797,
					16798,
					16799,
					16800,
					16801,
					16802,
					16803,
					16804,
					16805,
					16806,
					11506
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16807,
					16808,
					16809,
					16810,
					16811,
					16812,
					16813,
					16814
				]
			},
			{
				"speed": 25,
				"name": "Behlmann Orchard Court",
				"nodes": [
					16815,
					16816,
					16817,
					16502
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16415,
					16818,
					16819,
					16820,
					16821,
					16822,
					16823,
					16417
				]
			},
			{
				"speed": 25,
				"name": "Behlmann Farms Court",
				"nodes": [
					16824,
					16825,
					16826,
					16827,
					16828,
					16829,
					16830,
					16831,
					16832,
					16833,
					16834,
					16835,
					16836,
					16837,
					16838,
					16839,
					16840,
					16841,
					16830
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16743,
					16824
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16589,
					16842,
					16843,
					16844,
					16845,
					16846,
					16587
				]
			},
			{
				"speed": 25,
				"name": "Behlmann Trails",
				"nodes": [
					16558,
					16847,
					16848,
					16849,
					16850,
					16851,
					16852,
					16853,
					16469
				]
			},
			{
				"speed": 25,
				"name": "Delcastle Drive",
				"nodes": [
					4406,
					16854,
					16855,
					8328,
					16581,
					16856,
					16857,
					16858,
					16859,
					16860,
					8358,
					13916
				]
			},
			{
				"speed": 25,
				"name": "Emerald Creek Ct",
				"nodes": [
					15864,
					16861,
					16862,
					16863,
					16110,
					16864,
					16865,
					15865
				]
			},
			{
				"speed": 25,
				"name": "Riverfront Drive",
				"nodes": [
					16866,
					16867,
					6988,
					16868,
					16869,
					16870,
					16871,
					16872,
					16873,
					16874,
					16875,
					16876,
					10646
				]
			},
			{
				"speed": 25,
				"name": "Behlmann Estates Lane",
				"nodes": [
					16490,
					16877,
					16878,
					16462,
					16879,
					16880,
					16689,
					16881,
					16882,
					16883,
					16729,
					16884,
					16885,
					16886,
					16887,
					16888,
					16889,
					16890,
					16891,
					16892,
					16893,
					16894,
					16885
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16895,
					15888
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16613,
					16896,
					16897,
					16898,
					16899,
					16900,
					16901,
					16611
				]
			},
			{
				"speed": 25,
				"name": "Hollow Brook Ct",
				"nodes": [
					16515,
					16902,
					16903,
					16904,
					16905,
					16906,
					16907,
					16908,
					16909,
					16910,
					16911
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16868,
					16912,
					16913,
					16914,
					16915,
					16916,
					4593,
					16917
				]
			},
			{
				"speed": 25,
				"name": "Monsols Drive",
				"nodes": [
					16133,
					16918,
					16919,
					16141,
					16920,
					16921,
					16922,
					16923,
					16924,
					16925,
					16926,
					16278
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16600,
					16927,
					16928,
					16929,
					16930,
					16931,
					16932,
					16933,
					16598
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16934,
					16935,
					16936,
					16937
				]
			},
			{
				"speed": 25,
				"name": "Candlewyck Green Ct",
				"nodes": [
					16938,
					16939,
					16940,
					16941,
					16942,
					16943,
					16944,
					16945,
					16946,
					16947,
					16948,
					16949,
					16950,
					16951,
					16952,
					16953,
					16938
				]
			},
			{
				"speed": 25,
				"name": "Belcroft Drive",
				"nodes": [
					6263,
					16954,
					16955,
					16956,
					16957,
					16958,
					16959,
					16960,
					16961,
					16962,
					16963
				]
			},
			{
				"speed": 25,
				"name": "Candlebrook Ct",
				"nodes": [
					16964,
					16965,
					16966,
					16937
				]
			},
			{
				"speed": 25,
				"name": "Candlebrook Ct",
				"nodes": [
					16967,
					16968,
					16969,
					16970,
					16971,
					16972,
					16973,
					16974,
					16975,
					16976,
					16964
				]
			},
			{
				"speed": 25,
				"name": "Villa Green Ct",
				"nodes": [
					16977,
					16978,
					16979,
					16980,
					16981,
					16982,
					16983
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16984,
					16985,
					16986,
					16937
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16987,
					16988,
					16989,
					16990,
					16991,
					16992,
					16993,
					16994
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					16995,
					16996,
					16997,
					16998,
					16999,
					17000,
					17001,
					17002,
					17003,
					17004
				]
			},
			{
				"speed": 25,
				"name": "Galaxie Drive",
				"nodes": [
					9689,
					17005,
					16995,
					17006
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1982,
					17007,
					17008,
					17009,
					17010,
					17011,
					17012,
					17013,
					17014,
					17015,
					1982
				]
			},
			{
				"speed": 25,
				"name": "Le Sabre Drive",
				"nodes": [
					17016,
					6232,
					17017,
					10252,
					17018,
					17019,
					17020,
					17021,
					17004,
					17006
				]
			},
			{
				"speed": 25,
				"name": "Cordin Drive",
				"nodes": [
					9688,
					17017
				]
			},
			{
				"speed": 25,
				"name": "Riverfront Drive",
				"nodes": [
					16302,
					1704,
					17022,
					17023,
					17024,
					17025,
					17026,
					1660,
					17027,
					17028,
					16224,
					16866
				]
			},
			{
				"speed": 25,
				"name": "Behlmann Farms Boulevard",
				"nodes": [
					16546,
					17029,
					17030,
					17031,
					17032,
					17033,
					17034,
					17035,
					17036,
					17037,
					17038,
					17039,
					17040,
					17041,
					16815,
					17042,
					17043,
					17044,
					17045,
					17046,
					17047,
					17048,
					17049,
					17050,
					17051,
					17052,
					17053,
					16807,
					17054,
					16814,
					17055,
					17056,
					17057,
					16430
				]
			},
			{
				"speed": 25,
				"name": "Misty Crossing Ct",
				"nodes": [
					16406,
					17058,
					17059,
					17060,
					17061,
					17062,
					17063,
					17064,
					17065,
					17066,
					17067,
					17068,
					17069,
					17070,
					17071,
					16415
				]
			},
			{
				"speed": 25,
				"name": "Hollow Brook Ct",
				"nodes": [
					16911,
					17072,
					17073,
					17074,
					17075,
					17076,
					17077,
					17078,
					17079,
					17080,
					17081,
					17082,
					16911
				]
			},
			{
				"speed": 25,
				"name": "Belcroft Drive",
				"nodes": [
					6232,
					6263
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					7227,
					17083,
					17084,
					17085,
					17086,
					17087,
					17088,
					17089,
					17090,
					7227
				]
			},
			{
				"speed": 25,
				"name": "River Oaks Drive",
				"nodes": [
					6295,
					17091,
					17092,
					17093,
					6317,
					17094
				]
			},
			{
				"speed": 25,
				"name": "Gulf Shore West",
				"nodes": [
					17095,
					17096,
					17097,
					17098,
					17099,
					17100,
					17101,
					17102,
					17103,
					17104,
					17105,
					17023
				]
			},
			{
				"speed": 25,
				"name": "Millvalley Drive",
				"nodes": [
					16071,
					17106,
					17107,
					1172,
					17108,
					17109,
					17110,
					17111,
					17112,
					2972
				]
			},
			{
				"speed": 25,
				"name": "Candlewyck Club Drive",
				"nodes": [
					17113,
					17114,
					17115,
					17116,
					17117,
					17118,
					17119,
					17120,
					17121,
					17122,
					17123,
					17124,
					17125,
					17126,
					17127,
					17128,
					17129
				]
			},
			{
				"speed": 25,
				"name": "Robbins Grove Drive",
				"nodes": [
					17130,
					17131,
					17132,
					17133,
					17134,
					17135,
					17136,
					17137,
					17138,
					17139,
					17130,
					17140,
					17141,
					17142,
					17143,
					17144,
					17145,
					17146,
					17147,
					17148,
					17149,
					17150,
					17151,
					17152,
					17153,
					17154,
					17155,
					17156,
					17157,
					17158,
					17159,
					17160,
					17161,
					16367,
					17162,
					17163,
					16375,
					17164,
					17165,
					17166,
					17167,
					17168,
					17169,
					17170,
					17171,
					17172,
					17173,
					13905
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					17174,
					17175,
					16783,
					16663,
					17176,
					17177,
					16727,
					16786,
					17178,
					17179,
					16427,
					16736,
					17180,
					16703,
					17181,
					17182,
					17183,
					17174
				]
			},
			{
				"speed": 25,
				"name": "Candlewyck Club Drive",
				"nodes": [
					17184,
					17185,
					17186,
					17187,
					17188,
					17189,
					17190,
					17191,
					17192,
					17193,
					17194,
					17195,
					17196,
					17197,
					17198,
					17199,
					17200,
					17201,
					17202,
					17113
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					11892,
					17203,
					17204,
					17205,
					17206,
					17207,
					17208,
					17209,
					17210,
					11892
				]
			},
			{
				"speed": 25,
				"name": "Parmer Drive",
				"nodes": [
					9783,
					17211,
					17212,
					17213,
					17214,
					17215,
					17216,
					17217,
					17218,
					9781
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					17219,
					17220,
					17221,
					17222,
					17223,
					17224,
					17225,
					17226,
					16964
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					17227,
					17228,
					17229,
					17230,
					17231,
					17232,
					17233,
					17234,
					17235,
					17236,
					17237,
					17238,
					17239,
					17240,
					17241,
					17242,
					17243,
					17244,
					378
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					17245,
					17246,
					17247,
					224
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					17248,
					17249,
					17250,
					17251,
					17252,
					17253,
					17254,
					17255,
					5214,
					17248
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					17256,
					17257,
					17258,
					17259,
					17260,
					17261,
					17262,
					17263,
					17264,
					17265,
					17266,
					17267,
					17256
				]
			},
			{
				"speed": 25,
				"name": "Marion Garden Lane",
				"nodes": [
					7374,
					17268,
					17269,
					17270,
					17271,
					17272,
					17273,
					17274,
					17275,
					17276,
					17277,
					17278,
					17279,
					17280,
					17281,
					17282,
					17283,
					17284,
					17285,
					17286,
					17287,
					17288,
					17256
				]
			},
			{
				"speed": 25,
				"name": "Old Jamestown Winery Rd",
				"nodes": [
					6833,
					17289,
					17290,
					17291,
					17292,
					17293,
					17294,
					17295,
					17296,
					17297,
					17298,
					17299,
					17300,
					17301,
					17302,
					17303,
					17304,
					17305,
					17306,
					17307,
					17308,
					17309,
					17310,
					17311,
					17312,
					17313
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					17314,
					17315,
					17316,
					17317,
					17318,
					17319,
					17320,
					17321,
					17322,
					17323,
					17324,
					17325,
					17326,
					17327,
					17328,
					17329,
					17330,
					17331
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					17332,
					17333,
					17334,
					17335,
					17336,
					17337,
					17338,
					17339,
					17332
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					17340,
					17341,
					17342,
					17343,
					17344,
					17345
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					17346,
					17347,
					17348,
					17349,
					17350,
					17351,
					17352,
					17353,
					17354,
					17355,
					17356
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					291,
					17357,
					17358,
					17359,
					17360,
					17361,
					17362,
					17363,
					17364,
					17365,
					17366,
					17367,
					17368,
					17369,
					17370,
					17371,
					17372,
					17373,
					17374,
					17375,
					17376,
					17377,
					17378,
					17379,
					17380,
					17340
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					17381,
					17382,
					17383,
					17384,
					17385,
					17386,
					17387,
					17388,
					17389,
					17381
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					17390,
					17391,
					17392,
					17393,
					17246
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					17394,
					17395,
					17396,
					17397,
					17398,
					17399,
					17400,
					17401,
					17402,
					17403,
					17404,
					17405,
					277,
					17406,
					17407,
					17408,
					17409,
					17410,
					17411,
					17412,
					17413,
					17414,
					17415,
					17416,
					17417,
					17418
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					232,
					17419,
					17420
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					17371,
					17421,
					17422,
					17423,
					17424,
					17425,
					17370
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					17381,
					17426,
					17427,
					17428,
					17429,
					396
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					17332,
					17430,
					17431,
					17432,
					17433,
					17434,
					17435,
					17436,
					17437,
					17438,
					17439,
					17440,
					17441,
					17442,
					17443,
					17444,
					17445,
					17446,
					17447,
					17448,
					17449,
					17450,
					17451,
					17452,
					17453,
					17454,
					17455,
					17456,
					17457,
					17458,
					17459,
					17418
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					17460,
					17461,
					17462,
					17463,
					17464,
					17465,
					17466,
					17467,
					17468,
					17469,
					17470,
					17313,
					17460
				]
			},
			{
				"speed": 25,
				"name": "Behlmann Farms Boulevard",
				"nodes": [
					17182,
					17471,
					17472,
					17473,
					17474,
					17475,
					17476,
					17477,
					16824,
					17478,
					17479,
					17480,
					16583,
					17481,
					17482,
					17483,
					13909
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					308,
					17484,
					17485,
					17486,
					17487,
					17488,
					17489,
					17356,
					17490,
					17491
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					17356,
					17492,
					17493,
					17494,
					17495,
					17496,
					17497,
					17498,
					17499,
					17500,
					17501,
					17340
				]
			},
			{
				"speed": 25,
				"name": "Old Jamestown Court",
				"nodes": [
					8860,
					17502,
					17503,
					17504,
					17505,
					17506,
					17507,
					17508,
					17509,
					17510,
					17511,
					17512,
					17513,
					17514,
					17515,
					17516,
					17517,
					17518
				]
			},
			{
				"speed": 25,
				"name": "Laclede Rd",
				"nodes": [
					397,
					17519,
					17520,
					17521,
					17331,
					17522,
					17523,
					17524,
					17525,
					17526,
					17527,
					17528,
					17529,
					17530,
					17531,
					17532,
					215
				]
			},
			{
				"speed": 25,
				"name": "Laclede Rd",
				"nodes": [
					215,
					17533,
					17534,
					17535,
					17536,
					17537,
					17538,
					17539,
					255,
					17540,
					17541,
					17542,
					17543,
					17544
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					17518,
					17545,
					17546,
					17547,
					17548,
					17549,
					17550,
					17551,
					17552,
					17553,
					17554,
					17555,
					17518
				]
			},
			{
				"speed": 25,
				"name": "Candlewyck Club Dr",
				"nodes": [
					17556,
					17557,
					17558,
					17559,
					17560,
					17561,
					16934,
					17562,
					16984,
					17563,
					17564,
					17565,
					17566,
					17567,
					17568,
					17569,
					17570,
					17571,
					17572,
					17573,
					17574,
					17575,
					17576,
					17577,
					17578,
					17579,
					17580,
					13893
				]
			},
			{
				"speed": 25,
				"name": "Richmond Forest Drive",
				"nodes": [
					17581,
					17582,
					17583,
					17584,
					17585,
					17586,
					17587,
					17588,
					17589,
					17590,
					17581,
					17591,
					17592,
					17593,
					17594,
					17595,
					17596,
					17597,
					17598,
					16664,
					17599,
					16672,
					17600,
					17601,
					17602,
					17603,
					17604,
					17605,
					17606,
					17607,
					17608,
					17609,
					16405,
					17610,
					17611,
					17612,
					17613,
					17614,
					17615,
					17616,
					17617,
					17618,
					17619,
					17620,
					17621,
					17622,
					17623,
					17624,
					17625,
					17626,
					17627,
					17628,
					17629,
					17630,
					17631,
					17632,
					16625,
					17633,
					17634,
					17635,
					17636,
					17637,
					13906
				]
			},
			{
				"speed": 25,
				"name": "Robbins Way Drive",
				"nodes": [
					17151,
					17638,
					17639,
					17640,
					17641,
					17642,
					17643,
					17644,
					17645,
					17646,
					17647,
					17648,
					17649,
					17650,
					17651,
					17652,
					17653,
					17654,
					17655,
					17656,
					17657,
					17658,
					17659,
					17660,
					17661,
					17165
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					17423,
					17662,
					17663,
					17664,
					17665,
					17666,
					17667,
					17668,
					17669,
					17670,
					17671,
					17672,
					17673,
					17674,
					17675,
					17676,
					17677,
					17678,
					17679,
					17680
				]
			},
			{
				"speed": 25,
				"name": "Chadwick Drive",
				"nodes": [
					2089,
					17681,
					17682
				]
			},
			{
				"speed": 25,
				"name": "Yorkshire Drive",
				"nodes": [
					4768,
					17683,
					17684,
					17685,
					17686,
					17687,
					17688,
					17689,
					17690,
					5047,
					17691
				]
			},
			{
				"speed": 25,
				"name": "Brunswick Drive",
				"nodes": [
					5047,
					17692,
					17693,
					17694,
					17695,
					17696,
					17697,
					17698,
					17699,
					5266,
					17700,
					17701,
					17702,
					17703
				]
			},
			{
				"speed": 25,
				"name": "Wedgwood Drive West",
				"nodes": [
					4030,
					17704,
					17705,
					17706,
					17707,
					17708,
					17709,
					17710,
					17682,
					17711,
					17712,
					17713,
					17714,
					17715,
					17716,
					5037,
					17717,
					17718
				]
			},
			{
				"speed": 25,
				"name": "Westminster Drive",
				"nodes": [
					7415,
					17719,
					17720,
					17721,
					17722,
					17723,
					17724,
					17725,
					17726,
					17727,
					17728,
					17729,
					17730,
					17731,
					17732
				]
			},
			{
				"speed": 25,
				"name": "Wintergreen Drive",
				"nodes": [
					5325,
					17733,
					17734,
					17735,
					17736,
					17737,
					17738,
					17739,
					17740,
					17741,
					17742,
					17743,
					17744,
					17745,
					17746,
					17747,
					17748,
					17749,
					17750,
					17751,
					17752,
					17753,
					17754,
					17755
				]
			},
			{
				"speed": 30,
				"name": "Portage Road",
				"nodes": [
					17756,
					17757,
					17758,
					17759,
					17760,
					17761,
					17762,
					17763,
					17764,
					17765,
					17766,
					17767,
					17768,
					17769,
					17770,
					17771
				]
			},
			{
				"speed": 25,
				"name": "Brookshire Drive",
				"nodes": [
					4761,
					17772,
					17773,
					17774,
					5261,
					17775,
					17776,
					17703
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					9696,
					17777,
					17778,
					17779,
					17780,
					17781,
					17782,
					17783,
					17784,
					9695
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					17785,
					17786,
					17787,
					17788,
					17789,
					17790,
					17791,
					17792,
					17793,
					17794,
					17795,
					17796,
					17797,
					17798,
					17799,
					17800,
					17801,
					17802,
					17803,
					308
				]
			},
			{
				"speed": 25,
				"name": "Aberdeen Drive",
				"nodes": [
					2027,
					17804,
					17805,
					17806,
					17807,
					17808,
					17809,
					17810,
					17811,
					17812,
					17813,
					17814,
					17815,
					17816,
					17817,
					17818,
					17819,
					17820,
					17821,
					17822
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					17823,
					17824,
					17825,
					17826,
					17827
				]
			},
			{
				"speed": 30,
				"name": "Sinks Road",
				"nodes": [
					7349,
					17828,
					17829,
					17830,
					17831,
					17832,
					17833,
					17834,
					17835,
					17836,
					17837,
					17838,
					17839,
					17840,
					17841,
					17842,
					17843,
					17844,
					17845,
					17846,
					17847,
					17848,
					17849,
					17850,
					17851,
					17852,
					17853,
					17394,
					17854
				]
			},
			{
				"speed": 30,
				"name": "Sinks Road",
				"nodes": [
					17854,
					17855,
					17856,
					17857,
					17858,
					17544,
					17859,
					17860,
					17861,
					17862
				]
			},
			{
				"speed": 25,
				"name": "Summerfield Lane",
				"nodes": [
					4165,
					17863,
					17864
				]
			},
			{
				"speed": 25,
				"name": "Bay Wind Ct",
				"nodes": [
					11436,
					17823
				]
			},
			{
				"speed": 25,
				"name": "James River Drive",
				"nodes": [
					5286,
					17865
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					349,
					17866,
					17867,
					17868,
					17869,
					17870,
					17871,
					17872,
					17873,
					17874,
					17875,
					349
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					4835,
					17876,
					17877,
					17878,
					17879,
					17880,
					17881,
					17882,
					17883,
					17884,
					17885,
					4835
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					10223,
					17886,
					17887,
					17888,
					17889,
					17890,
					17891,
					17892,
					17893,
					17894,
					10223
				]
			},
			{
				"speed": 25,
				"name": "Jamestown Bay Drive",
				"nodes": [
					10224,
					17895,
					17896,
					17897,
					17898,
					17899,
					17900,
					17901,
					17902,
					17903,
					17904,
					17905,
					17906
				]
			},
			{
				"speed": 30,
				"name": "Sinks Road",
				"nodes": [
					2844,
					17907,
					17908,
					17909,
					17910,
					17911,
					17912,
					17913,
					17914,
					17915,
					17916,
					17917,
					17918,
					17919,
					17920,
					17921,
					17922,
					6791
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					5285,
					17923,
					17924,
					17925,
					17926,
					17927,
					17928,
					17929,
					17930,
					17931,
					17932,
					17933,
					5285
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					17934,
					17935,
					17936,
					17937,
					17938,
					17939,
					3977
				]
			},
			{
				"speed": 25,
				"name": "Williamsburg Manor Drive",
				"nodes": [
					3988,
					6985,
					17940,
					17941,
					17942
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					17906,
					17943,
					17944,
					17945,
					17946
				]
			},
			{
				"speed": 30,
				"name": "Old Jamestown Road",
				"nodes": [
					13918,
					17947,
					17948,
					17949,
					17950,
					17951,
					17952,
					17953,
					17954
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					17942,
					17955,
					17956,
					17957,
					17958,
					17959,
					17960,
					17961,
					17962,
					17942
				]
			},
			{
				"speed": 30,
				"name": "Old Jamestown Road",
				"nodes": [
					10498,
					17963,
					17964,
					17965,
					17756,
					17966,
					17967,
					17968,
					17969,
					17970,
					17971,
					17972,
					17973,
					17974,
					17975,
					3273,
					17976,
					17977
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					2326,
					17978
				]
			},
			{
				"speed": 25,
				"name": "Bay Wind Ct",
				"nodes": [
					17827,
					17979,
					17980,
					17981,
					17982,
					17983
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1221,
					17984,
					17985,
					17986
				]
			},
			{
				"speed": 25,
				"name": "Avon Ct",
				"nodes": [
					17987,
					17988,
					17989,
					17990,
					17991,
					4254
				]
			},
			{
				"speed": 25,
				"name": "Hillsdale Ln",
				"nodes": [
					2861,
					17992,
					17993,
					17994
				]
			},
			{
				"speed": 30,
				"name": "Greenway Chase Drive",
				"nodes": [
					5503,
					17995,
					17996,
					17997,
					17998
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					17999,
					18000,
					18001,
					18002,
					18003,
					18004,
					18005,
					18006,
					18007
				]
			},
			{
				"speed": 30,
				"name": "Greenway Chase Drive",
				"nodes": [
					17999,
					18008,
					18009,
					18010,
					18011,
					18012,
					18013,
					5503
				]
			},
			{
				"speed": 25,
				"name": "Greenway Manor Drive",
				"nodes": [
					18014,
					18015,
					18016,
					18017,
					18018,
					18019,
					18020,
					18021,
					18022
				]
			},
			{
				"speed": 25,
				"name": "Greenway Manor Drive",
				"nodes": [
					1202,
					18023,
					18024,
					18025,
					18026,
					18027,
					18028,
					18029,
					18030,
					18031,
					18032,
					18033,
					18034,
					18035,
					18036
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18037,
					18038,
					63
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18021,
					18039,
					18040,
					18041,
					18042,
					18043,
					18044,
					18045,
					18046,
					18047,
					18022
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					17946,
					18048,
					18049,
					18050,
					18051,
					18052,
					18053,
					18054,
					18055,
					18056,
					17946
				]
			},
			{
				"speed": 30,
				"name": "Old Jamestown Road",
				"nodes": [
					17954,
					18057,
					18058,
					18059,
					18060,
					18061,
					18062,
					18063,
					18064,
					18065,
					18066,
					18067,
					18068,
					18069,
					18070,
					18071,
					8850
				]
			},
			{
				"speed": 25,
				"name": "Jamestown Bay Drive",
				"nodes": [
					348,
					18072,
					18073,
					18074,
					18075,
					4834,
					18076,
					18077,
					18078,
					18079,
					18080,
					18081,
					18082,
					18083,
					18084,
					10224
				]
			},
			{
				"speed": 25,
				"name": "Jamestown Bay Drive",
				"nodes": [
					11436,
					17983,
					18085,
					18086,
					18087,
					18088,
					18089,
					18090,
					18091,
					18092,
					18093,
					18094,
					18095,
					348
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					5288,
					18096,
					18097,
					18098,
					18099,
					18100,
					18101,
					18102,
					18103,
					18104,
					18105,
					18106,
					5288
				]
			},
			{
				"speed": 25,
				"name": "Cypress Creek Drive",
				"nodes": [
					10283,
					18107,
					18108,
					18109,
					18110,
					18111,
					18112,
					18113,
					18114,
					18115,
					18116,
					18117,
					18118,
					18119,
					18120,
					18121,
					18122,
					18123,
					18124,
					18036
				]
			},
			{
				"speed": 25,
				"name": "Newcastle Drive",
				"nodes": [
					9696,
					18125,
					18126,
					18127,
					2806,
					5325,
					2027,
					7415,
					3977
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					15808,
					18128,
					18129,
					18130,
					18131,
					18132,
					18133,
					18134,
					18135,
					18038,
					18136,
					18137,
					18138,
					18139,
					18140,
					18007
				]
			},
			{
				"speed": 25,
				"name": "Shadow Rock Drive",
				"nodes": [
					18141,
					18142,
					18143,
					18144,
					18145,
					18146,
					18147,
					18148,
					18149,
					18150,
					18151,
					18152,
					18153,
					18154
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18155,
					18156,
					18157,
					18158,
					18159,
					2324
				]
			},
			{
				"speed": 25,
				"name": "Churchill Drive",
				"nodes": [
					3977,
					18160,
					18161,
					18162,
					18163,
					18164,
					18165,
					18166,
					18167,
					18168,
					18169,
					18170,
					18171,
					17732
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					3099,
					18172,
					18173,
					18174,
					18037
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					9696,
					18175,
					18176,
					18177,
					18178,
					18179,
					18180,
					18181,
					18182,
					9695
				]
			},
			{
				"speed": 30,
				"name": "Greenway Chase Drive",
				"nodes": [
					15808,
					18183,
					18184,
					18185,
					18186,
					18187,
					18188,
					18037,
					63,
					18189,
					18190,
					18191,
					18192,
					18193,
					18194,
					18195,
					18196,
					18197,
					18198,
					18199,
					17999
				]
			},
			{
				"speed": 25,
				"name": "Sabina Lane",
				"nodes": [
					7712,
					18200,
					18201,
					18202,
					18203,
					11688
				]
			},
			{
				"speed": 30,
				"name": "Old Jamestown Road",
				"nodes": [
					8850,
					18204,
					18205,
					18206,
					18207,
					18208,
					18209,
					18210,
					18211,
					18212,
					10498
				]
			},
			{
				"speed": 25,
				"name": "Avon Ct",
				"nodes": [
					9709,
					18213,
					18214,
					18215,
					18216,
					17987
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18217,
					18218,
					18219,
					18220,
					18221,
					18222,
					18223,
					18224,
					18225,
					18226,
					18227,
					18217
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18228,
					18229,
					18230,
					18231,
					18232,
					18233,
					18234,
					18235,
					18236,
					18237,
					18238,
					18239,
					18240,
					18241,
					18242,
					18243,
					18244,
					18245,
					18228
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					17903,
					18246,
					18247,
					18248,
					18249,
					18250,
					18251,
					18252,
					18253,
					18254,
					17906
				]
			},
			{
				"speed": 25,
				"name": "Shadow Rock Drive",
				"nodes": [
					5494,
					18255,
					18141,
					18256,
					18257,
					18258,
					18259,
					18260,
					18261,
					18262,
					18154
				]
			},
			{
				"speed": 25,
				"name": "Weymouth Court",
				"nodes": [
					12421,
					18263,
					18264,
					18265,
					18266,
					18267,
					18268,
					18269,
					18270,
					18271,
					18272,
					10000
				]
			},
			{
				"speed": 30,
				"name": "Sinks Road",
				"nodes": [
					6791,
					18273,
					18274,
					9446,
					18275,
					18276,
					18277,
					18278,
					18279,
					18280,
					18281,
					18282,
					18283,
					18284,
					18285,
					18286,
					7349
				]
			},
			{
				"speed": 35,
				"name": "Old Halls Ferry Road",
				"nodes": [
					15123,
					18287,
					18288,
					18289,
					18290,
					18291,
					18292,
					18293,
					18294,
					14786,
					14580,
					18295,
					18296,
					18297,
					18298,
					18299,
					14577
				]
			},
			{
				"speed": 35,
				"name": "Old Halls Ferry Road",
				"nodes": [
					10262,
					18300,
					18301,
					18302,
					18303,
					18304,
					4031,
					18305,
					18306,
					18307,
					18308,
					18309,
					16963
				]
			},
			{
				"speed": 35,
				"name": "Old Halls Ferry Road",
				"nodes": [
					237,
					18310,
					18311,
					18312,
					18313,
					18314,
					18315,
					15136,
					18316,
					18317,
					18318,
					18319,
					18320,
					18321,
					18322,
					18323
				]
			},
			{
				"speed": 35,
				"name": "Old Halls Ferry Road",
				"nodes": [
					13900,
					18324,
					16235,
					16214,
					18325,
					16333,
					18326,
					18327,
					18328,
					18329,
					16230,
					16099,
					16313,
					18330,
					18331,
					16164
				]
			},
			{
				"speed": 25,
				"name": "Greenway Manor Drive",
				"nodes": [
					18036,
					18332,
					18333,
					18334,
					18335,
					18336,
					18337,
					18338,
					18339,
					18340,
					18341,
					18342,
					18343,
					18344,
					18345,
					18346,
					18347,
					18014
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					2328,
					18348,
					18349,
					18350,
					18351,
					18352,
					18353,
					18354,
					18355,
					18356,
					17978,
					18357,
					18155,
					18358,
					18359,
					18360,
					18361,
					18362,
					2320
				]
			},
			{
				"speed": 35,
				"name": "Old Halls Ferry Road",
				"nodes": [
					16963,
					18363,
					18364,
					18365,
					18366,
					18367,
					10253,
					18368,
					18369,
					18370,
					13900
				]
			},
			{
				"speed": 35,
				"name": "Old Halls Ferry Road",
				"nodes": [
					18323,
					18371,
					18372,
					18373,
					18374,
					18375,
					18376,
					18377,
					18378,
					18379,
					18380,
					18381,
					13055
				]
			},
			{
				"speed": 35,
				"name": "Old Halls Ferry Road",
				"nodes": [
					14577,
					18382,
					18383,
					18384,
					18385,
					18386,
					18387,
					18388,
					18389,
					18390,
					18391,
					18392
				]
			},
			{
				"speed": 25,
				"name": "Churchill Drive",
				"nodes": [
					17732,
					18393,
					18394,
					18395,
					18396,
					18397,
					17822,
					18398,
					18399,
					18400,
					17755,
					18401,
					18402,
					18403,
					18404,
					18405
				]
			},
			{
				"speed": 35,
				"name": "Old Halls Ferry Road",
				"nodes": [
					18406,
					14301,
					14329,
					18407,
					18408,
					18409,
					18410,
					18411,
					18412,
					18413,
					18414,
					18415,
					18416,
					18417,
					18418,
					18419,
					14771,
					15123
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18420,
					7862
				]
			},
			{
				"speed": 25,
				"name": "Sunswept Park Drive",
				"nodes": [
					2503,
					18421,
					17864,
					18422,
					18423,
					18424,
					10411,
					18425,
					18426,
					18427,
					18428,
					18429,
					18430,
					18431,
					18432,
					18433,
					18434,
					18435,
					18436,
					18437,
					18438,
					18439,
					13890
				]
			},
			{
				"speed": 25,
				"name": "Mullanphy Road",
				"nodes": [
					18440,
					18441
				]
			},
			{
				"speed": 35,
				"name": "Old Halls Ferry Road",
				"nodes": [
					14576,
					18442,
					18443,
					18444,
					18445,
					14581,
					14785,
					18446,
					18447,
					18448,
					18449,
					18450,
					18451,
					18452,
					18453,
					18454,
					18455,
					18456,
					18457,
					15124
				]
			},
			{
				"speed": 25,
				"name": "Sabina Lane",
				"nodes": [
					11688,
					18458,
					18459,
					18217
				]
			},
			{
				"speed": 35,
				"name": "Old Halls Ferry Road",
				"nodes": [
					18392,
					14674,
					18460,
					18461,
					18462,
					18463,
					18464,
					14576
				]
			},
			{
				"speed": 35,
				"name": "Old Halls Ferry Road",
				"nodes": [
					18392,
					18465,
					18466,
					13055
				]
			},
			{
				"speed": 35,
				"name": "Old Halls Ferry Road",
				"nodes": [
					6084,
					18467,
					18468,
					18469,
					18470,
					4604,
					18471,
					18472,
					18473,
					8542,
					18474,
					18475,
					18476,
					18477,
					10262
				]
			},
			{
				"speed": 25,
				"name": "Liberty Village Drive",
				"nodes": [
					3099,
					64,
					18478,
					18479,
					18480,
					3071,
					18481,
					18482,
					18483,
					18228
				]
			},
			{
				"speed": 35,
				"name": "Old Halls Ferry Road",
				"nodes": [
					15124,
					14770,
					18484,
					18485,
					18486,
					18487,
					18488,
					18489,
					18490,
					18491,
					14330,
					14300,
					18492,
					18493,
					18494
				]
			},
			{
				"speed": 25,
				"name": "Mullanphy Road",
				"nodes": [
					7088,
					2556,
					18495,
					885,
					18496,
					18497,
					18498,
					18499,
					18500,
					7325,
					18501,
					7167,
					18502,
					18503,
					18504,
					18440
				]
			},
			{
				"speed": 25,
				"name": "Mullanphy Road",
				"nodes": [
					12457,
					18505,
					18506,
					4570,
					3640,
					2775,
					18507,
					18508,
					7088
				]
			},
			{
				"speed": 35,
				"name": "Old Halls Ferry Road",
				"nodes": [
					15201,
					18509,
					18510,
					18511,
					18512,
					18513,
					18514,
					18515,
					18516,
					18517,
					237
				]
			},
			{
				"speed": 35,
				"name": "Old Halls Ferry Road",
				"nodes": [
					16164,
					18518,
					18519,
					18520,
					18521,
					18522,
					18523,
					18524,
					18525,
					18526,
					15201
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					4324,
					18527,
					18528,
					18529,
					18530,
					18531,
					18532,
					3839
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					12759,
					18533,
					18534,
					18535,
					18536,
					18537,
					18538,
					18539,
					10755
				]
			},
			{
				"speed": 25,
				"name": "Danelle Ct",
				"nodes": [
					3633,
					18540,
					18541,
					18542,
					18543,
					18544,
					18545
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18546,
					18547,
					18548,
					18549,
					18550,
					18551,
					18552,
					18553,
					18554,
					18555
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18556,
					18557,
					18558,
					18559,
					18560,
					18561,
					18562,
					18563,
					18564
				]
			},
			{
				"speed": 25,
				"name": "Torero Lane",
				"nodes": [
					18565,
					18566,
					18567,
					10120
				]
			},
			{
				"speed": 25,
				"name": "Cobblestone Creek Drive",
				"nodes": [
					18564,
					18568,
					18569,
					18570,
					18571,
					18572
				]
			},
			{
				"speed": 25,
				"name": "David Court",
				"nodes": [
					3639,
					18573,
					18574,
					18575,
					18576,
					18577,
					18578
				]
			},
			{
				"speed": 25,
				"name": "Armada Court",
				"nodes": [
					7023,
					18579,
					18580,
					18581,
					18582,
					18583
				]
			},
			{
				"speed": 25,
				"name": "Lindsay Lane",
				"nodes": [
					18584,
					18585,
					18586,
					18565,
					12996,
					18587,
					18588,
					18589,
					12441,
					18590,
					3627,
					18591,
					7023,
					18592,
					18593,
					18594,
					18595,
					12454,
					6765,
					18596
				]
			},
			{
				"speed": 25,
				"name": "Friendship Ct",
				"nodes": [
					18597,
					18598,
					18599,
					18600,
					18601,
					18602,
					18603,
					18604,
					18605,
					18606,
					18607,
					18608,
					18609,
					18610,
					18611,
					18612,
					18597
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18613,
					18614,
					18615,
					18616,
					18617,
					18618,
					18619,
					18620,
					18621,
					18622,
					18623,
					18624,
					18625,
					18626,
					18627,
					18628,
					18629,
					18630
				]
			},
			{
				"speed": 25,
				"name": "Charbonier Bluffs",
				"nodes": [
					18631,
					18632,
					18633,
					18634,
					18635,
					18636,
					18637,
					18638,
					18639,
					18640,
					18641,
					18642,
					18643,
					18644,
					18645,
					18646,
					18631
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					7736,
					18647,
					18648,
					18649,
					18650,
					18651,
					18652,
					18653,
					18654,
					12761
				]
			},
			{
				"speed": 25,
				"name": "Talon Drive",
				"nodes": [
					4145,
					10376,
					8772
				]
			},
			{
				"speed": 30,
				"name": "Riverwood Estates Boulevard",
				"nodes": [
					18655,
					18656,
					8947
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					4288,
					18657,
					18658,
					18659,
					18660,
					18661,
					18662,
					18663,
					18664,
					4288
				]
			},
			{
				"speed": 25,
				"name": "Meditation Way Court",
				"nodes": [
					12808,
					18665,
					18666,
					18667,
					18668,
					18669,
					18670,
					18671,
					18672,
					18673,
					18674,
					18675,
					18676
				]
			},
			{
				"speed": 30,
				"name": "Riverwood Estates Boulevard",
				"nodes": [
					5026,
					18677,
					18678,
					18679,
					18680,
					18681,
					18682,
					18683,
					18684,
					9483,
					18685,
					18686,
					18687,
					18688,
					18689,
					8060,
					18690,
					18691,
					18692,
					18693,
					18694,
					18695,
					18696,
					18697
				]
			},
			{
				"speed": 25,
				"name": "Rosebrook Drive",
				"nodes": [
					18698,
					18699,
					18700
				]
			},
			{
				"speed": 25,
				"name": "Rhinegarten Drive",
				"nodes": [
					18701,
					18702,
					18703,
					18704,
					18705,
					18706,
					18707,
					18708,
					18709
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18710,
					18711,
					18712,
					18713,
					18714,
					18715,
					18716,
					18717
				]
			},
			{
				"speed": 25,
				"name": "Rhinegarten Drive",
				"nodes": [
					18718,
					18719,
					18720,
					18721,
					18722
				]
			},
			{
				"speed": 25,
				"name": "Beaujolais Drive",
				"nodes": [
					3162,
					18723,
					18724,
					18725,
					18726,
					18727,
					3184
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18728,
					18729,
					18730,
					18731,
					18732,
					18733,
					18734,
					18735,
					18736,
					18737,
					18738,
					18739
				]
			},
			{
				"speed": 25,
				"name": "Seminary Court",
				"nodes": [
					18740,
					18741,
					18742,
					18743
				]
			},
			{
				"speed": 25,
				"name": "Chianti Court",
				"nodes": [
					5023,
					18744,
					18745,
					18746,
					18747
				]
			},
			{
				"speed": 25,
				"name": "David Ct",
				"nodes": [
					18578,
					18748,
					18749,
					18750,
					18751,
					18752,
					3637
				]
			},
			{
				"speed": 25,
				"name": "St Stanislaus Court",
				"nodes": [
					18753,
					18754,
					18755,
					18756,
					18757
				]
			},
			{
				"speed": 25,
				"name": "Fleurie Drive",
				"nodes": [
					18697,
					18758,
					18759,
					18760,
					18761,
					18762,
					18763,
					18764
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18765,
					18766,
					18767,
					18768,
					18769,
					18770,
					18771,
					18772
				]
			},
			{
				"speed": 25,
				"name": "Danelle Ct",
				"nodes": [
					3635,
					18773,
					18774,
					18775,
					18776,
					18777,
					18778,
					18545
				]
			},
			{
				"speed": 25,
				"name": "Riverwood Park Drive",
				"nodes": [
					18779,
					18780,
					18781,
					18782,
					18783,
					18784,
					18785,
					18786,
					18787,
					18788,
					18789,
					18790,
					18791,
					18792,
					18793,
					18794,
					18779
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18795,
					18796,
					18797,
					18798,
					18799,
					18800,
					18801,
					18802,
					18803,
					18804,
					18805
				]
			},
			{
				"speed": 25,
				"name": "Mission Walk Court",
				"nodes": [
					18806,
					18807,
					18808
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18809,
					18810,
					18811,
					18812,
					18546,
					18813,
					18555,
					18814,
					18815,
					18816,
					18817,
					18818,
					18819,
					18820,
					18821,
					18822,
					18823,
					18824,
					18825,
					9057
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					8951,
					18826,
					18827,
					18828,
					18829,
					18830,
					18831,
					18832,
					18833,
					18834,
					18835
				]
			},
			{
				"speed": 25,
				"name": "Torero Lane",
				"nodes": [
					10120,
					18836,
					18837,
					18838,
					18839,
					18840,
					18841,
					18842,
					18843,
					18844,
					18845,
					18846,
					18847,
					18848,
					18849,
					18850,
					18851,
					18852,
					18556,
					18853,
					18854,
					18564
				]
			},
			{
				"speed": 25,
				"name": "Rhinegarten Drive",
				"nodes": [
					18701,
					18855,
					18856,
					18857,
					18858,
					18859,
					18860,
					18861,
					18718
				]
			},
			{
				"speed": 25,
				"name": "Lindsay Lane",
				"nodes": [
					18596,
					18862,
					18863,
					18864,
					18865,
					18866,
					12206,
					18867,
					415,
					18868,
					18869,
					18870,
					18871,
					18872,
					18873,
					18874,
					18875,
					18876,
					18877,
					18878,
					18879,
					18880
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					3175,
					18881,
					18882,
					18883,
					18884,
					18885,
					18886,
					18887,
					3178
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					8941,
					18888,
					18889,
					18890,
					18891,
					18892,
					18805,
					18893,
					18795,
					18894,
					18895,
					18896,
					18897,
					18898,
					18899,
					18900,
					18901,
					18902,
					18903,
					18739,
					18904,
					18905,
					18728,
					18906,
					18907,
					18908,
					18909,
					18910,
					18911,
					8939
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					18655,
					18835,
					18912,
					18913,
					8948
				]
			},
			{
				"speed": 25,
				"name": "Benedictine Court",
				"nodes": [
					5236,
					18914,
					18915,
					18916,
					18917,
					18918,
					18919,
					18920,
					18921
				]
			},
			{
				"speed": 25,
				"name": "St Stanislaus Court",
				"nodes": [
					12800,
					18922,
					18923,
					18924,
					18925,
					18926,
					18753
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18629,
					18927,
					18928,
					18929,
					18930,
					18931,
					18932,
					18933,
					18934,
					18935,
					18936,
					18937,
					18938,
					18939,
					18630
				]
			},
			{
				"speed": 25,
				"name": "Rosebrook Drive",
				"nodes": [
					18940,
					18941,
					18942,
					18943,
					18944,
					18945,
					18946,
					18947,
					18948
				]
			},
			{
				"speed": 25,
				"name": "Moselle Court",
				"nodes": [
					8074,
					18949,
					18950,
					18951,
					18952,
					18953,
					18954
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18955,
					18956,
					18957,
					18958,
					18959,
					18960,
					18961,
					18962,
					18963,
					18964,
					18965
				]
			},
			{
				"speed": 30,
				"name": "Riverwood Estates Boulevard",
				"nodes": [
					5055,
					18966,
					18967,
					18740,
					18968,
					18969,
					18970,
					5227,
					18971,
					18972,
					6583,
					18973,
					18753,
					18974,
					18975,
					18976,
					18806,
					18977,
					18978,
					18979,
					18980,
					18981,
					5026
				]
			},
			{
				"speed": 25,
				"name": "Rosebrook Drive",
				"nodes": [
					18940,
					18982,
					18983,
					18948,
					18984,
					18985,
					18986,
					18987,
					18988,
					18989,
					18990,
					18991,
					18992,
					18698
				]
			},
			{
				"speed": 25,
				"name": "Beaujolais Drive",
				"nodes": [
					18692,
					18993,
					18994,
					18995,
					3162
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18996,
					18997,
					18998,
					18999,
					19000,
					19001,
					19002,
					19003,
					19004
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19005,
					19006,
					19007,
					19008,
					19009,
					19010,
					19011
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19012,
					19013,
					19014,
					19015,
					19016,
					19017,
					19018,
					19019,
					19020
				]
			},
			{
				"speed": 30,
				"name": "Riverwood Estates Boulevard",
				"nodes": [
					18697,
					19021,
					19022,
					19023,
					19024,
					18718,
					19025,
					19026,
					19027,
					19028,
					8349,
					19029,
					19030,
					18698,
					18655
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19031,
					19032,
					19033,
					19034,
					19035,
					19036,
					19037
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19038,
					19039,
					19040,
					19041,
					19042,
					19043,
					19044,
					19045,
					19046,
					19047,
					19048,
					19049,
					19050,
					19051,
					19052,
					19038
				]
			},
			{
				"speed": 25,
				"name": "Pelican Cove Drive",
				"nodes": [
					1812,
					19053,
					19054,
					10686
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19015,
					19055,
					19056,
					19057,
					19058,
					19059,
					19060,
					19020,
					19061,
					19062,
					19063,
					19064,
					19065
				]
			},
			{
				"speed": 25,
				"name": "Flordawn Drive",
				"nodes": [
					8876,
					19011,
					19066,
					19067,
					19068,
					19069,
					19070,
					19071,
					19072,
					10668,
					19073,
					19074,
					19075,
					19076,
					19077,
					19078,
					1801,
					19079,
					19037
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19080,
					19081,
					19082,
					19083,
					8877
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19084,
					10676
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19075,
					19085,
					19086,
					19087,
					10670
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19088,
					19089,
					19090,
					19091
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19008,
					19092,
					19093,
					19094,
					19095,
					19096,
					19068
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19038,
					10688
				]
			},
			{
				"speed": 25,
				"name": "Pelican Cove Dr",
				"nodes": [
					1812,
					19097,
					19098,
					19099,
					19100,
					19101,
					19102,
					19103,
					19104,
					19078
				]
			},
			{
				"speed": 25,
				"name": "Flordawn Drive",
				"nodes": [
					19037,
					19105,
					19106,
					19107,
					19108,
					19109,
					19110,
					19111,
					19112,
					19113,
					19114,
					19115,
					19116,
					19117,
					19118,
					876
				]
			},
			{
				"speed": 25,
				"name": "Flordawn Drive",
				"nodes": [
					3466,
					19119,
					19120,
					19121,
					8876
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19076,
					19122,
					19123,
					19124,
					19125,
					19126,
					19127,
					19128,
					19129,
					19130,
					19131,
					19132,
					19133,
					19134,
					19135,
					19136,
					19074
				]
			},
			{
				"speed": 25,
				"name": "Flordawn Drive",
				"nodes": [
					884,
					19137,
					19138,
					19139,
					19140,
					19141,
					19142,
					19143,
					19012,
					19144,
					19145,
					19146,
					19147,
					19148,
					19149,
					19150,
					19151,
					19152,
					19153,
					19154,
					19155
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19114,
					19156,
					19157,
					19158,
					19159,
					19160,
					19161,
					19162,
					19163,
					19164,
					19165,
					19112
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					3446,
					19166,
					19167,
					19168,
					19169,
					19170,
					19171
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19172,
					19173,
					19174,
					19175,
					19176,
					19177,
					19178,
					9119
				]
			},
			{
				"speed": 25,
				"name": "Pelican Island Dr",
				"nodes": [
					10684,
					19091,
					19179,
					19180,
					19181,
					19182,
					19183,
					19184,
					19185,
					19186,
					19084,
					19187,
					19188,
					19189,
					19190,
					10669
				]
			},
			{
				"speed": 25,
				"name": "Riverwood Trails Drive",
				"nodes": [
					3449,
					19191,
					19192,
					19193
				]
			},
			{
				"speed": 25,
				"name": "Lehne Court",
				"nodes": [
					19194,
					19195,
					19196,
					19197,
					19198,
					19199,
					19200,
					19201
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					3448,
					19202,
					19203,
					19171,
					19193
				]
			},
			{
				"speed": 25,
				"name": "Lehne Court",
				"nodes": [
					19204,
					19205,
					19206,
					19207,
					19208,
					19209,
					19201,
					19210,
					19194
				]
			},
			{
				"speed": 25,
				"name": "Beam Place",
				"nodes": [
					8761,
					19211,
					19212,
					19213,
					19214,
					19215
				]
			},
			{
				"speed": 25,
				"name": "Capitharne Pl",
				"nodes": [
					19216,
					19217,
					19218,
					19219,
					19220,
					19221,
					10620
				]
			},
			{
				"speed": 25,
				"name": "Lehne Court",
				"nodes": [
					19194,
					19222,
					19223,
					19224,
					19225,
					19226
				]
			},
			{
				"speed": 25,
				"name": "Beam Place",
				"nodes": [
					19215,
					19227,
					19228,
					19229,
					19230,
					8505
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					3451,
					19231,
					19232,
					19233,
					19234,
					19235,
					19236,
					19237,
					19191
				]
			},
			{
				"speed": 25,
				"name": "Lehne Court",
				"nodes": [
					19238,
					19239,
					19240,
					19241,
					19204
				]
			},
			{
				"speed": 25,
				"name": "Riverwood Place Drive",
				"nodes": [
					19204,
					19242,
					19243
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19244,
					19245,
					19246,
					19175
				]
			},
			{
				"speed": 25,
				"name": "Riverwood Trails Drive",
				"nodes": [
					19193,
					19247,
					19248,
					8896,
					19249,
					19250,
					19251,
					19252,
					19253,
					19254,
					10616,
					19255,
					19216,
					19256,
					19257,
					19258,
					19259,
					1495,
					19260,
					19261,
					19262,
					19263,
					7187
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					12243,
					19264,
					19265,
					19266,
					19267,
					19268,
					19269,
					19270,
					19271
				]
			},
			{
				"speed": 25,
				"name": "Riverwood Trails Drive",
				"nodes": [
					7187,
					19272,
					19273,
					19274,
					19275,
					7201,
					19276,
					19277,
					19278,
					8684,
					19279,
					19280,
					19281,
					19282,
					19283,
					4057,
					19284,
					19285,
					19286,
					19287,
					19288,
					19289,
					19290,
					19291,
					19292,
					19293,
					19294,
					19295,
					19296,
					19297,
					19298,
					19299,
					19300,
					19301,
					19302,
					19303,
					19304,
					19305,
					9116,
					19306,
					19307,
					19308,
					19309,
					12106,
					19310,
					19311,
					19312,
					19313,
					19314,
					772,
					19315,
					19316,
					19317,
					4432,
					19318,
					19319,
					12204,
					19320,
					19321,
					19322,
					19323
				]
			},
			{
				"speed": 25,
				"name": "Benedictine Court",
				"nodes": [
					18915,
					19324,
					19325,
					19326,
					19327,
					19328,
					19329,
					19330,
					19331,
					5236
				]
			},
			{
				"speed": 25,
				"name": "Lehne Court",
				"nodes": [
					19238,
					19332,
					19333,
					19334,
					19335,
					19336,
					19337,
					19338
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19339,
					19340,
					19341,
					19342,
					19343,
					19344,
					19345,
					19346,
					19347,
					19348,
					19349,
					19350,
					19351,
					19352,
					881
				]
			},
			{
				"speed": 25,
				"name": "Beam Place",
				"nodes": [
					8505,
					19353,
					19354,
					19355,
					19356,
					19357,
					19358,
					19359,
					19360
				]
			},
			{
				"speed": 25,
				"name": "Martin Manor Place",
				"nodes": [
					12233,
					19361,
					19362,
					19363,
					19364,
					19365,
					19366,
					12231
				]
			},
			{
				"speed": 25,
				"name": "Riverwood Place Drive",
				"nodes": [
					8684,
					19367,
					1926,
					19368,
					19369,
					19370,
					11202,
					19371,
					19372,
					19373,
					2553,
					19374,
					19375,
					19376,
					19377,
					19378,
					19379,
					19380,
					19381,
					19382,
					19383,
					19384,
					19385,
					19386,
					19387,
					19388,
					19389,
					11071,
					19390,
					19391,
					19392,
					19393,
					19394,
					19215,
					19395,
					19396,
					19397,
					19398,
					8526,
					19399,
					19400,
					19401,
					19402,
					19403,
					19404,
					19405,
					8247,
					19406,
					19407,
					19408,
					19409,
					19323,
					4485
				]
			},
			{
				"speed": 25,
				"name": "Riverwood Place Drive",
				"nodes": [
					4485,
					19410,
					19411,
					19412,
					19413,
					19414,
					19415,
					19416,
					19417,
					19418,
					19204
				]
			},
			{
				"speed": 25,
				"name": "Krause Hill Place",
				"nodes": [
					11088,
					19419,
					19420,
					19421,
					19422,
					19423,
					19424,
					19425,
					19426,
					19427,
					19428,
					19429,
					19430,
					19431,
					19432,
					19433,
					19434,
					19435,
					19271,
					12244
				]
			},
			{
				"speed": 25,
				"name": "Teson Garden Walk",
				"nodes": [
					2447,
					19436,
					19437
				]
			},
			{
				"speed": 25,
				"name": "La Cerros Lane",
				"nodes": [
					4776,
					19438,
					19439,
					19440,
					19441,
					19442,
					19443,
					19444,
					19445,
					19446
				]
			},
			{
				"speed": 25,
				"name": "Calle Vista Drive",
				"nodes": [
					19447,
					19448,
					4787,
					19449,
					19450,
					19451,
					19452,
					19453,
					19454
				]
			},
			{
				"speed": 25,
				"name": "La Cuesta Drive",
				"nodes": [
					7948,
					19455,
					19456,
					19457,
					19458,
					19459,
					19460,
					19461,
					19462,
					19463,
					19464,
					19465,
					19454
				]
			},
			{
				"speed": 25,
				"name": "Calle Vista Drive",
				"nodes": [
					5118,
					19466,
					19467,
					19468,
					9033,
					19469,
					19470,
					19471,
					19472,
					19473,
					19474,
					19475,
					19476,
					19477,
					19446,
					19478,
					19479,
					19480,
					19447
				]
			},
			{
				"speed": 25,
				"name": "Calle Vista Drive",
				"nodes": [
					5109,
					19481,
					19482
				]
			},
			{
				"speed": 25,
				"name": "Teson Garden Walk",
				"nodes": [
					1364,
					19483,
					19484,
					19485,
					19486,
					19487,
					19437
				]
			},
			{
				"speed": 25,
				"name": "El Centro Drive",
				"nodes": [
					3929,
					19488,
					19489,
					19490,
					19491,
					19492,
					19493,
					19494,
					19495,
					5118
				]
			},
			{
				"speed": 25,
				"name": "Serenity Circle",
				"nodes": [
					9176,
					19496,
					19497,
					19498,
					19499,
					19500,
					19501,
					19502,
					19503,
					19504,
					19505,
					19506,
					19507
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19508,
					19509,
					19510,
					19511,
					19512,
					19513,
					19514,
					19515,
					19516,
					19508
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19517,
					19518,
					19519,
					19520,
					19521,
					19522
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19523,
					19524,
					19525,
					19526,
					19527,
					19528,
					19529,
					19530,
					19531,
					19532,
					19523
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19533,
					19534,
					19535,
					19536,
					19537,
					19538,
					19539,
					19540
				]
			},
			{
				"speed": 25,
				"name": "Eagles Way Court",
				"nodes": [
					19541,
					19542,
					19543,
					19544,
					19545,
					19546,
					19547,
					19548,
					19549,
					19550,
					19551,
					19541
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19552,
					19553,
					19554,
					19555,
					19556,
					19557,
					19558,
					19559,
					19560
				]
			},
			{
				"speed": 25,
				"name": "Eagles Way Court",
				"nodes": [
					19541,
					19561,
					19562,
					19563,
					19564,
					19565,
					19566,
					19567,
					19568,
					19569,
					19570,
					19571,
					19572
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19573,
					19574,
					19575,
					19576,
					19577,
					19578,
					19532
				]
			},
			{
				"speed": 25,
				"name": "Eagles Way Court",
				"nodes": [
					19579,
					19580,
					19581,
					19582,
					19583,
					19584,
					19585,
					19586,
					19587,
					19588,
					19589,
					19579
				]
			},
			{
				"speed": 25,
				"name": "Eagles Way Court",
				"nodes": [
					19579,
					19590,
					19591,
					19592,
					19572
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19593,
					8145,
					19594,
					19595,
					19596,
					19597,
					19598,
					19599,
					19600,
					19601,
					19602,
					19603,
					19593
				]
			},
			{
				"speed": 25,
				"name": "Ville Gloria Lane",
				"nodes": [
					9909,
					19604,
					19605,
					19606
				]
			},
			{
				"speed": 25,
				"name": "Teson Garden Walk",
				"nodes": [
					19437,
					19607,
					19608,
					19609,
					19610,
					19611
				]
			},
			{
				"speed": 25,
				"name": "Heritage Heights Cir",
				"nodes": [
					19612,
					19613,
					19614,
					19615,
					19616,
					19617,
					19618,
					19619
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					10064,
					19620,
					19621,
					19622
				]
			},
			{
				"speed": 25,
				"name": "Hurstborough Court",
				"nodes": [
					19623,
					19624,
					19625,
					19626,
					19627,
					19628,
					19629,
					19630,
					19631,
					19632,
					19633,
					19634,
					19635,
					19636,
					19637,
					19638,
					13688
				]
			},
			{
				"speed": 25,
				"name": "Heritage Heights Cir",
				"nodes": [
					19639,
					19640,
					19641,
					19642,
					19643,
					19644,
					19645,
					19646,
					19647,
					19648,
					19619,
					19649
				]
			},
			{
				"speed": 25,
				"name": "Heritage Heights Cir",
				"nodes": [
					19650,
					19651,
					19652,
					19653,
					19654,
					19655,
					19656,
					19657,
					19658,
					19659
				]
			},
			{
				"speed": 25,
				"name": "Heritage Heights Cir",
				"nodes": [
					19659,
					19660,
					19661,
					19662,
					19663,
					19664,
					19665,
					19639
				]
			},
			{
				"speed": 25,
				"name": "Ville-Cecelia Lane",
				"nodes": [
					12678,
					19666,
					19667,
					19668
				]
			},
			{
				"speed": 25,
				"name": "Ville Rosa Lane",
				"nodes": [
					10860,
					10080
				]
			},
			{
				"speed": 25,
				"name": "Auriesville Lane",
				"nodes": [
					10860,
					19669,
					19670,
					19671
				]
			},
			{
				"speed": 25,
				"name": "Ville Gloria Lane",
				"nodes": [
					19606,
					19672,
					19673,
					19668
				]
			},
			{
				"speed": 25,
				"name": "Carey Lane",
				"nodes": [
					4225,
					19674,
					19675,
					19676,
					19677,
					19678
				]
			},
			{
				"speed": 25,
				"name": "Ville Maura Lane",
				"nodes": [
					11154,
					19679
				]
			},
			{
				"speed": 25,
				"name": "Teson Garden Walk",
				"nodes": [
					19611,
					19680,
					19681,
					19682,
					19683,
					19684,
					19685,
					19686,
					1395
				]
			},
			{
				"speed": 25,
				"name": "Ville Maria Lane",
				"nodes": [
					19606,
					19687,
					19688,
					19689,
					19690,
					8016
				]
			},
			{
				"speed": 25,
				"name": "Ville-Cecelia Lane",
				"nodes": [
					19668,
					19691,
					19692,
					19693,
					8023
				]
			},
			{
				"speed": 25,
				"name": "Ville Maria Lane",
				"nodes": [
					19679,
					19694,
					19695,
					19696,
					19697,
					19606
				]
			},
			{
				"speed": 25,
				"name": "Ville Maria Lane",
				"nodes": [
					6285,
					19698,
					19699,
					19700,
					19701,
					19679
				]
			},
			{
				"speed": 25,
				"name": "Hurstborough Manor Drive",
				"nodes": [
					19702,
					19703,
					19704,
					19705,
					19706,
					19707,
					19708,
					19709,
					19710,
					19711,
					19712,
					19713,
					19714,
					19715,
					19716,
					19717,
					19718,
					13687
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19522,
					19719,
					19720,
					19721,
					19722,
					19723,
					19724,
					19725,
					19726,
					19727,
					19522
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					6365,
					19728,
					19729,
					19730,
					19731,
					19732,
					19733,
					12182
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19734,
					19735,
					19736,
					19737,
					19738,
					19739,
					19740,
					19741,
					19742,
					19743,
					19744,
					19734
				]
			},
			{
				"speed": 25,
				"name": "Serenity Circle",
				"nodes": [
					19507,
					19745,
					19746,
					19747,
					19748,
					19749,
					19750,
					19751,
					19752,
					19753,
					19754,
					19755,
					9176
				]
			},
			{
				"speed": 25,
				"name": "Heritage Heights Cir",
				"nodes": [
					19612,
					19622,
					19756,
					19757,
					19758,
					19759,
					19760,
					19652
				]
			},
			{
				"speed": 25,
				"name": "Ville Maura Lane",
				"nodes": [
					19679,
					19761,
					12678
				]
			},
			{
				"speed": 25,
				"name": "Ville Angela Lane",
				"nodes": [
					11154,
					19762,
					19763,
					19764,
					19765
				]
			},
			{
				"speed": 25,
				"name": "Ville Rosa Lane",
				"nodes": [
					7149,
					19766,
					19767,
					19768,
					19769,
					19770,
					19771,
					12959,
					19772,
					19773,
					19774,
					19775,
					19776,
					19777,
					19778,
					19779,
					19780,
					19781,
					19782,
					11145
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					8001,
					19783,
					19784,
					19785,
					19786,
					19787,
					19788,
					19789,
					19790,
					19791,
					19792,
					19793,
					19794,
					19573,
					19795,
					19796,
					19797,
					19798,
					19799,
					19800,
					19801,
					19802,
					19803,
					19517,
					19540,
					19804,
					19805,
					19533,
					19806,
					19807,
					19808,
					19809,
					19810,
					19811,
					19812,
					19560,
					19813,
					19814,
					19552,
					19815,
					19816,
					19817,
					19818,
					19819,
					19734
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19820,
					19821,
					2691
				]
			},
			{
				"speed": 25,
				"name": "Ville Rosa Lane",
				"nodes": [
					9899,
					19822,
					19823,
					19824,
					19825,
					19826,
					19827,
					19828,
					19829,
					19830,
					19831,
					19832,
					19833,
					19834,
					19835,
					7768
				]
			},
			{
				"speed": 25,
				"name": "Ville Maria Lane",
				"nodes": [
					8044,
					19836,
					4201,
					19837,
					19838,
					4218
				]
			},
			{
				"speed": 25,
				"name": "Hurstborough Manor Drive",
				"nodes": [
					19702,
					19839,
					19840,
					19841,
					19842,
					19843,
					19844,
					19845,
					19846,
					19847,
					19848,
					19702
				]
			},
			{
				"speed": 25,
				"name": "Eagles Way Court",
				"nodes": [
					7768,
					19849,
					19850,
					19851,
					19572
				]
			},
			{
				"speed": 25,
				"name": "Ville Rosa Lane",
				"nodes": [
					10080,
					19852,
					19853,
					19854,
					19855,
					19856,
					19857,
					19858,
					19859,
					19860,
					19861,
					19862,
					19863,
					19864,
					19865,
					19866,
					19867,
					19868,
					7149
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19869,
					19870,
					19871,
					19872,
					19873,
					19874,
					11149
				]
			},
			{
				"speed": 25,
				"name": "Ville Rosa Lane",
				"nodes": [
					11145,
					19875,
					19876,
					19877,
					19878,
					19869,
					19879,
					19880,
					19881,
					19882,
					19883,
					9899
				]
			},
			{
				"speed": 25,
				"name": "Ville Maria Lane",
				"nodes": [
					4218,
					19884,
					19885,
					19886,
					19887,
					19888,
					19889,
					19890,
					19891,
					19892,
					13105
				]
			},
			{
				"speed": 25,
				"name": "English Oak Court",
				"nodes": [
					799,
					19893,
					19894,
					19895,
					19896,
					19897,
					19898,
					19899,
					19900,
					19901,
					799
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19902,
					19903,
					19904,
					19905,
					19906,
					19907,
					19908,
					19909,
					19910,
					19911,
					19912,
					19508
				]
			},
			{
				"speed": 25,
				"name": "Hurstborough Court",
				"nodes": [
					19623,
					19913,
					19914,
					19915,
					19916,
					19917,
					19918,
					19919,
					19920,
					19921,
					19922,
					19623
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19613,
					19923,
					19924,
					10064
				]
			},
			{
				"speed": 25,
				"name": "Ville Angela Lane",
				"nodes": [
					19765,
					19925,
					19926,
					19927,
					19928,
					19929,
					19930,
					19931,
					19932,
					19933
				]
			},
			{
				"speed": 25,
				"name": "Knoll Creek Drive",
				"nodes": [
					8885,
					19934,
					19935,
					19936,
					11759
				]
			},
			{
				"speed": 25,
				"name": "Ville Maria Lane",
				"nodes": [
					13105,
					19937,
					19938,
					19939,
					19940,
					19941,
					19933,
					19942,
					19943,
					19944,
					19945,
					6285
				]
			},
			{
				"speed": 25,
				"name": "Knoll Creek Drive",
				"nodes": [
					19946,
					19947,
					19948,
					19949,
					19950,
					19951,
					19952,
					19953,
					19954
				]
			},
			{
				"speed": 25,
				"name": "Knollwood Pkwy Drive",
				"nodes": [
					19955,
					5215,
					19956,
					19957
				]
			},
			{
				"speed": 25,
				"name": "Forest Creek Drive",
				"nodes": [
					8873,
					19958,
					19959,
					19960,
					19961,
					19962,
					19963,
					19957
				]
			},
			{
				"speed": 25,
				"name": "Knoll Creek Drive",
				"nodes": [
					11759,
					19964,
					19946
				]
			},
			{
				"speed": 25,
				"name": "Knollwood Parkway Court",
				"nodes": [
					19965,
					19966,
					19967,
					19968,
					19969
				]
			},
			{
				"speed": 25,
				"name": "Ville Teresa Lane",
				"nodes": [
					2387,
					19970,
					19971,
					19972,
					19973
				]
			},
			{
				"speed": 25,
				"name": "Forest Creek Drive",
				"nodes": [
					19974,
					19975,
					19976,
					19977,
					19954
				]
			},
			{
				"speed": 25,
				"name": "Knollwood Pkwy Drive",
				"nodes": [
					11759,
					19978,
					19965,
					19955
				]
			},
			{
				"speed": 25,
				"name": "Ville Teresa Court",
				"nodes": [
					2397,
					19979,
					19980,
					19981,
					19982,
					19983,
					19984
				]
			},
			{
				"speed": 25,
				"name": "Knoll Creek Court",
				"nodes": [
					2154,
					19985,
					19986,
					19987,
					19988,
					8870
				]
			},
			{
				"speed": 25,
				"name": "Knollwood Parkway Court",
				"nodes": [
					19969,
					19989,
					19990,
					5215
				]
			},
			{
				"speed": 25,
				"name": "Knollwood Parkway Court",
				"nodes": [
					5220,
					19991,
					19965
				]
			},
			{
				"speed": 25,
				"name": "Rosecrest Ct",
				"nodes": [
					19992,
					19993,
					19994,
					19995,
					19996,
					7995
				]
			},
			{
				"speed": 25,
				"name": "Rose Blossom Lane",
				"nodes": [
					9505,
					19997,
					3723
				]
			},
			{
				"speed": 25,
				"name": "Rosecrest Drive",
				"nodes": [
					1421,
					19998,
					12790
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					19979,
					19999,
					20000,
					20001,
					20002,
					20003,
					20004,
					20005,
					2395
				]
			},
			{
				"speed": 25,
				"name": "Encino Drive",
				"nodes": [
					3922,
					20006,
					20007,
					20008,
					20009,
					20010,
					20011,
					20012,
					7941,
					20013
				]
			},
			{
				"speed": 25,
				"name": "Utz Lane",
				"nodes": [
					20014,
					20015,
					20016,
					20017,
					20018,
					20019,
					20020,
					20021,
					20022,
					20023,
					20024,
					20025
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					20026,
					20027,
					20028,
					20029,
					20030,
					20031,
					20032,
					20033,
					12841
				]
			},
			{
				"speed": 25,
				"name": "Rosecrest Drive",
				"nodes": [
					12790,
					20034,
					20035,
					20036,
					20037,
					19992,
					1758
				]
			},
			{
				"speed": 25,
				"name": "Barnwood Drive",
				"nodes": [
					6547,
					20038,
					20039,
					20040,
					20041,
					20042,
					20043,
					20044,
					20045,
					20046,
					20047,
					20048,
					794
				]
			},
			{
				"speed": 30,
				"name": "Dunn Road",
				"nodes": [
					20049,
					20050,
					20051,
					20052,
					20053,
					20054,
					8135,
					14025,
					3724
				]
			},
			{
				"speed": 25,
				"name": "Missouri Bottom Road",
				"nodes": [
					14025,
					20055,
					20056,
					20057,
					20058,
					20059,
					20060,
					20061,
					20062,
					20063,
					3728
				]
			},
			{
				"speed": 25,
				"name": "Forest Creek Drive",
				"nodes": [
					19957,
					20064,
					20065,
					20066,
					19974
				]
			},
			{
				"speed": 25,
				"name": "Lindsay Lane",
				"nodes": [
					9568,
					6500,
					8645,
					20067,
					2867
				]
			},
			{
				"speed": 25,
				"name": "Jenkee Avenue",
				"nodes": [
					2367,
					20068,
					20069,
					20070,
					20071,
					9371
				]
			},
			{
				"speed": 25,
				"name": "Lindsay Lane",
				"nodes": [
					1877,
					3938,
					6834,
					12459,
					11247,
					12024
				]
			},
			{
				"speed": 30,
				"name": "Dunn Road",
				"nodes": [
					8024,
					20072,
					20073,
					20074,
					20075,
					20076,
					20077,
					20078,
					20079,
					20080,
					20081,
					20082,
					20083,
					20084,
					20085,
					20086,
					20087,
					20088,
					20089,
					20090,
					20091,
					20092,
					20093,
					20094,
					20095,
					20096,
					19902,
					20049
				]
			},
			{
				"speed": 25,
				"name": "Cortez Drive",
				"nodes": [
					20067,
					20097,
					20098,
					4166
				]
			},
			{
				"speed": 25,
				"name": "Herbst Drive",
				"nodes": [
					4435,
					20099,
					20100,
					20101,
					20102,
					20103,
					20104,
					7326
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					5868,
					20105,
					20106,
					20107,
					20108,
					20109,
					20110,
					20111,
					5868
				]
			},
			{
				"speed": 30,
				"name": "Saint Denis Street",
				"nodes": [
					11707,
					20112
				]
			},
			{
				"speed": 25,
				"name": "Lindsay Lane",
				"nodes": [
					2867,
					11629,
					8379
				]
			},
			{
				"speed": 25,
				"name": "Lindsay Lane",
				"nodes": [
					9501,
					7617,
					10965,
					1877
				]
			},
			{
				"speed": 25,
				"name": "Lindsay Lane",
				"nodes": [
					11393,
					20113,
					9372,
					18584
				]
			},
			{
				"speed": 25,
				"name": "Lindsay Lane",
				"nodes": [
					8379,
					4393,
					11393
				]
			},
			{
				"speed": 30,
				"name": "Teson Road",
				"nodes": [
					20114,
					20115,
					20116,
					20117,
					20118,
					20119,
					20120,
					20121,
					20122,
					20123,
					20124,
					20125,
					20126,
					20127,
					20128,
					20129,
					20130,
					20131,
					20132,
					20133,
					20134,
					20135,
					20136
				]
			},
			{
				"speed": 25,
				"name": "English Oak Drive",
				"nodes": [
					7649,
					20137,
					20138,
					20139,
					20140,
					20141,
					20142,
					20143,
					20144,
					20145,
					20146,
					20147,
					20148,
					20149,
					20150,
					794
				]
			},
			{
				"speed": 25,
				"name": "Lindsay Lane",
				"nodes": [
					12024,
					10916,
					12087,
					6255,
					9568
				]
			},
			{
				"speed": 25,
				"name": "Cortena Drive",
				"nodes": [
					1008,
					20151,
					20152,
					20153,
					9195,
					20154,
					20155,
					20156,
					20157,
					20158,
					20159,
					20160,
					20161,
					20162,
					20163,
					20164,
					20165,
					20166,
					20167,
					20168,
					20169,
					20170,
					20171,
					20172,
					1009
				]
			},
			{
				"speed": 25,
				"name": "Utz Lane",
				"nodes": [
					6863,
					20173,
					20174,
					20175,
					20176,
					20014
				]
			},
			{
				"speed": 25,
				"name": "Christinia Marie Lane",
				"nodes": [
					6528,
					20177,
					20178,
					20179,
					20180,
					20181,
					20182,
					20183,
					20184
				]
			},
			{
				"speed": 30,
				"name": "Teson Road",
				"nodes": [
					2247,
					20185,
					20186,
					20187,
					20188,
					20189,
					20190,
					20191,
					20192,
					20193,
					20194,
					20195,
					20196,
					20197,
					20198,
					20199,
					2106,
					20200,
					20201,
					20202,
					20203,
					20204,
					20114
				]
			},
			{
				"speed": 25,
				"name": "Shirley Drive",
				"nodes": [
					2372,
					20205,
					20206,
					20207,
					9369
				]
			},
			{
				"speed": 25,
				"name": "Cherry Blossom Lane",
				"nodes": [
					5706,
					20208,
					20209,
					20210,
					20211,
					20212,
					20213,
					3719
				]
			},
			{
				"speed": 25,
				"name": "Loekes Ct",
				"nodes": [
					11585,
					20214,
					20215,
					20216,
					20217,
					20218,
					20219,
					20220,
					20221,
					20222,
					11765
				]
			},
			{
				"speed": 25,
				"name": "Undercliffe Drive",
				"nodes": [
					6346,
					20223,
					8119,
					12659
				]
			},
			{
				"speed": 25,
				"name": "Bellflower Drive",
				"nodes": [
					20224,
					20225,
					20226,
					20227,
					20228,
					20229,
					20230,
					20231,
					20232
				]
			},
			{
				"speed": 25,
				"name": "Village Square Drive",
				"nodes": [
					20233,
					20234,
					20235,
					20236,
					20237,
					20238,
					20239,
					20240,
					20241
				]
			},
			{
				"speed": 25,
				"name": "Lightwood Drive",
				"nodes": [
					8134,
					20242,
					20243,
					20244,
					20245,
					20246,
					4674
				]
			},
			{
				"speed": 25,
				"name": "Holiday Avenue",
				"nodes": [
					20247,
					20248
				]
			},
			{
				"speed": 25,
				"name": "Imperial Drive",
				"nodes": [
					20247,
					20249
				]
			},
			{
				"speed": 25,
				"name": "Imperial Drive",
				"nodes": [
					20250,
					20251,
					20252,
					20253,
					1507
				]
			},
			{
				"speed": 30,
				"name": "Dunn Road",
				"nodes": [
					20254,
					20255,
					8082
				]
			},
			{
				"speed": 25,
				"name": "Village Square Drive",
				"nodes": [
					20250,
					3480,
					20256,
					858
				]
			},
			{
				"speed": 25,
				"name": "Village Square Drive",
				"nodes": [
					6361,
					20257,
					20258,
					20259,
					20260,
					20261,
					20262,
					20233
				]
			},
			{
				"speed": 25,
				"name": "Olivewood Drive",
				"nodes": [
					20263,
					20241
				]
			},
			{
				"speed": 25,
				"name": "Impala Lane",
				"nodes": [
					3485,
					20264,
					20265,
					20266,
					20267,
					20268
				]
			},
			{
				"speed": 25,
				"name": "Teson Road",
				"nodes": [
					20269,
					20270,
					20271,
					20272,
					20273,
					3536
				]
			},
			{
				"speed": 30,
				"name": "Lynn Haven Lane",
				"nodes": [
					20249,
					20274,
					20275
				]
			},
			{
				"speed": 25,
				"name": "Imperial Drive",
				"nodes": [
					8336,
					20276,
					20277,
					20278,
					20279,
					20280,
					20281,
					20250
				]
			},
			{
				"speed": 25,
				"name": "Lightwood Drive",
				"nodes": [
					4674,
					20282,
					20283,
					20284,
					20285,
					20286,
					2681
				]
			},
			{
				"speed": 25,
				"name": "Teson Road",
				"nodes": [
					2416,
					20287,
					20288,
					8649
				]
			},
			{
				"speed": 25,
				"name": "Imperial Drive",
				"nodes": [
					1507,
					20289,
					20290,
					20291,
					20268,
					20247
				]
			},
			{
				"speed": 25,
				"name": "Deville Drive",
				"nodes": [
					3532,
					20292,
					20293,
					20248
				]
			},
			{
				"speed": 25,
				"name": "Bellflower Drive",
				"nodes": [
					6361,
					20294,
					20295,
					20296,
					20297,
					20298,
					20299,
					20300,
					8134
				]
			},
			{
				"speed": 30,
				"name": "Dunn Road",
				"nodes": [
					7842,
					20254
				]
			},
			{
				"speed": 25,
				"name": "Undercliffe Drive",
				"nodes": [
					12659,
					20301,
					20302,
					20303,
					20304,
					20305,
					20306,
					20307,
					20308,
					20309,
					20310,
					20311,
					20312
				]
			},
			{
				"speed": 30,
				"name": "Lynn Haven Lane",
				"nodes": [
					20275,
					3432
				]
			},
			{
				"speed": 30,
				"name": "Lynn Haven Lane",
				"nodes": [
					2439,
					20313,
					20314,
					20315,
					20316,
					20317,
					20318,
					20319,
					20320,
					20321,
					20322,
					20249
				]
			},
			{
				"speed": 25,
				"name": "Riderwood Drive",
				"nodes": [
					3536,
					20323,
					20324,
					20325,
					20326,
					20327,
					3425
				]
			},
			{
				"speed": 25,
				"name": "Village Square Drive",
				"nodes": [
					20241,
					20328,
					20329,
					20330,
					20331,
					20332,
					20333,
					20334,
					20250
				]
			},
			{
				"speed": 25,
				"name": "Deville Drive",
				"nodes": [
					20248,
					20275
				]
			},
			{
				"speed": 25,
				"name": "Olivewood Drive",
				"nodes": [
					2344,
					20335,
					20336,
					20337,
					20338,
					20263
				]
			},
			{
				"speed": 25,
				"name": "Bellflower Drive",
				"nodes": [
					8134,
					20339,
					20340,
					20224,
					12669,
					20232,
					20341,
					20342,
					4664,
					20343,
					20344,
					20345,
					20308
				]
			},
			{
				"speed": 25,
				"name": "Candlelight Lane",
				"nodes": [
					10402,
					20346,
					3773
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					2443,
					20347,
					20348,
					20349,
					20350,
					20351,
					20352,
					20353
				]
			},
			{
				"speed": 25,
				"name": "Coach Light Lane",
				"nodes": [
					5741,
					20354,
					20355,
					20356,
					20357,
					20358,
					20359,
					20360,
					20361,
					20362,
					20363
				]
			},
			{
				"speed": 25,
				"name": "Townhouse Lane",
				"nodes": [
					9274,
					20364,
					20365,
					20366,
					20367,
					20368,
					20369,
					20370,
					20371,
					20372,
					20373,
					20374,
					20375,
					3434
				]
			},
			{
				"speed": 25,
				"name": "Amanda Lynn Drive",
				"nodes": [
					2453,
					20376,
					20377,
					20378,
					20379,
					20380,
					20381,
					20382,
					20383,
					20384,
					20385,
					20386,
					20387,
					20388,
					20389,
					20390,
					20026,
					12839
				]
			},
			{
				"speed": 25,
				"name": "Lamplight Lane",
				"nodes": [
					20391,
					3435
				]
			},
			{
				"speed": 25,
				"name": "Coach Light Lane",
				"nodes": [
					9243,
					20392,
					20393,
					20394,
					20395,
					20396,
					20397,
					20398,
					20399,
					20400,
					3774
				]
			},
			{
				"speed": 25,
				"name": "Coach Light Lane",
				"nodes": [
					3774,
					20401,
					12478,
					20402,
					20403,
					20404,
					20405,
					20406,
					20407,
					5741
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					20408,
					20409,
					20410,
					20411,
					20412,
					20413,
					20414,
					20415
				]
			},
			{
				"speed": 25,
				"name": "Sir Lords Ct",
				"nodes": [
					11270,
					20416,
					20417,
					20418,
					20419,
					4479
				]
			},
			{
				"speed": 25,
				"name": "Holiday Avenue",
				"nodes": [
					20248,
					20420,
					3429
				]
			},
			{
				"speed": 25,
				"name": "Coachway Lane",
				"nodes": [
					5625,
					7123,
					20421,
					20422,
					11280,
					7284,
					20423,
					20424,
					20425,
					20426,
					20427,
					10215
				]
			},
			{
				"speed": 25,
				"name": "Avion Way",
				"nodes": [
					7957,
					20428,
					3442
				]
			},
			{
				"speed": 25,
				"name": "Coach Light Lane",
				"nodes": [
					20363,
					20429,
					20430,
					20431,
					5585,
					20432,
					20433,
					20434,
					20435,
					20436,
					20437,
					20438,
					20415,
					20439,
					20440,
					20408,
					20391
				]
			},
			{
				"speed": 25,
				"name": "Carriage Lane",
				"nodes": [
					5741,
					20441,
					20442,
					20443,
					20444,
					20445,
					20446,
					20447,
					20448,
					20449,
					20450,
					20451,
					20452,
					20363
				]
			},
			{
				"speed": 25,
				"name": "Oliveto Lane",
				"nodes": [
					1585,
					20453,
					20454,
					20455,
					20456,
					11711,
					20457,
					20458,
					20459,
					20460,
					20461,
					20462,
					20463
				]
			},
			{
				"speed": 25,
				"name": "Burke Drive",
				"nodes": [
					4463,
					20464,
					20465,
					20466,
					20467,
					20468,
					20469,
					20470,
					20471
				]
			},
			{
				"speed": 25,
				"name": "Coachway Ln",
				"nodes": [
					20472,
					20473,
					20474,
					20475,
					20476,
					20477,
					20478,
					1588
				]
			},
			{
				"speed": 25,
				"name": "Olian Drive",
				"nodes": [
					20479,
					20480,
					20481,
					20482,
					20483,
					20484,
					20471,
					20485,
					20486,
					20487,
					20488,
					20489,
					20490,
					20491,
					20492,
					20493
				]
			},
			{
				"speed": 25,
				"name": "Coachway Lane",
				"nodes": [
					1084,
					20494,
					20495,
					20496,
					20497,
					20498,
					20499,
					20500,
					20501,
					20502
				]
			},
			{
				"speed": 25,
				"name": "Village Square Drive",
				"nodes": [
					858,
					20503,
					20504,
					20505,
					20506,
					20507,
					20508,
					20509,
					20510,
					20511,
					20512,
					20513,
					20514,
					20515,
					20516,
					20517,
					8085
				]
			},
			{
				"speed": 25,
				"name": "Cherryvale Drive",
				"nodes": [
					816,
					20518,
					20519,
					20520,
					20263,
					20521,
					20522,
					20523,
					20524,
					20525,
					20526,
					20527,
					20528,
					20233
				]
			},
			{
				"speed": 25,
				"name": "Townhouse Lane",
				"nodes": [
					20363,
					20529,
					20530,
					9274
				]
			},
			{
				"speed": 25,
				"name": "Teson Road",
				"nodes": [
					8649,
					20531,
					20532,
					20533,
					20269
				]
			},
			{
				"speed": 25,
				"name": "Foxtrail Drive",
				"nodes": [
					5625,
					20534,
					20535,
					20536,
					20537,
					20538,
					20539,
					20540,
					20541,
					20542,
					20543,
					20544,
					20545,
					20546,
					20547,
					20548,
					20502
				]
			},
			{
				"speed": 25,
				"name": "Lamplight Lane",
				"nodes": [
					9274,
					20549,
					20550,
					20551,
					20552,
					20553,
					20554,
					20555,
					20391
				]
			},
			{
				"speed": 25,
				"name": "Coachway Lane",
				"nodes": [
					10215,
					20556,
					20557,
					20558,
					20559,
					20560,
					20561,
					20562,
					8152,
					20563,
					20564,
					1543,
					20565,
					20566,
					20567,
					4583,
					20568,
					20569,
					20570,
					20571,
					1588
				]
			},
			{
				"speed": 25,
				"name": "Mary Jo Lane",
				"nodes": [
					7323,
					20572,
					20573,
					20574,
					20575,
					20576,
					20577,
					20578,
					20579,
					20580,
					20581,
					20582
				]
			},
			{
				"speed": 30,
				"name": "Teson Road",
				"nodes": [
					20583,
					20584,
					20585,
					20586,
					20587,
					20588,
					20589,
					20590,
					20591,
					20592,
					20593,
					20594,
					20595,
					20596,
					20597,
					20598,
					20599,
					20600,
					20601,
					20602,
					20603,
					20604,
					20605,
					20606,
					20607,
					20608,
					20609,
					20610,
					20611,
					20612,
					20613,
					20614,
					20615,
					20616,
					20617,
					20618,
					20619,
					20620,
					20621,
					20622,
					20623,
					20624,
					20625,
					20626,
					20627,
					20628,
					20629,
					20630,
					20631,
					20632,
					20633,
					20634,
					20635,
					20636,
					20637,
					20638,
					20639,
					20640,
					20641,
					20642,
					20643,
					9927
				]
			},
			{
				"speed": 25,
				"name": "Olian Drive",
				"nodes": [
					4455,
					20644,
					20645,
					20646,
					20647,
					20648,
					20479
				]
			},
			{
				"speed": 30,
				"name": "Teson Road",
				"nodes": [
					20136,
					20649,
					20650,
					20651,
					20652,
					20653,
					20654,
					20655,
					20656,
					20657,
					20658,
					20659,
					20660,
					20661,
					20662,
					20663,
					20664,
					20665,
					20666,
					20667,
					20668,
					20669,
					20670,
					20671,
					20583
				]
			},
			{
				"speed": 25,
				"name": "Foxcrest Drive",
				"nodes": [
					20489,
					20672,
					20673,
					20674,
					20675,
					20676,
					20677,
					20678,
					20679,
					20680,
					20681,
					7632
				]
			},
			{
				"speed": 25,
				"name": "Holiday Avenue",
				"nodes": [
					2443,
					20682,
					20683,
					20353,
					20684,
					20247
				]
			},
			{
				"speed": 25,
				"name": "Holly River Drive",
				"nodes": [
					20685,
					20686,
					20687,
					20688,
					20689,
					20690,
					20691,
					20692,
					20693,
					20694
				]
			},
			{
				"speed": 25,
				"name": "Pinecone Trail",
				"nodes": [
					20695,
					20696,
					20697,
					20698
				]
			},
			{
				"speed": 25,
				"name": "Riverwood Trails Drive",
				"nodes": [
					20699,
					20700,
					20701,
					20702,
					20703,
					20704,
					20705,
					20706,
					3449
				]
			},
			{
				"speed": 25,
				"name": "Driftwood Trails Drive",
				"nodes": [
					3697,
					20707,
					20708,
					20709,
					20710,
					20711,
					20712,
					20713,
					20714,
					20715,
					20716,
					20717,
					20718,
					20719,
					20720,
					20721,
					20722,
					20723,
					20724,
					20725,
					20726,
					20727,
					20728,
					7296
				]
			},
			{
				"speed": 30,
				"name": "Tahoe Drive",
				"nodes": [
					431,
					20729,
					20730,
					20731,
					20732,
					20733,
					3444
				]
			},
			{
				"speed": 25,
				"name": "Riverwood Trails Drive",
				"nodes": [
					20695,
					20734,
					20735,
					20736,
					20737,
					20738,
					20739,
					20740,
					20741,
					20742,
					20743,
					20744,
					20745,
					20746,
					20699
				]
			},
			{
				"speed": 25,
				"name": "Holly River Drive",
				"nodes": [
					11215,
					20747,
					20748,
					20749,
					20750,
					20685
				]
			},
			{
				"speed": 25,
				"name": "Cherokee Trail Lane",
				"nodes": [
					10589,
					20751,
					20752,
					20753,
					20754,
					20755,
					20756,
					20757,
					20758,
					20759
				]
			},
			{
				"speed": 25,
				"name": "Flora Ct",
				"nodes": [
					11738,
					20760,
					20761,
					20762,
					20763
				]
			},
			{
				"speed": 25,
				"name": "Coachway Lane",
				"nodes": [
					20502,
					20764,
					20765,
					20766,
					20767,
					20493,
					20768,
					20769,
					20770,
					20771,
					4231,
					20772,
					20773,
					20774,
					20775,
					5625
				]
			},
			{
				"speed": 25,
				"name": "Flordawn Drive",
				"nodes": [
					771,
					20776,
					20777,
					20778,
					20779,
					20780,
					20781,
					20782,
					20783,
					20784,
					20785,
					20786,
					20787,
					20788,
					20789,
					20790,
					526
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					4688,
					20791,
					20792,
					20763
				]
			},
			{
				"speed": 40,
				"name": "Dunn Road",
				"nodes": [
					20793,
					14219
				]
			},
			{
				"speed": 35,
				"name": "Dunn Road",
				"nodes": [
					318,
					20794,
					20795,
					14042,
					20796,
					8686,
					20797,
					208,
					20798,
					20799,
					9099,
					20800,
					148
				]
			},
			{
				"speed": 30,
				"name": "Dunn Road",
				"nodes": [
					319,
					20801,
					4040,
					20802,
					20803,
					20804,
					20805,
					20806,
					20807,
					20808,
					7087,
					20809,
					11715,
					20810,
					20811,
					20812,
					20813,
					318
				]
			},
			{
				"speed": 30,
				"name": "Dunn Road",
				"nodes": [
					148,
					20814,
					941,
					20815,
					20816,
					203
				]
			},
			{
				"speed": 30,
				"name": "Dunn Road",
				"nodes": [
					13371,
					9617,
					20817,
					10658,
					20818,
					20819,
					20820,
					20821,
					13823
				]
			},
			{
				"speed": 25,
				"name": "Fernwood Trail Drive",
				"nodes": [
					10588,
					20822,
					20823,
					20824,
					20825,
					20826,
					20685
				]
			},
			{
				"speed": 30,
				"name": "Dunn Road",
				"nodes": [
					204,
					20827,
					20828,
					20829,
					20830,
					20831
				]
			},
			{
				"speed": 25,
				"name": "Flordawn Drive",
				"nodes": [
					526,
					20832,
					20833,
					20834,
					20835,
					20836,
					20837,
					20838,
					20839,
					3466
				]
			},
			{
				"speed": 25,
				"name": "Fernwood Trail Drive",
				"nodes": [
					6206,
					20840,
					20841,
					20842,
					20843,
					10588
				]
			},
			{
				"speed": 25,
				"name": "Saint Cornelius Lane",
				"nodes": [
					942,
					20844,
					20845,
					20846,
					3353,
					20847,
					20848,
					20849,
					20850,
					20851,
					5776
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					20852,
					20853,
					20854,
					20855,
					20856,
					20857,
					20858,
					20859,
					20860,
					20861,
					20862,
					20863,
					20864,
					20865
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					14129,
					20866,
					20867
				]
			},
			{
				"speed": 25,
				"name": "Yaqui Drive",
				"nodes": [
					4587,
					20868,
					20869,
					20870,
					20871,
					20872,
					20873,
					20874,
					20875,
					20731
				]
			},
			{
				"speed": 40,
				"name": "West Florissant Avenue",
				"nodes": [
					5708,
					4661,
					20876,
					20877,
					20878,
					14078,
					20879,
					20880,
					9662
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					14217,
					20881,
					20882,
					13362
				]
			},
			{
				"speed": 25,
				"name": "Riverwood Trails Drive",
				"nodes": [
					4773,
					20883,
					20712,
					20884,
					20885,
					20886,
					20695
				]
			},
			{
				"speed": 40,
				"name": "Dunn Road",
				"nodes": [
					20887,
					20888,
					20889,
					13837,
					13739,
					20890,
					20891,
					20892,
					20893,
					20894
				]
			},
			{
				"speed": 35,
				"name": "South New Florissant Road",
				"nodes": [
					9099,
					13812,
					214,
					13408,
					11371,
					2794
				]
			},
			{
				"speed": 25,
				"name": "Croftdale Drive",
				"nodes": [
					518,
					20895,
					20896,
					20897,
					20898,
					20899,
					11116,
					20900,
					20901,
					20902,
					3461
				]
			},
			{
				"speed": 40,
				"name": "Dunn Road",
				"nodes": [
					203,
					20903,
					20904,
					20905,
					20906,
					20907,
					20908,
					20909,
					1620,
					13371
				]
			},
			{
				"speed": 30,
				"name": "Derhake Road",
				"nodes": [
					5260,
					20910
				]
			},
			{
				"speed": 25,
				"name": "Paddlewheel Drive",
				"nodes": [
					11862,
					5967,
					20911,
					2137,
					2134
				]
			},
			{
				"speed": 30,
				"name": "Derhake Road",
				"nodes": [
					20910,
					20912,
					20913,
					20914
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					6396,
					20915
				]
			},
			{
				"speed": 25,
				"name": "Paddock Drive",
				"nodes": [
					1919,
					20916
				]
			},
			{
				"speed": 25,
				"name": "Paddock Drive",
				"nodes": [
					20916,
					2520
				]
			},
			{
				"speed": 25,
				"name": "Wellington Drive",
				"nodes": [
					8578,
					20917,
					20918,
					20919,
					20920,
					2296,
					20921,
					20922,
					20923,
					20924,
					4431,
					20925,
					20926,
					20927,
					20928,
					4030
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1291,
					20929,
					20930,
					20931,
					20932,
					20933,
					20934,
					20935,
					20936,
					1291
				]
			},
			{
				"speed": 25,
				"name": "Queens Drive",
				"nodes": [
					8831,
					20937,
					8028
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					7471,
					20938,
					20939,
					20940,
					20941,
					20942,
					20943,
					780
				]
			},
			{
				"speed": 25,
				"name": "Boulder Drive",
				"nodes": [
					7006,
					20944,
					9571,
					4503
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					20945,
					20946
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					4899,
					20947,
					20948,
					20949,
					20950,
					20951,
					20952,
					4900
				]
			},
			{
				"speed": 25,
				"name": "East Humes Lane",
				"nodes": [
					3763,
					20953,
					20954,
					20945,
					20955,
					20956,
					20957,
					20958,
					20959,
					7891,
					20960,
					20961,
					20962,
					20963,
					12349,
					20964,
					20965,
					20966,
					6213,
					20967,
					20968,
					20969,
					20970,
					12763
				]
			},
			{
				"speed": 25,
				"name": "Cortez Drive",
				"nodes": [
					4166,
					20971,
					20972,
					1243,
					20973,
					20974,
					20975,
					20976,
					20977,
					12345
				]
			},
			{
				"speed": 25,
				"name": "Pamela Drive",
				"nodes": [
					7465,
					8831,
					6612,
					20978,
					20979,
					8943
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1667,
					20980,
					20981,
					20982,
					20983,
					20984,
					20985,
					20986,
					20987,
					1665
				]
			},
			{
				"speed": 25,
				"name": "Aspen Drive",
				"nodes": [
					5805,
					20988,
					20989,
					20990,
					20991,
					20992,
					4508
				]
			},
			{
				"speed": 25,
				"name": "Estes Drive",
				"nodes": [
					12345,
					20993,
					20994,
					20995,
					20996,
					20997,
					20998,
					5899,
					20999
				]
			},
			{
				"speed": 25,
				"name": "Boulder Drive",
				"nodes": [
					4503,
					21000,
					21001,
					21002,
					21003,
					21004,
					21005,
					21006,
					21007,
					20996
				]
			},
			{
				"speed": 25,
				"name": "Thunderbird Avenue",
				"nodes": [
					5759,
					21008,
					21009,
					21010,
					21011,
					21012,
					3667,
					21013,
					21014,
					6181,
					5767,
					21015,
					21016,
					8627,
					3758
				]
			},
			{
				"speed": 25,
				"name": "Francisca Drive",
				"nodes": [
					11403,
					21017,
					21018,
					21019,
					21020,
					21021,
					21022,
					21023,
					21024,
					21025,
					21026,
					21027,
					20976
				]
			},
			{
				"speed": 25,
				"name": "Florisota Drive",
				"nodes": [
					6262,
					21028,
					21029,
					11628,
					4184
				]
			},
			{
				"speed": 25,
				"name": "Wellington Drive",
				"nodes": [
					4030,
					21030,
					21031,
					21032,
					21033,
					17986,
					17994,
					21034,
					21035,
					21036,
					21037,
					21038,
					21039,
					21040,
					21041,
					21042,
					21043
				]
			},
			{
				"speed": 25,
				"name": "Carla Drive",
				"nodes": [
					8032,
					8945,
					21044,
					21045,
					21046,
					14116
				]
			},
			{
				"speed": 25,
				"name": "Daniel Boone Drive",
				"nodes": [
					3227,
					21047,
					12475,
					7002
				]
			},
			{
				"speed": 25,
				"name": "Thunderbird Avenue",
				"nodes": [
					3758,
					21048,
					21049,
					21050,
					12520,
					21051,
					21052,
					3741,
					21053,
					21054,
					21055,
					9717
				]
			},
			{
				"speed": 30,
				"name": "Old Jamestown Road",
				"nodes": [
					3051,
					21056
				]
			},
			{
				"speed": 25,
				"name": "Palm Drive",
				"nodes": [
					6649,
					21057
				]
			},
			{
				"speed": 25,
				"name": "Palm Drive",
				"nodes": [
					21057,
					7030,
					21058,
					9156
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					21059,
					3219,
					10896,
					343
				]
			},
			{
				"speed": 25,
				"name": "Aspen Drive",
				"nodes": [
					4508,
					21060,
					21061,
					21062,
					21063,
					21064,
					21065,
					21066,
					21067,
					21068,
					21069,
					21070,
					21071
				]
			},
			{
				"speed": 30,
				"name": "Mullanphy Road",
				"nodes": [
					21071,
					10475,
					9379
				]
			},
			{
				"speed": 25,
				"name": "Swallow Lane",
				"nodes": [
					5626,
					21072,
					10480,
					9383
				]
			},
			{
				"speed": 25,
				"name": "Flicker Drive",
				"nodes": [
					4514,
					21073,
					10479
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					10234,
					21074,
					21075,
					21076,
					21077,
					21078,
					21079,
					21080,
					5532
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					21081,
					21082,
					21083,
					21084
				]
			},
			{
				"speed": 25,
				"name": "Swallow Lane",
				"nodes": [
					2105,
					21085,
					21086,
					5626
				]
			},
			{
				"speed": 30,
				"name": "Mullanphy Road",
				"nodes": [
					5596,
					10631,
					4513,
					21071
				]
			},
			{
				"speed": 25,
				"name": "Bluebird Drive",
				"nodes": [
					4339,
					21087,
					5631
				]
			},
			{
				"speed": 25,
				"name": "Flamingo Drive",
				"nodes": [
					4515,
					21088,
					3241,
					9965,
					5636
				]
			},
			{
				"speed": 25,
				"name": "Verlene Drive",
				"nodes": [
					5192,
					21089,
					9682,
					21090,
					21091,
					21092,
					21093,
					21094,
					21095,
					21096,
					4516,
					3242,
					9966,
					5644,
					21097,
					21098,
					21099,
					21100,
					21101,
					21083,
					21102,
					21103,
					21104,
					21105,
					9680
				]
			},
			{
				"speed": 25,
				"name": "Tyson Drive",
				"nodes": [
					10448,
					21106,
					21107,
					7111,
					21108,
					21109,
					4128,
					21110,
					5491
				]
			},
			{
				"speed": 30,
				"name": "Old Jamestown Road",
				"nodes": [
					21056,
					21111,
					21112,
					21113,
					21114,
					21115,
					21116,
					21117,
					7213,
					21118,
					21119,
					21120,
					21121,
					21122,
					21123,
					21124,
					6239,
					13918
				]
			},
			{
				"speed": 25,
				"name": "Grand National Drive",
				"nodes": [
					21125,
					21126,
					21127,
					21128,
					21129,
					21130,
					21131,
					21132,
					21133,
					21134,
					21135,
					11646,
					21136
				]
			},
			{
				"speed": 40,
				"name": "New Halls Ferry Road",
				"nodes": [
					21137,
					21138
				]
			},
			{
				"speed": 40,
				"name": "New Halls Ferry Road",
				"nodes": [
					21138,
					8258,
					5493,
					14891,
					15313,
					21139,
					21140,
					11381,
					3320,
					15641,
					15629
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					4555,
					21141,
					21142,
					4472
				]
			},
			{
				"speed": 40,
				"name": "?",
				"nodes": [
					11500,
					21143
				]
			},
			{
				"speed": 30,
				"name": "Saint Denis Street",
				"nodes": [
					20112,
					14047
				]
			},
			{
				"speed": 40,
				"name": "?",
				"nodes": [
					21143,
					21144,
					12359,
					9797,
					4690,
					10865,
					12783,
					8345,
					21145,
					21146,
					10153,
					21147,
					21148,
					21149,
					21150,
					21151,
					21152,
					21153,
					21154,
					3819,
					21155,
					21156,
					13186,
					5878,
					2793,
					13870
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					12837,
					21157,
					21158,
					21159,
					21160,
					21161,
					21162,
					21163,
					15727
				]
			},
			{
				"speed": 25,
				"name": "Rhapsody Lane",
				"nodes": [
					8672,
					21164,
					21165,
					21166,
					21167,
					21168
				]
			},
			{
				"speed": 25,
				"name": "Sherwood Drive",
				"nodes": [
					11916,
					21169,
					21170,
					21171,
					21172,
					21173,
					21174,
					11918
				]
			},
			{
				"speed": 25,
				"name": "Valleybrook Drive",
				"nodes": [
					1659,
					21175,
					21176,
					21177,
					21178,
					21179,
					21180,
					21181,
					21182,
					21183,
					21184,
					21185,
					21186,
					21187,
					21188,
					21189,
					21190,
					21191,
					21192,
					21193,
					21194
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					7616,
					21195,
					21196,
					21197,
					21198,
					21199,
					21200,
					21201,
					21202,
					21203,
					7616
				]
			},
			{
				"speed": 25,
				"name": "Carolview Drive",
				"nodes": [
					21204,
					9348,
					21205,
					21206,
					12249
				]
			},
			{
				"speed": 25,
				"name": "Chalfont Road",
				"nodes": [
					6180,
					21207,
					21208,
					21209,
					21210,
					21211,
					21212,
					21213,
					21214,
					6180
				]
			},
			{
				"speed": 25,
				"name": "Evelynaire Place",
				"nodes": [
					9350,
					21215,
					21216,
					21217,
					21218,
					9349
				]
			},
			{
				"speed": 25,
				"name": "South Branridge Road",
				"nodes": [
					21219,
					9738
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					6960,
					21220,
					21221,
					21222,
					21223,
					21224,
					1997
				]
			},
			{
				"speed": 35,
				"name": "Dunn Road",
				"nodes": [
					3108,
					7723
				]
			},
			{
				"speed": 35,
				"name": "Dunn Road",
				"nodes": [
					7724,
					21225,
					21226,
					21227,
					21228,
					13487,
					21229,
					21230,
					3108
				]
			},
			{
				"speed": 25,
				"name": "Lewis Landing Drive",
				"nodes": [
					8926,
					21231,
					21232,
					21233,
					21234,
					21235
				]
			},
			{
				"speed": 40,
				"name": "Dunn Road",
				"nodes": [
					20894,
					21236,
					21237,
					13740,
					13836,
					21238,
					21239,
					21240,
					21241,
					21242,
					252
				]
			},
			{
				"speed": 40,
				"name": "Dunn Road",
				"nodes": [
					20894,
					21243,
					319
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					13819,
					21244,
					21238
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					13738,
					21245,
					21246,
					20890
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					21236,
					21247,
					21248,
					13597
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					14218,
					21249,
					21250,
					21251,
					21252
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					20889,
					21253,
					21254,
					21255,
					13838
				]
			},
			{
				"speed": 35,
				"name": "Dunn Road",
				"nodes": [
					21256,
					12313,
					20793
				]
			},
			{
				"speed": 40,
				"name": "Dunn Road",
				"nodes": [
					14219,
					21257,
					21252,
					21258,
					21259,
					21260,
					114
				]
			},
			{
				"speed": 40,
				"name": "Dunn Road",
				"nodes": [
					14219,
					21261,
					204
				]
			},
			{
				"speed": 35,
				"name": "Dunn Road",
				"nodes": [
					7724,
					1248,
					3918,
					13611,
					21262,
					21256
				]
			},
			{
				"speed": 40,
				"name": "Dunn Road",
				"nodes": [
					252,
					21263,
					21264,
					21265,
					21266,
					20831
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					252,
					20887
				]
			},
			{
				"speed": 25,
				"name": "Harbor Landings Circle",
				"nodes": [
					21232,
					21267,
					21268,
					21269,
					21270,
					21271,
					21272,
					21273,
					21274,
					21275,
					21276,
					21234,
					21277
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					114,
					20793
				]
			},
			{
				"speed": 40,
				"name": "Dunn Road",
				"nodes": [
					114,
					21278,
					21279,
					21256
				]
			},
			{
				"speed": 30,
				"name": "Dunn Road",
				"nodes": [
					20831,
					21280,
					21281,
					20887
				]
			},
			{
				"speed": 25,
				"name": "Vitadale Court",
				"nodes": [
					21282,
					21283,
					21284,
					21285,
					21286,
					21287,
					21288,
					21289,
					21290,
					21291,
					21292,
					21282,
					21293,
					21294,
					21295,
					21296
				]
			},
			{
				"speed": 25,
				"name": "Woodwind Drive",
				"nodes": [
					14215,
					21297,
					21298,
					21299,
					21300,
					21301,
					21302,
					21303,
					21304,
					21305,
					21306,
					21296
				]
			},
			{
				"speed": 25,
				"name": "Aylesford Drive",
				"nodes": [
					21307,
					21308,
					21309,
					21310,
					21311,
					21312,
					21313,
					21314
				]
			},
			{
				"speed": 25,
				"name": "Ely Drive",
				"nodes": [
					9672,
					21315,
					21316
				]
			},
			{
				"speed": 25,
				"name": "Millshire Drive",
				"nodes": [
					21317,
					21318,
					21319,
					21320,
					21310
				]
			},
			{
				"speed": 25,
				"name": "Minneford Drive",
				"nodes": [
					21321,
					21322,
					21323,
					21324,
					21325,
					21326,
					21327,
					21328,
					21329,
					21314
				]
			},
			{
				"speed": 25,
				"name": "Olney Drive",
				"nodes": [
					21330,
					9678
				]
			},
			{
				"speed": 25,
				"name": "Ottkamp Drive",
				"nodes": [
					21331,
					21332,
					21333,
					21334,
					21335
				]
			},
			{
				"speed": 25,
				"name": "Tate Drive",
				"nodes": [
					21336,
					21337,
					9674
				]
			},
			{
				"speed": 25,
				"name": "Beecher Drive",
				"nodes": [
					9135
				]
			},
			{
				"speed": 25,
				"name": "Atmore Drive",
				"nodes": [
					21338,
					21336,
					21339,
					21340,
					21341,
					21342,
					21343,
					21344,
					8841
				]
			},
			{
				"speed": 25,
				"name": "Trask Drive",
				"nodes": [
					9131,
					21345,
					8841,
					21346,
					11418,
					6925,
					3890,
					12505,
					10462,
					8827,
					21347,
					21348,
					21349,
					21350,
					21351,
					8995
				]
			},
			{
				"speed": 25,
				"name": "Elkins Drive",
				"nodes": [
					21296,
					21352,
					21353,
					21354,
					21355,
					21356,
					21357,
					21358,
					21359,
					21360,
					21338,
					21361,
					21362,
					21335,
					21363,
					21364,
					21321,
					21365,
					21366,
					21317,
					21367,
					21368,
					21307,
					21369,
					4624
				]
			},
			{
				"speed": 25,
				"name": "Jesskamp Drive",
				"nodes": [
					21370,
					21331,
					21371,
					21372,
					21373,
					21374,
					21375,
					21376,
					21377,
					21378,
					21356
				]
			},
			{
				"speed": 25,
				"name": "Harneywold Drive",
				"nodes": [
					21379,
					4663,
					21380,
					21381,
					21382,
					21383,
					21384,
					21385,
					21386,
					21387,
					21388,
					21389,
					21390,
					21391,
					21392,
					21393,
					21394,
					21395,
					21396,
					21397,
					21398,
					21399,
					21400,
					21401,
					21402,
					21403,
					21404,
					21405,
					21406,
					21407,
					21408,
					21409,
					21410,
					21411,
					21412,
					21413,
					21414,
					21415,
					21416,
					21417,
					21418,
					21379
				]
			},
			{
				"speed": 25,
				"name": "Old Manor Road",
				"nodes": [
					21419,
					21420,
					21421,
					21422,
					21423,
					21424,
					21425,
					0
				]
			},
			{
				"speed": 25,
				"name": "Wheeling Court",
				"nodes": [
					21426,
					21427,
					21368
				]
			},
			{
				"speed": 25,
				"name": "Charmont Drive",
				"nodes": [
					21428,
					12256,
					21429,
					21430,
					21431,
					21432,
					21433,
					21434,
					21435,
					21436,
					21437
				]
			},
			{
				"speed": 25,
				"name": "Prior Drive",
				"nodes": [
					21438,
					21439,
					21440,
					9671
				]
			},
			{
				"speed": 25,
				"name": "Knollway Drive",
				"nodes": [
					235,
					21441,
					21442,
					21443,
					21444,
					21445,
					21446,
					21447,
					21448,
					21449,
					9014
				]
			},
			{
				"speed": 25,
				"name": "Monceau Drive",
				"nodes": [
					21450,
					21451,
					21452,
					21453,
					21454,
					21455,
					21456,
					21457,
					21458,
					21459,
					21460,
					21461,
					21462,
					21463,
					21464,
					21465,
					21437,
					21466,
					21467,
					21468,
					2240
				]
			},
			{
				"speed": 25,
				"name": "Murillo Drive",
				"nodes": [
					21469,
					12260
				]
			},
			{
				"speed": 25,
				"name": "Moonlight Drive",
				"nodes": [
					697,
					21470,
					21471,
					21472,
					21473,
					86
				]
			},
			{
				"speed": 25,
				"name": "Sunny Way",
				"nodes": [
					21474,
					21475,
					697
				]
			},
			{
				"speed": 25,
				"name": "Starlight Drive",
				"nodes": [
					21476,
					21474,
					21477,
					21478,
					21479,
					21480,
					86
				]
			},
			{
				"speed": 25,
				"name": "Calverton Road",
				"nodes": [
					4926,
					21481,
					21482,
					21483,
					21484,
					6507,
					21485,
					21486,
					21487,
					21488,
					21489
				]
			},
			{
				"speed": 25,
				"name": "Charlotte Drive",
				"nodes": [
					21490,
					21491,
					21492,
					9016
				]
			},
			{
				"speed": 25,
				"name": "Hollins Drive",
				"nodes": [
					21493,
					21494,
					21495,
					21488
				]
			},
			{
				"speed": 25,
				"name": "Kienstra Lane",
				"nodes": [
					21496,
					21497,
					21498,
					21499,
					21500,
					21501,
					21502,
					21481
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					21503,
					21504,
					21505,
					21506,
					21496,
					21507,
					21508,
					21509,
					21510,
					21511,
					21512,
					21513,
					21514,
					21515,
					21516,
					21517,
					21518,
					21519,
					21503
				]
			},
			{
				"speed": 30,
				"name": "North Elizabeth Avenue",
				"nodes": [
					4877,
					21520,
					2243,
					21521,
					21522,
					21489,
					21490,
					5807,
					9123,
					9020
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					21523,
					21524,
					21525,
					21526,
					21527,
					21528,
					21529,
					21530,
					21531,
					21532,
					21533,
					21534,
					21535,
					21536,
					21537,
					686,
					21538,
					21539,
					21540,
					21523
				]
			},
			{
				"speed": 25,
				"name": "Knollstone Drive",
				"nodes": [
					235,
					21541,
					21542,
					21543,
					21544,
					21545,
					21546,
					21547,
					21548,
					21549,
					21550,
					21551,
					21552,
					21553,
					21554,
					9015
				]
			},
			{
				"speed": 25,
				"name": "Jamesborough Drive",
				"nodes": [
					5901,
					21555,
					21556
				]
			},
			{
				"speed": 25,
				"name": "Red Lion Drive",
				"nodes": [
					21557,
					21558,
					21559,
					21560,
					21561,
					21562,
					21563,
					21564,
					12010
				]
			},
			{
				"speed": 25,
				"name": "Shalimar Place",
				"nodes": [
					11839,
					21565,
					21566,
					21567,
					21568,
					21569,
					21570,
					21571,
					21572,
					21573,
					21574,
					21575,
					21576,
					21577,
					21578,
					21579,
					21569
				]
			},
			{
				"speed": 25,
				"name": "Sheringhan Place",
				"nodes": [
					11841,
					21580,
					21581,
					21582,
					21583,
					21584,
					21585,
					21586,
					21587,
					21588,
					21580
				]
			},
			{
				"speed": 25,
				"name": "Silhouette Place",
				"nodes": [
					11835,
					21589,
					21590,
					21591,
					21592,
					21593,
					21594,
					21595,
					21596,
					21597,
					21598,
					21590
				]
			},
			{
				"speed": 25,
				"name": "Sir Edward Court",
				"nodes": [
					21599,
					21600,
					21601,
					21602,
					21603,
					21604,
					21605,
					21606,
					21607,
					21608,
					21609,
					21610,
					21611,
					21612
				]
			},
			{
				"speed": 25,
				"name": "Parktrails Lane",
				"nodes": [
					21613,
					21614,
					21615,
					21616,
					21617,
					21618,
					21619
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					21620,
					21621,
					21622,
					4042,
					21623,
					21624,
					21625,
					21626,
					21627,
					21628,
					21629,
					21630,
					21631,
					21632,
					21633,
					21634,
					21635,
					21620
				]
			},
			{
				"speed": 25,
				"name": "Trailbend Drive",
				"nodes": [
					3013,
					21636,
					21637,
					21638,
					21639,
					21640,
					21641,
					21642,
					21643,
					5010,
					21644,
					21645,
					21646,
					21647,
					21648,
					21649,
					21650,
					21651,
					21652,
					21653,
					21654,
					3185,
					21655,
					21656
				]
			},
			{
				"speed": 25,
				"name": "Suntrail Drive",
				"nodes": [
					21657,
					21658,
					21659,
					3200
				]
			},
			{
				"speed": 25,
				"name": "Sandycreek Lane",
				"nodes": [
					21660,
					21661,
					21662,
					21663,
					21664,
					21665,
					21666,
					21667,
					21658
				]
			},
			{
				"speed": 25,
				"name": "Evening Shade Drive",
				"nodes": [
					21668,
					21669,
					21670,
					21671,
					21672,
					21673,
					21674,
					12686
				]
			},
			{
				"speed": 25,
				"name": "Broadridge Lane",
				"nodes": [
					2587,
					21675,
					21676,
					21677,
					5078,
					21678,
					21679,
					21680,
					21681,
					21682,
					21683,
					21684,
					21685,
					11505
				]
			},
			{
				"speed": 25,
				"name": "Jamestowne Ridge Lane",
				"nodes": [
					21686,
					21687,
					21688,
					21689,
					21690,
					21691,
					21692,
					21693,
					21694,
					21695,
					21696,
					21697,
					21698,
					21699,
					21700,
					21701,
					21686
				]
			},
			{
				"speed": 25,
				"name": "Marne Drive",
				"nodes": [
					12684,
					21702,
					21703,
					21704,
					3007,
					21705,
					21706,
					21707,
					11504
				]
			},
			{
				"speed": 25,
				"name": "Midday Drive",
				"nodes": [
					10242,
					21671
				]
			},
			{
				"speed": 25,
				"name": "Stoneridge Drive",
				"nodes": [
					21707,
					6029,
					21708,
					21709,
					21710,
					21711,
					21712,
					21713,
					11502
				]
			},
			{
				"speed": 25,
				"name": "Persimmon Bend Lane",
				"nodes": [
					9427,
					21714,
					21715,
					21716,
					21717,
					21718,
					21719,
					21720,
					9425
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					21721,
					21722,
					21723
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					3001,
					21724,
					21725,
					21726
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					21727,
					21728,
					21721,
					2997
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					21724,
					21729,
					21730,
					21731,
					21732,
					21728
				]
			},
			{
				"speed": 25,
				"name": "De Marillac Drive",
				"nodes": [
					21733,
					21734,
					21735,
					21736
				]
			},
			{
				"speed": 25,
				"name": "Kingsley Height Drive",
				"nodes": [
					21737,
					21738,
					21739,
					21740,
					21741,
					21742,
					21743,
					21744,
					21745,
					21746,
					21747,
					21748,
					21749,
					21750,
					21751,
					21752,
					21737
				]
			},
			{
				"speed": 25,
				"name": "Oberon Lane",
				"nodes": [
					21753,
					21754
				]
			},
			{
				"speed": 25,
				"name": "Northview Heights Court",
				"nodes": [
					21755,
					21756
				]
			},
			{
				"speed": 25,
				"name": "Baresford Drive",
				"nodes": [
					5902,
					21757,
					21758,
					21759,
					21760,
					21761,
					21762,
					21763,
					21764,
					21556
				]
			},
			{
				"speed": 25,
				"name": "Parkton Place",
				"nodes": [
					3016,
					21765,
					21766,
					21767,
					21768,
					21769,
					21770,
					21771,
					21772,
					21773,
					21774,
					21733,
					21775,
					21776,
					21777,
					21755,
					21778,
					4992,
					21779,
					21780,
					21781,
					21782,
					21783,
					2569
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					21784,
					21785,
					21786,
					21787,
					21788,
					21789,
					21790,
					21791,
					21792,
					21793,
					21794,
					21795,
					21796,
					6874,
					21797,
					21798,
					21799,
					21784
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					21800,
					21801,
					21802,
					21803,
					21804,
					21805,
					21806,
					21807,
					21808,
					21809,
					21810,
					21811,
					6864,
					21812,
					21813,
					21814,
					21815,
					21800
				]
			},
			{
				"speed": 25,
				"name": "Jerries Lane",
				"nodes": [
					11851,
					21816,
					21817,
					21818,
					21819,
					21820,
					21821,
					21822,
					6640,
					5900,
					21823,
					21824,
					21609,
					21825,
					12009,
					21826,
					21827,
					21656,
					21828,
					21829,
					21830,
					21657,
					21831,
					21832,
					21833,
					21834,
					21662,
					21835
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					21836,
					21837,
					21838,
					21839,
					21756,
					21840,
					21841,
					21842,
					21843,
					21844,
					21845,
					21846,
					21847,
					21848,
					21849,
					21850,
					21851,
					21836
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					21852,
					21853,
					21854,
					21855,
					4988,
					21856,
					21857,
					21858,
					21859,
					21860,
					21861,
					21862,
					21863,
					21864,
					21865,
					21866,
					21867,
					21852
				]
			},
			{
				"speed": 25,
				"name": "Cloverbrook Drive",
				"nodes": [
					21868,
					4619
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					3021,
					21869,
					21870,
					21871,
					21872,
					21873,
					21874,
					21875,
					21876,
					21877,
					21878
				]
			},
			{
				"speed": 25,
				"name": "Trailview Drive",
				"nodes": [
					21879,
					21880,
					21881,
					21882,
					21883,
					21884,
					4056
				]
			},
			{
				"speed": 25,
				"name": "Trees Edge Court",
				"nodes": [
					21885,
					13143,
					21886,
					21887,
					21888
				]
			},
			{
				"speed": 25,
				"name": "Bielfield Lane",
				"nodes": [
					4097,
					21889,
					21890,
					21891,
					21892,
					11980
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					21893,
					4076,
					21894,
					21895,
					21896,
					21897,
					21898,
					21899,
					21900,
					21901,
					21902,
					5745
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					21903,
					21904,
					21905,
					21906,
					21907,
					21908,
					21909,
					21910,
					21911,
					21912,
					21913,
					21914,
					21915,
					21916,
					21917,
					21918,
					21919,
					21920,
					21921,
					21922,
					21923,
					21924
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					21925,
					21926,
					21927,
					4080
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					21889,
					21928,
					21929,
					21930,
					21931,
					21932,
					21933,
					21890
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					11983,
					21934,
					21935,
					21936,
					21937,
					21938,
					21939,
					21940,
					21941,
					21942,
					21943,
					21944,
					21945,
					21946,
					21947,
					21924,
					21948,
					21949,
					21950,
					21951,
					21952,
					21903,
					21953,
					21954,
					21955,
					21956,
					21957,
					21958,
					21959,
					21960,
					21961,
					21962,
					21963,
					21964,
					21965,
					21966,
					21967,
					21968,
					21969,
					21970,
					21971,
					21972,
					21973,
					21935
				]
			},
			{
				"speed": 25,
				"name": "High Crest Court",
				"nodes": [
					21974,
					21975,
					21976,
					21977,
					21978,
					21979,
					21980,
					9423
				]
			},
			{
				"speed": 25,
				"name": "Liberty Landing Drive",
				"nodes": [
					7871,
					21981,
					21982,
					21983,
					21984,
					21985,
					21986,
					21987,
					21988,
					21989,
					21990,
					21991,
					7866
				]
			},
			{
				"speed": 25,
				"name": "Sugarcrest Drive",
				"nodes": [
					21992,
					21993,
					21994,
					21995,
					21996,
					21997,
					21998,
					21999,
					22000
				]
			},
			{
				"speed": 25,
				"name": "Rottingdean Drive",
				"nodes": [
					12145,
					22001,
					22002,
					22003,
					22004,
					22005,
					22006,
					22007,
					22008,
					11559
				]
			},
			{
				"speed": 25,
				"name": "Mourville Court",
				"nodes": [
					22009,
					22010,
					22011,
					22012,
					22013,
					22014,
					22015,
					22016,
					22017,
					22018,
					22019,
					22020,
					22021,
					22022,
					22023,
					22024,
					22009
				]
			},
			{
				"speed": 25,
				"name": "Sugarpine Drive",
				"nodes": [
					20827,
					22025,
					22026,
					22027,
					22028,
					22029,
					22030,
					22031,
					22032,
					22033,
					14220
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					21992,
					22034,
					22035,
					22036,
					21261
				]
			},
			{
				"speed": 25,
				"name": "Tanglebrook Drive",
				"nodes": [
					22037,
					22038,
					22039,
					22040,
					22041,
					22042,
					22043,
					22044,
					22045,
					22046,
					22047,
					22048,
					22049,
					22050,
					22051,
					22052,
					22037
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22053,
					22054,
					22055,
					13140,
					22056,
					22057,
					22058,
					22059,
					22060,
					22061,
					22062,
					22063,
					22064,
					22065,
					22066,
					22067,
					22068,
					22053
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					4088,
					22069,
					22070,
					22071,
					22072,
					22073,
					22074,
					22075,
					4090
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22076,
					22077,
					22078,
					22079,
					22080,
					22081,
					22082,
					22083,
					21885,
					22084,
					22085,
					22086,
					22087,
					22088,
					22089,
					22090,
					22091,
					22076
				]
			},
			{
				"speed": 25,
				"name": "old Country Estates Drive",
				"nodes": [
					22092,
					22093,
					22094,
					22095,
					22096,
					22097,
					22098,
					22099,
					22100,
					22101,
					22102,
					22103,
					22104,
					22105,
					22106,
					22107,
					22092
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22108,
					22109,
					22110,
					22111,
					22112,
					22113,
					22114,
					21998
				]
			},
			{
				"speed": 25,
				"name": "Michelham Drive",
				"nodes": [
					12540,
					22115,
					22116,
					22117,
					22118,
					22119,
					22120,
					12145
				]
			},
			{
				"speed": 25,
				"name": "Sugar Pines Court",
				"nodes": [
					21992,
					22121,
					22122,
					22123,
					22124,
					22125,
					22126,
					22127,
					22128,
					22129,
					22130,
					22108,
					22131,
					22132,
					22133,
					22031
				]
			},
			{
				"speed": 25,
				"name": "Paddock Ridge Court",
				"nodes": [
					22134,
					22135,
					22136,
					22137,
					22138,
					22139,
					22140,
					22141,
					22142,
					22143,
					22144,
					22145,
					22146,
					22147
				]
			},
			{
				"speed": 25,
				"name": "Amblewood Drive",
				"nodes": [
					495,
					22148,
					22149,
					22150,
					22151,
					22152,
					22153,
					12053,
					22154,
					22155,
					10249
				]
			},
			{
				"speed": 25,
				"name": "Monacella Court",
				"nodes": [
					10362,
					22156,
					22157
				]
			},
			{
				"speed": 25,
				"name": "Miletus Drive",
				"nodes": [
					8382,
					22158,
					22159,
					22160,
					22161,
					22162,
					10626
				]
			},
			{
				"speed": 25,
				"name": "Grenoble Lane",
				"nodes": [
					12779,
					22163,
					22164,
					22165,
					22166,
					22167,
					22168,
					22169,
					11956
				]
			},
			{
				"speed": 25,
				"name": "Saint Malachy Lane",
				"nodes": [
					13083,
					22170,
					22171,
					12284,
					22172,
					5956
				]
			},
			{
				"speed": 25,
				"name": "Steed Drive",
				"nodes": [
					22173,
					495,
					22174,
					22175,
					22176,
					22177,
					22178,
					22179,
					10695,
					22180,
					22181,
					22182,
					22183,
					22184,
					6398,
					22185,
					22186,
					4958
				]
			},
			{
				"speed": 25,
				"name": "Barat Lane",
				"nodes": [
					22166,
					22187,
					22188,
					22189,
					22190,
					12489
				]
			},
			{
				"speed": 25,
				"name": "Amblewood Court",
				"nodes": [
					22191,
					12049,
					22192,
					22193,
					22194,
					22195,
					22196,
					22197,
					22198,
					22199,
					22200,
					22201,
					22202,
					22203,
					22204,
					22205,
					22206,
					22191
				]
			},
			{
				"speed": 25,
				"name": "Tarentum Drive",
				"nodes": [
					22160,
					22207,
					22208,
					22209,
					22210,
					22211,
					22212,
					22213,
					22214,
					22215,
					22216,
					13054,
					22217,
					22218,
					22219,
					8380
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					7075,
					22220,
					22221,
					22222,
					22223,
					22224,
					22225,
					22226,
					22227,
					22228,
					22229,
					22230,
					7077
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22231,
					22232,
					22233,
					22234,
					22235,
					22236,
					22237,
					12654,
					22238,
					22239,
					22240,
					22241,
					22242,
					22243,
					22244,
					22245,
					22246,
					22231
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					7081,
					22247,
					22248,
					22249,
					22250,
					22251,
					22252,
					22253,
					22254,
					22255,
					22256,
					7082
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					9297,
					22257
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22258,
					9298
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22259,
					11713
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					9296,
					22260
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22261,
					22262,
					22263
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					9294,
					22264,
					22265
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22266,
					22267,
					22268,
					22269,
					8400
				]
			},
			{
				"speed": 25,
				"name": "Browning Drive",
				"nodes": [
					8389,
					22270,
					22271,
					22272,
					22273,
					22274,
					22275,
					22276,
					10595
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					7079,
					22277,
					22278,
					22279,
					22280,
					22281,
					22282,
					22248
				]
			},
			{
				"speed": 25,
				"name": "Bellm Lane",
				"nodes": [
					5095,
					22283,
					22284,
					22285,
					22286,
					12955
				]
			},
			{
				"speed": 30,
				"name": "West Saint Anthony Lane",
				"nodes": [
					22287,
					22288,
					6758,
					22289,
					22290,
					11553,
					22291,
					22292,
					962,
					22293,
					1104,
					22294,
					22295,
					22296,
					22297,
					13153,
					22298,
					22299,
					3770,
					22300,
					5948
				]
			},
			{
				"speed": 25,
				"name": "Saint Maurice Lane",
				"nodes": [
					22301,
					11548,
					22302,
					22303,
					950,
					22304,
					22305,
					22306,
					22307,
					3350,
					22308,
					22309
				]
			},
			{
				"speed": 25,
				"name": "Manion Park Drive",
				"nodes": [
					516,
					22310,
					22311,
					3128
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22312,
					9618
				]
			},
			{
				"speed": 25,
				"name": "St Virgil Lane",
				"nodes": [
					22313,
					6755,
					22314
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					10665,
					22315
				]
			},
			{
				"speed": 25,
				"name": "Trailoaks Drive",
				"nodes": [
					4044,
					22316,
					22317,
					22318,
					22319,
					22320,
					21613,
					22321,
					22322,
					22323,
					22324,
					22325,
					22326,
					21879,
					22327,
					22328,
					3841,
					21826
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22329,
					22330,
					22331
				]
			},
			{
				"speed": 25,
				"name": "Gahan Drive",
				"nodes": [
					5930,
					22332,
					22309,
					22333,
					12612
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22334,
					22335,
					11361
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22336,
					22337,
					22338,
					9625
				]
			},
			{
				"speed": 25,
				"name": "Alderwood Drive",
				"nodes": [
					4617,
					7166,
					22339,
					22340,
					22341,
					22342,
					22343,
					22344,
					22345,
					22346,
					22347,
					22348,
					22349
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					9628,
					22350,
					22351,
					22352
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22353,
					22354,
					22355,
					22356,
					4365
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22357,
					22358,
					22359,
					22360,
					22361
				]
			},
			{
				"speed": 25,
				"name": "Whitecliff Court",
				"nodes": [
					22362,
					22363,
					22364,
					22365,
					22366,
					22367,
					22368,
					22362,
					22369,
					22370,
					22371,
					22372,
					5019
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22351,
					22373,
					22374,
					22375,
					22376,
					9631
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1632,
					22377,
					22378,
					22379,
					22380,
					1638
				]
			},
			{
				"speed": 25,
				"name": "Shepherd Drive",
				"nodes": [
					1452,
					22381,
					22382,
					22383,
					22384,
					22385,
					22386,
					22387,
					22388,
					22389,
					22390,
					8387
				]
			},
			{
				"speed": 25,
				"name": "St Brendan Lane",
				"nodes": [
					22391,
					22292,
					22392,
					22393,
					11557,
					22394,
					22395,
					22313
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					4366,
					22361,
					22396,
					22397,
					22398,
					11361
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1623,
					22399,
					22400,
					22401,
					22402,
					22403,
					1626
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					9624,
					22404,
					22405,
					22406,
					22407,
					22408,
					9626
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					9636,
					22409,
					22410,
					22411,
					22412,
					22413,
					22414,
					9632
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22415,
					22416,
					22417,
					22418,
					9630
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22419,
					22420,
					22421,
					22422,
					22423,
					22424,
					22425,
					22426,
					1624
				]
			},
			{
				"speed": 25,
				"name": "Calumet Lane",
				"nodes": [
					7532,
					22427,
					22428,
					22429
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22430,
					22431,
					22432,
					22433,
					22434,
					22435,
					22419,
					22436,
					1626
				]
			},
			{
				"speed": 25,
				"name": "Preakness Lane",
				"nodes": [
					3666,
					22437,
					22438,
					11662,
					22439,
					22440,
					22441,
					22442,
					7538,
					22443,
					12020
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22444,
					22445,
					22446,
					22447,
					22448
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22449,
					22450,
					22444,
					22451,
					22452,
					22453,
					22454,
					22455
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22456,
					22457,
					22458,
					22459,
					9299
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22460,
					22461,
					22462,
					22463,
					22464,
					22465,
					22466,
					22467,
					22468,
					22469
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					9075,
					22460,
					22470,
					22471,
					22472,
					22473,
					22474,
					22475,
					22476,
					22477,
					22478,
					22479
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					13992,
					22480,
					22481,
					22482,
					22483,
					22484,
					22485,
					22486,
					22487,
					22488,
					22489,
					22490,
					22491,
					11721
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22485,
					11723
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22492,
					22493,
					22494,
					22495,
					22496,
					22497,
					22498,
					22499,
					22500,
					22501,
					22502,
					22503,
					22504,
					22505,
					22506,
					22507,
					22508,
					22509,
					22492
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22510,
					22511
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22512,
					22513
				]
			},
			{
				"speed": 25,
				"name": "Saddle Drive",
				"nodes": [
					22176,
					22514,
					22515,
					22516,
					22517,
					3606,
					22518,
					22519,
					22520,
					22521,
					22522,
					22523,
					8803
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					20193,
					22524,
					22525,
					22526,
					22527
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					11728,
					22528,
					22529,
					22530,
					22531
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					13991,
					22532,
					22533,
					22534,
					22535
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22536,
					22537,
					22538,
					22539,
					22540,
					1385
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					11724,
					22541,
					22542,
					22543,
					22544,
					22545,
					22546,
					22483
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22480,
					22547,
					22548,
					22549,
					22550,
					22551,
					22552,
					22553,
					11726
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1384,
					22554,
					22555,
					22556,
					22557,
					22558,
					22559,
					22560,
					22561,
					22562,
					22563,
					22564,
					22565,
					22566,
					22567,
					22568,
					22569,
					22536,
					22570,
					22571,
					22572,
					22573,
					22574,
					22575,
					22576,
					22577,
					22578,
					22579,
					22580,
					22581,
					22582,
					22583,
					22584,
					22585,
					22586,
					22587,
					22588,
					22589,
					22590,
					22591,
					22592,
					22593,
					22594,
					22595,
					22596,
					22597,
					22598,
					22599,
					22600,
					22601,
					22493
				]
			},
			{
				"speed": 25,
				"name": "Trees Edge Lane",
				"nodes": [
					22602,
					22603,
					21754,
					22604,
					22605,
					22606,
					21888,
					22607,
					22608,
					5838,
					22609,
					22610,
					22611,
					22612,
					22613,
					12557,
					22614,
					22615,
					22616,
					9515,
					22617,
					22618,
					22619,
					22620,
					9506,
					22621,
					22622,
					22623,
					22624,
					22625,
					22626,
					22627,
					22628,
					22629
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1636,
					22630,
					22631,
					22632,
					22633,
					22634,
					22635,
					22636,
					22637,
					22638,
					22639,
					22640,
					22641,
					22632
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22642,
					22643,
					22644,
					22645,
					9622
				]
			},
			{
				"speed": 25,
				"name": "Lowery Estates Court",
				"nodes": [
					22646,
					22647,
					22648,
					22649,
					22650,
					22651,
					22652,
					22653,
					22654
				]
			},
			{
				"speed": 25,
				"name": "Fieldstone Drive",
				"nodes": [
					5019,
					22655,
					22656,
					22657,
					10403,
					22658,
					22659,
					22660,
					22661,
					22662,
					22663,
					22664,
					22665,
					22666,
					22276
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22667,
					22668,
					22669,
					22670,
					22671,
					22672,
					22673,
					22674,
					22675,
					22676,
					22677,
					22678,
					22679
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22680,
					22681,
					22682,
					22683,
					22448,
					22684,
					22685,
					22686,
					22687,
					22688,
					22689,
					22690,
					22691,
					22692,
					22693,
					22694,
					22679,
					22695,
					22696,
					22697,
					22698,
					22699,
					22700,
					22701,
					22702,
					22703,
					22704,
					22705,
					22706,
					22707,
					22708,
					22709,
					22710,
					22667,
					22711,
					22712,
					22713,
					22714,
					22715,
					22716,
					22717,
					22718,
					22719,
					22449,
					22680,
					5559
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					9086,
					22720,
					22721,
					22722,
					22723,
					22724,
					22725,
					22726,
					12308
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					10662,
					22727,
					22728,
					22729,
					22730,
					22731,
					22732,
					22733,
					22734,
					22735,
					22736,
					22737,
					22738,
					22739,
					22740,
					22315,
					22741,
					22742,
					22743,
					22744,
					22745,
					22746,
					22747,
					22748,
					22749,
					22750,
					22751,
					22752,
					22753,
					22754,
					22755,
					22756,
					22757,
					22758,
					22759,
					22760,
					10661
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22750,
					22761,
					22762,
					22763,
					22764,
					10667
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22765,
					22766,
					4369
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22767,
					22768,
					22769,
					22770,
					22771,
					22772,
					22767,
					22773,
					22774,
					22775,
					11714,
					22776,
					22777,
					22778,
					22779,
					22780
				]
			},
			{
				"speed": 25,
				"name": "Harness Drive",
				"nodes": [
					22781,
					22782,
					22783,
					22784,
					22785,
					22786,
					22787,
					6392,
					22788,
					22789,
					22790,
					22516
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22791,
					22792,
					22793,
					22430,
					22794,
					1629
				]
			},
			{
				"speed": 25,
				"name": "Suffolk Place",
				"nodes": [
					22429,
					22795,
					22796,
					22441
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22417,
					22797
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					62,
					22798,
					22262
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					11720,
					22799,
					22800,
					22801,
					22802,
					22803,
					22804,
					22805,
					22806,
					22807,
					22808,
					22809,
					22810,
					22811,
					11719,
					22812,
					22813,
					22814,
					22815,
					22816,
					22817,
					22818,
					22819,
					22820,
					22821,
					22822,
					22823,
					22824,
					22825,
					22826,
					22827,
					11720
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					11722,
					22828,
					22829,
					22830,
					22831,
					22832,
					22512,
					22510,
					22833,
					22531,
					22834,
					22835,
					22836
				]
			},
			{
				"speed": 25,
				"name": "Paddock Point Drive",
				"nodes": [
					8552,
					22837,
					22838,
					22839,
					22840,
					22841,
					22842,
					22843,
					22844,
					22845,
					8554
				]
			},
			{
				"speed": 25,
				"name": "Royal Oak Drive",
				"nodes": [
					11974,
					22846,
					22658
				]
			},
			{
				"speed": 25,
				"name": "Bobbinray Avenue",
				"nodes": [
					2183,
					5297,
					8153,
					7835,
					4691,
					426,
					12084,
					22847
				]
			},
			{
				"speed": 40,
				"name": "McDonnell Boulevard",
				"nodes": [
					85,
					22848,
					22849,
					2982
				]
			},
			{
				"speed": 25,
				"name": "Ellsinore Drive",
				"nodes": [
					12589,
					22850,
					22851,
					22852,
					22853,
					22854,
					12731
				]
			},
			{
				"speed": 25,
				"name": "Celburne Lane",
				"nodes": [
					22855,
					22856,
					22857,
					22858,
					22859,
					22860,
					22861,
					22862,
					4866
				]
			},
			{
				"speed": 25,
				"name": "Cordin Lane",
				"nodes": [
					515,
					22863,
					22864,
					22855
				]
			},
			{
				"speed": 25,
				"name": "Ellsinore Drive",
				"nodes": [
					515,
					22865,
					22866,
					12589
				]
			},
			{
				"speed": 25,
				"name": "Celburne Lane",
				"nodes": [
					5361,
					12146,
					10044,
					22867,
					22868,
					22869,
					22870,
					10423,
					22871,
					10435,
					10434,
					22872,
					10056,
					12159,
					22873
				]
			},
			{
				"speed": 25,
				"name": "Celburne Lane",
				"nodes": [
					10895,
					22874,
					22855
				]
			},
			{
				"speed": 25,
				"name": "Celburne Lane",
				"nodes": [
					22873,
					22875,
					10895
				]
			},
			{
				"speed": 25,
				"name": "Woodford Way Drive",
				"nodes": [
					22873,
					22876,
					22877,
					22878,
					22879,
					6738
				]
			},
			{
				"speed": 25,
				"name": "Grundy Drive",
				"nodes": [
					4582,
					22880,
					22881,
					22882,
					22883,
					22884,
					22885,
					22886,
					22887,
					22888,
					11335
				]
			},
			{
				"speed": 25,
				"name": "Woodford Way Drive",
				"nodes": [
					6738,
					22889,
					22890,
					2914
				]
			},
			{
				"speed": 25,
				"name": "Woodford Way Drive",
				"nodes": [
					5361,
					4927,
					22891,
					3206,
					22892,
					12913,
					22893,
					22894,
					2094,
					11113,
					22895,
					22896,
					22897,
					22898,
					22899,
					22873
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					22900,
					9013
				]
			},
			{
				"speed": 25,
				"name": "Chartley Drive",
				"nodes": [
					10895,
					22901,
					505,
					242,
					248,
					22902,
					6740,
					22903,
					22904,
					22905,
					11174,
					22906,
					11185
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13654,
					22907,
					22908,
					93,
					22909,
					22910,
					98,
					22911,
					22912,
					22913,
					22914,
					22915,
					22916,
					22917,
					22918,
					22919,
					22920,
					22921,
					33
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					108,
					13821
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					13263,
					22922,
					13946
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13324,
					22923,
					22924,
					20865,
					22925,
					13951
				]
			},
			{
				"speed": 30,
				"name": "Missouri Bottom Road",
				"nodes": [
					14130,
					13643
				]
			},
			{
				"speed": 30,
				"name": "Missouri Bottom Road",
				"nodes": [
					14001,
					22926,
					22927,
					14130
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					13283,
					13434,
					22928,
					22929,
					22930,
					22931,
					22932,
					13459
				]
			},
			{
				"speed": 30,
				"name": "Missouri Bottom Road",
				"nodes": [
					14130,
					22933,
					20867,
					14001
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					22934,
					22935
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					22936,
					22937,
					22938,
					22939,
					22940,
					22941,
					22942,
					13342,
					22943
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					22944,
					13343
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					22943,
					22944
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					22935,
					22936
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					22945,
					22946,
					3886,
					6890,
					22947,
					13580
				]
			},
			{
				"speed": 25,
				"name": "Southwell Lane",
				"nodes": [
					22948,
					13580
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					22945,
					11281,
					1443,
					6235,
					12490,
					22949,
					11494
				]
			},
			{
				"speed": 25,
				"name": "Southwell Lane",
				"nodes": [
					22950,
					22951,
					22952,
					6891,
					22953,
					22954,
					22955,
					22956,
					22957
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					13465,
					22958,
					1056,
					10388,
					13368,
					22959,
					22960,
					22934
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					13580,
					22961,
					6889,
					22962,
					22963,
					22945
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					22964,
					22965,
					22966
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					22967,
					22968,
					22969,
					22970,
					22971
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					22972,
					22973,
					22974,
					22967
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					22975,
					22976,
					22977,
					22964
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					22978,
					22979,
					22980,
					22981,
					22982,
					22975
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13300,
					13324
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					20255,
					22983,
					22984,
					20852,
					22985,
					22986,
					22987,
					22988,
					22989,
					22941
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					128,
					22990
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					115,
					22991,
					22992,
					13300
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					7841,
					22993,
					22994,
					13462
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					22990,
					22995,
					22996,
					7841
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					13370,
					22997,
					20255
				]
			},
			{
				"speed": 25,
				"name": "Meadow Trail",
				"nodes": [
					14133,
					14171,
					9406
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					20903,
					22998,
					22999,
					23000,
					23001,
					202,
					23002,
					941
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					20798,
					23003,
					23004,
					23005,
					207,
					23006,
					20797
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1617,
					23007
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1798,
					23008,
					23009,
					23010,
					23011,
					23012,
					23013,
					23014,
					8605
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					20794,
					23015,
					23016,
					23017,
					317,
					23018,
					20813
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					167,
					23019,
					23020,
					23021,
					14055
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					13525,
					23022,
					23023,
					23024,
					14056
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					14057,
					23025,
					23026,
					23027,
					23028,
					170
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					23029,
					23030,
					23031,
					23032,
					23033,
					23034,
					20905
				]
			},
			{
				"speed": 35,
				"name": "Parker Road",
				"nodes": [
					13869,
					3501,
					6399,
					23035,
					2543,
					23036,
					23037,
					23038,
					23039,
					23040,
					23041,
					23042,
					23043,
					20914,
					23044,
					11971
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					14054,
					23045,
					23046,
					23047,
					23048,
					13522
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13939,
					13937
				]
			},
			{
				"speed": 40,
				"name": "North Lindbergh Boulevard",
				"nodes": [
					13939,
					13202
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					38,
					23049,
					23050,
					23051,
					13939
				]
			},
			{
				"speed": 25,
				"name": "Behlmann Road",
				"nodes": [
					23052,
					6415
				]
			},
			{
				"speed": 25,
				"name": "Brookfield Chase Court",
				"nodes": [
					21139,
					23053,
					23054,
					23055
				]
			},
			{
				"speed": 35,
				"name": "Old Halls Ferry Road",
				"nodes": [
					6001,
					14212
				]
			},
			{
				"speed": 35,
				"name": "Old Halls Ferry Road",
				"nodes": [
					6001,
					3914,
					12613,
					23056,
					23057,
					23058,
					8937,
					13365,
					13755
				]
			},
			{
				"speed": 40,
				"name": "New Halls Ferry Road",
				"nodes": [
					13885,
					23059,
					23060,
					2330,
					23061,
					23062,
					9357,
					3400,
					9693,
					2940,
					23063,
					23064,
					17718,
					23065,
					4650,
					17691,
					21137
				]
			},
			{
				"speed": 30,
				"name": "Missouri Bottom Road",
				"nodes": [
					14037,
					23066
				]
			},
			{
				"speed": 30,
				"name": "Missouri Bottom Road",
				"nodes": [
					23066,
					9704,
					23067,
					23068
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					22966,
					23069
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					23069,
					23070,
					23071,
					23072,
					23073,
					23074,
					23075,
					23076,
					23077,
					23078,
					23079,
					23080,
					23081,
					23082,
					23083,
					13218
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					16,
					23084
				]
			},
			{
				"speed": 60,
				"name": "?",
				"nodes": [
					23084,
					23085,
					23086,
					22972
				]
			},
			{
				"speed": 35,
				"name": "Aubuchon Road",
				"nodes": [
					23087,
					23088
				]
			},
			{
				"speed": 25,
				"name": "Gist Road",
				"nodes": [
					13721,
					23089
				]
			},
			{
				"speed": 30,
				"name": "Taussig Avenue",
				"nodes": [
					23090,
					23091
				]
			},
			{
				"speed": 35,
				"name": "Aubuchon Road",
				"nodes": [
					23088,
					23092,
					23093,
					23094,
					23095,
					23096,
					23097,
					23098,
					23099,
					23100,
					23101,
					13548
				]
			},
			{
				"speed": 30,
				"name": "Taussig Avenue",
				"nodes": [
					23091,
					23102
				]
			},
			{
				"speed": 25,
				"name": "Gist Road",
				"nodes": [
					23089,
					23103,
					23104,
					23105
				]
			},
			{
				"speed": 25,
				"name": "Grandview Drive",
				"nodes": [
					23106,
					1931,
					23107,
					20808
				]
			},
			{
				"speed": 40,
				"name": "Howdershell Road",
				"nodes": [
					2986,
					23108,
					23109,
					23110,
					23111,
					23112,
					23052,
					7849,
					23113,
					23114,
					23115,
					6863,
					23116,
					4972,
					23117,
					20582,
					10701,
					20312,
					23118,
					23119,
					902,
					23120,
					23121,
					2681
				]
			},
			{
				"speed": 25,
				"name": "Arpent Court",
				"nodes": [
					9318,
					23122,
					15418
				]
			},
			{
				"speed": 25,
				"name": "Bramble Lane",
				"nodes": [
					11834,
					23123,
					23124,
					23125,
					23126,
					23127,
					23128,
					23129,
					23130,
					23131,
					23132,
					23133,
					23134,
					23135,
					23136,
					23137,
					11834
				]
			},
			{
				"speed": 25,
				"name": "Buttercup Court",
				"nodes": [
					699,
					23138,
					23139,
					23140,
					23141,
					23142,
					23143,
					23144,
					23145,
					23146,
					23147,
					23148,
					23149,
					23150,
					23151,
					23152,
					699
				]
			},
			{
				"speed": 25,
				"name": "Edinburg Court",
				"nodes": [
					2813,
					23153,
					23154,
					23155,
					23156,
					23157,
					23158,
					23159,
					23160,
					23161,
					23162,
					23163,
					23164,
					23165,
					23166,
					23167,
					2813
				]
			},
			{
				"speed": 25,
				"name": "Indiancup Drive",
				"nodes": [
					7824,
					23168
				]
			},
			{
				"speed": 25,
				"name": "Gravelle Lane",
				"nodes": [
					6151,
					2902,
					23169,
					23170,
					23171,
					2426,
					23172,
					23173,
					23174,
					23175,
					23176,
					23177,
					12899
				]
			},
			{
				"speed": 25,
				"name": "Morning Mist Court",
				"nodes": [
					12767,
					23178,
					23179,
					23180,
					23181,
					23182,
					23183,
					23184,
					23185,
					23186,
					23187,
					23188,
					23189,
					23190,
					23191,
					23192,
					12767
				]
			},
			{
				"speed": 25,
				"name": "Strawberry Fields Court",
				"nodes": [
					23193,
					23194,
					23195,
					23196,
					23197,
					23198,
					23199,
					23200,
					6669,
					23201,
					23202,
					23203,
					23204,
					23205,
					23206,
					23207,
					23193
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					23208,
					23209,
					23210,
					23211,
					17129,
					23212,
					23213,
					23214,
					16994,
					23215,
					17556,
					23216,
					23217,
					23218,
					23219,
					23220,
					23208
				]
			},
			{
				"speed": 25,
				"name": "93rd Avenue",
				"nodes": [
					23221,
					23222,
					23223,
					23224,
					23225,
					23226,
					23227,
					23228,
					6000,
					23229,
					23230,
					23231,
					23232,
					23233,
					23234,
					23235,
					23221
				]
			},
			{
				"speed": 25,
				"name": "95th Avenue",
				"nodes": [
					15190,
					23236,
					23237,
					23238,
					23239,
					23240,
					23241,
					23242,
					23243,
					23244,
					23245,
					23246,
					23247,
					23248,
					23249,
					23250,
					15190
				]
			},
			{
				"speed": 25,
				"name": "90th Avenue",
				"nodes": [
					2458,
					23251,
					23252,
					23253,
					23254,
					23255,
					23256,
					23257,
					23258,
					3733,
					23259,
					23260,
					23261,
					23262,
					23263,
					23264,
					15229
				]
			},
			{
				"speed": 25,
				"name": "Birkemeier Court",
				"nodes": [
					23265,
					23266,
					23267,
					23268,
					23269,
					23270,
					23271,
					23272,
					4741,
					23273,
					23274,
					23275,
					23276,
					23277,
					23278,
					23279,
					23265
				]
			},
			{
				"speed": 25,
				"name": "Centorbi Court",
				"nodes": [
					23280,
					23281,
					23282,
					23283,
					23284,
					23285,
					23286,
					23287,
					10108,
					23288,
					23289,
					23290,
					23291,
					23292,
					23293,
					23294,
					23280
				]
			},
			{
				"speed": 25,
				"name": "Avenue de Paris Drive",
				"nodes": [
					1688,
					23295,
					23296,
					15565,
					23297,
					23298,
					23299,
					23300,
					23301,
					23302,
					23303,
					23304,
					23305,
					23306,
					15330,
					23307,
					15104,
					23308,
					23309,
					23310,
					23311,
					23312,
					18378
				]
			},
			{
				"speed": 25,
				"name": "Hartack Court",
				"nodes": [
					23313,
					23314,
					23315,
					23316,
					23317,
					23318,
					23319,
					23320,
					8880,
					23321,
					23322,
					23323,
					23324,
					23325,
					23326,
					23327,
					23313
				]
			},
			{
				"speed": 25,
				"name": "Joyful Court",
				"nodes": [
					6958,
					23328,
					23329,
					23330,
					23331,
					23332,
					23333,
					23334,
					23335,
					23336,
					23337,
					23338,
					23339,
					23340,
					23341,
					23342,
					6958
				]
			},
			{
				"speed": 25,
				"name": "Piety Circle",
				"nodes": [
					23343,
					23344,
					23345,
					23346,
					23347,
					23348,
					23349,
					23350,
					12778,
					23351,
					23352,
					23353,
					23354,
					23355,
					23356,
					23357,
					23343
				]
			},
			{
				"speed": 25,
				"name": "Piety Court",
				"nodes": [
					1429,
					23358,
					23359,
					23360,
					23361,
					23362,
					23363,
					23364,
					23365,
					23366,
					23367,
					23368,
					23369,
					23370,
					23371,
					23372,
					1429
				]
			},
			{
				"speed": 25,
				"name": "Lancaster Court",
				"nodes": [
					23373,
					23374,
					23375,
					23376,
					23377,
					23378,
					23379,
					23380,
					9309,
					23381,
					23382,
					23383,
					23384,
					23385,
					23386,
					23387,
					23373
				]
			},
			{
				"speed": 25,
				"name": "Rouvre Drive",
				"nodes": [
					13098,
					23388,
					23389,
					23390,
					23391,
					23392,
					23393,
					23394,
					23395,
					23396,
					23397,
					23398,
					23399,
					23400,
					23401,
					23402,
					13098
				]
			},
			{
				"speed": 25,
				"name": "Rue Pardisse Lane",
				"nodes": [
					7376,
					23403,
					23303,
					23404,
					23405,
					23406,
					15086
				]
			},
			{
				"speed": 25,
				"name": "Triple Crown Drive",
				"nodes": [
					23407,
					23408,
					23409,
					23410,
					23411,
					23412,
					23413,
					23414,
					14839,
					23415,
					23416,
					23417,
					23418,
					23419,
					23420,
					23421,
					23407
				]
			},
			{
				"speed": 25,
				"name": "Understanding Court",
				"nodes": [
					12361,
					23422,
					6020
				]
			},
			{
				"speed": 25,
				"name": "Vago Lane",
				"nodes": [
					23423,
					23424,
					23425,
					23426,
					23427,
					23428,
					23429,
					23430,
					23431,
					23432,
					23433,
					23434,
					23435,
					23436,
					23437,
					23438,
					23423
				]
			},
			{
				"speed": 25,
				"name": "90th Avenue",
				"nodes": [
					15548,
					23439,
					23440,
					23441,
					23442,
					23443,
					23444,
					23445,
					23446,
					23447,
					23448,
					23449,
					23450,
					23451,
					23452,
					23453,
					15548
				]
			},
			{
				"speed": 25,
				"name": "Vission Court",
				"nodes": [
					23454,
					23455,
					23456,
					23457,
					23458,
					23459,
					23460,
					23461,
					4228,
					23462,
					23463,
					23464,
					23465,
					23466,
					23467,
					23468,
					23454
				]
			},
			{
				"speed": 25,
				"name": "92nd Avenue",
				"nodes": [
					11478,
					23469,
					23470,
					23471,
					23472,
					23473,
					23474,
					23475,
					23476,
					23477,
					23478,
					23479,
					23480,
					23481,
					11476
				]
			},
			{
				"speed": 25,
				"name": "Adriot Court",
				"nodes": [
					23482,
					23483,
					23484,
					23485,
					23486,
					23487,
					23488,
					23489,
					1752,
					23490,
					23491,
					23492,
					23493,
					23494,
					23495,
					23496,
					23482
				]
			},
			{
				"speed": 25,
				"name": "Airelle Court",
				"nodes": [
					9869,
					15286,
					23497,
					23498
				]
			},
			{
				"speed": 25,
				"name": "Argonne Forest Drive",
				"nodes": [
					23499,
					18509
				]
			},
			{
				"speed": 25,
				"name": "Argonne Forest Drive",
				"nodes": [
					23500,
					23501,
					16221
				]
			},
			{
				"speed": 25,
				"name": "Domenique Lane",
				"nodes": [
					23502,
					23503,
					23504,
					23505,
					23506,
					23507,
					23508,
					23509,
					23510,
					23511,
					23512,
					23513,
					23514,
					23515,
					23516,
					23517,
					23502
				]
			},
			{
				"speed": 25,
				"name": "Domenique Lane",
				"nodes": [
					9108,
					23518,
					23519,
					23520,
					15097,
					23521,
					23522,
					23502
				]
			},
			{
				"speed": 25,
				"name": "97th Avenue",
				"nodes": [
					23523,
					23524,
					23525,
					23526,
					23527,
					23528,
					23529,
					23530,
					2646,
					23531,
					23532,
					23533,
					23534,
					23535,
					23536,
					23537,
					23523
				]
			},
			{
				"speed": 25,
				"name": "Flandre Cove Court",
				"nodes": [
					23538,
					23539,
					23540,
					23541,
					23542,
					23543,
					23544,
					23545,
					15109,
					23546,
					23547,
					23548,
					23549,
					23550,
					23551,
					23552,
					23538
				]
			},
			{
				"speed": 25,
				"name": "Fortitude Court",
				"nodes": [
					4760,
					23553,
					23554,
					23555,
					23556,
					23557,
					23558,
					23559,
					23560,
					23561,
					23562,
					23563,
					23564,
					23565,
					23566,
					23567,
					4760
				]
			},
			{
				"speed": 25,
				"name": "Fort de France Lane",
				"nodes": [
					15099,
					23568,
					23569,
					23570,
					23571,
					23572,
					23573,
					23574,
					23575,
					23576,
					23577,
					23578,
					23579,
					23580,
					23581,
					23582,
					15099
				]
			},
			{
				"speed": 25,
				"name": "Halter Court",
				"nodes": [
					12187,
					23583,
					23584,
					23585,
					23586,
					23587,
					23588,
					23589,
					23590,
					23591,
					23592,
					23593,
					23594,
					23595,
					23596,
					23597,
					12187
				]
			},
			{
				"speed": 25,
				"name": "Faon Court",
				"nodes": [
					15146,
					23598,
					23599,
					23600,
					23601,
					23602,
					23603,
					23604,
					23605,
					23606,
					23607,
					23608,
					23609,
					23610,
					23611,
					23612,
					15146
				]
			},
			{
				"speed": 25,
				"name": "Knowledge Court",
				"nodes": [
					12394,
					23613,
					23614,
					23615,
					23616,
					23617,
					23618,
					23619,
					23620,
					23621,
					23622,
					23623,
					23624,
					23625,
					23626,
					23627,
					12394
				]
			},
			{
				"speed": 25,
				"name": "Les Cherbourg Court",
				"nodes": [
					23628,
					23629,
					23630,
					23631,
					23632,
					23633,
					23634,
					23635,
					12017,
					23636,
					23637,
					23638,
					23639,
					23640,
					23641,
					23642,
					23628
				]
			},
			{
				"speed": 25,
				"name": "Les Cherbourg Lane",
				"nodes": [
					23643,
					23644,
					23645,
					23646,
					23647,
					23648,
					23649,
					23650,
					23651,
					23652,
					23653,
					23654,
					23655,
					23656,
					23657,
					23658,
					23643
				]
			},
			{
				"speed": 25,
				"name": "Les Cherbourg Lane",
				"nodes": [
					6104,
					23643
				]
			},
			{
				"speed": 25,
				"name": "Les Cherbourg Lane",
				"nodes": [
					23659,
					23660,
					23661,
					23662,
					23663,
					23664,
					23665,
					23666,
					6122,
					23667,
					23668,
					23669,
					23670,
					23671,
					23672,
					23673,
					23659
				]
			},
			{
				"speed": 25,
				"name": "Lighthouse Drive",
				"nodes": [
					23674,
					23675,
					23676,
					23677,
					23678,
					23679,
					23680,
					23681,
					16132,
					23682,
					23683,
					23684,
					23685,
					23686,
					23687,
					23688,
					23674
				]
			},
			{
				"speed": 25,
				"name": "Mildness Court",
				"nodes": [
					6899,
					23689,
					23690,
					23691,
					23692,
					23693,
					23694,
					23695,
					23696,
					23697,
					23698,
					23699,
					23700,
					23701,
					23702,
					23703,
					6899
				]
			},
			{
				"speed": 25,
				"name": "Ocean Side Drive",
				"nodes": [
					23704,
					23705,
					23706,
					23707,
					23708,
					23709,
					23710,
					23711,
					16366,
					23712,
					23713,
					23714,
					23715,
					23716,
					23717,
					23718,
					23704
				]
			},
			{
				"speed": 25,
				"name": "Farnham Court",
				"nodes": [
					12131,
					23719,
					23720,
					23721,
					23722,
					23723,
					23724,
					23725,
					23726,
					23727,
					23728,
					23729,
					23730,
					23731,
					23732,
					23733,
					12131
				]
			},
			{
				"speed": 25,
				"name": "Ocean View Court",
				"nodes": [
					23734,
					23735,
					23736,
					23737,
					23738,
					23739,
					23740,
					23741,
					23742,
					23743,
					23744,
					23745,
					23746,
					23747,
					23748,
					23749,
					23734
				]
			},
			{
				"speed": 25,
				"name": "Piety Circle",
				"nodes": [
					12775,
					23750,
					23751,
					23752,
					23753,
					23754,
					23755,
					23756,
					23757,
					23758,
					23759,
					23760,
					12772
				]
			},
			{
				"speed": 25,
				"name": "Portique Court",
				"nodes": [
					8450,
					23761,
					23762,
					23763,
					23764,
					23765,
					23766,
					23767,
					23768,
					23769,
					23770,
					23771,
					23772,
					23773,
					23774,
					23775,
					8450
				]
			},
			{
				"speed": 25,
				"name": "Quiet Cove Court",
				"nodes": [
					1353,
					3998
				]
			},
			{
				"speed": 25,
				"name": "River Oaks Court",
				"nodes": [
					23776,
					23777,
					23778,
					23779,
					23780,
					23781,
					23782,
					23783,
					23784,
					23785,
					23786,
					23787,
					23788,
					23789,
					23790,
					23791,
					23776
				]
			},
			{
				"speed": 25,
				"name": "Riviere Marne Court",
				"nodes": [
					2770,
					23792,
					23793,
					23794,
					23795,
					23796,
					23797,
					23798,
					23799,
					23800,
					23801,
					23802,
					23803,
					23804,
					23805,
					23806,
					2770
				]
			},
			{
				"speed": 25,
				"name": "Riverfront Court",
				"nodes": [
					4102,
					23807,
					16274
				]
			},
			{
				"speed": 25,
				"name": "Saille Court",
				"nodes": [
					23808,
					23809,
					23810,
					23811,
					23812,
					23813,
					23814,
					23815,
					10985,
					23816,
					23817,
					23818,
					23819,
					23820,
					23821,
					23822,
					23808
				]
			},
			{
				"speed": 25,
				"name": "Understanding Court",
				"nodes": [
					23823,
					23824,
					23825,
					23826,
					23827,
					23828,
					23829,
					23830,
					15072,
					23831,
					23832,
					23833,
					23834,
					23835,
					23836,
					23837,
					23823
				]
			},
			{
				"speed": 25,
				"name": "Lavin Court",
				"nodes": [
					23838,
					23839,
					23840,
					23841,
					23842,
					23843,
					23844,
					23845,
					12964,
					23846,
					23847,
					23848,
					23849,
					23850,
					23851,
					23852,
					23838
				]
			},
			{
				"speed": 25,
				"name": "Wellington Drive",
				"nodes": [
					21036,
					23853
				]
			},
			{
				"speed": 25,
				"name": "Goodness Court",
				"nodes": [
					11319,
					23854,
					23855,
					23856,
					23857,
					23858,
					23859,
					23860,
					23861,
					23862,
					23863,
					23864,
					23865,
					23866,
					23867,
					23868,
					11319
				]
			},
			{
				"speed": 25,
				"name": "Advance Drive",
				"nodes": [
					870,
					23869
				]
			},
			{
				"speed": 25,
				"name": "Espace Court",
				"nodes": [
					7348,
					23870,
					23871,
					23872,
					23873,
					23874,
					23875,
					23876,
					23877,
					23878,
					23879,
					23880,
					23881,
					23882,
					23883,
					23884,
					7348
				]
			},
			{
				"speed": 25,
				"name": "Vago Lane",
				"nodes": [
					5127,
					23885,
					23886,
					23887,
					23888,
					23889,
					23890,
					23891,
					15340,
					23892,
					23893,
					23894,
					23895,
					23896,
					5483,
					23897,
					15571,
					23898,
					23899,
					23900,
					23901,
					23902,
					23903,
					23904,
					23905,
					23431
				]
			},
			{
				"speed": 25,
				"name": "Aristocrat Drive",
				"nodes": [
					12944,
					23906
				]
			},
			{
				"speed": 25,
				"name": "Blue Jay Way Court",
				"nodes": [
					23907,
					23908,
					23909,
					23910,
					23911,
					23912,
					23913,
					23914,
					2424,
					23915,
					23916,
					23917,
					23918,
					23919,
					23920,
					23921,
					23907
				]
			},
			{
				"speed": 25,
				"name": "Rue de Renard",
				"nodes": [
					4940,
					23922,
					23923,
					23924,
					23925,
					23926,
					8447
				]
			},
			{
				"speed": 25,
				"name": "Argonne Forest Drive",
				"nodes": [
					23927,
					23928,
					16208,
					23929,
					23500,
					23930,
					23931,
					23932,
					23933,
					16312,
					23934,
					23935,
					23936,
					23937,
					23938,
					23499,
					23927
				]
			},
			{
				"speed": 25,
				"name": "Charleston Estates Drive",
				"nodes": [
					23939,
					23940,
					23941,
					23942,
					23943,
					23944,
					23945,
					23946,
					23947,
					23948,
					23949,
					9404
				]
			},
			{
				"speed": 25,
				"name": "Colbert Court",
				"nodes": [
					7975,
					1527
				]
			},
			{
				"speed": 25,
				"name": "Chateau Du Mont Drive",
				"nodes": [
					14189,
					23950,
					23951,
					23952,
					14135
				]
			},
			{
				"speed": 25,
				"name": "Seagull Court",
				"nodes": [
					23953,
					23954,
					23955,
					23956,
					23957,
					23958,
					23959,
					23960,
					23961,
					23962,
					23963,
					23964,
					23965,
					23966,
					23967,
					23968,
					23953
				]
			},
			{
				"speed": 25,
				"name": "Airelle Court",
				"nodes": [
					23498,
					23969,
					23970,
					23971,
					23972,
					23973,
					23974,
					23975,
					23976,
					23977,
					23978,
					23979,
					23980,
					23981,
					23982,
					23983,
					23498
				]
			},
			{
				"speed": 25,
				"name": "Seagull Court",
				"nodes": [
					4308,
					16109,
					23953
				]
			},
			{
				"speed": 25,
				"name": "Corn Silk Court",
				"nodes": [
					4770,
					23984,
					23985,
					23986,
					23987,
					23988,
					23989,
					23990,
					23991,
					23992,
					23993,
					23994,
					23995,
					23996,
					23997,
					23998,
					4770
				]
			},
			{
				"speed": 25,
				"name": "Jost Villa Drive",
				"nodes": [
					23999,
					24000,
					24001,
					24002,
					24003,
					24004,
					24005,
					24006,
					15521,
					24007,
					24008,
					24009,
					24010,
					24011,
					24012,
					24013,
					23999
				]
			},
			{
				"speed": 25,
				"name": "Dolfield Drive",
				"nodes": [
					24014,
					24015,
					24016,
					24017,
					24018,
					24019,
					24020,
					24021,
					15897,
					24022,
					24023,
					24024,
					24025,
					24026,
					24027,
					24028,
					24014
				]
			},
			{
				"speed": 25,
				"name": "Elksforth Court",
				"nodes": [
					4636,
					24029,
					24030,
					24031,
					24032,
					24033,
					24034,
					24035,
					24036,
					24037,
					24038,
					24039,
					24040,
					24041,
					24042,
					24043,
					4636
				]
			},
			{
				"speed": 25,
				"name": "Ocean View Court",
				"nodes": [
					6277,
					16165,
					24044,
					24045,
					24046,
					24047,
					24048,
					23734
				]
			},
			{
				"speed": 25,
				"name": "Candlewyck Green Ct",
				"nodes": [
					16938,
					24049,
					24050,
					24051,
					24052,
					24053,
					24054,
					24055,
					24056,
					24057,
					16983,
					24058,
					24059,
					24060,
					24061,
					24062,
					16966
				]
			},
			{
				"speed": 25,
				"name": "Justice Court",
				"nodes": [
					4328,
					24063,
					24064,
					24065,
					24066,
					24067,
					24068,
					24069,
					24070,
					24071,
					24072,
					24073,
					24074,
					24075,
					24076,
					24077,
					4328
				]
			},
			{
				"speed": 25,
				"name": "Keeneland Road",
				"nodes": [
					14863,
					24078,
					24079,
					24080,
					24081,
					24082,
					24083,
					24084,
					14739,
					24085,
					24086,
					24087,
					24088,
					15270
				]
			},
			{
				"speed": 25,
				"name": "Liberty Gardens Drive",
				"nodes": [
					24089,
					24090,
					24091,
					24092,
					24093,
					24094,
					24095,
					24096,
					15943,
					24097,
					24098,
					24099,
					24100,
					24101,
					24102,
					24103,
					24089
				]
			},
			{
				"speed": 25,
				"name": "Liberty Gardens Court",
				"nodes": [
					24104,
					24105,
					24106,
					24107,
					24108,
					24109,
					24110,
					24111,
					6268,
					24112,
					24113,
					24114,
					24115,
					24116,
					24117,
					24118,
					24104
				]
			},
			{
				"speed": 25,
				"name": "Gulfport Court",
				"nodes": [
					24119,
					24120,
					24121,
					24122,
					24123,
					24124,
					24125,
					24126,
					7480,
					24127,
					24128,
					24129,
					24130,
					24131,
					24132,
					24133,
					24119
				]
			},
			{
				"speed": 25,
				"name": "Malinda Court",
				"nodes": [
					1922,
					24134,
					24135,
					24136,
					24137,
					24138,
					24139,
					24140,
					24141,
					24142,
					24143,
					24144,
					24145,
					24146,
					24147,
					24148,
					1922
				]
			},
			{
				"speed": 25,
				"name": "Mercy Drive",
				"nodes": [
					24149,
					24150,
					14336,
					24151,
					24152,
					24153,
					24154,
					24155,
					14366,
					24156,
					24157,
					24158,
					24159,
					24160,
					24161,
					24162,
					24149
				]
			},
			{
				"speed": 25,
				"name": "Moon Flower Court",
				"nodes": [
					24163,
					24164,
					24165,
					24166,
					24167,
					24168,
					24169,
					24170,
					1720,
					24171,
					24172,
					24173,
					24174,
					24175,
					24176,
					24177,
					24163
				]
			},
			{
				"speed": 25,
				"name": "North Pointe Lane",
				"nodes": [
					7246,
					24178
				]
			},
			{
				"speed": 25,
				"name": "North Pointe Lane",
				"nodes": [
					7244,
					24179
				]
			},
			{
				"speed": 25,
				"name": "Indiancup Drive",
				"nodes": [
					23168,
					24180,
					24181,
					24182,
					24183,
					24184,
					24185,
					24186,
					24187,
					24188,
					24189,
					24190,
					24191,
					24192,
					24193,
					24194,
					23168
				]
			},
			{
				"speed": 25,
				"name": "Grand National Court",
				"nodes": [
					11647,
					24195,
					24196,
					24197,
					24198,
					24199,
					24200,
					24201,
					24202,
					24203,
					24204,
					24205,
					24206,
					24207,
					24208,
					24209,
					11647
				]
			},
			{
				"speed": 25,
				"name": "Quinnella Court",
				"nodes": [
					4101,
					24210,
					24211,
					24212,
					24213,
					24214,
					24215,
					24216,
					24217,
					24218,
					24219,
					24220,
					24221,
					24222,
					24223,
					24224,
					4101
				]
			},
			{
				"speed": 25,
				"name": "Rexford Creek Court",
				"nodes": [
					24225,
					24226,
					24227,
					24228,
					24229,
					24230,
					24231,
					24232,
					12494,
					24233,
					24234,
					24235,
					24236,
					24237,
					24238,
					24239,
					24225
				]
			},
			{
				"speed": 25,
				"name": "Ransome Court",
				"nodes": [
					7726,
					24240,
					24241,
					24242,
					24243,
					24244,
					24245,
					24246,
					24247,
					24248,
					24249,
					24250,
					24251,
					24252,
					24253,
					24254,
					7726
				]
			},
			{
				"speed": 25,
				"name": "Sand Spur Court",
				"nodes": [
					24255,
					24256,
					24257,
					24258,
					24259,
					24260,
					24261,
					24262,
					12337,
					24263,
					24264,
					24265,
					24266,
					24267,
					24268,
					24269,
					24255
				]
			},
			{
				"speed": 25,
				"name": "Russet Court",
				"nodes": [
					8685,
					24270,
					24271,
					24272,
					24273,
					24274,
					24275,
					24276,
					24277,
					24278,
					24279,
					24280,
					24281,
					24282,
					24283,
					24284,
					8685
				]
			},
			{
				"speed": 25,
				"name": "Sherwood Drive",
				"nodes": [
					24285,
					24286,
					24287,
					24288,
					24289,
					24290,
					24291,
					24292,
					11920,
					24293,
					24294,
					24295,
					24296,
					24297,
					24298,
					24299,
					24285
				]
			},
			{
				"speed": 25,
				"name": "Shorewood Drive",
				"nodes": [
					10783,
					24300,
					24301,
					24302,
					24303,
					24304,
					24305,
					24306,
					24307,
					24308,
					24309,
					24310,
					24311,
					24312,
					24313,
					24314,
					10783
				]
			},
			{
				"speed": 25,
				"name": "Trinity Circle",
				"nodes": [
					24315,
					24316,
					24317,
					24318,
					24319,
					24320,
					24321,
					24322,
					24323,
					24324,
					24325,
					24326,
					24327,
					24328,
					24329,
					24330,
					24315
				]
			},
			{
				"speed": 25,
				"name": "Trinity Circle",
				"nodes": [
					12385,
					24331,
					24332,
					24333,
					24334,
					24335,
					1214,
					24315
				]
			},
			{
				"speed": 25,
				"name": "Valleybrook Drive",
				"nodes": [
					21194,
					24336,
					24337,
					24338,
					24339,
					24340,
					24341,
					24342,
					24343,
					24344,
					24345,
					24346,
					24347,
					24348,
					24349,
					24350,
					21194
				]
			},
			{
				"speed": 25,
				"name": "Ventnor Place",
				"nodes": [
					5396,
					24351
				]
			},
			{
				"speed": 25,
				"name": "Willow Creek Est Drive",
				"nodes": [
					8441,
					24352,
					24353,
					24354,
					24355,
					24356,
					24357,
					24358,
					24359,
					24360,
					8439
				]
			},
			{
				"speed": 25,
				"name": "River Oaks Drive",
				"nodes": [
					17094,
					24361,
					24362,
					24363,
					24364,
					24365,
					24366,
					24367,
					24368,
					24369,
					24370,
					24371,
					24372,
					24373,
					24374,
					24375,
					17094
				]
			},
			{
				"speed": 25,
				"name": "Wind Flower Drive",
				"nodes": [
					14372,
					24376,
					24377,
					24378,
					24379,
					24380,
					24381,
					24382,
					24383,
					24384,
					24385,
					24386,
					14372
				]
			},
			{
				"speed": 25,
				"name": "Wood Poppy Drive",
				"nodes": [
					14399,
					24387,
					24388,
					24389,
					24390,
					24391,
					24392,
					24393,
					24394,
					24395,
					24396,
					24397,
					24398,
					24399,
					24400,
					24401,
					14399
				]
			},
			{
				"speed": 25,
				"name": "Rosant Court",
				"nodes": [
					24402,
					24403,
					24404,
					24405,
					24406,
					24407,
					24408,
					24409,
					9647,
					24410,
					24411,
					24412,
					24413,
					24414,
					24415,
					24416,
					24402
				]
			},
			{
				"speed": 25,
				"name": "Dawnview Court",
				"nodes": [
					2706,
					24417,
					24418,
					24419,
					24420,
					24421,
					24422,
					24423,
					24424,
					24425,
					24426,
					3542
				]
			},
			{
				"speed": 25,
				"name": "Yvette Court",
				"nodes": [
					5378,
					24427,
					24428,
					24429,
					24430,
					24431,
					24432,
					24433,
					24434,
					24435,
					24436,
					24437,
					24438,
					24439,
					24440,
					24441,
					5378
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					24442,
					24443,
					24444,
					24445,
					24446,
					24447,
					24448,
					24449,
					24450,
					24451
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18374,
					24452,
					24453,
					24454,
					24455,
					24456,
					24457,
					24458,
					24459,
					24460
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					24461,
					24462,
					24463,
					24464,
					24465,
					24466,
					24467,
					24468,
					24469,
					24470
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18375,
					24471,
					24472,
					24473,
					24442,
					24474,
					24475,
					24476,
					24477,
					24478
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18514,
					24479,
					24480,
					24481,
					24482,
					24483,
					24484,
					24485,
					24486,
					24487,
					24488
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18313,
					24489,
					24490,
					24491,
					24492,
					24493,
					24494,
					24495,
					24496,
					24497,
					24498,
					24499,
					24500,
					24501,
					24502
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18311,
					24503,
					24504,
					24505,
					24506,
					24507,
					24508,
					24509,
					24510,
					24511,
					24512,
					24513,
					24514,
					24515,
					24516,
					24517,
					24518
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					24472,
					24519,
					24520,
					24521,
					24451,
					24522
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					24523,
					24524,
					24525,
					24526,
					24527,
					24528,
					24529,
					24530,
					24531,
					24532,
					24533,
					24534,
					24470,
					24535,
					24461,
					18378
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					24507,
					24536,
					24537,
					24538,
					24539,
					24540,
					24541
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					18372,
					24542,
					24543,
					24544,
					24545,
					24546,
					24547
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					6491,
					24548,
					24549,
					24550,
					24551,
					24552,
					24553,
					24554,
					6017
				]
			},
			{
				"speed": 25,
				"name": "Clanfield Drive",
				"nodes": [
					24555,
					24556,
					24557,
					24558,
					24559,
					24560,
					24561,
					24562,
					15955,
					24563,
					24564,
					24565,
					24566,
					24567,
					24568,
					24569,
					24555
				]
			},
			{
				"speed": 25,
				"name": "96th Avenue",
				"nodes": [
					24570,
					24571,
					24572,
					24573,
					24574,
					24575,
					24576,
					24577,
					14844,
					24578,
					24579,
					24580,
					24581,
					24582,
					24583,
					24584,
					24570
				]
			},
			{
				"speed": 25,
				"name": "River Oaks Court",
				"nodes": [
					6307,
					23784
				]
			},
			{
				"speed": 25,
				"name": "Monopoly Drive",
				"nodes": [
					24585,
					24586,
					24587,
					24588,
					24589,
					24590,
					24591,
					24592,
					11452,
					24593,
					24594,
					24595,
					24596,
					24597,
					24598,
					24599,
					24585
				]
			},
			{
				"speed": 25,
				"name": "Keeneland Court",
				"nodes": [
					14740,
					24600,
					24601,
					24602,
					24603,
					24604,
					24605,
					24606,
					24607,
					24608,
					24609,
					24610,
					24611,
					24612,
					24613,
					24614,
					14740
				]
			},
			{
				"speed": 25,
				"name": "Willow Creek Est Drive",
				"nodes": [
					8446,
					24615,
					24616,
					24617,
					24618,
					24619,
					24620,
					24621,
					24622,
					24623,
					24624,
					24625,
					24626,
					24627,
					24628,
					24629,
					8446
				]
			},
			{
				"speed": 25,
				"name": "Boardwalk Avenue",
				"nodes": [
					7517,
					11444,
					24630,
					24631,
					24632,
					24633,
					24634,
					24635,
					5388
				]
			},
			{
				"speed": 25,
				"name": "Auburnhill Court",
				"nodes": [
					8817,
					24636,
					24637,
					24638,
					24639,
					24640,
					24641,
					24642,
					24643,
					24644,
					24645,
					24646,
					24647,
					24648,
					24649,
					24650,
					8817
				]
			},
			{
				"speed": 25,
				"name": "Patience Drive",
				"nodes": [
					12188,
					3330,
					24651,
					11386,
					1208,
					24652,
					24653,
					24654,
					24655,
					21127
				]
			},
			{
				"speed": 25,
				"name": "Coldbrook Court",
				"nodes": [
					5674,
					24656,
					24657,
					24658,
					24659,
					24660,
					24661,
					24662,
					24663,
					24664,
					24665,
					24666,
					24667,
					24668,
					24669,
					24670,
					5674
				]
			},
			{
				"speed": 25,
				"name": "Freemantle Court",
				"nodes": [
					3370,
					24671,
					10020
				]
			},
			{
				"speed": 25,
				"name": "Farthing Court",
				"nodes": [
					7745,
					24672,
					24673,
					24674,
					24675,
					24676,
					24677,
					24678,
					24679,
					24680,
					24681,
					24682,
					24683,
					24684,
					24685,
					24686,
					7745
				]
			},
			{
				"speed": 25,
				"name": "Ange Drive",
				"nodes": [
					2081,
					24687,
					24688,
					24689,
					24690,
					24691,
					24692,
					24693,
					24694,
					24695,
					24696,
					24697,
					24698,
					24699,
					24700,
					24701,
					2081
				]
			},
			{
				"speed": 25,
				"name": "Monks Hollow Drive",
				"nodes": [
					24702,
					24703,
					24704,
					24705,
					24706,
					24707,
					24708,
					24709,
					1272,
					24710,
					24711,
					24712,
					24713,
					24714,
					24715,
					24716,
					24702
				]
			},
			{
				"speed": 25,
				"name": "Exacta Court",
				"nodes": [
					24717,
					24718,
					24719,
					24720,
					24721,
					24722,
					24723,
					24724,
					10386,
					24725,
					24726,
					24727,
					24728,
					24729,
					24730,
					24731,
					24717
				]
			},
			{
				"speed": 25,
				"name": "Seascape Court",
				"nodes": [
					4703,
					24732,
					24733,
					24734,
					24735,
					24736,
					24737,
					24738,
					24739,
					24740,
					24741,
					24742,
					24743,
					24744,
					24745,
					24746,
					4703
				]
			},
			{
				"speed": 25,
				"name": "Periwinkle Court",
				"nodes": [
					24747,
					24748,
					24749,
					24750,
					24751,
					24752,
					24753,
					24754,
					634,
					24755,
					24756,
					24757,
					24758,
					24759,
					24760,
					24761,
					24747
				]
			},
			{
				"speed": 25,
				"name": "Stoney End Court",
				"nodes": [
					467,
					24762,
					24763,
					24764,
					24765,
					24766,
					16076
				]
			},
			{
				"speed": 25,
				"name": "Suns Up Way",
				"nodes": [
					2508,
					24767,
					24768
				]
			},
			{
				"speed": 25,
				"name": "Suns Up Way",
				"nodes": [
					24769,
					24767,
					24770,
					24771,
					24772,
					24773,
					24774,
					24768
				]
			},
			{
				"speed": 25,
				"name": "Wharton Court",
				"nodes": [
					1182,
					24775,
					24776,
					24777,
					24778,
					24779,
					24780,
					24781,
					24782,
					24783,
					24784,
					24785,
					24786,
					24787,
					24788,
					24789,
					1182
				]
			},
			{
				"speed": 25,
				"name": "White Ash Court",
				"nodes": [
					24790,
					24791,
					24792,
					24793,
					24794,
					24795,
					24796,
					24797,
					16038,
					24798,
					24799,
					24800,
					24801,
					24802,
					24803,
					24804,
					24790
				]
			},
			{
				"speed": 25,
				"name": "Barrath Place Court",
				"nodes": [
					24805,
					24806,
					24807,
					24808,
					24809,
					24810,
					24811,
					24812,
					778,
					24813,
					24814,
					24815,
					24816,
					24817,
					24818,
					24819,
					24805
				]
			},
			{
				"speed": 25,
				"name": "Beam Place",
				"nodes": [
					1589,
					24820,
					24821,
					24822,
					8761
				]
			},
			{
				"speed": 25,
				"name": "Beam Place",
				"nodes": [
					24823,
					24824,
					24825,
					24826,
					24827,
					24828,
					24829,
					24830,
					19360,
					24831,
					24832,
					24833,
					24834,
					24835,
					24836,
					24837,
					24823
				]
			},
			{
				"speed": 25,
				"name": "Bellarmine Lane",
				"nodes": [
					2266,
					24838,
					24839,
					24840,
					24841,
					24842,
					24843,
					24844,
					24845,
					2267
				]
			},
			{
				"speed": 25,
				"name": "Beaujolais Drive",
				"nodes": [
					6190,
					24846,
					24847,
					24848,
					24849,
					24850,
					18692
				]
			},
			{
				"speed": 25,
				"name": "Benedictine Court",
				"nodes": [
					24851,
					24852,
					24853,
					24854,
					24855,
					24856,
					24857,
					24858,
					18921,
					24859,
					24860,
					24861,
					24862,
					24863,
					24864,
					24865,
					24851
				]
			},
			{
				"speed": 25,
				"name": "Black Earth Court",
				"nodes": [
					12549,
					11681
				]
			},
			{
				"speed": 25,
				"name": "Brittmore Court",
				"nodes": [
					9957,
					4072
				]
			},
			{
				"speed": 25,
				"name": "Catanzaro Court",
				"nodes": [
					24866,
					24867,
					24868,
					24869,
					24870,
					24871,
					24872,
					24873,
					4490,
					24874,
					24875,
					24876,
					24877,
					24878,
					24879,
					24880,
					24866
				]
			},
			{
				"speed": 25,
				"name": "Chateline Drive",
				"nodes": [
					4491,
					24881,
					24882,
					24883,
					24884,
					24885,
					24886,
					24887,
					24888,
					24889,
					24890,
					24891,
					24892,
					24893,
					24894,
					24895,
					4491
				]
			},
			{
				"speed": 25,
				"name": "Chardonway Court",
				"nodes": [
					6595,
					24896,
					24897,
					24898,
					24899,
					24900,
					24901,
					24902,
					24903,
					24904,
					24905,
					24906,
					24907,
					24908,
					24909,
					24910,
					6595
				]
			},
			{
				"speed": 25,
				"name": "Cherokee Trail Lane",
				"nodes": [
					20759,
					24911,
					24912,
					24913,
					24914,
					24915,
					24916,
					24917,
					24918,
					24919,
					24920,
					24921,
					24922,
					24923,
					24924,
					24925,
					20759
				]
			},
			{
				"speed": 25,
				"name": "Battlefield Drive",
				"nodes": [
					11226,
					24926,
					24927,
					24928,
					24929,
					24930,
					24931,
					24932,
					24933,
					24934,
					24935,
					24936,
					16072
				]
			},
			{
				"speed": 25,
				"name": "Chianti Court",
				"nodes": [
					24937,
					24938,
					24939,
					24940,
					24941,
					24942,
					24943,
					24944,
					18747,
					24945,
					24946,
					24947,
					24948,
					24949,
					24950,
					24951,
					24937
				]
			},
			{
				"speed": 25,
				"name": "Chianti Court",
				"nodes": [
					1033,
					24952,
					5023
				]
			},
			{
				"speed": 25,
				"name": "Park New York Drive",
				"nodes": [
					7778,
					24953,
					24954,
					24955,
					24956,
					24957,
					24958,
					10155
				]
			},
			{
				"speed": 25,
				"name": "Christinia Marie Lane",
				"nodes": [
					20184,
					24959,
					24960,
					24961,
					24962,
					24963,
					24964,
					24965,
					24966,
					24967,
					24968,
					24969,
					24970,
					24971,
					24972,
					24973,
					20184
				]
			},
			{
				"speed": 25,
				"name": "Clovermere Court",
				"nodes": [
					12223,
					24974,
					24975,
					24976,
					24977,
					24978,
					24979,
					24980,
					24981,
					24982,
					24983,
					24984,
					24985,
					24986,
					24987,
					24988,
					12223
				]
			},
			{
				"speed": 25,
				"name": "Cobblestone Creek Court",
				"nodes": [
					24989,
					24990,
					24991,
					24992,
					24993,
					24994,
					24995,
					24996,
					10125,
					24997,
					24998,
					24999,
					25000,
					25001,
					25002,
					25003,
					24989
				]
			},
			{
				"speed": 25,
				"name": "Courtyard Place",
				"nodes": [
					25004,
					25005,
					25006,
					25007,
					25008,
					25009,
					25010,
					25011,
					1331,
					25012,
					25013,
					25014,
					25015,
					25016,
					25017,
					25018,
					25004
				]
			},
			{
				"speed": 25,
				"name": "Cynthiana Court",
				"nodes": [
					12653,
					25019,
					25020,
					25021,
					25022,
					25023,
					25024,
					25025,
					25026,
					25027,
					25028,
					25029,
					25030,
					25031,
					25032,
					25033,
					12653
				]
			},
			{
				"speed": 25,
				"name": "Dettmer Place",
				"nodes": [
					25034,
					25035,
					25036,
					25037,
					25038,
					25039,
					25040,
					25041,
					8530,
					25042,
					25043,
					25044,
					25045,
					25046,
					25047,
					25048,
					25034
				]
			},
			{
				"speed": 25,
				"name": "Fernwood Trail Court",
				"nodes": [
					6212,
					25049,
					25050,
					25051,
					25052,
					25053,
					25054,
					25055,
					25056,
					25057,
					25058,
					25059,
					25060,
					25061,
					25062,
					25063,
					6212
				]
			},
			{
				"speed": 25,
				"name": "Fleurie Drive",
				"nodes": [
					9860,
					25064,
					25065,
					25066,
					25067,
					25068,
					18697
				]
			},
			{
				"speed": 25,
				"name": "Flordawn Drive",
				"nodes": [
					25069,
					25070,
					25071,
					25072,
					25073,
					25074,
					25075,
					25076,
					19155,
					25077,
					25078,
					25079,
					25080,
					25081,
					25082,
					25083,
					25069
				]
			},
			{
				"speed": 25,
				"name": "Freeland Drive",
				"nodes": [
					25084,
					25085,
					25086,
					25087,
					25088,
					25089,
					25090,
					25091,
					2254,
					25092,
					25093,
					25094,
					25095,
					25096,
					25097,
					25098,
					25084
				]
			},
			{
				"speed": 25,
				"name": "Lost Hollow Court",
				"nodes": [
					361,
					25099,
					25100,
					25101,
					25102,
					25103,
					25104,
					25105,
					25106,
					25107,
					16031
				]
			},
			{
				"speed": 25,
				"name": "Christus Court",
				"nodes": [
					14944,
					14854
				]
			},
			{
				"speed": 25,
				"name": "Grotto Court",
				"nodes": [
					9492,
					25108,
					25109,
					25110,
					25111,
					25112,
					25113,
					25114,
					25115,
					25116,
					25117,
					25118,
					25119,
					25120,
					25121,
					25122,
					9492
				]
			},
			{
				"speed": 25,
				"name": "Friendship Ct",
				"nodes": [
					18597,
					25123,
					25124,
					9370
				]
			},
			{
				"speed": 25,
				"name": "Hammes Drive",
				"nodes": [
					3942,
					25125
				]
			},
			{
				"speed": 25,
				"name": "Hammes Drive",
				"nodes": [
					3946,
					25126
				]
			},
			{
				"speed": 25,
				"name": "Harbor Oaks Court",
				"nodes": [
					7304,
					25127,
					25128,
					25129,
					25130,
					25131,
					25132,
					25133,
					25134,
					25135,
					25136,
					25137,
					25138,
					25139,
					25140,
					25141,
					7304
				]
			},
			{
				"speed": 25,
				"name": "Mill Valley",
				"nodes": [
					2981,
					25142,
					25143,
					25144,
					25145,
					25146,
					25147,
					25148,
					25149,
					25150,
					25151,
					25152,
					25153,
					25154,
					25155,
					25156,
					2981
				]
			},
			{
				"speed": 25,
				"name": "Hutchinson Wy Place",
				"nodes": [
					25157,
					25158,
					25159,
					25160,
					25161,
					25162,
					25163,
					25164,
					13179,
					25165,
					25166,
					25167,
					25168,
					25169,
					25170,
					25171,
					25157
				]
			},
			{
				"speed": 25,
				"name": "Jost Main Street",
				"nodes": [
					25172,
					25173,
					25174,
					25175,
					25176,
					25177,
					25178,
					25179,
					14992,
					25180,
					25181,
					25182,
					25183,
					25184,
					25185,
					25186,
					25172
				]
			},
			{
				"speed": 25,
				"name": "Lanawood Court",
				"nodes": [
					25187,
					25188,
					25189,
					25190,
					25191,
					25192,
					25193,
					25194,
					25195,
					25196,
					25197,
					25198,
					25199,
					25200,
					25201,
					25202,
					25187
				]
			},
			{
				"speed": 25,
				"name": "Lehne Court",
				"nodes": [
					13037,
					25203,
					25204,
					25205,
					25206,
					19338,
					25207,
					19238
				]
			},
			{
				"speed": 25,
				"name": "Manthorne Court",
				"nodes": [
					2163,
					8780
				]
			},
			{
				"speed": 25,
				"name": "Advocate Court",
				"nodes": [
					25208,
					25209,
					25210,
					25211,
					25212,
					25213,
					25214,
					25215,
					2599,
					25216,
					25217,
					25218,
					25219,
					25220,
					25221,
					25222,
					25208
				]
			},
			{
				"speed": 25,
				"name": "Marsala Drive",
				"nodes": [
					25223,
					25224,
					25225,
					25226,
					25227,
					25228,
					25229,
					25230,
					8357,
					25231,
					25232,
					25233,
					25234,
					25235,
					25236,
					25237,
					25223
				]
			},
			{
				"speed": 25,
				"name": "Marxkors Place",
				"nodes": [
					25238,
					25239,
					25240,
					25241,
					25242,
					25243,
					25244,
					25245,
					8509,
					25246,
					25247,
					25248,
					25249,
					25250,
					25251,
					25252,
					25238
				]
			},
			{
				"speed": 25,
				"name": "Meditation Way Court",
				"nodes": [
					18676,
					25253,
					25254,
					25255,
					25256,
					25257,
					25258,
					25259,
					25260,
					25261,
					25262,
					25263,
					25264,
					25265,
					25266,
					25267,
					18676
				]
			},
			{
				"speed": 25,
				"name": "Millvalley Drive",
				"nodes": [
					5826,
					25268,
					25269,
					25270,
					25271,
					25272,
					25273,
					16071
				]
			},
			{
				"speed": 25,
				"name": "Mc Bride Place",
				"nodes": [
					25274,
					25275,
					25276,
					25277,
					25278,
					25279,
					25280,
					25281,
					1496,
					25282,
					25283,
					25284,
					25285,
					25286,
					25287,
					25288,
					25274
				]
			},
			{
				"speed": 25,
				"name": "Mission Walk Court",
				"nodes": [
					5334,
					25289,
					25290,
					25291,
					25292,
					25293,
					25294,
					18806
				]
			},
			{
				"speed": 25,
				"name": "Stilton Court",
				"nodes": [
					6623,
					25295,
					25296,
					25297,
					25298,
					25299,
					25300,
					25301,
					25302,
					16012
				]
			},
			{
				"speed": 25,
				"name": "Suns Up Court",
				"nodes": [
					25303,
					25304,
					25305,
					25306,
					25307,
					25308,
					16075
				]
			},
			{
				"speed": 25,
				"name": "Willow Creek Est Dr Court",
				"nodes": [
					5753,
					25309,
					25310,
					25311,
					25312,
					25313,
					25314,
					25315,
					25316,
					25317,
					25318,
					25319,
					25320,
					25321,
					25322,
					25323,
					5753
				]
			},
			{
				"speed": 25,
				"name": "Stoney End Court",
				"nodes": [
					16079,
					25324,
					25325,
					25326,
					25327,
					25328,
					25329,
					25330,
					25331,
					25332,
					25333,
					25334,
					25335,
					25336,
					25337,
					25338,
					16079
				]
			},
			{
				"speed": 25,
				"name": "Black Pine Court",
				"nodes": [
					5839,
					16065,
					25339,
					25340,
					25341,
					25342,
					25343,
					25344,
					25345,
					25346,
					25347,
					25348,
					25349,
					25350,
					16021
				]
			},
			{
				"speed": 25,
				"name": "Rhinegarten Drive",
				"nodes": [
					12885,
					25351,
					25352,
					25353,
					25354,
					25355,
					25356,
					18709,
					25357,
					18701
				]
			},
			{
				"speed": 25,
				"name": "Lawson Place Court",
				"nodes": [
					25358,
					25359,
					25360,
					25361,
					25362,
					25363,
					25364,
					25365,
					12205,
					25366,
					25367,
					25368,
					25369,
					25370,
					25371,
					25372,
					25358
				]
			},
			{
				"speed": 25,
				"name": "Rosary Tree Court",
				"nodes": [
					25373,
					25374,
					25375,
					25376,
					25377,
					25378,
					25379,
					25380,
					25381,
					25382,
					25383,
					25384,
					25385,
					25386,
					25387,
					25388,
					25373
				]
			},
			{
				"speed": 25,
				"name": "Rosebrook Drive",
				"nodes": [
					6934,
					25389,
					25390,
					25391,
					25392,
					25393,
					25394,
					25395,
					25396,
					18940
				]
			},
			{
				"speed": 25,
				"name": "Orvieto Court",
				"nodes": [
					5877,
					25397,
					25398,
					25399,
					25400,
					25401,
					25402,
					25403,
					25404,
					25405,
					25406,
					25407,
					25408,
					25409,
					25410,
					25411,
					5877
				]
			},
			{
				"speed": 25,
				"name": "Sackman Court",
				"nodes": [
					8764,
					25412,
					25413,
					25414,
					25415,
					25416,
					25417,
					25418,
					25419,
					25420,
					25421,
					25422,
					25423,
					25424,
					25425,
					25426,
					8764
				]
			},
			{
				"speed": 25,
				"name": "Cheval Court",
				"nodes": [
					12634,
					25427,
					25428,
					25429,
					25430,
					25431,
					25432,
					25433,
					25434,
					25435,
					25436,
					25437,
					25438,
					25439,
					25440,
					25441,
					12634
				]
			},
			{
				"speed": 25,
				"name": "Pinecone Trail",
				"nodes": [
					25442,
					25443,
					25444,
					25445,
					25446,
					25447,
					25448,
					25449,
					20698,
					25450,
					25451,
					25452,
					25453,
					25454,
					25455,
					25456,
					25442
				]
			},
			{
				"speed": 25,
				"name": "Sally Drive",
				"nodes": [
					3879,
					25457
				]
			},
			{
				"speed": 25,
				"name": "Paul Pl Court",
				"nodes": [
					2554,
					25458,
					25459,
					25460,
					25461,
					25462,
					25463,
					25464,
					25465,
					25466,
					25467,
					25468,
					25469,
					25470,
					25471,
					25472,
					2554
				]
			},
			{
				"speed": 25,
				"name": "Seminary Court",
				"nodes": [
					18743,
					25473,
					25474,
					25475,
					25476,
					25477,
					25478,
					25479,
					25480,
					25481,
					25482,
					25483,
					25484,
					25485,
					25486,
					25487,
					18743
				]
			},
			{
				"speed": 25,
				"name": "Scoville Place Court",
				"nodes": [
					25488,
					25489,
					25490,
					25491,
					25492,
					25493,
					25494,
					25495,
					4434,
					25496,
					25497,
					25498,
					25499,
					25500,
					25501,
					25502,
					25488
				]
			},
			{
				"speed": 25,
				"name": "Christinia Marie Court",
				"nodes": [
					25503,
					25504,
					25505,
					25506,
					25507,
					25508,
					25509,
					25510,
					6535,
					25511,
					25512,
					25513,
					25514,
					25515,
					25516,
					25517,
					25503
				]
			},
			{
				"speed": 25,
				"name": "St Stanislaus Court",
				"nodes": [
					25518,
					25519,
					25520,
					25521,
					25522,
					25523,
					25524,
					25525,
					18757,
					25526,
					25527,
					25528,
					25529,
					25530,
					25531,
					25532,
					25518
				]
			},
			{
				"speed": 25,
				"name": "Springwood Place Court",
				"nodes": [
					25533,
					25534,
					25535,
					25536,
					25537,
					25538,
					25539,
					25540,
					3155,
					25541,
					25542,
					25543,
					25544,
					25545,
					25546,
					25547,
					25533
				]
			},
			{
				"speed": 25,
				"name": "Sullivan Oaks Place",
				"nodes": [
					11203,
					25548,
					25549,
					25550,
					25551,
					25552,
					25553,
					25554,
					25555,
					25556,
					25557,
					25558,
					25559,
					25560,
					25561,
					25562,
					11203
				]
			},
			{
				"speed": 25,
				"name": "Thompson Drive",
				"nodes": [
					8846,
					25563
				]
			},
			{
				"speed": 25,
				"name": "Taylor Trails Drive",
				"nodes": [
					1927,
					25564,
					25565,
					25566,
					25567,
					25568,
					25569,
					25570,
					25571,
					25572,
					25573,
					25574,
					25575,
					25576,
					25577,
					25578,
					1927
				]
			},
			{
				"speed": 25,
				"name": "Timberwood Crossing Court",
				"nodes": [
					25579,
					25580,
					25581,
					25582,
					25583,
					25584,
					25585,
					25586,
					4640,
					25587,
					25588,
					25589,
					25590,
					25591,
					25592,
					25593,
					25579
				]
			},
			{
				"speed": 25,
				"name": "Timberwood Crossing Drive",
				"nodes": [
					25594,
					25595,
					25596,
					25597,
					25598,
					25599,
					25600,
					25601,
					11142,
					25602,
					25603,
					25604,
					25605,
					25606,
					25607,
					25608,
					25594
				]
			},
			{
				"speed": 25,
				"name": "Timberwood Trail",
				"nodes": [
					25609,
					25610,
					25611,
					25612,
					25613,
					25614,
					25615,
					25616,
					25617,
					25618,
					25619,
					25620,
					25621,
					25622,
					25623,
					25624,
					25609
				]
			},
			{
				"speed": 25,
				"name": "Timberwood Trail",
				"nodes": [
					3291,
					25625,
					25626,
					20740,
					25627,
					25628,
					25629,
					25630,
					25631,
					25632,
					25633,
					25634,
					25609
				]
			},
			{
				"speed": 25,
				"name": "White Birch Way",
				"nodes": [
					7569,
					25635
				]
			},
			{
				"speed": 25,
				"name": "Willow River Court",
				"nodes": [
					25636,
					25637,
					25638,
					25639,
					25640,
					25641,
					25642,
					25643,
					25644,
					25645,
					25646,
					25647,
					25648,
					25649,
					25650,
					25651,
					25636
				]
			},
			{
				"speed": 25,
				"name": "Willow River Court",
				"nodes": [
					12577,
					25652,
					20699,
					25653,
					25636
				]
			},
			{
				"speed": 25,
				"name": "Hazelwest Court",
				"nodes": [
					11440,
					25654,
					25655,
					25656,
					25657,
					25658,
					25659,
					25660,
					25661,
					25662,
					25663,
					25664,
					25665,
					25666,
					25667,
					25668,
					11440
				]
			},
			{
				"speed": 25,
				"name": "Zohner Court",
				"nodes": [
					12116,
					25669,
					25670,
					25671,
					25672,
					25673,
					25674,
					25675,
					25676,
					25677,
					25678,
					25679,
					25680,
					25681,
					25682,
					25683,
					12116
				]
			},
			{
				"speed": 25,
				"name": "Sprinters Row Drive",
				"nodes": [
					11540,
					25684,
					25685,
					25686,
					25687,
					25688,
					25689,
					25690,
					25691,
					8879,
					25692,
					25693,
					25694,
					25695,
					14836,
					25696,
					25697,
					25698,
					15156
				]
			},
			{
				"speed": 25,
				"name": "Gifford Court",
				"nodes": [
					25699,
					25700,
					25701,
					25702,
					25703,
					25704,
					25705,
					25706,
					9120,
					25707,
					25708,
					25709,
					25710,
					25711,
					25712,
					25713,
					25699
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					3459,
					25714
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					9255,
					25715
				]
			},
			{
				"speed": 25,
				"name": "Rosary Tree Court",
				"nodes": [
					1558,
					25716,
					20703,
					25717,
					25373
				]
			},
			{
				"speed": 25,
				"name": "Mission Walk Court",
				"nodes": [
					18808,
					25718,
					25719,
					25720,
					25721,
					25722,
					25723,
					25724,
					25725,
					25726,
					25727,
					25728,
					25729,
					25730,
					25731,
					25732,
					18808
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					483,
					25733
				]
			},
			{
				"speed": 25,
				"name": "Contessa Court",
				"nodes": [
					10371,
					25734,
					25735,
					25736,
					25737,
					25738,
					25739,
					25740,
					25741,
					25742,
					25743,
					25744,
					25745,
					25746,
					25747,
					25748,
					10371
				]
			},
			{
				"speed": 25,
				"name": "Rosebrook Drive",
				"nodes": [
					18700,
					25749,
					25750,
					25751,
					25752,
					25753,
					25754,
					25755,
					25756,
					25757,
					25758,
					25759,
					25760,
					25761,
					25762,
					25763,
					18700
				]
			},
			{
				"speed": 25,
				"name": "Wente Place",
				"nodes": [
					25764,
					25765,
					25766,
					25767,
					25768,
					25769,
					25770,
					25771,
					8255,
					25772,
					25773,
					25774,
					25775,
					25776,
					25777,
					25778,
					25764
				]
			},
			{
				"speed": 25,
				"name": "Lehne Court",
				"nodes": [
					19226,
					25779,
					25780,
					25781,
					25782,
					25783,
					25784,
					25785,
					25786,
					25787,
					25788,
					25789,
					25790,
					25791,
					25792,
					25793,
					19226
				]
			},
			{
				"speed": 25,
				"name": "Willow Creek Est Drive",
				"nodes": [
					8518,
					25794,
					12690,
					25795,
					25796,
					25797,
					25798,
					25799,
					25800,
					25801,
					25802,
					25803,
					25804,
					5752
				]
			},
			{
				"speed": 25,
				"name": "Bielfield Drive",
				"nodes": [
					4099,
					25805,
					25806,
					25807,
					25808,
					25809,
					25810,
					25811,
					25812,
					25813,
					25814,
					25815,
					25816,
					25817,
					25818,
					25819,
					4099
				]
			},
			{
				"speed": 25,
				"name": "Club Grounds South Drive",
				"nodes": [
					10881,
					25820,
					25821,
					25822,
					10885
				]
			},
			{
				"speed": 25,
				"name": "Fairway Court",
				"nodes": [
					2213,
					25823,
					25824,
					25825,
					25826,
					25827,
					25828,
					25829,
					25830,
					25831,
					25832,
					25833,
					25834,
					25835,
					25836,
					25837,
					2213
				]
			},
			{
				"speed": 25,
				"name": "Cobblestone Creek Drive",
				"nodes": [
					25838,
					25839,
					25840,
					25841,
					25842,
					25843,
					25844,
					25845,
					18572,
					25846,
					25847,
					25848,
					25849,
					25850,
					25851,
					25852,
					25838
				]
			},
			{
				"speed": 25,
				"name": "Riverwood Park Drive",
				"nodes": [
					18779,
					25853,
					25854,
					25855,
					25856,
					25857,
					25858,
					25859,
					18955,
					25860,
					18965,
					25861,
					25862,
					25863,
					25864,
					25865,
					25866,
					25867,
					18996,
					19004,
					25868,
					25869,
					18710,
					25870,
					25871,
					18717,
					25872,
					25873,
					25874,
					5055
				]
			},
			{
				"speed": 25,
				"name": "Moselle Court",
				"nodes": [
					18954,
					25875,
					25876,
					25877,
					25878,
					25879,
					25880,
					25881,
					25882,
					25883,
					25884,
					25885,
					25886,
					25887,
					25888,
					25889,
					18954
				]
			},
			{
				"speed": 25,
				"name": "New Hope Court",
				"nodes": [
					25890,
					25891,
					25892,
					25893,
					25894,
					25895,
					25896,
					25897,
					2890,
					25898,
					25899,
					25900,
					25901,
					25902,
					25903,
					25904,
					25890
				]
			},
			{
				"speed": 25,
				"name": "Northport Drive",
				"nodes": [
					7964,
					25905,
					25906,
					25907,
					25908,
					25909,
					7963
				]
			},
			{
				"speed": 25,
				"name": "Pratt Place",
				"nodes": [
					25910,
					25911,
					25912,
					25913,
					25914,
					25915,
					25916,
					25917,
					8897,
					25918,
					25919,
					25920,
					25921,
					25922,
					25923,
					25924,
					25910
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					25714,
					25925
				]
			},
			{
				"speed": 25,
				"name": "Bridekirk Court",
				"nodes": [
					25926,
					25927,
					25928,
					25929,
					25930,
					25931,
					25932,
					25933,
					12015,
					25934,
					25935,
					25936,
					25937,
					25938,
					25939,
					25940,
					25926
				]
			},
			{
				"speed": 25,
				"name": "Amarose Court",
				"nodes": [
					12558,
					25941,
					25942,
					25943,
					25944,
					25945,
					25946,
					25947,
					25948,
					25949,
					25950,
					25951,
					25952,
					25953,
					25954,
					25955,
					12558
				]
			},
			{
				"speed": 25,
				"name": "Blythewood Drive",
				"nodes": [
					8246,
					25956,
					25957,
					25958,
					25959,
					25960,
					25961,
					25962,
					25963,
					25964,
					25965,
					25966,
					25967,
					25968,
					25969,
					25970,
					8246
				]
			},
			{
				"speed": 25,
				"name": "Brixworth Court",
				"nodes": [
					5143,
					25971,
					25972,
					11969
				]
			},
			{
				"speed": 25,
				"name": "Broadridge Court",
				"nodes": [
					25973,
					25974,
					25975,
					25976,
					25977,
					25978,
					25979,
					25980,
					5080,
					25981,
					25982,
					25983,
					25984,
					25985,
					25986,
					25987,
					25973
				]
			},
			{
				"speed": 25,
				"name": "Canoebrook Drive",
				"nodes": [
					13026,
					25988,
					25989,
					4614
				]
			},
			{
				"speed": 25,
				"name": "Chez Vant Court",
				"nodes": [
					25990,
					25991,
					25992,
					7922
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					25993,
					25994,
					25995,
					25996,
					25997,
					25998,
					25999,
					26000,
					20946,
					26001,
					26002,
					26003,
					26004,
					26005,
					26006,
					26007,
					25993
				]
			},
			{
				"speed": 25,
				"name": "Calderabby Court",
				"nodes": [
					667,
					26008,
					26009,
					26010,
					26011,
					26012,
					26013,
					26014,
					26015,
					26016,
					26017,
					26018,
					26019,
					26020,
					26021,
					26022,
					667
				]
			},
			{
				"speed": 25,
				"name": "Crestwood Bend Court",
				"nodes": [
					2172,
					26023,
					26024,
					26025,
					26026,
					26027,
					26028,
					26029,
					26030,
					26031,
					26032,
					26033,
					26034,
					26035,
					26036,
					26037,
					2172
				]
			},
			{
				"speed": 25,
				"name": "Jamestowne Ridge Court",
				"nodes": [
					9285,
					26038,
					26039
				]
			},
			{
				"speed": 25,
				"name": "Jamestowne Ridge Lane",
				"nodes": [
					21694,
					26040,
					26041,
					26039,
					2577
				]
			},
			{
				"speed": 25,
				"name": "Pacific Park Drive",
				"nodes": [
					9334,
					26042,
					26043,
					16059
				]
			},
			{
				"speed": 25,
				"name": "Bielfield Court",
				"nodes": [
					10529,
					4084
				]
			},
			{
				"speed": 25,
				"name": "Kingsley Height Drive",
				"nodes": [
					21745,
					26044,
					26045,
					26046,
					26047,
					26048,
					26049,
					26050,
					22611
				]
			},
			{
				"speed": 25,
				"name": "Meadow Court",
				"nodes": [
					5539,
					11771
				]
			},
			{
				"speed": 25,
				"name": "Fleurie Drive",
				"nodes": [
					18764,
					26051,
					26052,
					26053,
					26054,
					26055,
					26056,
					26057,
					26058,
					26059,
					26060,
					26061,
					26062,
					26063,
					26064,
					26065,
					18764
				]
			},
			{
				"speed": 25,
				"name": "Mourville Court",
				"nodes": [
					22009,
					26066,
					26067,
					26068,
					2589,
					26069
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					15610,
					26070,
					26071,
					26072,
					26073,
					26074,
					26075,
					26076,
					26077
				]
			},
			{
				"speed": 25,
				"name": "Mourville Court",
				"nodes": [
					26078,
					26079,
					26080,
					26081,
					26082,
					26083,
					26084,
					26085,
					26069,
					26086,
					26087,
					26088,
					26089,
					26090,
					26091,
					26092,
					26078
				]
			},
			{
				"speed": 25,
				"name": "North Branridge Road",
				"nodes": [
					9738,
					9560,
					8874,
					26093,
					26094
				]
			},
			{
				"speed": 25,
				"name": "Holly River Drive",
				"nodes": [
					8745,
					26095,
					26096,
					26097,
					11215
				]
			},
			{
				"speed": 25,
				"name": "Seminary Court",
				"nodes": [
					6167,
					26098,
					18740
				]
			},
			{
				"speed": 25,
				"name": "Silverbrook Drive",
				"nodes": [
					8583,
					4615
				]
			},
			{
				"speed": 25,
				"name": "Monacella Court",
				"nodes": [
					26099,
					26100,
					26101,
					26102,
					26103,
					26104,
					26105,
					26106,
					22157,
					26107,
					26108,
					26109,
					26110,
					26111,
					26112,
					26113,
					26099
				]
			},
			{
				"speed": 25,
				"name": "Saint John Court",
				"nodes": [
					7394,
					26114,
					26115,
					26116,
					26117,
					26118,
					26119,
					26120,
					26121,
					26122,
					26123,
					26124,
					26125,
					26126,
					26127,
					26128,
					7394
				]
			},
			{
				"speed": 25,
				"name": "North Duchesne Drive",
				"nodes": [
					8662,
					26129,
					26130,
					26131,
					26132,
					26133,
					26134,
					8599
				]
			},
			{
				"speed": 25,
				"name": "Tanglebrook Drive",
				"nodes": [
					22037,
					26135,
					26136,
					4611,
					26137,
					26138,
					26139,
					26140,
					26141,
					26142
				]
			},
			{
				"speed": 25,
				"name": "Tanglebrook Drive",
				"nodes": [
					26143,
					26144,
					26145,
					26146,
					26147,
					26148,
					26149,
					26150,
					26142,
					26151,
					26152,
					26153,
					26154,
					26155,
					26156,
					26157,
					26143
				]
			},
			{
				"speed": 25,
				"name": "Trees Edge Lane",
				"nodes": [
					26158,
					26159,
					26160,
					26161,
					26162,
					26163,
					26164,
					26165,
					22629,
					26166,
					26167,
					26168,
					26169,
					26170,
					26171,
					26172,
					26158
				]
			},
			{
				"speed": 25,
				"name": "Willow Court",
				"nodes": [
					9219,
					26173
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					10119,
					26174
				]
			},
			{
				"speed": 25,
				"name": "Welwyn Court",
				"nodes": [
					26175,
					26176,
					26177,
					26178,
					26179,
					26180,
					26181,
					26182,
					8875,
					26183,
					26184,
					26185,
					26186,
					26187,
					26188,
					26189,
					26175
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					4572,
					26190
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					26191,
					1016
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					8262,
					26192,
					26193,
					26194,
					26195,
					26196,
					26197,
					26198,
					26199,
					26200,
					26201,
					26202,
					26203,
					26204,
					26205
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1018,
					26206
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					26207,
					4574
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1017,
					26208,
					26209
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					8260,
					8263
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					13579,
					26210
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1021,
					26211
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					26211,
					26212,
					26206
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					26213,
					26214,
					8259
				]
			},
			{
				"speed": 25,
				"name": "Alderwood Drive",
				"nodes": [
					22349,
					26215,
					26216,
					26217,
					26218,
					26219,
					26220,
					26221,
					26222,
					26223,
					26224,
					26225,
					26226,
					26227,
					26228,
					26229,
					22349
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1015,
					25990,
					26230
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					26230,
					26191,
					26209
				]
			},
			{
				"speed": 25,
				"name": "Elmdale Court",
				"nodes": [
					12064,
					26231,
					6499,
					26232
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					26233,
					26234,
					26207,
					26190
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					1026,
					26235,
					26233,
					1019
				]
			},
			{
				"speed": 25,
				"name": "Pincay Court",
				"nodes": [
					10154,
					26236,
					26237,
					26238,
					26239,
					26240,
					26241,
					26242,
					26243,
					26244,
					26245,
					26246,
					26247,
					26248,
					26249,
					26250,
					10154
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					26205,
					26251,
					26252,
					26253,
					26254,
					26213
				]
			},
			{
				"speed": 25,
				"name": "old Country Estates Drive",
				"nodes": [
					22092,
					26255,
					26256,
					26257,
					18472
				]
			},
			{
				"speed": 25,
				"name": "Hiddenbrook Drive",
				"nodes": [
					5786,
					26258,
					26259,
					26260,
					26261,
					26262,
					26141
				]
			},
			{
				"speed": 25,
				"name": "Town and Country Place",
				"nodes": [
					10831,
					26263
				]
			},
			{
				"speed": 25,
				"name": "Riverwood Place Drive",
				"nodes": [
					19243,
					26264,
					26265,
					26266,
					26267,
					26268,
					26269,
					26270,
					26271,
					26272,
					26273,
					26274,
					26275,
					26276,
					26277,
					26278,
					19243
				]
			},
			{
				"speed": 25,
				"name": "Lanawood Court",
				"nodes": [
					5577,
					26279,
					20745,
					26280,
					25187
				]
			},
			{
				"speed": 25,
				"name": "Pinecone Trail",
				"nodes": [
					10919,
					26281,
					26282,
					26283,
					26284,
					26285,
					26286,
					26287,
					26288,
					20695
				]
			},
			{
				"speed": 25,
				"name": "Parktrails Lane",
				"nodes": [
					21619,
					26289,
					26290,
					26291,
					26292,
					26293,
					26294,
					26295,
					26296,
					26297,
					26298,
					26299,
					26300,
					26301,
					26302,
					26303,
					21619
				]
			},
			{
				"speed": 25,
				"name": "Sir Edward Court",
				"nodes": [
					26304,
					26305,
					26306,
					26307,
					26308,
					26309,
					26310,
					26311,
					21612,
					26312,
					26313,
					26314,
					26315,
					26316,
					26317,
					26318,
					26304
				]
			},
			{
				"speed": 25,
				"name": "Shalfleet Court",
				"nodes": [
					8195,
					21219
				]
			},
			{
				"speed": 25,
				"name": "Spring Trail Drive",
				"nodes": [
					3205,
					26319,
					26320,
					26321,
					26322,
					26323,
					26324,
					26325,
					26326,
					26327,
					26328,
					26329,
					26330,
					26331,
					26332,
					26333,
					3205
				]
			},
			{
				"speed": 25,
				"name": "Auriesville Lane",
				"nodes": [
					19671,
					26334,
					26335,
					26336,
					26337,
					26338,
					26339,
					26340,
					26341,
					26342,
					26343,
					26344,
					26345,
					26346,
					26347,
					26348,
					19671
				]
			},
			{
				"speed": 25,
				"name": "Valley Drive",
				"nodes": [
					26349,
					26350,
					26351,
					26352,
					26353,
					26354,
					26355,
					26356,
					11772,
					26357,
					26358,
					26173,
					26359,
					26360,
					26361,
					26362,
					26349
				]
			},
			{
				"speed": 25,
				"name": "Elm Grove Court",
				"nodes": [
					7456,
					5614
				]
			},
			{
				"speed": 25,
				"name": "Locust Drive",
				"nodes": [
					26363,
					26364,
					26365,
					26366,
					26367,
					26368,
					26369,
					26370,
					4728,
					26371,
					26372,
					26373,
					26374,
					26375,
					26376,
					26377,
					26363
				]
			},
			{
				"speed": 25,
				"name": "Red Wagon Court",
				"nodes": [
					21564
				]
			},
			{
				"speed": 25,
				"name": "Hungerford Drive",
				"nodes": [
					12293,
					26378,
					26379,
					26380,
					26381,
					26382,
					26383,
					26384,
					26385,
					26386,
					10014,
					26387,
					26388,
					26389,
					26390,
					26391,
					26392,
					26393,
					26394,
					26395,
					1265
				]
			},
			{
				"speed": 25,
				"name": "Charbonier Bluffs",
				"nodes": [
					18631,
					26396,
					26397,
					26398,
					18613,
					26399,
					26400,
					26401,
					26402,
					26403,
					26404,
					26405,
					26406,
					26407,
					18772,
					26408,
					18765,
					26409,
					26410,
					26411,
					9085
				]
			},
			{
				"speed": 25,
				"name": "Ville Anita Court",
				"nodes": [
					11097,
					26412,
					26413,
					11148
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					2969,
					26414,
					26415,
					26416,
					26417,
					26418,
					26419,
					26420,
					26421,
					6518
				]
			},
			{
				"speed": 25,
				"name": "Ville Maura Court",
				"nodes": [
					4210,
					19761
				]
			},
			{
				"speed": 25,
				"name": "Ville Patricia Court",
				"nodes": [
					26422,
					26423,
					26424,
					26425,
					26426,
					26427,
					26428,
					26429,
					12962,
					26430,
					26431,
					26432,
					26433,
					26434,
					26435,
					26436,
					26422
				]
			},
			{
				"speed": 25,
				"name": "Ville Teresa Lane",
				"nodes": [
					26437,
					26438,
					26439,
					26440,
					26441,
					26442,
					26443,
					26444,
					19973,
					26445,
					26446,
					26447,
					26448,
					26449,
					26450,
					26451,
					26437
				]
			},
			{
				"speed": 25,
				"name": "Ville Teresa Court",
				"nodes": [
					26452,
					26453,
					26454,
					26455,
					26456,
					26457,
					26458,
					26459,
					19984,
					26460,
					26461,
					26462,
					26463,
					26464,
					26465,
					26466,
					26452
				]
			},
			{
				"speed": 25,
				"name": "Paddock Ridge Court",
				"nodes": [
					7103,
					26467,
					26468,
					22134,
					26469,
					22147,
					26470,
					26471,
					8544
				]
			},
			{
				"speed": 25,
				"name": "Rhinegarten Drive",
				"nodes": [
					18722,
					26472,
					26473,
					26474,
					26475,
					26476,
					26477,
					26478,
					26479,
					26480,
					26481,
					26482,
					26483,
					26484,
					26485,
					26486,
					18722
				]
			},
			{
				"speed": 25,
				"name": "Paddock Point Drive",
				"nodes": [
					8559,
					26487,
					26488,
					26489,
					26490,
					26491,
					26492,
					26493,
					26494,
					26495,
					26496,
					26497,
					26498,
					26499,
					26500,
					26501,
					8559
				]
			},
			{
				"speed": 25,
				"name": "Carey Court",
				"nodes": [
					10312,
					26502,
					26503,
					26504,
					26505,
					26506,
					26507,
					26508,
					26509,
					26510,
					26511,
					26512,
					26513,
					26514,
					26515,
					26516,
					10312
				]
			},
			{
				"speed": 25,
				"name": "Woodcrest Lane",
				"nodes": [
					10734,
					26517,
					26518,
					26519,
					26520,
					26521,
					26522,
					26523,
					26524,
					26525,
					26526,
					26527,
					26528,
					26529,
					26530,
					26531,
					10734
				]
			},
			{
				"speed": 25,
				"name": "Wensley Road",
				"nodes": [
					6912,
					26532,
					26533,
					26534,
					26535,
					26536,
					26537,
					26538,
					26539,
					26540,
					26541,
					26542,
					26543,
					26094,
					12001
				]
			},
			{
				"speed": 25,
				"name": "St Stanislaus Court",
				"nodes": [
					10735,
					26544,
					26545,
					26546,
					26547,
					26548,
					26549,
					26550,
					26551,
					26552,
					26553,
					26554,
					26555,
					26556,
					26557,
					12800
				]
			},
			{
				"speed": 25,
				"name": "Meuse Drive",
				"nodes": [
					8479,
					26558,
					26559,
					26560,
					26561,
					26562,
					26563,
					26564,
					26565,
					26566,
					26567,
					26568,
					26569,
					26570,
					26571,
					26572,
					8479
				]
			},
			{
				"speed": 25,
				"name": "Ville Donna Court",
				"nodes": [
					2947,
					26573,
					26574,
					26575,
					26576,
					26577,
					26578,
					26579,
					26580,
					26581,
					26582,
					26583,
					26584,
					26585,
					26586,
					26587,
					2947
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					26588,
					6022,
					26589
				]
			},
			{
				"speed": 25,
				"name": "Saratoga Springs Court",
				"nodes": [
					14337,
					26590,
					26591,
					26592,
					26593,
					26594,
					26595,
					26596,
					26597,
					26598,
					14260
				]
			},
			{
				"speed": 25,
				"name": "Trailoaks Court",
				"nodes": [
					3843,
					26599,
					26600,
					26601,
					26602,
					26603,
					26604,
					26605,
					26606,
					26607,
					26608,
					26609,
					26610,
					26611,
					26612,
					26613,
					3843
				]
			},
			{
				"speed": 25,
				"name": "High Sun Drive",
				"nodes": [
					16075,
					25304
				]
			},
			{
				"speed": 25,
				"name": "High Sun Drive",
				"nodes": [
					25304,
					26614,
					26615,
					11158
				]
			},
			{
				"speed": 25,
				"name": "Village Square Shopping Ctr",
				"nodes": [
					26616,
					8083
				]
			},
			{
				"speed": 25,
				"name": "Village Square Drive",
				"nodes": [
					20515,
					26616,
					11652
				]
			},
			{
				"speed": 30,
				"name": "Missouri Bottom Road",
				"nodes": [
					23068,
					26617
				]
			},
			{
				"speed": 30,
				"name": "Missouri Bottom Road",
				"nodes": [
					26617,
					26618,
					26619,
					26620,
					13548
				]
			},
			{
				"speed": 25,
				"name": "River Oaks Park Drive",
				"nodes": [
					13901,
					26621,
					26622,
					26623,
					26624,
					26625
				]
			},
			{
				"speed": 25,
				"name": "Saint Edward Lane",
				"nodes": [
					10134,
					26626
				]
			},
			{
				"speed": 25,
				"name": "Saint Eugene Lane",
				"nodes": [
					1781,
					26627,
					26628,
					11362,
					26629,
					26630,
					26631
				]
			},
			{
				"speed": 25,
				"name": "Saint Edward Lane",
				"nodes": [
					26626,
					26632,
					26631,
					5961,
					8832,
					851
				]
			},
			{
				"speed": 25,
				"name": "Village Square Shopping Center",
				"nodes": [
					20511,
					26633,
					26634,
					26635,
					26636,
					26637,
					26638,
					26639,
					26640,
					26641,
					26642,
					26643,
					26644,
					26645,
					26646,
					26647,
					26648,
					26616
				]
			},
			{
				"speed": 25,
				"name": "Rue St Pierre",
				"nodes": [
					11407,
					13873,
					1607,
					8416,
					26649,
					4001
				]
			},
			{
				"speed": 35,
				"name": "Parker Road",
				"nodes": [
					23035,
					26650,
					26651,
					26652,
					26653,
					26654,
					26655,
					26656,
					23037
				]
			},
			{
				"speed": 35,
				"name": "Parker Road",
				"nodes": [
					2543,
					26657,
					26658,
					26659,
					26660,
					26653
				]
			},
			{
				"speed": 40,
				"name": "Graham Road",
				"nodes": [
					11484,
					26661
				]
			},
			{
				"speed": 40,
				"name": "Graham Road",
				"nodes": [
					26661,
					22646,
					12751,
					22329,
					22314,
					12304,
					3128,
					1164,
					11357,
					22287,
					4374,
					800,
					9691,
					23029,
					20904,
					169
				]
			},
			{
				"speed": 25,
				"name": "Derhake Road Spur",
				"nodes": [
					20912,
					26662,
					26663,
					14229
				]
			},
			{
				"speed": 25,
				"name": "Campus Court",
				"nodes": [
					6855,
					26664,
					26665,
					26666,
					26667,
					26668,
					26669,
					26670,
					26671,
					26672,
					26673,
					26674,
					26675,
					26676,
					26677,
					26678,
					6855
				]
			},
			{
				"speed": 25,
				"name": "Chaparral Creek Drive",
				"nodes": [
					553,
					26679,
					26680,
					26681,
					26682,
					554
				]
			},
			{
				"speed": 25,
				"name": "Target Drive",
				"nodes": [
					13613,
					26683,
					26684,
					26685,
					26686,
					26687
				]
			},
			{
				"speed": 25,
				"name": "Hazelwood Tech Court",
				"nodes": [
					3707,
					26688,
					26689,
					26690,
					26691
				]
			},
			{
				"speed": 25,
				"name": "Santiago Drive",
				"nodes": [
					4592,
					4553
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14223,
					26692,
					26693,
					26694,
					26695
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14221,
					26696,
					26697,
					26698,
					26699,
					26700
				]
			},
			{
				"speed": 25,
				"name": "Stonebury Court",
				"nodes": [
					11712,
					26701
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					14222,
					26702,
					26703,
					26704,
					26695,
					26705,
					26706,
					26700,
					26707
				]
			},
			{
				"speed": 25,
				"name": "Rue St Louis",
				"nodes": [
					9794,
					26649,
					6946,
					4603,
					8342,
					10150,
					8079,
					11023,
					12785,
					2785
				]
			},
			{
				"speed": 35,
				"name": "Taussig Avenue",
				"nodes": [
					26708,
					26709
				]
			},
			{
				"speed": 30,
				"name": "Taussig Avenue",
				"nodes": [
					14005,
					14131
				]
			},
			{
				"speed": 35,
				"name": "Taussig Avenue",
				"nodes": [
					26709,
					26710,
					26711
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					26712,
					26713,
					13551
				]
			},
			{
				"speed": 35,
				"name": "Taussig Avenue",
				"nodes": [
					26711,
					6971,
					26714,
					23105,
					26715,
					23090
				]
			},
			{
				"speed": 35,
				"name": "Taussig Avenue",
				"nodes": [
					26716,
					26717,
					26718,
					26719,
					26720,
					26721,
					14013
				]
			},
			{
				"speed": 30,
				"name": "Taussig Avenue",
				"nodes": [
					23102,
					26722,
					14004
				]
			},
			{
				"speed": 25,
				"name": "Hazelwood West Middle School",
				"nodes": [
					26723,
					26724,
					14120
				]
			},
			{
				"speed": 25,
				"name": "St Louis Mills Circle",
				"nodes": [
					26725,
					26726,
					26727
				]
			},
			{
				"speed": 30,
				"name": "Taussig Avenue",
				"nodes": [
					14120,
					26728,
					26729,
					26730,
					6577
				]
			},
			{
				"speed": 30,
				"name": "Taussig Avenue",
				"nodes": [
					26731,
					26732,
					26733,
					26734,
					26735,
					26736
				]
			},
			{
				"speed": 30,
				"name": "Taussig Avenue",
				"nodes": [
					26737,
					26738,
					26739,
					26740,
					26741,
					26742,
					26743
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13785,
					26744
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					13564,
					26745,
					26746
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					26747,
					26748
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					26744,
					26749,
					26737
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					26737,
					26750,
					26751,
					13793
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					26748,
					26752,
					26753,
					26754
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					26754,
					26755,
					26756
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13811,
					26757
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					26758,
					26759,
					26747
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					26760,
					26761,
					26758
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					26760,
					26762,
					13786
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					23075,
					26763,
					13804
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					13558,
					26764,
					26760
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					26754,
					26765,
					26766
				]
			},
			{
				"speed": 35,
				"name": "Aubuchon Road",
				"nodes": [
					9931,
					26767
				]
			},
			{
				"speed": 35,
				"name": "Aubuchon Road",
				"nodes": [
					26767,
					26768,
					26769,
					26770,
					26771,
					26772,
					26773,
					23087
				]
			},
			{
				"speed": 30,
				"name": "Taussig Avenue",
				"nodes": [
					26736,
					26774,
					26775,
					26737
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					26757,
					26776,
					26777,
					26778,
					26779,
					26780,
					26781,
					26782,
					26783,
					26784,
					26758
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					26757,
					26785,
					26786,
					26787,
					26760
				]
			},
			{
				"speed": 25,
				"name": "St Louis Mills Circle",
				"nodes": [
					26727,
					26788,
					26789,
					26737
				]
			},
			{
				"speed": 30,
				"name": "Taussig Avenue",
				"nodes": [
					26790,
					26791,
					26792,
					26793,
					26794,
					26795,
					26746
				]
			},
			{
				"speed": 30,
				"name": "Taussig Avenue",
				"nodes": [
					14012,
					26796,
					26797,
					26798,
					26799
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13556,
					26800,
					26801,
					26802,
					26803,
					26804,
					26805,
					26806,
					26807,
					26808,
					13787
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13792,
					26809,
					26810,
					26811,
					23077
				]
			},
			{
				"speed": 25,
				"name": "Ferguson Lane",
				"nodes": [
					7934
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					26741,
					26812,
					26813,
					26814,
					26815,
					26816,
					26817,
					26751
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13784,
					26818,
					26819,
					26820,
					26821,
					26822,
					26823,
					26824,
					26775
				]
			},
			{
				"speed": 30,
				"name": "Missouri Bottom Road",
				"nodes": [
					13666,
					26825,
					10064
				]
			},
			{
				"speed": 30,
				"name": "Missouri Bottom Road",
				"nodes": [
					13243,
					26826,
					13666
				]
			},
			{
				"speed": 50,
				"name": "?",
				"nodes": [
					13545,
					26827,
					26828,
					26829,
					13207
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					14004,
					26712
				]
			},
			{
				"speed": 30,
				"name": "Taussig Avenue",
				"nodes": [
					26799,
					26830,
					26831,
					26731
				]
			},
			{
				"speed": 30,
				"name": "Missouri Bottom Road",
				"nodes": [
					10064,
					13686
				]
			},
			{
				"speed": 30,
				"name": "Missouri Bottom Road",
				"nodes": [
					13644,
					13243
				]
			},
			{
				"speed": 30,
				"name": "Taussig Avenue",
				"nodes": [
					26743,
					26832,
					26833,
					26834,
					26835,
					26836,
					26837,
					26838,
					26839,
					26840,
					26841,
					26842,
					26843,
					26844,
					26845,
					26846,
					26847,
					26848,
					26849,
					26790
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					26766,
					26850,
					26851,
					26852,
					26853,
					14026
				]
			},
			{
				"speed": 30,
				"name": "?",
				"nodes": [
					26756,
					26854,
					14006
				]
			},
			{
				"speed": 35,
				"name": "Taussig Avenue",
				"nodes": [
					7930,
					26855,
					26856,
					26857,
					26858,
					26859,
					26860,
					26861,
					26862,
					26863,
					26708
				]
			},
			{
				"speed": 25,
				"name": "Derhake Road",
				"nodes": [
					5167,
					3134
				]
			},
			{
				"speed": 25,
				"name": "?",
				"nodes": [
					26864,
					26865,
					26866,
					26867,
					26868,
					26869,
					26870,
					26871,
					26872,
					26873,
					26874,
					26875,
					26876,
					26877,
					26878,
					26879,
					26880,
					26881,
					26882,
					26883,
					26884,
					26885,
					26886,
					26887,
					26888,
					26889,
					26890,
					26891,
					26892,
					26893,
					26894,
					26895,
					26896,
					26897,
					26769
				]
			}
		]
	};

/***/ }
/******/ ]);