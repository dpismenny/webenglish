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