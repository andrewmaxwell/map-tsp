module.exports = (nodes, solver) => {
	var destinations = calculatePaths(nodes);
	if (destinations.length > 3){
		const solution = solver.solve(destinations);

		var max = Math.max.apply(Math, solution.log);
		solution.log.forEach(v => {
			console.log(Array(Math.round(v / max * 100)).fill(0).join(''));
		});

		console.log('solution', solution);
		return solution.solution;
	}
	return destinations;
};

var calculatePaths = nodes => {

	const destinations = nodes.filter(n => n.selected);

	destinations.forEach(n => n.paths = {});

	for (let i = 1; i < destinations.length; i++){
		let n1 = destinations[i];

		dijkstra(nodes, n1, destinations.slice(0, i));

		for (let j = 0; j < i; j++){
			let n2 = destinations[j];
			let path = [n2];
			let current = n2;
			while (current.prev){
				current = current.prev;
				path.push(current);
			}
			let dist = n2.totalDist;
			n1.paths[n2.id] = {path, dist, to: n2};
			n2.paths[n1.id] = {path, dist, to: n1};
		}
	}

	return destinations;
};

var dijkstra = (nodes, start, destinations) => {

	let numLeft = destinations.length;

	nodes.forEach(n => {
		n.totalDist = Infinity;
		n.visited = false;
		delete n.prev;
	});

	const queue = [start];

	start.totalDist = 0;

	while (queue.length){
		let currentIndex = 0;
		for (let i = 1; i < queue.length; i++){
			if (queue[i].totalDist < queue[currentIndex].totalDist){
				currentIndex = i;
			}
		}

		let current = queue[currentIndex];
		current.visited = true;
		queue.splice(currentIndex, 1);

		if (destinations.includes(current)){
			numLeft--;
			if (!numLeft) return;
		}

		for (let i = 0; i < current.neighbors.length; i++){
			let cost = current.neighbors[i].cost;
			let neighbor = current.neighbors[i].node;
			if (neighbor.visited) continue;

			let tentativeDist = current.totalDist + cost;

			if (!queue.includes(neighbor)){
				queue.push(neighbor);
			} else if (tentativeDist >= neighbor.totalDist){
				continue;
			}

			neighbor.prev = current;
			neighbor.totalDist = tentativeDist;
		}
	}
};
