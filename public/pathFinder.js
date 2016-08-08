const IterativeDijkstra = require('./iterativeDijkstra');

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
				let cost = n2.totalDist;
				n1.paths[n2.id] = {path, cost};
				n2.paths[n1.id] = {path, cost};
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
