const $ = require('jquery');

class Neo4jConnection {
	constructor(host, login){
		this.host = host;
		this.headers = {
			Authorization: 'Basic ' + btoa(login),
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		};
	}

	getAllRelationships(){
		return $.post({
			url: this.host + 'db/data/transaction/commit',
			data: JSON.stringify({
				statements: [{statement: 'MATCH (a)-[]->(b) RETURN a,b'}]
			}),
			headers: this.headers,
			dataType: 'json'
		}).then(data => data.results[0].data.map(el => {
			el.row[0].id = el.meta[0].id;
			el.row[1].id = el.meta[1].id;
			return el.row;
		}));
	}

	// dijkstra(id1, id2){
	//   return $.ajax({
	//     method: 'POST',
	//     url: this.host + 'db/data/node/' + id1 + '/path',
	//     data: {
	//       to: this.host + 'db/data/node/' + id2,
	//       cost_property: 'cost',
	//       relationships: {
	//         type: 'road',
	//         direction: 'all'
	//       },
	//       algorithm: 'dijkstra'
	//     },
	//     headers: this.login
	//   }).then(response => response.data);
	// }
}

module.exports = Neo4jConnection;
