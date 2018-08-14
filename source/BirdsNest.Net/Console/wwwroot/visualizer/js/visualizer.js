var drawpane;
var zoomLayer;
var svg;
var graphbglayer;
var nodeslayer;
var edgeslayer;
var simulation;
var force;
var edgedata = [];
var nodedata = [];

var playMode = false;
var shiftKey = false;
var ctrlKey = false;

var paneWidth = 640;
var paneHeight = 480;
var defaultsize = 40;
var edgelabelwidth = 70;

var currMaxRelated = 0
var currMinRelated = 9007199254740991;
var minScaling = 1;
var maxScaling = 4;

var perfmode = false; //perfmode indicates high numbers of nodes, and minimises animation


function drawGraph(selectid) {
    updatePaneSize(selectid);
    drawPane = d3.select("#" + selectid);

    //  d3.select("body")
    //      .on("keydown", keydown)
    //.on("keyup", keyup);

    svg = drawPane.append("svg")
        .attr("id", "drawingsvg")
        .on("click", pageClicked);


    //setup the zooming layer
    zoomLayer = svg.append("g")
        .attr("id", "zoomlayer");

    graphbglayer = zoomLayer.append("g")
        .attr("id", "graphbglayer");

    edgeslayer = zoomLayer.append("g")
        .attr("id", "edgeslayer");

    nodeslayer = zoomLayer.append("g")
        .attr("id", "nodeslayer");

    svg.call(d3.zoom()
        .scaleExtent([0.05, 5])
        .on("zoom", function () {
            zoomLayer.attr("transform", d3.event.transform);
        }));

    simulation = d3.forceSimulation();
    simulation.stop();

    simulation
        .force("link", d3.forceLink()
            .id(function (d) { return d.db_id; })
            .distance(150)
            .strength(1.5))
        .force('collide', d3.forceCollide()
            .strength(1)
            .radius(function (d) { return (d.size * 1.5) }))
        .force('charge', d3.forceManyBody()
            .strength(10)
            .distanceMax(200)
            .distanceMin(50))
        .force('center', d3.forceCenter(paneWidth / 2, paneHeight / 2))
        .on('tick', function () { onTick(); })
        .on('end', function () { onLayoutFinished(); })
        .velocityDecay(0.6)
        .alphaDecay(0.08);
}

function updatePaneSize(selectid) {
    paneWidth = $("#" + selectid).width();
    paneHeight = $("#" + selectid).height();
    //console.log("paneWidth: " + paneWidth);
    //console.log("paneHeight: " + paneHeight);
}

function onTick() {
    //console.log(simulation.alpha());
    d3.select("#progress").style("width", (100 - (simulation.alpha() * 100)) + "%");
    if (perfmode) {
        updateNodePositions();
    }
    else {
        updateLocations();
    }
}

function resetView() {
    //console.log("resetView");
    edgedata = [];
    nodedata = [];
    unselectAllNodes();
    graphbglayer.selectAll("*").remove();
    edgeslayer.selectAll("*").remove();
    nodeslayer.selectAll("*").remove();
}

d3.selectAll("#restartLayoutBtn").attr('onclick', 'restartLayout()');
function restartLayout() {
    //console.log('restartLayout');
    d3.selectAll("#restartIcon").classed("spinner", true);
    d3.selectAll("#restartLayoutBtn")
        .attr('onclick', 'pauseLayout()')
        .attr('title','Updating layout');
    simulation.alpha(1).restart();
}

d3.selectAll("#pausePlayBtn").attr('onclick', "playLayout()");
function playLayout() {
    playMode = true;

    d3.selectAll("#pausePlayIcon")
        .classed("fa-play", false)
        .classed("fa-pause", true);
    d3.selectAll("#pausePlayBtn")
        .attr('onclick', "pauseLayout()");
    restartLayout();
}

function pauseLayout() {
    playMode = false;
    updateLocations();

    simulation.stop();
    d3.selectAll("#pausePlayIcon")
        .classed("fa-pause", false)
        .classed("fa-play", true);
    d3.selectAll("#pausePlayBtn")
        .attr('onclick', 'playLayout()');
    d3.selectAll("#restartIcon").classed("spinner", false);
    d3.selectAll("#restartLayoutBtn").attr('onclick', 'restartLayout()');
}

