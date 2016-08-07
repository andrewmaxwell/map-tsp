class MapRenderer {
	constructor(canvas, width, height){
		this.canvas = canvas;
		this.canvas.width = width;
		this.canvas.height = height;
		this.context = canvas.getContext('2d');
	}
	draw(opts){
		if (opts){
			Object.keys(opts).forEach(key => this[key] = opts[key]);
		}

		const T = this.context;

		T.clearRect(0, 0, this.canvas.width, this.canvas.height);

		if (this.nodes){
			const paths = [];

			T.lineWidth = 0.5;
			T.strokeStyle = 'green';
			T.beginPath();
			for (let i = 0; i < this.nodes.length; i++){
				let n = this.nodes[i];
				if (n.prev){
					T.moveTo(n.x, n.y);
					T.lineTo(n.prev.x, n.prev.y);
				}
			}
			T.stroke();
		}

		if (this.selected){
			T.fillStyle = 'blue';
			T.beginPath();
			this.selected.forEach(n => {
				T.rect(n.x - 2.5, n.y - 2.5, 5, 5);
			});
			T.fill();

			T.lineWidth = 0.5;
			T.strokeStyle = 'blue';
			T.beginPath();
			this.selected.filter(s => s.paths).forEach(s => {
				Object.keys(s.paths).forEach(id => {
					const path = s.paths[id].path;
					T.moveTo(path[0].x, path[0].y);
					path.forEach(n => T.lineTo(n.x, n.y));
				});
			});
			T.stroke();
		}

		// if (this.path){
		// 	T.lineWidth = 1;
		// 	T.strokeStyle = 'red';
		// 	T.beginPath();
		// 	this.path.forEach(n => T.lineTo(n.x, n.y));
		// 	T.stroke();
		// }

	}
}

module.exports = MapRenderer;
