const IterativeAStarSearch = require('./iterativeAStarSearch');

class IterativePathFinder {
	constructor(nodes, destinations){
		this.nodes = nodes;
		this.destinations = destinations;
		this.currentIndex = 0;
		destinations.forEach(n => n.paths = {});
	}
	iterate(){

		const currentNode = this.destinations[this.currentIndex];
		if (!currentNode) return false;

		this.aStar = this.aStar ||
			new IterativeAStarSearch(this.nodes, currentNode, this.destinations);

		if (!this.aStar.iterate()){
			this.destinations.forEach(d => {
				if (d != currentNode){
					const path = [];
					let current = d;
					while (current){
						path.push(current);
						current = current.prev;
					}
					currentNode.paths[d.id] = {path, cost: d.totalCost};
				}
			});

			for (let i = 0; i < this.nodes.length; i++){
				delete this.nodes[i].prev;
				delete this.nodes[i].visited;
				delete this.nodes[i].fScore;
				delete this.nodes[i].totalCost;
			}

			this.currentIndex++;
			delete this.aStar;
		}
		return true;
	}
}

module.exports = IterativePathFinder;
