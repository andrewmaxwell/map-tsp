Here's my Traveling Salesman UI with Hazelwood/Florissant loaded in (my part of town, easier to debug when I know the roads)

https://andrewmaxwell.github.io/map-tsp/

Click anywhere to place a destination. As soon as you place more than one destination, it will find the shortest path between each pair of destinations. After that, if there are more than two points it will find the shortest path that visits each point in a circle.

* The green lines are a visualization of the search algorithm.
* The blue lines are shortest paths between pairs of points.
* The red line is the shortest path that visits every point and returns to the beginning.

There is a mini-GUI in the upper right:
* searchSpeed: how many path searching iterations per frame. Make it slow if you like to watch, or fast if you have a lot of points and are tired of watching.
* annealSpeed: how many annealing iterations per frame.
* coolingFactor: A multiplier for how slowly to narrow in on the shortest path. Higher is slower but theoretically it might get a better solution.
* randomPoints: generate some random destinations, crank it up and see what happens. You'll want to crank up searchSpeed too or you'll be sitting there forever.



The data is from Mapzen: https://mapzen.com/data/metro-extracts/metro/saint-louis_missouri/

However, that is too much data for the UI. The roads layer from the IMPOSM GEOJSON files is 93mb, so I wrote a script to trim it down to just what I want. The data file and script to process it are in the dataProcessor directory. Run processData.js to read the geojson file and output the trimmed down version to public/map.json. There are variables at the top of processData.js you can mess with to get a different map if you want.

To install and run:
```
npm install webpack webpack-dev-server -g
npm install
npm run dev
```

Then go to http://localhost:8080/webpack-dev-server/

The webpack dev server automatically refreshes when it detects a file change in the public folder.
