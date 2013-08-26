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
			app: {
				src: [
					'js/src/app._head.js',
					'js/src/app.audit.js',
					'js/src/app.user.js',
					'js/src/app.rating.js',
					'js/src/app._foot.js'
				],
				dest: 'js/app.js'
			},
			glue: {
				src: [
					'bower_components/html5shiv/dist/html5shiv.js',
					'bower_components/jquery/jquery.min.js',
					'chosen/chosen.jquery.min.js',
					'js/app.min.js'
				],
				dest: 'build/build.js'
			}
		},

		watch: {
			app: {
				files: ['js/src/*.js'],
				tasks: ['concat:app', 'jshint', 'uglify', 'concat:glue']
			}
		}
	});

	grunt.registerTask('default', ['concat:app', 'jshint', 'uglify', 'concat:glue', 'watch']);
};