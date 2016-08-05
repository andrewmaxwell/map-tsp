module.exports = {
	entry: "./public/main.js",
	output: {
		path: __dirname,
		filename: "bundle.js"
	},
	module: {
		preLoaders: [
			{
				test: /\.js$/,
				loader: "eslint-loader?{parserOptions:{sourceType:'module'},rules:{indent:[2,'tab'],quotes:[2,'single'],semi:[2,'always'],'no-console':[0]},env:{es6:true,browser:true},extends:'eslint:recommended'}",
				exclude: /node_modules/,
			},
		],
		loaders: []
	}
};
