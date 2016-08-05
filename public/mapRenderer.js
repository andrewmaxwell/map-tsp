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
		(this.edges || []).forEach(edge => {
			T.moveTo(edge[0].screenX, edge[0].screenY);
			T.lineTo(edge[1].screenX, edge[1].screenY);
		});
		T.stroke();

		T.fillStyle = 'blue';
		T.beginPath();
		(this.selected || []).forEach(n => {
			T.rect(n.screenX - 2.5, n.screenY - 2.5, 5, 5);
		});
		T.fill();

		T.lineWidth = 1;
		T.strokeStyle = 'red';
		T.beginPath();
		(this.path || []).forEach(n =>
			T.lineTo(n.screenX, n.screenY)
		);
		T.stroke();

	}
}

module.exports = MapRenderer;
