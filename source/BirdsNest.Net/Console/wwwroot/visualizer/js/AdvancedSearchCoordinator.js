﻿//requires d3js
function AdvancedSearchCoordinator(elementid) {
    console.log("AdvancedSearchCoordinator started: " + elementid);
    console.log(this);
    var me = this;
    me.AdvancedSearch = new AdvancedSearch();
    me.ElementID = elementid;

    bindEnterToButton("searchEdgeDetails", "searchEdgeSaveBtn");
    bindEnterToButton("searchNodeDetails", "searchNodeSaveBtn");

    //Bind the enter key for an element to click a button
    function bindEnterToButton(elementid, buttonid) {
        document.getElementById(elementid).addEventListener("keydown", function (event) {
            //console.log("keydown listener fired: " + elementid);
            // Number 13 is the "Enter" key on the keyboard
            if (event.keyCode === 13) {
                event.preventDefault();
                document.getElementById(buttonid).click();
            }
        });
    }

    //d3.select("#nodeType").on("change", this.UpdateNodeProps);
    d3.select("#searchNodeSaveBtn").on("click", this.onSearchNodeSaveBtnClicked);
    d3.select("#searchEdgeSaveBtn").on("click", this.onSearchEdgeSaveBtnClicked);
    d3.select("#searchBtn").on("click", function () {
        me.Search();
    });
    d3.select("#addIcon").on("click", function () {
        me.AddNode();
    });
    d3.select("#advSearchClearIcon").on("click", function () {
        me.Clear();
    });
    d3.selectAll(".hopscontrol").on("input", function () {
        me.onHopsSwitchChanged();
    });

    
    this.UpdateNodeLabels();
}

AdvancedSearchCoordinator.prototype.Search = function () {
    //console.log("AdvancedSearchCoordinator.prototype.Search started");
    //console.log(this);
    var me = this;

    var postdata = JSON.stringify(me.AdvancedSearch);
    console.log(postdata);
    showSearchSpinner();
    apiPostJson("AdvancedSearch", postdata, function (data) {
        console.log(data);
        document.getElementById("searchNotification").innerHTML = data;
        $('#searchNotification').foundation();
    });
};

AdvancedSearchCoordinator.prototype.Clear = function () {
    console.log("AdvancedSearchCoordinator.prototype.Clear started");
    console.log(this);
    var me = this;
    var viewel = d3.select("#" + me.ElementID);
    viewel.selectAll("*").remove();
    me.AdvancedSearch = new AdvancedSearch();
};

AdvancedSearchCoordinator.prototype.AddNode = function () {
    console.log("AdvancedSearchCoordinator.prototype.onAddButtonPressed started");
    console.log(this);

    var me = this;
    var radius = 30;

    var xspacing = 150;
    var yspacing = 70;
    //console.log(me);
    me.AdvancedSearch.AddNode();

    var viewel = d3.select("#" + me.ElementID);
    var newnodeg = viewel.selectAll(".searchnode")
        .data(me.AdvancedSearch.Nodes, function (d) { return d.Name; })
        .enter()
        .append("g")
        .attr("id", function (d) { return "searchnode_" + d.Name; })
        .classed("searchnode",true)
        .attr("width", radius)
        .attr("height", radius)
        .attr("transform", function (d) { return "translate(" + (xspacing * me.AdvancedSearch.AddedNodes - xspacing * 0.5) + "," + yspacing + ")"; })
        .attr("data-open", "searchNodeDetails")
        .on("click", me.onSearchNodeClicked);

    newnodeg.append("circle")
        .attr("id", function (d) { return "searchnodebg_" + d.Name; })
        .classed("searchnodecircle",true)
        .attr("r",radius);

    newnodeg.append("text")
        .text(function (d) { return d.Name; })
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central");
        //.attr("transform", function (d) { return "translate(0," + (radius + 10) + ")"; });

    if (me.AdvancedSearch.Nodes.length > 1) {
        var rectwidth = radius;
        var rectheight = radius *0.7;
        var subspacingx = (me.AdvancedSearch.AddedNodes - 0.5) * xspacing - rectwidth / 2 - xspacing * 0.5;
        var subspacingy = yspacing - rectheight / 2;
        var relarrowwidth = 20;

        var newedgeg = viewel.selectAll(".searchedge")
            .data(me.AdvancedSearch.Edges, function (d) { return d.Name; })
            .enter()
            .append("g")
            .attr("id", function (d) { return "searchedge_" + d.Name; })
            .classed("searchedge", true)
            .on("click", me.onSearchEdgeClicked)
            .attr("transform", function (d) { return "translate(" + subspacingx + "," + subspacingy + ")"; })
            .attr("data-open", "searchEdgeDetails");

        newedgeg.append("rect")
            .attr("id", function (d) { return "searchedgebg_" + d.Name; })
            .classed("searchedgerect", true)
            .attr("width", rectwidth)
            .attr("height", rectheight);

        newedgeg.append("text")
            .text(function (d) { return d.Name; })
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("x", rectwidth / 2)
            .attr("y", rectheight / 2);

        newedgeg.selectAll(".searchleftarrow")
            .data(me.AdvancedSearch.Edges, function (d) { return d.Name; })
            .enter()
            .append("i")
            .attr("class", function (d) {
                if (d.Direction === ">") {
                    return "fas fa-minus";
                }
                else { return "fas fa-less-than"}
            })
            .classed("searcharrow", true)
            .attr("x", 0 - relarrowwidth)
            .attr("y", 0)
            .attr("width", relarrowwidth)
            .attr("height", relarrowwidth);

        newedgeg.selectAll(".searchrightarrow")
            .data(me.AdvancedSearch.Edges, function (d) { return d.Name; })
            .enter()
            .append("i")
            .attr("class", function (d) {
                if (d.Direction === "<") { return "fas fa-minus"; }
                else { return "fas fa-arrow-right"; }
            })
            .classed("searcharrow", true)
            .attr("x", rectwidth)
            .attr("y",0)
            .attr("width", relarrowwidth)
            .attr("height", relarrowwidth);
    }
};


