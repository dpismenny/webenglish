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
		 */
		$.fn.evaluationWrap = function() {
			var	_all = $(this),
				tplInfo = _.template($('#tpl_evaluation_info').html()),
				tplPlayer = _.template($('#tpl_evaluation_player').html());

			_win.trigger('sm2_init');

			return _all.each(function() {
				var	_this = $(this),
					_info, _steps, _buttons,
					_player, _playerWrap,
					dialogIndex = 0,
					speechIndex = -1,
					data = _this.data(),
					blocked = false,
					json;

				_this
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
							return _all.removeClass('is-hold');
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
						_all
							.not('.is-active')
							.addClass('is-hold');
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
					.click(function() {
						if ( blocked || _this.hasClass('is-hold') )
							return;

						if ( _info ) {
							var active = !_info.is(':visible');
							_this.toggleClass('is-active', active);
							_all.not('.is-active').toggleClass('is-hold', active);
							_player.trigger(active ? 'do_init' : 'do_stop');

							return _info.slideToggle();
						}

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
					});
			});
		};

		// Auto init for detected blocks
		$('.js-evaluation').evaluationWrap();
	})();