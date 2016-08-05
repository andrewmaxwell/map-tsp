const $ = require('jquery');
const MapRenderer = require('./mapRenderer');
const SimulatedAnnealingSolver = require('./solver');
const utils = require('./utils');
const Neo4jConnection = require('./neo4j');
const findPath = require('./findPath');

const width = 2000;
const neo4j = new Neo4jConnection('http://localhost:7474/', 'neo4j:4dm1n');

const nodes = [];

const canvas = $('#C');
const mapRenderer = new MapRenderer(canvas[0]);

const solver = new SimulatedAnnealingSolver({
	initialTemperature: 1,
	coolingFactor: 1 - 1/50000,
	getCost: path => path.reduce((cost, pt, i, path) => { // returns length of path
		const n = (i + 1) % path.length;
		return cost + pt.paths[path[n].id].dist;
	}, 0),
	generateNeighbor: utils.reverseRandomSlice
});

console.log('NEXT TO DO, DITCH NEO4J');

neo4j.getAllRelationships().then(edges => {

	// get all nodes, index them and keep the unique ones
	const nodeIndex = {};
	[].concat.apply([], edges).forEach(node => {
		if (!nodeIndex[node.id]){
			nodeIndex[node.id] = node;
			nodes.push(node);
		}
	});

	// scale nodes from 0 - width
	const bb = utils.boundingBox(nodes);
	const mult = width / (bb.max.x - bb.min.x);
	const height = (bb.max.y - bb.min.y) * mult;
	nodes.forEach(node => {
		node.screenX = (node.x - bb.min.x) * mult;
		node.screenY = (bb.max.y - node.y) * mult;
		node.neighbors = [];
	});

	// store all nieghbors with cost
	edges.forEach(edge => {
		const a = edge[0] = nodeIndex[edge[0].id];
		const b = edge[1] = nodeIndex[edge[1].id];
		const cost = utils.distance(a, b);
		a.neighbors.push({cost, node: b});
		b.neighbors.push({cost, node: a});
	});

	mapRenderer.update({width, height, edges});
}).catch(err => {
	$('#error').text(err.readyState ? JSON.stringify(err) : 'Neo4j not found!');
});

canvas.on('click', e => {
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
});
