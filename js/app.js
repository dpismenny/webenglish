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

	// adds zero for digits: 9 -> '09'
	function zeroFormatter(value) {
		return (value > 9 ? '' : '0') + value;
	}

	// converts seconds to time string: 1234 -> '20:34'
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
	/*
	 * Audit component
	 */
	(function() {

		// start audit timer 
		function timerStart(_form, time) {
			var	timer = null,
				_time = $('.js-audit-time', _form),
				callback = function() {
					time--;
					_time.text(timeFormatter(time));
					if ( time <= 0 )
						_form.trigger('timerdone');
				};

			_form.on('closeend timerdone', function() {
				clearInterval(timer);
				timer = null;
			});
			timer = setInterval(callback, 1000);
			callback();
		}

		$('.js-audit-row').each(function() {
			var	_row = $(this),
				_form = null,
				data = _row.data(),
				blocked = false;

			function submitHandler(e, data) {
				data = data || {};
				if ( !data.name )
					return false;
				$('[name="mvt_opinion[accepted]"]', _form).attr('checked', data.name == 'yes');
				$.ajax(_form.attr('action'), {
					type: _form.attr('method'),
					data: _form.serialize(),
					complete: function() {
						_form
							.on('closeend', function() { _row.off().remove(); })
							.trigger('close');
					}
				});
				return false;
			}

			_row.on('click', '.js-button-audit, .js-button-cancel', function(e) {
				// ajax request or animation in progress
				if ( blocked )
					return false;

				var	_button = $(this),
					isAudit = _button.hasClass('js-button-audit'),
					isCancel = _button.hasClass('js-button-cancel'),
					isActive,
					url;

				// detect button type
				if ( data.form && isAudit ) {
					isActive = true;
					url = data.form;
				} else if ( data.cancel && isCancel ) {
					isActive = false;
					url = data.cancel;
				} else
					return false;

				// ajax request
				blocked = true;
				$.ajax(url, {
					success: function(json) {
						// toggle row state
						if ( data.active )
							_row.toggleClass(data.active, isActive);

						// form show
						if ( json.form ) {
							_form = $(json.form);
							_form
								.on('timerdone', function() {
									_row.removeClass(data.active);
									_form.trigger('close');
									// @todo: notification
								})
								.on('close', function() {
									_form.slideUp(function() {
										_form
											.trigger('closeend')
											.off()
											.remove();
									});
								})
								.submit(submitHandler)
								.appendTo(_row)
								.slideDown(function() {
									blocked = false;
								})
								.find(':submit')
								.click(function() {
									_form.trigger('submit', { name: this.name });
								});
							if ( json.time_left )
								timerStart(_form, json.time_left);

						// form hide
						} else if ( _form && _form.length ) {
							_form
								.on('closeend', function() { blocked = false; })
								.trigger('close');
						} else {
							// @todo
							blocked = false;
						}
					},
					error: function() {
						// @todo
						blocked = false;
					}
				});

				return false;
			});
		});
	})();
(function(soundManager) {
	if ( !soundManager || !$('.js-player').length )
		return;

	// Setup options
	soundManager.setup({
		url: '/js/soundmanager2/swf/',
		preferFlash: false,
		onready: function() {
			_win.trigger('sm2ready');
		},
		ontimeout: function() {
			// @todo
		}
	});

	// Init players for all views
	_win.on('sm2ready', function() {
		$('.js-player').each(function() {
			var	_this = $(this),
				_time = $('.js-player-time', _this),
				_playpause = $('.js-playpause', _this),
				_bar = $('.js-bar', _this),
				isPause = _playpause.data('pause'),
				isPlay = _playpause.data('play'),
				url = _this.data('url');

			_this
				.on('error', function() {
					_this.addClass('is-hold');
				})
				.on('time', function(e, ms) {
					_time.html('-' + timeFormatter(ms, true));
				})
				.on('bar', function(e, sound) {
					var	width = (sound.position / sound.duration) * 100;
					width = width.toFixed(2);
					_bar.width(width + '%');
				})
				.on('play_state', function() {
					_playpause
						.removeClass(isPlay)
						.addClass(isPause);
				})
				.on('pause_state', function() {
					_playpause
						.removeClass(isPause)
						.addClass(isPlay);
				});

			var sound = soundManager.createSound({
				url: url,
				autoLoad: false,
				autoPlay: false,
				onload: function() {
					if ( !this.loaded )
						return _this.trigger('error');

					_this.trigger('time', this.duration);
					_playpause.click($.proxy(function() {
						if ( this.paused || this.position === 0 )
							this.play();
						else
							this.pause();
					}, this));
					this.play();
				},
				onplay: function() {
					_this.trigger('play_state');
				},
				onresume: function() {
					_this.trigger('play_state');
				},
				onpause: function() {
					_this.trigger('pause_state');
				},
				onfinish: function() {
					this.setPosition(0);
					_this
						.trigger('pause_state')
						.trigger('time', this.duration)
						.trigger('bar', this);
				},
				whileplaying: function() {
					_this
						.trigger('time', this.duration - this.position)
						.trigger('bar', this);
				},
				volume: 100
			});

			_playpause.one('click', function() {
				sound.load();
			});
		});
	});

})(window.soundManager);
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

	$('.js-accord-body').hide();
	$('.js-accord-body1').show();

	$('.js-accord').click(function() {
		var	_this = $(this);
		
		_this
			.toggleClass('is-active')
			.next()
			[_this.hasClass('is-active') ? 'slideDown' : 'slideUp']('fast');
	});

	$('.account__list li')
		.not('.account__more')
		.click(function() {
			$(this).toggleClass('is-selected');
			return false;
		});
});