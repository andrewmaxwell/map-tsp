console.clear();

const screenWidth = window.top.innerWidth;
const pathFinderIterationsPerFrame = 100;
const annealingIterationsPerFrame = 100;
const initialNumPts = 10;
const initialTemperature = 1e5;
const coolingFactor = 1 - 1 / 1000;
const statCanvasHeight = 100;

const OverlayRenderer = require('./overlayRenderer');
const SimulatedAnnealingSolver = require('./solver');
const PathFinder = require('./pathFinder');
const StatGraph = require('./statGraph');
const drawMap = require('./drawMap');
const utils = require('./utils');
const processNodes = require('./processNodes');
const mapData = require('json!./map.json');

window.top.mapData = mapData;

const nodes = processNodes(mapData, screenWidth);

const solver = new SimulatedAnnealingSolver({
	initialTemperature,
	coolingFactor,
	generateNeighbor: utils.reverseRandomSlice,
	getCost: path => path.reduce((sum, pt, i, path) =>  // returns length of path
		sum + pt.paths[path[(i + 1) % path.length].id].cost
	, 0)
});

const scaledMapHeight = Math.floor(mapData.height / mapData.width * screenWidth);
const overlayCanvas = document.getElementById('mainCanvas');
const overlayRenderer = new OverlayRenderer(overlayCanvas, screenWidth, scaledMapHeight);
drawMap(document.getElementById('mapCanvas'), screenWidth, scaledMapHeight, mapData.roads);

const stats = new StatGraph(document.getElementById('statCanvas'), screenWidth, statCanvasHeight);
const annealingGraph = stats.addGraph({color: 'red'});
const temperatureGraph = stats.addGraph({color: 'green'});


let looping = false, pathFinder, selected = [], pathFinding = true;

overlayCanvas.onclick = e => {
	const closest = utils.closestNode(nodes, e.offsetX, e.offsetY);
	closest.selected = !closest.selected;
	initSolve();
};

const initSolve = () => {
	window.top.selected = selected = nodes.filter(n => n.selected);
	overlayRenderer.draw({selected, nodes, solver});

	pathFinding = true;
	delete solver.currentState; // just so it's not drawn

	pathFinder = new PathFinder(nodes, selected);
	looping = true;
	stats.reset();
	overlayRenderer.draw();
};

for (let i = 0; i < initialNumPts; i++){
	nodes[Math.floor((i + 0.5) / initialNumPts * nodes.length)].selected = true;
}
initSolve();

const loop = () => {
	requestAnimationFrame(loop);
	if (looping){

		if (pathFinding){
			for (let i = 0; i < pathFinderIterationsPerFrame; i++){
				if (!pathFinder.iterate()){
					if (selected.length > 2){
						solver.init(selected);
						pathFinding = false;
					} else looping = false;
					break;
				}
			}
		} else {
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
		stats.draw();
	}
};

loop();

window.onkeypress = e => {
	if (e.code == 'Space'){
		e.preventDefault();
		nodes.forEach(n => delete n.selected);
		initSolve();
	}
};

window.onerror = () => looping = false;
