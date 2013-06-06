var imagemagick = require("./imagemagick/imagemagick");

/*
imagemagick.identify("src/test/fileA.png")
    .then(function(info){
        console.log(info);
    });
*/
imagemagick.compare("src/test/fileA.png", "src/test/fileB.png", "src/test/output.png")
    .then(function(info){
        console.log(info.comparison);
    },function(error){
        console.log(error);
    });

imagemagick.compare("src/test/fileD.png", "src/test/fileE.png", "src/test/output2.png")
    .then(function(info){
        console.log(info.comparison);
    },function(error){
        console.log(error)
    });
