const margin = { top: 80, right: 60, bottom: 60, left: 100 };
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// The margin code above

const t = 1000; // 1000ms = 1 second

// The margin code above

let allData = []


// Create SVG
const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

function init(){
    //replace with dataset
    console.log("Init is running");
    d3.csv("./data/weather.csv", 
         // this is the callback function, applied to each item in the array
        d=>({  
        // Besides converting the types, we also simpilify the variable names here. 
        state: d.state,
        date: new Date(
        +d.date.slice(0, 4),      // year
        +d.date.slice(4, 6) - 1,  // month (subtract 1!)
        +d.date.slice(6, 8)        // day
    ),
        min_temp: +d.TMIN, 
        max_temp: +d.TMAX, 
        avg_temp: +d.TAVG, 
        avg_wind: +d.AWND,
        fast5_wind_speed: +d.WSF5,
        fast5_wind_direction: +d.WDF5
        }))

    .then(data => {
            console.log(data)
            allData = data
            //new listeners
            setupMap()
        })

    .catch(error => console.error('Error loading data:', error));
}


function setupMap(){
    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then(usData => {
        const statesGeo = topojson.feature(usData, usData.objects.states);

        const projection = d3.geoAlbersUsa()
            .fitSize([width, height], statesGeo);

        const path = d3.geoPath().projection(projection);

        svg.selectAll("path")
            .data(statesGeo.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", "#eee")
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5);
    });
}

window.addEventListener('load', init);