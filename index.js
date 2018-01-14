#!/usr/bin/env node
var fs                 = require('fs');
var path               = require('path');
var program            = require('commander');
var async              = require('async');
var replace            = require('replace-in-file');
var escapeStringRegexp = require('escape-string-regexp');


const DIRECTORY = "./v1/";
const FROM      = "7777";
const TO        = "8888";
const ACTION    = "";


program
    .version('0.0.1')
    .option('-f, --from <from>', 'The prefix for translatable text. Default: ')
    .option('-t, --to <to>', 'The suffix for translatable text. Default: ')
    .option('-d, --dir <directory>', 'Directory to search. Default: ')
    .option('-a, --action <action>', 'Directory to search. Default: ')
    .parse(process.argv);


var directory = program.dir    || DIRECTORY;
var from      = program.from   || FROM;
var to        = program.to     || TO;
var action    = program.action || ACTION;

    
function flatten(lists) {
    return lists.reduce(function (a, b) {
        return a.concat(b);
    }, []);
}
function getDirectories(srcpath) {
    return fs.readdirSync(srcpath)
        .map(file => path.join(srcpath, file))
        .filter(path => fs.statSync(path).isDirectory());
}
function getDirectoriesRecursive(srcpath) {
    return [srcpath, ...flatten(getDirectories(srcpath).map(getDirectoriesRecursive))];
}
function getExtensionsArray(extensions) {
    var array;

    if (extensions != "")
        extensions = extensions.replace(/\s/g, '');
    else
        extensions = EXTENSIONS;


    array = extensions.split(',');
    array = array.filter(String);

    return array;
}
function walkSync(dir, filelist) {
    // List all files in a directory in Node.js recursively in a synchronous fashion
    var path     = path || require('path');
    var fs       = fs || require('fs'),
        files    = fs.readdirSync(dir);
        filelist = filelist || [];
    files.forEach(function(file) {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            filelist = walkSync(path.join(dir, file), filelist);
        }else{
            filelist.push(path.join(dir, file));
        }
    });
    return filelist;
};


console.log('Setting error codes in %d from=%f to=%t action=%a ...');


var directory = program.dir || DIRECTORY;
var from      = program.from || FROM;
var to        = program.to || TO;
var action    = program.action || ACTION;

var options = {
    files           : '',       // 'path/to/file',
    from            : '',       // /foo/g,
    to              : ''
};


// tüm dizinleri al (alt dizinleriyle birlikte)
var allDirectories = getDirectoriesRecursive(directory);
var allFiles       = [];
var changedFiles   = [];

var finalOutput = {};
async.series([

    //
    function(callback){
        var all = walkSync(directory);
        all.forEach(function (file) {
            if( file.split('.').pop()=='js' ){
                var filePath = file.replace(/\\/g, "/");
                allFiles.push(filePath);
            }
        });
        return callback();
    },

    //
    function(callback){

        // her dosya için
        async.eachOfSeries(allFiles, function(file, key1, callback){
            
            fs.readFile(file, 'utf-8', function (err, content) {
                
                if( content.includes('customError("' + from + '"') ){

                    file = '' + file;
                    console.log("file ", file);

                    var escapedFrom = escapeStringRegexp(from);
 console.log("escapedFrom ", escapedFrom);

                    // content deki kurala uyanları array e at
                    var rege = new RegExp(escapedFrom, "g");
 console.log("rege ", rege);

                    options.files = file;
                    options.from  = rege;
                    options.to    = to;
                    
                    replace(options)
                    .then(changes => {
                        changedFiles.push(file);
                        console.log('Modified files: ', changes.join(', '));
                        return callback();
                    })
                    .catch(error => {
                        console.error('Error occurred: ', error);
                        return callback();
                    });

                }else{
                    return callback();
                }

            });

        }, (error) => {
            if(error){ console.log(error); }
            return callback(); 
        });

        

    },



], (error)=> {
    if(error){ console.log(error) }

    //finalOutput.allFiles     = allFiles;
    finalOutput.changedFiles = changedFiles;
    finalOutput.messages     = [
        { text : 'ERROR CODES UPDATED' }
    ];

    console.log(finalOutput);
});