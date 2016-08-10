class StatGraph {
	constructor(canvas, width, height){
		this.canvas = canvas;
		this.context = this.canvas.getContext('2d');
		this.canvas.width = width;
		this.canvas.height = height;
		this.graphs = [];
	}
	addGraph(opts){
		const api = {
			push: val => {
				// opts.min = Math.min(opts.min, val);
				opts.max = Math.max(opts.max, val);
				opts.data.push(val);
			}
		};

		this.graphs.push(opts);
		this.reset();
		return api;
	}
	reset(){
		this.graphs.forEach(type => {
			// type.min = Infinity;
			type.max = -Infinity;
			type.data = [];
		});
		this.draw();
	}
	draw(){
		const T = this.context;
		const W = this.canvas.width;
		const H = this.canvas.height;

		T.clearRect(0, 0, W, H);
		T.font = 'monospace';

		this.graphs.filter(type => type.data.length).forEach((type, i) => {
			T.fillStyle = T.strokeStyle = type.color;
			T.beginPath();
			for (let i = 0; i < type.data.length; i++){
				T.lineTo(i / type.data.length * W, H - type.data[i] / type.max * H);
			}
			T.stroke();

			T.fillText(type.data[type.data.length - 1], 0, H - 12 - 10 * i);
			// if (type.strokeStyle) T.stroke();
		});

		T.fillStyle = 'white';
		T.fillText(this.graphs[0].data.length, 0, H - 2);
	}
}

module.exports = StatGraph;
