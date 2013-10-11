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

	var FADE_DURATION = 200,
		SLIDE_DURATION = 200,
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
		
		// Static notifications
		$('.js-noty').on('click', '.js-close', function() {
			$(this).closest('.js-noty').fadeOut(FADE_DURATION);
			return false;
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
				// flashVersion: 9,
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
						_win.trigger('create_popup', { message: 'Error – audio file was not loaded' });
					})
					// Set remaining time
					.on('time', function(e, opts) {
						_time.html((opts.positive ? '' : '-') + timeFormatter(opts.ms, true));
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
							.trigger('time', { ms: sound.duration - sound.position })
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

						_this.trigger('time', { ms: this.duration });
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
							.trigger('time', { ms: this.duration, positive: true })
							.trigger('bar');
					},
					onfinish: function() {
						_this
							.trigger('finish')
							.trigger('pause_state')
							.trigger('time', { ms: this.duration, positive: true })
							.trigger('bar');
					},
					whileplaying: function() {
						this.maxPosition = Math.max(this.maxPosition || 0, this.position);
						_this
							.trigger('time', { ms: this.duration - this.position })
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
						var	_buttonsBlock = $('.js-audit-buttons', _form),
							_buttons = $(':submit', _buttonsBlock), 
							_feedback = $('.js-audit-more', _form);

						_form
							.off()
							.on('timerdone', function() {
								_this.removeClass(classActive);
								_form.trigger('close');
								_win.trigger('create_popup', { message: 'Your complain review session has timed out' });
							})
							.on('close', function() {
								_form.slideUp(SLIDE_DURATION, function() {
									_form
										.trigger('closeend')
										.off()
										.remove();
								});
								_player.trigger('do_stop');
								_all.removeClass('is-hold');
							})
							.appendTo(_this)
							.slideDown(SLIDE_DURATION, function() {
								blocked = false;
							});

						// Feedback form behaviour
						if ( _feedback.length ) {
							
							_feedback.submit(function() {
								$.ajax(_feedback.data('submit'), {
									type: _feedback.attr('method'),
									data: _feedback.serialize(),
									success: function() {
										_form
											.on('closeend', function() { _this.off().remove(); })
											.trigger('close');
									},
									error: function() {
										_win.trigger('create_error', {
											message: 'Server failed – could not complete the refund claim'
										});
									}
								});

								return false;
							});
							var _checkboxes = _feedback.find(':checkbox');
							_checkboxes
								.click(function() {
									if ( this.checked )
										_checkboxes
											.not(this)
											.prop('checked', false);

									_checkboxes.each(function() {
										$(this)
											.parent()
											.next()
											.toggle(this.checked)
											.find('textarea')
											.prop('disabled', !this.checked);
									});
								});
						}

						_buttons.click(function() {
							var	_button = $(this),
								state = _button.attr('name'),
								isCorrect = state === 'correct';

							if ( _button.hasClass('is-disabled') )
								return false;

							// Show feedback form
							if ( _feedback.length && isCorrect ) {
								_feedback.slideDown(SLIDE_DURATION);
								_buttonsBlock.hide();
							}

							// Send click button event
							$.ajax(_form.data('evaluate'), {
								type: 'POST',
								data: { state: state },
								success: function() {
									if ( !isCorrect )
										_form
											.on('closeend', function() { _this.off().remove(); })
											.trigger('close');
								},
								error: function() {
									_win.trigger('create_error', {
										message: state === 'correct' ? 'Server failed – could not complete the refund claim' : 'Server failed – could not cancel the refund claim'
									});
								}
							});
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
								_form = $(json.html);
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
								_win.trigger('create_error', { message: 'Server failure – the claim form could not be loaded' });
								blocked = false;
							}
						});
					})
					.on('req_cancel', function() {
						blocked = true;
						$.ajax(urlCancel, {
							success: function(json) {
								_all
									.removeClass(classActive)
									.removeClass('is-hold');

								_form
									.on('closeend', function() { blocked = false; })
									.trigger('close');
							},
							error: function() {
								_win.trigger('create_error', { message: 'Server failed – the refund claim could not be cancelled' });
								blocked = false;
							}
						});
					})
					.on('click', function(e) {
						// AJAX request or animation in progress
						if ( blocked || _this.hasClass('is-hold') )
							return true;

						var _target = $(e.target);
						// Click by opened block
						var	isCancel = _target.closest('.js-button-cancel').length;
						if ( !isCancel && _this.hasClass(classActive) )
							return true;

						_this.trigger(isCancel ? 'req_cancel' : 'req_form');
						if ( _target.is('a') )
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
													_win.trigger('create_error', { message: 'Server failure – could not assess speech in tests' });
												},
												success: function() {
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
									_win.trigger('create_popup', { message: 'Your test has timed out' });
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
						_info.slideDown(SLIDE_DURATION);
					})
					.on('close', function() {
						_this.removeClass('is-active');
						_all.removeClass('is-hold');
						_player.trigger('do_stop');
						_info.slideUp(SLIDE_DURATION);
					})
					.on('remove', function() {
						_player.trigger('do_stop');

						_this
							.add(_buttons)
							.add(_player)
							.off();

						_info.slideUp(SLIDE_DURATION, function() {
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
								_win.trigger('create_error', { message: 'Server failure – could not retrieve the list of dialogues' });
							}
						});

						return false;
					});
			});
		};

		// Auto init for detected blocks
		$('.js-evaluation').evaluationWrap();
	})();
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
	/*
	 * Dashboard slider component
	 */
	(function() {
		if ( !$('.js-cost').length )
			return;

		var	_cost = $('.js-cost').unselectable(),
			_plus = $('.js-plus', _cost),
			_minus = $('.js-minus', _cost),
			_value = $('.js-cost-value', _cost),
			_slider = $('.js-slider', _cost),
			_sliderBar = $('.js-slider-bar', _slider),
			_sliderButton = $('.js-slider-button', _slider),
			url = _cost.data('url'),
			cost = _cost.data('cost'),
			maxCost = _cost.data('maxcost'),
			minCost = _cost.data('mincost'),
			maxLeft = _sliderBar.width() - _sliderButton.width(),
			left = 0,
			step = 0.1;

		function format(value, euro) {
			value = value.toFixed(1);
			value = value.toString();
			value = value.replace('.', ',');
			return (euro ? '&euro;' : '') + value;
		}

		_plus.click(function() {
			if ( _cost.hasClass('is-disabled') )
				return false;

			cost = Math.min(maxCost, cost + step);
			_value
				.add(_slider)
				.trigger('update');
			return false;
		});

		_minus.click(function() {
			if ( _cost.hasClass('is-disabled') )
				return false;

			cost = Math.max(minCost, cost - step);
			_value
				.add(_slider)
				.trigger('update');
			return false;
		});

		_win.on('phone_status', function(e, status) {
			_cost
				.add(_sliderButton)
				.toggleClass('is-disabled', status === 'pickup' || status === 'hangup'); 
		});

		_value.on('update', function(e) {
			_value.html( format(cost, true) );

			$.ajax(url, {
				type: 'POST',
				data: { cost: cost.toFixed(1) },
				complete: function() {
					// Do nothing
				}
			});
		});

		_slider
			.on('init', function() {
				var	startX, startLeft;
				_sliderButton
					.mousedown(function(e) {
						if ( _cost.hasClass('is-disabled') )
							return false;
						startX = e.clientX;
						startLeft = left;
						_doc
							.on('mousemove.slider', function(e) {
								var	dX = e.clientX - startX;
								left = startLeft + dX;
								left = Math.min(left, maxLeft);
								left = Math.max(left, 0);
								_slider.trigger('reverse_update');
							})
							.on('mouseup.slider', function(e) {
								_doc.off('.slider');
								_value.trigger('update');
							});
					});
			})
			.on('reverse_update', function() {
				cost = minCost + (left / maxLeft) * (maxCost - minCost);
				_sliderButton
					.css('left', left + 'px')
					.html( format(cost) );
			})
			.on('update', function() {
				left = ((cost - minCost) / (maxCost - minCost)) * maxLeft;
				_sliderButton
					.css('left', left + 'px')
					.html( format(cost) );
			})
			.trigger('update')
			.trigger('init');
	})();

	/*
	 * Dashboard menu component
	 */
	(function() {
		if ( !$('.js-menu').length )
			return;

		var	_block = $('.js-menu'),
			soundUrl = _block.data('sound'),
			sound;

		if ( soundUrl )
			_win
				.trigger('sm2_init')
				.on('sm2_ready', function() {
					sound = soundManager.createSound({
						url: soundUrl,
						autoLoad: true,
						autoPlay: false,
						volume: 100
					});
				});

		_win.on('menu_update', function(e, data) {
			var menuUpdate = false;
			$.each(data, function(key, value) {
				var	_item = $('.js-menu-' + key, _block),
					_parent = _item.parent(),
					oldValue;

				if ( _item.length ) {
					oldValue = parseInt(_item.text(), 10);
					_item.html(value);
					if ( oldValue !== value && value > oldValue ) {
						menuUpdate = true;
						_parent.animate({ color: '#00adef' }, 700);
					}
				}
			});

			if ( menuUpdate && sound )
				sound.play();
		});
	})();

	/*
	 * Dashboard queue component
	 */
	(function() {
		if ( !$('.js-queue').length )
			return;

		var	_summary = $('.js-queue-summary'),
			_details = $('.js-queue-details'),
			_position = $('.js-position', _summary),
			_favorites = $('.js-favorites'),
			_favoritesAll = $('.js-favorites-all', _favorites),
			_favoritesOnline = $('.js-favorites-online', _favorites),
			tplQueue = _.template( $('#tpl_queue').html() ),
			summaryUrl = _summary.data('url'),
			detailsUrl = _summary.data('url'),
			opened = false,
			blocked = false;

		_summary
			.add(_details)
			.on('click', '.js-toggle', function() {
				opened = !opened;
				_summary.slideToggle(SLIDE_DURATION);
				_details.slideToggle(SLIDE_DURATION);
				return false;
			});

		_details.on('update', function(e, data) {
			// Set flag 'newprice'
			for (var i = 0, price = 0, item; i < data.translators.length; i++) {
				item = data.translators[i];
				item.price = item.price.toString().replace('.', ',');
				item.newprice = price !== item.price;
				price = item.price;
			}

			// Update queue
			_details
				.find('.js-queue-block')
				.remove();
			_details
				.append( tplQueue(data) );
		});

		_summary.on('update', function(e, data) {
			_position.text(data.position);
		});

		_favorites.on('update', function(e, data) {
			_favoritesAll.text(data.favorites.all);
			_favoritesOnline.text(data.favorites.online);
		});

		setInterval(function() {
			if ( blocked )
				return;

			blocked = true;
			$.ajax(opened ? detailsUrl : summaryUrl, {
				success: function(data) {
					if ( data.translators )
						_details.trigger('update', data);
					if ( data.position )
						_summary.trigger('update', data);
					if ( data.favorites )
						_favorites.trigger('update', data);
					if ( data.menu )
						_win.trigger('menu_update', data.menu);
				},
				error: function() {
					// Do nothing
				},
				complete: function() {
					blocked = false;
				}
			});
		}, QUEUE_DELAY);
	})();
	/*
	 * Phone component
	 */
	(function() {
		if ( !window.phone )
			return;

		// Detect Java
		if ( window.deployJava ) {
			var JREs = deployJava.getJREs();
			if ( !JREs || !JREs.length )
				_win.trigger('create_popup', { message: 'You need to <a target="_blank" href="http://www.java.com/getjava">install Java</a>, to be able to take calls from customers', timeout: 0 });
		}

		// Hide embed#deployJavaPlugin (FF fix)
		$('#deployJavaPlugin').hide();

		var	GET_STATUS_DELAY = 200,
			ANIMATE_DURATION = 500,
			DEFAULT_FAIL_DELAY = 10 * 1000;

		var applethandle = null;

		// Add applet element
		var attr = [],
			param = [],
			i;

		for (i in phone.attributes)
			if ( phone.attributes.hasOwnProperty(i) )
				attr.push(i + "=\"" + phone.attributes[i] + "\"");

		for (i in phone.parameters)
			param.push("<param name='" + i + "' value='" + phone.parameters[i] + "'/>");

		$('<div/>')
			.html('<applet ' + attr.join(' ') + '>' + param.join('') + '</applet>')
			.appendTo('body');

		function initcheck() { // piece of shit from muzi!
			if (applethandle === null) {
				try {
					applethandle =  document.getElementById('webphone');
				} catch (e) { }
		
				if (applethandle === null) {
					var applets = null;
					try{
						applets = document.applets;

						if (applets.length === 0) {
							applets = document.getElementsByTagName("object");
						}
						if (applets.length === 0) {
							applets = document.getElementsByTagName("applet");
						}

						for (var i = 0; i < applets.length; ++i) {
							try {
								if (typeof (applets[i].API_Call) != "undefined") {
									applethandle = applets[i];
									break;
								}
							} catch (e) { }
						}
					} catch (e) { }

					if (applethandle === null) {
						try{
							applethandle = document.applets[0];
						} catch (e) { }
					}
				}
		
				if (applethandle !== null) {
					try {
						var newapplethandle = applethandle.getSubApplet();
						if( newapplethandle !== null)
							applethandle  = newapplethandle;
					} catch (e) { }
				}
			}
		}

		initcheck();

		var	_phone = $('.js-phone'),
			_phoneIcon = $('.js-phone-icon', _phone),
			_phoneButton = $('.js-phone-button', _phone),
			_phoneButtonStanby = $('[data-stanby]', _phoneButton),
			_phoneStatus = $('.js-phone-status', _phone),
			_phoneFail =$('.js-phonefail', _phone),
			failTimer = null,
			failDelay = _phoneFail.data('delay'),
			classOn = _phoneStatus.data('on'),
			classOff = _phoneStatus.data('off'),
			classWait = _phoneStatus.data('wait'),
			textOn = _phoneStatus.data('texton'),
			textOff = _phoneStatus.data('textoff'),
			textWait = _phoneStatus.data('textwait'),
			waitList = ['Ready', 'Register…', 'Registering…'],
			offList = ['Register Failed'],
			pickupAnimate = true,
			globalStatus = '',
			callerID;

		failDelay = parseInt(failDelay, 10);
		failDelay = failDelay ? failDelay * 1000 : DEFAULT_FAIL_DELAY;

		_phoneButton
			.on('growup', function() {
				_phoneButton.animate({
					transform: 'scale(1.1)'
				}, ANIMATE_DURATION, 'swing', function() {
					_phoneButton.trigger('growdown');
				});
			})
			.on('growdown', function() {
				_phoneButton.stop().animate({
					transform: 'scale(0.9)'
				}, ANIMATE_DURATION, function() {
					_phoneButton.trigger('growup');
				});
			})
			.on('icon', function(e, iconType) {
				_phoneIcon
					.toggleClass('icon_standby', iconType == 'standby')
					.toggleClass('icon_customer', iconType == 'customer')
					.toggleClass('icon_favorites', iconType == 'favorites');
			})
			.on('status', function(e, status) {
				if ( status != globalStatus ) {
					globalStatus = status;
					_win.trigger('phone_status', globalStatus);
				}

				_phoneButton
					.toggleClass('is-standby', status == 'standby')
					.toggleClass('is-pickup', status == 'pickup')
					.toggleClass('is-hangup', status == 'hangup');

				if ( status == 'pickup' ) { // caller language
					var	lang = callerID.match(/\(\w+\)/),
						_button = $('[data-pickup]', _phoneButton);
					lang = lang ? lang[0] : '';
					_button.text( _button.data('pickup') + ' ' + lang );
				}

				if ( status == 'pickup' || status == 'hangup' ) { // caller in favorires
					var favorites = callerID.indexOf('favorites') !== -1;
					_phoneButton.trigger('icon', favorites ? 'favorites' : 'customer');
				} else {
					_phoneButton.trigger('icon', 'standby');
				}

				if ( status == 'pickup' ) { // pick up animation, required jquery.transform.js
					if ( !pickupAnimate )
						return;
					pickupAnimate = false;
					_phoneButton
						.stop()
						.trigger('growup');
				} else {
					pickupAnimate = true;
					_phoneButton
						.stop()
						.css('transform', 'scale(1)');
				}
			});

		_phoneStatus.on('status', function(e, status) {
			var isOff, isOn, isWait;
			if ( $.inArray(status, offList) !== -1 )
				isOff = true;
			else if ( $.inArray(status, waitList) !== -1 )
				isWait = true;
			else
				isOn = true;

			_phoneStatus
				.toggleClass(classOn, !!isOn)
				.toggleClass(classOff, !!isOff)
				.toggleClass(classWait, !!isWait)
				.text(isOff ? textOff : (isWait ? textWait : textOn));
		});

		failTimer = setTimeout(function() {
			_phoneFail.removeClass('is-hidden');
		}, failDelay);

		setInterval(function() {
			if ( !applethandle )
				return initcheck();

			var	phoneStatus;
			try {
				phoneStatus = applethandle.API_GetStatus(-2);
			} catch(e) {
				return initcheck();
			}

			var line = applethandle.API_GetLine(),
				type = window.phone.parameters.calleriddisplay;

			callerID = applethandle.API_GetCallerID(line, type);
			phoneStatus = $.trim(phoneStatus);
			_phoneStatus.trigger('status', phoneStatus);
			_phone.trigger('inited');

			/* Status set:
				Ready
				Register…
				Registering…
				Register Failed
				Registered
				Accept
				Starting Call
				Call
				Call Initiated
				Calling…
				Ringing…
				Incoming…
				In Call (xxx sec)
				Hangup
				Call Finished
				Chat
			 */
			switch(phoneStatus) {
				case 'Incoming...':
					_phoneButton
						.trigger('status', 'pickup')
						.off('.phone')
						.one('click.phone', function() {
							applethandle.API_Accept( applethandle.API_GetLine() );
							return false;
						});
				break;
				case 'Registered.':
					_phoneButton.trigger('status', 'standby');
				break;
				case 'Call Finished':
					_phoneButton.trigger('status', 'standby');
				break;
				default:
					if ( phoneStatus.indexOf('Speaking') !== -1 || phoneStatus.indexOf('In Call') !== -1 )
						_phoneButton
							.trigger('status', 'hangup')
							.off('.phone')
							.one('click.phone', function() {
								applethandle.API_Hangup( applethandle.API_GetLine() );
								return false;
							});
					else {
						_phoneButton.trigger('status', 'standby');
					}
				break;
			}

		}, GET_STATUS_DELAY);

		// Stay on this page popup && cancel fail timer
		_phone.one('inited', function() {
			clearTimeout(failTimer);
			failTimer = null;

			if ( _phoneButtonStanby.length )
				_phoneButtonStanby.text( _phoneButtonStanby.data('stanby') );

			_win.on('beforeunload', function() {
				return 'If you leave this page now, you will not be able to take calls, and you will lose your place in the queue.';
			});
		});
			
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