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