function onLayoutFinished() {
    updateLocations();
    d3.selectAll("#restartIcon").classed("spinner", false);
    d3.select("#progress").style("width", "100%");
    d3.selectAll("#restartLayoutBtn")
        .attr('onclick', 'restartLayout()')
        .attr('title', 'Refresh layout');
}


/*
*****************************
setup edges and nodes
*****************************
*/

function addPending() {
    //console.log(pendingResults.nodes.length);
    //console.log("addPending start");

    if (pendingResults.nodes.length > 1000) {
        if (confirm("You are adding a ridiculous number of nodes to the view. This is really, really not recommended. " +
            " Are you sure?") !== true) {
            return;
        }
    }
    else if (pendingResults.nodes.length > 500) {
        if (confirm("You are adding a huge number of nodes to the view. This is not recommended. " +
            " Are you sure?") !== true) {
            return;
        }
    }
    else if (pendingResults.nodes.length > 100) {
        if (confirm("You are adding a large number of nodes to the view which may slow things down. " +
            " Are you sure?") !== true) {
            return;
        }
    }

    d3.selectAll("#restartIcon").classed("spinner", true);
    d3.selectAll("#restartLayoutBtn")
        .attr('title', 'Updating data');

    setTimeout(function () {
        let newcount = addResultSet(pendingResults);
        //addEdges(edgedata);
        if (newcount > 0) { updateEdges(); }
        else { d3.selectAll("#restartIcon").classed("spinner", false); }

        document.getElementById("searchNotification").innerHTML = '';
        pendingResults = null;
        //console.log("addPending end");
    }, 10);
}

function addResultSet(json) {
    //console.log("addResultSet start: " );
    let edges = json.edges;
    let nodes = json.nodes;

    //populate necessary additional data for the view
    let newitemcount = loadNodeData(nodes);
    checkPerfMode();

    edges.forEach(function (d) {
            if (findFromDbId(edgedata, d.db_id) === null) {
                edgedata.push(d);
                newitemcount++;
            }
        }
    );

    if (newitemcount > 0) {
        simulation.nodes(nodedata);
        simulation.force("link").links(edgedata);

        addNodes(nodedata);
        addEdges(edgedata);
    }
    return newitemcount;

    //console.log("addResultSet end: " );
}

function loadNodeData(newnodedata) {
	/*console.log('loadNodeData');
	console.log(newnodedata);*/
    let rangeUpdated = false;
    let newcount = 0;

    //evaluate the nodes to figure out the max and min size so we can work out the scaling
    newnodedata.forEach(function (d) {
        if (d.relatedcount > currMaxRelated) {
            rangeUpdated = true;
            currMaxRelated = d.relatedcount;
        }
        if (d.relatedcount < currMinRelated) {
            rangeUpdated = true;
            currMinRelated = d.relatedcount;
        }
    });

    let scalingRange = new Slope(currMinRelated, minScaling, currMaxRelated, maxScaling);

    if (rangeUpdated) {
        //update the scaling range and update all existing nodes
        nodedata.forEach(function (d) {
            //console.log(d);
            if (currMaxRelated > 0) { d.scaling = scalingRange.getYFromX(d.relatedcount); }
            else { d.scaling = 1; }
            d.radius = ((defaultsize * d.scaling) / 2);
            d.cx = d.x + d.radius;
            d.cy = d.y + d.radius;
            d.size = defaultsize * d.scaling;
        });
    }

    //load the data and pre-calculate/set the values for each new node 	
    newnodedata.forEach(function (d) {
        //console.log(d);
        if (findFromDbId(nodedata, d.db_id) === null) {
            //console.log("New node: " + d.db_id);
            if (currMaxRelated > 0) { d.scaling = scalingRange.getYFromX(d.relatedcount); }
            else { d.scaling = 1; }

            d.radius = ((defaultsize * d.scaling) / 2);
            d.x = 0;
            d.y = 0;
            d.cx = d.x + d.radius;
            d.cy = d.y + d.radius;
            //console.log(d.x); 
            //console.log(d.cx); 
            d.size = defaultsize * d.scaling;
            populateDetails(d);
            nodedata.push(d);
            newcount++;
        }
    });
    //console.log(newcount);
    return newcount;
}

