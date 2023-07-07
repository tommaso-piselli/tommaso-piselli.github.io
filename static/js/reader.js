let fileInput = d3.select("#fileInput");
let jsonPreview = d3.select("#graphJson");
let svg = d3.select("#graph");
let graphData;
let colorButton = d3.select("#colorButton");
let percentSlider = d3.select("#percentSlider");
let percentLabel = d3.select("#percentLabel");
percentSlider.on("input", function() {
    percentLabel.text(this.value + "%");
});
percentLabel.text(percentSlider.property("value") + "%");


fileInput.on("change", function() {
    let file = this.files[0];

    let reader = new FileReader();

    reader.onload = function(e) {
        try {
            let data = JSON.parse(e.target.result);
            graphData = data;

            // Display JSON content
            let jsonStr = JSON.stringify(data, null, 2);
            jsonPreview.property("value", jsonStr);

            // Display graph details
            d3.select("#graph-name").text(` ${data.graph.name}`);
            d3.select("#vertex-count").text(` ${data.nodes.length}`);
            d3.select("#edge-count").text(` ${data.links.length}`);

            // Plot graph (see below)
            plotGraph(data);
        } catch(error) {
            console.error("Errore durante la lettura del file", error);
        }
    };

    reader.onerror = function() {
        console.error("Errore durante il caricamento del file", reader.error);
    };

    reader.readAsText(file);
});


colorButton.on("click", function() {
    let percent = d3.select("#percentSlider").property("value");
    colorNodes(graphData, percent);                                     // ToDo: Button PRESS + graphData => Working!
});

function plotGraph(graph) {
    svg.selectAll("*").remove(); // Clear previous selection

    let width = parseFloat(svg.style("width"));
    let height = parseFloat(svg.style("height"));
    let margin = 20;

    // min max of the scale
    let xExtent = d3.extent(graph.nodes, d => d.x);
    let yExtent = d3.extent(graph.nodes, d => d.y);

    // calculate scales: keep the graph's aspect ratio (?)
    let xRange = xExtent[1] - xExtent[0];
    let yRange = yExtent[1] - yExtent[0];
    let xScale, yScale;
    if (xRange > yRange) {
        let scale = (width - 2 * margin) / xRange;
        xScale = d3.scaleLinear()
            .domain(xExtent)
            .range([margin, width - margin]);
        yScale = d3.scaleLinear()
            .domain(yExtent)
            .range([(height - yRange * scale) / 2, (height + yRange * scale) / 2]);
    } else {
        let scale = (height - 2 * margin) / yRange;
        yScale = d3.scaleLinear()
            .domain(yExtent)
            .range([margin, height - margin]);
        xScale = d3.scaleLinear()
            .domain(xExtent)
            .range([(width - xRange * scale) / 2, (width + xRange * scale) / 2]);
    }

    // Draw edges
    svg.selectAll("line")
        .data(graph.links)
        .enter()
        .append("line")
        .attr("x1", d => xScale(graph.nodes[d.source].x))
        .attr("y1", d => yScale(graph.nodes[d.source].y))
        .attr("x2", d => xScale(graph.nodes[d.target].x))
        .attr("y2", d => yScale(graph.nodes[d.target].y))
        .style("stroke", "#2C3E50");

    // Draw nodes
    svg.selectAll("circle")
        .data(graph.nodes)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", 4)
        .style("fill", d => d.color) // Usa il colore del nodo
        .on("mouseover", function() { d3.select(this)
                                                .style("fill", "green")
                                                .attr("r", 6); })                         // Change color on mouseover
        .on("mouseout", function(d) { d3.select(this)
                                                .style("fill", d.color)
                                                .attr("r", 4); });                         // ToDo: quando mouseout, ricolora normale
}

function shuffle(array) {
    let m = array.length; 
    let t; 
    let i;
    while (m) {
        i = Math.floor(Math.random() * m--);
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }
    return array;
}

// ToDO: mouseout ricolora normale  
function colorNodes(graph, percent) {
    let ratio = percent / 100;
    let nodes = shuffle(graph.nodes.slice());
    let redCount = Math.round(ratio * nodes.length);
    nodes.forEach((node, i) => {
        node.color = i < redCount ? "red" : "blue";
    });
    plotGraph(graph);
}

