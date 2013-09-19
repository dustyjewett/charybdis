/*global require, module */

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to match all subfolders:
// 'test/spec/**/*.js'
// templateFramework: 'lodash'

module.exports = function (grunt) {
    'use strict';
    // load all grunt tasks
    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

    // configurable paths
    var charybdisConfig = {
        src: 'src'
    };

    grunt.initConfig({
        charybdis: charybdisConfig,
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            all: [
                'Gruntfile.js',
                '<%= charybdis.src %>/{,*/}*.js',
                'test/{,*/}*.js'
            ]
        },
        release: {
            options: {
                npm: false,
                npmtag: true
            }
        }
    });


    grunt.registerTask('default', [
        'jshint'
    ]);

};
