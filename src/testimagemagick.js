var imagemagick = require("./imagemagick/imagemagick");

/*
imagemagick.identify("src/test/fileA.png")
    .then(function(info){
        console.log(info);
    });
*/
imagemagick.compare("test/unit/imagemagick/resources/fileA.png",
        "test/unit/imagemagick/resources/fileB.png",
        "test/unit/imagemagick/resources/output.png")
    .then(function(info){
        'use strict';
        console.log(info.comparison);
    },function(error){
        'use strict';
        console.log(error);
    });

imagemagick.compare("test/unit/imagemagick/resources/fileD.png",
        "test/unit/imagemagick/resources/fileE.png",
        "test/unit/imagemagick/resources/output2.png")
    .then(function(info){
        'use strict';
        console.log(info.comparison);
    },function(error){
        'use strict';
        console.log(error);
    });
