const colors = {
	primary_link: '#F00', // red
	motorway_link: '#FF0', // yellow
	residential: 'green', // lime
	tertiary: '#0FF', // cyan
	primary: '#00F', // blue
	secondary: '#F0F', // magenta
	motorway: 'black', // white
	road: 'white', // black
};

class MapRenderer {
	constructor(canvas, opts){
		this.canvas = canvas;
		this.context = this.canvas.getContext('2d');
		this.opts = opts;
	}
	resize(width, height){
		this.canvas.width = width;
		this.canvas.height = height;
		this.draw();
	}
	draw(){

		const T = this.canvas.getContext('2d');
		const roads = this.opts.roads;
		const selected = this.opts.selected;

		const drawRoad = road => {
			T.moveTo(road.nodes[0].screenX, road.nodes[0].screenY);
			road.nodes.forEach(node => T.lineTo(node.screenX, node.screenY));
		};

		T.clearRect(0, 0, this.canvas.width, this.canvas.height);

		if (roads){
			if (roads[0].type){
				roads.forEach(road => {
					T.beginPath();
					T.strokeStyle = colors[road.type];
					T.moveTo(road.nodes[0].screenX, road.nodes[0].screenY);
					road.nodes.forEach(node => T.lineTo(node.screenX, node.screenY));
					T.stroke();
				});
			} else {
				T.lineWidth = 0.25;
				T.strokeStyle = 'white';
				T.beginPath();
				roads.forEach(drawRoad);
				T.stroke();

				// T.strokeStyle = '#F00';
				// T.beginPath();
				// roads.filter(r => r.oneway && r.nodes[0].screenX < r.nodes[r.nodes.length - 1].screenX).forEach(drawRoad);
				// T.stroke();
				//
				// T.strokeStyle = '#00F';
				// T.beginPath();
				// roads.filter(r => r.oneway && r.nodes[0].screenX >= r.nodes[r.nodes.length - 1].screenX).forEach(drawRoad);
				// T.stroke();
			}
		}

		if (selected){
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
		}

	}
}

module.exports = MapRenderer;