function addNodes(nodes) {
    //console.log(": addNodes");
    //add the bg
    graphbglayer.selectAll('.nodebg')
        .data(nodes, function (d) { return d.db_id; })
        .enter()
        .append("circle")
        .attr("r", function (d) { return (d.radius + 10) + "px"; })
        .attr("cx", function (d) { return d.radius; })
        .attr("cy", function (d) { return d.radius; })
        .classed("graphbg", true)
        .classed("nodebg", true);

    //build the nodes
    let enternodes = nodeslayer.selectAll(".nodes")
        .data(nodes, function (d) { return d.db_id; })
        .enter();

    let enternodesg = enternodes.append("g")
        .attr("id", function (d) { return "node_" + d.db_id; })
        .attr("class", function (d) { return d.label })
        .classed("nodes", true)
        .classed("selected", function (d) { return d.selected; })
        .on("click", nodeClicked)
        .on("mouseover", nodeMouseOver)
        .on("mouseout", nodeMouseOut)
        .on("dblclick", nodeDblClicked)
        .call(
            d3.drag().subject(this)
                .on('drag', nodeDragged));

    //node layout
    enternodesg.append("circle")
        .classed("nodecircle", true)
        .attr("r", function (d) { return d.radius + "px"; })
        .attr("cx", function (d) { return d.radius; })
        .attr("cy", function (d) { return d.radius; });

    enternodesg.append("i")
        .attr("height", function (d) { return (d.size * 0.6) + "px" })
        .attr("width", function (d) { return (d.size * 0.6) + "px" })
        .attr("x", function (d) { return (d.size * 0.2) })
        .attr("y", function (d) { return (d.size * 0.2) })
        .attr("class", function (d) { return iconmappings.getIconClasses(d); })
        .classed("nodeicon", true);

    enternodesg.append("text")
        .text(function (d) { return d.name; })
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("transform", function (d) { return "translate(" + (d.size / 2) + "," + (d.size + 10) + ")" });

    //Allow styling of subtypes types
    d3.selectAll(".AD_Group")
        .each(function (d) {
            let c = d.label + "-" + d.properties.grouptype;
            d3.select(this).classed(c, true);
        });

    d3.selectAll(".CTX_Application")
        .each(function (d) {
            let c = d.label + "-" + d.properties.farm;
            d3.select(this).classed(c, true);
        });

    d3.selectAll(".CTX_Farm")
        .each(function (d) {
            let c = d.label + "-" + d.properties.name;
            d3.select(this).classed(c, true);
        });
}

function addEdges(edges) {
    //setup the edges
	/*console.log("addEdges");
	console.log(data);*/

    //add the bg
    graphbglayer.selectAll('.edgebg')
        .data(edges, function (d) { return d.db_id; })
        .enter()
        .append("path")
        .attr("id", function (d) { return "edgebg_" + d.db_id; })
        .classed("graphbg", true)
        .classed("edgebg", true);


    let enteredges = edgeslayer.selectAll(".edges")
        .data(edges, function (d) { return d.db_id; })
        .enter();

    let enteredgesg = enteredges.append("g")
        .attr("id", function (d) { return "edge_" + d.db_id; })
        .attr("class", function (d) { return d.label })
        .classed("edges", true);

    enteredgesg.append("path")
        .classed("wrapper", true)
        .attr("fill", "none");

    enteredgesg.append("path")
        .classed("arrows", true);

    let edgelabels = enteredgesg.append("g")
        .classed("edgelabel", true);

    edgelabels.append("text")
        .text(function (d) { return d.label })
        .attr("dominant-baseline", "text-bottom")
        .attr("text-anchor", "middle")
        .attr("transform", "translate(0,-5)");;
}

