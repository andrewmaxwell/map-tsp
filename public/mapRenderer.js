class MapRenderer {
	constructor(canvas){
		this.canvas = canvas;
	}
	update(opts){
		Object.keys(opts || {}).forEach(key => this[key] = opts[key]);
		this.draw();
	}
	draw(){
		if (!this.width || !this.height) return;

		const T = this.canvas.getContext('2d');
		this.canvas.width = this.width;
		this.canvas.height = this.height;

		T.lineWidth = 0.25;
		T.strokeStyle = 'black';
		T.beginPath();

		// (this.edges || []).forEach(edge => {
		// 	T.moveTo(edge[0].x, edge[0].y);
		// 	T.lineTo(edge[1].x, edge[1].y);
		// });

		// console.log('mapRenderer', this);

		(this.roads || []).forEach(road => {
			T.moveTo(road[0].x, road[0].y);
			road.forEach(node => T.lineTo(node.x, node.y));
		});
		T.stroke();
		//
		T.fillStyle = 'blue';
		T.beginPath();
		(this.selected || []).forEach(n => {
			T.rect(n.x - 2.5, n.y - 2.5, 5, 5);
		});
		T.fill();

		T.lineWidth = 1;
		T.strokeStyle = 'red';
		T.beginPath();
		(this.path || []).forEach(n =>
			T.lineTo(n.x, n.y)
		);
		T.stroke();

	}
}

module.exports = MapRenderer;
