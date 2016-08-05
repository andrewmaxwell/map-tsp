class SimulatedAnnealingSolver {
	constructor(opts){
		this.opts = opts;
	}
	init(initialState){
		this.temperature = this.opts.initialTemperature;
		this.currentState = this.bestState = initialState;
		this.minCost = this.maxCost = this.currentCost = this.opts.getCost(this.currentState);
	}
	iterate(){
		let neighbor = this.opts.generateNeighbor(this.currentState);
		let neighborCost = this.opts.getCost(neighbor);
		let costDelta = neighborCost - this.currentCost;
		if (costDelta <= 0 || Math.random() < Math.exp(-costDelta / this.temperature)){
			this.currentState = neighbor;
			this.currentCost = neighborCost;
			if (this.currentCost < this.minCost){
				this.bestState = this.currentState;
				this.minCost = this.currentCost;
			}
			this.maxCost = Math.max(this.maxCost, this.currentCost);
		}
		this.temperature *= this.opts.coolingFactor;
	}
	solve(initialState){
		const log = [];

		this.init(initialState);

		for (let i = 0; i < 1e6 && this.temperature > 1 - this.opts.coolingFactor; i++){
			this.iterate();
			if (i % 1000 === 0) log.push(this.currentCost);
		}

		return {
			solution: this.bestState,
			cost: this.minCost,
			log
		};
	}
}

module.exports = SimulatedAnnealingSolver;
