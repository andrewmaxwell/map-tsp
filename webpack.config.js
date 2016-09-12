module.exports = {
	entry: "./js/main.js",
	output: {
		path: __dirname + '/js',
		filename: "bundle.js"
	},
	module: {
		preLoaders: [
			{
				test: /\.js$/,
				loader: "eslint-loader?{extends:'eslint:recommended',parserOptions:{sourceType:'module'},rules:{indent:[2,'tab'],quotes:[2,'single'],semi:[2,'always'],'no-console':[0],'no-unused-vars':[2]},env:{es6:true,browser:true}}",
				exclude: /node_modules/,
			},
		],
		loaders: [
			{
	      test: /\.js$/,
	      exclude: /(node_modules|bower_components)/,
	      loader: 'babel', // 'babel-loader' is also a legal name to reference
	      query: {
	        presets: ['es2015']
	      }
	    }
		]
	}
};
