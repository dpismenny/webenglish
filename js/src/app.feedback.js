	/*
	 * Feedback component
	 */
	(function() {
		$.fn.feedbackWrap = function() {
			var	_all = $(this);
			return _all.each(function() {
				var	_this = $(this),
					_playerWrap = $('.js-player-wrap', _this),
					_player = $('.js-player', _playerWrap),
					opened = false;

				_this
					.on('close', function() {
						opened = false;
						_playerWrap.hide();
						_player.trigger('do_stop');
					})
					.on('click', function(e) {
						if ( $(e.target).closest('.js-player-wrap').length )
							return false;
						opened = !opened;
						_playerWrap[opened ? 'slideDown' : 'slideUp'](SLIDE_DURATION, function() {
							_player.trigger(opened ? 'do_init' : 'do_stop');
							if ( opened )
								_all.not(_this).trigger('close');
						});
					});
			});
		};

		// Auto init for detected blocks
		$('.js-feedback-row').feedbackWrap();
	})();