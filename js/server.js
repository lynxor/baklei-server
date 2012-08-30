var net = require('net'),
    events = require('events'),
    _ = require("underscore"),
    game = require("./game-interface.js"),
    ch = require("./command-helper.js");


var lobby = new events.EventEmitter();
lobby.players = {};

lobby.on('join', function (id, client) {

    this.players[id] = client;

    this.on('broadcast', function (senderId, message) {
        if (id != senderId) {
            client.write(message);
        }
    });

    this.on('leave', function (id) {
        this.players[id] = undefined;
        this.emit('broadcast', id, id + " has left the lobby.\n");
    });

});


var server = net.createServer(function (client) {
    var id = client.remoteAddress + ':' + client.remotePort;
    client.playerId = id;
    client.on('connect', function () {
        lobby.emit('join', id, client);
    });

    client.on('data', function (data) {
        var request = ch.parseRequest(data);
        respond(client, request);
    });
    client.on('close', function () {
        lobby.emit('leave', id);
    });

});

server.listen(8888);


var commands = {
    ls:function (client) {
        ch.send(client, {players:_.filter(_.pluck(lobby.players, "playerId"), function (p) {
            return p !== client.playerId;
        })
        });
    },
    setName:function (player, name) {
        player.playerName = name;
        ch.send(player, {success:true});
    },
    challenge:function (client, playerId) {

        var challengingPlayer = client;
        var challengedPlayer = lobby.players[playerId];

        challengingPlayer.challenge = playerId; //one challenge at a time

        ch.send(challengedPlayer, {challenge:challengingPlayer.playerId});
        ch.send(challengingPlayer, {success:true});
    },
    deny:function (client, playerId) {
        var challengingPlayer = lobby.players[playerId];
        var challengedPlayer = client;

        if (challengingPlayer.challenge === challengedPlayer.playerId) {
            ch.send(challengingPlayer, {accept:false});
            challengingPlayer.challenge = undefined;

            ch.send(challengedPlayer, {success:"Challenge denied"});
        } else {
            ch.send(challengedPlayer, {error:"No challenge from that player exists"});
        }
    },
    accept:function (client, playerId) {
        var challengingPlayer = lobby.players[playerId];
        var challengedPlayer = client;

        if (challengingPlayer.challenge === challengedPlayer.playerId) {
            ch.send(challengingPlayer, {accept:true});
            ch.send(challengedPlayer, {success:"Challenge accepted"});

            challengedPlayer.removeAllListeners();
            challengingPlayer.removeAllListeners();

            game.startGame(challengedPlayer, challengingPlayer, function () {

                lobby.emit('join', challengedPlayer.playerId, challengedPlayer);
                lobby.emit('join', challengingPlayer.playerId, challengingPlayer);
            });

        } else {
            ch.send(client, {error:"No challenge from that player exists"});
        }


    },
    error:function (client) {
        ch.send(client, {error:"No such command"});
    }
};

function respond(client, request) {
    var command = commands[request.command] || commands.error;
    command.apply(null, [client].concat(request.params));
}
