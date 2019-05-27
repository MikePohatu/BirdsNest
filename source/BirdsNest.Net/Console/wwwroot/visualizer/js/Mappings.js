﻿function Mappings(jsondata, defaultval) {
    this.mappings = jsondata;
    this.defaultvalue = defaultval;
}

Mappings.prototype.getMappingFromValue = function (value) {
    var me = this;
    var finalmapping = this.defaultvalue;

    if (me.mappings.hasOwnProperty(value)) {
        //console.log("found: " + me.mappings[value]);
        finalmapping = me.mappings[value];
    }

    return finalmapping;
}

Mappings.prototype.getMappingFromArray = function (array) {
    //console.log("Mappings.prototype.getMappingFromArray start:");
    //console.log(array);
    //console.log(this.mappings);
    var me = this;
    var finalmapping = this.defaultvalue;

    var BreakException = {};
    try {
        //double loop because the order of this.mappings is the order that matters
        Object.keys(me.mappings).forEach(function (mapping) {
            array.forEach(function (val) {
                //console.log(mapping);
                //console.log(val);
                if (val === mapping) {
                    finalmapping = me.mappings[mapping];
                    throw BreakException;
                }
                
            });
        }); 
    }
    catch (e) {
        if (e !== BreakException) throw e;
    }

    return finalmapping;
};