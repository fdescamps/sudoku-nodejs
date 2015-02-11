var split = require("split");
var Transform = require("stream").Transform;
var util = require("util");
var fs = require('fs');

process.stdin.setEncoding("utf8"); // convert bytes to utf8 characters


Array.prototype.unique = function() {
    var o = {}, i, l = this.length, r = [];
    for(i=0; i<l;i+=1) o[this[i]] = this[i];
    for(i in o) r.push(o[i]);
    return r;
};



// input: a single line of text
// output: 2D array representing a sudoku puzzle
// Output is only written once the puzzle has been created.
// This stream expects the format:
// 1 // number of problems in input
// 2 // size of puzzle
// 1 2 3 4 // puzzle
// 1 2 3 4
// 1 2 3 4
// 1 2 3 4


util.inherits(ProblemStream, Transform); // inherit Transform

function ProblemStream () {
    Transform.call(this, { "objectMode": true }); // invoke Transform's constructor

    this.numProblemsToSolve = null;
    this.puzzleSize = null;
    this.currentPuzzle = null;
}


ProblemStream.prototype._transform = function ( line, encoding, processed ) {
    //console.log( line );
    if (this.numProblemsToSolve === null) { // handle first line
        this.numProblemsToSolve = +line;
    } else if (this.puzzleSize === null) { // start a new puzzle
        this.puzzleSize = (+line) * (+line); // a size of 3 means the puzzle will be 9 lines long
        this.currentPuzzle = [];
    }else {
        var numbers = line.match(/\d+/g); // break line into an array of numbers
        this.currentPuzzle.push(numbers); // add a new row to the puzzle
        this.puzzleSize--; // decrement number of remaining lines to parse for puzzle

        if (this.puzzleSize === 0) {
            this.push(this.currentPuzzle); // we've parsed the full puzzle; add it to the output stream
            this.puzzleSize = null; // reset; ready for next puzzle
        }
    }
    processed(); // we're done processing the current line
};






util.inherits(SolutionStream, Transform);

function SolutionStream () {
    Transform.call(this, { "objectMode": true });
}

/*
 *. You need to check for all the constraints of Sudoku :
 * - check the sum on each row
 * - check the sum on each column
 * - check for sum on each box
 * - check for duplicate numbers on each row
 * - check for duplicate numbers on each column
 * - check for duplicate numbers on each box
*/
SolutionStream.prototype._transform = function ( problem, encoding, processed ) {

    var solution = solveOneGrid( problem );
    //console.log( '----> solution : ' + solution );
    this.push( solution?"true":"false" );//when you push just a basic false the stream ends... WTF????
    processed();

    function sumFromZeroToN( n ){
      var acc = 0;
      for( i=1; i <= n ; i++ ){
        acc = acc + i;
      }
      return acc;
    }

    function checkSum( myArray, sum ){
      var resultat = myArray
        .map( function( current ){ return parseInt( current ) } )
        .reduce( function(pv, cv) { return pv + cv; }, 0 );
      //console.log( '--> ' + myArray + ', expected : '+ sum + ', result :' + resultat );
      return resultat === sum ? true : false;
    }

    function isNoDuplicate( myArray ){
      var resultat = myArray.unique().length === problem.length;
      //console.log( '--> ' + myArray + ', result : ' + resultat );
      return resultat ? true : false;
    }

    function checkBox( inf, sup, myArray, sumFromZero ){
      var subGrid = [];
      var resultat = true;
      for( var idx=inf; idx < sup ; idx++ ){
        subGrid = subGrid.concat( myArray[idx].slice( inf, sup ) );
      }
      if( !checkSum( subGrid, sumFromZero ) ) resultat = false;
      if( !isNoDuplicate( subGrid ) ) resultat = false;
      return resultat;
    }

    function solveOneGrid ( problem ) {
      var resultat = true;
      var sumFromZero = sumFromZeroToN( problem.length );
      for( i=0; i < problem.length ; i++ ){
        //line : sum/duplicates
        if( !checkSum( problem[i], sumFromZero ) ) resultat = false;
        if( !isNoDuplicate( problem[i] ) ) resultat = false;
        //column : sum/duplicates
        if( !checkSum( problem.map( function( value,index ){ return value[i]; } ), sumFromZero ) ) resultat = false;
        if( !isNoDuplicate( problem.map( function( value,index ){ return value[i]; } ) ) ) resultat = false;
        // check for sum/no duplicates on each box
        if( !checkBox( 0, problem.length/3, problem, sumFromZero ) ) resultat = false;
        if( !checkBox( problem.length/3, problem.length/3*2, problem, sumFromZero ) ) resultat = false;
        if( !checkBox( problem.length/3*2, problem.length/3*3, problem, sumFromZero ) ) resultat = false;
      }
      return resultat;
    }
};





util.inherits(FormatStream, Transform);
function FormatStream () {
    Transform.call(this, { "objectMode": true });

    this.caseNumber = 0;
}

FormatStream.prototype._transform = function ( solution, encoding, processed ) {
    this.caseNumber++;

    var result = ( solution=="true" ? "Yes" : "No" );

    var formatted = "Case #" + this.caseNumber + ": " + result + "\n";

    this.push( formatted );
    processed();
};




console.log( "Sudoku Checker with nodejs-stream-test-data.js" );
fs.createReadStream( "nodejs-stream-test-data.js" )
    .pipe( split() )
    .pipe( new ProblemStream() )
    .pipe( new SolutionStream() )
    .pipe( new FormatStream() )
    .pipe( process.stdout );
