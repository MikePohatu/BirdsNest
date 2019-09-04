﻿import * as vis from './visualizer/js/visualizer';
import AdvancedSearchCoordinator from './visualizer/ts/AdvancedSearchCoordinator';

import $ from 'jquery';
import { webcrap } from "./shared/webcrap/webcrap";

//temporary to dealing with legacy crap
global.vis = vis;

var paramdata = $("viewdataLoadIDs").value;
vis.drawGraph('drawingpane', paramdata);

var searchcoordinator = new AdvancedSearchCoordinator("searchPathSvg", "searchConditionSvg");


var sharedsearchstring = document.getElementById("sharedSearchString").value;
//console.log("sharedsearchstring: " + sharedsearchstring);
if (webcrap.misc.isNullOrWhitespace(sharedsearchstring) === false) {
    try {
        var json = JSON.parse(webcrap.misc.decodeUrlB64(sharedsearchstring));
        //console.log(json);
        if (json) {
			searchcoordinator.LoadSearchJson(json);
        }
    }
    catch {
        console.error("Unable to parse shared search string");
    }
}

