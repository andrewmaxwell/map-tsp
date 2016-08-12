class MapRenderer {
	constructor(canvas){
		this.canvas = canvas;
		this.context = canvas.getContext('2d');
		this.opts = {};
		window.map = this;
	}
	resize(width, height){
		this.canvas.width = width;
		this.canvas.height = height;
		this.draw();
	}
	bind(opts){
		Object.keys(opts).forEach(key => this.opts[key] = opts[key]);
	}
	draw(){
		const T = this.context;
		const nodes = this.opts.nodes;
		// const selected = this.opts.selected;
		const solveState = this.opts.solveState;

		T.clearRect(0, 0, this.canvas.width, this.canvas.height);

		if (nodes){
			T.lineWidth = 0.5;
			T.strokeStyle = '#0F0';
			T.beginPath();
			for (let i = 0; i < nodes.length; i++){
				let n = nodes[i];
				if (n.prev){
					T.moveTo(n.screenX, n.screenY);
					T.lineTo(n.prev.screenX, n.prev.screenY);
				}
			}
			T.stroke();
		}

		// if (selected){
		// 	T.lineWidth = 0.5;
		// 	T.strokeStyle = 'blue';
		// 	T.beginPath();
		// 	selected.forEach(s => {
		// 		selected.forEach(t => {
		// 			let path = s.paths && s.paths[t.id] && s.paths[t.id].path;
		// 			if (path){
		// 				T.moveTo(path[0].screenX, path[0].screenY);
		// 				path.forEach(n => T.lineTo(n.screenX, n.screenY));
		// 			}
		// 		});
		// 	});
		// 	T.stroke();
		//
		// 	T.fillStyle = 'red';
		// 	T.beginPath();
		// 	selected.forEach(n => {
		// 		T.rect(n.screenX - 3, n.screenY - 3, 6, 6);
		// 	});
		// 	T.fill();
		// }


		if (solveState){
			T.lineWidth = 2;
			T.strokeStyle = 'red';
			T.beginPath();
			for (let i = 0; i < solveState.length; i++){
				let next = solveState[i].paths[solveState[(i + 1) % solveState.length].id];
				if (next){
					let path = next.path;
					T.moveTo(path[0].screenX, path[0].screenY);
					for (let j = 1; j < path.length; j++){
						T.lineTo(path[j].screenX, path[j].screenY);
					}
				}
			}
			T.stroke();
		}

	}
}

module.exports = MapRenderer;
