console.clear();

const statCanvasHeight = 100;

const params = {
	searchSpeed: 10000,
	annealSpeed: 1000,
	coolingFactor: 300,
	randomPoints: 50,
	numSalesmen: 5
};

const OverlayRenderer = require('./overlayRenderer');
const SimulatedAnnealingSolver = require('./solver');
const PathFinder = require('./pathFinder');
const StatGraph = require('./statGraph');
const MapRenderer = require('./mapRenderer');
const utils = require('./utils');
const processNodes = require('./processNodes');
const mapData = require('json!./map.json');

const mapCanvas = document.getElementById('mapCanvas');
const overlayCanvas = document.getElementById('mainCanvas');
const statCanvas = document.getElementById('statCanvas');

const nodes = processNodes(mapData);

const IDLE = 0, STARTING = 1, PATHFINDING = 2, SOLVING = 3;
let state = IDLE, selected = [];

const mapRenderer = new MapRenderer(mapCanvas, {roads: mapData.roads, selected});
const overlayRenderer = new OverlayRenderer(overlayCanvas);
const stats = new StatGraph(statCanvas);
const annealingGraph = stats.addGraph({color: 'red'});
const temperatureGraph = stats.addGraph({color: 'green'});

const pathFinder = new PathFinder({
	onPathFound: () => mapRenderer.draw()
});

const solver = new SimulatedAnnealingSolver({
	generateNeighbor: current => {

		const paths = current.paths.slice(0);

		if (paths.length < 2 || Math.random() < 0.5){
			const pathIndex = utils.rand(paths.length);
			paths[pathIndex] = utils.reverseRandomSlice(paths[pathIndex]);
		} else {
			let pathIndex1, pathIndex2;
			do {
				pathIndex1 = utils.rand(paths.length);
			} while (paths[pathIndex1].length < 2);
			do {
				pathIndex2 = utils.rand(paths.length);
			} while (pathIndex1 == pathIndex2);

			const path1 = paths[pathIndex1] = paths[pathIndex1].slice(0);
			const path2 = paths[pathIndex2] = paths[pathIndex2].slice(0);

			let elementIndex;
			do {
				elementIndex = utils.rand(path1.length);
			} while (path1[elementIndex] == current.base);

			path2.push(path1.splice(elementIndex, 1)[0]);
		}
		return {base: current.base, paths};
	},
	getCost: current => {
		const paths = current.paths;
		let total = 0;
		let maxCost = -Infinity;
		// let costs = [];
		for (let i = 0; i < paths.length; i++){
			let path = paths[i];
			if (path.length > 1){
				let cost = 0;
				for (let j = 0; j < path.length; j++){
					cost += path[j].paths[path[(j + 1) % path.length].id].cost;
				}
				// costs[i] = cost;
				total += cost;
				maxCost = Math.max(maxCost, cost);
			}
		}
		// return total;
		// return total + utils.standardDeviation(costs);
		return total + maxCost;
	}
});

const initSolver = () => {
	const base = selected[0];
	const initialState = {base, paths: []};
	for (let i = 0; i < params.numSalesmen; i++){
		initialState.paths[i] = [base];
	}
	for (let i = 1; i < selected.length; i++){
		initialState.paths[i % params.numSalesmen].push(selected[i]);
	}
	const initialTemperature = selected.length * params.numSalesmen;
	const coolingFactor = 1 - 1 / params.coolingFactor / initialTemperature;
	solver.init(initialState, initialTemperature, coolingFactor);
};

const resize = window.onresize = () => {
	const width = window.innerWidth;

	nodes.forEach(node => {
		node.screenX = node.x * width;
		node.screenY = node.y * width;
	});

	const scaledMapHeight = Math.floor(mapData.height / mapData.width * width);

	mapRenderer.resize(width, scaledMapHeight);
	overlayRenderer.resize(width, scaledMapHeight);
	stats.resize(width, statCanvasHeight);
};

const loop = () => {
	requestAnimationFrame(loop);
	if (state == IDLE) return;

	if (state == STARTING){
		pathFinder.init(nodes, selected);
		stats.reset();
		mapRenderer.draw();
		overlayRenderer.bind({nodes, solveState: false});
		state = PATHFINDING;
	}

	for (let i = 0; state == PATHFINDING && i < params.searchSpeed; i++){
		if (!pathFinder.iterate()){
			if (selected.length > 2){
				initSolver();
				state = SOLVING;
			} else state = IDLE;
		}
	}

	if (state == SOLVING){
		for (let i = 0; state == SOLVING && i < params.annealSpeed; i++){
			if (!solver.iterate()) state = IDLE;
		}
		annealingGraph(solver.currentCost);
		temperatureGraph(solver.temperature);
		overlayRenderer.bind({solveState: solver.currentState});
	}

	overlayRenderer.draw();
	stats.draw();
};

overlayCanvas.onclick = e => {
	const x = e.offsetX / overlayCanvas.width;
	const y = e.offsetY / overlayCanvas.width;
	const closest = utils.closestNode(nodes, x, y);
	const index = selected.indexOf(closest);
	if (index == -1){
		selected.unshift(closest);
	} else {
		selected.splice(index, 1);
	}
	state = STARTING;
};

overlayCanvas.onmousemove = e => {
	const x = e.offsetX / overlayCanvas.width;
	const y = e.offsetY / overlayCanvas.width;
	overlayRenderer.bind({
		nodeAtCursor: utils.closestNode(nodes, x, y)
	});
	overlayRenderer.draw();
};

const setRandom = () => {
	selected.length = 0;
	for (let i = 0; i < params.randomPoints; i++){
		let n = nodes[Math.floor(Math.random() * nodes.length)];
		if (!selected.includes(n)) selected.push(n);
	}
	state = STARTING;
};

const gui = new window.dat.GUI();
gui.add(params, 'searchSpeed', 1, 10000);
gui.add(params, 'annealSpeed', 1, 1000);
gui.add(params, 'coolingFactor', 10, 1000);
gui.add(params, 'randomPoints', 0, 100).step(1).onChange(setRandom);
gui.add(params, 'numSalesmen', 1, 10).step(1);
gui.add({
	'Clear All Points': () => {
		selected.length = 0;
		state = STARTING;
	}
}, 'Clear All Points');
gui.add({
	Restart: () => {
		state = STARTING;
	}
}, 'Restart');

window.onerror = () => state = IDLE;
window.onresize = resize;
window.top.selected = selected;
window.top.solver = solver;

resize();
setRandom();
loop();
