var _ = require("underscore");

exports.parseRequest = function (data) {
    try {
        var stri = data.toString().trim(),
            request = JSON.parse(stri);

        if (request.command && request.command !== "") {
            if (!request.params) {
                request.params = [];
            }
            return request;
        } else {
            return {command:"error", params:[]};
        }
    } catch (e) {
        return {command:"error", params:[]};
    }
};

exports.send = function(players, json){
    if(players && !_.isArray(players)){
        players = [players];
    }
    _.each(players, function(p){
        p.write(JSON.stringify(json));
    });
};