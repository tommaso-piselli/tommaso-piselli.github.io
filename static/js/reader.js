// Var defition
let fileInput = d3.select("#fileInput");
let jsonPreview = d3.select("#graphJson");
let svg = d3.select("#graph");
let graphData;
let colorButton = d3.select("#colorButton");
let percentSlider = d3.select("#percentSlider");
let percentLabel = d3.select("#percentLabel");
let plotButton = d3.select("#press-plot");
let stressValue, fairnessValue;
let redNodes = [];
let blueNodes = [];

percentSlider.on("input", function () {
  percentLabel.text(this.value + "%");
});
percentLabel.text(percentSlider.property("value") + "%");

fileInput.on("change", function () {
  let file = this.files[0];

  let reader = new FileReader();

  reader.onload = function (e) {
    try {
      graphData = JSON.parse(e.target.result);

      // Display JSON content
      let jsonStr = JSON.stringify(graphData, null, 2);
      jsonPreview.property("value", jsonStr);

      // Display graph details
      d3.select("#graph-name").text(` ${graphData.name}`);
      d3.select("#vertex-count").text(` ${graphData.nodes.length}`);
      d3.select("#edge-count").text(` ${graphData.edges.length}`);

      // Plot graph (see below)
      plotGraph(graphData);
      stressValue = stress(graphData).dataSync();
      d3.select("#stress-initial-value").text(` ${stressValue[0].toFixed(2)}`);
      fairnessValue = fairness(graphData);
    } catch (error) {
      console.error("Errore durante la lettura del file", error);
    }
  };

  reader.onerror = function () {
    console.error("Errore durante il caricamento del file", reader.error);
  };

  reader.readAsText(file);
});

colorButton.on("click", function () {
  let percent = d3.select("#percentSlider").property("value");
  colorNodes(graphData, percent);
});

plotButton.on("click", function () {
  plotGraph(graphData);
});

function plotGraph(graph) {
  svg.selectAll("*").remove(); // Clear previous selection

  let width = parseFloat(svg.style("width"));
  let height = parseFloat(svg.style("height"));

  console.log(width + " x " + height);
  let margin = 20;

  // min max of the scale
  let xExtent = d3.extent(graph.nodes, (d) => d.x);
  let yExtent = d3.extent(graph.nodes, (d) => d.y);

  // calculate scales: keep the graph's aspect ratio (?)
  let xRange = xExtent[1] - xExtent[0];
  let yRange = yExtent[1] - yExtent[0];
  let xScale, yScale;
  if (xRange > yRange) {
    let scale = (width - 2 * margin) / xRange;
    xScale = d3
      .scaleLinear()
      .domain(xExtent)
      .range([margin, width - margin]);
    yScale = d3
      .scaleLinear()
      .domain(yExtent)
      .range([(height - yRange * scale) / 2, (height + yRange * scale) / 2]);
  } else {
    let scale = (height - 2 * margin) / yRange;
    yScale = d3
      .scaleLinear()
      .domain(yExtent)
      .range([margin, height - margin]);
    xScale = d3
      .scaleLinear()
      .domain(xExtent)
      .range([(width - xRange * scale) / 2, (width + xRange * scale) / 2]);
  }

  // Draw edges
  svg
    .selectAll("line")
    .data(graph.edges)
    .enter()
    .append("line")
    .attr("x1", (d) => xScale(graph.nodes[d.source].x))
    .attr("y1", (d) => yScale(graph.nodes[d.source].y))
    .attr("x2", (d) => xScale(graph.nodes[d.target].x))
    .attr("y2", (d) => yScale(graph.nodes[d.target].y))
    .style("stroke", "black");

  // Draw nodes
  svg
    .selectAll("circle")
    .data(graph.nodes)
    .enter()
    .append("circle")
    .attr("cx", (d) => xScale(d.x))
    .attr("cy", (d) => yScale(d.y))
    .attr("r", 4)
    .style("fill", (d) => d.color)
    .on("mouseover", function (d) {
      d3.select(this).style("fill", "#03DAC5").attr("r", 6);
    })
    .on("mouseout", function (d) {
      d3.select(this).style("fill", this.__data__.color).attr("r", 4);
    });
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

// Two colors Function
let redCount, blueCount;
function colorNodes(graph, percent) {
  let ratio = percent / 100;
  let nodes = shuffle(graph.nodes.slice());

  redCount = Math.round(ratio * nodes.length);
  nodes.forEach((node, i) => {
    node.color = i < redCount ? "red" : "blue";
  });

  blueCount = nodes.length - redCount;
  plotGraph(graph);
  colorDict(graph);

  updateColorInfo(graph);
  return redCount, blueCount;
}

function colorDict(graphData) {
  for (let i = 0; i < graphData.nodes.length; i++) {
    let node = graphData.nodes[i];
    node.weight = graphData.weight[i];
    node.shortestPath = graphData.shortestPath[i];
    node.euclideanDistance = graphData.euclideanDistance[i];
    node.color = graphData.nodes[i].color;

    if (node.color === "red") {
      redNodes.push(node);
    } else {
      blueNodes.push(node);
    }
  }
}

function updateColorInfo(graph) {
  let colorCounts = {};
  let nodeNumber = graph.nodes.length;
  console.log(nodeNumber);

  graph.nodes.forEach((node) => {
    if (colorCounts[node.color] === undefined) {
      colorCounts[node.color] = 1;
    } else {
      colorCounts[node.color]++;
    }
  });

  let colorInfo = d3.select("#color-info");

  colorInfo.selectAll("p").remove();

  let colorCount = Object.keys(colorCounts).length;
  colorInfo
    .append("p")
    .text("Numero di colori diversi: ")
    .append("span")
    .text(colorCount);

  for (let color in colorCounts) {
    let nodePercentage = Math.round((colorCounts[color] / nodeNumber) * 100);
    let p = colorInfo.append("p");
    p.text("Nodi colore ");
    p.append("text")
      .style("color", color)
      .style("font-weight", "bold")
      .text(color);
    p.append("span")
      .style("font-weight", "bold")
      .text(": " + colorCounts[color] + " (" + nodePercentage + "%)");
  }
}

function pairwiseDistance(x) {
  return tf.tidy(() => {
    let xNormSquared = x.pow(2).sum(1).reshape([-1, 1]);
    let pairwiseDotProduct = x.matMul(x.transpose());
    let pdistSquared = pairwiseDotProduct
      .mul(-2)
      .add(xNormSquared)
      .add(xNormSquared.transpose());
    let pdistSquaredClipped = pdistSquared.clipByValue(0, Infinity).sqrt();
    return pdistSquaredClipped;
  });
}

function stress(graph) {
  return tf.tidy(() => {
    let graphDistance = tf.tensor(graph.shortestPath);
    let pdist = tf.tensor(graph.euclideanDistance);
    let weight = tf.tensor(graph.weight);

    let stress = pdist.sub(graphDistance).square().mul(weight).sum();

    return stress;
  });
}
