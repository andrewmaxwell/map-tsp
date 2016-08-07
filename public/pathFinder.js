class IterativeDijkstra {
	constructor(nodes, start, destinations){

		this.destinations = destinations;

		nodes.forEach(n => {
			n.totalDist = Infinity;
			n.visited = false;
			delete n.prev;
		});

		this.heuristic = node => {
			let dx = node.x - this.destAverage.x;
			let dy = node.y - this.destAverage.y;
			return node.totalDist + Math.sqrt(dx * dx + dy * dy);
		};

		start.totalDist = 0;
		this.queue = [start];

		this.updateFScores();
	}
	updateFScores(){
		const num = this.destinations.length;
		let sumX = 0, sumY = 0;
		for (let i = 0; i < num; i++){
			sumX += this.destinations[i].x;
			sumY += this.destinations[i].y;
		}
		this.destAverage = {x: sumX / num, y: sumY / num};
		this.queue.forEach(node => {
			this.fScore = this.heuristic(node);
		});
	}
	iterate(){
		if (!this.destinations.length || !this.queue.length) return false;

		let currentIndex = 0;
		for (let i = 0; i < this.queue.length; i++){
			if (this.queue[i].fScore < this.queue[currentIndex].fScore){
				currentIndex = i;
			}
		}

		let current = this.queue[currentIndex];
		current.visited = true;
		this.queue.splice(currentIndex, 1);

		const destinationIndex = this.destinations.indexOf(current);
		if (destinationIndex != -1){
			if (this.destinations.length == 1) return false;
			this.destinations.splice(destinationIndex, 1);
			this.updateFScores();
		}

		for (let i = 0; i < current.neighbors.length; i++){
			let cost = current.neighbors[i].cost;
			let neighbor = current.neighbors[i].node;
			if (neighbor.visited) continue;

			let tentativeDist = current.totalDist + cost;

			if (!this.queue.includes(neighbor)){
				this.queue.push(neighbor);
			} else if (tentativeDist >= neighbor.totalDist){
				continue;
			}

			neighbor.prev = current;
			neighbor.totalDist = tentativeDist;
			neighbor.fScore = this.heuristic(neighbor);
		}

		return true;
	}
};

class IterativePathFinder {
	constructor(nodes, destinations){
		this.nodes = nodes;
		this.destinations = destinations;
		this.currentIndex = 0;
		destinations.forEach(n => n.paths = {});
	}
	iterate(){

		if (this.currentIndex > this.destinations.length - 2) return false;

		this.dijkstra = this.dijkstra || new IterativeDijkstra(
			this.nodes,
			this.destinations[this.currentIndex],
			this.destinations.slice(this.currentIndex + 1)
		);

		const isWorking = this.dijkstra.iterate();

		if (isWorking) return true;
		else {
			const n1 = this.destinations[this.currentIndex];
			for (let j = this.currentIndex + 1; j < this.destinations.length; j++){
				let n2 = this.destinations[j];
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

			this.nodes.forEach(n => {
				delete n.prev;
			});

			this.currentIndex++;
			this.dijkstra = false;
			return true;
		}
	}
}

module.exports = IterativePathFinder;