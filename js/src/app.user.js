	$('.js-auth, .js-contacts').click(function() {

		var _isOpened = $(".is-open"),
			_popups = $(".js-popups");
		
		function closePopups() {
			_isOpened.removeClass('is-open');
			_popups.fadeOut();
		}

		var btn = $(this),
			isOpen = btn.hasClass('is-open');

		if( !isOpen ) {
			closePopups();

			btn
			.addClass('is-open')
			.next().fadeIn();
		}
		else {
			closePopups();
		}   	

		return false;
	});

	$('.chzn-select').chosen({ disable_search_threshold: 100 });