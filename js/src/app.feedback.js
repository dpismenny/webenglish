	/*
	 * Feedback component
	 */
	(function() {
		$.fn.feedbackWrap = function() {
			return $(this).each(function() {
				var	_this = $(this),
					_playerWrap = $('.js-player-wrap', _this),
					_player = $('.js-player', _playerWrap),
					opened = false;
				
				_this.click(function(e) {
					if ( $(e.target).closest('.js-player-wrap').length )
						return false;
					opened = !opened;
					_playerWrap[opened ? 'slideDown' : 'slideUp'](slideDuration, function() {
						_player.trigger(opened ? 'do_init' : 'do_stop');
					});
				});
			});
		};

		// Auto init for detected blocks
		$('.js-feedback-row').feedbackWrap();
	})();