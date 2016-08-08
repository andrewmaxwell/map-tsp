module.exports = (canvas, width, height, roads) => {
	canvas.width = width;
	canvas.height = height;

	const T = canvas.getContext('2d');
	T.strokeStyle = 'white';
	T.lineWidth = 0.25;
	T.beginPath();
	roads.forEach(road => {
		T.moveTo(road[0].x, road[0].y);
		road.forEach(node => T.lineTo(node.x, node.y));
	});
	T.stroke();
};
