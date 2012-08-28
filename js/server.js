var net = require('net'),
    events = require('events'),
    _ = require("underscore");


var lobby = new events.EventEmitter();
lobby.players = {};

lobby.on('join', function (id, client) {

    this.players[id] = client;

    this.on('broadcast', function (senderId, message) {
        if (id != senderId) {
            client.write(message);
        }
    });
});


var server = net.createServer(function (client) {
    var id = client.remoteAddress + ':' + client.remotePort;
    client.playerId = id;
    client.on('connect', function () {
        lobby.emit('join', id, client);
    });

    client.on('data', function (data) {
        var request = parseRequest(data);
        respond(client, request);
    });
});

server.listen(8888);


var commands = {
    ls:function (client) {
        client.write(JSON.stringify({players:
            _.filter(_.pluck(lobby.players, "playerId"), function (p) {
                return p !== client.playerId;
            })
        }));
    },
    challenge:function (client, playerId) {

        var challengingPlayer = client;
        var challengedPlayer = lobby.players[playerId];

        challengingPlayer.challenge = playerId; //one challenge at a time

        challengedPlayer.write(JSON.stringify({challenge:challengedPlayer.playerId}));
        client.write(JSON.stringify({success:true}));
    },
    deny:function (client, playerId) {
        var challengingPlayer = lobby.players[playerId];
        var challengedPlayer = client;

        if (challengingPlayer.challenge === challengedPlayer.playerId) {
            challengingPlayer.write(JSON.stringify({accept:false}));
            client.write(JSON.stringify({success:"Challenge denied"}));
        } else {
            client.write(JSON.stringify({error:"No challenge from that player exists"}));
        }
    },
    accept:function (client, playerId) {
        var challengingPlayer = lobby.players[playerId];
        var challengedPlayer = client;

        if (challengingPlayer.challenge === challengedPlayer.playerId) {
            challengingPlayer.write(JSON.stringify({accept:true}));
            client.write(JSON.stringify({success:"Challenge accepted"}));
        } else {
            client.write(JSON.stringify({error:"No challenge from that player exists"}));
        }
    },
    error:function (client) {
        client.write(JSON.stringify({error:"No such command"}));
    }
};

function respond(client, request) {
    commands[request.command].apply(null, [client].concat(request.params));
}

function parseRequest(data) {

    var stri = data.toString().trim(),
        request = JSON.parse(stri);

    if (request.command && request.command !== "") {
        if(!request.params){
            request.params = [];
        }
        return request;
    } else {
        return {command:"error", params:[]};
    }

}