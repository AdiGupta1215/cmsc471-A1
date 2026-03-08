const margin = { top: 80, right: 60, bottom: 60, left: 100 };
const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const t = 50; // 1000ms = 1 second

// The margin code above
let targetDate;
let statePaths; 
let colorScale;
let slider;
let allData = []
let selectedState = null;
let selectedMetric = "avg_temp";
let lineSvg;
let lineXScale, lineYScale, linePath, lineXAxis, lineYAxis, lineDateMarker;

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


const metricLabels = {
  avg_temp: "Average Temperature (°F)",
  min_temp: "Minimum Temperature (°F)",
  max_temp: "Maximum Temperature (°F)",
  avg_wind: "Average Wind Speed",
  fast5_wind_speed: "Fastest 5-sec Wind Speed"
};
// Create SVG
const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);


let isPlaying = false;
let playInterval = null;
let uniqueDates = [];
/**
 * Parse a string value into a number.
 * If the string is empty, return undefined.
 * Otherwise, return the parsed number.
 * @param {string} value - The string to parse.
 * @returns {number|undefined} The parsed number, or undefined.
 */
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
            allData = data.filter(d => d.state !== undefined && d.date instanceof Date && !isNaN(d.date));

            setupMetricSelector();
            setupSelector();
            setupPlayButton();
            setupLineChart();
            setupMap();
        })

    .catch(error => console.error('Error loading data:', error));

}




function setupMetricSelector() {
    d3.select('#metricSelector')
        .selectAll('option')
        .data(Object.keys(metricLabels))
        .enter()
        .append('option')
        .attr('value', d => d)
        .text(d => metricLabels[d]);

    d3.select('#metricSelector')
        .property('value', selectedMetric)
        .on('change', function() {
            selectedMetric = d3.select(this).property('value');
            updateVis();
            updateLineChartVis();
        });
    

    // init jQuery nice select
    $(document).ready(function() {
        $('#metricSelector').niceSelect();
    });
}

function setupSelector(){
  // Handles UI changes (sliders, dropdowns)
  // Anytime the user tweaks something, this function reacts.
  // May need to call updateAxes() and updateVis() here when needed!
    //const minDate = d3.min(allData, d=>d.date);
    //const maxDate = d3.max(allData, d=>d.date);
    uniqueDates = Array.from(new Set(allData.map(d => d.date.getTime())))
        .sort((a, b) => a - b)
        .map(ts => new Date(ts));

    if (uniqueDates.length === 0) {
        console.error("No valid dates found.");
        return;
    }

    // targetDate = new Date(uniqueDates[0]);
    targetDate = new Date(uniqueDates[150]);

    slider = d3.sliderBottom()
        .min(uniqueDates[0])
        .max(uniqueDates[uniqueDates.length - 1])
        .step(1000 * 60 * 60 * 24)
        .width(width - 60)
        .tickFormat(d3.timeFormat("%B"))
        .displayFormat(d3.timeFormat("%B"))
        .displayValue(true)
        .default(targetDate)
        .on('onchange', val => {
            targetDate = new Date(val);
            updateVis();
            updateLineChartVis();
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
                `<strong>${d.properties.name}</strong><br/>
                ${metricLabels[selectedMetric]}: ${d.metricValue !== undefined ? d.metricValue.toFixed(1) : "No data"}`
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
            // linking state selection
            .on("click", function(event, d) {
            selectedState = d.properties.name;
            updateStateHighlight();
            updateLineChartVis();
        });
         

        updateVis();
    });

}


function updateStateHighlight() {
    statePaths
        .attr("stroke", d => d.properties.name === selectedState ? "black" : "#333")
        .attr("stroke-width", d => d.properties.name === selectedState ? 2 : 0.5);
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
        v => d3.mean(v, d => d[selectedMetric]), // average temperature
        d => d.state
    );
    console.log(filteredData.filter(d=>d.state== "New York"))


     // only use values that are actually on the map right now
    if (selectedMetric === "avg_temp") {
    colorScale = d3.scaleSequential(d3.interpolateRdYlBu)
        .domain([100, -20]);
}
else if (selectedMetric === "min_temp") {
    colorScale = d3.scaleSequential(d3.interpolateRdYlBu)
        .domain([100, -20]);
}
else if (selectedMetric === "max_temp") {
    colorScale = d3.scaleSequential(d3.interpolateRdYlBu)
        .domain([100, -20]);
}
else if (selectedMetric === "avg_wind") {
    colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, 20]);
}
else if (selectedMetric === "fast5_wind_speed") {
    colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, 40]);
}
    statePaths
        .each(function(d) {
            const metricValue = dataByState.get(d.properties.name);

            if (metricValue !== undefined) {
                d.metricValue = metricValue;
                d3.select(this)
                    .transition()
                    .duration(t)
                    .attr("fill", colorScale(metricValue));
            } else {
                d.metricValue = undefined;
                d3.select(this)
                    .transition()
                    .duration(t)
                    .attr("fill", "#eee");
            }
        });

        updateStateHighlight();
        setupColorLegend();
        updateAnnotations();
}

