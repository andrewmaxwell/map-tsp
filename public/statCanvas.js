class StatCanvas {
	constructor(canvas, width, height){
		this.canvas = canvas;
		this.context = this.canvas.getContext('2d');
		this.canvas.width = this.width = width;
		this.canvas.height = this.height = height;
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
		this.reset();
		this.graphs.push(opts);
		return api;
	}
	reset(){
		this.graphs.forEach(type => {
			// type.min = Infinity;
			type.max = -Infinity;
			type.data = [];
		});
	}
	draw(){
		const T = this.context;

		T.clearRect(0, 0, this.width, this.height);
		T.font = 'monospace';

		this.graphs.filter(type => type.data.length).forEach((type, i) => {
			T.fillStyle = T.strokeStyle = type.color;
			T.beginPath();
			for (let i = 0; i < type.data.length; i++){
				// T.lineTo(i / type.data.length * this.width, this.height - (type.data[i] - type.min) / (type.max - type.min) * this.height);
				T.lineTo(i / type.data.length * this.width, this.height - type.data[i] / type.max * this.height);
			}
			T.stroke();

			T.fillText(type.data[type.data.length - 1], 0, this.height - 12 - 10 * i);
			// if (type.strokeStyle) T.stroke();
		});

		T.fillStyle = 'white';
		T.fillText(this.graphs[0].data.length, 0, this.height - 2);
	}
}

module.exports = StatCanvas;