document.getElementById('removeBtn').addEventListener('click', removeNodes, false);
function removeNodes() {
    //console.log("removeNodes: " );
    var nodeList = [];

    d3.selectAll(".selected")
        .each(function (d) {
            nodeList.push(d);
            updateNodeSelection(d, false);
        });

    if (nodeList.length === 0) { return; }

    if (confirm("This will remove " + nodeList.length + " nodes. Are you sure?") !== true) {
        return;
    }

    //remove the edges first
    edgedata = edgedata.filter(function (edge) {
        return !nodeList.includes(edge.source) && !nodeList.includes(edge.target);
    });

    nodedata = nodedata.filter(function (node) {
        return !nodeList.includes(node);
    });

    checkPerfMode();

    graphbglayer.selectAll('.edgebg')
        .data(edgedata, function (d) { return d.db_id; })
        .exit().remove();

    graphbglayer.selectAll('.nodebg')
        .data(nodedata, function (d) { return d.db_id; })
        .exit().remove();

    edgeslayer.selectAll(".edges")
        .data(edgedata, function (d) { return d.db_id; })
        .exit().remove();

    nodeslayer.selectAll(".nodes")
        .data(nodedata, function (d) { return d.db_id; })
        .exit().remove();
}

function getAllNodeIds() {
    var nodeids = [];
    zoomLayer.selectAll(".nodes")
        .each(function (d) {
            nodeids.push(d.db_id);
        }
        );

    return nodeids;
}


//check the number of nodes in the view, and enable perfmode if required
function checkPerfMode() {
    if (nodedata.length > 100) { perfmode = true; }
    else { perfmode = false; }
}

function findFromDbId(arraydata, id) {
    for (var i = 0; i < arraydata.length; i++) {
        if (arraydata[i].db_id === id) {
            return arraydata[i];
        }
    };
    return null;
}



function pinNode(d) {
    //console.log("pinNode");
    d.fx = d.x;
    d.fy = d.y;
    if (!d.pinned) {
        let ping = d3.selectAll("#node_" + d.db_id)
            .append("g")
            .classed("pin", true)
            .on("click", unpinNode);
        ping.append("circle")
            .attr("r", 8 * d.scaling)
            .attr("cx", 5 * d.scaling)
            .attr("cy", 5 * d.scaling);
        ping.append("i")
            .classed("fas fa-thumbtack", true)
            .attr("x", 0)
            .attr("y", 1)
            .attr("height", 10 * d.scaling)
            .attr("width", 10 * d.scaling);
        d.pinned = true;
    }
}

function unpinNode(d) {
    //console.log(": unpinNode");
    if (d3.event.defaultPrevented) return; // dragged
    d3.event.stopPropagation();
    delete d.fx;
    delete d.fy;
    d3.selectAll("#node_" + d.db_id).select(".pin").remove();
    d.pinned = false;
}

function pageClicked(d) {
    //console.log(": pageClicked");
    if (d3.event.defaultPrevented) return; // dragged
    unselectAllNodes();
}

function nodeDblClicked(d) {
    //console.log(": nodeDblClicked");
    if (d3.event.defaultPrevented) { return; } // dragged
    d3.event.stopPropagation();
    addRelated(d.db_id);
}

function nodeClicked(d) {
    //console.log(": nodeClicked");
    //console.log(": " + d.name);
    if (d3.event.defaultPrevented) {
        //console.log("prevented");
        return;
    } // dragged
    d3.event.stopPropagation();

    if (d3.event.ctrlKey) {
        //if ctrl key is down, just toggle the node		
        updateNodeSelection(d, !d.selected);
    }
    else {
        //if the ctrl key isn't down, unselect everything and select the node
        unselectAllOtherNodes(d);
        updateNodeSelection(d, true);
    }
}

function updateNodeSelection(d, isselected) {
    //console.log("updateNodeSelection");
    if (d.selected !== isselected) {
        if (isselected) {
            nodeShowDetailsSelected(d);
        }
        else {
            nodeHideDetailsSelected(d);
        }
    }

    d3.selectAll("#node_" + (d.db_id))
        .classed("selected", function () {
            d.selected = isselected;
            return isselected;
        });

}

function unselectAllOtherNodes(keptdatum) {
    //console.log("unselectAllOtherNodes");
    d3.selectAll(".selected")
        .classed("selected", function (d) {
            if (keptdatum.db_id !== d.db_id) {
                nodeHideDetailsSelected(d);
                d.selected = false;
                return false;
            }
        });
}

