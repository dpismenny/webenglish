jQuery(function($) {
	'use strict';

	var	_win = $(window);

	/*
	 * Settings
	 */ 
	$.ajaxSetup({
		cache: false,
		dataType: 'json'
	});

	/*
	 * Utils
	 */

	// Adds zero for digits: 9 -> '09'
	function zeroFormatter(value) {
		return (value > 9 ? '' : '0') + value;
	}

	// Converts seconds to time string: 1234 -> '20:34'
	function timeFormatter(value, ms) {
		value = parseInt(value || 0, 10);
		value = ms ? Math.round(value / 1000) : value;
		var	hours = Math.floor(value / 3600),
			minutes = Math.floor((value % 3600) / 60),
			seconds = value % 60,
			template = (hours ? '{hours}:' : '') + '{minutes}:{seconds}';
		return template
			.replace('{hours}', zeroFormatter(hours))
			.replace('{minutes}', zeroFormatter(minutes))
			.replace('{seconds}', zeroFormatter(seconds));
	}