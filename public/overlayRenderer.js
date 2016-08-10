class MapRenderer {
	constructor(canvas, width, height){
		this.canvas = canvas;
		this.canvas.width = width;
		this.canvas.height = height;
		this.context = canvas.getContext('2d');
		window.map = this;
	}
	draw(nodes, selected, solver){

		const T = this.context;

		T.clearRect(0, 0, this.canvas.width, this.canvas.height);

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



		T.lineWidth = 0.5;
		T.strokeStyle = 'blue';
		T.beginPath();
		selected.forEach(s => {
			selected.forEach(t => {
				let path = s.paths && s.paths[t.id] && s.paths[t.id].path;
				if (path){
					T.moveTo(path[0].screenX, path[0].screenY);
					path.forEach(n => T.lineTo(n.screenX, n.screenY));
				}
			});
		});
		T.stroke();

		T.fillStyle = 'red';
		T.beginPath();
		selected.forEach(n => {
			T.rect(n.screenX - 3, n.screenY - 3, 6, 6);
		});
		T.fill();



		let s = solver.currentState;
		if (s){
			T.lineWidth = 2;
			T.strokeStyle = 'red';
			T.beginPath();
			for (let i = 0; i < s.length; i++){
				let next = s[i].paths[s[(i + 1) % s.length].id];
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
