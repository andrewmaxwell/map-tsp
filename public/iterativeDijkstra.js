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

module.exports = IterativeDijkstra;
