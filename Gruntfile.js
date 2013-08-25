module.exports = function(grunt) {
	'use strict';

	require('matchdep')
		.filterDev('grunt-*')
		.forEach(grunt.loadNpmTasks);

	grunt.initConfig({
		jshint: {
			options: {
				globals: {
					jQuery: true
				}
			},
			app: ['js/app.js'],
		},

		uglify: {
			app: {
				files: {
					'js/app.min.js': ['js/app.js']
				}
			}
		},

		concat: {
			glue: {
				src: [
					'bower_components/html5shiv/dist/html5shiv.js',
					'bower_components/jquery/jquery.min.js',
					'js/app.min.js'
				],
				dest: 'build/build.js'
			}
		},

		watch: {
			app: {
				files: ['js/app.js'],
				tasks: ['jshint', 'uglify', 'concat']
			}
		}
	});

	grunt.registerTask('default', ['jshint', 'uglify', 'concat', 'watch']);
};