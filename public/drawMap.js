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

module.exports = (canvas, width, height, roads) => {
	canvas.width = width;
	canvas.height = height;

	const T = canvas.getContext('2d');

	const drawRoad = road => {
		T.moveTo(road.nodes[0].screenX, road.nodes[0].screenY);
		road.nodes.forEach(node => T.lineTo(node.screenX, node.screenY));
	};

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

};