AdvancedSearchCoordinator.prototype.onSearchNodeClicked = function () {
    //console.log("AdvancedSearchCoordinator.prototype.onSearchNodeClicked started");
    //console.log(this);
    var datum = AdvancedSearchCoordinator.prototype.UpdateItemDatum("searchNodeDetails", this);
    document.getElementById("nodeType").value = datum.Label;
    document.getElementById("nodeIdentifier").value = datum.Name;
};

AdvancedSearchCoordinator.prototype.onSearchEdgeClicked = function () {
    //console.log("AdvancedSearchCoordinator.prototype.onSearchEdgeClicked started");
    //console.log(this);
    var datum = AdvancedSearchCoordinator.prototype.UpdateItemDatum("searchEdgeDetails", this);
    document.getElementById("edgeType").value = datum.Label;
    document.getElementById("sliderMin").value = datum.Min;
    document.getElementById("sliderMax").value = datum.Max;
    document.getElementById("edgeIdentifier").value = datum.Name;
    var hopsswitch = document.getElementById("hopsSwitch");

    if (datum.Min === -1 || datum.Max === -1) {
        hopsswitch.checked = false;
    }
    else {
        hopsswitch.checked = true;
    }
};

AdvancedSearchCoordinator.prototype.onHopsSwitchChanged = function () {
    console.log("AdvancedSearchCoordinator.prototype.onHopsSwitchChanged started");
    var hopsswitch = document.getElementById("hopsSwitch");
    d3.select("#hopsPane")
        .classed("disabled", !hopsswitch.checked);
    //if (hopsswitch.checked) {
    //    hopspane.disabled = true;
    //}
    //else {
    //    hopspane.enabled = false;
    //}
};

AdvancedSearchCoordinator.prototype.UpdateItemDatum = function (elementid, callingitem) {
    //console.log("AdvancedSearchCoordinator.prototype.SearchItemClicked started");
    //console.log(this);
    //console.log(elementid);
    var details = d3.select("#" + elementid);
    var datum = d3.select(callingitem).datum();
    //console.log(datum);
    details.datum(datum);
    return datum;
};

AdvancedSearchCoordinator.prototype.onSearchNodeSaveBtnClicked = function () {
    //console.log("AdvancedSearchCoordinator.prototype.onSearchNodeSaveBtnClicked started");
    //console.log(this);
    var node = d3.select("#searchNodeDetails").datum();
    var nodeEl = d3.select("#searchnode_" + node.Name);

    console.log(node);

    if (node.Label !== "") {
        nodeEl.classed(node.Label, false);
    }
    

    node.Name = document.getElementById("nodeIdentifier").value;
    node.Label = document.getElementById("nodeType").value;
    console.log(node);

    nodeEl
        .attr("id", "searchnode_" + node.Name)
        .classed(node.Label, true);
    nodeEl.select("text")
        .text(node.Name);
};

AdvancedSearchCoordinator.prototype.onSearchEdgeSaveBtnClicked = function () {
    console.log("AdvancedSearchCoordinator.prototype.onSearchNodeSaveBtnClicked started");
    console.log(this);
    var edge = d3.select("#searchEdgeDetails").datum();
    var edgeEl = d3.select("#searchedge_" + edge.Name);

    console.log(edge);

    if (edge.Label !== "") {
        edgeEl.classed(edge.Label, false);
    }


    edge.Name = document.getElementById("edgeIdentifier").value;
    edge.Label = document.getElementById("edgeType").value;
    edge.Min = document.getElementById("sliderMin").value;
    edge.Max = document.getElementById("sliderMax").value;
    console.log(edge);

    edgeEl
        .attr("id", "searchedge_" + edge.Name)
        .classed(edge.Label, true);
    edgeEl.select("text")
        .text(edge.Name);
};



AdvancedSearchCoordinator.prototype.UpdateNodeProps = function () {
    console.log("updateNodeProps started");
    var type = document.getElementById("nodeType").value;
    var el = document.getElementById("nodeProp");

    clearOptions(el);
    let topoption = addOption(el, "", "");
    topoption.setAttribute("disabled", "");
    topoption.setAttribute("hidden", "");
    topoption.setAttribute("selected", "");

    console.log(nodeDetails);
    console.log(type);

    if (type || type === "*") {
        var typedeets = nodeDetails[type];
        if (typedeets) {
            typedeets.forEach(function (prop) {
                addOption(el, prop, prop);
            });
        }
        else {
            addOption(el, "name", "name");
        }
    }
};

AdvancedSearchCoordinator.prototype.UpdateNodeLabels = function () {
    var el = document.getElementById("nodeType");
    clearOptions(el);
    let topoption = addOption(el, "*", "");
    topoption.setAttribute("selected", "");

    apiGetJson("/api/graph/node/labels", function (data) {
        data.forEach(function (label) {
            addOption(el, label, label);
        });
    });
}

AdvancedSearchCoordinator.prototype.BindAutoComplete = function () {
    $("#" + elementPrefix + "Val").autocomplete({
        source: function (request, response) {
            //console.log("autoComplete: "+ request.term);
            var type = document.getElementById(elementPrefix + "Type").value;
            var prop = document.getElementById(elementPrefix + "Prop").value;

            var url = "/api/graph/node/values?type=" + type + "&property=" + prop + "&searchterm=" + request.term;
            apiGetJson(url, response);
        }
    });
}