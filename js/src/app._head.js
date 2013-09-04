jQuery(function($) {
	'use strict';

	/**
	 * Global events emitter
	 * @fires #event:sm2_init Setup SM2 options
	 * @fires #event:sm2_ready SM2 ready to use
	 * @fires #event:create_popup Open notification popup
	 * @fires #event:create_error Open notification error
	 */
	var	_win = $(window),
		_doc = $(document);

	/*
	 * Settings
	 */ 
	$.ajaxSetup({
		cache: false,
		dataType: 'json'
	});

	var SLIDE_DURATION = 200,
		QUEUE_DELAY = 3000;

	/*
	 * Utils
	 */
	$.fn.unselectable = function() {
		return $(this)
			.attr('unselectable', 'on')
			.css('user-select', 'none')
			.on('selectstart', false);
	};

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