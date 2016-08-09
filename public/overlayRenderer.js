class MapRenderer {
	constructor(canvas, width, height){
		this.canvas = canvas;
		this.canvas.width = width;
		this.canvas.height = height;
		this.context = canvas.getContext('2d');
		window.map = this;
	}
	draw(opts){
		if (opts){
			Object.keys(opts).forEach(key => this[key] = opts[key]);
		}

		const T = this.context;

		T.clearRect(0, 0, this.canvas.width, this.canvas.height);

		if (this.nodes){

			T.lineWidth = 0.5;
			T.strokeStyle = '#0F0';
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
			T.lineWidth = 0.5;
			T.strokeStyle = 'blue';
			T.beginPath();
			this.selected.forEach(s => {
				this.selected.forEach(t => {
					let path = s.paths && s.paths[t.id] && s.paths[t.id].path;
					if (path){
						T.moveTo(path[0].x, path[0].y);
						path.forEach(n => T.lineTo(n.x, n.y));
					}
				});
			});
			T.stroke();

			T.fillStyle = 'red';
			T.beginPath();
			this.selected.forEach(n => {
				T.rect(n.x - 3, n.y - 3, 6, 6);
			});
			T.fill();

		}

		let s = this.solver && this.solver.currentState;
		if (s){
			T.lineWidth = 2;
			T.strokeStyle = 'red';
			T.beginPath();
			for (let i = 0; i < s.length; i++){
				let next = s[i].paths[s[(i + 1) % s.length].id];
				if (next){
					let path = next.path;
					T.moveTo(path[0].x, path[0].y);
					for (let j = 1; j < path.length; j++){
						T.lineTo(path[j].x, path[j].y);
					}
				}
			}
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
