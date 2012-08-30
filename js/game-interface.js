var ch = require("./command-helper.js"),
    _ = require("underscore"),
    tictactoe = require('boardgames').tictactoe;

function startGame(player1, player2, done){

    var board = tictactoe.instance(),
        turn = player1.playerId;

    register(player1);
    register(player2);
    player1.color = tictactoe.CROSS;
    player2.color = tictactoe.CIRCLE;
    alertTurn(player1);

    function register(player) {
        player.on('data', function (data) {
            var request = ch.parseRequest(data);
            respond(player, request);
        });
    }


    var commands = {
        move:function (player, move) {
            //it is this players turn
            if(player.playerId === turn && move){
                board.play(move, player.color);

                if(board.checkWin(player.color)){
                    ch.send(player,{result: 'win'});
                    ch.send(otherPlayer(player), {result: 'loss'});

                    console.log(board.toString());
                    done();

                } else if(!board.free().length){
                    ch.send( [player, otherPlayer(player)], {result: "draw"});
                    console.log(board.toString());
                    done();

                } else{
                    ch.send(player, {success: true, board: board.value()});
                    console.log(board.toString());
                    turn = otherPlayer(player).playerId;
                    alertTurn(otherPlayer(player));
                }

            } else if(!move){
                ch.send(player, {error: "invalid move"});
            } else{
                ch.send(player, {error: "not your turn"});
            }
        },
        error:function (client) {
            ch.send(client, {error:"No such command"});
        }
    };

    function alertTurn(player){
        ch.send(player, {turn: true, board: board.value});
    }



    function otherPlayer(player){
        if(player1.playerId === player.playerId){
            return player2;
        } else {
            return player1;
        }
    }

    function respond(client, request) {
        var command = commands[request.command] || commands.error;

        command.apply(null, [client].concat(request.params));
    }
}


exports.startGame = startGame;