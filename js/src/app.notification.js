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