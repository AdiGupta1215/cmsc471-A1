const margin = { top: 80, right: 60, bottom: 60, left: 100 };
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;
// The margin code above

const t = 50; // 1000ms = 1 second

// The margin code above
let targetDate;
let statePaths; 
let colorScale;
let allData = []
const stateNameMap = {
  "AL": "Alabama",
  "AK": "Alaska",
  "AZ": "Arizona",
  "AR": "Arkansas",
  "CA": "California",
  "CO": "Colorado",
  "CT": "Connecticut",
  "DE": "Delaware",
  "FL": "Florida",
  "GA": "Georgia",
  "HI": "Hawaii",
  "ID": "Idaho",
  "IL": "Illinois",
  "IN": "Indiana",
  "IA": "Iowa",
  "KS": "Kansas",
  "KY": "Kentucky",
  "LA": "Louisiana",
  "ME": "Maine",
  "MD": "Maryland",
  "MA": "Massachusetts",
  "MI": "Michigan",
  "MN": "Minnesota",
  "MS": "Mississippi",
  "MO": "Missouri",
  "MT": "Montana",
  "NE": "Nebraska",
  "NV": "Nevada",
  "NH": "New Hampshire",
  "NJ": "New Jersey",
  "NM": "New Mexico",
  "NY": "New York",
  "NC": "North Carolina",
  "ND": "North Dakota",
  "OH": "Ohio",
  "OK": "Oklahoma",
  "OR": "Oregon",
  "PA": "Pennsylvania",
  "RI": "Rhode Island",
  "SC": "South Carolina",
  "SD": "South Dakota",
  "TN": "Tennessee",
  "TX": "Texas",
  "UT": "Utah",
  "VT": "Vermont",
  "VA": "Virginia",
  "WA": "Washington",
  "WV": "West Virginia",
  "WI": "Wisconsin",
  "WY": "Wyoming"
};

// Create SVG
const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

function parseNum(value) {
    return value === "" ? undefined : +value;
}    
    
function init(){
    //replace with dataset
    console.log("Init is running");
    d3.csv("./data/weather.csv", 
         // this is the callback function, applied to each item in the array
        d=>({  
        // Besides converting the types, we also simpilify the variable names here. 
        state: stateNameMap[d.state],
        station: d.station,
        date: new Date(
        +d.date.slice(0, 4),      // year
        +d.date.slice(4, 6) - 1,  // month (subtract 1!)
        +d.date.slice(6, 8)        // day
    ),
        min_temp:  parseNum(d.TMIN), 
        max_temp: parseNum(d.TMAX), 
        avg_temp: parseNum(d.TAVG), 
        avg_wind: parseNum(d.AWND),
        fast5_wind_speed: parseNum(d.WSF5),
        fast5_wind_direction: parseNum(d.WDF5)

        }))

    .then(data => {
            console.log(data)
            allData = data.filter(d => d.avg_temp !== undefined && d.avg_temp > -60);

            //new listeners
            colorScale = d3.scaleSequential(d3.interpolateRdYlBu)
                .domain([
                110,
                0
                ]);

            setupSelector()
            setupMap()
        })

    .catch(error => console.error('Error loading data:', error));
}

function setupSelector(){
  // Handles UI changes (sliders, dropdowns)
  // Anytime the user tweaks something, this function reacts.
  // May need to call updateAxes() and updateVis() here when needed!
    //const minDate = d3.min(allData, d=>d.date);
    //const maxDate = d3.max(allData, d=>d.date);
    const uniqueDates = Array.from(new Set(allData.map(d => +d.date)))
                         .map(d => new Date(d));
    targetDate = uniqueDates[0]
    var slider = d3.sliderBottom()
    .min(uniqueDates[0])
    .max(uniqueDates[uniqueDates.length-1])
    .step(null)  
    .width(width-60)
    .displayFormat(d3.timeFormat("%Y-%m-%d"))
    .displayValue(true)
    .on('onchange', val => {
      targetDate = val;                      // val is a Date object
      updateVis();
    });

  d3.select('#slider')
    .append('svg')
    .attr('width', width) 
    .attr('height', 100)
    .append('g')
    .attr('transform', 'translate(30,30)')
    .call(slider);
}

function setupMap(){
    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then(usData => {
        const statesGeo = topojson.feature(usData, usData.objects.states);

        const projection = d3.geoAlbersUsa()
            .fitSize([width, height], statesGeo);

        const path = d3.geoPath().projection(projection);

        statePaths = svg.selectAll("path")
            .data(statesGeo.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", "#eee")
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5)
            .on('mouseover', function (event, d) {
             // See the data point in the console for debugging
             d3.select('#tooltip')
                // if you change opacity to hide it, you should also change opacity here
                .style("display", 'block') // Make the tooltip visible
                .html( // Change the html content of the <div> directly
                `<strong>${d.properties.name}</strong> <br/>
                avgTemp: ${d.avgTemp.toFixed(1)} ºF`
                )
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY + 10) + "px");
             d3.select(this) // Refers to the hovered circle
                .style('stroke', 'black')
                .style('stroke-width', "1.5px")
            })
            .on("mouseout", function (event, d) {
                d3.select('#tooltip')
                //placeholder: hide it
                .style('display', 'none')
                d3.select(this)
                .attr("stroke", "#333")
                .style('stroke-width', 0.5)
            })
         

        updateVis();
    });

}
function updateVis(){
    const filteredData = allData.filter(d => 
        d.date.getFullYear() === targetDate.getFullYear() &&
        d.date.getMonth() === targetDate.getMonth() &&
        d.date.getDate() === targetDate.getDate()
    );
 // Group by state and compute average if multiple entries exist

    const dataByState = d3.rollup(
        filteredData,
        v => d3.mean(v, d => d.avg_temp), // average temperature
        d => d.state
    );
    console.log(filteredData.filter(d=>d.state== "New York"))

    svg.selectAll("path")
        .each(function(d) {
            const avgTemp = dataByState.get(d.properties.name); // get the avg temp for this state
            if (avgTemp !== undefined) {
                // update color if data exists
                d.color = colorScale(avgTemp);
                d.avgTemp = avgTemp
                d3.select(this)
                  .transition(t)
                  .attr("fill", d.color);
            } else if (d.color) {
                // keep previous color if no data
                d3.select(this)
                  .transition(t)
                  .attr("fill", d.color);
            }
            // else leave as default (initial fill)
        });
}



window.addEventListener('load', init);