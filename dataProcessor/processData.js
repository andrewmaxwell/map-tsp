const {closestNode, readJSON, save} = require('./utils');

const jsonLocation = './saint-louis_missouri_roads.geojson';

// boundingBox is a pair of coordinates makes a rectangle, this script only returns what is inside
const boundingBox = [[38.839975, -90.433025], [38.763151, -90.245806]]; // Hazelwood/Florissant, change it to be whatever you want, but don't make it too huge or you might crash the browser

// these are estimated speeds for the different types of roads
// if a road type isn't here, it won't be included in the output
const speeds = {
	primary_link: 30,
	motorway_link: 50,
	residential: 25,
	tertiary: 30,
	primary: 40,
	secondary: 35,
	motorway: 60,
	road: 30
};

readJSON(jsonLocation).then(data => {
	const minCoord = {
		x: Math.min(boundingBox[0][1], boundingBox[1][1]),
		y: Math.min(boundingBox[0][0], boundingBox[1][0])
	};
	const maxCoord = {
		x: Math.max(boundingBox[0][1], boundingBox[1][1]),
		y: Math.max(boundingBox[0][0], boundingBox[1][0])
	};

	let roads = data.features.filter(f =>
		speeds[f.properties.type] !== undefined
	).map(f => ({
		// type: f.properties.type, // uncomment this line to include the type name. The UI will automatically color code the roads by type.
		// oneway: f.properties.oneway || undefined, // the oneway data is crap, don't use it
		speed: speeds[f.properties.type] || 30,
		name: f.properties.name || '?',
		nodes: f.geometry.coordinates.filter(c =>
			c[0] > minCoord.x &&
			c[0] < maxCoord.x &&
			c[1] < maxCoord.y &&
			c[1] > minCoord.y
		)
	})).filter(r => r.nodes.length);

	// find the unique nodes
	const nodeIndex = {}
	let nodes = [];
	roads.forEach(road => {
		road.nodes.forEach(node => {
			const str = node.toString();
			if (!nodeIndex[str]){
				nodeIndex[str] = node;
				nodes.push(node);
				node.neighbors = [];
			}
		});
	});

	// replace copies with references to unique nodes from nodeIndex
	roads.forEach(road => {
		road.nodes.forEach((node, i) => {
			road.nodes[i] = nodeIndex[node.toString()];
		});
	});

	roads.forEach(road => {
		const n = road.nodes;
		for (let i = 0; i < n.length - 1; i++){
			n[i].neighbors.push(n[i + 1]);
			n[i + 1].neighbors.push(n[i]);
			// if (!road.oneway) n[i + 1].neighbors.push(n[i]); // the oneway data is crap, don't use it
		}
	});

	// starting from a central node, search outward marking nodes as attached
	const middleNode = closestNode(nodes, [
		(maxCoord.x + minCoord.x) / 2,
		(maxCoord.y + minCoord.y) / 2
	]);
	const queue = [middleNode];
	while (queue.length){
		let node = queue.pop();
		node.attached = true;
		for (let i = 0; i < node.neighbors.length; i++){
			if (!node.neighbors[i].attached) queue.push(node.neighbors[i]);
		}
	};

	// removed any that are not attached
	nodes = nodes.filter(n => n.attached);

	// give each node an id that is its index in the nodes array
	nodes.forEach((node, i) => node.id = i);

	// removed unattached nodes from roads and replace the nodes with their ids
	roads.forEach(road => {
		road.nodes = road.nodes.filter(node => node.attached).map(node => node.id);
	});

	// remove any roads without nodes (removed in previous step)
	roads = roads.filter(road => road.nodes.length);

	// normalize node coordinates to be between 0 and width, then round. This will keep the filesize small
	const width = 10000;
	const mult = (width - 1) / (maxCoord.x - minCoord.x);
	nodes.forEach(node => {
		node[0] = Math.round(mult * (node[0] - minCoord.x));
		node[1] = Math.round(mult * (maxCoord.y - node[1]));
	});

	// save the result in the public folder
	return save('../js/map.json', JSON.stringify({
		width,
		height: Math.round((maxCoord.y - minCoord.y) * mult),
		nodes: nodes.map(n => n.join(',')).join(';'),
		roads
	}));

}).catch(err => console.error(err));
