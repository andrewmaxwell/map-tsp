const utils = require('./utils');

module.exports = (mapData, screenWidth) => {
	
	const nodes = mapData.nodes.map((node, i) => ({
		id: i,
		x: node[0] / mapData.width * screenWidth,
		y: node[1] / mapData.width * screenWidth,
		neighbors: []
	}));

	mapData.roads.forEach(road => {
		road.nodes = road.nodes.map(id => nodes[id]);
	});

	mapData.roads.forEach(road => {
		for (let i = 0; i < road.nodes.length - 1; i++){
			let a = road.nodes[i];
			let b = road.nodes[i + 1];
			let cost = utils.distance(a, b) / road.speed;
			a.neighbors.push({cost, node: b});
			if (!road.oneway) b.neighbors.push({cost, node: a});
		}
	});

	return nodes;
};