function unselectAllNodes() {
    //console.log("unselectAllNodes");
    d3.selectAll(".selected")
        .classed("selected", function (d) {
            d.selected = false;
            return false;
        });

    d3.selectAll(".detailcard").remove();
}

function nodeShowDetailsSelected(d) {
    //console.log("nodeShowDetailsSelected");
    d3.select("#detailcardwrapper")
        .append("div")
        .attr("id", "details_" + d.db_id)
        .attr("class", "detailcard pane")
        .html(d.detailsHTML);
}

function nodeHideDetailsSelected(d) {
    //console.log("nodeHideDetailsSelected");
    d3.selectAll("#details_" + d.db_id).remove();
}

function nodeMouseOver(d) {
    //console.log("nodeMouseOver: " + d.name);
    d3.selectAll("#details_" + d.db_id)
        .classed("currentActiveDetailCard", true);
}

function nodeMouseOut(d) {
    //console.log("nodeMouseOut: " + d.name);
    d3.selectAll("#details_" + d.db_id)
        .classed("currentActiveDetailCard", false);
}

function nodeDragged(d) {
    //console.log("nodeDragged");
    d3.event.sourceEvent.stopPropagation();
    //if the node is selected the move it and all other selected nodes
    if (d.selected) {
        d3.selectAll(".selected")
            .each(function (d) {
                d.x += d3.event.dx;
                d.y += d3.event.dy;
                pinNode(d);
            });
    }
    else {
        d.x += d3.event.dx;
        d.y += d3.event.dy;
        pinNode(d);
    }

    updateLocations();
    if (playMode === true) { restartLayout(); }
}

function updateNodePositions() {
    nodedata.forEach(function (d) {
        d.cx = d.x + d.radius;
    });
}

function updateLocations() {
    let alledges = edgeslayer.selectAll(".edges").data(edgedata);
    let edgebgwidth = 13;

    nodeslayer.selectAll(".nodes")
        .attr("x", function (d) {
            d.cx = d.x + d.radius;
            return d.x;
        })
        .attr("y", function (d) {
            d.cy = d.y + d.radius;
            return d.y;
        })
        .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")" });

    graphbglayer.selectAll(".nodebg")
        .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")" });


    alledges.each(function (d) {
        let diagLine = new Slope(d.source.cx, d.source.cy, d.target.cx, d.target.cy);

        //move and rotate the edge line to the right spot
        let edge = d3.select(this)
            .attr("transform", function () {
                return "rotate(" + diagLine.deg + " " + diagLine.x1 + " " + diagLine.y1 + ") " +
                    "translate(" + diagLine.x1 + " " + diagLine.y1 + ")";
            });

        //do the bg as well
        graphbglayer.select("#edgebg_" + d.db_id)
            .attr("transform", function () {
                return "rotate(" + diagLine.deg + " " + diagLine.x1 + " " + diagLine.y1 + ") " +
                    "translate(" + diagLine.x1 + " " + diagLine.y1 + ")";
            })
            .attr("d", function (d) {
                return "M 0 -" + edgebgwidth + " " +
                    "L " + (diagLine.length) + " -" + edgebgwidth + " " +
                    "L " + (diagLine.length) + " " + edgebgwidth + " " +
                    "L 0 " + edgebgwidth + " " + " Z";
            });

        // Reevaluate the path coordinates so it looks right
        edge.selectAll(".wrapper")
            .attr("d", function (d) {
                return "M 0 -3 " +
                    "L " + (diagLine.length) + " -3 " +
                    "L " + (diagLine.length) + " 3 " +
                    "L 0 3 Z";
            });

        edge.selectAll(".arrows")
            .attr("d", function (d) {
                let lineend = Math.max(diagLine.length - d.target.radius - 8, 0);
                let linepoint = Math.max(lineend + 5, lineend);
                linestart = Math.min(d.source.radius + 5, lineend);

                let = path = "M " + linestart + " -0.5 " +
                    "L " + lineend + " -0.5 " +
                    "L " + lineend + " -5 " +
                    "L " + linepoint + " 0 " +
                    "L " + lineend + " 5 " +
                    "L " + lineend + " 0.5 " +
                    "L " + linestart + " 0.5 Z ";

                return path;
            });

        edge.selectAll(".edgelabel")
            .attr("transform-origin", "30,0")
            .attr("transform", function (d) {
                let translation;
                if (diagLine.x2 > diagLine.x1) {
                    return "translate(" + diagLine.mid + ",0)";
                }
                else {
                    let axis = diagLine.getCoordsFromLength(diagLine.mid);
                    return "translate(" + diagLine.mid + ",0) rotate(180)";
                }
            })
    });
}








