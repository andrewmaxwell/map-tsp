const fs = require('fs');

const closestNode = (nodes, coord) => {
	let closestNode;
	let minDist = Infinity;
	nodes.forEach(node => {
		let dx = node[0] - coord[0];
		let dy = node[1] - coord[1];
		let sqDist = dx * dx + dy * dy;
		if (sqDist < minDist){
			minDist = sqDist;
			closestNode = node;
		}
	});
	return closestNode;
};

const readJSON = filename => new Promise((resolve, reject) => {
	fs.readFile(filename, (err, data) => {
		if (err) reject(err);
		else {
			try {
				resolve(JSON.parse(data));
			} catch (e){
				reject(e);
			}
		}
	});
});

const save = (filename, data) => new Promise((resolve, reject) => {
	fs.writeFile(filename, data, err => {
		if (err) reject(err);
		else resolve(data);
	});
});

module.exports = {closestNode, readJSON, save};
