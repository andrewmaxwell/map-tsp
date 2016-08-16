const colors = ['red', 'cyan', 'lime', 'yellow', 'magenta'];

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
		const solveState = this.opts.solveState;
		const cursor = this.opts.nodeAtCursor;

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

		if (solveState){
			let colorIndex = 0;
			T.lineWidth = 2;
			T.globalAlpha = 0.5;
			for (let i = 0; i < solveState.paths.length; i++){
				let loop = solveState.paths[i];
				if (loop.length > 1){

					T.strokeStyle = colors[colorIndex % colors.length];
					T.beginPath();
					for (let j = 0; j < loop.length; j++){

						let next = loop[j].paths[loop[(j + 1) % loop.length].id];
						if (next){
							let path = next.path;
							T.moveTo(path[0].screenX, path[0].screenY);
							for (let k = 1; k < path.length; k++){
								T.lineTo(path[k].screenX, path[k].screenY);
							}
						}
					}
					T.stroke();
					colorIndex++;
				}
			}
			T.globalAlpha = 1;
		}

		if (cursor){
			T.fillStyle = 'white';
			T.fillRect(cursor.screenX - 2, cursor.screenY - 2, 4, 4);
			T.fillText(cursor.label, cursor.screenX, cursor.screenY - 10);
		}

	}
}

module.exports = MapRenderer;
