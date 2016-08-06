console.clear();

const screenWidth = 2000;

const MapRenderer = require('./mapRenderer');
const SimulatedAnnealingSolver = require('./solver');
const utils = require('./utils');
const findPath = require('./findPath');
const mapData = require('json!./map.json');

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const mapRenderer = new MapRenderer(canvas);

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

mapRenderer.update({
	width: screenWidth,
	height: Math.floor(mapData.height / mapData.width * screenWidth),
	roads: mapData.roads.map(road =>
		road.map(id => nodes[id])
	)
});

canvas.onclick = e => {
	const closest = utils.closestNode(nodes, e.offsetX, e.offsetY);
	closest.selected = !closest.selected;

	const solution = findPath(nodes, solver);

	const solutionPath = [];
	if (solution.length > 1){
		solution.forEach((node, i) => {
			const n = (i + 1) % solution.length;
			const subPath = node.paths[solution[n].id].path;
			solutionPath.push.apply(solutionPath, subPath[0] != node ? subPath.reverse() : subPath);
		});
	}

	mapRenderer.update({selected: solution, path: solutionPath});
};
