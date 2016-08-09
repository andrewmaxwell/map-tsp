const IterativeAStarSearch = require('./iterativeAStarSearch');

class IterativePathFinder {
	constructor(nodes, destinations){
		this.nodes = nodes;
		this.destinations = destinations;
		this.currentIndex = 0;
		destinations.forEach(n => n.paths = {});
	}
	iterate(){

		if (this.currentIndex > this.destinations.length - 2) return false;

		this.dijkstra = this.dijkstra || new IterativeAStarSearch(
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
				let path = [];
				let current = n2;
				while (current){
					path.push(current);
					current = current.prev;
				}
				n1.paths[n2.id] = n2.paths[n1.id] = {path, cost: n2.totalDist};
			}

			for (let i = 0; i < this.nodes.length; i++){
				delete this.nodes[i].prev; // just so they aren't drawn
			}

			this.currentIndex++;
			this.dijkstra = false;
			return true;
		}
	}
}

module.exports = IterativePathFinder;
