console.clear();

const screenWidth = window.top.innerWidth;
const dijstraIterationsPerFrame = 500;
const annealingIterationsPerFrame = 100;
const initialNumPts = 30;
const statCanvasHeight = 200;

const OverlayRenderer = require('./overlayRenderer');
const SimulatedAnnealingSolver = require('./solver');
const PathFinder = require('./pathFinder');
const StatCanvas = require('./statCanvas');
const drawMap = require('./drawMap');
const utils = require('./utils');
const mapData = require('json!./map.json');

const solver = new SimulatedAnnealingSolver({
	initialTemperature: 1e3,
	coolingFactor: 1 - 1 / 10000,
	getCost: path => path.reduce((cost, pt, i, path) => { // returns length of path
		const n = (i + 1) % path.length;
		return cost + pt.paths[path[n].id].cost;
	}, 0),
	generateNeighbor: utils.reverseRandomSlice
});

const nodes = mapData.nodes.map((node, i) => ({
	id: i,
	x: node[0] / mapData.width * screenWidth,
	y: node[1] / mapData.width * screenWidth,
	neighbors: []
}));

mapData.roads.forEach(road => {
	for (let i = 0; i < road.length - 1; i++){
		let a = nodes[road[i]];
		let b = nodes[road[i + 1]];
		let cost = utils.distance(a, b);
		a.neighbors.push({cost, node: b});
		b.neighbors.push({cost, node: a});
	}
});

const height = Math.floor(mapData.height / mapData.width * screenWidth);
const canvas = document.getElementById('mainCanvas');
const overlayRenderer = new OverlayRenderer(canvas, screenWidth, height);

const statCanvas = new StatCanvas(document.getElementById('statCanvas'), screenWidth, statCanvasHeight);
const annealingGraph = statCanvas.addGraph({color: 'red'});
const temperatureGraph = statCanvas.addGraph({color: 'lime'});

drawMap(document.getElementById('mapCanvas'), screenWidth, height,
	mapData.roads.map(road => road.map(id => nodes[id]))
);

let looping = false, pathFinder, selected = [], state = 0;

canvas.onclick = e => {
	const closest = utils.closestNode(nodes, e.offsetX, e.offsetY);
	closest.selected = !closest.selected;
	initSolve();
};

const initSolve = () => {
	selected = nodes.filter(n => n.selected);
	overlayRenderer.draw({selected, nodes, solver});

	if (selected.length > 1){
		statCanvas.reset();
		pathFinder = new PathFinder(nodes, selected);
		delete solver.currentState;
		looping = true;
		state = 0;
	}
};

for (let i = 0; i < initialNumPts; i++){
	nodes[Math.floor(Math.random() * nodes.length)].selected = true;
}
initSolve();

const loop = () => {
	requestAnimationFrame(loop);
	if (looping){

		if (state == 0){
			for (let i = 0; i < dijstraIterationsPerFrame; i++){
				if (!pathFinder.iterate()){
					if (selected.length > 3){
						solver.init(selected);
						state = 1;
					} else looping = false;
					break;
				}
			}
		} else if (state == 1){
			for (let i = 0; i < annealingIterationsPerFrame; i++){
				if (!solver.iterate()){
					looping = false;
					break;
				};
			}
			annealingGraph.push(solver.currentCost);
			temperatureGraph.push(solver.temperature);
		}
		overlayRenderer.draw();
		statCanvas.draw();
	}
};
loop();

window.onerror = () => looping = false;