//based on an angled line, eval all the relevant details
function Slope(x1, y1, x2, y2) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.xd = x2 - x1; //delta x
    this.yd = y2 - y1; //delta y

    this.length = Math.sqrt((this.xd * this.xd) + (this.yd * this.yd));
    this.mid = this.length / 2;
    this.deg = Math.atan2(this.yd, this.xd) * (180 / Math.PI);
    this.sinA = this.yd / this.length;
    this.cosA = this.xd / this.length;
    this.tanA = this.yd / this.xd;
}

// find coordinates of a point along the line from the source (x1,y1)
Slope.prototype.getCoordsFromLength = function (length) {
    let ret = {
        x: ((this.cosA / length) + this.x1),
        y: ((this.sinA / length) + this.y1)
    };
    return ret;
}

Slope.prototype.getYFromX = function (x) {
    return (this.tanA * (x - this.x1)) + this.y1;
}

Slope.prototype.getXFromY = function (y) {
    return (this.tanA / (y - this.y1)) + this.x1;
}



/*
IconMappings object to asign the correct font awesome icon to the correct nodes
*/
function IconMappings(jsondata) {
    this.mappings = jsondata;
}

IconMappings.prototype.getIconClasses = function (datum) {
    if (this.mappings.hasOwnProperty(datum.label)) { return this.mappings[datum.label]; }
    else { return "fas fa-question"; }
}


/*
Build the details card for the node
*/
function populateDetails(d) {
    d.detailsHTML = function () {
        let s = "<u><b>Details</b></u><br>" +
            "<b>Name:</b> " + d.name + "<br>" +
            "<b>db_id:</b> " + d.db_id + "<br>" +
            "<b>Type:</b> " + d.label + "<br>" +
            "<b>Related:</b> " + d.relatedcount + "<br><br><b><u>Properties</u></b><br>";

        if (d.properties) {
            d.propertyCount = d.properties.count;
            for (let key in d.properties) {
                s += "<b>" + key + ":</b> " + d.properties[key] + "<br>";
            }
        }
        else {
            d.propertyCount = 0;
            s += "empty<br>";
        }
        return s;
    }
}






/* 
****************************
Search functionality
****************************
*/


var pendingResults;

function showSearchSpinner() {
    var el = document.getElementById("searchNotification").innerHTML = "<i class='fas fa-spinner spinner'></i>";
}


function search() {
    showSearchSpinner();
    //console.log('search');
    var sourcetype = document.getElementById("sourceType").value;
    var sourceprop = document.getElementById("sourceProp").value;
    var sourceval = document.getElementById("sourceVal").value;

    var relationship = document.getElementById("edgeType").value;
    var relmin = document.getElementById("sliderMin").value;
    var relmax = document.getElementById("sliderMax").value;

    var tartype = document.getElementById("targetType").value;
    var tarprop = document.getElementById("targetProp").value;
    var tarval = document.getElementById("targetVal").value;

    var dir = $('#dirIcon').attr('data-dir');

    let url = "/api/search/path?" +
        "sourcetype=" + sourcetype +
        "&sourceprop=" + sourceprop +
        "&sourceval=" + sourceval +

        "&relationship=" + relationship +
        "&relmin=" + relmin +
        "&relmax=" + relmax +
        "&dir=" + dir +

        "&tartype=" + tartype +
        "&tarprop=" + tarprop +
        "&tarval=" + tarval;

	/*console.log("sourcetype: " + sourcetype);
	console.log("sourceprop: " + sourceprop);
	console.log("sourceval: " + sourceval);

	console.log("relationship: " + relationship);

	console.log("tartype: " + tartype);
	console.log("tarprop: " + tarprop);
	console.log("tarval: " + tarval);

	console.log(url);*/

    $.getJSON(url, function (data) {
        //console.log(data);
        pendingResults = data;
        let not = "Search returned " + data.nodes.length + " nodes. ";
        if (data.nodes.length !== 0) { not = not + "<a href='javascript:addPending()'>Add to view</a>" }
        document.getElementById("searchNotification").innerHTML = not;
    });
}