function setupLineChart() {
    const lineMargin = { top: 40, right: 30, bottom: 50, left: 60 };
    const lineWidth = 800 - lineMargin.left - lineMargin.right;
    const lineHeight = 250 - lineMargin.top - lineMargin.bottom;

    const lineSvgContainer = d3.select('#lineVis')
        .append('svg')
        .attr('width', lineWidth + lineMargin.left + lineMargin.right)
        .attr('height', lineHeight + lineMargin.top + lineMargin.bottom);

    lineSvg = lineSvgContainer
        .append('g')
        .attr('transform', `translate(${lineMargin.left},${lineMargin.top})`);

    lineSvg.append("defs")
        .append("clipPath")
        .attr("id", "line-clip")
        .append("rect")
        .attr("width", lineWidth)
        .attr("height", lineHeight);

    lineSvg.append("text")
        .attr("class", "lineTitle")
        .attr("x", lineWidth / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .text("Click a state to see its trend over time");

    lineSvg.append("text")
        .attr("class", "xAxisLabel")
        .attr("text-anchor", "middle")
        .attr("x", lineWidth / 2)
        .attr("y", lineHeight + 40)
        .text("");

    lineSvg.append("text")
        .attr("class", "yAxisLabel")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -lineHeight / 2)
        .attr("y", -45)
        .text("");

    lineXAxis = lineSvg.append("g")
        .attr("class", "xAxis")
        .attr("transform", `translate(0,${lineHeight})`);

    lineYAxis = lineSvg.append("g")
        .attr("class", "yAxis");

    // clipped group so anything left of the y-axis gets hidden
    const clippedGroup = lineSvg.append("g")
        .attr("clip-path", "url(#line-clip)");

    linePath = clippedGroup.append("path")
        .attr("class", "linePath")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2);

    lineDateMarker = clippedGroup.append("line")
        .attr("class", "dateMarker")
        .attr("stroke", "crimson")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4 4")
        .style("opacity", 0);

    // invisible zoom layer
    lineSvg.append("rect")
        .attr("class", "zoomRect")
        .attr("width", lineWidth)
        .attr("height", lineHeight)
        .style("fill", "none")
        .style("pointer-events", "all");
}

