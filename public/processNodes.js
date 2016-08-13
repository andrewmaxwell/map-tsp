const utils = require('./utils');

module.exports = mapData => {

	const nodes = mapData.nodes.split(';').map((node, i) => {
		const [x, y] = node.split(',');
		return {
			id: i,
			x: x / mapData.width,
			y: y / mapData.width,
			neighbors: [],
			roads: []
		};
	});

	mapData.roads.forEach(road => {
		road.nodes = road.nodes.map(id => nodes[id]);
		road.nodes.forEach(n => {
			n.roads.push(road);
		});
	});

	nodes.forEach(n => {
		n.label = n.roads.map(r => `${r.name} (${r.speed})`).unique().join(', ');
		delete n.roads;
	});

	mapData.roads.forEach(road => {
		for (let i = 0; i < road.nodes.length - 1; i++){
			let a = road.nodes[i];
			let b = road.nodes[i + 1];
			let cost = utils.distance(a, b) / road.speed * 60;
			a.neighbors.push({cost, node: b});
			if (!road.oneway) b.neighbors.push({cost, node: a});
		}
	});

	// var queue = [nodes[Math.floor(Math.random() * nodes.length)]];
	// console.log(nodes);
	// while (queue.length){
	// 	var current = queue.pop();
	// 	current.attached = true;
	// 	current.neighbors.forEach(n => {
	// 		if (!n.node.attached) queue.push(n.node);
	// 	});
	// }
	// console.log('unattached', nodes.filter(n => !n.attached));

	return nodes;
};
