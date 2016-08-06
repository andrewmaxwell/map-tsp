module.exports = opts => {
	opts.canvas.width = opts.width;
	opts.canvas.height = opts.height;

	const T = opts.canvas.getContext('2d');
	T.lineWidth = 0.25;
	T.beginPath();
	opts.roads.forEach(road => {
		T.moveTo(road[0].x, road[0].y);
		road.forEach(node => T.lineTo(node.x, node.y));
	});
	T.stroke();
};
