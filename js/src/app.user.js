	$('.js-auth').click(function() {
		var	_this = $(this),
			_popup = $('.js-popups');

		if ( _this.hasClass('is-open') ) {
			_this.removeClass('is-open');
			_popup.fadeOut();
		} else {
			_popup.fadeOut();
			_this
				.addClass('is-open')
				.next()
				.fadeIn();
		}
		return false;
	});

	$('.chzn-select').chosen({ disable_search_threshold: 100 });