function updateLineChartVis() {
    if (!selectedState || !lineSvg) return;

    const lineMargin = { top: 40, right: 30, bottom: 50, left: 60 };
    const lineWidth = 800 - lineMargin.left - lineMargin.right;
    const lineHeight = 250 - lineMargin.top - lineMargin.bottom;

    const stateData = allData.filter(
        d => d.state === selectedState
    );

    const lineData = Array.from(
        d3.rollup(
            stateData,
            v => d3.mean(v, d => d[selectedMetric]),
            d => +d.date
        ),
        ([date, value]) => ({ date: new Date(+date), value: value })
    )
    .filter(d => d.value !== undefined && !isNaN(d.value))
    .sort((a, b) => a.date - b.date);

    lineXScale = d3.scaleTime()
        .domain(d3.extent(lineData, d => d.date))
        .range([0, lineWidth]);

    lineYScale = d3.scaleLinear()
        .domain(d3.extent(lineData, d => d.value))
        .nice()
        .range([lineHeight, 0]);

    const line = d3.line()
        .x(d => lineXScale(d.date))
        .y(d => lineYScale(d.value));

    lineXAxis.call(d3.axisBottom(lineXScale).ticks(6));
    lineYAxis.call(d3.axisLeft(lineYScale));

    linePath
        .datum(lineData)
        .attr("d", line);

    lineSvg.select(".lineTitle")
        .text(`${selectedState} ${metricLabels[selectedMetric]} Over Time`);

    lineSvg.select(".yAxisLabel")
        .text(metricLabels[selectedMetric]);
    lineSvg.select(".lineTitle")
        .text(`${selectedState} ${metricLabels[selectedMetric]} Over Time`);

    const currentPoint = lineData.find(d =>
        d.date.getFullYear() === targetDate.getFullYear() &&
        d.date.getMonth() === targetDate.getMonth() &&
        d.date.getDate() === targetDate.getDate()
    );

    if (currentPoint) {
        lineDateMarker
            .style("opacity", 1)
            .attr("x1", lineXScale(currentPoint.date))
            .attr("x2", lineXScale(currentPoint.date))
            .attr("y1", 0)
            .attr("y2", lineHeight);
    } else {
        lineDateMarker.style("opacity", 0);
    }

    const zoomed = (event) => {
        const newX = event.transform.rescaleX(lineXScale);

        const newLine = d3.line()
            .x(d => newX(d.date))
            .y(d => lineYScale(d.value));

        lineXAxis.call(d3.axisBottom(newX).ticks(6));
        linePath.attr("d", newLine(lineData));

        if (currentPoint) {
            lineDateMarker
                .style("opacity", 1)
                .attr("x1", newX(currentPoint.date))
                .attr("x2", newX(currentPoint.date))
                .attr("y1", 0)
                .attr("y2", lineHeight);
        }
    };

    const zoom = d3.zoom()
        .scaleExtent([1, 10])
        .translateExtent([[0, 0], [lineWidth, lineHeight]])
        .extent([[0, 0], [lineWidth, lineHeight]])
        .on("zoom", zoomed);

    lineSvg.select(".zoomRect")
        .call(zoom)
        .call(zoom.transform, d3.zoomIdentity);
}
function setupColorLegend() {
    svg.selectAll(".colorLegend").remove();
    svg.select("defs").remove();

    const legendWidth = 200;
    const legendHeight = 10;

    const legendSvg = svg.append("g")
        .attr("class", "colorLegend")
        .attr("transform", `translate(${width / 2 - legendWidth / 2}, -50)`);

    const defs = svg.append("defs");

    const gradient = defs.append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "0%");

    const domain = colorScale.domain();
    const start = domain[0];
    const end = domain[1];

    d3.range(0, 1.01, 0.1).forEach(t => {
        const value = start + t * (end - start);
        gradient.append("stop")
            .attr("offset", `${t * 100}%`)
            .attr("stop-color", colorScale(value));
    });

    legendSvg.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");

    const legendScale = d3.scaleLinear()
        .domain(domain)
        .range([0, legendWidth]);

    legendSvg.append("g")
        .attr("class", "legendAxis")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(d3.axisBottom(legendScale).ticks(5));

    legendSvg.append("text")
        .attr("class", "legendTitle")
        .attr("x", legendWidth / 2)
        .attr("y", -6)
        .attr("text-anchor", "middle")
        .text(metricLabels[selectedMetric]);
}
function updateAnnotations() {
    let text = "";

    if (selectedMetric === "avg_temp") {
        text = "Warmer temperatures are concentrated in the Southeast and tropical states like Florida and Hawaii, while colder temperatures appear in northern states such as the Dakotas, Maine, and Alaska.";
    } 
    else if (selectedMetric === "max_temp") {
        text = "Maximum temperatures are highest in the southern states, while northern states remain noticeably cooler.";
    } 
    else if (selectedMetric === "min_temp") {
        text = "Minimum temperatures show a strong north-south contrast, with colder overnight conditions in northern states.";
    } 
    else if (selectedMetric === "fast5_wind_speed") {
        text = "The highest short-duration wind speeds are concentrated in a few interior western and central states, showing a more localized pattern than temperature.";
    } 
    else if (selectedMetric === "avg_wind") {
        text = "Average wind speed is highest in parts of the Southwest and interior West, while much of the rest of the country stays in a lower range.";
    }

    d3.select("#annotationBox").text(text);
}

function setupPlayButton() {
    d3.select("#playButton").on("click", function() {
        if (!isPlaying) {
            isPlaying = true;
            d3.select(this).text("Pause");

            playInterval = setInterval(() => {
                const currentTime = targetDate.getTime();
                let currentIndex = uniqueDates.findIndex(d => d.getTime() === currentTime);

                if (currentIndex === -1 || currentIndex >= uniqueDates.length - 1) {
                    currentIndex = 0;
                } else {
                    currentIndex += 1;
                }

                targetDate = new Date(uniqueDates[currentIndex].getTime());
                slider.value(targetDate);
                updateVis();
                updateLineChartVis();
            }, 500);

        } else {
            isPlaying = false;
            d3.select(this).text("Play");
            clearInterval(playInterval);
        }
    });
}

window.addEventListener('load', init);