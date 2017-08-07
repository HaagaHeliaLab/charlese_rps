(function () {


    var choice1, // User's choice
	choice2, // Computer's choice
	whoWins, // Holds the winner of the game
    client, // Connection to the Azure Mobile App backend
    store,  // Sqlite store to use for offline data sync
    syncContext, // Offline data sync context
    tableName = 'highestscore',
    scoreTable, // Reference to a table endpoint on backend
    highscore, // Highest score

	gameIsWon = false,
	gameCounter = 0, // Reset value to zero for the game counter

	firstPlayerScore = document.getElementById("first-player-score"), // First player's score
	secondPlayerScore = document.getElementById("second-player-score"), // Second player's score
	showResult = document.getElementById("show-result"),
	gameCounterId = document.getElementById("game-counter"),
	rock = document.getElementById("rock"),
	paper = document.getElementById("paper"),
	scissors = document.getElementById("scissors"),
	firstPlayerImg = document.getElementById("first-player-img"),
	secondPlayerImg = document.getElementById("second-player-img"),
	newGame = document.getElementById("new-game"),
	showResult = document.getElementById("show-result");

    // Set useOfflineSync to true to use tables from local store.
    // Set useOfflineSync to false to use tables on the server.
    var useOfflineSync = true;
    
    
    // Add an event listener to call our initialization routine when the host is ready
    document.addEventListener('deviceready', onDeviceReady, false);

    function onDeviceReady() {
        // Create a connection reference to our Azure Mobile Apps backend and updates the highest score
        client = new WindowsAzure.MobileServiceClient('https://jackenchar.azurewebsites.net');
        if (useOfflineSync) {
            initializeStore().then(setup);
        } else {
            setup();
        }

        scoreTable = client.getTable(tableName);
        refreshDisplay();
        syncBackend();
    }


    //Set up and initialize the local store.
    function initializeStore() {
        // Create the sqlite store
        store = new WindowsAzure.MobileServiceSqliteStore('store.db');

        // Define the table schema
        return store.defineTable({
            name: tableName,
            columnDefinitions: {
                id: 'string',
                score: 'number',
            }
        }).then(function() {
            // Initialize the sync context
            syncContext = client.getSyncContext();

            // Define an overly simplified push handler that discards
            // local changes whenever there is an error or conflict.
            // Note that a real world push handler will have to take action according
            // to the nature of conflict.
            syncContext.pushHandler = {
                onConflict: function (pushError) {
                    return pushError.cancelAndDiscard();
                },
                onError: function (pushError) {
                    return pushError.cancelAndDiscard();
                }
            };

            return syncContext.initialize(store);
        })
        .then(function() {
            scoreTable = client.getSyncTable(tableName);
        });
    }

    //Set up the tables, event handlers and load data from the server
    function setup() {
        
        // Create a table reference
        if (useOfflineSync) {
            scoreTable = client.getSyncTable(tableName);
        } else {
            scoreTable = client.getTable(tableName);
            highscore = localStorage.getItem("highscore");
        }

        syncBackend();
        // Refresh the highscore
        highestScore();
        refreshDisplay();
    }

    function syncBackend() {
        //Sync local store to Azure table when app loads, or when login complete.
        syncContext.push().then(function () {
            //Push completed
        });

        //Pull items from the Azure table after syncing to Azure.
        syncContext.pull(new WindowsAzure.Query(tableName));
        
    }


    // Refresh the display with items from the table. If offline sync is enabled, the local table will be synchronized with the server table before displaying the todo items.

    function refreshDisplay() {

        if (useOfflineSync) {
            syncLocalTable().then(displayItems);
        } else {
            displayItems();
        }
    }

    //Synchronize local table with the table on the server. We do this by pushing local changes to the server and then pulling the latest changes from the server.
    function syncLocalTable() {
        return syncContext.push().then(function () {
            return syncContext.pull(new WindowsAzure.Query(tableName));
        });
    }


    //Displays the todo items
     
    function displayItems() {
        
        scoreTable
            .read()                         // Read the results
            .then(addHighestScoreHandler, handleError);
    }


    //Event handler for adding and updating highscore

    function addHighestScoreHandler(event) {
        highscore = localStorage.getItem("highscore");

        if (highscore !== null) {
            scoreTable.insert({
                score: highscore,
            }).then(highestScore);
        } else {
            scoreTable.update({
                score: highscore,
            }).then(highestScore);
        }

        event.preventDefault();
    }

    // Handle error conditions
    // @param {Error} error the error that needs handling
    // @returns {void}
         
    function handleError(error) {
        var text = error + (error.request ? ' - ' + error.request.status : '');
        console.error(text);
        $('#errorlog').append($('<li>').text(text));
    }


    //GAME//
    // Computer makes its choice at random
    function computerChoice() {
        choice2 = Math.round(Math.random() * 2) + 1;

        switch (choice2) {
            case 1:
                choice2 = "rock";
                break;
            case 2:
                choice2 = "paper";
                break;
            case 3:
                choice2 = "scissors";
                break;
        }
    }

    // First player wins the game
    function firstPlayerWins() {
        firstPlayerScore.innerHTML = parseInt(firstPlayerScore.innerHTML) + 1;
        gameIsWon = true;
        highestScore();
    }

    // Second player wins the game
    function secondPlayerWins() {
        secondPlayerScore.innerHTML = parseInt(secondPlayerScore.innerHTML) + 1;
        gameIsWon = true;
    }

    // Compare both choices and shows the result
    function compare(choice1, choice2) {
        if (choice1 === choice2) {
            whoWins = "It's a tie!";
            firstPlayerWins();
            secondPlayerWins();
        } else if (choice1 === "rock") {
            if (choice2 === "paper") {
                whoWins = "Computer wins!";
                secondPlayerWins();
            } else {
                whoWins = "You win!";
                firstPlayerWins();
            }
        } else if (choice1 === "paper") {
            if (choice2 === "rock") {
                whoWins = "You win!";
                firstPlayerWins();
            } else {
                whoWins = "Computer wins!";
                secondPlayerWins();
            }
        } else if (choice1 === "scissors") {
            if (choice2 === "rock") {
                whoWins = "Computer wins!";
                secondPlayerWins();
            } else {
                whoWins = "You win!";
                firstPlayerWins();
            }
        }

        showResult.innerHTML = whoWins;
        gameCounter = gameCounter + 1;

        
    }

    function addEvent(a, b) {
        a.onclick = function () {
            if (gameIsWon) return;
            computerChoice();
            choice1 = b;
            playersImgs();
            compare(choice1, choice2);
            highestScore();
        };
    }

    // Change Player's Images on choice
    function playersImgs() {
        firstPlayerImg.src = "../www/img/" + choice1 + ".jpg";
        secondPlayerImg.src = "../www/img/" + choice2 + "r.jpg";
    }

    addEvent(rock, "rock");
    addEvent(paper, "paper");
    addEvent(scissors, "scissors");

    newGame.onclick = function () {
        gameIsWon = false;
        firstPlayerImg.src = "../www/img/rpsl.gif";
        secondPlayerImg.src = "../www/img/rpsr.gif";

        showResult.innerHTML = "";
        highestScore();
        computerChoice();
        
    };


    // tracks and updates the highest score
    function highestScore() {
        var currentScore = parseInt(firstPlayerScore.innerHTML);
        highscore = localStorage.getItem("highscore");

        if (highscore !== null) {
            if (currentScore > highscore) {
                localStorage.setItem("highscore", currentScore);
            }
        }
        else {
            localStorage.setItem("highscore", currentScore);
        }

        gameCounterId.innerHTML = highscore;

        //to clear score
        // highscore = localStorage.removeItem("highscore");
    }

})();