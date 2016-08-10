console.clear();


const statCanvasHeight = 100;
const coolingFactor = -10;

const params = {
	searchSpeed: 1000,
	annealSpeed: 100,
	initialNumPts: 10
};

const OverlayRenderer = require('./overlayRenderer');
const SimulatedAnnealingSolver = require('./solver');
const PathFinder = require('./pathFinder');
const StatGraph = require('./statGraph');
const drawMap = require('./drawMap');
const utils = require('./utils');
const processNodes = require('./processNodes');
const mapData = require('json!./map.json');

const mapCanvas = document.getElementById('mapCanvas');
const overlayCanvas = document.getElementById('mainCanvas');
const statCanvas = document.getElementById('statCanvas');

const nodes = processNodes(mapData);

const stats = new StatGraph(statCanvas, window.innerWidth, statCanvasHeight);
const annealingGraph = stats.addGraph({color: 'red'});
const temperatureGraph = stats.addGraph({color: 'green'});

let overlayRenderer, pathFinder, solver;
let selected = [];

const IDLE = 0, STARTING = 1, PATHFINDING = 2, SOLVING = 3;
let state = IDLE;

const resize = window.onresize = () => {
	const width = window.innerWidth;

	nodes.forEach(node => {
		node.screenX = node.x * width;
		node.screenY = node.y * width;
	});

	const scaledMapHeight = Math.floor(mapData.height / mapData.width * width);

	overlayRenderer = new OverlayRenderer(overlayCanvas, width, scaledMapHeight);
	drawMap(mapCanvas, width, scaledMapHeight, mapData.roads);

	statCanvas.width = width;
};

const setRandom = () => {
	nodes.forEach(n => delete n.selected);
	for (let i = 0; i < params.initialNumPts; i++){
		nodes[Math.floor((i + 0.4) / params.initialNumPts * nodes.length)].selected = true;
	}
	state = STARTING;
};

const loop = () => {
	requestAnimationFrame(loop);
	if (state == IDLE) return;

	if (state == STARTING){

		window.top.selected = selected = nodes.filter(n => n.selected);

		pathFinder = new PathFinder(nodes, selected);
		solver = new SimulatedAnnealingSolver({
			initialTemperature: selected.length,
			coolingFactor: 1 - Math.exp(coolingFactor),
			generateNeighbor: utils.reverseRandomSlice,
			getCost: path => path.reduce((sum, pt, i, path) =>  // returns length of path
				sum + pt.paths[path[(i + 1) % path.length].id].cost
			, 0)
		});

		stats.reset();
		state = PATHFINDING;
	}

	for (let i = 0; state == PATHFINDING && i < params.searchSpeed; i++){
		if (!pathFinder.iterate()){
			if (selected.length > 2){
				solver.init(selected);
				state = SOLVING;
			} else state = IDLE;
		}
	}

	if (state == SOLVING){
		for (let i = 0; state == SOLVING && i < params.annealSpeed; i++){
			if (!solver.iterate()) state = IDLE;
		}
		annealingGraph.push(solver.currentCost);
		temperatureGraph.push(solver.temperature);
	}

	overlayRenderer.draw(nodes, selected, solver);
	stats.draw();
};

overlayCanvas.onclick = e => {
	const x = e.offsetX / overlayCanvas.width;
	const y = e.offsetY / overlayCanvas.width;
	const closest = utils.closestNode(nodes, x, y);
	closest.selected = !closest.selected;
	state = STARTING;
};

const gui = new window.dat.GUI();
gui.add(params, 'searchSpeed', 1, 10000);
gui.add(params, 'annealSpeed', 1, 1000);
gui.add(params, 'initialNumPts', 0, 100).step(1).onChange(setRandom);
gui.add({
	'Clear All Points': () => {
		nodes.forEach(n => delete n.selected);
		state = STARTING;
	}
}, 'Clear All Points');

window.onerror = () => state = IDLE;
window.onresize = resize;

resize();
setRandom();
loop();
