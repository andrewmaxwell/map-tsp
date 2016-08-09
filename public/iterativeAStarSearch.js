class IterativeAStarSearch {
	constructor(nodes, start, destinations){

		this.destinations = destinations;

		for (let i = 0; i < nodes.length; i++){
			nodes[i].totalDist = Infinity;
			nodes[i].visited = false;
			delete nodes[i].prev;
		}

		start.totalDist = 0;
		this.queue = [start];
		this.updateFScore(start);
	}
	updateFScore(node){
		let minCostSquared = Infinity;
		for (let i = 0; i < this.destinations.length; i++){
			let dx = node.x - this.destinations[i].x;
			let dy = node.y - this.destinations[i].y;
			minCostSquared = Math.min(minCostSquared, dx * dx + dy * dy);
		}
		node.fScore = node.totalDist + Math.sqrt(minCostSquared);
	}
	iterate(){
		if (!this.destinations.length || !this.queue.length) return false;

		let currentIndex = 0;
		for (let i = 1; i < this.queue.length; i++){
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
			for (let j = 0; j < this.queue.length; j++){
				this.updateFScore(this.queue[j]);
			}
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
			this.updateFScore(neighbor);
		}

		return true;
	}
};

module.exports = IterativeAStarSearch;
