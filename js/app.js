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
				_player = $('.js-player', _row),
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
									_player.data('sound').stop();
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

							_player.trigger('init');
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
	/*
	 * Player component
	 */
	(function(soundManager) {
		if ( !soundManager )
			return;

		// Setup options 
		_win.on('sm2init', function() {
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
		});

		// jsplayer jQuery-plugin
		$.fn.jsplayer = function(opts) {
			return $(this).each(function() {
				var	_this = $(this),
					_time = $('.js-player-time', _this),
					_playpause = $('.js-playpause', _this),
					_bar = $('.js-bar', _this),
					_track = _bar.parent(),
					autoPlay = !!_this.data('autoplay'),
					isPause = _playpause.data('pause'),
					isPlay = _playpause.data('play'),
					url = _this.data('url');

				_this
					// Init player, fired load or play
					.on('init', function() {
						_playpause.off('.init');
						if ( sound.position > 0 )
							return;
						else if ( sound.loaded )
							sound.play();
						else
							sound.load();
					})
					// File load error
					.on('error', function() {
						_this.addClass('is-hold');
					})
					// Set remaining time
					.on('time', function(e, ms) {
						_time.html('-' + timeFormatter(ms, true));
					})
					// Set bar position
					.on('bar', function() {
						var	width = (sound.position / sound.duration) * 100;
						width = width.toFixed(2);
						_bar.width(width + '%');
					})
					// Set play state for player control
					.on('play_state', function() {
						_playpause
							.removeClass(isPlay)
							.addClass(isPause);
					})
					// Set pause state for player control
					.on('pause_state', function() {
						_playpause
							.removeClass(isPause)
							.addClass(isPlay);
					});

				// Bar click handler, change track current position
				_track
					.click(function(e) {
						if ( sound.loaded && sound.duration ) {
							var	position = (e.offsetX || e.originalEvent.layerX || 0) / _track.width();
							position *= sound.duration;
							sound.setPosition(position);
							_this
								.trigger('time', sound.duration - sound.position)
								.trigger('bar');
						}
					});

				// Sound instance
				var sound = soundManager.createSound({
					url: url,
					autoLoad: false,
					autoPlay: autoPlay,
					onload: function() {
						if ( !this.loaded )
							return _this.trigger('error');

						_this.trigger('time', this.duration);
						_playpause.click($.proxy(function() {
							if ( this.paused || this.playState === 0 )
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
					onstop: function() {
						this.setPosition(0);
						_this
							.trigger('pause_state')
							.trigger('time', this.duration)
							.trigger('bar');
					},
					onfinish: function() {
						_this
							.trigger('finish')
							.trigger('pause_state')
							.trigger('time', this.duration)
							.trigger('bar');
					},
					whileplaying: function() {
						_this
							.trigger('time', this.duration - this.position)
							.trigger('bar');
					},
					volume: 100
				});
	
				_playpause.one('click.init', function() {
					_this.trigger('init');
				});

				_this.data('sound', sound);
			});
		};

		// Init players for all views
		_win.on('sm2ready', function() {
			$('.js-player').jsplayer({ test: true });
		});

		// Auto init for detected players
		if ( $('.js-player').length )
			_win.trigger('sm2init');
	})(window.soundManager);
	/*
	 * Evaluation component
	 */
	(function() {
		if ( !$('.js-evaluation').length )
			return;

		// Templates for info block and player block
		var	tplInfo = _.template($('#tpl_evaluation_info').html()),
			tplPlayer = _.template($('#tpl_evaluation_player').html());

		// Init evaluation rows
		$('.js-evaluation').each(function() {
			var	_this = $(this),
				_info, _steps, _player, _playerWrap, _buttons,
				dialogIndex = 0,
				speechIndex = -1,
				data = _this.data(),
				json;

			function initDialogs(response) {
				json = response;
				_info = $(tplInfo({ dialogs: json }));
				_playerWrap = $('.js-player-wrap', _info);
				_buttons = $('.js-evaluation-button', _info);
				_steps = $('.js-steps li', _info);
				_info
					.insertAfter(_this)
					.slideDown();
				_this
					.addClass('is-active')
					.trigger('next');
			}

			_this
				.on('toggle_button', function(e, enable) {
					_buttons
						.toggleClass('is-disabled', !enable)
						.click(function() { return false; });
				})
				.on('next', function() {
					speechIndex++;

					if ( !json[dialogIndex] ) {
						_this
							.add(_buttons)
							.add(_player)
							.off();
						_info.slideUp(function() {
							_info.remove();
							_this.remove();
						});
						return;
					}

					if ( !json[dialogIndex].speeches[speechIndex] ) {
						dialogIndex++;
						speechIndex = -1;
						return _this.trigger('next');
					}

					_steps.each(function(index) {
						$(this).addClass(index < dialogIndex ? 'is-done' : (dialogIndex === index ? 'is-active' : ''));
					});

					_this
						.trigger('toggle_button', false)
						.trigger('init_speech');
				})
				.on('init_speech', function() {
					var	speech = json[dialogIndex].speeches[speechIndex],
						origin = speech.origin,
						translated = speech.translated;

					_this.trigger('add_player', origin);
					_player.on('finish', function() {
						_this.trigger('add_player', translated);
						_player
							.trigger('init')
							.on('finish', function() {
								_this.trigger('toggle_button', true);
								_buttons
									.off()
									.one('click.ajax', function() {
										_buttons.off('.ajax');
										$.ajax(data.post, {
											type: 'POST',
											data: {
												state: $(this).data('value'),
												id: speech.id
											},
											error: function() {
												// @todo
											},
											complete: function() {
												_this.trigger('next');
											}
										});
										return false;
									})
									.click(function() {
										return false;
									});
							});
					});
				})
				.on('add_player', function(e, url) {
					if ( _player )
						_player
							.off()
							.remove();

					_player = $(tplPlayer({ url: url }));
					_player
						.appendTo(_playerWrap)
						.jsplayer()
						.trigger('init');
				})
				.click(function() {
					if ( _info ) {
						_this.toggleClass('is-active', !_info.is(':visible'));
						return _info.slideToggle();
					}

					$.ajax(data.url, {
						success: initDialogs,
						error: function() {
							// @todo
						}
					});
				});
		});

		// Init soundManager lib
		_win.trigger('sm2init');
	})();
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