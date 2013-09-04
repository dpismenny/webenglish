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
								_form.slideUp(SLIDE_DURATION, function() {
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
							.slideDown(SLIDE_DURATION, function() {
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