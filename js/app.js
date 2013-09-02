jQuery(function($) {
	'use strict';

	/**
	 * Global events emitter
	 * @fires #event:sm2_init Setup SM2 options
	 * @fires #event:sm2_ready SM2 ready to use
	 * @fires #event:create_popup Open notification popup
	 * @fires #event:create_error Open notification error
	 */
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
	/*
	 * Notification component
	 */
	(function() {
		var	templates = {
			popup: _.template($('#tpl_notification_popup').html()),
			error: _.template($('#tpl_notification_error').html())
		};

		_win
			.on('create_notification', function(e, opts) {
				var	_this = $(templates[opts.type](opts)),
					_close = $('.js-close', _this),
					timer;

				_this
					.on('close', function() {
						_this.fadeOut(function() {
							_this
								.off()
								.remove();
						});
						clearTimeout(timer);
						timer = null;
					})
					.appendTo('body')
					.fadeIn();

				_close.click(function() {
					_this.trigger('close');
					return false;
				});

				if ( opts.timeout )
					setTimeout(function() {
						_this.trigger('close');
					}, opts.timeout * 1000);
			})
			.on('create_popup', function(e, opts) {
				opts = $.extend({
					type: 'popup',
					timeout: 5, // sec
					message: ''
				}, opts || {});
				_win.trigger('create_notification', opts);
			})
			.on('create_error', function(e, opts) {
				opts = $.extend({
					type: 'error',
					timeout: 3, // sec
					title: 'Error',
					message: ''
				}, opts || {});
				_win.trigger('create_notification', opts);
			});
	})();
	/*
	 * Player component
	 */
	(function(soundManager) {
		if ( !soundManager )
			return;

		// Setup SM2 options
		_win.one('sm2_init', function() {
			soundManager.setup({
				url: '/js/soundmanager2/swf/',
				preferFlash: false,
				onready: function() {
					_win.trigger('sm2_ready');
				},
				ontimeout: function() {
					throw new Error('SoundManager2 init error');
				}
			});
		});

		/**
		 * jsplayer - jQuery-plugin for SM2 player
		 * @class jsplayer
		 * @memberOf jQuery.fn
		 * @param {Object} [opts] Player options
		 * @param {String} [opts.url] Sound file URL
		 * @param {Number} [opts.volume] Sound volume [0..100], default - 100 
		 * @param {Boolean} [opts.autoplay] Auto play mode, default - false
		 * @param {Boolean} [opts.autoload] Auto load sound file, default - false
		 * @param {Boolean} [opts.onlyback] Only backward set position, default - false
		 * @param {String} [opts.classPause] Class for pause-mode of control
		 * @param {String} [opts.classPlay] Class for play-mode of control
		 * @fires jsplayer#event:do_init
		 * @fires jsplayer#event:do_stop
		 * @fires jsplayer#event:error File loading error
		 * @fires jsplayer#event:time Remaining time changes
		 * @fires jsplayer#event:bar Progress bar position changes
		 * @fires jsplayer#event:play_state Play state for player control
		 * @fires jsplayer#event:pause_state Pause state for player control
		 */
		$.fn.jsplayer = function(opts) {
			opts = opts || {};

			return $(this).each(function() {
				var	_this = $(this),
					_time = $('.js-player-time', _this),
					_playpause = $('.js-playpause', _this),
					_bar = $('.js-bar', _this),
					_notch = $('.js-notch', _this),
					_track = _bar.parent(),
					url = _this.data('url') || opts.url,
					volume = _this.data('volume') || opts.volume || 100,
					autoplay = !!_this.data('autoplay') || opts.autoplay,
					autoload = !!_this.data('autoload') || opts.autoload,
					onlyback = !!_this.data('onlyback') || opts.onlyback,
					classPause = _playpause.data('pause') || opts.classPause,
					classPlay = _playpause.data('play') || opts.classPlay;

				if ( _this.data('jsplayer_added') )
					return false;

				_this
					// Init player, call sound.load() or sound.play()
					.on('do_init', function() {
						if ( sound.position > 0 )
							return;
						else if ( sound.loaded )
							sound.play();
						else
							sound.load();
						_playpause.off('.init');
					})
					// Call sound.stop()
					.on('do_stop', function() {
						sound.stop();
						_notch.hide();
					})
					// File load error
					.on('error', function() {
						_this.addClass('is-hold');
						_win.trigger('create_popup', { message: 'Audio file not found' });
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
					.on('notch', function() {
						var left = sound.maxPosition / sound.duration;
						if ( left === 1 )
							return;
						left *= 100;
						left = left.toFixed(2);
						_notch
							.show()
							.css('left', left + '%');
						_this.
							on('bar.notch', function() {
								if ( sound.position < sound.maxPosition )
									return;
								_notch.hide();
								_this.off('.notch');
							});
					})
					// Set play state for player control
					.on('play_state', function() {
						_playpause
							.removeClass(classPlay)
							.addClass(classPause);
					})
					// Set pause state for player control
					.on('pause_state', function() {
						_playpause
							.removeClass(classPause)
							.addClass(classPlay);
					})
					.data('jsplayer_added', true);

				// Bar click handler, change track current position
				_track
					.click(function(e) {
						if ( $(e.target).closest('.js-notch').length )
							return;

						if ( !sound.loaded || !sound.duration )
							return;

						var	position = (e.offsetX || e.originalEvent.layerX || 0) / _track.width();
						position *= sound.duration;

						if ( onlyback ) {
							if ( position > sound.maxPosition )
								return;
							else
								_this.trigger('notch');
						}

						sound.setPosition(position);
						_this
							.trigger('time', sound.duration - sound.position)
							.trigger('bar');
					});

				// Sound instance
				var sound = soundManager.createSound({
					url: url,
					autoLoad: autoload,
					autoPlay: autoplay,
					onload: function() {
						if ( !this.loaded )
							return _this.trigger('error');

						_this.trigger('time', this.duration);
						_playpause
							.off()
							.click($.proxy(function() {
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
						this.maxPosition = Math.max(this.maxPosition || 0, this.position);
						_this
							.trigger('time', this.duration - this.position)
							.trigger('bar');
					},
					volume: 100
				});

				_playpause.one('click.init', function() {
					_this.trigger('do_init');
				});
			});
		};

		// Init players for all views
		_win.one('sm2_ready', function() {
			$('.js-player').jsplayer({ test: true });
		});

		// Auto init for detected players
		if ( $('.js-player').length )
			_win.trigger('sm2_init');

	})(window.soundManager);
	/*
	 * Audit component
	 */
	(function() {
		/**
		 * auditWrap - jQuery wrapper for audit view
		 * @class auditWrap
		 * @memberOf jQuery.fn
		 * @fires auditWrap#event:init_form
		 * @fires auditWrap#event:timer_start
		 * @fires auditWrap#event:req_form
		 * @fires auditWrap#event:req_cancel
		 */
		$.fn.auditWrap = function() {
			_win.trigger('sm2_init');

			var	_all = $(this);
			return _all.each(function() {
				var	_this = $(this),
					_player = $('.js-player-empty', _this),
					_form = null,
					data = _this.data(),
					classActive = data.active,
					urlForm = data.form,
					urlCancel = data.cancel,
					blocked = false;

				if ( !urlForm || !urlCancel || !classActive )
					throw new Error('Missing required data-attribites for audit element');

				_this
					.on('timer_start', function(e, time) {
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
					})
					.on('init_form', function() {
						var	_buttons = $(':submit', _form),
							_accepted = $('[name="mvt_opinion[accepted]"]', _form);

						_form
							.off()
							.on('timerdone', function() {
								_this.removeClass(classActive);
								_form.trigger('close');
								_win.trigger('create_popup', { message: 'Audit timeout' });
							})
							.on('close', function() {
								_form.slideUp(function() {
									_form
										.trigger('closeend')
										.off()
										.remove();
								});
								_player.trigger('do_stop');
								_all.removeClass('is-hold');
							})
							.on('submit', function(e, data) {
								_accepted.attr('checked', data.name === 'yes');
								$.ajax(_form.attr('action'), {
									type: _form.attr('method'),
									data: _form.serialize(),
									complete: function() {
										_form
											.on('closeend', function() { _this.off().remove(); })
											.trigger('close');
									},
									error: function() {
										// @todo
									}
								});
								return false;
							})
							.appendTo(_this)
							.slideDown(function() {
								blocked = false;
							});

						_buttons.click(function() {
							var	_button = $(this);
							if ( _button.hasClass('is-disabled') )
								return false;
							_form.trigger('submit', { name: _button.attr('name') });
						});
					})
					.on('req_form', function() {
						blocked = true;
						$.ajax(urlForm, {
							success: function(json) {
								// Set view for opened block
								_this.addClass(classActive);
								_all
									.not('.' + classActive)
									.addClass('is-hold');

								// Add form
								_form = $(json.form);
								_this
									.trigger('init_form')
									.trigger('timer_start',  json.time_left);

								// Init player
								if ( json.file )
									_player
										.jsplayer({ url: json.file })
										.on('finish', function() {
											_form
												.find(':submit')
												.removeClass('is-disabled');
										})
										.trigger('do_init');
							},
							error: function() {
								// @todo
								blocked = false;
							}
						});
					})
					.on('req_cancel', function() {
						blocked = true;
						$.ajax(urlForm, {
							success: function(json) {
								_all
									.removeClass(classActive)
									.removeClass('is-hold');

								_form
									.on('closeend', function() { blocked = false; })
									.trigger('close');
							},
							error: function() {
								// @todo
								blocked = false;
							}
						});
					})
					.on('click', function(e) {
						// AJAX request or animation in progress
						if ( blocked || _this.hasClass('is-hold') )
							return false;

						// Click by opened block
						var	isCancel = $(e.target).closest('.js-button-cancel').length;
						if ( !isCancel && _this.hasClass(classActive) )
							return false;

						_this.trigger(isCancel ? 'req_cancel' : 'req_form');
						return false;
					});
			});
		};

		// Auto init for detected blocks
		$('.js-audit-row').auditWrap();
	})();
	/*
	 * Evaluation component
	 */
	(function() {
		/**
		 * evaluationWrap - jQuery wrapper for evaluation view
		 * @class evaluationWrap
		 * @memberOf jQuery.fn
		 * @fires auditWrap#event:next Toggle next speech
		 * @fires auditWrap#event:init_speech Init new speech
		 * @fires auditWrap#event:init_dialogs Init new dialog
		 * @fires auditWrap#event:add_player Init jsplayer instance
		 * @fires auditWrap#event:init_timer Init timer for remaining time
		 * @fires auditWrap#event:open Open info-block
		 * @fires auditWrap#event:close Close info-block
		 * @fires auditWrap#event:remove Remove test and info-block
		 */
		$.fn.evaluationWrap = function() {
			var	_all = $(this),
				tplInfo = _.template($('#tpl_evaluation_info').html()),
				tplPlayer = _.template($('#tpl_evaluation_player').html());

			_win.trigger('sm2_init');

			return _all.each(function() {
				var	_this = $(this),
					_info, _steps, _buttons, _time,
					_player, _playerWrap,
					dialogIndex = 0,
					speechIndex = -1,
					data = _this.data(),
					blocked = false,
					json;

				_this
					.on('next', function() {
						speechIndex++;

						if ( !json.dialogs[dialogIndex] )
							return _this.trigger('remove');

						if ( !json.dialogs[dialogIndex].speeches[speechIndex] ) {
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
						var	speech = json.dialogs[dialogIndex].speeches[speechIndex],
							origin = speech.origin,
							translated = speech.translated;

						_this.trigger('add_player', origin);
						_player.on('finish', function() {
							_this.trigger('add_player', translated);
							_player
								.trigger('do_init')
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
					.on('init_dialogs', function() {
						_info = $(tplInfo(json));
						_playerWrap = $('.js-player-wrap', _info);
						_buttons = $('.js-evaluation-button', _info);
						_time = $('.js-evaluation-time', _info);
						_steps = $('.js-steps li', _info);
						_info.insertAfter(_this);
						_this
							.trigger('next')
							.trigger('open');
					})
					.on('init_timer', function(e, time) {
						var	timer = null,
							callback = function() {
								time--;
								_time.text(timeFormatter(time));
								if ( time <= 0 ) {
									_this.trigger('remove');
									_win.trigger('create_popup', { message: 'Evaluation timeout' });
								}
							};

						_this.on('close remove', function() {
							clearInterval(timer);
							timer = null;
						});
						timer = setInterval(callback, 1000);
						callback();
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
							.trigger('do_init');
					})
					.on('toggle_button', function(e, enable) {
						_buttons
							.toggleClass('is-disabled', !enable)
							.click(function() { return false; });
					})
					.on('open', function() {
						_this
							.addClass('is-active')
							.trigger('init_timer', json.left_time);
						_all
							.not('.is-active')
							.addClass('is-hold');
						_player.trigger('do_init');
						_info.slideDown();
					})
					.on('close', function() {
						_this.removeClass('is-active');
						_all.removeClass('is-hold');
						_player.trigger('do_stop');
						_info.slideUp();
					})
					.on('remove', function() {
						_player.trigger('do_stop');

						_this
							.add(_buttons)
							.add(_player)
							.off();

						_info.slideUp(function() {
							_info.remove();
							_this.remove();
							_all.removeClass('is-hold');
						});
					})
					.click(function() {
						if ( blocked || _this.hasClass('is-hold') )
							return false;

						if ( _info )
							return _this.trigger(_info.is(':visible') ? 'close' : 'open'), false;

						blocked = true;
						$.ajax(data.url, {
							success: function(response) {
								json = response;
								_this.trigger('init_dialogs');
							},
							complete: function() {
								blocked = false;
							},
							error: function() {
								// @todo
							}
						});

						return false;
					});
			});
		};

		// Auto init for detected blocks
		$('.js-evaluation').evaluationWrap();
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