function toggleDir() {
    //console.log("toggleDir");
    var icon = document.getElementById("dirIcon");
    var d = $(icon).attr('data-dir');
    if (d == 'R') {
        icon.classList.remove("fa-arrow-right");
        icon.classList.add("fa-exchange-alt");
        $(icon).attr('data-dir', 'B');
    } else if (d == 'B') {
        icon.classList.remove("fa-exchange-alt");
        icon.classList.add("fa-arrow-left");
        $(icon).attr('data-dir', 'L');
    } else if (d == 'L') {
        icon.classList.remove("fa-arrow-left");
        icon.classList.add("fa-arrow-right");
        $(icon).attr('data-dir', 'R');
    }
    //console.log($(icon).attr('data-dir'));
}

//getCookie function from django documentation
function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


function getNode(nodeid) {
    //console.log(nodeid);
    $.getJSON("/api/nodes/node/" + nodeid, function (data) {
        //console.log(data);
        addResultSet(data);
        restartLayout();
        updateEdges();
    });
}

function getAll() {
    $.getJSON("/api/getall", function (data) {
        addResultSet(data);
        restartLayout();
    });
}

function addRelated(nodeid) {
    //console.log("addRelated"+ nodeid);
    $.getJSON("/api/nodes?nodeid=" + nodeid, function (data) {
        pendingResults = data;
        addPending();
    });

}

function updateEdges() {
    //console.log("updateEdges start");
    let nodeids = getAllNodeIds();
    var postdata = JSON.stringify(nodeids)
    //console.log(": json stringyfied");
    //console.log(nodeids);

    $.ajax({
        url: '/api/edges',
        method: "POST",
        data: postdata,
        contentType: "application/json; charset=utf-8",
        headers: {
            'X-CSRFToken': getCookie('csrftoken')
        },
        success: function (data) {
            //console.log(data);
            //console.log("getEdgesForNodes complete");
            addResultSet(data);
            restartLayout();
        }
    });
    //console.log("updateEdges end");
}

// Keystroke event handlers
var typetimer = null;

function timedKeyUp(timedfunction) {
    clearTimeout(typetimer);
    typetimer = setTimeout(timedfunction, 700);
}

//function sourceValKeyUp() {
//	timedKeyUp( function(d) {
//		console.log('sourceValKeyUp');
//		searchValues('source');
//	});
//}


function isNullOrEmpty(s) {
    return (s == null || s === "");
}



//populate 
function addOption(selectbox, text, value) {
    var o = document.createElement("OPTION");
    o.text = text;
    o.value = value;
    selectbox.options.add(o);
    return o;
}

function addLabelOptions(selectbox, labelList) {
    for (var i = 0; i < labelList.length; ++i) {
        addOption(selectbox, labelList[i], labelList[i])
    }
}

function clearOptions(selectbox) {
    selectbox.options.length = 0;
}

function updateProps(elementPrefix) {
    var type = document.getElementById(elementPrefix + "Type").value;
    var elprops = document.getElementById(elementPrefix + "Prop");

    clearOptions(elprops);
    let topoption = addOption(elprops, "", "");
    topoption.setAttribute("disabled", "");
    topoption.setAttribute("hidden", "");
    topoption.setAttribute("selected", "");

    $.getJSON("/api/nodes/properties?type=" + type, function (data) {
        for (var i = 0; i < data.length; ++i) {
            addOption(elprops, data[i], data[i])
        }
    });
}

bindAutoComplete("source");
bindAutoComplete("target");
function bindAutoComplete(elementPrefix) {
    $("#" + elementPrefix + "Val").autocomplete({
        source: function (request, response) {
            //console.log("autoComplete: "+ request.term);
            var type = document.getElementById(elementPrefix + "Type").value;
            var prop = document.getElementById(elementPrefix + "Prop").value;

            var url = "/api/nodes/values?type=" + type + "&property=" + prop + "&searchterm=" + request.term;
            $.getJSON(url, response);
        }
    });
}