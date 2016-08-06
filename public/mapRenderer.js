class MapRenderer {
	constructor(canvas){
		this.canvas = canvas;
		this.context = canvas.getContext('2d');
	}
	update(opts){
		Object.keys(opts || {}).forEach(key => this[key] = opts[key]);

		if (opts.width) this.canvas.width = opts.width;
		if (opts.height) this.canvas.height = opts.height;

		this.draw();
	}
	draw(){
		if (!this.width || !this.height) return;

		const T = this.context;

		T.clearRect(0, 0, this.width, this.height);

		if (this.nodes){
			const paths = [];

			T.lineWidth = 0.5;
			T.strokeStyle = 'green';
			T.beginPath();
			this.nodes.forEach(n => {
				if (n.prev){
					T.moveTo(n.x, n.y);
					T.lineTo(n.prev.x, n.prev.y);
				}
				if (n.paths){
					Object.keys(n.paths).forEach(id => {
						paths.push(n.paths[id].path);
					});
				}
			});
			T.stroke();

			if (paths.length){
				T.lineWidth = 2;
				T.strokeStyle = 'blue';
				T.beginPath();
				paths.forEach(path => {
					T.moveTo(path[0].x, path[0].y);
					path.forEach(n => T.lineTo(n.x, n.y));
				});
				T.stroke();
			}
		}

		if (this.selected){
			T.fillStyle = 'blue';
			T.beginPath();
			this.selected.forEach(n => {
				T.rect(n.x - 2.5, n.y - 2.5, 5, 5);
			});
			T.fill();
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
