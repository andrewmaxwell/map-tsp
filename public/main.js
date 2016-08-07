console.clear();

const screenWidth = 2000;
const dijstraIterationsPerFrame = 100;

const OverlayRenderer = require('./overlayRenderer');
const SimulatedAnnealingSolver = require('./solver');
const PathFinder = require('./pathFinder');
const drawMap = require('./drawMap');
const utils = require('./utils');
const mapData = require('json!./map.json');

const solver = new SimulatedAnnealingSolver({
	initialTemperature: 1,
	coolingFactor: 1 - 1/50000,
	getCost: path => path.reduce((cost, pt, i, path) => { // returns length of path
		const n = (i + 1) % path.length;
		return cost + pt.paths[path[n].id].dist;
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

drawMap(document.getElementById('mapCanvas'), screenWidth, height,
	mapData.roads.map(road => road.map(id => nodes[id]))
);

const canvas = document.getElementById('mainCanvas');
const overlayRenderer = new OverlayRenderer(canvas, screenWidth, height);

let looping = false, pathFinder, selected;
const FPS = 30;

canvas.onclick = e => {

	const closest = utils.closestNode(nodes, e.offsetX, e.offsetY);
	closest.selected = !closest.selected;

	selected = nodes.filter(n => n.selected);
	overlayRenderer.draw({selected, nodes});

	if (selected.length > 1){
		pathFinder = new PathFinder(nodes, selected);
		looping = true;
	}
};

const loop = () => {
	requestAnimationFrame(loop);
	if (looping){
		for (let i = 0; i < dijstraIterationsPerFrame; i++){
			if (!pathFinder.iterate()) looping = false;
		}
		overlayRenderer.draw();
	}
};
loop();

window.onerror = () => looping = false;
