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