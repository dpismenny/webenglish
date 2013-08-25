jQuery(function($) {
	'use strict';

	$('.js-audit-row').each(function() {
		var	_row = $(this);

		_row
			.on('click', '.js-button-audit', function() {
				_row.addClass('audit__row_long');
				// @todo
				return false;
			})
			.on('click', '.js-button-cancel', function() {
				_row.removeClass('audit__row_long');
				// @todo
				return false;
			});
		
	});
});